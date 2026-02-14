import React, { useState, useEffect } from 'react';
import { AppView, User, Product, Order } from './types';
import FarmerView from './components/FarmerView';
import AdminView from './components/AdminView';
import { Smartphone, LayoutDashboard, Loader2, LogOut } from 'lucide-react';
import { BRAND_LOGO_URL } from './constants';
import { supabase } from './services/supabaseClient';

// --- DATA MAPPERS ---
const mapOrderFromDB = (dbItem: any): Order => ({
  id: dbItem.id,
  farmerName: dbItem.farmer_name || 'Guest',
  phone: dbItem.phone || '',
  product: dbItem.product_details || 'Items',
  quantity: dbItem.quantity || 1,
  totalPrice: dbItem.total_price || 0,
  status: dbItem.status || 'Pending',
  paymentStatus: dbItem.payment_status || 'Pending',
  paymentMethod: dbItem.payment_method || 'COD',
  location: dbItem.location || '',
  date: new Date(dbItem.created_at).toLocaleDateString(),
  type: dbItem.type || 'Marketplace',
  trackingId: dbItem.tracking_id,
  shippedDate: dbItem.shipped_date,
  deliveredDate: dbItem.delivered_date,
  rejectionReason: dbItem.rejection_reason
});

const mapProductFromDB = (dbItem: any): Product => ({
  id: dbItem.id,
  name: dbItem.name,
  price: dbItem.price,
  discount: dbItem.discount || 0,
  unit: dbItem.unit || 'Kg',
  category: dbItem.category || 'General',
  image: dbItem.image || 'https://placehold.co/400',
  description: dbItem.description || '',
  rating: dbItem.rating || 5,
  reviews: dbItem.reviews || 0,
  inStock: dbItem.in_stock,
  stockCount: dbItem.stock_count
});

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.FARMER);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [user, setUser] = useState<User>({ name: '', email: '', phone: '', isLoggedIn: false });
  const [loading, setLoading] = useState(true);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [brandLogo, setBrandLogo] = useState<string>(BRAND_LOGO_URL);
  const [shippingRates, setShippingRates] = useState([{ region: 'Srinagar', rate: 0 }]);
  const [paymentModes, setPaymentModes] = useState([{ id: 'cod', label: 'Cash on Delivery', active: true }]);

  useEffect(() => {
    const safetyTimer = setTimeout(() => setLoading(false), 3000);

    const init = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            await handleSession(session);
            await fetchData();
            
            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => handleSession(session));
            return subscription;
        } catch (e) {
            console.error("Init failed:", e);
        } finally {
            setLoading(false);
            clearTimeout(safetyTimer);
        }
    };

    init();
    
    // Realtime listeners
    const orderSub = supabase.channel('orders-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchData).subscribe();
    const prodSub = supabase.channel('products-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchData).subscribe();

    return () => { supabase.removeAllChannels(); };
  }, []);

  const handleSession = async (session: any) => {
    if (!session) {
      setUser({ name: '', email: '', phone: '', isLoggedIn: false });
      setIsAdminAuthenticated(false);
      // Force back to Farmer view if logged out
      setView(AppView.FARMER);
      return;
    }

    // STRICT ADMIN CHECK: Only show admin features for this email
    const isAdmin = session.user.email?.toLowerCase() === 'darajazb@gmail.com';
    setIsAdminAuthenticated(isAdmin);

    // If a non-admin somehow gets to the admin view, kick them out
    if (!isAdmin && view === AppView.ADMIN) {
        setView(AppView.FARMER);
    }

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    
    setUser({
      name: profile?.full_name || session.user.user_metadata?.full_name || 'Farmer',
      email: session.user.email,
      phone: profile?.phone || '',
      address: profile?.address || '',
      isLoggedIn: true
    });
  };

  const handleLogout = async () => {
    setUser({ name: '', email: '', phone: '', isLoggedIn: false });
    setIsAdminAuthenticated(false);
    setView(AppView.FARMER);
    await supabase.auth.signOut();
  };

  const fetchData = async () => {
    const { data: pData } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (pData) setProducts(pData.map(mapProductFromDB));
    
    const { data: oData } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (oData) setOrders(oData.map(mapOrderFromDB));
  };

  // --- HANDLERS ---
  const handleNewOrder = async (newOrder: Order) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return alert("Please log in first.");
    setOrders(prev => [newOrder, ...prev]);
    const { error } = await supabase.from('orders').insert([{
      id: newOrder.id, user_id: authUser.id, farmer_name: newOrder.farmerName,
      phone: newOrder.phone, product_details: newOrder.product, quantity: newOrder.quantity,
      total_price: newOrder.totalPrice, status: newOrder.status, payment_status: newOrder.paymentStatus,
      payment_method: newOrder.paymentMethod, location: newOrder.location, type: newOrder.type
    }]);
    if (error) { console.error(error); alert("Failed to save order."); fetchData(); }
  };

  const handleUpdateOrder = async (updatedOrder: Order) => {
     setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
     await supabase.from('orders').update({ 
         status: updatedOrder.status, payment_status: updatedOrder.paymentStatus, 
         tracking_id: updatedOrder.trackingId, shipped_date: updatedOrder.shippedDate, 
         delivered_date: updatedOrder.deliveredDate, rejection_reason: updatedOrder.rejectionReason 
     }).eq('id', updatedOrder.id);
  };

  const handleAddProduct = async (p: Product) => { 
      setProducts(prev => [p, ...prev]);
      await supabase.from('products').insert([{ id: p.id || `p-${Date.now()}`, name: p.name, price: p.price, discount: p.discount, category: p.category, image: p.image, description: p.description, stock_count: p.stockCount, unit: p.unit }]); 
  };
  
  const handleUpdateProduct = async (p: Product) => { 
      setProducts(prev => prev.map(prod => prod.id === p.id ? p : prod));
      await supabase.from('products').update({ name: p.name, price: p.price, discount: p.discount, stock_count: p.stockCount, category: p.category, description: p.description, image: p.image, unit: p.unit }).eq('id', p.id); 
  };
  
  const handleDeleteProduct = async (id: string) => { 
      setProducts(prev => prev.filter(p => p.id !== id));
      await supabase.from('products').delete().eq('id', id); 
  };
  
  const handleUpdateShipping = (r: any[]) => setShippingRates(r);
  const handleUpdatePayments = (p: any[]) => setPaymentModes(p);
  const handleUpdateLogo = (l: string) => setBrandLogo(l);

  if (loading) {
      return (
          <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50">
             <Loader2 size={48} className="text-green-600 animate-spin mb-4" />
             <p className="text-gray-500 font-bold animate-pulse">Loading Soilify...</p>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-200 flex justify-center items-center p-0 sm:p-4 font-sans">
      <div className="w-full max-w-[480px] h-[100dvh] sm:h-[850px] bg-white sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col relative border-x border-gray-300">
          
          {/* HEADER SWITCHER */}
          <div className="bg-white border-b p-2 flex justify-center gap-2 z-50 shadow-sm shrink-0">
            <button onClick={() => setView(AppView.FARMER)} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${view === AppView.FARMER ? 'bg-green-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>
              <Smartphone size={18} /> Farmer App
            </button>
            
            {/* SECURE: Only show Admin Button if Authenticated as Admin */}
            {isAdminAuthenticated && (
                <button onClick={() => setView(AppView.ADMIN)} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${view === AppView.ADMIN ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>
                <LayoutDashboard size={18} /> Admin Panel
                </button>
            )}
          </div>

          {/* MAIN CONTENT */}
          <main className="flex-1 relative overflow-hidden flex flex-col">
            {view === AppView.FARMER ? (
              <FarmerView 
                  user={user} products={products} orders={orders} 
                  brandLogo={brandLogo} paymentModes={paymentModes} shippingRates={shippingRates} 
                  onLogin={()=>{}} 
                  onNewOrder={handleNewOrder} 
                  onUpdateOrder={handleUpdateOrder} 
                  onLogout={handleLogout} 
              />
            ) : (
                // Only render AdminView if authenticated (Double Protection)
                isAdminAuthenticated ? (
                    <AdminView 
                        products={products} orders={orders} shippingRates={shippingRates} 
                        paymentModes={paymentModes} brandLogo={brandLogo} registeredUsers={[user]} 
                        onUpdateProduct={handleUpdateProduct} onDeleteProduct={handleDeleteProduct} 
                        onAddProduct={handleAddProduct} onUpdateOrder={handleUpdateOrder} 
                        onUpdateShipping={handleUpdateShipping} onUpdatePayments={handleUpdatePayments} 
                        onUpdateLogo={handleUpdateLogo} 
                    />
                ) : null
            )}
          </main>
      </div>
    </div>
  );
};

export default App;