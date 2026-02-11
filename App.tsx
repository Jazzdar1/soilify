import React, { useState, useEffect } from 'react';
import { AppView, User, Product, Order } from './types';
import FarmerView from './components/FarmerView';
import AdminView from './components/AdminView';
import { Smartphone, LayoutDashboard, Lock, LogIn } from 'lucide-react';
import { BRAND_LOGO_URL, BRAND_NAME, INITIAL_PRODUCTS, INITIAL_ORDERS } from './constants';
import { supabase } from './services/supabaseClient';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.FARMER);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminLoginForm, setAdminLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const [user, setUser] = useState<User>({ name: '', email: '', phone: '', isLoggedIn: false });
  
  // State from DB
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  
  const [brandLogo, setBrandLogo] = useState<string>(BRAND_LOGO_URL);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  
  const [shippingRates, setShippingRates] = useState([
    { region: 'Srinagar', rate: 0 },
    { region: 'Shopian', rate: 50 },
    { region: 'Anantnag', rate: 60 },
    { region: 'Sopore', rate: 80 },
    { region: 'Other', rate: 100 }
  ]);
  
  const [paymentModes, setPaymentModes] = useState([
    { id: 'cod', label: 'Cash on Delivery', active: true },
    { id: 'upi', label: 'UPI (PhonePe/GPay)', active: true },
    { id: 'card', label: 'Credit/Debit Card', active: true }
  ]);

  // Load Data from Supabase
  useEffect(() => {
    const loadData = async () => {
      // 1. Fetch Products
      const { data: pData, error: pError } = await supabase.from('products').select('*');
      if (!pError && pData && pData.length > 0) {
        setProducts(pData as Product[]);
      }

      // 2. Fetch Orders
      const { data: oData, error: oError } = await supabase.from('orders').select('*');
      if (!oError && oData && oData.length > 0) {
        setOrders(oData as Order[]);
      }
    };
    
    // Attempt load, fallback to constants if DB empty or error (useful for dev)
    loadData();
  }, []);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminLoginForm.username === 'Admin' && adminLoginForm.password === 'Admin@123') {
      setIsAdminAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Invalid credentials. Use Admin / Admin@123');
    }
  };

  const handleUpdateProduct = async (updated: Product) => {
    // Optimistic Update
    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
    // DB Update
    await supabase.from('products').update(updated).eq('id', updated.id);
  };

  const handleDeleteProduct = async (id: string) => {
    if(window.confirm("Delete this product?")) {
      setProducts(prev => prev.filter(p => p.id !== id));
      await supabase.from('products').delete().eq('id', id);
    }
  };

  const handleAddProduct = async (newP: Product) => {
    // Remove ID if generated locally, let DB handle it or use UUID
    const { data, error } = await supabase.from('products').insert([newP]).select();
    if (!error && data) {
      setProducts(prev => [data[0] as Product, ...prev]);
    } else {
      // Fallback for demo
      setProducts(prev => [newP, ...prev]);
    }
  };

  const handleUpdateOrder = async (updatedOrder: Order) => {
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    await supabase.from('orders').update(updatedOrder).eq('id', updatedOrder.id);
  };

  const handleNewOrder = async (order: Order) => {
    // 1. Add Order
    const { data, error } = await supabase.from('orders').insert([order]).select();
    
    if (!error && data) {
      const savedOrder = data[0] as Order;
      setOrders(prev => [savedOrder, ...prev]);
      
      // 2. Update Stock
      // Note: In real app, do this via Database Function/Trigger for atomicity
      const productNames = savedOrder.product.split(',').map(s => s.trim());
      
      const newProducts = products.map(p => {
        if (productNames.some(name => p.name.includes(name))) { // Simplified matching
          const newStock = Math.max(0, p.stockCount - savedOrder.quantity); // Logic assumes 1 qty per item type for simplicity
          supabase.from('products').update({ stockCount: newStock }).eq('id', p.id);
          return { ...p, stockCount: newStock };
        }
        return p;
      });
      setProducts(newProducts);
    } else {
      // Fallback
      setOrders(prev => [order, ...prev]);
    }
  };

  const handleLogin = (u: User) => {
    setUser(u);
    // In real app, save user to DB here
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm">
              <img src={brandLogo} alt={BRAND_NAME} className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tighter leading-none">{BRAND_NAME}</h1>
              <span className="text-[10px] text-indigo-600 font-black uppercase tracking-[0.2em] mt-1 inline-block">Enterprise Ecosystem</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex bg-gray-100 p-1.5 rounded-[18px]">
              <button
                onClick={() => setView(AppView.FARMER)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
                  view === AppView.FARMER ? 'bg-white text-indigo-700 shadow-xl' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Smartphone size={16} />
                FARMER PORTAL
              </button>
              <button
                onClick={() => setView(AppView.ADMIN)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
                  view === AppView.ADMIN ? 'bg-white text-indigo-700 shadow-xl' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <LayoutDashboard size={16} />
                ADMIN PANEL
              </button>
            </div>
            {isAdminAuthenticated && view === AppView.ADMIN && (
              <button 
                onClick={() => setIsAdminAuthenticated(false)}
                className="flex items-center gap-2 text-red-500 font-black text-[10px] uppercase hover:bg-red-50 px-4 py-2 rounded-xl transition-all"
              >
                <Lock size={16} /> LOGOUT
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-hidden relative">
        {view === AppView.FARMER ? (
          <FarmerView 
            user={user} 
            products={products} 
            orders={orders}
            paymentModes={paymentModes}
            shippingRates={shippingRates}
            brandLogo={brandLogo}
            onLogin={handleLogin} 
            onNewOrder={handleNewOrder}
          />
        ) : (
          !isAdminAuthenticated ? (
            <div className="absolute inset-0 z-[100] flex items-center justify-center bg-gray-50/90 backdrop-blur-xl p-4">
              <div className="bg-white w-full max-sm rounded-[48px] shadow-3xl border border-gray-100 p-12 animate-in zoom-in duration-300">
                <div className="text-center mb-10">
                  <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-[32px] mx-auto flex items-center justify-center mb-6 shadow-xl shadow-indigo-100/50">
                    <Lock size={48} strokeWidth={2.5} />
                  </div>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tighter italic underline decoration-indigo-500 underline-offset-8">Admin Access</h2>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em] mt-6">Secure Personnel Authorization</p>
                </div>
                
                <form onSubmit={handleAdminLogin} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Staff Username</label>
                    <input 
                      type="text" 
                      placeholder="Admin"
                      className="w-full px-6 py-5 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-[24px] outline-none transition-all font-bold text-lg"
                      value={adminLoginForm.username}
                      onChange={e => setAdminLoginForm({...adminLoginForm, username: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Personnel Key</label>
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      className="w-full px-6 py-5 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-[24px] outline-none transition-all font-bold text-lg"
                      value={adminLoginForm.password}
                      onChange={e => setAdminLoginForm({...adminLoginForm, password: e.target.value})}
                      required
                    />
                  </div>
                  {loginError && <p className="text-red-500 text-[10px] font-black text-center mt-2 bg-red-50 p-3 rounded-2xl border border-red-100">{loginError}</p>}
                  <button type="submit" className="w-full py-6 bg-indigo-600 text-white rounded-[24px] font-black shadow-2xl shadow-indigo-200 flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all mt-8 active:scale-95 group uppercase tracking-widest text-xs">
                    Authorize Access <LogIn size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <AdminView 
              products={products} 
              orders={orders}
              shippingRates={shippingRates}
              paymentModes={paymentModes}
              brandLogo={brandLogo}
              registeredUsers={registeredUsers}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onAddProduct={handleAddProduct}
              onUpdateOrder={handleUpdateOrder}
              onUpdateShipping={setShippingRates}
              onUpdatePayments={setPaymentModes}
              onUpdateLogo={setBrandLogo}
            />
          )
        )}
      </main>
    </div>
  );
};

export default App;