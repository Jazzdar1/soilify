import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShoppingBag, Search, Home, MessageSquare, 
  User as UserIcon, Star, X, CheckCircle2,
  Check, ChevronLeft, Heart, Share2, Phone, MessageCircle, Send, Printer, Plus, Minus, Trash2, RefreshCw, CreditCard
} from 'lucide-react';
import { CATEGORIES, BRAND_NAME } from '../constants';
import { FarmerTab, Product, CartItem, User as UserType, Order } from '../types';
import WhatsAppSimulator from './WhatsAppSimulator';
import { supabase } from '../services/supabaseClient';

interface FarmerViewProps {
  user: UserType;
  products: Product[];
  orders: Order[];
  brandLogo: string;
  paymentModes: any[];
  shippingRates: {region: string, rate: number}[];
  onLogin: (user: UserType) => void;
  onNewOrder: (order: Order, cartItems: CartItem[]) => void;
  onUpdateOrder: (order: Order) => void;
  onDeleteOrder: (id: string) => void;
  onClearHistory: () => void;
  onLogout: () => void;
  razorpayKey: string; // New Prop
}

const FarmerView: React.FC<FarmerViewProps> = ({ 
  user, products, orders, onNewOrder, onUpdateOrder, onDeleteOrder, onClearHistory, onLogout, shippingRates, brandLogo, razorpayKey 
}) => {
  const [activeTab, setActiveTab] = useState<FarmerTab>(FarmerTab.SHOP);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showCart, setShowCart] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [returnOrder, setReturnOrder] = useState<Order | null>(null);
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);

  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'details' | 'payment' | 'success'>('cart');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('cod');
  
  const [authForm, setAuthForm] = useState({ name: '', email: '', phone: '', address: '', password: '' });
  const [isSignUp, setIsSignUp] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  
  const [checkoutForm, setCheckoutForm] = useState({ 
    name: user.name || '', email: user.email || '', phone: user.phone || '', 
    address: user.address || '', city: 'Srinagar', district: '', nearby: '', pincode: '' 
  });
  const [shippingCost, setShippingCost] = useState(0);
  const [returnReason, setReturnReason] = useState('');
  const [ratingVal, setRatingVal] = useState(5);
  const [reviewText, setReviewText] = useState('');

  const [showWhatsAppForm, setShowWhatsAppForm] = useState(false);
  const [waForm, setWaForm] = useState({ name: user.name || '', address: user.address || '', details: '' });

  const [toast, setToast] = useState<{message: string, show: boolean}>({ message: '', show: false });

  // LOAD RAZORPAY SCRIPT DYNAMICALLY
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  useEffect(() => { if (selectedProduct) setSelectedQuantity(1); }, [selectedProduct]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => (selectedCategory === 'All' || p.category === selectedCategory) && p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [products, selectedCategory, searchQuery]);

  const similarProducts = useMemo(() => {
    if (!selectedProduct) return [];
    return products.filter(p => p.category === selectedProduct.category && p.id !== selectedProduct.id).slice(0, 4);
  }, [selectedProduct, products]);

  const currentProductReviews = useMemo(() => {
      if (!selectedProduct) return [];
      return orders.filter(o => o.product.includes(selectedProduct.name) && o.userReview).map(o => ({
          user: o.farmerName, rating: o.userRating || 5, text: o.userReview, date: o.date
      }));
  }, [selectedProduct, orders]);

  const averageRating = useMemo(() => {
      if (currentProductReviews.length === 0) return selectedProduct?.rating || 5;
      const sum = currentProductReviews.reduce((a, b) => a + b.rating, 0);
      return Math.round(sum / currentProductReviews.length);
  }, [currentProductReviews, selectedProduct]);

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cart]);
  const finalTotal = cartTotal + shippingCost;

  useEffect(() => {
    if (user.isLoggedIn) {
      setCheckoutForm(prev => ({ ...prev, name: user.name, email: user.email, phone: user.phone, address: user.address || '' }));
      setWaForm(prev => ({ ...prev, name: user.name, address: user.address || '' }));
    }
  }, [user]);

  useEffect(() => {
      const rate = shippingRates.find(r => r.region.toLowerCase() === checkoutForm.district.toLowerCase());
      setShippingCost(rate ? rate.rate : 0);
  }, [checkoutForm.district, shippingRates]);

  useEffect(() => { if (toast.show) { const timer = setTimeout(() => setToast(prev => ({ ...prev, show: false })), 2000); return () => clearTimeout(timer); } }, [toast.show]);

  const showToast = (msg: string) => setToast({ message: msg, show: true });

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
        if (isSignUp) {
            const { data, error } = await supabase.auth.signUp({ email: authForm.email, password: authForm.password, options: { data: { full_name: authForm.name } } });
            if (error) throw error;
            if (data.user) {
                await supabase.from('profiles').upsert({ id: data.user.id, full_name: authForm.name, phone: authForm.phone, address: authForm.address, role: 'farmer' });
                alert("Account created! Logging you in...");
                window.location.reload(); 
            }
        } else {
            const { error } = await supabase.auth.signInWithPassword({ email: authForm.email, password: authForm.password });
            if (error) throw error;
            window.location.reload();
        }
    } catch (err: any) { alert(err.message); } 
    finally { setAuthLoading(false); }
  };

  const addToCart = (product: Product, quantity: number) => {
    if (!product.inStock) return alert("Product is Out of Stock");
    if (quantity > product.stockCount) return alert(`Only ${product.stockCount} left in stock!`);
    setCart(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) return prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + quantity } : p);
      return [...prev, { ...product, quantity: quantity }];
    });
    setShowCart(true);
  };

  const handleShareProduct = (p: Product) => {
      const text = `Check out this product on Soilify: ${p.name} - ₹${p.price}.`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // --- ORDER PLACEMENT LOGIC ---
  const triggerOrderPlacement = (status: 'Paid' | 'Awaiting') => {
    const newOrder: Order = {
      id: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
      farmerName: checkoutForm.name, phone: checkoutForm.phone, email: checkoutForm.email,
      product: cart.map(i => `${i.name} (x${i.quantity})`).join(', '),
      quantity: cart.reduce((s, i) => s + i.quantity, 0),
      totalPrice: finalTotal, status: 'Pending', 
      paymentStatus: status,
      paymentMethod: paymentMethod === 'cod' ? 'COD' : 'Online',
      location: `${checkoutForm.address}, ${checkoutForm.district}`, 
      district: checkoutForm.district, nearby: checkoutForm.nearby, pincode: checkoutForm.pincode,
      date: new Date().toLocaleDateString(), type: 'Marketplace'
    };
    onNewOrder(newOrder, cart);
    setCheckoutStep('success');
    setCart([]);
    showToast(status === 'Paid' ? "Payment Successful! Order Placed." : "Booking Confirmed!");
    
    const waMsg = `*New Order Placed!* %0A🆔 Order ID: ${newOrder.id}%0A👤 Name: ${newOrder.farmerName}%0A📦 Items: ${newOrder.product}%0A💰 Total: ₹${newOrder.totalPrice} (${status})%0A📍 District: ${newOrder.district}`;
    window.open(`https://wa.me/919682577635?text=${waMsg}`, '_blank');
  };

  // --- RAZORPAY HANDLER ---
  const handleRazorpayPayment = () => {
      const options = {
          key: razorpayKey, // Passed from App.tsx
          amount: finalTotal * 100, // Amount in paise
          currency: "INR",
          name: BRAND_NAME,
          description: "Order Payment",
          image: brandLogo,
          handler: function (response: any) {
              // Payment Success
              console.log("Razorpay Success:", response);
              triggerOrderPlacement('Paid');
          },
          prefill: {
              name: checkoutForm.name,
              email: checkoutForm.email,
              contact: checkoutForm.phone
          },
          theme: { color: "#16a34a" }
      };
      
      const rzp1 = new (window as any).Razorpay(options);
      rzp1.on('payment.failed', function (response: any){
          alert("Payment Failed: " + response.error.description);
      });
      rzp1.open();
  };

  const handlePlaceOrderClick = () => {
      if(!checkoutForm.phone || !checkoutForm.address || !checkoutForm.district) return alert("Please fill all details!");
      
      if (paymentMethod === 'online') {
          handleRazorpayPayment();
      } else {
          triggerOrderPlacement('Awaiting');
      }
  };

  const handleCancelOrder = async (order: Order) => {
      if (!window.confirm("Are you sure?")) return;
      onUpdateOrder({ ...order, status: 'Cancelled', rejectionReason: 'User Cancelled' });
      showToast("Order Cancelled");
  };

  const handleCompleteOrder = async (order: Order) => {
      if (!window.confirm("Confirm received?")) return;
      onUpdateOrder({ ...order, status: 'Delivered', deliveredDate: new Date().toLocaleDateString(), paymentStatus: 'Paid' });
      showToast("Marked Received!");
  };

  const handleSubmitReturn = async () => {
      if (!returnOrder || !returnReason) return;
      onUpdateOrder({ ...returnOrder, status: 'Return Requested', returnReason: returnReason });
      setReturnOrder(null);
      showToast("Return Requested");
  };

  const handleSubmitReview = async () => {
      if (!reviewOrder) return;
      onUpdateOrder({ ...reviewOrder, userRating: ratingVal, userReview: reviewText });
      setReviewOrder(null);
      showToast("Review Submitted!");
  };

  const handleClaimRefund = async (order: Order) => {
      onUpdateOrder({ ...order, paymentStatus: 'Refund Requested' });
      showToast("Refund Requested!");
  };

  const handleSendWhatsApp = () => {
      if (!waForm.name || !waForm.details) return alert("Enter details.");
      const text = `*Inquiry from App*%0A👤 Name: ${waForm.name}%0A📝 Details: ${waForm.details}`;
      window.open(`https://wa.me/919682577635?text=${encodeURIComponent(text)}`, '_blank');
      setShowWhatsAppForm(false);
  };

  const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex text-[#F4A608]">{[...Array(5)].map((_, i) => <Star key={i} size={10} fill={i < Math.floor(rating) ? "currentColor" : "none"} className={i < Math.floor(rating) ? "" : "text-gray-300"} />)}</div>
  );

  return (
    <div className="h-full bg-[#E3E6E6] flex flex-col relative w-full font-sans">
      {!selectedProduct && !showCart && activeTab === FarmerTab.SHOP && (
        <header className="bg-[#232f3e] p-3 pb-4 sticky top-0 z-40 text-white shadow-md">
          <div className="flex justify-between items-center mb-3">
            <span className="font-black text-xl italic tracking-tighter">soilify<span className="text-[#FF9900]">.in</span></span>
            <div className="relative" onClick={() => setShowCart(true)}>
              <ShoppingBag size={24} />
              {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-[#FF9900] text-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{cart.length}</span>}
            </div>
          </div>
          <div className="flex bg-white rounded-lg overflow-hidden h-10 items-center shadow-inner">
            <div className="pl-3 text-gray-500"><Search size={18} /></div>
            <input className="w-full pl-2 pr-4 h-full border-none text-black text-sm outline-none" placeholder="Search..." onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </header>
      )}

      <div className="flex-1 overflow-y-auto no-scrollbar bg-white pb-24">
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
                <div key={product.id} onClick={() => setSelectedProduct(product)} className="bg-white p-3 flex flex-col rounded-sm border border-transparent hover:border-gray-200 relative">
                  <div className="h-40 bg-gray-50 mb-2 flex items-center justify-center relative p-2">
                    <img src={product.image} className="max-h-full max-w-full object-contain mix-blend-multiply" />
                    {product.discount > 0 && <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">-{product.discount}%</span>}
                  </div>
                  <h4 className="text-xs font-normal text-gray-900 leading-snug line-clamp-2 h-9 mb-1">{product.name}</h4>
                  <StarRating rating={product.rating} />
                  <div className="mt-2 flex items-baseline gap-1"><span className="text-xs font-normal">₹</span><span className="text-lg font-medium text-gray-900">{product.price}</span></div>
                  {!product.inStock && (<div className="absolute inset-0 bg-white/60 flex items-center justify-center font-bold text-red-600 border-2 border-red-600 rounded m-2">OUT OF STOCK</div>)}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === FarmerTab.ORDERS && (
           !user.isLoggedIn ? (
             <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
                <h2 className="text-2xl font-bold mb-6">{isSignUp ? 'Create Account' : 'Sign In'}</h2>
                <form onSubmit={handleAuthSubmit} className="w-full space-y-4">
                    {isSignUp && (
                        <>
                           <input className="w-full p-3 border rounded-lg" placeholder="Full Name" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} required />
                           <input className="w-full p-3 border rounded-lg" placeholder="Phone Number" value={authForm.phone} onChange={e => setAuthForm({...authForm, phone: e.target.value})} required />
                           <input className="w-full p-3 border rounded-lg" placeholder="Address" value={authForm.address} onChange={e => setAuthForm({...authForm, address: e.target.value})} required />
                        </>
                    )}
                    <input type="email" className="w-full p-3 border rounded-lg" placeholder="Email" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} required />
                    <input type="password" className="w-full p-3 border rounded-lg" placeholder="Password" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} required />
                    <button disabled={authLoading} className="w-full py-3 bg-[#FFD814] rounded-lg font-bold border border-[#FCD200]">
                        {authLoading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
                    </button>
                </form>
                <button onClick={() => setIsSignUp(!isSignUp)} className="mt-6 text-blue-600 text-sm font-bold hover:underline">
                    {isSignUp ? 'Already have an account? Sign In' : 'New to Soilify? Create Account'}
                </button>
             </div>
           ) : (
             <div className="bg-gray-100 min-h-full">
                <div className="bg-white p-4 border-b flex justify-between items-center sticky top-0">
                    <h2 className="text-lg font-bold">Your Account</h2>
                    <div className="flex gap-2">
                        {orders.some(o => ['Delivered','Cancelled','Refunded','Rejected'].includes(o.status)) && <button onClick={onClearHistory} className="text-gray-500 text-xs font-bold px-2 py-1 bg-gray-100 rounded">Clear History</button>}
                        <button onClick={onLogout} className="text-red-600 text-xs font-bold px-3 py-1 bg-red-50 rounded border border-red-100">Sign Out</button>
                    </div>
                </div>
                <div className="p-4 space-y-4">
                    {orders.length === 0 && <p className="text-center text-gray-500 mt-10">No orders found.</p>}
                    {orders.map(o => (
                        <div key={o.id} className="bg-white p-4 rounded-lg shadow-sm border">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="font-bold text-sm text-[#007185] line-clamp-1">{o.product}</h4>
                                    <p className="text-[10px] text-gray-400">Order #{o.id}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${o.status==='Delivered'?'bg-green-100 text-green-700':o.status==='Cancelled'?'bg-red-100 text-red-700':'bg-orange-100 text-orange-700'}`}>{o.status}</span>
                                    {['Delivered', 'Cancelled', 'Refunded', 'Rejected'].includes(o.status) && (
                                        <button onClick={() => onDeleteOrder(o.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2 mt-2">
                                <button onClick={() => setTrackingOrder(o)} className="px-3 py-1.5 bg-[#FFD814] rounded text-xs font-bold border border-[#FCD200]">Track</button>
                                <button onClick={() => setInvoiceOrder(o)} className="px-3 py-1.5 bg-white rounded text-xs font-bold border">Invoice</button>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                {o.status === 'Pending' && <button onClick={()=>handleCancelOrder(o)} className="py-2 bg-red-50 text-red-600 rounded text-xs font-bold">Cancel Order</button>}
                                {o.status === 'Shipped' && <button onClick={()=>handleCompleteOrder(o)} className="py-2 bg-green-600 text-white rounded text-xs font-bold">Order Received</button>}
                                {o.status === 'Delivered' && (
                                    <>
                                        <button onClick={()=>setReturnOrder(o)} className="py-2 bg-gray-100 text-gray-700 rounded text-xs font-bold">Return</button>
                                        <button onClick={()=>setReviewOrder(o)} className="py-2 bg-yellow-50 text-yellow-700 rounded text-xs font-bold">Rate & Review</button>
                                    </>
                                )}
                                {o.status === 'Cancelled' && o.paymentStatus === 'Paid' && <button onClick={()=>handleClaimRefund(o)} className="py-2 bg-blue-50 text-blue-600 rounded text-xs font-bold col-span-2">Claim Refund</button>}
                            </div>
                        </div>
                    ))}
                </div>
             </div>
           )
        )}
        {activeTab === FarmerTab.WHATSAPP && <WhatsAppSimulator brandLogo={brandLogo} user={user} products={products} orders={orders} onNewOrder={onNewOrder} onUpdateOrder={onUpdateOrder} />}
      </div>

      {!selectedProduct && !showCart && !showWhatsAppForm && (
          <div className="absolute bottom-24 right-4 flex flex-col gap-3 z-50">
              <a href="tel:+919682577635" className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform border-2 border-white"><Phone size={24} /></a>
              <button onClick={() => setShowWhatsAppForm(true)} className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform border-2 border-white"><MessageCircle size={24} /></button>
          </div>
      )}

      {/* ... MODALS ... */}
      {returnOrder && (<div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"><div className="bg-white w-full max-w-xs rounded-2xl p-6 shadow-2xl animate-in zoom-in"><h3 className="font-bold text-lg mb-2">Return Order</h3><textarea className="w-full p-2 border rounded mb-3 text-sm" placeholder="Reason..." value={returnReason} onChange={e=>setReturnReason(e.target.value)} /><div className="flex gap-2"><button onClick={()=>setReturnOrder(null)} className="flex-1 py-2 border rounded">Cancel</button><button onClick={handleSubmitReturn} className="flex-1 py-2 bg-red-600 text-white rounded">Submit</button></div></div></div>)}
      {reviewOrder && (<div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"><div className="bg-white w-full max-w-xs rounded-2xl p-6 shadow-2xl animate-in zoom-in"><h3 className="font-bold text-lg mb-2">Rate</h3><div className="flex gap-2 justify-center mb-4 text-[#F4A608]">{[1,2,3,4,5].map(s => <Star key={s} fill={s <= ratingVal ? "currentColor" : "none"} onClick={()=>setRatingVal(s)} size={24} />)}</div><textarea className="w-full p-2 border rounded mb-3 text-sm" placeholder="Review..." value={reviewText} onChange={e=>setReviewText(e.target.value)} /><div className="flex gap-2"><button onClick={()=>setReviewOrder(null)} className="flex-1 py-2 border rounded">Cancel</button><button onClick={handleSubmitReview} className="flex-1 py-2 bg-green-600 text-white rounded">Submit</button></div></div></div>)}
      {showWhatsAppForm && (<div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"><div className="bg-white w-full max-w-xs rounded-2xl p-6 shadow-2xl relative animate-in zoom-in"><button onClick={() => setShowWhatsAppForm(false)} className="absolute top-3 right-3 text-gray-400"><X size={20}/></button><div className="text-center mb-4"><h3 className="font-bold text-gray-900">Order via WhatsApp</h3></div><div className="space-y-3"><input className="w-full p-2.5 border rounded-lg text-sm bg-gray-50" placeholder="Name" value={waForm.name} onChange={e=>setWaForm({...waForm, name: e.target.value})} /><input className="w-full p-2.5 border rounded-lg text-sm bg-gray-50" placeholder="Address" value={waForm.address} onChange={e=>setWaForm({...waForm, address: e.target.value})} /><textarea className="w-full p-2.5 border rounded-lg text-sm bg-gray-50" rows={3} placeholder="Details" value={waForm.details} onChange={e=>setWaForm({...waForm, details: e.target.value})} /><button onClick={handleSendWhatsApp} className="w-full py-2.5 bg-green-600 text-white rounded-lg font-bold text-sm shadow-md flex items-center justify-center gap-2"><Send size={16} /> Send</button></div></div></div>)}

      {showCart && (
         <div className="absolute inset-0 z-[60] bg-white flex flex-col animate-in slide-in-from-right">
            <div className="bg-[#232f3e] p-3 text-white flex justify-between items-center shadow-md"><h3 className="font-bold text-base">{checkoutStep === 'cart' ? 'Cart' : 'Checkout'}</h3><button onClick={() => { setShowCart(false); setCheckoutStep('cart'); }}><X size={24}/></button></div>
            <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
               {checkoutStep === 'cart' && (
                  <div className="space-y-4">{cart.map(item => (<div key={item.id} className="bg-white p-3 rounded-lg shadow-sm border flex gap-3"><img src={item.image} className="w-16 h-16 object-contain mix-blend-multiply" /><div className="flex-1"><p className="text-sm font-medium">{item.name}</p><p className="text-lg font-bold">₹{item.price}</p><p className="text-xs text-gray-500">Qty: {item.quantity}</p></div></div>))}<button onClick={() => setCheckoutStep('details')} className="w-full mt-4 py-3 bg-[#FFD814] rounded-lg font-bold shadow-sm">Proceed</button></div>
               )}
               {checkoutStep === 'details' && (
                  <div className="space-y-3"><h3 className="font-bold text-gray-900 border-b pb-2">Shipping</h3><input className="w-full p-2.5 border rounded-lg" placeholder="Name" value={checkoutForm.name} onChange={e=>setCheckoutForm({...checkoutForm, name: e.target.value})} /><input className="w-full p-2.5 border rounded-lg" placeholder="Phone" value={checkoutForm.phone} onChange={e=>setCheckoutForm({...checkoutForm, phone: e.target.value})} /><input className="w-full p-2.5 border rounded-lg" placeholder="Email" value={checkoutForm.email} onChange={e=>setCheckoutForm({...checkoutForm, email: e.target.value})} /><input className="w-full p-2.5 border rounded-lg" placeholder="District" value={checkoutForm.district} onChange={e=>setCheckoutForm({...checkoutForm, district: e.target.value})} /><input className="w-full p-2.5 border rounded-lg" placeholder="Nearby Landmark" value={checkoutForm.nearby} onChange={e=>setCheckoutForm({...checkoutForm, nearby: e.target.value})} /><input className="w-full p-2.5 border rounded-lg" placeholder="Pincode" value={checkoutForm.pincode} onChange={e=>setCheckoutForm({...checkoutForm, pincode: e.target.value})} /><textarea className="w-full p-2.5 border rounded-lg" placeholder="Full Address" value={checkoutForm.address} onChange={e=>setCheckoutForm({...checkoutForm, address: e.target.value})} />{shippingCost > 0 && <p className="text-xs text-green-600 font-bold">Shipping: ₹{shippingCost}</p>}<button onClick={() => setCheckoutStep('payment')} className="w-full mt-2 py-3 bg-[#FFD814] rounded-lg font-bold shadow-sm">Next</button></div>
               )}
               {checkoutStep === 'payment' && (
                  <div className="space-y-4">
                      <h3 className="font-bold text-gray-900 border-b pb-2">Payment</h3>
                      <p className="font-bold text-lg">Total: ₹{finalTotal}</p>
                      <label className="flex items-center gap-3 p-3 border rounded-lg bg-white"><input type="radio" checked={paymentMethod==='cod'} onChange={()=>setPaymentMethod('cod')} /> Cash on Delivery</label>
                      <label className="flex items-center gap-3 p-3 border rounded-lg bg-white"><input type="radio" checked={paymentMethod==='online'} onChange={()=>setPaymentMethod('online')} /> Online Payment (Cards/UPI)</label>
                      
                      <button onClick={handlePlaceOrderClick} className="w-full py-3 bg-[#FFD814] rounded-lg font-bold shadow-sm flex items-center justify-center gap-2">
                          {paymentMethod === 'online' ? <><CreditCard size={18} /> Pay Now</> : 'Place Order'}
                      </button>
                  </div>
               )}
               {checkoutStep === 'success' && (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6"><CheckCircle2 size={64} className="text-green-600 mb-4" /><h2 className="text-2xl font-black text-gray-900 mb-2">Success!</h2><button onClick={() => { setShowCart(false); setActiveTab(FarmerTab.ORDERS); setCheckoutStep('cart'); }} className="w-full py-3 bg-[#FFD814] rounded-lg font-bold border border-[#FCD200]">Track Order</button></div>
               )}
            </div>
         </div>
      )}

      {selectedProduct && (
        <div className="absolute inset-0 z-50 bg-white flex flex-col animate-in slide-in-from-right overflow-y-auto">
           <div className="bg-[#232f3e] p-3 text-white flex justify-between items-center shrink-0">
              <button onClick={() => setSelectedProduct(null)}><ChevronLeft size={24}/></button>
              <div className="flex gap-4"><button onClick={() => handleShareProduct(selectedProduct)}><Share2 size={20}/></button><Heart size={20}/></div>
           </div>
           <div className="p-4 flex-1 pb-24">
              <img src={selectedProduct.image} className="w-full h-64 object-contain mb-4 mix-blend-multiply"/>
              <h1 className="text-lg font-medium text-gray-900">{selectedProduct.name}</h1>
              <div className="flex items-center gap-2 mt-1"><StarRating rating={averageRating} /><span className="text-xs text-blue-600">{currentProductReviews.length} reviews</span></div>
              <p className="text-2xl font-bold text-gray-900 mt-2">₹{selectedProduct.price}</p>
              <p className="text-sm text-gray-600 mt-4 leading-relaxed">{selectedProduct.description}</p>
              
              <div className="mt-4 flex items-center justify-between border p-3 rounded-lg bg-gray-50">
                  <span className="font-bold text-sm">Qty</span>
                  <div className="flex items-center gap-4 bg-white px-3 py-1 rounded border"><button onClick={() => setSelectedQuantity(Math.max(1, selectedQuantity - 1))}><Minus size={16}/></button><span className="font-bold">{selectedQuantity}</span><button onClick={() => setSelectedQuantity(Math.min(selectedProduct.stockCount, selectedQuantity + 1))}><Plus size={16}/></button></div>
              </div>

              <div className="mt-6 border-t pt-4">
                  <h3 className="font-bold text-sm mb-3">Customer Reviews</h3>
                  {currentProductReviews.map((r, i) => (<div key={i} className="mb-3 pb-3 border-b last:border-0"><div className="flex items-center gap-2 mb-1"><div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold">{r.user[0]}</div><span className="text-xs font-bold">{r.user}</span></div><StarRating rating={r.rating} /><p className="text-xs text-gray-600 mt-1">{r.text}</p></div>))}
              </div>

              <button onClick={() => addToCart(selectedProduct, selectedQuantity)} className="w-full py-3 bg-[#FFD814] rounded-full font-bold mt-4 shadow-md border border-[#FCD200]">Add to Cart</button>
           </div>
        </div>
      )}

      {trackingOrder && (<div className="absolute inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end justify-center p-4"><div className="bg-white w-full rounded-2xl p-6 animate-in slide-in-from-bottom"><div className="flex justify-between items-center mb-6"><h3 className="font-bold text-lg">Arriving {trackingOrder.deliveryDate || 'Soon'}</h3><button onClick={() => setTrackingOrder(null)}><X size={24} /></button></div><div className="relative pl-4 space-y-8 before:absolute before:left-[22px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200"><div className="flex gap-4 relative"><div className="w-4 h-4 rounded-full bg-green-600 z-10 outline outline-4 outline-white"></div><div><p className="text-sm font-bold leading-none">Ordered</p><p className="text-xs text-gray-500">{trackingOrder.date}</p></div></div><div className="flex gap-4 relative"><div className={`w-4 h-4 rounded-full z-10 outline outline-4 outline-white ${['Shipped', 'Delivered'].includes(trackingOrder.status) ? 'bg-green-600' : 'bg-gray-300'}`}></div><div><p className={`text-sm font-bold leading-none ${['Shipped', 'Delivered'].includes(trackingOrder.status) ? 'text-black' : 'text-gray-400'}`}>Shipped</p></div></div><div className="flex gap-4 relative"><div className={`w-4 h-4 rounded-full z-10 outline outline-4 outline-white ${trackingOrder.status === 'Delivered' ? 'bg-green-600' : 'bg-gray-300'}`}></div><div><p className={`text-sm font-bold leading-none ${trackingOrder.status === 'Delivered' ? 'text-black' : 'text-gray-400'}`}>Delivered</p></div></div></div></div></div>)}
      {invoiceOrder && (<div className="absolute inset-0 z-[100] bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4"><div className="bg-white w-full max-w-sm rounded-lg shadow-2xl overflow-hidden animate-in zoom-in"><div className="p-4 bg-[#232f3e] text-white flex justify-between items-center"><h3 className="font-bold">Tax Invoice</h3><button onClick={() => setInvoiceOrder(null)}><X size={20} /></button></div><div className="p-6 text-sm font-mono space-y-4"><div className="flex justify-between border-b pb-4"><div><p className="font-bold text-lg">{BRAND_NAME}</p></div></div><table className="w-full text-left mt-2"><tbody><tr className="border-b"><td className="py-2"><p className="font-bold line-clamp-2">{invoiceOrder.product}</p></td><td className="py-2 text-right font-bold">₹{invoiceOrder.totalPrice}</td></tr></tbody></table><button onClick={() => alert("Printing...")} className="w-full py-3 mt-4 border border-dashed border-gray-400 rounded-lg flex items-center justify-center gap-2 text-gray-600"><Printer size={16} /> Print</button></div></div></div>)}

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