/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  CheckCircle, 
  MessageCircle, 
  Wallet, 
  ShoppingBag, 
  User, 
  CreditCard, 
  TrendingUp,
  Package,
  Clock,
  Bitcoin,
  LayoutDashboard,
  Users,
  QrCode,
  ArrowRight,
  FileText,
  Building2,
  Lock,
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  Menu,
  X,
  ChevronRight,
  Home,
  Settings,
  BarChart3,
  Store,
  Share2,
  Trash
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import { QRCodeSVG } from 'qrcode.react';

// --- Types ---

type PaymentMethod = 'Cash' | 'Bank' | 'Crypto (VERSE)';
type OrderStatus = 'Pending' | 'Paid';
type TabType = 'orders' | 'analytics' | 'customers' | 'settings' | 'storefront';

interface Order {
  id: number;
  customer: string;
  customerPhone?: string;
  items: string;
  amount: number;
  payment: PaymentMethod;
  reward: number;
  status: OrderStatus;
  createdAt: number;
  bank?: string;
  accountNumber?: string;
  accountName?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
}

interface BusinessProfile {
  name: string;
  bio: string;
  logo: string;
  bankInfo: {
    bank: string;
    accountNumber: string;
    accountName: string;
  };
}

interface Transaction {
  id: string;
  type: 'SALE' | 'DEPOSIT' | 'WITHDRAWAL';
  amount: number;
  currency: 'NGN' | 'VERSE';
  timestamp: number;
  description: string;
  orderId?: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  notes: string;
  totalSpent: number;
  orderCount: number;
  lastOrderAt: number;
}

// --- Constants ---

const REWARD_RATE = 0.02; // 2% reward
const VERSE_LOGO = "https://lh3.googleusercontent.com/d/16A9AFdJNQTZEIqoK0nYs8yKCVfcPvcIj";

