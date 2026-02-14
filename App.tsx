import React, { useState, useEffect } from 'react';
import { AppView, User, Product, Order, CartItem } from './types';
import FarmerView from './components/FarmerView';
import AdminView from './components/AdminView';
import { Smartphone, LayoutDashboard, Loader2, LogOut, UserCircle } from 'lucide-react';
import { BRAND_LOGO_URL } from './constants';
import { supabase } from './services/supabaseClient';

const ADMIN_EMAIL = 'darajazb@gmail.com'; 

// --- CRITICAL: MAPPING USER_ID CORRECTLY ---
const mapOrderFromDB = (dbItem: any): Order => ({
  id: dbItem.id,
  user_id: dbItem.user_id, // <--- THIS MUST BE HERE FOR HISTORY TO WORK
  farmerName: dbItem.farmer_name || 'Guest',
  phone: dbItem.phone || '',
  email: dbItem.email || '',
  product: dbItem.product_details || 'Items',
  quantity: dbItem.quantity || 1,
  totalPrice: dbItem.total_price || 0,
  status: dbItem.status || 'Pending',
  paymentStatus: dbItem.payment_status || 'Pending',
  paymentMethod: dbItem.payment_method || 'COD',
  location: dbItem.location || '',
  district: dbItem.district || '',
  nearby: dbItem.nearby || '',
  pincode: dbItem.pincode || '',
  date: new Date(dbItem.created_at).toLocaleDateString(),
  type: dbItem.type || 'Marketplace',
  trackingId: dbItem.tracking_id,
  shippedDate: dbItem.shipped_date,
  deliveredDate: dbItem.delivered_date,
  pickupDate: dbItem.pickup_date,
  deliveryDate: dbItem.delivery_date,
  rejectionReason: dbItem.rejection_reason,
  returnReason: dbItem.return_reason,
  userRating: dbItem.user_rating,
  userReview: dbItem.user_review
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
  brand: dbItem.brand || 'Generic',
  rating: dbItem.rating || 5,
  reviews: dbItem.reviews || 0,
  inStock: dbItem.in_stock,
  stockCount: dbItem.stock_count
});

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.FARMER);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [user, setUser] = useState<User>({ name: '', email: '', phone: '', address: '', isLoggedIn: false });
  const [loading, setLoading] = useState(true);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [brandLogo, setBrandLogo] = useState<string>(BRAND_LOGO_URL);
  
  const [shippingRates, setShippingRates] = useState([{ region: 'Srinagar', rate: 50 }, { region: 'Sopore', rate: 80 }]);
  const [paymentModes, setPaymentModes] = useState([{ id: 'cod', label: 'Cash on Delivery', active: true }]);

  useEffect(() => {
    const init = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            await handleSession(session);
            await fetchData();
            supabase.auth.onAuthStateChange((_event, session) => handleSession(session));
            
            const channel = supabase.channel('db-changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchData)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchData)
                .subscribe();
            return () => { supabase.removeChannel(channel); };
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    init();
  }, []);

  const handleSession = async (session: any) => {
    if (!session) {
      setUser({ name: '', email: '', phone: '', address: '', isLoggedIn: false });
      setIsAdminAuthenticated(false);
      setView(AppView.FARMER);
      return;
    }
    const isAdmin = session.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    setIsAdminAuthenticated(isAdmin);
    if (isAdmin) setView(AppView.ADMIN);
    else if (view === AppView.ADMIN) setView(AppView.FARMER);

    // Get Profile or default to Meta Data
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    setUser({
      id: session.user.id, // Ensure ID is set
      name: profile?.full_name || session.user.user_metadata?.full_name || 'Farmer',
      email: session.user.email,
      phone: profile?.phone || '',
      address: profile?.address || '',
      isLoggedIn: true
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload(); 
  };

  const fetchData = async () => {
    const { data: pData } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (pData) setProducts(pData.map(mapProductFromDB));
    const { data: oData } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (oData) setOrders(oData.map(mapOrderFromDB));
  };

  const handleNewOrder = async (newOrder: Order, cartItems: CartItem[]) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return alert("Please log in first.");
    
    setOrders(prev => [newOrder, ...prev]);
    
    // SAVE TO CLOUD WITH USER ID
    const { error } = await supabase.from('orders').insert([{
      id: newOrder.id, 
      user_id: authUser.id, 
      farmer_name: newOrder.farmerName,
      phone: newOrder.phone, 
      email: newOrder.email, 
      product_details: newOrder.product, 
      quantity: newOrder.quantity, 
      total_price: newOrder.totalPrice, 
      status: newOrder.status, 
      payment_status: newOrder.paymentStatus, 
      payment_method: newOrder.paymentMethod, 
      location: newOrder.location, 
      district: newOrder.district, 
      nearby: newOrder.nearby, 
      pincode: newOrder.pincode, 
      type: newOrder.type
    }]);

    if(error) console.error("Order Save Error:", error);
    else {
        for (const item of cartItems) {
            await supabase.from('products').update({ 
                stock_count: Math.max(0, item.stockCount - item.quantity), 
                in_stock: (item.stockCount - item.quantity) > 0 
            }).eq('id', item.id);
        }
        fetchData();
    }
  };

  const handleUpdateOrder = async (updatedOrder: Order) => {
     setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
     await supabase.from('orders').update({ 
         status: updatedOrder.status, payment_status: updatedOrder.paymentStatus, 
         tracking_id: updatedOrder.trackingId, shipped_date: updatedOrder.shippedDate, 
         delivered_date: updatedOrder.deliveredDate, pickup_date: updatedOrder.pickupDate,
         delivery_date: updatedOrder.deliveryDate, rejection_reason: updatedOrder.rejectionReason,
         return_reason: updatedOrder.returnReason, user_rating: updatedOrder.userRating,
         user_review: updatedOrder.userReview
     }).eq('id', updatedOrder.id);
  };

  const handleDeleteOrder = async (id: string) => {
      setOrders(prev => prev.filter(o => o.id !== id));
      await supabase.from('orders').delete().eq('id', id);
  };

  const handleClearHistory = async () => {
      const completedStatuses = ['Delivered', 'Cancelled', 'Refunded', 'Rejected'];
      setOrders(prev => prev.filter(o => !completedStatuses.includes(o.status)));
      await supabase.from('orders').delete().in('status', completedStatuses);
  };

  const handleAddProduct = async (p: Product) => { 
      await supabase.from('products').insert([{ 
          id: p.id || `p-${Date.now()}`, name: p.name, price: p.price, discount: p.discount, 
          category: p.category, image: p.image, description: p.description, brand: p.brand,
          stock_count: p.stockCount, unit: p.unit, rating: p.rating, reviews: p.reviews, in_stock: p.stockCount > 0
      }]);
      fetchData();
  };
  
  const handleUpdateProduct = async (p: Product) => { 
      await supabase.from('products').update({ 
          name: p.name, price: p.price, discount: p.discount, stock_count: p.stockCount, 
          category: p.category, description: p.description, image: p.image, unit: p.unit,
          rating: p.rating, reviews: p.reviews, brand: p.brand, in_stock: p.stockCount > 0
      }).eq('id', p.id);
      fetchData();
  };
  
  const handleDeleteProduct = async (id: string) => { 
      await supabase.from('products').delete().eq('id', id); 
      fetchData();
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-green-600"/></div>;

  if (view === AppView.ADMIN && isAdminAuthenticated) {
      return (
        <div className="w-full h-screen bg-gray-50 overflow-hidden flex flex-col font-sans">
            <div className="bg-white border-b p-3 px-6 flex justify-between items-center shadow-sm shrink-0 z-50">
                <h1 className="text-xl font-black text-indigo-900 flex items-center gap-2"><LayoutDashboard/> Admin Portal</h1>
                <div className="flex gap-3">
                    <button onClick={() => setView(AppView.FARMER)} className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-bold hover:bg-gray-50"><Smartphone size={18} /> Farmer View</button>
                    <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100"><LogOut size={18} /> Logout</button>
                </div>
            </div>
            <div className="flex-1 overflow-hidden relative">
                <AdminView 
                    products={products} orders={orders} shippingRates={shippingRates} 
                    paymentModes={paymentModes} brandLogo={brandLogo} registeredUsers={[user]} 
                    onUpdateProduct={handleUpdateProduct} onDeleteProduct={handleDeleteProduct} 
                    onAddProduct={handleAddProduct} onUpdateOrder={handleUpdateOrder} 
                    onUpdateShipping={setShippingRates} onUpdatePayments={setPaymentModes} 
                    onUpdateLogo={setBrandLogo} 
                    onDeleteOrder={handleDeleteOrder} onClearHistory={handleClearHistory}
                />
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-200 md:flex md:justify-center md:items-center p-0 md:p-4 font-sans">
      <div className="w-full md:w-[480px] h-[100dvh] md:h-[850px] bg-white md:rounded-3xl shadow-2xl overflow-hidden flex flex-col relative border-x border-gray-300">
          
          <div className="bg-white border-b p-3 flex justify-between items-center z-50 shadow-sm shrink-0">
            <div className="flex items-center gap-2">
                <UserCircle className="text-green-600" size={24} />
                <span className="font-bold text-gray-800 text-sm truncate max-w-[150px]">
                    {user.isLoggedIn ? `Hi, ${user.name.split(' ')[0]}` : 'Soilify App'}
                </span>
            </div>
            
            {isAdminAuthenticated && (
                <button onClick={() => setView(AppView.ADMIN)} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200">
                <LayoutDashboard size={14} /> Admin
                </button>
            )}
          </div>

          <main className="flex-1 relative overflow-hidden flex flex-col">
              <FarmerView 
                  user={user} products={products} orders={orders} 
                  brandLogo={brandLogo} paymentModes={paymentModes} shippingRates={shippingRates} 
                  onLogin={()=>{}} onNewOrder={handleNewOrder} 
                  onUpdateOrder={handleUpdateOrder} onLogout={handleLogout}
                  onDeleteOrder={handleDeleteOrder} onClearHistory={handleClearHistory}
                  razorpayKey="rzp_test_1DP5mmOlF5G5ag"
              />
          </main>
      </div>
    </div>
  );
};

export default App;