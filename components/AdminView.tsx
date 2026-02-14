import React, { useState, useMemo } from 'react';
import { 
  ShoppingCart, Plus, Trash2, Edit2, 
  CheckCircle, Ban, DollarSign,
  Truck, BarChart3, X, 
  Palette, Users, ArrowUpRight, Clock, ShieldCheck,
  RotateCcw, Box, MapPin, Phone,
  Package, Search, Save, Calendar, Percent, StickyNote,
  AlertCircle, ChevronRight, RefreshCw
} from 'lucide-react';
import { Product, Order, User } from '../types';
import { BRAND_NAME, INITIAL_PRODUCTS } from '../constants';

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

const AdminView: React.FC<AdminViewProps> = ({ 
  products, orders, brandLogo, registeredUsers, shippingRates, paymentModes, 
  onUpdateProduct, onDeleteProduct, onAddProduct, onUpdateOrder,
  onUpdateShipping, onUpdatePayments, onUpdateLogo
}) => {
  const [tab, setTab] = useState<'dashboard' | 'orders' | 'inventory' | 'shipping' | 'branding'>('inventory');
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [viewingOrder, setViewingOrder] = useState<any | null>(null);
  const [newRegion, setNewRegion] = useState('');
  const [newRate, setNewRate] = useState(0);
  const [tempLogo, setTempLogo] = useState(brandLogo);
  const [trackingID, setTrackingID] = useState('');
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const analytics = useMemo(() => {
    const totalSales = orders.filter(o => o.status !== 'Cancelled').reduce((sum, o) => sum + o.totalPrice, 0);
    const pendingOrders = orders.filter(o => o.status === 'Pending').length;
    const lowStockItems = products.filter(p => p.stockCount < 10).length;
    return { totalSales, pendingOrders, lowStockItems };
  }, [orders, products]);

  const handleLoadDemoData = () => {
    if (confirm("Load demo products into database?")) {
      INITIAL_PRODUCTS.forEach(p => {
        onAddProduct({ ...p, id: '' }); 
      });
    }
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      const isNew = typeof editingProduct.id === 'string' && editingProduct.id.startsWith('p-');
      if (isNew) {
         const { id, ...productData } = editingProduct;
         onAddProduct(productData as Product);
      } else {
         onUpdateProduct(editingProduct);
      }
      setEditingProduct(null);
    }
  };

  const handleProcessOrder = (action: string) => {
    if (!viewingOrder) return;
    const updated = { ...viewingOrder };
    if (action === 'approve') updated.status = 'Approved';
    else if (action === 'reject') {
        if (!rejectionReason) return alert("Enter rejection reason");
        updated.status = 'Rejected';
        updated.rejectionReason = rejectionReason;
        setShowRejectInput(false);
    } else if (action === 'ship') {
        if (!trackingID) return alert("Enter Tracking ID");
        updated.status = 'Shipped';
        updated.trackingId = trackingID;
        updated.shippedDate = customDate;
    } else if (action === 'deliver') {
        updated.status = 'Delivered';
        updated.deliveredDate = customDate;
        updated.paymentStatus = 'Paid';
    } else if (action === 'payment_received') {
        updated.paymentStatus = 'Paid';
    }
    onUpdateOrder(updated);
    setViewingOrder(updated);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const navItems = [
    { id: 'inventory', icon: Package, label: 'Inventory', badge: analytics.lowStockItems > 0 ? `${analytics.lowStockItems} Low` : 0 },
    { id: 'orders', icon: ShoppingCart, label: 'Orders', badge: analytics.pendingOrders },
    { id: 'shipping', icon: Truck, label: 'Logistics' },
    { id: 'branding', icon: Palette, label: 'Brand' },
    { id: 'dashboard', icon: BarChart3, label: 'Reports' },
  ];

  return (
    <div className="h-full flex flex-col bg-[#F8FAFC] font-sans overflow-hidden">
      
      {/* NAVIGATION (Responsive) */}
      <div className="bg-white border-b overflow-x-auto no-scrollbar shrink-0 md:hidden">
          <div className="flex p-2 gap-2 min-w-max">
            {navItems.map(item => (
                <button key={item.id} onClick={() => setTab(item.id as any)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === item.id ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-600'}`}>
                    <item.icon size={16} /> {item.label}
                    {item.badge !== 0 && <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 rounded-full">{item.badge}</span>}
                </button>
            ))}
          </div>
      </div>

      {/* DESKTOP SIDEBAR (Hidden on mobile) */}
      <div className="hidden md:flex flex-col w-64 bg-white border-r h-full p-4">
          <h1 className="text-xl font-bold flex items-center gap-2 mb-8 text-indigo-700"><ShieldCheck size={24} /> Admin</h1>
          <div className="space-y-2">
            {navItems.map(item => (
              <button key={item.id} onClick={() => setTab(item.id as any)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${tab === item.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'}`}>
                <item.icon size={18} /> {item.label}
                {item.badge !== 0 && <span className="ml-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{item.badge}</span>}
              </button>
            ))}
          </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        
        {/* INVENTORY TAB */}
        {tab === 'inventory' && (
          <div className="space-y-6">
             <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-black text-gray-900 self-start md:self-center">Inventory</h2>
                <button onClick={() => setEditingProduct({ id: `p-${Date.now()}`, name: '', price: 0, discount: 0, stockCount: 100, unit: 'Kg', category: 'Fertilizer', image: 'https://placehold.co/400', description: '', rating: 5, reviews: 0 })} className="w-full md:w-auto bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg">
                  <Plus size={18} /> Add Product
                </button>
             </div>
             <div className="relative">
                <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
                <input className="w-full pl-10 p-3.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Search products..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredProducts.map(p => (
                  <div key={p.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex gap-3">
                      <div className="w-20 h-20 bg-gray-50 rounded-lg flex items-center justify-center shrink-0"><img src={p.image} className="max-h-full max-w-full mix-blend-multiply" /></div>
                      <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 truncate text-sm">{p.name}</h3>
                          <p className="text-xs text-gray-500 mb-2">{p.category} • Stock: {p.stockCount}</p>
                          <div className="flex items-center justify-between">
                              <p className="font-black text-indigo-600">₹{p.price}</p>
                              <div className="flex gap-2">
                                  <button onClick={() => setEditingProduct(p)} className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><Edit2 size={14} /></button>
                                  <button onClick={() => onDeleteProduct(String(p.id))} className="p-1.5 bg-red-50 text-red-600 rounded-lg"><Trash2 size={14} /></button>
                              </div>
                          </div>
                      </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {tab === 'orders' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-black text-gray-900 mb-4">Orders</h2>
            {orders.map(o => (
              <div key={o.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-3 cursor-pointer" onClick={() => setViewingOrder(o)}>
                 <div className="flex justify-between items-start">
                    <div>
                       <div className="flex items-center gap-2 mb-1">
                           <span className="font-bold text-gray-900">{o.farmerName}</span>
                           <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${o.status === 'Pending' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{o.status}</span>
                       </div>
                       <p className="text-xs text-gray-500">#{o.id} • {o.date}</p>
                    </div>
                    <p className="font-black text-gray-900">₹{o.totalPrice}</p>
                 </div>
                 <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg truncate">{o.product}</div>
              </div>
            ))}
          </div>
        )}

        {/* DASHBOARD TAB */}
        {tab === 'dashboard' && (
          <div className="space-y-4">
             <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                   <p className="text-xs font-bold text-gray-400 uppercase mb-1">Revenue</p>
                   <h3 className="text-2xl font-black text-gray-900">₹{analytics.totalSales.toLocaleString()}</h3>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                   <p className="text-xs font-bold text-gray-400 uppercase mb-1">Pending</p>
                   <h3 className="text-2xl font-black text-gray-900">{analytics.pendingOrders}</h3>
                </div>
             </div>
          </div>
        )}

        {/* SHIPPING TAB */}
        {tab === 'shipping' && (
          <div className="space-y-4">
             <h2 className="text-2xl font-black text-gray-900">Logistics</h2>
             <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-3">
                {shippingRates.map((rate, i) => (
                   <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                      <span className="font-bold text-gray-700">{rate.region}</span>
                      <div className="flex gap-2 items-center">
                         <span className="text-sm font-bold">₹{rate.rate}</span>
                         <button onClick={() => onUpdateShipping(shippingRates.filter(r => r.region !== rate.region))} className="text-red-500"><Trash2 size={16}/></button>
                      </div>
                   </div>
                ))}
                <div className="flex gap-2 pt-4 border-t">
                   <input className="flex-1 p-2 border rounded-lg text-sm" placeholder="District" value={newRegion} onChange={e=>setNewRegion(e.target.value)} />
                   <input className="w-20 p-2 border rounded-lg text-sm" placeholder="₹" type="number" value={newRate} onChange={e=>setNewRate(parseInt(e.target.value))} />
                   <button onClick={() => { if(newRegion) { onUpdateShipping([...shippingRates, { region: newRegion, rate: newRate }]); setNewRegion(''); setNewRate(0); }}} className="bg-indigo-600 text-white px-4 rounded-lg font-bold text-sm">Add</button>
                </div>
             </div>
          </div>
        )}

      </div>

      {/* MODALS */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
           <form onSubmit={handleSaveProduct} className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between mb-4"><h3 className="font-bold">Edit Product</h3><button type="button" onClick={()=>setEditingProduct(null)}><X size={20}/></button></div>
              <div className="space-y-3">
                 <input className="w-full p-3 bg-gray-50 border rounded-xl" placeholder="Name" value={editingProduct.name} onChange={e=>setEditingProduct({...editingProduct, name: e.target.value})} required />
                 <div className="flex gap-2">
                    <input type="number" className="w-full p-3 bg-gray-50 border rounded-xl" placeholder="Price" value={editingProduct.price} onChange={e=>setEditingProduct({...editingProduct, price: +e.target.value})} required />
                    <input type="number" className="w-full p-3 bg-gray-50 border rounded-xl" placeholder="Stock" value={editingProduct.stockCount} onChange={e=>setEditingProduct({...editingProduct, stockCount: +e.target.value})} />
                 </div>
                 <input className="w-full p-3 bg-gray-50 border rounded-xl" placeholder="Category" value={editingProduct.category} onChange={e=>setEditingProduct({...editingProduct, category: e.target.value})} />
                 <input className="w-full p-3 bg-gray-50 border rounded-xl" placeholder="Image URL" value={editingProduct.image} onChange={e=>setEditingProduct({...editingProduct, image: e.target.value})} />
                 <button className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold">Save</button>
              </div>
           </form>
        </div>
      )}

      {viewingOrder && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
               <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                  <h3 className="font-bold">Order #{viewingOrder.id}</h3>
                  <button onClick={()=>setViewingOrder(null)}><X size={20}/></button>
               </div>
               <div className="p-4 overflow-y-auto space-y-4">
                  <div className="bg-gray-50 p-3 rounded-xl border">
                     <p className="font-bold text-gray-900">{viewingOrder.farmerName}</p>
                     <p className="text-xs text-gray-500">{viewingOrder.location}</p>
                     <p className="text-xs text-gray-500">{viewingOrder.phone}</p>
                  </div>
                  <div>
                     <p className="text-xs font-bold text-gray-400 uppercase">Items</p>
                     <p className="text-sm font-medium">{viewingOrder.product} (x{viewingOrder.quantity})</p>
                     <p className="font-black text-xl mt-1">₹{viewingOrder.totalPrice}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                     {viewingOrder.status === 'Pending' && (
                        <>
                        <button onClick={() => handleProcessOrder('approve')} className="py-3 bg-emerald-600 text-white rounded-xl font-bold">Approve</button>
                        <button onClick={() => setShowRejectInput(true)} className="py-3 bg-red-100 text-red-600 rounded-xl font-bold">Reject</button>
                        </>
                     )}
                     {viewingOrder.status === 'Approved' && (
                        <button onClick={() => handleProcessOrder('ship')} className="col-span-2 py-3 bg-blue-600 text-white rounded-xl font-bold">Ship Order</button>
                     )}
                     {viewingOrder.status === 'Shipped' && (
                        <button onClick={() => handleProcessOrder('deliver')} className="col-span-2 py-3 bg-gray-900 text-white rounded-xl font-bold">Mark Delivered</button>
                     )}
                  </div>
                  {showRejectInput && (
                      <div className="mt-2">
                          <input className="w-full p-2 border rounded-lg text-sm mb-2" placeholder="Reason" value={rejectionReason} onChange={e=>setRejectionReason(e.target.value)} />
                          <button onClick={() => handleProcessOrder('reject')} className="w-full py-2 bg-red-600 text-white rounded-lg font-bold text-xs">Confirm Reject</button>
                      </div>
                  )}
               </div>
            </div>
         </div>
      )}

    </div>
  );
};

export default AdminView;