import { useCallback, useEffect, useState } from 'react';
import { Check, RefreshCw } from 'lucide-react';
import { getOrganizations, getPlans, getSubscription, changeSubscriptionPlan } from '../api/pos.api';

const limitText = (value) => (value >= 9999 ? 'Cheksiz' : String(value));
const money = (value) => new Intl.NumberFormat('uz-UZ').format(value || 0);

function Usage({ label, value, max }) {
  const pct = max >= 9999 ? 8 : Math.min(100, Math.round((value / Math.max(max, 1)) * 100));
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-500 dark:text-gray-400">{label}</span>
        <span className="font-semibold text-gray-800 dark:text-gray-100">
          {value} / {limitText(max)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <div
          className={`h-full rounded-full ${pct >= 100 ? 'bg-red-500' : 'bg-emerald-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function Subscription() {
  const [organization, setOrganization] = useState(null);
  const [plans, setPlans] = useState([]);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const orgRes = await getOrganizations({ limit: 100 });
      const organizations = orgRes.data?.data?.items || [];
      if (!organizations.length) throw new Error('Sizga birorta tashkilot biriktirilmagan');
      const org = organizations[0];
      const [plansRes, subRes] = await Promise.all([
        getPlans(),
        getSubscription(org.id),
      ]);
      setOrganization(org);
      setPlans(plansRes.data?.data?.plans || []);
      setCurrent(subRes.data?.data || null);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Ma'lumotlar yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleChange(planCode) {
    if (!organization || planCode === current?.subscription?.planCode) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await changeSubscriptionPlan({ planCode, periodDays: 30 }, organization.id);
      setMessage(`${planCode} tarifi qo‘llanildi.`);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Tarif o‘zgartirilmadi');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-gray-500 dark:text-gray-400">Yuklanmoqda...</div>;
  }

  const subscription = current?.subscription;
  const usage = current?.usage || { stores: 0, registers: 0, users: 0, cashiers: 0 };
  const limits = subscription?.limits || { maxStores: 1, maxRegistersPerStore: 3, maxUsers: 4, maxCashiers: 3 };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mening tarifim</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {organization?.name} · joriy foydalanish va tarif imkoniyatlari
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <RefreshCw size={16} /> Yangilash
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 px-4 py-3 text-sm">{error}</div>
      )}
      {message && !error && (
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-4 py-3 text-sm">{message}</div>
      )}

      <section className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Joriy tarif</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
              {subscription?.planName || '—'} · {money(subscription?.monthlyPrice)} so‘m/oy
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            {subscription?.status || 'TRIAL'}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-6">
          <Usage label="Do‘kon" value={usage.stores} max={limits.maxStores} />
          <Usage label="Kassa" value={usage.registers} max={limits.maxRegistersPerStore} />
          <Usage label="Foydalanuvchi" value={usage.users} max={limits.maxUsers} />
          <Usage label="Kassir" value={usage.cashiers} max={limits.maxCashiers} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Tariflar</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const active = plan.code === subscription?.planCode;
            return (
              <div
                key={plan.code}
                className={`bg-white dark:bg-gray-800 border rounded-xl p-5 ${
                  active ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-gray-100 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {plan.code}
                  </span>
                  {active && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                      Joriy
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-3">{plan.name}</h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {money(plan.monthlyPrice)} <span className="text-sm font-normal text-gray-500">so‘m/oy</span>
                </p>
                <ul className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex items-center gap-2"><Check size={15} className="text-emerald-500" /> Do‘kon: {limitText(plan.maxStores)}</li>
                  <li className="flex items-center gap-2"><Check size={15} className="text-emerald-500" /> Kassa: {limitText(plan.maxRegistersPerStore)} / do‘kon</li>
                  <li className="flex items-center gap-2"><Check size={15} className="text-emerald-500" /> Kassir: {limitText(plan.maxCashiers)}</li>
                  <li className="flex items-center gap-2"><Check size={15} className="text-emerald-500" /> Foydalanuvchi: {limitText(plan.maxUsers)}</li>
                </ul>
                <button
                  type="button"
                  disabled={active || busy}
                  onClick={() => handleChange(plan.code)}
                  className="mt-5 w-full rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold py-2 disabled:opacity-50"
                >
                  {active ? 'Tanlangan' : 'Bu tarifga o‘tish'}
                </button>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
          Hozircha to‘lov shlyuzi ulanmagan: tarif tanlash darhol qo‘llanadi. Keyin Payme/Click ulanganda tasdiqlash qadami qo‘shiladi.
        </p>
      </section>
    </div>
  );
}
