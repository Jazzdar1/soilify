import React, { useState, useEffect } from 'react';
import { AppView, User, Product, Order, CartItem } from './types';
import FarmerView from './components/FarmerView';
import AdminView from './components/AdminView';
import { Smartphone, LayoutDashboard, Loader2, LogOut } from 'lucide-react';
import { BRAND_LOGO_URL } from './constants';
import { supabase } from './services/supabaseClient';

// --- DATA MAPPERS (CRITICAL: Ensures all Cloud Data is read correctly) ---
const mapOrderFromDB = (dbItem: any): Order => ({
  id: dbItem.id,
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
  // --- STATE MANAGEMENT ---
  const [view, setView] = useState<AppView>(AppView.FARMER);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [user, setUser] = useState<User>({ name: '', email: '', phone: '', address: '', isLoggedIn: false });
  const [loading, setLoading] = useState(true);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [brandLogo, setBrandLogo] = useState<string>(BRAND_LOGO_URL);
  
  const [shippingRates, setShippingRates] = useState([
    { region: 'Srinagar', rate: 50 }, 
    { region: 'Sopore', rate: 80 },
    { region: 'Anantnag', rate: 90 },
    { region: 'Baramulla', rate: 80 },
    { region: 'Pulwama', rate: 70 }
  ]);
  
  const [paymentModes, setPaymentModes] = useState([{ id: 'cod', label: 'Cash on Delivery', active: true }]);

  // --- INITIALIZATION ---
  useEffect(() => {
    const init = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            await handleSession(session);
            await fetchData();
            
            // Realtime Listeners
            const changes = supabase.channel('db-changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchData)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchData)
                .subscribe();
                
            return () => { supabase.removeChannel(changes); };
        } catch (e) { 
            console.error("Init Error:", e); 
        } finally { 
            setLoading(false); 
        }
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

    const isAdmin = session.user.email?.toLowerCase() === 'darajazb@gmail.com';
    setIsAdminAuthenticated(isAdmin);
    if (!isAdmin && view === AppView.ADMIN) setView(AppView.FARMER);

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
    await supabase.auth.signOut();
    setUser({ name: '', email: '', phone: '', address: '', isLoggedIn: false });
    setIsAdminAuthenticated(false);
    setView(AppView.FARMER);
  };

  const fetchData = async () => {
    const { data: pData } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (pData) setProducts(pData.map(mapProductFromDB));
    
    const { data: oData } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (oData) setOrders(oData.map(mapOrderFromDB));
  };

  // --- ORDER HANDLERS ---
  const handleNewOrder = async (newOrder: Order, cartItems: CartItem[]) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return alert("Please log in first.");
    
    // 1. Optimistic Update
    setOrders(prev => [newOrder, ...prev]);
    
    // 2. Save to Cloud (CRITICAL: Includes user_id for RLS visibility)
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
      pincode: newOrder.pincode || '', 
      type: newOrder.type
    }]);

    if(error) {
        console.error("Order Insert Error:", error);
        alert("Error saving order. Please check your connection.");
    } else {
        // 3. Update Stock
        for (const item of cartItems) {
            const newStock = Math.max(0, item.stockCount - item.quantity);
            await supabase.from('products').update({ 
                stock_count: newStock, 
                in_stock: newStock > 0 
            }).eq('id', item.id);
        }
        // Force refresh to ensure ID sync
        fetchData();
    }
  };

  const handleUpdateOrder = async (updatedOrder: Order) => {
     setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
     
     await supabase.from('orders').update({ 
         status: updatedOrder.status, 
         payment_status: updatedOrder.paymentStatus, 
         tracking_id: updatedOrder.trackingId, 
         shipped_date: updatedOrder.shippedDate, 
         delivered_date: updatedOrder.deliveredDate, 
         pickup_date: updatedOrder.pickupDate,
         delivery_date: updatedOrder.deliveryDate, 
         rejection_reason: updatedOrder.rejectionReason,
         return_reason: updatedOrder.returnReason,
         user_rating: updatedOrder.userRating,
         user_review: updatedOrder.userReview
     }).eq('id', updatedOrder.id);
  };

  const handleDeleteOrder = async (id: string) => {
      // Optimistic delete
      setOrders(prev => prev.filter(o => o.id !== id));
      
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (error) {
          console.error("Delete failed:", error);
          alert("Could not delete from cloud. Permission denied or network error.");
          fetchData(); // Revert on failure
      }
  };

  const handleClearHistory = async () => {
      const completedStatuses = ['Delivered', 'Cancelled', 'Refunded', 'Rejected'];
      
      // Optimistic delete
      setOrders(prev => prev.filter(o => !completedStatuses.includes(o.status)));
      
      const { error } = await supabase.from('orders').delete().in('status', completedStatuses);
      if (error) {
          console.error("Clear History failed:", error);
          alert("Could not clear history.");
          fetchData(); // Revert
      }
  };

  // --- PRODUCT HANDLERS ---
  const handleAddProduct = async (p: Product) => { 
      const { error } = await supabase.from('products').insert([{ 
          id: p.id || `p-${Date.now()}`, name: p.name, price: p.price, discount: p.discount, 
          category: p.category, image: p.image, description: p.description, brand: p.brand,
          stock_count: p.stockCount, unit: p.unit, rating: p.rating, reviews: p.reviews,
          in_stock: p.stockCount > 0
      }]);
      if (error) console.error("Add Product Error:", error);
      else fetchData();
  };
  
  const handleUpdateProduct = async (p: Product) => { 
      const { error } = await supabase.from('products').update({ 
          name: p.name, price: p.price, discount: p.discount, stock_count: p.stockCount, 
          category: p.category, description: p.description, image: p.image, unit: p.unit,
          rating: p.rating, reviews: p.reviews, brand: p.brand,
          in_stock: p.stockCount > 0
      }).eq('id', p.id);
      if (error) console.error("Update Product Error:", error);
      else fetchData();
  };
  
  const handleDeleteProduct = async (id: string) => { 
      const { error } = await supabase.from('products').delete().eq('id', id); 
      if (error) console.error("Delete Product Error:", error);
      else fetchData();
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-green-600"/></div>;

  // --- ADMIN VIEW (Full Screen) ---
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

  // --- FARMER VIEW (Phone Frame) ---
  return (
    <div className="min-h-screen bg-gray-200 flex justify-center items-center p-0 sm:p-4 font-sans">
      <div className="w-full max-w-[480px] h-[100dvh] sm:h-[850px] bg-white sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col relative border-x border-gray-300">
          <div className="bg-white border-b p-2 flex justify-center gap-2 z-50 shadow-sm shrink-0">
            <button onClick={() => setView(AppView.FARMER)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-green-600 text-white shadow-md"><Smartphone size={18} /> Farmer App</button>
            {isAdminAuthenticated && (
                <button onClick={() => setView(AppView.ADMIN)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-gray-500 hover:bg-gray-100"><LayoutDashboard size={18} /> Admin</button>
            )}
          </div>
          <main className="flex-1 relative overflow-hidden flex flex-col">
              <FarmerView 
                  user={user} products={products} orders={orders} 
                  brandLogo={brandLogo} paymentModes={paymentModes} shippingRates={shippingRates} 
                  onLogin={()=>{}} onNewOrder={handleNewOrder} 
                  onUpdateOrder={handleUpdateOrder} onLogout={handleLogout}
                  onDeleteOrder={handleDeleteOrder} onClearHistory={handleClearHistory}
              />
          </main>
      </div>
    </div>
  );
};

export default App;