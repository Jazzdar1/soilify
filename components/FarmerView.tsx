import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShoppingBag, Search, Home, MessageSquare, 
  User as UserIcon, Star, X, CheckCircle2,
  Check, ChevronLeft, Heart, Share2, MapPin, 
  ShieldCheck, Printer
} from 'lucide-react';
import { CATEGORIES, BRAND_NAME } from '../constants';
import { FarmerTab, Product, CartItem, User, Order } from '../types';
import WhatsAppSimulator from './WhatsAppSimulator';
import { supabase } from '../services/supabaseClient';

const MOCK_REVIEWS = [
  { user: "Bilal A.", rating: 5, date: "12 Feb 2026", text: "Excellent quality seeds. Germination rate is very high in Pulwama soil." },
  { user: "Waseem K.", rating: 4, date: "10 Feb 2026", text: "Good product but delivery took 1 day extra to Sopore." },
  { user: "Ishfaq M.", rating: 5, date: "05 Feb 2026", text: "Original product. Works exactly as described for apple trees." },
];

interface FarmerViewProps {
  user: User;
  products: Product[];
  orders: Order[];
  brandLogo: string;
  paymentModes: any[];
  shippingRates: any[];
  onLogin: (user: User) => void;
  onNewOrder: (order: Order) => void;
  onUpdateOrder: (order: Order) => void;
  onLogout: () => void;
}

