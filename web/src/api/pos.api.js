import api from './axios';
import { getPosContext, hasPosContext, setPosContext } from '../utils/posContext';

const contextHeaders = (context) => {
  if (!hasPosContext(context)) return {};
  return {
    'x-organization-id': context.organizationId,
    'x-store-id': context.storeId,
    'x-register-id': context.registerId,
  };
};

export const getOrganizations = (params) => api.get('/tenant/organizations', { params });
export const getStores = (organizationId, params) =>
  api.get(`/tenant/organizations/${organizationId}/stores`, { params });
export const getRegisters = (storeId, params) =>
  api.get(`/tenant/stores/${storeId}/registers`, { params });

export const ensurePosContext = async () => {
  const cached = getPosContext();
  if (hasPosContext(cached)) return cached;

  const organizations = (await getOrganizations({ limit: 100 })).data?.data?.items || [];
  if (!organizations.length) throw new Error('Sizga birorta tashkilot biriktirilmagan');

  const organizationId = organizations[0].id;
  const stores = (await getStores(organizationId, { limit: 100 })).data?.data?.items || [];
  if (!stores.length) throw new Error('Tashkilotda do‘kon topilmadi');

  const storeId = stores[0].id;
  const registers = (await getRegisters(storeId, { limit: 100 })).data?.data?.items || [];
  if (!registers.length) throw new Error('Do‘konda kassa topilmadi');

  const context = {
    organizationId,
    organizationName: organizations[0].name,
    storeId,
    storeName: stores[0].name,
    registerId: registers[0].id,
    registerName: registers[0].name,
  };
  setPosContext(context);
  return context;
};

export const getActiveShift = () =>
  api.get('/pos/shifts/active', { headers: contextHeaders(getPosContext()) });

export const openShift = (data) =>
  api.post('/pos/shifts/open', data, { headers: contextHeaders(getPosContext()) });

export const closeShift = (shiftId, data) =>
  api.post(`/pos/shifts/${shiftId}/close`, data, { headers: contextHeaders(getPosContext()) });

export const createTransaction = (data) =>
  api.post('/pos/transactions', data, { headers: contextHeaders(getPosContext()) });

export const getReceipt = (transactionId) =>
  api.get(`/pos/transactions/${transactionId}/receipt`, {
    headers: contextHeaders(getPosContext()),
  });

export const listTransactions = (params) =>
  api.get('/pos/transactions', { params, headers: contextHeaders(getPosContext()) });

const orgHeader = (organizationId) => {
  const id = organizationId || getPosContext()?.organizationId;
  return id ? { 'x-organization-id': id } : {};
};

export const getPlans = () => api.get('/plans');

export const getSubscription = (organizationId) =>
  api.get('/subscriptions/current', { headers: orgHeader(organizationId) });

export const changeSubscriptionPlan = (data, organizationId) =>
  api.post('/subscriptions/change-plan', data, { headers: orgHeader(organizationId) });
