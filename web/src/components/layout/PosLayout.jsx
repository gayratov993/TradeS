import { NavLink, Outlet } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  Plus,
  WifiOff,
  Wifi,
  RefreshCw,
  Store,
  ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import { fullSync, pullAndCacheProducts } from '../../services/webSyncService';
import { getPendingSales } from '../../services/offlineDB';
import { ensurePosContext, getRegisters } from '../../api/pos.api';
import { setPosContext } from '../../utils/posContext';

const nav = [
  { to: '/pos', icon: LayoutDashboard, label: 'Bosh sahifa', end: true },
  { to: '/pos/products', icon: Package, label: 'Mahsulotlar' },
  { to: '/pos/sales', icon: ShoppingCart, label: 'Savdolar' },
  { to: '/pos/reports', icon: BarChart3, label: 'Hisobotlar' },
];

export default function PosLayout() {
  const { isOnline } = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [context, setContext] = useState(null);
  const [registers, setRegisters] = useState([]);
  const [contextError, setContextError] = useState('');

  const refreshPending = useCallback(async () => {
    const pending = await getPendingSales();
    setPendingCount(pending.length);
  }, []);

  const loadContext = useCallback(async () => {
    try {
      const ctx = await ensurePosContext();
      setContext(ctx);
      setContextError('');
      const res = await getRegisters(ctx.storeId, { limit: 100 });
      setRegisters(res?.data?.data?.items || []);
    } catch (err) {
      setContextError(err?.response?.data?.message || err?.message || 'Kassa konteksti yuklanmadi');
    }
  }, []);

  useEffect(() => {
    refreshPending();
    if (navigator.onLine) pullAndCacheProducts().catch(() => {});
    if (isOnline) loadContext();
  }, [isOnline, loadContext, refreshPending]);

  useEffect(() => {
    if (!isOnline) return;

    const runSync = async () => {
      const pending = await getPendingSales();
      if (pending.length === 0) return;

      setIsSyncing(true);
      try {
        const { synced, failed } = await fullSync();
        if (synced > 0) toast.success(`${synced} savdo serverga yuklandi`);
        if (failed > 0) toast.error(`${failed} savdo yuklanmadi`);
        await refreshPending();
      } finally {
        setIsSyncing(false);
      }
    };

    runSync();
  }, [isOnline, refreshPending]);

  const handleManualSync = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    try {
      const { synced, failed } = await fullSync();
      if (synced > 0) toast.success(`${synced} savdo yuklandi`);
      else if (failed === 0) toast.success('Hamma narsa sinxronlashgan');
      if (failed > 0) toast.error(`${failed} ta yuklanmadi`);
      await refreshPending();
    } finally {
      setIsSyncing(false);
    }
  };

  const selectRegister = (registerId) => {
    if (!context) return;
    const register = registers.find((item) => item.id === registerId);
    if (!register) return;

    const next = { ...context, registerId: register.id, registerName: register.name };
    setPosContext(next);
    setContext(next);
    window.dispatchEvent(new CustomEvent('pos-context-change', { detail: next }));
    toast.success(`${register.name} tanlandi`);
  };

  return (
    <div className="flex h-screen bg-pos-bg overflow-hidden text-pos-text">
      {!isOnline && (
        <div className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 bg-yellow-500 text-slate-950 text-xs font-bold py-1.5">
          <WifiOff className="h-4 w-4" />
          Offline rejim — savdolar qurilmada saqlanadi, internet tiklananda yuboriladi
        </div>
      )}

      <aside className="hidden md:flex w-64 flex-shrink-0 flex-col border-r border-pos-border bg-pos-card">
        <div className="px-5 py-5 border-b border-pos-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-pos-accent text-slate-950 font-black flex items-center justify-center text-lg">
              T
            </div>
            <div>
              <div className="text-lg font-black tracking-tight leading-none">Savdo Go <span className="text-pos-accent">POS</span></div>
              <p className="text-pos-muted text-[11px] mt-1">Savdo operatsion tizimi</p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 text-xs font-semibold mt-4 ${isOnline ? 'text-pos-accent' : 'text-yellow-400'}`}>
            {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {isOnline ? 'Tizim ulangan' : 'Oflayn rejim'}
          </div>
        </div>

        <div className="p-4 border-b border-pos-border">
          <p className="text-[10px] uppercase tracking-widest text-pos-muted font-bold mb-2">Joriy do‘kon</p>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Store className="h-4 w-4 text-pos-accent" />
            <span className="truncate">{context?.storeName || 'Yuklanmoqda...'}</span>
          </div>
          {contextError && <p className="text-red-400 text-[11px] mt-2 leading-snug">{contextError}</p>}
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {nav.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
                  isActive ? 'bg-pos-accent/15 text-pos-accent' : 'text-pos-muted hover:bg-pos-border/60 hover:text-white'
                }`
              }
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {label}
              {label === 'Savdolar' && pendingCount > 0 && (
                <span className="ml-auto bg-yellow-500 text-slate-950 text-[11px] font-black px-1.5 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-pos-border space-y-2">
          {pendingCount > 0 && (
            <button
              onClick={handleManualSync}
              disabled={!isOnline || isSyncing}
              className="flex items-center justify-center gap-2 w-full border border-yellow-500/60 text-yellow-400 hover:bg-yellow-500/10 disabled:opacity-50 font-semibold px-3 py-2.5 rounded-xl text-sm"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Yuklanmoqda...' : `${pendingCount} savdoni yuklash`}
            </button>
          )}
          <NavLink
            to="/pos/sales/new"
            className="flex items-center justify-center gap-2 w-full bg-pos-accent hover:bg-pos-accentHover text-slate-950 font-black px-3 py-3 rounded-xl text-sm transition-colors"
          >
            <Plus className="h-4 w-4" /> Yangi savdo
          </NavLink>
        </div>
      </aside>

      <div className={`flex-1 min-w-0 flex flex-col overflow-hidden ${!isOnline ? 'mt-6' : ''}`}>
        <header className="h-14 flex-shrink-0 border-b border-pos-border bg-pos-card/70 px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="hidden sm:inline text-xs text-pos-muted uppercase tracking-widest font-bold">Kassa</span>
            <div className="relative">
              <select
                value={context?.registerId || ''}
                onChange={(event) => selectRegister(event.target.value)}
                disabled={!context || registers.length === 0}
                className="appearance-none bg-pos-bg border border-pos-border rounded-lg pl-3 pr-8 py-2 text-sm font-semibold text-white outline-none focus:border-pos-accent disabled:opacity-50 max-w-[180px]"
              >
                {registers.length === 0 && <option>Yuklanmoqda...</option>}
                {registers.map((register) => (
                  <option key={register.id} value={register.id}>
                    {register.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-pos-muted" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {context?.storeName && <span className="hidden sm:inline text-xs text-pos-muted truncate max-w-[220px]">{context.storeName}</span>}
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${isOnline ? 'bg-pos-accent/15 text-pos-accent' : 'bg-yellow-500/15 text-yellow-400'}`}>
              {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto pb-20 md:pb-0">
          <Outlet context={{ refreshPending, context, registers, selectRegister }} />
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 inset-x-0 bg-pos-card border-t border-pos-border flex z-40">
        {nav.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors relative ${
                isActive ? 'text-pos-accent' : 'text-pos-muted'
              }`
            }
          >
            <Icon className="h-5 w-5" />
            {label}
            {label === 'Savdolar' && pendingCount > 0 && (
              <span className="absolute top-1 right-2 bg-yellow-500 text-slate-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </NavLink>
        ))}
        <NavLink to="/pos/sales/new" className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold text-pos-accent">
          <Plus className="h-5 w-5" /> Savdo
        </NavLink>
      </div>
    </div>
  );
}