const FarmerView: React.FC<FarmerViewProps> = ({ 
  user, products, orders, brandLogo, onNewOrder, onUpdateOrder, onLogout 
}) => {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState<FarmerTab>(FarmerTab.SHOP);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Navigation & Modals
  const [showCart, setShowCart] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Order Management
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);

  // Checkout State
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'details' | 'payment' | 'success'>('cart');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'upi' | 'card'>('cod');
  
  // Forms
  const [authForm, setAuthForm] = useState({ name: '', email: '', phone: '', address: '', password: '' });
  const [isSignUp, setIsSignUp] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  
  const [checkoutForm, setCheckoutForm] = useState({ 
    name: user.name || '', email: user.email || '',
    phone: user.phone || '', address: user.address || '',
    pincode: '190001', city: 'Srinagar'
  });

  const [toast, setToast] = useState<{message: string, show: boolean}>({ message: '', show: false });

  // --- LOGIC ---
  const filteredProducts = useMemo(() => {
    return products.filter(p => (selectedCategory === 'All' || p.category === selectedCategory) && p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [products, selectedCategory, searchQuery]);

  const similarProducts = useMemo(() => {
    if (!selectedProduct) return [];
    return products.filter(p => p.category === selectedProduct.category && p.id !== selectedProduct.id).slice(0, 4);
  }, [selectedProduct, products]);

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cart]);

  useEffect(() => {
    if (user.isLoggedIn) {
      setCheckoutForm(prev => ({ ...prev, name: user.name, email: user.email, phone: user.phone, address: user.address || '' }));
    }
  }, [user]);

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast(prev => ({ ...prev, show: false })), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  // --- HANDLERS ---
  const showToast = (msg: string) => setToast({ message: msg, show: true });

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
        if (isSignUp) {
            const forbidden = ['tempmail', 'mailinator', '10minutemail', 'yopmail'];
            if (forbidden.some(d => authForm.email.includes(d))) throw new Error("Please use a valid email address.");
            
            const { data, error } = await supabase.auth.signUp({
                email: authForm.email, password: authForm.password,
                options: { data: { full_name: authForm.name } }
            });
            if (error) throw error;
            if (data.user) {
                await supabase.from('profiles').upsert({ id: data.user.id, full_name: authForm.name, phone: authForm.phone, address: authForm.address, role: 'farmer' });
                alert("Account created! Logging you in...");
                window.location.reload(); 
            }
        } else {
            const { error } = await supabase.auth.signInWithPassword({ email: authForm.email, password: authForm.password });
            if (error) throw error;
        }
    } catch (err: any) { alert(err.message); } 
    finally { setAuthLoading(false); }
  };

  const addToCart = (product: Product, openCart = false) => {
    if (!user.isLoggedIn) return setActiveTab(FarmerTab.ORDERS);
    
    setCart(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) return prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
      return [...prev, { ...product, quantity: 1 }];
    });

    if (openCart) {
        setShowCart(true);
        setCheckoutStep('cart');
    } else {
        showToast("Added to Cart");
    }
  };

  const handlePlaceOrder = () => {
    const newOrder: Order = {
      id: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
      farmerName: checkoutForm.name,
      phone: checkoutForm.phone,
      product: cart.map(i => `${i.name} (x${i.quantity})`).join(', '),
      quantity: cart.reduce((s, i) => s + i.quantity, 0),
      totalPrice: cartTotal,
      status: 'Pending',
      paymentStatus: paymentMethod === 'cod' ? 'Awaiting' : 'Paid',
      paymentMethod: paymentMethod === 'cod' ? 'COD' : paymentMethod === 'upi' ? 'UPI' : 'Credit Card',
      location: `${checkoutForm.address}, ${checkoutForm.city} - ${checkoutForm.pincode}`,
      date: new Date().toLocaleDateString(),
      type: 'Marketplace'
    };
    
    onNewOrder(newOrder);
    setCheckoutStep('success');
    setCart([]);
  };

  const handleCancelOrder = async (order: Order) => {
      if (!window.confirm("Are you sure you want to cancel this order?")) return;
      const updatedOrder = { ...order, status: 'Cancelled', rejectionReason: 'Cancelled by User' };
      onUpdateOrder(updatedOrder);
      const { error } = await supabase.from('orders').update({ status: 'Cancelled', rejection_reason: 'Cancelled by User' }).eq('id', order.id);
      if (error) { alert("Failed to cancel: " + error.message); } else { showToast("Order Cancelled"); }
  };

  const StarRating = ({ rating, count, size=14 }: { rating: number, count?: number, size?: number }) => (
    <div className="flex items-center gap-1">
      <div className="flex text-[#F4A608]">
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={size} fill={i < Math.floor(rating) ? "currentColor" : "none"} className={i < Math.floor(rating) ? "" : "text-gray-300"} />
        ))}
      </div>
      {count !== undefined && <span className="text-[#007185] text-xs font-medium ml-1">{count} ratings</span>}
    </div>
  );

  return (
    <div className="h-full bg-[#E3E6E6] flex flex-col relative w-full shadow-2xl overflow-hidden font-sans">
      
      {/* HEADER */}
      {!selectedProduct && !showCart && activeTab === FarmerTab.SHOP && (
        <header className="bg-[#232f3e] p-3 pb-4 sticky top-0 z-40 text-white shadow-md">
          <div className="flex justify-between items-center mb-3">
            <span className="font-black text-xl italic tracking-tighter">soilify<span className="text-[#FF9900]">.in</span></span>
            <div className="relative cursor-pointer" onClick={() => user.isLoggedIn ? setShowCart(true) : setActiveTab(FarmerTab.ORDERS)}>
              <ShoppingBag size={24} />
              {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-[#FF9900] text-[#232f3e] text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold border border-white">{cart.length}</span>}
            </div>
          </div>
          <div className="flex bg-white rounded-lg overflow-hidden h-10 items-center shadow-inner">
            <div className="pl-3 text-gray-500"><Search size={18} /></div>
            <input className="w-full pl-2 pr-4 h-full border-none text-black text-sm outline-none" placeholder="Search seeds, tools..." onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </header>
      )}

      {/* MAIN CONTENT AREA - Padding bottom ensures content isn't hidden behind nav */}
      <div className="flex-1 overflow-y-auto no-scrollbar bg-white pb-24">
        
        {/* SHOP TAB */}
        {activeTab === FarmerTab.SHOP && (
          <div className="bg-[#E3E6E6] min-h-full pb-2">
             <div className="bg-white p-3 flex gap-3 overflow-x-auto no-scrollbar border-b sticky top-0 z-30 shadow-sm">
              <button onClick={() => setSelectedCategory('All')} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap ${selectedCategory === 'All' ? 'bg-[#232f3e] text-white' : 'bg-gray-100 text-gray-700'}`}>All</button>
              {CATEGORIES.filter(c => c !== 'All').map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap ${selectedCategory === cat ? 'bg-[#232f3e] text-white' : 'bg-gray-100 text-gray-700'}`}>{cat}</button>
              ))}
            </div>
            
            <div className="grid grid-cols-2 gap-1 p-2">
              {filteredProducts.map(product => (
                <div key={product.id} onClick={() => setSelectedProduct(product)} className="bg-white p-3 flex flex-col active:scale-[0.98] transition-all border border-transparent hover:border-gray-200 rounded-sm">
                  <div className="h-40 bg-gray-50 mb-2 flex items-center justify-center rounded-md p-2 relative">
                    <img src={product.image} className="max-h-full max-w-full object-contain mix-blend-multiply" />
                    {product.discount > 0 && <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">-{product.discount}%</span>}
                  </div>
                  <h4 className="text-xs font-normal text-gray-900 leading-snug line-clamp-2 h-9 mb-1">{product.name}</h4>
                  <StarRating rating={product.rating} count={product.reviews} />
                  <div className="mt-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs font-normal">₹</span>
                      <span className="text-lg font-medium text-gray-900">{product.price}</span>
                      {product.discount > 0 && <span className="text-xs text-gray-400 line-through">₹{Math.floor(product.price * 1.2)}</span>}
                    </div>
                    <p className="text-[10px] text-green-700 font-bold mt-1">FREE Delivery by Tomorrow</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === FarmerTab.ORDERS && (
           !user.isLoggedIn ? (
             <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
                <h2 className="text-2xl font-bold mb-6">{isSignUp ? 'Create Account' : 'Sign In'}</h2>
                <form onSubmit={handleAuthSubmit} className="w-full space-y-4">
                    {isSignUp && (
                        <>
                           <input className="w-full p-3 border rounded-lg" placeholder="Full Name" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} required />
                           <input className="w-full p-3 border rounded-lg" placeholder="Phone" value={authForm.phone} onChange={e => setAuthForm({...authForm, phone: e.target.value})} required />
                           <input className="w-full p-3 border rounded-lg" placeholder="Address" value={authForm.address} onChange={e => setAuthForm({...authForm, address: e.target.value})} required />
                        </>
                    )}
                    <input type="email" className="w-full p-3 border rounded-lg" placeholder="Email" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} required />
                    <input type="password" className="w-full p-3 border rounded-lg" placeholder="Password" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} required />
                    <button disabled={authLoading} className="w-full py-3 bg-[#FFD814] rounded-lg font-bold border border-[#FCD200]">
                        {authLoading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
                    </button>
                </form>
                <button onClick={() => setIsSignUp(!isSignUp)} className="mt-6 text-blue-600 text-sm font-bold">
                    {isSignUp ? 'Already have an account? Sign In' : 'New to Soilify? Create Account'}
                </button>
             </div>
           ) : (
             <div className="bg-gray-100 min-h-full">
                <div className="bg-white p-4 border-b flex justify-between items-center sticky top-0">
                    <h2 className="text-lg font-bold">Your Account</h2>
                    <button onClick={onLogout} className="text-red-600 text-xs font-bold px-3 py-1 bg-red-50 rounded border border-red-100">Sign Out</button>
                </div>
                <div className="p-4 space-y-4">
                    <h3 className="font-bold text-gray-900">Your Orders</h3>
                    {orders.map(o => (
                        <div key={o.id} className="bg-white p-4 rounded-lg shadow-sm border">
                            <div className="flex justify-between items-start mb-2">
                                <div><h4 className="font-bold text-sm text-[#007185] line-clamp-1">{o.product}</h4><p className="text-[10px] text-gray-400">Ordered on {o.date}</p></div>
                                <div className="text-right"><span className={`px-2 py-1 rounded font-bold text-xs ${o.status==='Pending'?'bg-orange-100 text-orange-700': o.status === 'Cancelled' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{o.status}</span></div>
                            </div>
                            <div className="flex gap-2 mt-4">
                                <button onClick={() => setTrackingOrder(o)} className="flex-1 py-2 bg-[#FFD814] rounded-lg text-xs font-bold border border-[#FCD200]">Track</button>
                                <button onClick={() => setInvoiceOrder(o)} className="flex-1 py-2 bg-white rounded-lg text-xs font-bold border border-gray-300 shadow-sm">Invoice</button>
                                {o.status === 'Pending' && (<button onClick={() => handleCancelOrder(o)} className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold border border-red-200">Cancel</button>)}
                            </div>
                        </div>
                    ))}
                    {orders.length === 0 && <p className="text-center text-gray-500 mt-10">No orders found.</p>}
                </div>
             </div>
           )
        )}

        {/* EXPERT TAB */}
        {activeTab === FarmerTab.WHATSAPP && <WhatsAppSimulator brandLogo={brandLogo} user={user} products={products} orders={orders} onNewOrder={onNewOrder} onUpdateOrder={onUpdateOrder} />}
      </div>

      {/* --- PRODUCT DETAIL PAGE --- */}
      {selectedProduct && (
        <div className="absolute inset-0 z-50 bg-white overflow-y-auto animate-in slide-in-from-right duration-200">
           <div className="bg-[#232f3e]/95 backdrop-blur-sm p-3 text-white flex items-center justify-between sticky top-0 z-10">
              <button onClick={() => setSelectedProduct(null)}><ChevronLeft size={26} /></button>
              <div className="flex gap-4">
                 <Heart size={22} />
                 <Share2 size={22} />
                 <div className="relative" onClick={() => user.isLoggedIn ? setShowCart(true) : setActiveTab(FarmerTab.ORDERS)}>
                   <ShoppingBag size={22} />
                   {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-[#FF9900] text-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{cart.length}</span>}
                 </div>
              </div>
           </div>
           {/* Details... */}
           <div className="pb-24">
              <div className="p-3 border-b">
                 <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] text-[#007185] font-bold uppercase">{selectedProduct.category}</span>
                    <StarRating rating={selectedProduct.rating} count={selectedProduct.reviews || 42} />
                 </div>
                 <h1 className="text-sm font-normal text-gray-900 leading-snug">{selectedProduct.name}</h1>
              </div>
              <div className="py-8 border-b bg-white flex justify-center relative">
                 <div className="absolute top-2 left-3 bg-[#C70039] text-white text-[10px] font-bold w-10 h-10 rounded-full flex items-center justify-center text-center shadow-md leading-tight">{selectedProduct.discount > 0 ? selectedProduct.discount : 15}%<br/>OFF</div>
                 <img src={selectedProduct.image} className="h-64 object-contain mix-blend-multiply" />
              </div>
              <div className="p-4 border-b space-y-2">
                 <div className="flex items-baseline gap-1"><span className="text-xs font-normal align-top mt-1">₹</span><span className="text-3xl font-medium text-gray-900">{selectedProduct.price}</span><span className="text-xs text-gray-500 line-through ml-2">M.R.P.: ₹{Math.floor(selectedProduct.price * 1.2)}</span></div>
                 <p className="text-sm text-[#007600] font-bold">In stock</p>
                 <div className="text-sm"><span className="text-gray-500">FREE delivery</span> <span className="font-bold">by Tomorrow</span></div>
              </div>
              <div className="p-4 border-b space-y-3">
                 <button onClick={() => addToCart(selectedProduct)} className="w-full py-3 bg-[#FFD814] rounded-full text-sm font-medium border border-[#FCD200] shadow-sm">Add to Cart</button>
                 <button onClick={() => addToCart(selectedProduct, true)} className="w-full py-3 bg-[#FFA41C] rounded-full text-sm font-medium border border-[#FF8F00] shadow-sm">Buy Now</button>
                 <div className="flex items-center gap-2 text-xs text-gray-500 justify-center mt-2"><ShieldCheck size={14} className="text-gray-400"/> Secure Transaction</div>
              </div>
              {similarProducts.length > 0 && (
                 <div className="p-4 border-b bg-gray-50">
                    <h3 className="font-bold text-lg text-gray-900 mb-3">You might also like</h3>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                       {similarProducts.map(p => (
                          <div key={p.id} onClick={() => setSelectedProduct(p)} className="min-w-[140px] bg-white p-3 rounded-lg border shadow-sm"><img src={p.image} className="h-24 mx-auto object-contain mb-2" /><p className="text-xs font-bold line-clamp-1">{p.name}</p><p className="text-red-700 font-bold text-sm">₹{p.price}</p><StarRating rating={p.rating} size={10} /></div>
                       ))}
                    </div>
                 </div>
              )}
           </div>
        </div>
      )}

      {/* --- CHECKOUT --- */}
      {showCart && (
         <div className="absolute inset-0 z-[60] bg-white flex flex-col animate-in slide-in-from-right">
            <div className="bg-[#232f3e] p-3 text-white flex justify-between items-center shadow-md">
               <h3 className="font-bold text-base">{checkoutStep === 'cart' ? 'Shopping Cart' : checkoutStep === 'details' ? 'Enter Details' : checkoutStep === 'payment' ? 'Payment' : 'Order Placed'}</h3>
               {checkoutStep !== 'success' && <button onClick={() => { setShowCart(false); setCheckoutStep('cart'); }}><X size={24}/></button>}
            </div>
            <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
               {checkoutStep === 'cart' && (
                  <div className="space-y-4">
                     <div className="bg-white p-3 rounded-lg shadow-sm border space-y-3">
                        {cart.map(item => (
                           <div key={item.id} className="flex gap-3 py-2 border-b last:border-0">
                              <img src={item.image} className="w-20 h-20 object-contain mix-blend-multiply" />
                              <div className="flex-1">
                                 <p className="text-sm font-medium line-clamp-2">{item.name}</p><p className="text-lg font-bold">₹{item.price}</p>
                                 <div className="flex items-center gap-3 bg-gray-100 w-max rounded-lg border mt-1">
                                    <button onClick={() => setCart(prev => prev.map(p => p.id === item.id ? {...p, quantity: Math.max(0, p.quantity-1)} : p).filter(p=>p.quantity>0))} className="p-1 px-3">-</button><span className="text-sm font-bold">{item.quantity}</span><button onClick={() => setCart(prev => prev.map(p => p.id === item.id ? {...p, quantity: p.quantity+1} : p))} className="p-1 px-3">+</button>
                                 </div>
                              </div>
                           </div>
                        ))}
                     </div>
                     <button onClick={() => setCheckoutStep('details')} className="w-full mt-4 py-3 bg-[#FFD814] rounded-lg font-bold shadow-sm">Proceed to Buy</button>
                  </div>
               )}
               {checkoutStep === 'details' && (
                  <div className="space-y-4">
                     <div className="bg-white p-4 rounded-lg shadow-sm border space-y-3">
                        <h3 className="font-bold text-gray-900 border-b pb-2">Add a new address</h3>
                        <div><label className="text-xs font-bold text-gray-500">Full Name</label><input className="w-full p-2.5 border rounded-lg mt-1" value={checkoutForm.name} onChange={e=>setCheckoutForm({...checkoutForm, name: e.target.value})} /></div>
                        <div><label className="text-xs font-bold text-gray-500">Mobile</label><input className="w-full p-2.5 border rounded-lg mt-1" value={checkoutForm.phone} onChange={e=>setCheckoutForm({...checkoutForm, phone: e.target.value})} /></div>
                        <div><label className="text-xs font-bold text-gray-500">Address</label><input className="w-full p-2.5 border rounded-lg mt-1" value={checkoutForm.address} onChange={e=>setCheckoutForm({...checkoutForm, address: e.target.value})} /></div>
                        <button className="w-full mt-2 py-3 bg-[#FFD814] rounded-lg font-bold shadow-sm" onClick={()=>setCheckoutStep('payment')}>Use this address</button>
                     </div>
                  </div>
               )}
               {checkoutStep === 'payment' && (
                  <div className="space-y-4">
                     <div className="bg-white p-4 rounded-lg shadow-sm border space-y-3">
                        <h3 className="font-bold text-gray-900 border-b pb-2">Payment Method</h3>
                        <label className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50"><input type="radio" checked={paymentMethod==='cod'} onChange={()=>setPaymentMethod('cod')} /> <span className="font-bold">Cash on Delivery</span></label>
                        <label className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50"><input type="radio" checked={paymentMethod==='upi'} onChange={()=>setPaymentMethod('upi')} /> <span className="font-bold">UPI / QR Code</span></label>
                     </div>
                     <button onClick={handlePlaceOrder} className="w-full py-3 bg-[#FFD814] rounded-lg font-bold shadow-sm">Place Your Order</button>
                  </div>
               )}
               {checkoutStep === 'success' && (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 animate-in zoom-in">
                     <CheckCircle2 size={64} className="text-green-600 mb-4" />
                     <h2 className="text-2xl font-black text-gray-900 mb-2">Order placed!</h2>
                     <p className="text-gray-600 mb-6 text-sm">Confirmation sent to your email.</p>
                     <button onClick={() => { setShowCart(false); setActiveTab(FarmerTab.ORDERS); setCheckoutStep('cart'); }} className="w-full py-3 bg-[#FFD814] rounded-lg font-bold border border-[#FCD200]">My Orders</button>
                  </div>
               )}
            </div>
         </div>
      )}

      {/* --- TRACKING --- */}
      {trackingOrder && (
        <div className="absolute inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
           <div className="bg-white w-full rounded-2xl p-6 animate-in slide-in-from-bottom">
              <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-lg">Arriving Tomorrow</h3><button onClick={() => setTrackingOrder(null)}><X size={24} /></button></div>
              <div className="relative pl-4 space-y-8 before:absolute before:left-[22px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                 <div className="flex gap-4 relative"><div className="w-4 h-4 rounded-full bg-green-600 z-10 outline outline-4 outline-white"></div><div><p className="text-sm font-bold leading-none">Ordered</p></div></div>
                 <div className="flex gap-4 relative"><div className={`w-4 h-4 rounded-full z-10 outline outline-4 outline-white ${['Shipped', 'Delivered'].includes(trackingOrder.status) ? 'bg-green-600' : 'bg-gray-300'}`}></div><div><p className={`text-sm font-bold leading-none ${['Shipped', 'Delivered'].includes(trackingOrder.status) ? 'text-black' : 'text-gray-400'}`}>Shipped</p></div></div>
                 <div className="flex gap-4 relative"><div className={`w-4 h-4 rounded-full z-10 outline outline-4 outline-white ${trackingOrder.status === 'Delivered' ? 'bg-green-600' : 'bg-gray-300'}`}></div><div><p className={`text-sm font-bold leading-none ${trackingOrder.status === 'Delivered' ? 'text-black' : 'text-gray-400'}`}>Out for Delivery</p></div></div>
              </div>
           </div>
        </div>
      )}

      {/* --- INVOICE --- */}
      {invoiceOrder && (
         <div className="absolute inset-0 z-[100] bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-lg shadow-2xl overflow-hidden animate-in zoom-in">
               <div className="p-4 bg-[#232f3e] text-white flex justify-between items-center"><h3 className="font-bold">Tax Invoice</h3><button onClick={() => setInvoiceOrder(null)}><X size={20} /></button></div>
               <div className="p-6 text-sm font-mono space-y-4 max-h-[80vh] overflow-y-auto">
                  <div className="flex justify-between border-b pb-4"><div><p className="font-bold text-lg">{BRAND_NAME}</p><p className="text-gray-500 text-xs">GSTIN: 22AAAAA0000A1Z5</p></div><div className="text-right"><p className="font-bold">Original</p><p className="text-xs text-gray-500">#INV-{invoiceOrder.id.replace('ORD-', '')}</p></div></div>
                  <div><p className="font-bold text-xs uppercase text-gray-400 mb-1">Bill To</p><p className="font-bold">{invoiceOrder.farmerName}</p><p className="text-xs text-gray-500">{invoiceOrder.location}</p><p className="text-xs text-gray-500">Ph: {invoiceOrder.phone}</p></div>
                  <table className="w-full text-left mt-2"><thead className="border-b"><tr className="text-xs text-gray-500 uppercase"><th className="py-2">Item</th><th className="py-2 text-right">Amt</th></tr></thead><tbody><tr className="border-b"><td className="py-2"><p className="font-bold line-clamp-2">{invoiceOrder.product}</p><p className="text-xs text-gray-400">Qty: {invoiceOrder.quantity}</p></td><td className="py-2 text-right font-bold">₹{invoiceOrder.totalPrice}</td></tr></tbody></table>
                  <div className="flex justify-between pt-2"><span>Grand Total</span><span className="font-black text-lg">₹{invoiceOrder.totalPrice}</span></div>
                  <button onClick={() => alert("Printing...")} className="w-full py-3 mt-4 border border-dashed border-gray-400 rounded-lg flex items-center justify-center gap-2 text-gray-600 hover:bg-gray-50 font-sans font-bold"><Printer size={16} /> Print Receipt</button>
               </div>
            </div>
         </div>
      )}

      {/* TOAST */}
      <div className={`absolute bottom-20 left-1/2 -translate-x-1/2 bg-[#333] text-white px-4 py-3 rounded-md shadow-lg flex items-center gap-3 transition-all z-[70] ${toast.show ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
         <Check size={18} className="text-green-400" /><span className="font-bold text-sm">{toast.message}</span>
      </div>

      {/* BOTTOM NAVIGATION (ABSOLUTE: Keeps it inside phone) */}
      {!selectedProduct && !showCart && (
          <nav className="bg-white border-t border-gray-200 flex justify-around items-center py-2 pb-safe absolute bottom-0 w-full z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <button onClick={() => setActiveTab(FarmerTab.SHOP)} className={`flex flex-col items-center gap-1 w-16 ${activeTab === FarmerTab.SHOP ? 'text-[#007185] border-t-2 border-[#007185] pt-1 -mt-3' : 'text-gray-500'}`}><Home size={22} /><span className="text-[10px] font-medium">Home</span></button>
            <button onClick={() => setActiveTab(FarmerTab.ORDERS)} className={`flex flex-col items-center gap-1 w-16 ${activeTab === FarmerTab.ORDERS ? 'text-[#007185] border-t-2 border-[#007185] pt-1 -mt-3' : 'text-gray-500'}`}><UserIcon size={22} /><span className="text-[10px] font-medium">You</span></button>
            <button onClick={() => setActiveTab(FarmerTab.WHATSAPP)} className={`flex flex-col items-center gap-1 w-16 ${activeTab === FarmerTab.WHATSAPP ? 'text-[#007185] border-t-2 border-[#007185] pt-1 -mt-3' : 'text-gray-500'}`}><MessageSquare size={22} /><span className="text-[10px] font-medium">Expert</span></button>
          </nav>
      )}
    </div>
  );
};

export default FarmerView;