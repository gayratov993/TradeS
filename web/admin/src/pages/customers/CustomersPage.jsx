import { useEffect, useMemo, useState } from "react";
import { Modal } from "../../components/shared/Modal";
import { Icon } from "../../components/shared/Icon";
import { plansApi } from "../../services/api/plans.api";
import { subscriptionsApi } from "../../services/api/subscriptions.api";
import { tenantApi } from "../../services/api/tenant.api";
import { usersApi } from "../../services/api/users.api";

const inputCls =
  "w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-on-surface text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary";
const primaryBtn =
  "flex items-center justify-center gap-2 bg-primary-container hover:bg-primary text-on-primary-container hover:text-on-primary transition-colors rounded-lg py-2.5 px-5 font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed";
const ghostBtn =
  "flex items-center justify-center gap-2 border border-outline-variant text-on-surface hover:bg-surface-container transition-colors rounded-lg py-2 px-4 font-medium disabled:opacity-50 disabled:cursor-not-allowed";

const emptyForm = {
  name: "",
  slug: "",
  phone: "",
  address: "",
  planCode: "BASIC",
  ownerName: "",
  ownerPhone: "",
  ownerEmail: "",
  storeName: "Asosiy do‘kon",
  storeCode: "MAIN",
  registerCount: 3,
  cashiers: [
    { name: "", phone: "" },
    { name: "", phone: "" },
    { name: "", phone: "" },
  ],
};

const planStyles = {
  BASIC: "bg-primary-container/20 text-on-primary-container",
  STANDARD: "bg-[#e0f2fe] text-[#075985]",
  PRO: "bg-secondary-fixed text-on-secondary-fixed",
};

const statusStyles = {
  TRIAL: "bg-[#fef3c7] text-[#92400e]",
  ACTIVE: "bg-primary-container/20 text-on-primary-container",
  PAST_DUE: "bg-error-container text-on-error-container",
  CANCELLED: "bg-surface-variant text-on-surface-variant",
};

const money = (value) => new Intl.NumberFormat("uz-UZ").format(value || 0);
const limitText = (value) => (value >= 9999 ? "Cheksiz" : String(value));
const errText = (error) => error?.message || "Xatolik yuz berdi";

