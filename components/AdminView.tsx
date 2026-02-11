import React, { useState, useMemo } from 'react';
import { 
  ShoppingCart, Plus, Trash2, Edit2, 
  CheckCircle, Ban, DollarSign,
  Truck, BarChart3, X, 
  Palette, Users, ArrowUpRight, Clock, ShieldCheck,
  RotateCcw, Box, MapPin, Phone,
  Package, Search, Save, Upload, AlertCircle, Image as ImageIcon
} from 'lucide-react';
import { Product, Order, User } from '../types';
import { BRAND_NAME } from '../constants';
import { 
  CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';

interface AdminViewProps {
  products: Product[];
  orders: Order[];
  brandLogo: string;
  registeredUsers: User[];
  shippingRates: {region: string, rate: number}[];
  paymentModes: {id: string, label: string, active: boolean}[];
  onUpdateProduct: (p: Product) => void;
  onDeleteProduct: (id: string) => void;
  onAddProduct: (p: Product) => void;
  onUpdateOrder: (o: Order) => void;
  onUpdateShipping: (s: {region: string, rate: number}[]) => void;
  onUpdatePayments: (p: {id: string, label: string, active: boolean}[]) => void;
  onUpdateLogo: (logo: string) => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-2xl shadow-2xl border border-indigo-50">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label} Sales</p>
        <p className="text-lg font-black text-indigo-600">
          ₹{payload[0].value.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

const AdminView: React.FC<AdminViewProps> = ({ 
  products, orders, brandLogo, registeredUsers, shippingRates, paymentModes, 
  onUpdateProduct, onDeleteProduct, onAddProduct, onUpdateOrder,
  onUpdateShipping, onUpdatePayments, onUpdateLogo
}) => {
  const [tab, setTab] = useState<'orders' | 'inventory' | 'shipping' | 'dashboard' | 'branding'>('dashboard');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  
  // Local state for forms
  const [rejectionNote, setRejectionNote] = useState('');
  const [showRejectionPanel, setShowRejectionPanel] = useState(false);
  const [trackingID, setTrackingID] = useState('');
  const [showTrackingPanel, setShowTrackingPanel] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [tempLogo, setTempLogo] = useState(brandLogo);

  const analytics = useMemo(() => {
    const totalSales = orders
      .filter(o => o.status !== 'Cancelled' && o.status !== 'Rejected')
      .reduce((sum, o) => sum + o.totalPrice, 0);
    const pendingOrders = orders.filter(o => o.status === 'Pending').length;
    const completedOrders = orders.filter(o => o.status === 'Delivered').length;
    
    // Mock Chart Data
    const chartData = [
      { date: 'Mon', amount: 4500 },
      { date: 'Tue', amount: 12000 },
      { date: 'Wed', amount: 8000 },
      { date: 'Thu', amount: 15000 },
      { date: 'Fri', amount: 22000 },
      { date: 'Sat', amount: 18000 },
      { date: 'Sun', amount: 25000 },
    ];
    
    return { totalSales, pendingOrders, completedOrders, chartData };
  }, [orders]);

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      const exists = products.find(p => p.id === editingProduct.id);
      if (exists) onUpdateProduct(editingProduct);
      else onAddProduct(editingProduct);
      setEditingProduct(null);
    }
  };

  const processOrder = (order: Order, action: string) => {
    let updated = { ...order };
    
    if (action === 'approve') {
       updated.status = 'Approved';
    } else if (action === 'reject') {
       if (!rejectionNote.trim()) { alert("Please provide a rejection reason."); return; }
       updated.status = 'Rejected';
       updated.rejectionReason = rejectionNote;
       setShowRejectionPanel(false);
       setRejectionNote('');
    } else if (action === 'verify_payment') {
       updated.status = 'Payment Verified';
       updated.paymentStatus = 'Verified';
    } else if (action === 'ship') {
       if (!trackingID.trim()) { alert("Please provide a Tracking ID."); return; }
       updated.status = 'Shipped';
       updated.trackingId = trackingID;
       setShowTrackingPanel(false);
       setTrackingID('');
    } else if (action === 'deliver') {
       updated.status = 'Delivered';
    } else if (action === 'restore') {
       updated.status = 'Pending';
    }
    
    onUpdateOrder(updated);
    
    // Update the local viewing state if we are still looking at the modal
    if (viewingOrder && viewingOrder.id === updated.id) {
       setViewingOrder(updated);
    }
  };

  const filteredItems = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="h-full flex bg-[#F8FAFC] overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r hidden xl:flex flex-col shrink-0">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <ShieldCheck size={24} />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Soilify Admin</h1>
          </div>
          
          <nav className="space-y-1.5">
            {[
              { id: 'dashboard', icon: BarChart3, label: 'Performance' },
              { id: 'orders', icon: ShoppingCart, label: 'Order Pipeline', badge: analytics.pendingOrders },
              { id: 'inventory', icon: Package, label: 'Asset Library' },
              { id: 'shipping', icon: Truck, label: 'Logistics' },
              { id: 'branding', icon: Palette, label: 'Brand Center' },
            ].map(item => (
              <button 
                key={item.id}
                onClick={() => setTab(item.id as any)} 
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-[13px] font-bold transition-all ${
                  tab === item.id 
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon size={20} strokeWidth={2.5} /> 
                {item.label}
                {(item.badge || 0) > 0 && (
                  <span className="ml-auto bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8 lg:p-12">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h2 className="text-4xl font-black text-gray-900 tracking-tight">
              {tab === 'dashboard' ? 'Real-time Analytics' : 
               tab === 'orders' ? 'Order Pipeline' :
               tab === 'inventory' ? 'Asset Library' :
               tab === 'shipping' ? 'Logistics Config' : 'Brand Center'}
            </h2>
            <p className="text-gray-500 text-sm mt-1">Managing {BRAND_NAME} ecosystem status.</p>
          </div>
          
          {tab === 'inventory' && (
            <button 
              onClick={() => setEditingProduct({ id: `p-${Date.now()}`, name: '', price: 0, unit: '50kg Bag', image: brandLogo, category: 'Fertilizers', description: '', rating: 5, reviews: 0, inStock: true, stockCount: 0 })}
              className="bg-indigo-600 text-white px-6 py-3.5 rounded-xl font-bold text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
            >
              <Plus size={18} /> New Product
            </button>
          )}
        </header>

        {/* 1. DASHBOARD */}
        {tab === 'dashboard' && (
          <div className="space-y-8">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Gross Revenue', value: `₹${analytics.totalSales.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '+12%' },
                  { label: 'Active Pipeline', value: analytics.pendingOrders, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50', trend: '+4 today' },
                  { label: 'Completed Deliveries', value: analytics.completedOrders, icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50', trend: '98% success' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 ${stat.bg} ${stat.color} rounded-xl`}>
                        <stat.icon size={24} />
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-full">{stat.trend}</span>
                    </div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{stat.label}</p>
                    <h3 className="text-3xl font-black text-gray-900 mt-1">{stat.value}</h3>
                  </div>
                ))}
             </div>

             <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                   <h3 className="text-lg font-bold text-gray-900">Revenue Growth (7 Days)</h3>
                </div>
                <div className="h-[300px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.chartData}>
                      <defs>
                        <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 600, fill: '#64748b'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 600, fill: '#64748b'}} />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#4f46e5', strokeWidth: 1, strokeDasharray: '5 5' }} />
                      <Area 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="#4f46e5" 
                        strokeWidth={3} 
                        fillOpacity={1} 
                        fill="url(#colorAmt)" 
                        activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5 shadow-lg' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
             </div>
          </div>
        )}

        {/* 2. ORDER PIPELINE */}
        {tab === 'orders' && (
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
             <div className="p-6 border-b flex justify-between items-center">
                <h3 className="font-bold text-gray-900">Distribution Queue</h3>
             </div>
             <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                <tr>
                  <th className="px-8 py-4">Farmer Details</th>
                  <th className="px-8 py-4">Order Value</th>
                  <th className="px-8 py-4">Current Stage</th>
                  <th className="px-8 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <p className="font-bold text-gray-900">{o.farmerName}</p>
                      <p className="text-xs text-gray-500">{o.phone} • {o.location}</p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="font-bold text-gray-900">₹{o.totalPrice}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{o.paymentMethod}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        o.status === 'Pending' ? 'bg-orange-100 text-orange-600' :
                        o.status === 'Approved' ? 'bg-blue-100 text-blue-600' :
                        o.status === 'Payment Verified' ? 'bg-purple-100 text-purple-600' :
                        o.status === 'Shipped' ? 'bg-indigo-100 text-indigo-600' :
                        o.status === 'Delivered' ? 'bg-emerald-100 text-emerald-600' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button onClick={() => setViewingOrder(o)} className="p-2.5 bg-gray-50 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                        <ArrowUpRight size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. ASSET LIBRARY (INVENTORY) */}
        {tab === 'inventory' && (
           <div className="space-y-6">
             <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search assets..." 
                  className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map(p => (
                  <div key={p.id} className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm relative group">
                    <div className="aspect-square rounded-2xl overflow-hidden mb-4 bg-gray-50">
                      <img src={p.image} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex justify-between items-start mb-2">
                       <div>
                         <h4 className="font-bold text-gray-900">{p.name}</h4>
                         <p className="text-xs text-gray-400">{p.category}</p>
                       </div>
                       <p className="font-black text-indigo-600 text-lg italic">₹{p.price}</p>
                    </div>
                    <div className="flex items-center justify-between mt-6 pt-4 border-t">
                       <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${p.stockCount < 20 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-500'}`}>
                         Stock: {p.stockCount}
                       </span>
                       <div className="flex gap-2">
                         <button onClick={() => setEditingProduct(p)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 size={16} /></button>
                         <button onClick={() => onDeleteProduct(p.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                       </div>
                    </div>
                  </div>
                ))}
             </div>
           </div>
        )}

        {/* 4. LOGISTICS (SHIPPING) */}
        {tab === 'shipping' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Regional Delivery Rates</h3>
              <div className="space-y-4">
                {shippingRates.map((rate, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <MapPin size={20} className="text-indigo-600" />
                      <span className="font-bold text-gray-700">{rate.region}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-400">₹</span>
                      <input 
                        type="number" 
                        value={rate.rate}
                        onChange={(e) => {
                          const newRates = shippingRates.map((r, i) => 
                            i === index ? { ...r, rate: parseInt(e.target.value) || 0 } : r
                          );
                          onUpdateShipping(newRates);
                        }}
                        className="w-20 bg-white border border-gray-200 rounded-lg px-2 py-1 text-right font-black outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Active Payment Gateways</h3>
              <div className="space-y-4">
                {paymentModes.map((mode, index) => (
                  <div key={mode.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                    <span className="font-bold text-gray-700">{mode.label}</span>
                    <button 
                      onClick={() => {
                        const newModes = paymentModes.map((m, i) => 
                          i === index ? { ...m, active: !m.active } : m
                        );
                        onUpdatePayments(newModes);
                      }}
                      className={`w-12 h-6 rounded-full transition-colors relative ${mode.active ? 'bg-indigo-600' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${mode.active ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 5. BRAND CENTER */}
        {tab === 'branding' && (
          <div className="max-w-xl mx-auto animate-in fade-in duration-300">
            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
              <div className="text-center mb-8">
                <div className="w-32 h-32 mx-auto bg-gray-100 rounded-full mb-4 overflow-hidden border-4 border-white shadow-xl relative group">
                  <img src={tempLogo} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Upload className="text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-gray-900">{BRAND_NAME}</h3>
                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">Storefront Identity</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">Logo URL</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={tempLogo}
                      onChange={(e) => setTempLogo(e.target.value)}
                      className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-medium"
                    />
                    <button onClick={() => setTempLogo('https://placehold.co/400x400/22c55e/ffffff?text=New+Logo')} className="p-3 bg-gray-100 rounded-xl hover:bg-gray-200"><RotateCcw size={20} /></button>
                  </div>
                </div>
                
                <button 
                  onClick={() => onUpdateLogo(tempLogo)}
                  className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={18} /> Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Product Edit Modal */}
      {editingProduct && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <form onSubmit={handleSaveProduct} className="bg-white p-8 rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in duration-200">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                 {products.find(p=>p.id===editingProduct.id) ? <Edit2 size={20} /> : <Plus size={20} />}
                 {products.find(p=>p.id===editingProduct.id) ? 'Edit Product' : 'Add New Asset'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Product Name</label>
                  <input className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-indigo-500 transition-colors" placeholder="e.g. Apple Seeds" value={editingProduct.name} onChange={e=>setEditingProduct({...editingProduct, name: e.target.value})} required />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Price (₹)</label>
                    <input className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-indigo-500" type="number" placeholder="450" value={editingProduct.price} onChange={e=>setEditingProduct({...editingProduct, price: +e.target.value})} required />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Unit Type</label>
                    <input className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-indigo-500" placeholder="e.g. 50kg Bag" value={editingProduct.unit} onChange={e=>setEditingProduct({...editingProduct, unit: e.target.value})} required />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Product Image URL</label>
                  <div className="relative">
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      className="w-full pl-10 pr-3 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:border-indigo-500" 
                      placeholder="https://..." 
                      value={editingProduct.image} 
                      onChange={e=>setEditingProduct({...editingProduct, image: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={()=>setEditingProduct(null)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl">Cancel</button>
                  <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200">Save Product</button>
                </div>
              </div>
            </form>
         </div>
      )}

      {/* Order View Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setViewingOrder(null)} />
          <div className="relative bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
             <div className="p-8 border-b flex justify-between items-center bg-gray-50/50">
                <div>
                   <h3 className="text-xl font-bold text-gray-900">Order #{viewingOrder.id}</h3>
                   <p className="text-xs text-gray-500">Managing distribution status for {viewingOrder.farmerName}</p>
                </div>
                <button onClick={() => setViewingOrder(null)} className="p-2 text-gray-400 hover:text-red-500 rounded-full bg-white shadow-sm"><X size={20} /></button>
             </div>
             
             <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-6">
                   <div className="bg-gray-50 p-6 rounded-2xl">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Farmer Information</p>
                      <div className="space-y-2 text-sm">
                        <p className="font-bold flex items-center gap-2"><Users size={14} className="text-indigo-600" /> {viewingOrder.farmerName}</p>
                        <p className="font-medium text-gray-600 flex items-center gap-2"><Phone size={14} className="text-indigo-600" /> {viewingOrder.phone}</p>
                        <p className="font-medium text-gray-600 flex items-center gap-2"><MapPin size={14} className="text-indigo-600" /> {viewingOrder.location}</p>
                      </div>
                   </div>
                   <div className="bg-gray-50 p-6 rounded-2xl">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Order Financials</p>
                      <div className="space-y-2 text-sm">
                         <div className="flex justify-between">
                            <span className="text-gray-500">Value</span>
                            <span className="font-bold text-lg">₹{viewingOrder.totalPrice}</span>
                         </div>
                         <div className="flex justify-between">
                            <span className="text-gray-500">Method</span>
                            <span className="font-bold">{viewingOrder.paymentMethod}</span>
                         </div>
                         <div className="flex justify-between">
                            <span className="text-gray-500">Payment</span>
                            <span className={`font-bold ${viewingOrder.paymentStatus === 'Verified' ? 'text-emerald-600' : 'text-orange-600'}`}>{viewingOrder.paymentStatus}</span>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="border border-gray-100 p-6 rounded-2xl">
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Item Manifest</p>
                   <p className="text-base font-bold text-gray-800 leading-tight">"{viewingOrder.product}"</p>
                   <p className="text-xs text-gray-500 mt-2">Quantity: {viewingOrder.quantity} units</p>
                </div>

                <div className="pt-6 border-t space-y-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Workflow Actions</p>
                  
                  {showRejectionPanel ? (
                    <div className="space-y-4 animate-in slide-in-from-top-4">
                       <textarea 
                        className="w-full p-4 bg-red-50 border border-red-100 rounded-xl outline-none text-red-900 text-sm placeholder:text-red-300" 
                        placeholder="Reason for cancellation..." 
                        rows={3}
                        value={rejectionNote}
                        onChange={e => setRejectionNote(e.target.value)}
                       />
                       <div className="flex gap-4">
                         <button onClick={() => setShowRejectionPanel(false)} className="flex-1 py-3 text-gray-500 font-bold text-sm bg-gray-50 rounded-xl">Cancel</button>
                         <button onClick={() => processOrder(viewingOrder, 'reject')} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm">Confirm Reject</button>
                       </div>
                    </div>
                  ) : showTrackingPanel ? (
                    <div className="space-y-4 animate-in slide-in-from-top-4">
                       <input 
                        type="text" 
                        className="w-full p-4 bg-blue-50 border border-blue-100 rounded-xl outline-none font-bold text-blue-900" 
                        placeholder="Tracking ID (e.g., SHIP-KMR-123)" 
                        value={trackingID}
                        onChange={e => setTrackingID(e.target.value)}
                       />
                       <div className="flex gap-4">
                         <button onClick={() => setShowTrackingPanel(false)} className="flex-1 py-3 text-gray-500 font-bold text-sm bg-gray-50 rounded-xl">Back</button>
                         <button onClick={() => processOrder(viewingOrder, 'ship')} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm">Initiate Shipment</button>
                       </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                       {viewingOrder.status === 'Pending' && (
                         <>
                           <button onClick={() => processOrder(viewingOrder, 'approve')} className="flex items-center justify-center gap-2 py-4 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all"><CheckCircle size={18} /> Approve</button>
                           <button onClick={() => setShowRejectionPanel(true)} className="flex items-center justify-center gap-2 py-4 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-all"><Ban size={18} /> Reject</button>
                         </>
                       )}
                       {viewingOrder.status === 'Approved' && (
                         <button onClick={() => processOrder(viewingOrder, 'verify_payment')} className="col-span-2 py-4 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-indigo-100 hover:bg-indigo-700"><DollarSign size={18} /> Verify Payment Received</button>
                       )}
                       {viewingOrder.status === 'Payment Verified' && (
                         <button onClick={() => setShowTrackingPanel(true)} className="col-span-2 py-4 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-blue-100 hover:bg-blue-700"><Truck size={18} /> Start Logistics (Ship)</button>
                       )}
                       {viewingOrder.status === 'Shipped' && (
                         <button onClick={() => processOrder(viewingOrder, 'deliver')} className="col-span-2 py-4 bg-gray-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black"><Box size={18} /> Mark as Delivered</button>
                       )}
                       {(viewingOrder.status === 'Rejected' || viewingOrder.status === 'Delivered') && (
                         <button onClick={() => processOrder(viewingOrder, 'restore')} className="col-span-2 py-4 bg-gray-100 text-gray-500 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200"><RotateCcw size={18} /> Re-open Pipeline</button>
                       )}
                    </div>
                  )}
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;