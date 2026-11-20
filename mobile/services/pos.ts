import { api } from "./api";
import { mmkv } from "../store/storage";

const CONTEXT_KEY = "pos-context";

export type PosContext = {
  organizationId: string;
  organizationName?: string;
  storeId: string;
  storeName?: string;
  registerId: string;
  registerName?: string;
};

const headers = (context: PosContext) => ({
  "x-organization-id": context.organizationId,
  "x-store-id": context.storeId,
  "x-register-id": context.registerId,
});

const unwrap = (response: any) => response?.data?.data ?? response?.data ?? {};

export async function getPosContext(): Promise<PosContext | null> {
  const raw = await mmkv.getString(CONTEXT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PosContext;
  } catch {
    return null;
  }
}

export async function ensurePosContext(): Promise<PosContext> {
  const cached = await getPosContext();
  if (cached?.organizationId && cached?.storeId && cached?.registerId) return cached;

  const orgRes = await api.get("/tenant/organizations", { params: { limit: 100 } });
  const organizations = unwrap(orgRes).items || [];
  if (!organizations.length) throw new Error("Sizga birorta tashkilot biriktirilmagan");

  const organizationId = organizations[0].id;
  const storeRes = await api.get(`/tenant/organizations/${organizationId}/stores`, {
    params: { limit: 100 },
  });
  const stores = unwrap(storeRes).items || [];
  if (!stores.length) throw new Error("Tashkilotda do'kon topilmadi");

  const storeId = stores[0].id;
  const registerRes = await api.get(`/tenant/stores/${storeId}/registers`, {
    params: { limit: 100 },
  });
  const registers = unwrap(registerRes).items || [];
  if (!registers.length) throw new Error("Do'konda kassa topilmadi");

  const context: PosContext = {
    organizationId,
    organizationName: organizations[0].name,
    storeId,
    storeName: stores[0].name,
    registerId: registers[0].id,
    registerName: registers[0].name,
  };
  await mmkv.setString(CONTEXT_KEY, JSON.stringify(context));
  return context;
}

export async function getActiveShift(context: PosContext) {
  const response = await api.get("/pos/shifts/active", { headers: headers(context) });
  return unwrap(response).shift;
}

export async function openShift(context: PosContext, openingCash = 0) {
  const response = await api.post(
    "/pos/shifts/open",
    { openingCash },
    { headers: headers(context) }
  );
  return unwrap(response).shift;
}

export async function createTransaction(
  context: PosContext,
  data: {
    items: Array<{ productId: string; quantity: number }>;
    payments: Array<{ method: "CASH" | "CARD"; amount: number }>;
    note?: string;
    syncId?: string;
  }
) {
  const response = await api.post("/pos/transactions", data, { headers: headers(context) });
  return unwrap(response).transaction;
}

export async function getReceipt(context: PosContext, transactionId: string) {
  const response = await api.get(`/pos/transactions/${transactionId}/receipt`, {
    headers: headers(context),
  });
  return unwrap(response).receipt;
}