function generatePassword() {
  const groups = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#"];
  const all = groups.join("");
  const values = new Uint32Array(12);
  window.crypto.getRandomValues(values);
  const chars = [
    groups[0][values[0] % groups[0].length],
    groups[1][values[1] % groups[1].length],
    groups[2][values[2] % groups[2].length],
    groups[3][values[3] % groups[3].length],
  ];
  for (let i = 4; i < values.length; i += 1) chars.push(all[values[i] % all.length]);
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = values[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

function Field({ label, children, hint }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-label-caps text-label-caps text-on-surface-variant uppercase">{label}</span>
      {children}
      {hint && <span className="block text-body-sm text-on-surface-variant">{hint}</span>}
    </label>
  );
}

function UsageBar({ label, value, max }) {
  const unlimited = max >= 9999;
  const pct = unlimited ? 8 : Math.min(100, Math.round((value / Math.max(max, 1)) * 100));
  return (
    <div>
      <div className="flex justify-between text-body-sm mb-1">
        <span className="text-on-surface-variant">{label}</span>
        <span className="font-semibold text-on-surface">
          {value} / {limitText(max)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-surface-variant overflow-hidden">
        <div
          className={`h-full rounded-full ${pct >= 100 ? "bg-error" : "bg-primary-container"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function CustomersPage() {
  const [plans, setPlans] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [usageById, setUsageById] = useState({});
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [created, setCreated] = useState(null);

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState("");

  const [planTarget, setPlanTarget] = useState(null);
  const [planCode, setPlanCode] = useState("BASIC");
  const [storeForm, setStoreForm] = useState({ name: "", code: "" });
  const [registerForm, setRegisterForm] = useState({ name: "", code: "" });
  const [cashierForm, setCashierForm] = useState({ name: "", phone: "" });

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.code === form.planCode),
    [plans, form.planCode]
  );
  const maxRegisters = selectedPlan?.maxRegistersPerStore ?? 3;
  const maxCashiers = selectedPlan?.maxCashiers ?? 3;

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [plansRes, orgsRes] = await Promise.all([
        plansApi.getAll(),
        tenantApi.listOrganizations({ limit: 100 }),
      ]);
      const planList = plansRes.data?.plans || [];
      const orgList = orgsRes.data?.items || [];
      setPlans(planList);
      setOrganizations(orgList);

      const pairs = await Promise.all(
        orgList.map(async (org) => {
          try {
            const res = await subscriptionsApi.getCurrent(org.id);
            return [org.id, res.data];
          } catch {
            return [org.id, null];
          }
        })
      );
      setUsageById(Object.fromEntries(pairs));
    } catch (err) {
      setError(errText(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (form.registerCount > maxRegisters) {
      setForm((prev) => ({ ...prev, registerCount: maxRegisters }));
    }
    if (form.cashiers.length > maxCashiers) {
      setForm((prev) => ({ ...prev, cashiers: prev.cashiers.slice(0, maxCashiers) }));
    }
  }, [maxRegisters, maxCashiers, form.registerCount, form.cashiers.length]);

  function updateForm(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateCashier(index, key, value) {
    setForm((prev) => ({
      ...prev,
      cashiers: prev.cashiers.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    }));
  }

  function openCreate() {
    setForm(emptyForm);
    setCreated(null);
    setError("");
    setNotice("");
    setCreateOpen(true);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.ownerName.trim() || !(form.ownerPhone.trim() || form.ownerEmail.trim())) {
      setError("Tashkilot, egasi va egasining telefon yoki emaili shart.");
      return;
    }
    setAction("create");
    setError("");
    try {
      const ownerPassword = generatePassword();
      const ownerRes = await usersApi.create({
        name: form.ownerName.trim(),
        ...(form.ownerPhone.trim() ? { phone: form.ownerPhone.trim() } : {}),
        ...(form.ownerEmail.trim() ? { email: form.ownerEmail.trim() } : {}),
        password: ownerPassword,
        role: "USER",
      });
      const ownerId = ownerRes.data?.id || ownerRes.data?.user?.id;
      if (!ownerId) throw new Error("Ega foydalanuvchisi yaratilmadi");

      const orgRes = await tenantApi.createOrganization({
        name: form.name.trim(),
        ...(form.slug.trim() ? { slug: form.slug.trim() } : {}),
        address: form.address.trim(),
        phone: form.phone.trim(),
        ownerUserId: ownerId,
      });
      const org = orgRes.data?.organization;
      if (!org?.id) throw new Error("Tashkilot yaratilmadi");

      if (form.planCode !== "BASIC") {
        await subscriptionsApi.changePlan(org.id, { planCode: form.planCode, periodDays: 30 });
      }

      const storeRes = await tenantApi.createStore(org.id, {
        name: form.storeName.trim() || "Asosiy do‘kon",
        code: form.storeCode.trim() || "MAIN",
      });
      const store = storeRes.data?.store;

      for (let i = 0; i < form.registerCount; i += 1) {
        await tenantApi.createRegister(org.id, store.id, {
          name: `Kassa ${i + 1}`,
          code: `${form.storeCode.trim() || "MAIN"}-K${String(i + 1).padStart(2, "0")}`,
        });
      }

      const credentials = [
        {
          login: form.ownerPhone.trim() || form.ownerEmail.trim(),
          password: ownerPassword,
          role: "Tashkilot egasi",
        },
      ];

      for (const cashier of form.cashiers.slice(0, maxCashiers)) {
        if (!cashier.name.trim() || !cashier.phone.trim()) continue;
        const password = generatePassword();
        const userRes = await usersApi.create({
          name: cashier.name.trim(),
          phone: cashier.phone.trim(),
          password,
          role: "USER",
        });
        const userId = userRes.data?.id || userRes.data?.user?.id;
        if (!userId) continue;
        await tenantApi.addMember(org.id, { userId, role: "CASHIER" });
        credentials.push({ login: cashier.phone.trim(), password, role: "Kassir" });
      }

      setCreated({ org, credentials });
      await load();
    } catch (err) {
      setError(errText(err));
    } finally {
      setAction("");
    }
  }

  async function openDetail(org) {
    setDetailLoading(true);
    setError("");
    setNotice("");
    setSelectedStoreId("");
    try {
      const [orgRes, storesRes, membersRes, subRes] = await Promise.all([
        tenantApi.getOrganization(org.id),
        tenantApi.listStores(org.id, { limit: 100 }),
        tenantApi.listMembers(org.id, { limit: 100 }),
        subscriptionsApi.getCurrent(org.id),
      ]);
      const stores = storesRes.data?.items || [];
      const firstStore = stores.find((store) => store.isActive) || stores[0] || null;
      let registers = [];
      if (firstStore) {
        const registersRes = await tenantApi.listRegisters(org.id, firstStore.id, { limit: 100 });
        registers = registersRes.data?.items || [];
      }
      setSelectedStoreId(firstStore?.id || "");
      setDetail({
        organization: orgRes.data?.organization || org,
        subscription: subRes.data || null,
        stores,
        registers,
        members: membersRes.data?.items || [],
      });
    } catch (err) {
      setError(errText(err));
    } finally {
      setDetailLoading(false);
    }
  }

  async function refreshDetail() {
    if (!detail?.organization?.id) return;
    const orgId = detail.organization.id;
    const [storesRes, membersRes, subRes] = await Promise.all([
      tenantApi.listStores(orgId, { limit: 100 }),
      tenantApi.listMembers(orgId, { limit: 100 }),
      subscriptionsApi.getCurrent(orgId),
    ]);
    const stores = storesRes.data?.items || [];
    const storeId = stores.some((store) => store.id === selectedStoreId)
      ? selectedStoreId
      : stores.find((store) => store.isActive)?.id || "";
    const registersRes = storeId
      ? await tenantApi.listRegisters(orgId, storeId, { limit: 100 })
      : { data: { items: [] } };
    setDetail((prev) => ({
      ...prev,
      subscription: subRes.data || null,
      stores,
      members: membersRes.data?.items || [],
      registers: registersRes.data?.items || [],
    }));
    setSelectedStoreId(storeId);
    await load();
  }

  async function selectStore(storeId) {
    setSelectedStoreId(storeId);
    if (!detail?.organization?.id || !storeId) return;
    try {
      const res = await tenantApi.listRegisters(detail.organization.id, storeId, { limit: 100 });
      setDetail((prev) => ({ ...prev, registers: res.data?.items || [] }));
    } catch (err) {
      setError(errText(err));
    }
  }

  function openPlanChange(org) {
    setPlanTarget(org);
    setPlanCode(org.plan?.code || "BASIC");
  }

  async function submitPlanChange(e) {
    e.preventDefault();
    if (!planTarget) return;
    setAction("plan");
    setError("");
    try {
      await subscriptionsApi.changePlan(planTarget.id, { planCode, periodDays: 30 });
      setNotice(`${planTarget.name}: ${planCode} tarifiga o‘tkazildi.`);
      setPlanTarget(null);
      await load();
      if (detail?.organization?.id === planTarget.id) await refreshDetail();
    } catch (err) {
      setError(errText(err));
    } finally {
      setAction("");
    }
  }

  async function submitStore(e) {
    e.preventDefault();
    if (!detail) return;
    setAction("store");
    setError("");
    try {
      await tenantApi.createStore(detail.organization.id, storeForm);
      setStoreForm({ name: "", code: "" });
      setNotice("Do‘kon qo‘shildi.");
      await refreshDetail();
    } catch (err) {
      setError(errText(err));
    } finally {
      setAction("");
    }
  }

  async function submitRegister(e) {
    e.preventDefault();
    if (!detail || !selectedStoreId) return;
    setAction("register");
    setError("");
    try {
      await tenantApi.createRegister(detail.organization.id, selectedStoreId, registerForm);
      setRegisterForm({ name: "", code: "" });
      setNotice("Kassa qo‘shildi.");
      await refreshDetail();
    } catch (err) {
      setError(errText(err));
    } finally {
      setAction("");
    }
  }

  async function submitCashier(e) {
    e.preventDefault();
    if (!detail) return;
    setAction("cashier");
    setError("");
    try {
      const password = generatePassword();
      const userRes = await usersApi.create({
        name: cashierForm.name.trim(),
        phone: cashierForm.phone.trim(),
        password,
        role: "USER",
      });
      const userId = userRes.data?.id || userRes.data?.user?.id;
      if (!userId) throw new Error("Kassir foydalanuvchisi yaratilmadi");
      await tenantApi.addMember(detail.organization.id, { userId, role: "CASHIER" });
      setCreated({ org: detail.organization, credentials: [{ login: cashierForm.phone.trim(), password, role: "Kassir" }] });
      setCashierForm({ name: "", phone: "" });
      setNotice("Kassir qo‘shildi. Parolni mijozga yuboring.");
      await refreshDetail();
    } catch (err) {
      setError(errText(err));
    } finally {
      setAction("");
    }
  }

  async function deactivate(kind, id) {
    if (!detail) return;
    setAction(kind);
    setError("");
    try {
      if (kind === "store") await tenantApi.updateStore(detail.organization.id, id, { isActive: false });
      if (kind === "register") {
        await tenantApi.updateRegister(detail.organization.id, selectedStoreId, id, { isActive: false });
      }
      if (kind === "cashier") await tenantApi.updateMember(detail.organization.id, id, { isActive: false });
      setNotice("Faolsizlantirildi.");
      await refreshDetail();
    } catch (err) {
      setError(errText(err));
    } finally {
      setAction("");
    }
  }

  const detailLimits = detail?.subscription?.subscription?.limits || detail?.subscription?.limits || {
    maxStores: 1,
    maxRegistersPerStore: 3,
    maxUsers: 4,
    maxCashiers: 3,
  };
  const detailUsage = detail?.subscription?.usage || { stores: 0, registers: 0, users: 0, cashiers: 0 };

  return (
    <div className="space-y-section-gap">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">Mijozlar va tariflar</h2>
          <p className="text-on-surface-variant mt-1 text-body-sm">
            Mijoz tashkiloti, do‘koni, kassalari va kassirlarini bitta joydan boshqaring.
          </p>
        </div>
        <button type="button" onClick={openCreate} className={primaryBtn}>
          <Icon name="person_add" className="text-[20px]" />
          Yangi mijoz
        </button>
      </div>

      {error && (
        <div className="bg-error-container text-on-error-container rounded-lg px-4 py-3 text-body-sm">
          {error}
        </div>
      )}
      {notice && !error && (
        <div className="bg-primary-container/20 text-on-primary-container rounded-lg px-4 py-3 text-body-sm">
          {notice}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(plans.length
          ? plans
          : [
              { code: "BASIC", name: "Starter", monthlyPrice: 249000, maxStores: 1, maxRegistersPerStore: 3, maxUsers: 4, maxCashiers: 3 },
              { code: "STANDARD", name: "Growth", monthlyPrice: 449000, maxStores: 3, maxRegistersPerStore: 10, maxUsers: 11, maxCashiers: 10 },
              { code: "PRO", name: "Pro", monthlyPrice: 799000, maxStores: 9999, maxRegistersPerStore: 9999, maxUsers: 9999, maxCashiers: 9999 },
            ]
        ).map((plan) => (
          <div key={plan.code} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
            <div className="flex items-center justify-between">
              <span className={`px-2.5 py-1 rounded-full text-label-caps text-label-caps ${planStyles[plan.code] || ""}`}>
                {plan.code}
              </span>
              <Icon name="workspace_premium" className="text-on-surface-variant" />
            </div>
            <h3 className="font-title-sm text-title-sm text-on-surface mt-4">{plan.name}</h3>
            <p className="text-headline-md text-on-surface mt-1">
              {money(plan.monthlyPrice)} <span className="text-body-sm text-on-surface-variant">so‘m/oy</span>
            </p>
            <ul className="mt-4 space-y-1.5 text-body-sm text-on-surface-variant">
              <li>Do‘kon: {limitText(plan.maxStores)}</li>
              <li>Har do‘konda kassa: {limitText(plan.maxRegistersPerStore)}</li>
              <li>Jami foydalanuvchi: {limitText(plan.maxUsers)}</li>
              <li>Kassir: {limitText(plan.maxCashiers)}</li>
            </ul>
          </div>
        ))}
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between">
          <h3 className="font-title-sm text-title-sm text-on-surface">Mijoz tashkilotlari</h3>
          <span className="text-body-sm text-on-surface-variant">{organizations.length} ta</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-outline-variant">
            <thead className="bg-surface-bright">
              <tr>
                {["Tashkilot", "Tarif", "Foydalanish", "Holat", "Amallar"].map((heading) => (
                  <th key={heading} className="px-6 py-3 font-label-caps text-label-caps text-on-surface-variant uppercase text-left">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-body-sm text-on-surface-variant">Yuklanmoqda...</td></tr>
              ) : organizations.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-body-sm text-on-surface-variant">Hali mijoz yo‘q.</td></tr>
              ) : (
                organizations.map((org) => {
                  const sub = usageById[org.id];
                  const usage = sub?.usage || { stores: 0, registers: 0, users: 0, cashiers: 0 };
                  return (
                    <tr key={org.id} className="hover:bg-surface-container/40">
                      <td className="px-6 py-4">
                        <div className="font-medium text-on-surface">{org.name}</div>
                        <div className="text-body-sm text-on-surface-variant">{org.slug}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-label-caps text-label-caps ${planStyles[org.plan?.code] || ""}`}>
                          {org.plan?.name || org.plan?.code || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-body-sm text-on-surface-variant">
                        {usage.stores} do‘kon · {usage.registers} kassa · {usage.cashiers} kassir
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-label-caps text-label-caps ${statusStyles[sub?.subscription?.status] || statusStyles.TRIAL}`}>
                          {sub?.subscription?.status || "TRIAL"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button type="button" className={ghostBtn} onClick={() => openDetail(org)}>
                            Boshqarish
                          </button>
                          <button type="button" className={ghostBtn} onClick={() => openPlanChange(org)}>
                            Tarif
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={createOpen}
        title="Yangi mijoz qo‘shish"
        description="Ega, tashkilot, do‘kon, kassalar va kassirlar bir qadamda yaratiladi."
        onClose={() => setCreateOpen(false)}
        size="lg"
        footer={
          <>
            <button type="button" className={ghostBtn} onClick={() => setCreateOpen(false)}>Bekor qilish</button>
            <button type="submit" form="create-customer-form" className={primaryBtn} disabled={action === "create"}>
              {action === "create" ? "Yaratilmoqda..." : "Mijozni yaratish"}
            </button>
          </>
        }
      >
        {created ? (
          <div className="space-y-4">
            <div className="bg-primary-container/20 text-on-primary-container rounded-lg px-4 py-3 text-body-sm">
              {created.org.name} yaratildi. Quyidagi vaqtinchalik parollarni mijozga yuboring.
            </div>
            <div className="border border-outline-variant rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-outline-variant text-body-sm">
                <thead className="bg-surface-bright">
                  <tr>
                    <th className="px-4 py-2 text-left font-label-caps text-label-caps text-on-surface-variant">Rol</th>
                    <th className="px-4 py-2 text-left font-label-caps text-label-caps text-on-surface-variant">Login</th>
                    <th className="px-4 py-2 text-left font-label-caps text-label-caps text-on-surface-variant">Parol</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {created.credentials.map((item) => (
                    <tr key={`${item.role}-${item.login}`}>
                      <td className="px-4 py-2 text-on-surface">{item.role}</td>
                      <td className="px-4 py-2 text-on-surface">{item.login}</td>
                      <td className="px-4 py-2 font-mono text-on-surface">{item.password}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" className={primaryBtn} onClick={() => { setCreateOpen(false); setCreated(null); }}>Tayyor</button>
          </div>
        ) : (
          <form id="create-customer-form" onSubmit={handleCreate} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Tashkilot nomi">
                <input className={inputCls} value={form.name} onChange={(e) => updateForm("name", e.target.value)} placeholder="Masalan, O‘zbek Savdo MChJ" />
              </Field>
              <Field label="Slug (ixtiyoriy)">
                <input className={inputCls} value={form.slug} onChange={(e) => updateForm("slug", e.target.value)} placeholder="ozbek-savdo" />
              </Field>
              <Field label="Tashkilot telefoni">
                <input className={inputCls} value={form.phone} onChange={(e) => updateForm("phone", e.target.value)} placeholder="+998901234567" />
              </Field>
              <Field label="Manzil">
                <input className={inputCls} value={form.address} onChange={(e) => updateForm("address", e.target.value)} />
              </Field>
            </div>

            <div className="border-t border-outline-variant pt-4">
              <h4 className="font-title-sm text-title-sm text-on-surface mb-3">Tarif</h4>
              <div className="grid grid-cols-3 gap-2">
                {plans.map((plan) => (
                  <button
                    key={plan.code}
                    type="button"
                    onClick={() => updateForm("planCode", plan.code)}
                    className={`border rounded-lg p-3 text-left transition-colors ${
                      form.planCode === plan.code
                        ? "border-primary bg-primary-container/10"
                        : "border-outline-variant hover:bg-surface-container"
                    }`}
                  >
                    <div className="font-semibold text-on-surface">{plan.name}</div>
                    <div className="text-body-sm text-on-surface-variant">{money(plan.monthlyPrice)} so‘m</div>
                    <div className="text-body-sm text-on-surface-variant">
                      {limitText(plan.maxStores)} do‘kon · {limitText(plan.maxRegistersPerStore)} kassa
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-outline-variant pt-4">
              <h4 className="font-title-sm text-title-sm text-on-surface mb-3">Tashkilot egasi</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Ism">
                  <input className={inputCls} value={form.ownerName} onChange={(e) => updateForm("ownerName", e.target.value)} />
                </Field>
                <Field label="Telefon">
                  <input className={inputCls} value={form.ownerPhone} onChange={(e) => updateForm("ownerPhone", e.target.value)} placeholder="+998901111111" />
                </Field>
                <Field label="Email">
                  <input className={inputCls} value={form.ownerEmail} onChange={(e) => updateForm("ownerEmail", e.target.value)} placeholder="owner@example.com" />
                </Field>
              </div>
              <p className="text-body-sm text-on-surface-variant mt-2">Parol avtomatik yaratilib, oxirida ko‘rsatiladi.</p>
            </div>

            <div className="border-t border-outline-variant pt-4">
              <h4 className="font-title-sm text-title-sm text-on-surface mb-3">Do‘kon va kassalar</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Do‘kon nomi">
                  <input className={inputCls} value={form.storeName} onChange={(e) => updateForm("storeName", e.target.value)} />
                </Field>
                <Field label="Do‘kon kodi">
                  <input className={inputCls} value={form.storeCode} onChange={(e) => updateForm("storeCode", e.target.value)} />
                </Field>
                <Field label={`Kassalar soni (${maxRegisters}gacha)`}>
                  <input
                    type="number"
                    min="1"
                    max={maxRegisters}
                    className={inputCls}
                    value={form.registerCount}
                    onChange={(e) => updateForm("registerCount", Math.max(1, Math.min(maxRegisters, Number(e.target.value) || 1)))}
                  />
                </Field>
              </div>
            </div>

            <div className="border-t border-outline-variant pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-title-sm text-title-sm text-on-surface">Kassirlar</h4>
                <button
                  type="button"
                  className={ghostBtn}
                  disabled={form.cashiers.length >= maxCashiers}
                  onClick={() => setForm((prev) => ({ ...prev, cashiers: [...prev.cashiers, { name: "", phone: "" }] }))}
                >
                  Kassir qo‘shish
                </button>
              </div>
              <p className="text-body-sm text-on-surface-variant mb-3">
                Ega bilan birga jami {limitText(selectedPlan?.maxUsers ?? 4)} foydalanuvchi, shundan {limitText(maxCashiers)} kassir.
              </p>
              <div className="space-y-3">
                {form.cashiers.map((cashier, index) => (
                  <div key={index} className="grid grid-cols-2 gap-3">
                    <input
                      className={inputCls}
                      placeholder={`Kassir ${index + 1} ismi`}
                      value={cashier.name}
                      onChange={(e) => updateCashier(index, "name", e.target.value)}
                    />
                    <input
                      className={inputCls}
                      placeholder={`+99890... (${index + 1})`}
                      value={cashier.phone}
                      onChange={(e) => updateCashier(index, "phone", e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(planTarget)}
        title="Tarif o‘zgartirish"
        description={planTarget?.name}
        onClose={() => setPlanTarget(null)}
        footer={
          <>
            <button type="button" className={ghostBtn} onClick={() => setPlanTarget(null)}>Bekor qilish</button>
            <button type="submit" form="change-plan-form" className={primaryBtn} disabled={action === "plan"}>
              Saqlash
            </button>
          </>
        }
      >
        <form id="change-plan-form" onSubmit={submitPlanChange} className="space-y-4">
          <Field label="Yangi tarif">
            <select className={inputCls} value={planCode} onChange={(e) => setPlanCode(e.target.value)}>
              {plans.map((plan) => (
                <option key={plan.code} value={plan.code}>
                  {plan.name} — {money(plan.monthlyPrice)} so‘m/oy
                </option>
              ))}
            </select>
          </Field>
          <p className="text-body-sm text-on-surface-variant">
            Davr 30 kun. Pasaytirish faqat joriy foydalanish yangi limitlarga sig‘ganda amalga oshadi.
          </p>
        </form>
      </Modal>

      <Modal
        open={Boolean(detail)}
        title={detail?.organization?.name || "Mijoz"}
        description="Tashkilot resurslari va tarif foydalanishi"
        onClose={() => setDetail(null)}
        size="lg"
        footer={<button type="button" className={ghostBtn} onClick={() => setDetail(null)}>Yopish</button>}
      >
        {detailLoading ? (
          <p className="text-body-sm text-on-surface-variant">Yuklanmoqda...</p>
        ) : detail ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-surface-bright rounded-lg p-4">
              <UsageBar label="Do‘kon" value={detailUsage.stores} max={detailLimits.maxStores} />
              <UsageBar label="Kassa (tanlangan do‘kon)" value={detail.registers.filter((register) => register.isActive).length} max={detailLimits.maxRegistersPerStore} />
              <UsageBar label="Foydalanuvchi" value={detailUsage.users} max={detailLimits.maxUsers} />
              <UsageBar label="Kassir" value={detailUsage.cashiers} max={detailLimits.maxCashiers} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-title-sm text-title-sm text-on-surface">Do‘konlar</h4>
                <button
                  type="button"
                  className={ghostBtn}
                  disabled={detailUsage.stores >= detailLimits.maxStores}
                  onClick={() => document.getElementById("add-store-form")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Do‘kon qo‘shish
                </button>
              </div>
              <div className="space-y-2">
                {detail.stores.filter((store) => store.isActive).map((store) => (
                  <div key={store.id} className="flex items-center justify-between border border-outline-variant rounded-lg px-3 py-2">
                    <button type="button" onClick={() => selectStore(store.id)} className={`text-body-sm ${selectedStoreId === store.id ? "font-semibold text-primary" : "text-on-surface"}`}>
                      {store.name} <span className="text-on-surface-variant">({store.code})</span>
                    </button>
                    <button type="button" className="text-body-sm text-error" disabled={action === "store"} onClick={() => deactivate("store", store.id)}>
                      Faolsizlantirish
                    </button>
                  </div>
                ))}
              </div>
              <form id="add-store-form" onSubmit={submitStore} className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
                <input className={inputCls} placeholder="Do‘kon nomi" value={storeForm.name} onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })} />
                <input className={inputCls} placeholder="Kod" value={storeForm.code} onChange={(e) => setStoreForm({ ...storeForm, code: e.target.value })} />
                <button type="submit" className={primaryBtn} disabled={action === "store"}>Qo‘shish</button>
              </form>
            </div>

            <div>
              <h4 className="font-title-sm text-title-sm text-on-surface mb-2">Kassalar</h4>
              <div className="space-y-2">
                {detail.registers.filter((register) => register.isActive).map((register) => (
                  <div key={register.id} className="flex items-center justify-between border border-outline-variant rounded-lg px-3 py-2 text-body-sm text-on-surface">
                    <span>{register.name} <span className="text-on-surface-variant">({register.code})</span></span>
                    <button type="button" className="text-error" disabled={action === "register"} onClick={() => deactivate("register", register.id)}>
                      Faolsizlantirish
                    </button>
                  </div>
                ))}
                {detail.registers.filter((register) => register.isActive).length === 0 && (
                  <p className="text-body-sm text-on-surface-variant">Bu do‘konda kassa yo‘q.</p>
                )}
              </div>
              <form onSubmit={submitRegister} className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
                <input className={inputCls} placeholder="Kassa nomi" value={registerForm.name} onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })} />
                <input className={inputCls} placeholder="Kod" value={registerForm.code} onChange={(e) => setRegisterForm({ ...registerForm, code: e.target.value })} />
                <button
                  type="submit"
                  className={primaryBtn}
                  disabled={!selectedStoreId || action === "register" || detail.registers.filter((register) => register.isActive).length >= detailLimits.maxRegistersPerStore}
                >
                  Kassa qo‘shish
                </button>
              </form>
            </div>

            <div>
              <h4 className="font-title-sm text-title-sm text-on-surface mb-2">Kassirlar</h4>
              <div className="space-y-2">
                {detail.members.filter((member) => member.isActive).map((member) => (
                  <div key={member.id} className="flex items-center justify-between border border-outline-variant rounded-lg px-3 py-2 text-body-sm text-on-surface">
                    <span>
                      {member.user?.name || member.userId} <span className="text-on-surface-variant">· {member.role}</span>
                    </span>
                    {member.role !== "OWNER" && (
                      <button type="button" className="text-error" disabled={action === "cashier"} onClick={() => deactivate("cashier", member.id)}>
                        Faolsizlantirish
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <form onSubmit={submitCashier} className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
                <input className={inputCls} placeholder="Kassir ismi" value={cashierForm.name} onChange={(e) => setCashierForm({ ...cashierForm, name: e.target.value })} />
                <input className={inputCls} placeholder="+99890..." value={cashierForm.phone} onChange={(e) => setCashierForm({ ...cashierForm, phone: e.target.value })} />
                <button
                  type="submit"
                  className={primaryBtn}
                  disabled={action === "cashier" || detailUsage.cashiers >= detailLimits.maxCashiers}
                >
                  Kassir qo‘shish
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(created) && !createOpen}
        title="Yangi loginlar"
        description="Parollar faqat hozir ko‘rsatiladi."
        onClose={() => setCreated(null)}
        footer={<button type="button" className={primaryBtn} onClick={() => setCreated(null)}>Tayyor</button>}
      >
        <div className="border border-outline-variant rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-outline-variant text-body-sm">
            <thead className="bg-surface-bright">
              <tr>
                <th className="px-4 py-2 text-left font-label-caps text-label-caps text-on-surface-variant">Rol</th>
                <th className="px-4 py-2 text-left font-label-caps text-label-caps text-on-surface-variant">Login</th>
                <th className="px-4 py-2 text-left font-label-caps text-label-caps text-on-surface-variant">Parol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {created?.credentials.map((item) => (
                <tr key={`${item.role}-${item.login}`}>
                  <td className="px-4 py-2 text-on-surface">{item.role}</td>
                  <td className="px-4 py-2 text-on-surface">{item.login}</td>
                  <td className="px-4 py-2 font-mono text-on-surface">{item.password}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
}
