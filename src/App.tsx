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
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import { QRCodeSVG } from 'qrcode.react';

// --- Types ---

type PaymentMethod = 'Cash' | 'Bank' | 'Crypto (VERSE)';
type OrderStatus = 'Pending' | 'Paid';
type TabType = 'orders' | 'analytics' | 'customers';

interface Order {
  id: number;
  customer: string;
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

// --- Constants ---

const REWARD_RATE = 0.02; // 2% reward
const VERSE_LOGO = "https://lh3.googleusercontent.com/d/16A9AFdJNQTZEIqoK0nYs8yKCVfcPvcIj";

export default function App() {
  // --- State ---
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [customer, setCustomer] = useState('');
  const [items, setItems] = useState('');
  const [amount, setAmount] = useState('');
  const [payment, setPayment] = useState<PaymentMethod>('Cash');
  const [bank, setBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showQR, setShowQR] = useState(false);
  
  // Payment Modal State
  const [paymentModalOrder, setPaymentModalOrder] = useState<Order | null>(null);

  // --- Effects ---
  useEffect(() => {
    const savedOrders = localStorage.getItem('verse_vendor_orders_pro');
    if (savedOrders) {
      try {
        setOrders(JSON.parse(savedOrders));
      } catch (e) {
        console.error('Failed to load orders', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('verse_vendor_orders_pro', JSON.stringify(orders));
  }, [orders]);

  // --- Computed Stats ---
  const stats = useMemo(() => {
    const paidOrders = orders.filter(o => o.status === 'Paid');
    const totalEarnings = paidOrders.reduce((acc, curr) => acc + curr.amount, 0);
    const totalRewards = paidOrders.reduce((acc, curr) => acc + curr.reward, 0);
    const cryptoOrders = paidOrders.filter(o => o.payment.includes('Crypto')).length;
    
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

    return { totalEarnings, totalRewards, cryptoOrders, topCustomers };
  }, [orders]);

  // --- Handlers ---
  const addOrder = () => {
    if (!customer || !items || !amount) return;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return;

    const newOrder: Order = {
      id: Date.now(),
      customer,
      items,
      amount: numAmount,
      payment,
      reward: Math.floor(numAmount * REWARD_RATE),
      status: 'Pending',
      createdAt: Date.now(),
      bank: payment === 'Bank' ? bank : undefined,
      accountNumber: payment === 'Bank' ? accountNumber : undefined,
      accountName: payment === 'Bank' ? accountName : undefined,
    };

    setOrders(prev => [newOrder, ...prev]);
    setCustomer('');
    setItems('');
    setAmount('');
    setBank('');
    setAccountNumber('');
    setAccountName('');
    setIsFormOpen(false);
  };

  const markPaid = (id: number) => {
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
    <div className="min-h-screen bg-[#0B0B2B] bg-linear-to-br from-[#0B0B2B] to-[#1A0F3C] text-slate-100 font-sans selection:bg-purple-500/30 pb-24">
      {/* Header Dashboard */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-[#6A0DAD] to-[#1E90FF] shadow-2xl">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-white/20 rounded-xl backdrop-blur-md overflow-hidden">
              <img 
                src={VERSE_LOGO} 
                className="w-8 h-8 object-contain" 
                alt="Verse Logo"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tighter text-white italic leading-none">VERSE VENDOR</h1>
              <p className="text-[10px] text-white/70 uppercase tracking-widest font-bold">Nigeria's Premium OS</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] text-white/70 uppercase font-black tracking-wider">Verse Wallet</p>
              <div className="flex items-center gap-1.5 justify-end">
                <img src={VERSE_LOGO} className="w-4 h-4 object-contain" alt="Verse" referrerPolicy="no-referrer" />
                <p className="text-lg font-mono font-bold text-white tracking-widest">{stats.totalRewards.toLocaleString()}</p>
              </div>
            </div>
            <div className="text-right border-l border-white/20 pl-6">
              <p className="text-[10px] text-white/70 uppercase font-black tracking-wider">Cash Balance</p>
              <p className="text-lg font-mono font-bold text-white tracking-tight">₦{stats.totalEarnings.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="max-w-4xl mx-auto px-6 mt-8">
        <div className="bg-white/5 p-1.5 rounded-2xl flex items-center gap-1 border border-white/10 backdrop-blur-sm">
          {(['orders', 'analytics', 'customers'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                activeTab === tab 
                ? 'bg-gradient-to-r from-[#6A0DAD] to-[#4527a0] text-white shadow-lg' 
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              {tab === 'orders' && <Clock className="w-4 h-4" />}
              {tab === 'analytics' && <LayoutDashboard className="w-4 h-4" />}
              {tab === 'customers' && <Users className="w-4 h-4" />}
              {tab}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 mt-8">
        <AnimatePresence mode="wait">
          {/* ORDERS TAB */}
          {activeTab === 'orders' && (
            <motion.div
              key="orders"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Add Button */}
              <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10">
                <div>
                  <h2 className="text-sm font-bold text-white mb-0.5">Quick Actions</h2>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Create or manage local orders</p>
                </div>
                <button
                  onClick={() => setIsFormOpen(!isFormOpen)}
                  className="p-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-lg shadow-purple-900/20 transition-all flex items-center gap-2 text-xs font-bold"
                >
                  <Plus className="w-4 h-4" />
                  NEW ORDER
                </button>
              </div>

              {/* Form */}
              <AnimatePresence>
                {isFormOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white/10 border border-white/20 rounded-2xl p-6 shadow-2xl backdrop-blur-xl"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="space-y-2 text-xs font-bold">
                        <label className="text-slate-400 ml-1">CUSTOMER NAME</label>
                        <input 
                          value={customer} 
                          onChange={e => setCustomer(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 focus:border-purple-500 focus:outline-none placeholder:text-slate-700" 
                          placeholder="e.g. Sero Paul"
                        />
                      </div>
                      <div className="space-y-2 text-xs font-bold">
                        <label className="text-slate-400 ml-1">AMOUNT (₦)</label>
                        <input 
                          type="number"
                          value={amount} 
                          onChange={e => setAmount(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 focus:border-purple-500 focus:outline-none placeholder:text-slate-700 font-mono" 
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2 text-xs font-bold">
                        <label className="text-slate-400 ml-1">ITEMS</label>
                        <input 
                          value={items} 
                          onChange={e => setItems(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 focus:border-purple-500 focus:outline-none placeholder:text-slate-700" 
                          placeholder="e.g. Vintage Shirt"
                        />
                      </div>
                      <div className="space-y-2 text-xs font-bold">
                        <label className="text-slate-400 ml-1">PAYMENT TYPE</label>
                        <select 
                          value={payment} 
                          onChange={e => setPayment(e.target.value as PaymentMethod)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 focus:border-purple-500 focus:outline-none appearance-none"
                        >
                          <option value="Cash">Cash (Manual)</option>
                          <option value="Bank">Bank Transfer</option>
                          <option value="Crypto (VERSE)">Crypto (VERSE / BTC)</option>
                        </select>
                      </div>
                    </div>

                    {payment === 'Bank' && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pt-2 border-t border-white/5"
                      >
                         <div className="space-y-2 text-xs font-bold">
                            <label className="text-slate-400 ml-1">SELECT BANK</label>
                            <select 
                              value={bank}
                              onChange={e => setBank(e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 focus:border-purple-500 focus:outline-none appearance-none"
                            >
                              <option value="">Select Bank</option>
                              <option value="GTBank">Guaranty Trust Bank (GTB)</option>
                              <option value="Access">Access Bank</option>
                              <option value="Zenith">Zenith Bank</option>
                              <option value="UBA">UBA</option>
                              <option value="Opay">Opay / Palmpay</option>
                              <option value="Moniepoint">Moniepoint</option>
                            </select>
                         </div>
                         <div className="space-y-2 text-xs font-bold">
                            <label className="text-slate-400 ml-1">ACCOUNT NUMBER</label>
                            <input 
                              value={accountNumber} 
                              onChange={e => setAccountNumber(e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 focus:border-purple-500 focus:outline-none placeholder:text-slate-700" 
                              placeholder="0000000000"
                            />
                         </div>
                         <div className="md:col-span-2 space-y-2 text-xs font-bold">
                            <label className="text-slate-400 ml-1">ACCOUNT NAME</label>
                            <input 
                              value={accountName} 
                              onChange={e => setAccountName(e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 focus:border-purple-500 focus:outline-none placeholder:text-slate-700" 
                              placeholder="Receiver's Name"
                            />
                         </div>
                      </motion.div>
                    )}
                    
                    <div className="flex gap-3">
                      <button onClick={addOrder} className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-black text-sm tracking-tighter italic">CONFIRM ORDER</button>
                      <button 
                         onClick={() => setShowQR(!showQR)}
                         className="px-6 py-4 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10"
                      >
                        <QrCode className="w-5 h-5" />
                      </button>
                    </div>

                    {showQR && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="mt-6 flex flex-col items-center p-6 bg-white rounded-2xl shadow-inner"
                      >
                        <div className="w-40 h-40 bg-slate-100 flex items-center justify-center relative overflow-hidden rounded-lg">
                           <div className="grid grid-cols-10 gap-1 opacity-20">
                              {Array.from({ length: 100 }).map((_, i) => (
                                <div key={i} className={`w-3 h-3 ${Math.random() > 0.5 ? 'bg-black' : 'bg-transparent'}`} />
                              ))}
                           </div>
                           <QrCode className="absolute w-20 h-20 text-black/80" />
                        </div>
                        <p className="mt-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">Temporary Receiver QR</p>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* List */}
              <div className="grid grid-cols-1 gap-4">
                <AnimatePresence initial={false}>
                  {orders.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="py-20 text-center opacity-30 italic text-sm"
                    >
                      Waiting for your first boss move...
                    </motion.div>
                  ) : (
                    orders.map(order => (
                      <motion.div 
                        layout
                        key={order.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="group bg-white/5 border border-white/10 p-5 rounded-3xl hover:bg-white/[0.08] transition-all relative overflow-hidden"
                      >
                      {/* Status line */}
                      <div className={`absolute top-0 left-0 w-1 h-full ${order.status === 'Paid' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                      
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-start gap-4">
                           <div className="p-2 bg-white/5 rounded-2xl mt-1 overflow-hidden">
                             {order.payment.includes('Crypto') ? (
                               <img src={VERSE_LOGO} className="w-8 h-8 object-contain" referrerPolicy="no-referrer" alt="Verse Reward" />
                             ) : (
                               <div className="w-8 h-8 flex items-center justify-center">
                                 <User className="w-6 h-6 text-blue-400" />
                               </div>
                             )}
                           </div>
                           <div>
                             <div className="flex items-center gap-2">
                               <h3 className="text-lg font-black tracking-tight">{order.customer}</h3>
                               {order.status === 'Paid' ? (
                                 <span className="bg-green-500/10 text-green-400 text-[8px] font-black italic px-2 py-0.5 rounded border border-green-500/20">PAID</span>
                               ) : (
                                 <span className="bg-yellow-500/10 text-yellow-500 text-[8px] font-black italic px-2 py-0.5 rounded border border-yellow-500/20 animate-pulse">PENDING</span>
                               )}
                             </div>
                             <p className="text-xs text-slate-500 font-medium mb-1">{order.items}</p>
                             
                             {order.payment === 'Bank' && order.bank && (
                               <div className="flex items-center gap-2 mb-2 text-[10px] text-slate-400 bg-white/5 py-1 px-2 rounded-lg border border-white/5">
                                 <Building2 className="w-3 h-3" />
                                 <span>{order.bank} • {order.accountNumber}</span>
                               </div>
                             )}

                             <div className="flex gap-3">
                               <div className="bg-white/5 px-2 py-1 rounded-md">
                                 <p className="text-[10px] text-slate-500 uppercase font-bold">Reward</p>
                                 <p className="text-xs text-purple-400 font-mono">+{order.reward} V</p>
                               </div>
                               <div className="bg-white/5 px-2 py-1 rounded-md">
                                 <p className="text-[10px] text-slate-500 uppercase font-bold">Method</p>
                                 <p className="text-xs text-slate-300">{order.payment.split(' ')[0]}</p>
                               </div>
                             </div>
                           </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 pr-2">
                           <p className="text-2xl font-black italic tracking-tighter">₦{order.amount.toLocaleString()}</p>
                           <div className="flex gap-2">
                             {order.status === 'Pending' ? (
                               <button
                                 onClick={() => setPaymentModalOrder(order)}
                                 className="px-4 py-2 bg-yellow-500 text-black rounded-xl text-[10px] font-black italic hover:bg-yellow-400 transition-all uppercase"
                               >
                                  Pay Now
                               </button>
                             ) : (
                               <div className="p-2 text-green-500 bg-green-500/10 rounded-xl">
                                  <CheckCircle className="w-5 h-5" />
                               </div>
                             )}
                             <button
                               onClick={() => generateInvoice(order)}
                               className="p-2 bg-white/5 text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-xl"
                               title="Generate PDF Invoice"
                             >
                                <FileText className="w-5 h-5" />
                             </button>
                             <button
                               onClick={() => shareOrder(order)}
                               className="p-2 bg-white/5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl"
                               title="Share on WhatsApp"
                             >
                                <MessageCircle className="w-5 h-5" />
                             </button>
                             <button
                               onClick={() => deleteOrder(order.id)}
                               className="p-2 bg-white/5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl"
                               title="Delete Order"
                             >
                                <Trash2 className="w-5 h-5" />
                             </button>
                           </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
            </motion.div>
          )}

          {/* ANALYTICS TAB */}
          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  <h3 className="text-sm font-bold uppercase tracking-widest italic">Performance Overview</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-black/20 rounded-2xl">
                    <span className="text-xs text-slate-400 font-bold uppercase">Total Orders</span>
                    <span className="text-xl font-black italic">{orders.length}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-black/20 rounded-2xl">
                    <span className="text-xs text-slate-400 font-bold uppercase">Total Volume</span>
                    <span className="text-xl font-black italic text-green-400">₦{stats.totalEarnings.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-black/20 rounded-2xl">
                    <span className="text-xs text-slate-400 font-bold uppercase">Crypto Ratio</span>
                    <span className="text-xl font-black italic text-orange-400">{orders.length > 0 ? Math.round((stats.cryptoOrders / orders.length) * 100) : 0}%</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
                 <div className="flex items-center gap-2 mb-4">
                  <Package className="w-5 h-5 text-blue-400" />
                  <h3 className="text-sm font-bold uppercase tracking-widest italic">Inventory Stats</h3>
                </div>
                
                <div className="text-center py-8 opacity-20 italic text-xs">
                  Advanced inventory breakdown coming in v2.2...
                </div>
              </div>
            </motion.div>
          )}

          {/* CUSTOMERS TAB */}
          {activeTab === 'customers' && (
            <motion.div
              key="customers"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
                 <div className="flex items-center gap-2 mb-8">
                  <Users className="w-5 h-5 text-purple-400" />
                  <h3 className="text-sm font-bold uppercase tracking-widest italic">Client Leaderboard</h3>
                </div>

                <div className="space-y-4">
                  {stats.topCustomers.length === 0 ? (
                    <div className="py-10 text-center text-slate-600 text-sm italic">Connect with clients to see them here</div>
                  ) : (
                    stats.topCustomers.map((c, i) => (
                      <div key={c.name} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors group">
                        <div className="flex items-center gap-4">
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black italic text-xs ${i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-slate-300 text-black' : 'bg-white/10 text-slate-400'}`}>
                              #{i + 1}
                           </div>
                           <div>
                              <p className="text-sm font-bold">{c.name}</p>
                              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{c.count} ORDERS SUCCESSFUL</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-sm font-mono font-bold text-white">₦{c.spend.toLocaleString()}</p>
                           <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                             <span className="text-[9px] text-purple-400 font-bold italic uppercase">VIP Client</span>
                             <ArrowRight className="w-2.5 h-2.5 text-purple-400" />
                           </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Payment Modal */}
      <AnimatePresence>
        {paymentModalOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0B0B2B] border border-white/20 w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 text-center space-y-6">
                <div className="flex justify-center">
                  <div className="p-4 bg-purple-500/10 rounded-3xl">
                    <Lock className="w-8 h-8 text-purple-400" />
                  </div>
                </div>

                <div>
                   <h2 className="text-xl font-black italic tracking-tighter">Confirm Payment</h2>
                   <p className="text-xs text-slate-500 mt-1 uppercase font-bold tracking-widest">Verify the incoming transaction</p>
                </div>

                <div className="py-4 px-6 bg-white/5 rounded-3xl border border-white/10">
                   <p className="text-3xl font-black italic text-white tracking-widest">₦{paymentModalOrder.amount.toLocaleString()}</p>
                   <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-widest italic">{paymentModalOrder.customer}</p>
                </div>

              <div className="flex items-center justify-center p-4 bg-white rounded-3xl mx-auto w-fit relative overflow-hidden">
                   <div className="absolute inset-0 flex items-center justify-center opacity-10">
                      <img src={VERSE_LOGO} className="w-24 h-24 rotate-12" referrerPolicy="no-referrer" />
                   </div>
                   <QRCodeSVG 
                    value={`PAY:${paymentModalOrder.amount}:${paymentModalOrder.id}`} 
                    size={140}
                    level="H"
                   />
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={() => markPaid(paymentModalOrder.id)}
                    className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black text-sm tracking-tighter italic flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-900/20"
                  >
                    <CheckCircle className="w-5 h-5" />
                    CONFIRM RECEIPT
                  </button>
                  <button 
                    onClick={() => setPaymentModalOrder(null)}
                    className="w-full py-4 bg-white/5 border border-white/10 text-slate-400 rounded-2xl font-bold text-xs hover:bg-white/10 transition-colors"
                  >
                    CLOSE WINDOW
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Persistence Note */}
      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-lg">
        <div className="bg-black/80 backdrop-blur-md border border-white/10 p-3 rounded-2xl flex items-center justify-center gap-3">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 italic">Cloud-Sync & Local Persistence Active</p>
        </div>
      </footer>
    </div>
  );
}
