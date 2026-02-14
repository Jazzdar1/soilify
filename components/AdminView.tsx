import React, { useState, useMemo } from 'react';
import { 
  ShoppingCart, Plus, Trash2, Edit2, Truck, BarChart3, X, 
  Palette, ShieldCheck, Package, Search, MapPin, Upload, DollarSign,
  AlertCircle
} from 'lucide-react';
import { Product, Order, User } from '../types';
import { INITIAL_PRODUCTS } from '../constants';

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
  onDeleteOrder: (id: string) => void; 
  onClearHistory: () => void;
}

const AdminView: React.FC<AdminViewProps> = ({ 
  products, orders, brandLogo, shippingRates, 
  onUpdateProduct, onDeleteProduct, onAddProduct, onUpdateOrder,
  onUpdateShipping, onUpdateLogo, onDeleteOrder, onClearHistory
}) => {
  const [tab, setTab] = useState<'inventory' | 'orders' | 'shipping' | 'branding'>('inventory');
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [viewingOrder, setViewingOrder] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [pickupDate, setPickupDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [newRegion, setNewRegion] = useState('');
  const [newRate, setNewRate] = useState(0);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      const productToSave = {
          ...editingProduct,
          inStock: editingProduct.stockCount > 0
      };
      if (typeof productToSave.id === 'string' && productToSave.id.startsWith('p-')) {
         const { id, ...productData } = productToSave;
         onAddProduct(productData as Product);
      } else {
         onUpdateProduct(productToSave);
      }
      setEditingProduct(null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setEditingProduct({...editingProduct, image: reader.result as string});
          };
          reader.readAsDataURL(file);
      }
  };

  const handleProcessOrder = (action: string) => {
      if (!viewingOrder) return;
      const updated = { ...viewingOrder };
      
      if (action === 'approve') updated.status = 'Approved';
      if (action === 'ship') { updated.status = 'Shipped'; updated.pickupDate = pickupDate; }
      if (action === 'deliver') { updated.status = 'Delivered'; updated.deliveredDate = deliveryDate; updated.paymentStatus = 'Paid'; }
      if (action === 'reject') updated.status = 'Rejected';
      if (action === 'refund') { updated.status = 'Refunded'; updated.paymentStatus = 'Refunded'; }
      if (action === 'return_approved') { updated.status = 'Returned'; updated.paymentStatus = 'Refunded'; }

      onUpdateOrder(updated);
      setViewingOrder(updated);
  };

  return (
    <div className="flex h-full bg-[#F8FAFC]">
      <aside className="w-64 bg-white border-r hidden md:flex flex-col p-4 shrink-0">
          <div className="space-y-1">
            <button onClick={() => setTab('inventory')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold ${tab === 'inventory' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600'}`}><Package size={18}/> Inventory</button>
            <button onClick={() => setTab('orders')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold ${tab === 'orders' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600'}`}><ShoppingCart size={18}/> Orders</button>
            <button onClick={() => setTab('shipping')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold ${tab === 'shipping' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600'}`}><Truck size={18}/> Logistics</button>
            <button onClick={() => setTab('branding')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold ${tab === 'branding' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600'}`}><Palette size={18}/> Branding</button>
          </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        {tab === 'inventory' && (
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-black text-gray-900">Inventory</h2>
                    <button onClick={() => setEditingProduct({ id: `p-${Date.now()}`, name: '', price: 0, discount: 0, stockCount: 100, unit: 'Kg', category: 'General', image: '', description: '', brand: '', rating: 5, reviews: 0 })} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Plus size={18}/> Add Product</button>
                </div>
                <input className="w-full p-3 border rounded-xl" placeholder="Search products..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProducts.map(p => (
                        <div key={p.id} className="bg-white p-4 rounded-xl border shadow-sm flex gap-4 relative">
                            <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center"><img src={p.image} className="max-h-full max-w-full mix-blend-multiply" /></div>
                            <div className="flex-1">
                                <h4 className="font-bold truncate">{p.name}</h4>
                                <p className="text-xs text-gray-500">{p.brand}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="font-black text-indigo-600">₹{p.price}</span>
                                    {p.discount && p.discount > 0 && <span className="text-xs bg-red-100 text-red-600 px-1 rounded">-{p.discount}%</span>}
                                </div>
                                <p className={`text-xs mt-1 font-bold ${p.stockCount > 0 ? 'text-green-600' : 'text-red-600'}`}>Stock: {p.stockCount}</p>
                                <div className="flex gap-2 mt-2">
                                    <button onClick={() => setEditingProduct(p)} className="p-1.5 bg-indigo-50 text-indigo-600 rounded"><Edit2 size={14}/></button>
                                    <button onClick={() => onDeleteProduct(p.id)} className="p-1.5 bg-red-50 text-red-600 rounded"><Trash2 size={14}/></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {tab === 'orders' && (
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black text-gray-900">Orders</h2>
                    <button onClick={() => { if(confirm("Clear completed orders?")) onClearHistory(); }} className="text-sm text-red-600 font-bold border border-red-200 px-3 py-1.5 rounded-lg bg-red-50">Clear History</button>
                </div>
                <div className="space-y-3">
                    {orders.map(o => (
                        <div key={o.id} className="bg-white p-4 rounded-xl border shadow-sm flex justify-between items-center">
                            <div>
                                <p className="font-bold">{o.farmerName}</p>
                                <p className="text-sm text-gray-500">{o.product}</p>
                                <span className={`text-xs bg-gray-100 px-2 py-1 rounded ${o.status==='Return Requested'?'text-red-600 font-bold':''}`}>{o.status}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setViewingOrder(o)} className="text-indigo-600 font-bold underline">Manage</button>
                                <button onClick={() => { if(confirm("Delete order?")) onDeleteOrder(o.id); }} className="text-gray-400 hover:text-red-600"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {tab === 'shipping' && (
            <div className="max-w-2xl mx-auto space-y-6">
                <h2 className="text-2xl font-bold">Shipping Rates</h2>
                {shippingRates.map((rate, i) => (
                    <div key={i} className="flex justify-between p-3 bg-white border rounded"><span>{rate.region}</span><span>₹{rate.rate}</span></div>
                ))}
                <div className="flex gap-2">
                    <input className="border p-2 rounded" placeholder="Region" value={newRegion} onChange={e=>setNewRegion(e.target.value)} />
                    <input className="border p-2 rounded w-20" placeholder="Rate" type="number" value={newRate} onChange={e=>setNewRate(+e.target.value)} />
                    <button onClick={()=>{ if(newRegion) onUpdateShipping([...shippingRates, {region: newRegion, rate: newRate}]) }} className="bg-indigo-600 text-white px-4 py-2 rounded">Add</button>
                </div>
            </div>
        )}

        {tab === 'branding' && (
            <div className="max-w-xl mx-auto">
                <h2 className="text-2xl font-bold mb-4">Branding</h2>
                <input className="w-full p-2 border rounded mb-2" placeholder="Logo URL" value={brandLogo} onChange={e=>onUpdateLogo(e.target.value)} />
                <img src={brandLogo} className="w-20 h-20 object-contain border" />
            </div>
        )}
      </main>

      {/* EDIT PRODUCT MODAL - RESTORED ALL FIELDS */}
      {editingProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
           <form onSubmit={handleSaveProduct} className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between mb-4"><h3 className="font-bold text-lg">Product Details</h3><button type="button" onClick={()=>setEditingProduct(null)}><X size={20}/></button></div>
              <div className="space-y-3">
                 <input className="w-full p-2 border rounded" placeholder="Name" value={editingProduct.name} onChange={e=>setEditingProduct({...editingProduct, name: e.target.value})} required />
                 <input className="w-full p-2 border rounded" placeholder="Brand" value={editingProduct.brand} onChange={e=>setEditingProduct({...editingProduct, brand: e.target.value})} />
                 <div className="flex gap-2">
                    <input type="number" className="w-full p-2 border rounded" placeholder="Price" value={editingProduct.price} onChange={e=>setEditingProduct({...editingProduct, price: +e.target.value})} />
                    <input type="number" className="w-full p-2 border rounded" placeholder="Discount %" value={editingProduct.discount || ''} onChange={e=>setEditingProduct({...editingProduct, discount: +e.target.value})} />
                 </div>
                 <div className="flex gap-2">
                    <input type="number" className="w-full p-2 border rounded" placeholder="Stock Count" value={editingProduct.stockCount} onChange={e=>setEditingProduct({...editingProduct, stockCount: +e.target.value})} />
                    <input className="w-full p-2 border rounded" placeholder="Category" value={editingProduct.category} onChange={e=>setEditingProduct({...editingProduct, category: e.target.value})} />
                 </div>
                 <div className="flex gap-2">
                    <input className="w-full p-2 border rounded" placeholder="Unit (e.g. Kg)" value={editingProduct.unit} onChange={e=>setEditingProduct({...editingProduct, unit: e.target.value})} />
                 </div>
                 <textarea className="w-full p-2 border rounded" rows={3} placeholder="Description" value={editingProduct.description} onChange={e=>setEditingProduct({...editingProduct, description: e.target.value})} />
                 <div className="flex gap-2 items-center">
                     <input className="w-full p-2 border rounded" placeholder="Image URL" value={editingProduct.image} onChange={e=>setEditingProduct({...editingProduct, image: e.target.value})} />
                     <label className="cursor-pointer bg-gray-200 p-2 rounded"><Upload size={18}/><input type="file" className="hidden" onChange={handleImageUpload}/></label>
                 </div>
                 <button className="w-full py-2 bg-indigo-600 text-white rounded font-bold">Save</button>
              </div>
           </form>
        </div>
      )}

      {/* ORDER ACTION MODAL */}
      {viewingOrder && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl">
               <h3 className="font-bold text-xl mb-4">Manage Order #{viewingOrder.id}</h3>
               <div className="mb-4 bg-gray-50 p-3 rounded-lg border">
                   <p className="text-sm"><strong>Customer:</strong> {viewingOrder.farmerName}</p>
                   <p className="text-sm"><strong>Status:</strong> {viewingOrder.status}</p>
                   <p className="text-sm"><strong>Address:</strong> {viewingOrder.location}, {viewingOrder.district}</p>
               </div>
               
               <div className="space-y-2">
                   {viewingOrder.status === 'Pending' && <button onClick={()=>handleProcessOrder('approve')} className="w-full bg-green-600 text-white py-2 rounded font-bold">Approve Order</button>}
                   
                   {viewingOrder.status === 'Approved' && (
                       <div className="bg-blue-50 p-3 rounded border border-blue-100">
                           <label className="text-xs font-bold text-blue-800">Set Pickup Date</label>
                           <input type="date" className="w-full p-2 border rounded mt-1 bg-white" value={pickupDate} onChange={e=>setPickupDate(e.target.value)} />
                           <button onClick={()=>handleProcessOrder('ship')} className="w-full mt-2 bg-blue-600 text-white py-2 rounded font-bold">Ship Order</button>
                       </div>
                   )}
                   
                   {viewingOrder.status === 'Shipped' && (
                       <div className="bg-green-50 p-3 rounded border border-green-100">
                           <label className="text-xs font-bold text-green-800">Set Delivery Date</label>
                           <input type="date" className="w-full p-2 border rounded mt-1 bg-white" value={deliveryDate} onChange={e=>setDeliveryDate(e.target.value)} />
                           <button onClick={()=>handleProcessOrder('deliver')} className="w-full mt-2 bg-green-600 text-white py-2 rounded font-bold">Mark Delivered</button>
                       </div>
                   )}

                   {viewingOrder.status === 'Return Requested' && (
                       <button onClick={()=>handleProcessOrder('return_approved')} className="w-full bg-red-600 text-white py-2 rounded font-bold">Approve Return & Refund</button>
                   )}
                   {viewingOrder.paymentStatus === 'Refund Requested' && (
                       <button onClick={()=>handleProcessOrder('refund')} className="w-full bg-blue-600 text-white py-2 rounded font-bold">Process Refund</button>
                   )}

                   <button onClick={()=>setViewingOrder(null)} className="w-full border border-gray-300 py-2 rounded font-bold mt-2">Close</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default AdminView;