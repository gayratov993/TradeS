import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Search,
  CheckCircle,
  X,
  Minus,
  Plus,
  WifiOff,
  Clock,
  Trash2,
  CreditCard,
  Banknote,
  ArrowLeft,
  ShoppingCart,
  Package,
  Store,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as productsApi from '../../api/products.api';
import * as posApi from '../../api/pos.api';
import toast from 'react-hot-toast';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import { addPendingSale, getCachedProducts } from '../../services/offlineDB';

const money = (value) =>
  new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(Number(value || 0));

const qtyLabel = (value) => String(Number(value || 0));

const priceOf = (product) =>
  Number(product?.finalPrice || product?.sellPrice || product?.price || 0);

const stockOf = (product) => Number(product?.stock ?? product?.quantity ?? Infinity);

export default function PosNewSale() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isOnline } = useOnlineStatus();
  const outletCtx = useOutletContext() || {};

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Hammasi');
  const [cart, setCart] = useState([]);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [offlineProducts, setOfflineProducts] = useState([]);
  const [localContext, setLocalContext] = useState(null);
  const [contextError, setContextError] = useState('');
  const [shift, setShift] = useState(null);
  const [openingCash, setOpeningCash] = useState('100000');
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paidAmount, setPaidAmount] = useState('');
  const [receipt, setReceipt] = useState(null);
  const searchRef = useRef(null);

  const context = outletCtx.context || localContext;

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isOnline) {
      getCachedProducts().then(setOfflineProducts).catch(() => setOfflineProducts([]));
      return undefined;
    }
    if (context) return undefined;

    let active = true;
    posApi
      .ensurePosContext()
      .then((ctx) => {
        if (active) {
          setLocalContext(ctx);
          setContextError('');
        }
      })
      .catch((err) => {
        if (active) setContextError(err?.response?.data?.message || err?.message || 'Kassa konteksti yuklanmadi');
      });
    return () => {
      active = false;
    };
  }, [isOnline, context]);

  const loadShift = useCallback(async () => {
    try {
      const res = await posApi.getActiveShift();
      setShift(res?.data?.data?.shift || null);
    } catch (err) {
      if (err?.response?.status === 404) setShift(null);
      else setContextError(err?.response?.data?.message || 'Smena holati olinmadi');
    }
  }, []);

  useEffect(() => {
    if (!isOnline || !context) return;
    setShift(null);
    loadShift();
  }, [isOnline, context?.registerId, loadShift]);

  const { data } = useQuery({
    queryKey: ['pos-products', search],
    queryFn: () => productsApi.getProducts({ search, limit: 60, inStock: 'false' }),
    enabled: isOnline,
  });

  const onlineProducts = data?.data?.data?.products || [];
  const catalogProducts = isOnline
    ? onlineProducts
    : search.length > 0
      ? offlineProducts.filter((product) => product.name?.toLowerCase().includes(search.toLowerCase()))
      : offlineProducts;

  const categories = ['Hammasi', ...new Set(catalogProducts.map((product) => product.category).filter(Boolean))];
  const visibleProducts =
    category === 'Hammasi'
      ? catalogProducts
      : catalogProducts.filter((product) => product.category === category);

  const subtotal = cart.reduce((sum, line) => sum + priceOf(line.product) * line.qty, 0);
  const itemCount = cart.reduce((sum, line) => sum + line.qty, 0);

  const invalidateCatalog = () => {
    qc.invalidateQueries(['pos-summary']);
    qc.invalidateQueries(['pos-sales']);
    qc.invalidateQueries(['pos-products']);
    qc.invalidateQueries(['pos-products-list']);
    qc.invalidateQueries(['products']);
  };

  const addToCart = (product) => {
    if (stockOf(product) <= 0) return;
    setCart((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (existing) {
        return current.map((line) =>
          line.product.id === product.id
            ? { ...line, qty: Math.min(line.qty + 1, stockOf(product)) }
            : line
        );
      }
      return [...current, { product, qty: 1 }];
    });
    setSearch('');
    searchRef.current?.focus();
  };

  const changeQty = (productId, delta) => {
    setCart((current) =>
      current
        .map((line) =>
          line.product.id === productId
            ? { ...line, qty: Math.max(0.5, Math.min(line.qty + delta, stockOf(line.product))) }
            : line
        )
        .filter((line) => line.qty > 0)
    );
  };

  const removeLine = (productId) =>
    setCart((current) => current.filter((line) => line.product.id !== productId));

  const handleOpenShift = async () => {
    setIsSubmitting(true);
    try {
      const res = await posApi.openShift({ openingCash: Number(openingCash) || 0 });
      setShift(res?.data?.data?.shift || null);
      toast.success('Kassa smenasi ochildi');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Smenani ochish muvaffaqiyatsiz tugadi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPayment = () => {
    if (!cart.length) return;
    if (isOnline && !shift) {
      toast.error('Avval kassa smenasini oching');
      return;
    }
    setPaidAmount(String(Math.ceil(subtotal)));
    setShowPayment(true);
  };

  const handleConfirm = async () => {
    if (!cart.length) return;
    const amount = Number(paidAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('To‘lov summasi noto‘g‘ri');
      return;
    }
    if (isOnline && amount < subtotal) {
      toast.error(`To‘lov yetarli emas. Jami: ${money(subtotal)} so‘m`);
      return;
    }

    setIsSubmitting(true);
    try {
      if (!isOnline) {
        for (const line of cart) {
          await addPendingSale({
            product: line.product.id,
            productName: line.product.name,
            quantity: line.qty,
            sellPrice: priceOf(line.product),
            buyPrice: Number(line.product.buyPrice || 0),
            unit: line.product.unit || 'pcs',
            note,
            localId: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          });
        }
        outletCtx.refreshPending?.();
        toast.success(`${cart.length} ta mahsulot offline saqlandi`);
        setCart([]);
        setShowPayment(false);
        return;
      }

      const res = await posApi.createTransaction({
        note,
        items: cart.map((line) => ({
          productId: line.product.id,
          quantity: line.qty,
        })),
        payments: [{ method: paymentMethod, amount }],
      });
      const transaction = res?.data?.data?.transaction;
      setReceipt(transaction);
      setCart([]);
      setNote('');
      setShowPayment(false);
      invalidateCatalog();
      toast.success(`Chek ${transaction?.receiptNumber || ''} tasdiqlandi`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Savdoni saqlash muvaffaqiyatsiz tugadi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-pos-bg text-pos-text">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-pos-border">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/pos')} className="p-2 rounded-lg hover:bg-pos-card text-pos-muted transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-black leading-none">Yangi savdo</h1>
            <p className="text-pos-muted text-xs mt-1 truncate flex items-center gap-1.5">
              <Store className="h-3 w-3" />
              {context?.storeName || 'Do‘kon yuklanmoqda'} · {context?.registerName || 'Kassa'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isOnline && (
            <span className="flex items-center gap-1.5 text-xs font-bold bg-yellow-500/15 text-yellow-400 px-2.5 py-1.5 rounded-full">
              <WifiOff className="h-3.5 w-3.5" /> Offline
            </span>
          )}
          <span className={`hidden sm:flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-full ${shift ? 'bg-pos-accent/15 text-pos-accent' : 'bg-pos-border text-pos-muted'}`}>
            <Clock className="h-3.5 w-3.5" /> {shift ? 'Smena ochiq' : 'Smena yopiq'}
          </span>
        </div>
      </div>

      {!isOnline && (
        <div className="flex items-start gap-2 bg-yellow-500/10 border-b border-yellow-500/30 px-4 sm:px-6 py-2.5 text-xs text-yellow-300">
          <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
          Savdolar qurilmangizda saqlanadi va internet tiklananda avtomatik yuboriladi.
        </div>
      )}

      {contextError && (
        <div className="bg-red-500/10 border-b border-red-500/30 px-4 sm:px-6 py-2.5 text-xs text-red-300">
          {contextError}
        </div>
      )}

      {isOnline && context && !shift && (
        <div className="mx-4 sm:mx-6 mt-4 rounded-2xl border border-pos-border bg-pos-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className="font-bold text-sm">Kassa smenasini oching</p>
            <p className="text-pos-muted text-xs mt-0.5">Savdo qilish uchun ushbu kassada ochiq smena kerak.</p>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              value={openingCash}
              onChange={(event) => setOpeningCash(event.target.value)}
              className="w-32 bg-pos-bg border border-pos-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-pos-accent"
              placeholder="Boshlang‘ich naqd"
            />
            <button
              onClick={handleOpenShift}
              disabled={isSubmitting}
              className="bg-pos-accent hover:bg-pos-accentHover disabled:opacity-50 text-slate-950 font-black px-5 py-2.5 rounded-xl text-sm"
            >
              Ochish
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-h-0 flex flex-col p-4 sm:p-6 lg:border-r border-pos-border">
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-pos-muted" />
            <input
              ref={searchRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full bg-pos-card border border-pos-border rounded-2xl pl-12 pr-4 py-3.5 text-sm text-white placeholder-pos-muted outline-none focus:border-pos-accent"
              placeholder="Mahsulot nomi yoki shtrix-kod..."
            />
          </div>

          {categories.length > 1 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 mb-2">
              {categories.map((item) => (
                <button
                  key={item}
                  onClick={() => setCategory(item)}
                  className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                    category === item
                      ? 'bg-pos-accent/15 border-pos-accent text-pos-accent'
                      : 'bg-pos-card border-pos-border text-pos-muted hover:text-white'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            {visibleProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {visibleProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={stockOf(product) <= 0}
                    className="group rounded-2xl border border-pos-border bg-pos-card hover:border-pos-accent transition-colors text-left overflow-hidden disabled:opacity-40"
                  >
                    <div className="h-20 bg-gradient-to-br from-pos-accent/15 to-transparent flex items-center justify-center">
                      <Package className="h-8 w-8 text-pos-accent/70" />
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-semibold line-clamp-2 min-h-[40px]">{product.name}</p>
                      <p className="text-pos-muted text-[11px] mt-1 truncate">{product.category || 'Mahsulot'}</p>
                      <div className="flex items-center justify-between mt-3">
                        <div>
                          <p className="text-pos-accent font-black text-sm">{money(priceOf(product))}</p>
                          <p className="text-pos-muted text-[10px]">so‘m · qoldiq {Number.isFinite(stockOf(product)) ? stockOf(product) : '∞'}</p>
                        </div>
                        <span className="h-8 w-8 rounded-lg bg-pos-accent text-slate-950 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Plus className="h-4 w-4" />
                        </span>
                      </div>
                      {stockOf(product) === 0 && <p className="text-red-400 text-[10px] mt-1 font-bold">Tugagan</p>}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-pos-muted">
                <Package className="h-10 w-10 mb-3 opacity-50" />
                <p className="text-sm">{search ? 'Mahsulot topilmadi' : 'Mahsulotlar yuklanmoqda yoki mavjud emas'}</p>
              </div>
            )}
          </div>
        </div>

        <aside className="min-h-0 flex flex-col bg-pos-card/40">
          <div className="px-5 py-4 border-b border-pos-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-pos-accent" />
              <h2 className="font-black">Savat</h2>
            </div>
            <span className="text-xs text-pos-muted font-semibold">{qtyLabel(itemCount)} ta</span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-pos-muted text-center">
                <ShoppingCart className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm font-semibold">Savat bo‘sh</p>
                <p className="text-xs mt-1">Mahsulot tanlash uchun chap tomondan foydalaning</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((line) => (
                  <div key={line.product.id} className="rounded-xl border border-pos-border bg-pos-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold leading-snug line-clamp-2">{line.product.name}</p>
                      <button onClick={() => removeLine(line.product.id)} className="text-pos-muted hover:text-red-400 flex-shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => changeQty(line.product.id, -1)} className="h-7 w-7 rounded-lg bg-pos-border flex items-center justify-center hover:bg-pos-border/70">
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-sm font-black w-9 text-center">{qtyLabel(line.qty)}</span>
                        <button onClick={() => changeQty(line.product.id, 1)} className="h-7 w-7 rounded-lg bg-pos-border flex items-center justify-center hover:bg-pos-border/70">
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-pos-muted">{qtyLabel(line.qty)} × {money(priceOf(line.product))}</p>
                        <p className="text-sm font-black text-pos-accent">{money(priceOf(line.product) * line.qty)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-pos-border p-5 space-y-4">
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="w-full bg-pos-bg border border-pos-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-pos-accent placeholder-pos-muted"
              placeholder="Izoh (ixtiyoriy)"
            />
            <div className="flex items-end justify-between">
              <div>
                <p className="text-pos-muted text-xs font-bold uppercase tracking-widest">Jami</p>
                <p className="text-[11px] text-pos-muted mt-1">{qtyLabel(itemCount)} ta mahsulot</p>
              </div>
              <p className="text-3xl font-black text-pos-accent leading-none">{money(subtotal)} <span className="text-sm">so‘m</span></p>
            </div>
            <button
              onClick={openPayment}
              disabled={!cart.length || isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-pos-accent hover:bg-pos-accentHover disabled:opacity-50 text-slate-950 font-black py-4 rounded-2xl text-base transition-colors"
            >
              <CheckCircle className="h-5 w-5" /> To‘lovga o‘tish
            </button>
          </div>
        </aside>
      </div>

      {showPayment && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-pos-card border border-pos-border rounded-2xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black">To‘lov</h2>
              <button onClick={() => setShowPayment(false)} className="text-pos-muted hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="rounded-xl bg-pos-bg p-4 mb-4">
              <p className="text-xs text-pos-muted uppercase font-bold tracking-widest">To‘lanadigan summa</p>
              <p className="text-3xl font-black text-pos-accent mt-1">{money(subtotal)} <span className="text-sm">so‘m</span></p>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => setPaymentMethod('CASH')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border font-semibold text-sm ${
                  paymentMethod === 'CASH' ? 'border-pos-accent bg-pos-accent/10 text-pos-accent' : 'border-pos-border text-pos-muted'
                }`}
              >
                <Banknote className="h-4 w-4" /> Naqd
              </button>
              <button
                onClick={() => setPaymentMethod('CARD')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border font-semibold text-sm ${
                  paymentMethod === 'CARD' ? 'border-pos-accent bg-pos-accent/10 text-pos-accent' : 'border-pos-border text-pos-muted'
                }`}
              >
                <CreditCard className="h-4 w-4" /> Karta
              </button>
            </div>
            <input
              type="number"
              min="0"
              value={paidAmount}
              onChange={(event) => setPaidAmount(event.target.value)}
              className="w-full bg-pos-bg border border-pos-border rounded-xl px-4 py-3 text-lg outline-none focus:border-pos-accent mb-3"
              placeholder="To‘langan summa"
            />
            <div className="flex gap-2 mb-4">
              {[Math.ceil(subtotal), Math.ceil(subtotal / 1000) * 1000, Math.ceil(subtotal / 10000) * 10000].map((value, index) => (
                <button
                  key={index}
                  onClick={() => setPaidAmount(String(value))}
                  className="flex-1 border border-pos-border rounded-lg py-2 text-xs font-semibold text-pos-muted hover:border-pos-accent hover:text-pos-accent"
                >
                  {money(value)}
                </button>
              ))}
            </div>
            <p className="text-sm text-pos-muted mb-4">
              Qaytim: <span className="text-white font-bold">{money(Number(paidAmount) - subtotal)} so‘m</span>
            </p>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="w-full bg-pos-accent hover:bg-pos-accentHover disabled:opacity-50 text-slate-950 font-black py-3.5 rounded-xl"
            >
              {isSubmitting ? 'Saqlanmoqda...' : 'Savdoni tasdiqlash'}
            </button>
          </div>
        </div>
      )}

      {receipt && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-pos-card border border-pos-accent rounded-2xl w-full max-w-md p-5">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-pos-accent mx-auto mb-3" />
              <h2 className="text-lg font-black">Savdo tasdiqlandi</h2>
              <p className="text-pos-muted text-sm mt-1">{receipt.receiptNumber}</p>
            </div>
            <div className="space-y-2 text-sm mt-5 rounded-xl bg-pos-bg p-4">
              <div className="flex justify-between"><span className="text-pos-muted">Savdo raqami</span><span className="font-semibold">{receipt.saleNumber}</span></div>
              <div className="flex justify-between"><span className="text-pos-muted">Jami</span><span className="font-black">{money(receipt.totalAmount)} so‘m</span></div>
              <div className="flex justify-between"><span className="text-pos-muted">To‘langan</span><span>{money(receipt.paidAmount)} so‘m</span></div>
              <div className="flex justify-between"><span className="text-pos-muted">Qaytim</span><span className="text-pos-accent font-bold">{money(receipt.changeAmount)} so‘m</span></div>
            </div>
            <button
              onClick={() => setReceipt(null)}
              className="w-full mt-5 bg-pos-accent hover:bg-pos-accentHover text-slate-950 font-black py-3 rounded-xl"
            >
              Yopish
            </button>
            <button onClick={loadShift} className="w-full mt-2 text-pos-muted text-sm py-2">
              Smena holatini yangilash
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