export default function App() {
  // --- State ---
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customer, setCustomer] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [items, setItems] = useState('');
  const [amount, setAmount] = useState('');
  const [payment, setPayment] = useState<PaymentMethod>('Cash');
  const [bank, setBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Storefront State
  const [profile, setProfile] = useState<BusinessProfile>({
    name: 'Sero Paul Store',
    bio: 'Premium goods delivered across Nigeria.',
    logo: VERSE_LOGO,
    bankInfo: { bank: 'GTBank', accountNumber: '0123456789', accountName: 'Sero Paul Enterprise' }
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [isPublicPreview, setIsPublicPreview] = useState(false);
  const [cart, setCart] = useState<{product: Product, qty: number}[]>([]);
  const [checkoutStep, setCheckoutStep] = useState<'browse' | 'details' | 'success'>('browse');

  // Customer Profile State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  
  // Finance State
  const [walletBalance, setWalletBalance] = useState(0);
  const [cashBalance, setCashBalance] = useState(0);
  const [isOnRampOpen, setIsOnRampOpen] = useState(false);
  const [isOffRampOpen, setIsOffRampOpen] = useState(false);
  const [rampAmount, setRampAmount] = useState('');
  const [withdrawBank, setWithdrawBank] = useState('GTBank');

  // Payment Modal State
  const [paymentModalOrder, setPaymentModalOrder] = useState<Order | null>(null);

  // --- Effects ---
  useEffect(() => {
    const savedOrders = localStorage.getItem('verse_vendor_orders_pro');
    const savedCustomers = localStorage.getItem('verse_vendor_customers_v1');
    const savedTransactions = localStorage.getItem('verse_vendor_ledgers_v1');
    const savedProducts = localStorage.getItem('verse_vendor_products_v1');
    const savedProfile = localStorage.getItem('verse_vendor_profile_v1');
    const savedWallet = localStorage.getItem('verse_wallet_bal');
    const savedCash = localStorage.getItem('verse_cash_bal');

    if (savedOrders) {
      try {
        setOrders(JSON.parse(savedOrders));
      } catch (e) {
        console.error('Failed to load orders', e);
      }
    }
    if (savedCustomers) {
      try {
        setCustomers(JSON.parse(savedCustomers));
      } catch (e) {
        console.error('Failed to load customers', e);
      }
    }
    if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
    if (savedProducts) setProducts(JSON.parse(savedProducts));
    if (savedProfile) setProfile(JSON.parse(savedProfile));
    if (savedWallet) setWalletBalance(parseInt(savedWallet));
    if (savedCash) setCashBalance(parseInt(savedCash));
  }, []);

  useEffect(() => {
    localStorage.setItem('verse_vendor_orders_pro', JSON.stringify(orders));
    localStorage.setItem('verse_vendor_customers_v1', JSON.stringify(customers));
    localStorage.setItem('verse_vendor_ledgers_v1', JSON.stringify(transactions));
    localStorage.setItem('verse_vendor_products_v1', JSON.stringify(products));
    localStorage.setItem('verse_vendor_profile_v1', JSON.stringify(profile));
    localStorage.setItem('verse_wallet_bal', walletBalance.toString());
    localStorage.setItem('verse_cash_bal', cashBalance.toString());
  }, [orders, customers, transactions, products, profile, walletBalance, cashBalance]);

  // --- Computed Stats ---
  const stats = useMemo(() => {
    const paidOrders = orders.filter(o => o.status === 'Paid');
    const cryptoOrdersCount = paidOrders.filter(o => o.payment.includes('Crypto')).length;

    // Growth calculation (This week vs last week)
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const thisWeekRevenue = paidOrders
      .filter(o => o.createdAt > now - oneWeek)
      .reduce((acc, o) => acc + o.amount, 0);
    const lastWeekRevenue = paidOrders
      .filter(o => o.createdAt <= now - oneWeek && o.createdAt > now - (oneWeek * 2))
      .reduce((acc, o) => acc + o.amount, 0);

    const growth = lastWeekRevenue === 0 ? 100 : ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100;
    
    // Revenue split
    const totalRev = paidOrders.reduce((acc, o) => acc + o.amount, 0);
    const split = {
      bank: (paidOrders.filter(o => o.payment === 'Bank').reduce((acc, o) => acc + o.amount, 0) / totalRev) * 100 || 0,
      cash: (paidOrders.filter(o => o.payment === 'Cash').reduce((acc, o) => acc + o.amount, 0) / totalRev) * 100 || 0,
      crypto: (paidOrders.filter(o => o.payment.includes('Crypto')).reduce((acc, o) => acc + o.amount, 0) / totalRev) * 100 || 0,
    };
    
    // Customer Map
    const customerMap: Record<string, { count: number; spend: number }> = {};
    paidOrders.forEach(o => {
      if (!customerMap[o.customer]) {
        customerMap[o.customer] = { count: 0, spend: 0 };
      }
      customerMap[o.customer].count += 1;
      customerMap[o.customer].spend += o.amount;
    });

    const topCustomers = Object.entries(customerMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.spend - a.spend);

    return { 
      cryptoOrders: cryptoOrdersCount, 
      topCustomers, 
      growth, 
      revenue: totalRev,
      thisWeekRevenue,
      split
    };
  }, [orders]);

  // --- Handlers ---
  const buyVerse = () => {
    const amount = parseFloat(rampAmount);
    if (!amount || isNaN(amount)) return;
    
    const verseTokens = Math.floor(amount / 100);
    const timestamp = Date.now();
    
    const depositTx: Transaction = {
      id: `tx_${timestamp}`,
      type: 'DEPOSIT',
      amount: verseTokens,
      currency: 'VERSE',
      timestamp,
      description: 'Purchased Verse Tokens'
    };

    setTransactions(prev => [depositTx, ...prev]);
    setWalletBalance(prev => prev + verseTokens);
    setRampAmount('');
    setIsOnRampOpen(false);
  };

  const cashOut = () => {
    const amount = parseInt(rampAmount);
    if (!amount || isNaN(amount) || amount > walletBalance) {
      alert("Insufficient VERSE balance");
      return;
    }

    const nairaEquivalent = amount * 100;
    const timestamp = Date.now();
    
    const withdrawTx: Transaction = {
      id: `tx_${timestamp}`,
      type: 'WITHDRAWAL',
      amount: nairaEquivalent,
      currency: 'NGN',
      timestamp,
      description: `Withdrawn to ${withdrawBank}`
    };

    setTransactions(prev => [withdrawTx, ...prev]);
    setWalletBalance(prev => prev - amount);
    setCashBalance(prev => prev + nairaEquivalent);
    setRampAmount('');
    setIsOffRampOpen(false);
  };

  const addOrder = () => {
    if (!customer || !items || !amount) return;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return;

    const timestamp = Date.now();
    const newOrder: Order = {
      id: timestamp,
      customer,
      customerPhone,
      items,
      amount: numAmount,
      payment,
      reward: Math.floor(numAmount * REWARD_RATE),
      status: 'Pending',
      createdAt: timestamp,
      bank: payment === 'Bank' ? bank : undefined,
      accountNumber: payment === 'Bank' ? accountNumber : undefined,
      accountName: payment === 'Bank' ? accountName : undefined,
    };

    // Update or Create Customer
    setCustomers(prev => {
      const existing = prev.find(c => c.name.toLowerCase() === customer.toLowerCase());
      if (existing) {
        return prev.map(c => c.name.toLowerCase() === customer.toLowerCase() ? {
          ...c,
          phone: customerPhone || c.phone,
          lastOrderAt: timestamp,
          // Note: totalSpent and orderCount update on "Mark Paid"
        } : c);
      } else {
        const newCustomer: Customer = {
          id: `cust_${timestamp}`,
          name: customer,
          phone: customerPhone,
          notes: '',
          totalSpent: 0,
          orderCount: 0,
          lastOrderAt: timestamp
        };
        return [newCustomer, ...prev];
      }
    });

    setOrders(prev => [newOrder, ...prev]);
    setCustomer('');
    setCustomerPhone('');
    setItems('');
    setAmount('');
    setBank('');
    setAccountNumber('');
    setAccountName('');
    setIsFormOpen(false);
  };

  const markPaid = (id: number) => {
    const order = orders.find(o => o.id === id);
    if (!order) return;

    const timestamp = Date.now();

    // Create Transaction Record
    const saleTx: Transaction = {
      id: `tx_${timestamp}`,
      type: 'SALE',
      amount: order.amount,
      currency: 'NGN',
      timestamp,
      description: `Sale to ${order.customer}`,
      orderId: order.id
    };

    setTransactions(prev => [saleTx, ...prev]);

    // Update Customer Stats
    setCustomers(prev => prev.map(c => c.name.toLowerCase() === order.customer.toLowerCase() ? {
      ...c,
      totalSpent: c.totalSpent + order.amount,
      orderCount: c.orderCount + 1
    } : c));

    if (order.payment.includes('Crypto')) {
      setWalletBalance(prev => prev + order.reward);
    } else {
      setCashBalance(prev => prev + order.amount);
    }

    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'Paid' } : o));
    setPaymentModalOrder(null);
  };

  const deleteOrder = (id: number) => {
    setOrders(prev => prev.filter(o => o.id !== id));
  };

  const shareOrder = (order: Order) => {
    const message = `*Verse Vendor Order Summary*\n` +
      `👤 *Customer:* ${order.customer}\n` +
      `📦 *Items:* ${order.items}\n` +
      `💰 *Amount:* ₦${order.amount.toLocaleString()}\n` +
      `💳 *Payment:* ${order.payment}\n` +
      `🎁 *Reward Earned:* ${order.reward} Verse\n\n` +
      `_Status: ${order.status}_`;

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleStorefrontOrder = () => {
    if (!customer || cart.length === 0) return;
    
    const itemsStr = cart.map(i => `${i.qty}x ${i.product.name}`).join(', ');
    const totalAmount = cart.reduce((acc, i) => acc + (i.product.price * i.qty), 0);
    const timestamp = Date.now();

    const newOrder: Order = {
      id: timestamp,
      customer,
      customerPhone,
      items: itemsStr,
      amount: totalAmount,
      payment: 'Bank', // Default for storefront
      reward: Math.floor(totalAmount * REWARD_RATE),
      status: 'Pending',
      createdAt: timestamp,
    };

    setOrders(prev => [newOrder, ...prev]);
    
    // Update Customer Memory
    setCustomers(prev => {
      const existing = prev.find(c => c.name.toLowerCase() === customer.toLowerCase());
      if (existing) {
        return prev.map(c => c.name.toLowerCase() === customer.toLowerCase() ? {
          ...c,
          phone: customerPhone || c.phone,
          lastOrderAt: timestamp,
        } : c);
      } else {
        return [{
          id: `cust_${timestamp}`,
          name: customer,
          phone: customerPhone,
          notes: 'Storefront Customer',
          totalSpent: 0,
          orderCount: 0,
          lastOrderAt: timestamp
        }, ...prev];
      }
    });

    setCheckoutStep('success');
    setCart([]);
    setCustomer('');
    setCustomerPhone('');
  };

  const generateInvoice = (order: Order) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(106, 13, 173); // Purple theme
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('VERSE VENDOR PRO', 20, 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text("NIGERIA'S PREMIUM VENDOR OS", 20, 32);
    
    // Invoice Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`INVOICE ID: #${order.id}`, 150, 50);
    doc.text(`DATE: ${new Date(order.createdAt).toLocaleDateString()}`, 150, 55);
    doc.text(`STATUS: PAID`, 150, 60);

    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 65, 190, 65);

    // Customer Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO:', 20, 75);
    doc.setFont('helvetica', 'normal');
    doc.text(order.customer.toUpperCase(), 20, 82);

    // Order Table Header
    doc.setFillColor(240, 240, 240);
    doc.rect(20, 95, 170, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIPTION', 25, 101);
    doc.text('AMOUNT', 160, 101);

    // Order Table Content
    doc.setFont('helvetica', 'normal');
    doc.text(order.items, 25, 115);
    doc.text(`N${order.amount.toLocaleString()}`, 160, 115);

    // Totals
    doc.line(20, 125, 190, 125);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL AMOUNT:', 120, 135);
    doc.text(`N${order.amount.toLocaleString()}`, 160, 135);

    // Reward/Payment Info
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Payment Method: ${order.payment}`, 20, 150);
    doc.text(`Verse Reward Earned: ${order.reward} V`, 20, 155);

    // Simulated QR Code
    doc.setDrawColor(0, 0, 0);
    doc.rect(150, 160, 30, 30);
    for(let i=0; i<40; i++) {
      const rx = 150 + Math.random() * 26;
      const ry = 160 + Math.random() * 26;
      doc.rect(rx, ry, 2, 2, 'F');
    }
    doc.setFontSize(8);
    doc.text('SECURE VERIFIED', 152, 195);

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('Thank you for your business! Stay Verse.', 20, 280);
    doc.text('Powered by Verse Vendor Ecosystem • 2026', 120, 280);

    doc.save(`${order.customer}_Invoice_${order.id}.pdf`);
  };

  return (
    <div className="min-h-screen bg-[#060816] text-slate-100 font-sans selection:bg-purple-500/30">
      <div className="max-w-[500px] mx-auto min-h-screen bg-linear-to-b from-[#0b1022] to-[#111933] relative shadow-2xl">
        
        {/* SIDE MENU */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
              />
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 w-[280px] h-full bg-[#111933] z-[70] border-l border-white/10 flex flex-col"
              >
                <div className="p-8 pb-4 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <img src={VERSE_LOGO} className="w-8 h-8 object-contain" alt="Logo" referrerPolicy="no-referrer" />
                    <h3 className="text-xl font-black italic tracking-tighter">VERSE VENDOR</h3>
                  </div>
                  <button onClick={() => setIsSidebarOpen(false)} className="p-2 bg-white/5 rounded-xl">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 pt-4 space-y-2 scrollbar-none">
                  {[
                    { icon: Home, label: 'Dashboard', tab: 'orders' },
                    { icon: Clock, label: 'Orders', tab: 'orders' },
                    { icon: CreditCard, label: 'Payments', tab: 'orders' },
                    { icon: FileText, label: 'Invoices', tab: 'orders' },
                    { icon: Store, label: 'Storefront', tab: 'storefront' },
                    { icon: BarChart3, label: 'Analytics', tab: 'analytics' },
                    { icon: Users, label: 'Customers', tab: 'customers' },
                    { icon: Settings, label: 'Settings', tab: 'settings' },
                  ].map((item, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setActiveTab(item.tab as TabType);
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
                        activeTab === item.tab 
                        ? 'bg-purple-600/20 text-purple-400' 
                        : 'text-slate-400 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm font-bold whitespace-nowrap">{item.label}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-30 flex-shrink-0" />
                    </button>
                  ))}
                </div>

                <div className="p-8 pt-4 border-t border-white/5 flex-shrink-0 mt-auto bg-[#111933]">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Signed in as</p>
                    <p className="text-xs font-bold text-white truncate">Sero Paul Pro</p>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* HEADER */}
        <header className="flex justify-between items-center p-6 pt-8 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-1 bg-white/10 rounded-xl flex-shrink-0">
              <img src={VERSE_LOGO} className="w-8 h-8 object-contain" alt="Verse" referrerPolicy="no-referrer" />
            </div>
            <h1 className="text-xl font-black italic tracking-tighter leading-tight truncate">Verse Vendor</h1>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="w-12 h-12 flex-shrink-0 flex flex-col items-center justify-center gap-1 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-white/10"
          >
            <span className="w-5 h-0.5 bg-white rounded-full" />
            <span className="w-5 h-0.5 bg-white rounded-full opacity-60" />
            <span className="w-5 h-0.5 bg-white rounded-full opacity-30" />
          </button>
        </header>

        {/* DASHBOARD CONTENT */}
        <main className="px-6 pb-32">
          
          <AnimatePresence mode="wait">
            {activeTab === 'orders' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="text-3xl font-black italic tracking-tighter mb-6">Dashboard</div>

                {/* MAIN SALES CARD */}
                <div className="bg-linear-to-br from-[#1b2346] to-[#1b133a] rounded-[2rem] p-8 mb-6 shadow-[0_0_30px_rgba(122,80,255,0.2)] border border-white/5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        setActiveTab('analytics');
                        // Scroll down to ledger if possible, but navigating to tab is enough
                      }}
                      className="text-[10px] font-black underline decoration-purple-500 underline-offset-4"
                    >
                      VIEW LEDGER
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2">Total Sales Realized</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black italic tracking-tighter">₦{cashBalance.toLocaleString()}</span>
                    {stats.growth !== 0 && (
                      <span className={`text-[10px] font-black py-1 px-3 rounded-full ${stats.growth > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {stats.growth > 0 ? '↑' : '↓'} {Math.abs(stats.growth).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>

                {/* QUICK STATS */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/5 rounded-[1.5rem] p-6 border border-white/5 shadow-inner">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Total Orders</p>
                    <p className="text-3xl font-black tracking-tighter">{orders.length}</p>
                  </div>
                  <div className="bg-white/5 rounded-[1.5rem] p-6 border border-white/5 shadow-inner">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Verse Balance</p>
                    <div className="flex items-center gap-2">
                       <p className="text-3xl font-black tracking-tighter text-purple-400">{walletBalance.toLocaleString()}</p>
                       <img src={VERSE_LOGO} className="w-5 h-5 opacity-50" referrerPolicy="no-referrer" />
                    </div>
                  </div>
                </div>

                {/* RAMP ACTIONS */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <button 
                    onClick={() => setIsOnRampOpen(true)}
                    className="py-4 bg-linear-to-r from-[#7a5cff] to-[#8b5cf6] text-white rounded-[1.25rem] font-black italic text-sm tracking-tighter shadow-lg shadow-purple-900/40"
                  >
                    BUY VERSE
                  </button>
                  <button 
                    onClick={() => setIsOffRampOpen(true)}
                    className="py-4 bg-white/5 border border-white/10 text-slate-400 rounded-[1.25rem] font-black italic text-sm tracking-tighter hover:bg-white/10 transition-all"
                  >
                    CASH OUT
                  </button>
                </div>

                {/* ORDER FORM */}
                <div className="bg-white/5 rounded-[2rem] p-6 border border-white/5 mb-8">
                   <h3 className="text-lg font-black italic tracking-tighter mb-4 text-slate-400">Create New Order</h3>
                   <div className="space-y-4">
                      <div className="relative group/customer">
                        <input 
                          value={customer} 
                          onChange={e => setCustomer(e.target.value)}
                          placeholder="Customer Name"
                          className="w-full bg-[#1b2346] border-none rounded-2xl px-5 py-4 text-sm font-bold placeholder:text-slate-600 focus:ring-2 focus:ring-purple-600 transition-all outline-none"
                        />
                        {/* Auto suggestions */}
                        {customer && !customers.find(c => c.name === customer) && (
                          <div className="absolute top-full left-0 right-0 z-20 mt-2 bg-[#111933] border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl max-h-[160px] overflow-y-auto">
                            {customers
                              .filter(c => c.name.toLowerCase().includes(customer.toLowerCase()))
                              .map(c => (
                                <button
                                  key={c.id}
                                  onClick={() => {
                                    setCustomer(c.name);
                                    setCustomerPhone(c.phone);
                                  }}
                                  className="w-full p-4 flex items-center justify-between hover:bg-white/5 text-left border-b border-white/5 last:border-none"
                                >
                                  <div>
                                    <p className="text-sm font-bold text-white">{c.name}</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">{c.phone || 'No phone'}</p>
                                  </div>
                                  <ArrowRight className="w-4 h-4 text-purple-600" />
                                </button>
                              ))
                            }
                          </div>
                        )}
                      </div>
                      <input 
                        value={customerPhone} 
                        onChange={e => setCustomerPhone(e.target.value)}
                        placeholder="Phone Number (Optional)"
                        className="w-full bg-[#1b2346] border-none rounded-2xl px-5 py-4 text-sm font-bold placeholder:text-slate-600 focus:ring-2 focus:ring-purple-600 transition-all outline-none"
                      />
                      <input 
                        value={items} 
                        onChange={e => setItems(e.target.value)}
                        placeholder="Items (comma separated)"
                        className="w-full bg-[#1b2346] border-none rounded-2xl px-5 py-4 text-sm font-bold placeholder:text-slate-600 focus:ring-2 focus:ring-purple-600 transition-all outline-none"
                      />
                      <input 
                        type="number"
                        value={amount} 
                        onChange={e => setAmount(e.target.value)}
                        placeholder="Amount (₦)"
                        className="w-full bg-[#1b2346] border-none rounded-2xl px-5 py-4 text-sm font-black placeholder:text-slate-600 focus:ring-2 focus:ring-purple-600 transition-all outline-none"
                      />
                      <select 
                        value={payment} 
                        onChange={e => setPayment(e.target.value as PaymentMethod)}
                        className="w-full bg-[#1b2346] border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-purple-600 transition-all outline-none appearance-none"
                      >
                        <option value="Cash">Local Cash</option>
                        <option value="Bank">Bank Transfer</option>
                        <option value="Crypto (VERSE)">Verse Token (2% Bonus)</option>
                      </select>

                      <AnimatePresence>
                        {payment === 'Bank' && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="space-y-4 pt-2"
                          >
                            <select 
                              value={bank}
                              onChange={e => setBank(e.target.value)}
                              className="w-full bg-[#1b2346]/60 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none"
                            >
                              <option value="">Select Bank</option>
                              <option value="Access">Access Bank</option>
                              <option value="GTBank">GTBank</option>
                              <option value="UBA">UBA</option>
                              <option value="Zenith">Zenith Bank</option>
                              <option value="Opay">Opay / Palmpay</option>
                            </select>
                            <input 
                              value={accountNumber} 
                              onChange={e => setAccountNumber(e.target.value)}
                              placeholder="Account Number"
                              className="w-full bg-[#1b2346]/60 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none"
                            />
                            <input 
                              value={accountName} 
                              onChange={e => setAccountName(e.target.value)}
                              placeholder="Account Holder Name"
                              className="w-full bg-[#1b2346]/60 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none"
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <button 
                        onClick={addOrder}
                        className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black italic tracking-tighter transition-all"
                      >
                        CONFIRM & PRINT
                      </button>
                   </div>
                </div>

                {/* RECENT ORDERS */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-black uppercase text-slate-500 tracking-widest">Recent Activity</h3>
                    <button className="text-[10px] font-black text-purple-400">VIEW ALL</button>
                  </div>

                  <AnimatePresence initial={false}>
                    {orders.map(order => (
                      <motion.div 
                        key={order.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white/5 rounded-[1.75rem] p-6 border border-white/5 relative overflow-hidden group"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                             <p className="text-[10px] font-mono text-slate-600 mb-1">#{String(order.id).slice(-6)}</p>
                             <h4 className="font-black italic tracking-tight">{order.customer}</h4>
                          </div>
                          <div className={`badge px-3 py-1 rounded-full text-[10px] font-black italic ${order.status === 'Paid' ? 'bg-green-500/10 text-green-400' : 'bg-orange-500/10 text-orange-400'}`}>
                            {order.status.toUpperCase()}
                          </div>
                        </div>

                        <p className="text-xs text-slate-400 mb-4 line-clamp-1">{order.items}</p>

                        <div className="flex flex-col gap-1 mb-6">
                           <div className="text-3xl font-black italic tracking-tighter">₦{order.amount.toLocaleString()}</div>
                           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{order.payment}</p>
                        </div>

                        <div className="flex gap-2">
                          {order.status === 'Pending' && (
                            <button 
                              onClick={() => setPaymentModalOrder(order)}
                              className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black italic hover:bg-white/10"
                            >
                              PAY
                            </button>
                          )}
                          <button 
                            onClick={() => generateInvoice(order)}
                            className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black italic hover:bg-white/10"
                          >
                            INVOICE
                          </button>
                          <button 
                            onClick={() => deleteOrder(order.id)}
                            className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black italic hover:text-red-400"
                          >
                            DELETE
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {orders.length === 0 && (
                    <div className="py-12 text-center opacity-20 italic text-xs">No records found...</div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'storefront' && (
              <motion.div
                key="storefront"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-3xl font-black italic tracking-tighter">Storefront</div>
                  <button 
                    onClick={() => setIsPublicPreview(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 text-purple-400 rounded-xl text-[10px] font-black italic group"
                  >
                    <Share2 className="w-3 h-3 transition-transform group-hover:scale-110" />
                    LIVE PREVIEW
                  </button>
                </div>

                {/* Profile Editor */}
                <div className="bg-white/5 rounded-[2rem] p-6 border border-white/5 space-y-4">
                  <h4 className="text-xs font-black italic text-slate-500 uppercase tracking-widest">Business Details</h4>
                  <div className="space-y-3">
                    <input 
                      value={profile.name}
                      onChange={e => setProfile({...profile, name: e.target.value})}
                      placeholder="Business Name"
                      className="w-full bg-[#1b2346] border-none rounded-2xl px-5 py-4 text-sm font-bold placeholder:text-slate-600 focus:ring-2 focus:ring-purple-600 transition-all outline-none"
                    />
                    <textarea 
                      value={profile.bio}
                      onChange={e => setProfile({...profile, bio: e.target.value})}
                      placeholder="Store Bio / Description"
                      className="w-full bg-[#1b2346] border-none rounded-2xl px-5 py-4 text-sm font-bold placeholder:text-slate-600 focus:ring-2 focus:ring-purple-600 transition-all outline-none h-24 resize-none"
                    />
                  </div>
                </div>

                {/* Products Section */}
                <div className="bg-white/5 rounded-[2rem] p-6 border border-white/5 space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black italic text-slate-500 uppercase tracking-widest">Products ({products.length})</h4>
                    <button 
                      onClick={() => setProducts([...products, { id: Date.now().toString(), name: '', price: 0, description: '' }])}
                      className="p-3 bg-purple-600 rounded-xl text-white hover:bg-purple-500 transition-all shadow-lg"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {products.map((p, i) => (
                      <div key={p.id} className="p-5 bg-black/20 rounded-2xl border border-white/5 space-y-3 relative overflow-hidden group">
                        <button 
                          onClick={() => setProducts(products.filter(item => item.id !== p.id))}
                          className="absolute top-4 right-4 text-slate-500 hover:text-red-500 transition-colors"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                        <input 
                          value={p.name}
                          onChange={e => {
                            const newP = [...products];
                            newP[i].name = e.target.value;
                            setProducts(newP);
                          }}
                          placeholder="Product Name"
                          className="w-[85%] bg-transparent border-none p-0 text-sm font-black text-white italic outline-none placeholder:text-slate-700"
                        />
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <label className="text-[9px] text-slate-600 font-bold uppercase mb-1 block">Price (₦)</label>
                            <input 
                              type="number"
                              value={p.price || ''}
                              onChange={e => {
                                const newP = [...products];
                                newP[i].price = parseFloat(e.target.value) || 0;
                                setProducts(newP);
                              }}
                              className="w-full bg-[#1b2346] border-none rounded-xl px-4 py-2 text-xs font-black italic outline-none"
                            />
                          </div>
                          <div className="flex-[2]">
                            <label className="text-[9px] text-slate-600 font-bold uppercase mb-1 block">Short Description</label>
                            <input 
                              value={p.description}
                              onChange={e => {
                                const newP = [...products];
                                newP[i].description = e.target.value;
                                setProducts(newP);
                              }}
                              className="w-full bg-[#1b2346] border-none rounded-xl px-4 py-2 text-xs font-bold outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {products.length === 0 && (
                      <div className="py-12 text-center opacity-30 italic text-[10px] uppercase font-black tracking-widest border-2 border-dashed border-white/10 rounded-2xl">
                        No products added yet
                      </div>
                    )}
                  </div>
                </div>

                {/* Bank Info */}
                <div className="bg-white/5 rounded-[2rem] p-6 border border-white/5 space-y-4">
                  <h4 className="text-xs font-black italic text-slate-500 uppercase tracking-widest">Public Bank Info</h4>
                  <p className="text-[10px] text-slate-600 font-bold leading-relaxed mb-2 uppercase">This info will be visible on your storefront for customer transfers.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      value={profile.bankInfo.bank}
                      onChange={e => setProfile({...profile, bankInfo: {...profile.bankInfo, bank: e.target.value}})}
                      placeholder="Bank Name"
                      className="bg-[#1b2346] border-none rounded-xl px-4 py-3 text-xs font-bold outline-none"
                    />
                    <input 
                      value={profile.bankInfo.accountNumber}
                      onChange={e => setProfile({...profile, bankInfo: {...profile.bankInfo, accountNumber: e.target.value}})}
                      placeholder="Acc Number"
                      className="bg-[#1b2346] border-none rounded-xl px-4 py-3 text-xs font-bold outline-none"
                    />
                  </div>
                  <input 
                    value={profile.bankInfo.accountName}
                    onChange={e => setProfile({...profile, bankInfo: {...profile.bankInfo, accountName: e.target.value}})}
                    placeholder="Account Name"
                    className="w-full bg-[#1b2346] border-none rounded-xl px-4 py-3 text-xs font-bold outline-none"
                  />
                </div>

                <div className="p-4 bg-purple-600/10 rounded-2xl border border-purple-600/20">
                  <p className="text-[10px] text-purple-400 font-black italic flex items-center gap-2">
                    <CheckCircle className="w-3 h-3" />
                    LINK: verse.vendor/{profile.name.toLowerCase().replace(/\s+/g, '-')}
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === 'analytics' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                <div className="text-3xl font-black italic tracking-tighter mb-6">Analytics</div>
                <div className="bg-white/5 rounded-[2rem] p-8 space-y-8">
                  <div>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-4 italic">Revenue Source Split</p>
                    <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden flex">
                       <div className="h-full bg-purple-500 transition-all duration-700" style={{ width: `${stats.split.crypto}%` }} />
                       <div className="h-full bg-blue-500 transition-all duration-700" style={{ width: `${stats.split.bank}%` }} />
                       <div className="h-full bg-green-500 transition-all duration-700" style={{ width: `${stats.split.cash}%` }} />
                    </div>
                    <div className="flex gap-4 mt-3">
                       <span className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400"><div className="w-1.5 h-1.5 bg-purple-500 rounded-full"/> Crypto ({stats.split.crypto.toFixed(0)}%)</span>
                       <span className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"/> Bank ({stats.split.bank.toFixed(0)}%)</span>
                       <span className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400"><div className="w-1.5 h-1.5 bg-green-500 rounded-full"/> Cash ({stats.split.cash.toFixed(0)}%)</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-black/20 rounded-2xl">
                      <span className="text-xs text-slate-400 font-bold uppercase">Weekly Revenue</span>
                      <span className="text-xl font-black italic text-green-400">₦{stats.thisWeekRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-black/20 rounded-2xl">
                      <span className="text-xs text-slate-400 font-bold uppercase">Reward Issued</span>
                      <span className="text-xl font-black italic text-purple-400">{orders.reduce((acc, curr) => acc + curr.reward, 0)} V</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-[2rem] p-8">
                  <h4 className="text-sm font-black italic mb-6">Recent Ledger Activity</h4>
                  <div className="space-y-4">
                    {transactions.slice(0, 5).map(tx => (
                      <div key={tx.id} className="flex justify-between items-center p-4 bg-black/20 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            tx.type === 'SALE' ? 'bg-green-500/10 text-green-400' : 
                            tx.type === 'DEPOSIT' ? 'bg-purple-500/10 text-purple-400' : 
                            'bg-red-500/10 text-red-400'
                          }`}>
                            {tx.type === 'SALE' ? <ShoppingBag className="w-4 h-4" /> : 
                             tx.type === 'DEPOSIT' ? <Plus className="w-4 h-4" /> : 
                             <ArrowUpCircle className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">{tx.description}</p>
                            <p className="text-[9px] text-slate-600 font-bold uppercase">{new Date(tx.timestamp).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <p className={`font-black italic text-sm ${tx.type === 'WITHDRAWAL' ? 'text-red-400' : 'text-white'}`}>
                          {tx.type === 'WITHDRAWAL' ? '-' : '+'}
                          {tx.currency === 'VERSE' ? '' : '₦'}{tx.amount.toLocaleString()}
                          {tx.currency === 'VERSE' ? ' V' : ''}
                        </p>
                      </div>
                    ))}
                    {transactions.length === 0 && (
                      <p className="text-center py-6 text-xs text-slate-500 italic">No transactions recorded yet</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'customers' && (
              <motion.div
                key="customers"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-black italic tracking-tighter">Customers</div>
                  <Users className="w-6 h-6 text-purple-500 opacity-50" />
                </div>

                <div className="relative">
                  <input 
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                    placeholder="Search by name or phone..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold placeholder:text-slate-600 focus:ring-2 focus:ring-purple-600 transition-all outline-none"
                  />
                </div>

                <div className="space-y-4">
                  {customers
                    .filter(c => 
                      c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
                      c.phone.includes(customerSearch)
                    )
                    .sort((a, b) => b.totalSpent - a.totalSpent)
                    .map((c, i) => (
                    <button 
                      key={c.id} 
                      onClick={() => {
                        setSelectedCustomer(c);
                        setIsCustomerModalOpen(true);
                      }}
                      className="w-full bg-white/5 rounded-[1.75rem] p-6 border border-white/5 flex justify-between items-center hover:bg-white/10 transition-all group active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-600/20 rounded-2xl flex items-center justify-center font-black italic text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-all">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-left">
                          <p className="font-black italic text-base">{c.name}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{c.phone || 'No Contact'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black italic text-lg">₦{c.totalSpent.toLocaleString()}</p>
                        <div className="flex items-center gap-1 justify-end opacity-50">
                          <ShoppingBag className="w-3 h-3" />
                          <span className="text-[10px] font-black">{c.orderCount}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                  {customers.length === 0 && (
                    <div className="py-20 text-center space-y-4 opacity-20">
                      <div className="w-16 h-16 bg-white/10 rounded-full mx-auto flex items-center justify-center">
                        <Users className="w-8 h-8" />
                      </div>
                      <p className="italic text-xs font-bold tracking-widest">NO CUSTOMER MEMORY YET</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6 px-2"
              >
                <div className="text-3xl font-black italic tracking-tighter mb-6">Settings</div>
                <div className="space-y-4">
                  <div className="bg-white/5 rounded-[2rem] p-6 border border-white/5">
                    <h4 className="text-sm font-black italic mb-4 text-purple-400">Business Profile</h4>
                    <div className="space-y-4">
                      <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Store Owner</label>
                        <div className="text-sm font-bold flex items-center justify-between">
                          Sero Paul Pro
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                      </div>
                      <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-1">Currency Configuration</label>
                        <div className="text-sm font-bold">Nigerian Naira (NGN)</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white/5 rounded-[2rem] p-6 border border-white/5">
                    <h4 className="text-sm font-black italic mb-4 text-purple-400">Security & Privacy</h4>
                    <div className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5">
                      <span className="text-xs text-slate-400 font-bold uppercase">Biometric Login</span>
                      <div className="w-10 h-5 bg-purple-600 rounded-full relative cursor-pointer opacity-50">
                        <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                      </div>
                    </div>
                  </div>

                  <button className="w-full py-5 bg-white/5 hover:bg-red-500/10 border border-white/10 text-slate-500 hover:text-red-500 rounded-3xl font-black italic text-sm tracking-tighter transition-all">
                    LOGOUT FROM DEVICE
                  </button>
                  
                  <p className="text-center text-[10px] text-slate-600 font-bold italic py-4">VERSE VENDOR OS v2.0.4 - STABLE</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* BOTTOM NAV */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[500px] bg-[#0c1225]/80 backdrop-blur-xl border-t border-white/10 px-8 py-5 flex justify-around items-center z-50">
          {[
            { id: 'orders', icon: Home, label: 'Home' },
            { id: 'analytics', icon: TrendingUp, label: 'Stats' },
            { id: 'storefront', icon: Store, label: 'Store' },
            { id: 'settings', icon: Settings, label: 'Settings' },
          ].map((item) => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id as TabType)}
              className={`flex flex-col items-center gap-1 transition-all ${
                activeTab === item.id ? 'text-purple-400 scale-110' : 'text-slate-500 opacity-60'
              }`}
            >
              <item.icon className="w-5 h-5" strokeWidth={activeTab === item.id ? 3 : 2} />
              <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* MODALS PERSISTENCE */}
        {/* Payment Modal */}
        <AnimatePresence>
          {paymentModalOrder && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#0b1022] border border-white/20 w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl p-8 text-center space-y-6"
              >
                <h2 className="text-2xl font-black italic tracking-tighter">Pay with Verse</h2>
                <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Total Amount</p>
                    <h1 className="text-4xl font-black italic tracking-tighter">₦{paymentModalOrder.amount.toLocaleString()}</h1>
                  </div>
                  <div className="bg-white rounded-3xl p-4 flex items-center justify-center mx-auto w-fit">
                    <QRCodeSVG 
                      value={`PAY:${paymentModalOrder.amount}:${paymentModalOrder.id}`} 
                      size={180}
                      level="H"
                    />
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed px-4">Scan using Verse Mobile or App to authorize secure payment</p>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={() => markPaid(paymentModalOrder.id)}
                    className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black italic transition-all"
                  >
                    I HAVE PAID
                  </button>
                  <button 
                    onClick={() => setPaymentModalOrder(null)}
                    className="w-full py-4 bg-white/5 border border-white/10 text-slate-400 rounded-2xl font-bold text-xs"
                  >
                    CANCEL
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* On-Ramp Modal */}
        <AnimatePresence>
          {isOnRampOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#0b1022] border border-white/20 w-full max-w-sm rounded-[2.5rem] overflow-hidden p-8 text-center space-y-6"
              >
                <h2 className="text-2xl font-black italic tracking-tighter">Buy Verse Token</h2>
                <input 
                  type="number"
                  value={rampAmount}
                  onChange={e => setRampAmount(e.target.value)}
                  placeholder="Amount in ₦"
                  className="w-full bg-[#1b2346] border-none rounded-2xl px-5 py-4 text-center font-black italic text-xl focus:ring-2 focus:ring-purple-600 outline-none"
                />
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">Conversion: 1 Verse = ₦100</p>
                
                <div className="space-y-3 pt-4">
                  <button 
                    onClick={buyVerse}
                    className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black italic transition-all"
                  >
                    BUY NOW
                  </button>
                  <button 
                    onClick={() => setIsOnRampOpen(false)}
                    className="w-full py-4 bg-white/5 border border-white/10 text-slate-500 rounded-2xl font-bold text-xs"
                  >
                    CANCEL
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Off-Ramp Modal */}
        <AnimatePresence>
          {isOffRampOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#0b1022] border border-white/20 w-full max-w-sm rounded-[2.5rem] overflow-hidden p-8 text-center space-y-6"
              >
                <h2 className="text-2xl font-black italic tracking-tighter">Cash Out VERSE</h2>
                <input 
                  type="number"
                  value={rampAmount}
                  onChange={e => setRampAmount(e.target.value)}
                  placeholder="Verse Amount"
                  className="w-full bg-[#1b2346] border-none rounded-2xl px-5 py-4 text-center font-black italic text-xl focus:ring-2 focus:ring-purple-600 outline-none"
                />
                <select 
                  value={withdrawBank}
                  onChange={e => setWithdrawBank(e.target.value)}
                  className="w-full bg-[#1b2346] border-none rounded-2xl px-5 py-4 font-bold outline-none appearance-none text-center"
                >
                  <option value="Access">Access Bank</option>
                  <option value="GTBank">GTBank</option>
                  <option value="UBA">UBA</option>
                  <option value="Zenith">Zenith Bank</option>
                  <option value="Opay">Opay / Palmpay</option>
                </select>

                <div className="space-y-3 pt-4">
                  <button 
                    onClick={cashOut}
                    className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black italic transition-all"
                  >
                    WITHDRAW
                  </button>
                  <button 
                    onClick={() => setIsOffRampOpen(false)}
                    className="w-full py-4 bg-white/5 border border-white/10 text-slate-500 rounded-2xl font-bold text-xs"
                  >
                    CANCEL
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Public Storefront Preview Modal */}
        <AnimatePresence>
          {isPublicPreview && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-0 bg-black">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full max-w-[500px] bg-[#060816] flex flex-col relative"
              >
                {/* Public Header */}
                <div className="p-8 pb-4 flex justify-between items-start">
                   <div>
                      <h2 className="text-3xl font-black italic tracking-tighter text-white">{profile.name}</h2>
                      <p className="text-xs text-slate-500 font-bold uppercase mt-1 tracking-widest">{profile.bio}</p>
                   </div>
                   <button 
                    onClick={() => {
                      setIsPublicPreview(false);
                      setCheckoutStep('browse');
                    }}
                    className="p-3 bg-white/5 rounded-2xl border border-white/10"
                   >
                     <X className="w-5 h-5 text-slate-400" />
                   </button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                  {checkoutStep === 'browse' && (
                    <>
                      <div className="grid grid-cols-1 gap-4">
                        {products.map(p => (
                          <div key={p.id} className="bg-white/5 rounded-3xl p-6 border border-white/5 flex justify-between items-center group">
                            <div className="flex-1">
                              <h4 className="font-black italic text-lg text-white mb-1">{p.name}</h4>
                              <p className="text-[10px] text-slate-500 font-bold uppercase mb-4">{p.description}</p>
                              <div className="text-xl font-black italic tracking-tighter text-purple-400">₦{p.price.toLocaleString()}</div>
                            </div>
                            <button 
                              onClick={() => {
                                const exist = cart.find(c => c.product.id === p.id);
                                if (exist) {
                                  setCart(cart.map(c => c.product.id === p.id ? {...c, qty: c.qty + 1} : c));
                                } else {
                                  setCart([...cart, {product: p, qty: 1}]);
                                }
                              }}
                              className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-black shadow-xl active:scale-95 transition-all"
                            >
                              <Plus className="w-6 h-6" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {checkoutStep === 'details' && (
                    <div className="space-y-6">
                       <h3 className="text-xl font-black italic italic">Complete Your Order</h3>
                       <div className="space-y-4">
                          <input 
                            value={customer}
                            onChange={e => setCustomer(e.target.value)}
                            placeholder="Your Full Name"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-purple-600"
                          />
                          <input 
                            value={customerPhone}
                            onChange={e => setCustomerPhone(e.target.value)}
                            placeholder="Phone Number"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-purple-600"
                          />
                       </div>

                       <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
                          <h4 className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Order Summary</h4>
                          {cart.map(item => (
                            <div key={item.product.id} className="flex justify-between items-center">
                              <p className="text-sm font-bold text-slate-300">{item.qty}x {item.product.name}</p>
                              <p className="text-sm font-black italic">₦{(item.product.price * item.qty).toLocaleString()}</p>
                            </div>
                          ))}
                          <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                             <p className="text-xs font-black italic uppercase text-slate-500">Total Payable</p>
                             <p className="text-2xl font-black italic text-white">₦{cart.reduce((acc, i) => acc + (i.product.price * i.qty), 0).toLocaleString()}</p>
                          </div>
                       </div>
                    </div>
                  )}

                  {checkoutStep === 'success' && (
                    <div className="text-center py-20 space-y-6">
                       <div className="w-24 h-24 bg-green-500/20 rounded-[2.5rem] mx-auto flex items-center justify-center">
                         <CheckCircle className="w-12 h-12 text-green-500" />
                       </div>
                       <div>
                         <h3 className="text-2xl font-black italic italic">Order Sent!</h3>
                         <p className="text-xs text-slate-500 font-bold mt-2 uppercase tracking-widest px-12">The vendor has received your order. Please complete payment using details below.</p>
                       </div>

                       <div className="bg-white/5 p-8 rounded-[2rem] border border-white/5 space-y-4">
                          <p className="text-[10px] text-slate-500 font-black uppercase">Payment Details</p>
                          <div className="space-y-1">
                            <p className="text-xl font-black italic">{profile.bankInfo.bank}</p>
                            <p className="text-2xl font-black italic tracking-widest text-purple-400">{profile.bankInfo.accountNumber}</p>
                            <p className="text-xs font-bold uppercase text-slate-400">{profile.bankInfo.accountName}</p>
                          </div>
                       </div>

                       <button 
                        onClick={() => {
                          setIsPublicPreview(false);
                          setCheckoutStep('browse');
                        }}
                        className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl font-black italic text-sm tracking-tighter"
                       >
                         CLOSE STOREFRONT
                       </button>
                    </div>
                  )}
                </div>

                {/* Public Footer Actions */}
                {checkoutStep === 'browse' && cart.length > 0 && (
                  <div className="p-8 bg-linear-to-t from-black to-transparent">
                     <button 
                      onClick={() => setCheckoutStep('details')}
                      className="w-full py-5 bg-purple-600 rounded-[1.5rem] font-black italic text-sm tracking-tighter shadow-2xl flex items-center justify-center gap-3 group"
                     >
                        VIEW BAG ({cart.reduce((acc, i) => acc + i.qty, 0)})
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                     </button>
                  </div>
                )}

                {checkoutStep === 'details' && (
                  <div className="p-8 space-y-3">
                     <button 
                      onClick={handleStorefrontOrder}
                      disabled={!customer}
                      className="w-full py-5 bg-green-600 disabled:opacity-30 rounded-[1.5rem] font-black italic text-sm tracking-tighter shadow-2xl"
                     >
                        PLACE ORDER
                     </button>
                     <button 
                      onClick={() => setCheckoutStep('browse')}
                      className="w-full py-4 text-xs font-bold uppercase text-slate-500"
                     >
                        BACK TO SHOPPING
                     </button>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Customer Profile Modal */}
        <AnimatePresence>
          {isCustomerModalOpen && selectedCustomer && (
            <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/90 backdrop-blur-md">
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="bg-[#0b1022] w-full max-w-[500px] h-[90vh] rounded-t-[3rem] border-t border-white/20 flex flex-col relative overflow-hidden"
              >
                {/* Header Profile */}
                <div className="p-8 pt-10 text-center flex-shrink-0">
                  <button 
                    onClick={() => setIsCustomerModalOpen(false)}
                    className="absolute top-6 right-6 w-10 h-10 bg-white/5 rounded-full flex items-center justify-center border border-white/5"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                  
                  <div className="w-24 h-24 bg-purple-600/20 rounded-[2.5rem] mx-auto mb-4 flex items-center justify-center">
                    <User className="w-10 h-10 text-purple-400" />
                  </div>
                  <h2 className="text-3xl font-black italic tracking-tighter text-white">{selectedCustomer.name}</h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                    {selectedCustomer.phone || "No Contact Stored"}
                  </p>
                </div>

                {/* Stats Row */}
                <div className="px-8 grid grid-cols-2 gap-4 mb-8 flex-shrink-0">
                  <div className="bg-white/5 p-5 rounded-3xl border border-white/5">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Lifetime Value</p>
                    <p className="text-xl font-black italic tracking-tighter">₦{selectedCustomer.totalSpent.toLocaleString()}</p>
                  </div>
                  <div className="bg-white/5 p-5 rounded-3xl border border-white/5">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Total Orders</p>
                    <p className="text-xl font-black italic tracking-tighter">{selectedCustomer.orderCount}</p>
                  </div>
                </div>

                {/* Order History List */}
                <div className="flex-1 overflow-y-auto px-8 pb-12 space-y-4">
                   <div className="flex items-center justify-between sticky top-0 bg-[#0b1022] py-2 z-10">
                     <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Order History</p>
                     <Clock className="w-3 h-3 text-slate-600" />
                   </div>

                   {orders
                     .filter(o => o.customer.toLowerCase() === selectedCustomer.name.toLowerCase())
                     .map(order => (
                       <div key={order.id} className="bg-white/5 p-5 rounded-2xl border border-white/5 flex items-center justify-between">
                         <div>
                            <p className="text-xs font-bold text-white mb-0.5">{order.items}</p>
                            <p className="text-[9px] text-slate-600 font-bold">
                              {new Date(order.createdAt).toLocaleDateString()} • {order.status}
                            </p>
                         </div>
                         <div className="text-right">
                            <p className="text-sm font-black italic">₦{order.amount.toLocaleString()}</p>
                         </div>
                       </div>
                     ))
                   }
                   
                   {orders.filter(o => o.customer.toLowerCase() === selectedCustomer.name.toLowerCase()).length === 0 && (
                     <p className="text-center py-12 text-[10px] opacity-30 italic font-bold">No historical orders found</p>
                   )}
                </div>

                {/* Actions */}
                <div className="p-8 border-t border-white/5 space-y-3 bg-[#0b1022]">
                  <button className="w-full py-4 bg-purple-600 rounded-2xl font-black italic text-sm tracking-tighter">
                    MESSAGE CUSTOMER
                  </button>
                  <button 
                    onClick={() => {
                      setCustomers(prev => prev.filter(c => c.id !== selectedCustomer.id));
                      setIsCustomerModalOpen(false);
                    }}
                    className="w-full py-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl font-black italic text-xs tracking-tighter"
                  >
                    FORGET CUSTOMER
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
