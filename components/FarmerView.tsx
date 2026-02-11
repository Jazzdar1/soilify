import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShoppingBag, Search, Home, MessageSquare, 
  User as UserIcon, ClipboardList, Star, 
  Plus, Minus, ArrowRight, X, CheckCircle2,
  LogIn, Truck, Heart,
  Package, MapPin, ExternalLink, Lock,
  CreditCard, Smartphone, Banknote, Clock, 
  AlertCircle, Zap, FileText, Printer
} from 'lucide-react';
import { BRAND_NAME, CATEGORIES } from '../constants';
import { FarmerTab, Product, CartItem, User, Order } from '../types';
import WhatsAppSimulator from './WhatsAppSimulator';
import { supabase, isTempMail } from '../lib/supabase'; // Import Real DB

// --- MOCK DATA GENERATOR FOR 100+ PRODUCTS ---
const GENERATE_MOCK_PRODUCTS = (baseProducts: Product[]) => {
  const adjectives = ["Premium", "Organic", "Hybrid", "High-Yield", "Kashmiri", "Imported", "Eco-Friendly", "Heavy-Duty"];
  const types = ["Fertilizer", "Pesticide", "Apple Seeds", "Pruner", "Sprayer", "Soil Tester", "Growth Booster", "Netting"];
  
  const extraProducts: Product[] = Array.from({ length: 100 }).map((_, i) => ({
    id: `mock-${i}`,
    name: `${adjectives[i % adjectives.length]} ${types[i % types.length]} ${Math.floor(Math.random() * 10) + 1}kg`,
    price: 150 + (i * 45),
    unit: i % 3 === 0 ? 'Packet' : 'Bottle',
    category: CATEGORIES[i % CATEGORIES.length] || 'General',
    image: [
      "https://placehold.co/400x400/e2e8f0/1e293b?text=Fertilizer+Pack",
      "https://placehold.co/400x400/fecaca/991b1b?text=Hybrid+Seeds",
      "https://placehold.co/400x400/dcfce7/166534?text=Farm+Tools",
      "https://placehold.co/400x400/fef9c3/854d0e?text=Pesticide+Can"
    ][i % 4],
    description: "Verified by Soilify Experts. Guarantees 20% more yield in Kashmir climate. 100% Authentic product with QR trace.",
    rating: 3.5 + (Math.random() * 1.5),
    reviews: Math.floor(Math.random() * 500) + 10,
    inStock: true,
    stockCount: Math.floor(Math.random() * 200)
  }));
  return [...baseProducts, ...extraProducts];
};

interface FarmerViewProps {
  user: User;
  products: Product[];
  orders: Order[];
  brandLogo: string;
  paymentModes: {id: string, label: string, active: boolean}[];
  shippingRates: {region: string, rate: number}[];
  onLogin: (user: User) => void;
  onNewOrder: (order: Order) => void;
}

const FarmerView: React.FC<FarmerViewProps> = ({ user, products, orders, brandLogo, paymentModes, shippingRates, onLogin, onNewOrder }) => {
  const [activeTab, setActiveTab] = useState<FarmerTab>(FarmerTab.SHOP);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Combine real + mock products
  const allProducts = useMemo(() => GENERATE_MOCK_PRODUCTS(products), [products]);

  // Auth & Checkout State
  const [authForm, setAuthForm] = useState({ name: '', email: '', phone: '', address: '', password: '' });
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'details' | 'payment'>('cart');
  const [selectedPayment, setSelectedPayment] = useState('cod');
  
  const [checkoutForm, setCheckoutForm] = useState({ 
    name: user.name || '', 
    phone: user.phone || '', 
    address: user.address || '' 
  });

  useMemo(() => {
    if (user.isLoggedIn) {
      setCheckoutForm({ name: user.name, phone: user.phone, address: user.address || '' });
    }
  }, [user]);

  const userOrders = useMemo(() => {
    if (!user.isLoggedIn) return [];
    return orders.filter(o => o.phone === user.phone);
  }, [orders, user]);

  // --- INVOICE GENERATOR ---
  const generateInvoice = (order: Order) => {
    const invoiceWindow = window.open('', '_blank');
    if (invoiceWindow) {
      invoiceWindow.document.write(`
        <html>
          <head>
            <title>Invoice #${order.id}</title>
            <style>
              body { font-family: sans-serif; padding: 40px; color: #333; }
              .header { display: flex; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
              .logo { font-size: 24px; font-weight: bold; color: #166534; }
              .invoice-title { font-size: 32px; font-weight: bold; text-align: right; color: #ccc; }
              .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
              .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
              .table th { text-align: left; border-bottom: 2px solid #eee; padding: 10px; }
              .table td { padding: 10px; border-bottom: 1px solid #eee; }
              .total { text-align: right; font-size: 20px; font-weight: bold; }
              .btn { background: #166534; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; }
              @media print { .btn { display: none; } }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">${BRAND_NAME}</div>
              <div class="invoice-title">INVOICE</div>
            </div>
            
            <div class="info-grid">
              <div>
                <strong>Billed To:</strong><br/>
                ${order.farmerName}<br/>
                ${order.phone}<br/>
                ${order.location}
              </div>
              <div style="text-align: right;">
                <strong>Invoice Details:</strong><br/>
                No: ${order.id}<br/>
                Date: ${order.date}<br/>
                Status: <span style="color: green;">${order.paymentStatus}</span>
              </div>
            </div>

            <table class="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th style="text-align: right;">Price</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${order.product}</td>
                  <td>${order.quantity}</td>
                  <td style="text-align: right;">₹${order.totalPrice}</td>
                </tr>
              </tbody>
            </table>

            <div class="total">
              Total Amount: ₹${order.totalPrice}
            </div>

            <div style="margin-top: 50px; text-align: center;">
              <p style="font-size: 12px; color: #888;">Thank you for shopping with Soilify Kashmir.</p>
              <button class="btn" onclick="window.print()">Print Invoice</button>
            </div>
          </body>
        </html>
      `);
      invoiceWindow.document.close();
    } else {
      alert("Popup blocked! Please allow popups to view invoice.");
    }
  };

  // --- REAL AUTH HANDLING ---
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!authForm.email || !authForm.password || !authForm.name) {
      alert("All fields including Email & Password are required.");
      return;
    }

    if (isTempMail(authForm.email)) {
      alert("⚠️ Temporary emails are not allowed. Please use a valid email (Gmail, Yahoo, etc).");
      return;
    }

    setLoading(true);
    
    // 1. Try to Sign Up
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: authForm.email,
      password: authForm.password,
      options: {
        data: {
          full_name: authForm.name,
          phone: authForm.phone,
          address: authForm.address
        }
      }
    });

    if (signUpError) {
      alert("Login Failed: " + signUpError.message);
      setLoading(false);
    } else {
      // Success
      const userData: User = {
        name: authForm.name,
        email: authForm.email,
        phone: authForm.phone,
        address: authForm.address,
        isLoggedIn: true
      };
      onLogin(userData);
      setShowAuthModal(false);
      setLoading(false);
      alert("Account Created! You can now shop.");
    }
  };

  // --- CHECKOUT LOGIC ---
  const addToCart = (product: Product) => {
    if (!user.isLoggedIn) { setShowAuthModal(true); return; }
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const handleBuyNow = (product: Product) => {
    if (!user.isLoggedIn) { setShowAuthModal(true); return; }
    addToCart(product);
    setSelectedProduct(null);
    setCheckoutStep('cart');
    setShowCart(true);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => 
      item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
    ).filter(item => item.quantity > 0));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (!user.isLoggedIn) { setShowAuthModal(true); return; }

    if (checkoutStep === 'cart') { setCheckoutStep('details'); return; }
    if (checkoutStep === 'details') {
      if (!checkoutForm.name || !checkoutForm.phone || !checkoutForm.address) {
        alert("Please confirm Name, Phone, and Full Address."); return;
      }
      setCheckoutStep('payment'); return;
    }

    if (selectedPayment === 'cod' && cartTotal > 10000) {
      alert("Cash on Delivery not available for orders above ₹10,000."); return;
    }

    // 🔗 RAZORPAY LINK
    if (selectedPayment === 'upi' || selectedPayment === 'card') {
      window.open("https://rzp.io/rzp/CCwKNwl", "_blank");
    }

    const orderId = 'SFK-' + Math.floor(1000 + Math.random() * 9000);
    const newOrder: Order = {
      id: orderId,
      farmerName: checkoutForm.name,
      phone: checkoutForm.phone,
      product: cart.map(i => `${i.name} (x${i.quantity})`).join(', '),
      quantity: cart.reduce((s, i) => s + i.quantity, 0),
      totalPrice: cartTotal,
      status: 'Pending',
      paymentStatus: selectedPayment === 'cod' ? 'Awaiting' : 'Verified',
      paymentMethod: selectedPayment.toUpperCase(),
      location: checkoutForm.address,
      date: new Date().toLocaleDateString(),
      type: 'Marketplace'
    };
    
    // SAVE TO SUPABASE
    const { error } = await supabase.from('orders').insert([
      { 
        order_id: orderId,
        customer_name: checkoutForm.name,
        total_amount: cartTotal,
        items: newOrder.product,
        status: 'Pending' 
      }
    ]);

    if (error) {
      console.error("DB Save Error:", error);
      // We continue locally even if DB fails for demo purposes
    }

    onNewOrder(newOrder); 
    setCart([]); setShowCart(false); setCheckoutStep('cart'); setActiveTab(FarmerTab.ORDERS);
    alert("Order Successful! Track it in 'My Pipeline'.");
  };

  const filteredProducts = allProducts.filter(p => 
    (selectedCategory === 'All' || p.category === selectedCategory) &&
    (p.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getTrackingSteps = (status: string) => [
    { label: 'Placed', active: true },
    { label: 'Confirmed', active: ['Approved', 'Shipped', 'Delivered'].includes(status) },
    { label: 'Shipped', active: ['Shipped', 'Delivered'].includes(status) },
    { label: 'Delivered', active: status === 'Delivered' }
  ];

  return (
    <div className="h-full bg-[#E3E6E6] flex flex-col relative max-w-[450px] mx-auto shadow-2xl border-x overflow-hidden font-sans">
      
      {/* 🔒 FORCED REAL AUTH MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[24px] overflow-hidden shadow-2xl p-8 animate-in zoom-in duration-300">
            <h3 className="text-2xl font-black mb-2 text-gray-900">Sign Up</h3>
            <p className="text-gray-500 text-sm mb-6">Real email required. Temp mails blocked.</p>
            <form onSubmit={handleAuthSubmit} className="space-y-3">
              <input placeholder="Full Name" className="w-full p-3 border rounded-lg" required value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} />
              <input type="email" placeholder="Real Email" className="w-full p-3 border rounded-lg" required value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} />
              <input type="password" placeholder="Password" className="w-full p-3 border rounded-lg" required value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} />
              <input placeholder="Mobile Number" className="w-full p-3 border rounded-lg" required value={authForm.phone} onChange={e => setAuthForm({...authForm, phone: e.target.value})} />
              <textarea placeholder="Delivery Address" className="w-full p-3 border rounded-lg resize-none" required rows={2} value={authForm.address} onChange={e => setAuthForm({...authForm, address: e.target.value})} />
              <button type="submit" disabled={loading} className="w-full bg-[#FFD814] text-black py-3 rounded-lg font-bold border border-[#FCD200]">
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- HEADER --- */}
      {activeTab === FarmerTab.SHOP && (
        <header className="bg-[#232f3e] p-3 sticky top-0 z-40 text-white">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <div className="font-black text-xl italic tracking-tighter">soilify<span className="text-[#FF9900]">.in</span></div>
            </div>
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => user.isLoggedIn ? setShowCart(true) : setShowAuthModal(true)}>
              <div className="relative">
                <ShoppingBag size={24} />
                {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-[#FF9900] text-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">{cart.length}</span>}
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="flex bg-white rounded-lg overflow-hidden h-10 items-center">
              <div className="pl-3 text-gray-500"><Search size={18} /></div>
              <input type="text" placeholder="Search 100+ farm products..." className="w-full pl-2 pr-4 h-full border-none text-black text-sm outline-none" onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </div>
        </header>
      )}

      <div className="flex-1 overflow-y-auto pb-24">
        {activeTab === FarmerTab.SHOP ? (
          <div className="space-y-2">
            <div className="bg-white p-3 flex gap-3 overflow-x-auto no-scrollbar border-b">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap ${selectedCategory === cat ? 'bg-[#232f3e] text-white' : 'bg-gray-100 text-gray-700'}`}>{cat}</button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 p-2">
              {filteredProducts.map(product => (
                <div key={product.id} onClick={() => setSelectedProduct(product)} className="bg-white rounded-md border border-gray-200 overflow-hidden flex flex-col hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="h-40 bg-white p-4 flex items-center justify-center relative">
                    <img src={product.image} className="max-h-full max-w-full object-contain" />
                    {product.stockCount < 50 && <span className="absolute bottom-2 left-2 text-[9px] text-red-600 font-bold bg-red-50 px-1 rounded">Only {product.stockCount} left</span>}
                  </div>
                  <div className="p-3 flex-1 flex flex-col">
                    <h4 className="text-sm text-gray-900 leading-snug line-clamp-2 mb-1 h-10">{product.name}</h4>
                    <div className="flex items-center gap-1 mb-1">
                      <div className="flex text-[#F4A608]">
                        {[...Array(5)].map((_, i) => <Star key={i} size={10} fill={i < Math.floor(product.rating) ? "currentColor" : "none"} strokeWidth={0} className={i < Math.floor(product.rating) ? "" : "text-gray-300 stroke-2"} />)}
                      </div>
                      <span className="text-[10px] text-blue-600">{product.reviews}</span>
                    </div>
                    <div className="mt-auto">
                      <div className="flex items-baseline">
                        <span className="text-xs align-top">₹</span>
                        <span className="text-xl font-medium text-gray-900">{product.price}</span>
                      </div>
                      <div className="text-[10px] text-gray-500">
                        Get it by <span className="font-bold text-gray-700">Tomorrow</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[9px] text-[#007600] font-bold">Soilify</span>
                        <span className="text-[9px] text-blue-500 font-bold italic">Express</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === FarmerTab.ORDERS ? (
          /* --- PIPELINE & INVOICE --- */
          <div className="p-3 bg-gray-50 min-h-full pb-24">
            <h2 className="text-lg font-bold text-gray-800 mb-4 px-1">Your Orders</h2>
            {userOrders.length === 0 ? (
              <div className="bg-white p-8 rounded-lg border text-center">
                <p className="text-sm text-gray-500 mb-4">You haven't placed any orders yet.</p>
                <button onClick={() => setActiveTab(FarmerTab.SHOP)} className="bg-[#FFD814] px-6 py-2 rounded-lg text-sm font-medium border border-[#FCD200]">Start Shopping</button>
              </div>
            ) : (
              userOrders.map(order => (
                <div key={order.id} className="bg-white rounded-lg border border-gray-200 mb-4 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                    <div><p className="text-[10px] uppercase text-gray-500 font-bold">Order Placed</p><p className="text-xs text-gray-700">{order.date}</p></div>
                    <div className="text-right"><p className="text-[10px] uppercase text-gray-500 font-bold">Total</p><p className="text-xs font-bold text-gray-900">₹{order.totalPrice}</p></div>
                  </div>
                  <div className="p-4">
                    <h4 className="font-bold text-green-700 text-sm mb-1 uppercase tracking-wide">{order.status}</h4>
                    <p className="text-xs text-gray-600 mb-4">Arriving by Tuesday</p>
                    
                    <div className="flex gap-4 mb-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center border"><Package size={24} className="text-gray-400" /></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-600 line-clamp-2">{order.product}</p>
                        <p className="text-xs text-gray-500 mt-1">Sold by: Soilify Retail</p>
                      </div>
                    </div>

                    <div className="relative pt-2 pb-6 px-1">
                      <div className="absolute top-3.5 left-0 w-full h-1 bg-gray-200 rounded-full" />
                      <div className="absolute top-3.5 left-0 h-1 bg-green-600 rounded-full transition-all" style={{ width: `${(getTrackingSteps(order.status).filter(s => s.active).length - 1) * 33.3}%` }} />
                      <div className="flex justify-between relative">
                        {getTrackingSteps(order.status).map((s, i) => (
                          <div key={i} className="flex flex-col items-center gap-2">
                            <div className={`w-3 h-3 rounded-full z-10 ${s.active ? 'bg-green-600 ring-2 ring-white' : 'bg-gray-300'}`} />
                            <span className={`text-[9px] font-bold uppercase ${s.active ? 'text-green-700' : 'text-gray-400'}`}>{s.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <button className="py-2 border border-gray-300 rounded-lg text-xs font-medium bg-white shadow-sm flex items-center justify-center gap-1">
                        <Truck size={14}/> Track
                      </button>
                      {/* ✅ INVOICE BUTTON WORKING */}
                      <button onClick={() => generateInvoice(order)} className="py-2 border border-gray-300 rounded-lg text-xs font-medium bg-white shadow-sm flex items-center justify-center gap-1 hover:bg-gray-50">
                        <FileText size={14}/> View Invoice
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <WhatsAppSimulator brandLogo={brandLogo} />
        )}
      </div>

      {/* --- PRODUCT PREVIEW MODAL --- */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/60 backdrop-blur-sm" onClick={() => setSelectedProduct(null)}>
          <div className="bg-white rounded-t-2xl h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white p-3 border-b flex justify-between items-center z-10">
              <span className="text-xs font-bold text-gray-500">Product Details</span>
              <button onClick={() => setSelectedProduct(null)}><X size={20} className="text-gray-500" /></button>
            </div>
            
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] text-blue-600 font-bold uppercase">Soilify Choice</span>
                <div className="flex items-center text-[#F4A608]"><span className="text-xs font-bold mr-1">{selectedProduct.rating.toFixed(1)}</span><Star size={12} fill="currentColor" /></div>
              </div>
              <h2 className="text-lg font-medium text-gray-900 mb-1">{selectedProduct.name}</h2>
              <div className="w-full h-64 bg-gray-50 rounded-lg flex items-center justify-center mb-4 border">
                <img src={selectedProduct.image} className="max-h-full max-w-full object-contain" />
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-red-600 text-lg">-18%</span>
                  <span className="text-sm align-top">₹</span>
                  <span className="text-3xl font-medium">{selectedProduct.price}</span>
                </div>
                <div className="mt-2 text-sm">FREE delivery by Soilify Express</div>
              </div>
              <div className="space-y-3 mb-6">
                <button onClick={() => addToCart(selectedProduct)} className="w-full py-3 bg-[#FFD814] rounded-full text-sm font-medium border border-[#FCD200]">Add to Cart</button>
                <button onClick={() => handleBuyNow(selectedProduct)} className="w-full py-3 bg-[#FFA41C] rounded-full text-sm font-medium border border-[#FF8F00]">Buy Now</button>
              </div>
              <div className="border-t pt-4 mt-4">
                <h3 className="font-bold text-gray-900 mb-2 text-sm">Description</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{selectedProduct.description}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- CART DRAWER --- */}
      {showCart && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCart(false)} />
          <div className="relative w-full max-w-[400px] bg-gray-100 h-full flex flex-col shadow-xl animate-in slide-in-from-right duration-200">
            <div className="p-4 bg-white border-b flex items-center gap-2">
              <button onClick={() => setShowCart(false)}><X size={24} /></button>
              <h3 className="font-medium text-lg">Cart</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {checkoutStep === 'cart' ? (
                cart.length === 0 ? <div className="text-center mt-20"><ShoppingBag size={48} className="mx-auto text-gray-300 mb-2" /><p className="text-gray-500">Cart is empty.</p></div> :
                cart.map(item => (
                  <div key={item.id} className="bg-white p-3 rounded-lg border shadow-sm flex gap-3">
                    <img src={item.image} className="w-20 h-20 object-contain" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium line-clamp-2 mb-1">{item.name}</h4>
                      <p className="text-lg font-bold text-gray-900">₹{item.price}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center border rounded-md shadow-sm bg-gray-50">
                          <button onClick={() => updateQuantity(item.id, -1)} className="p-2 bg-gray-200 rounded-l-md"><Minus size={12}/></button>
                          <span className="w-8 text-center text-sm font-bold bg-white">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="p-2 bg-gray-200 rounded-r-md"><Plus size={12}/></button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : checkoutStep === 'details' ? (
                <div className="bg-white p-4 rounded-lg shadow-sm border space-y-4">
                  <h3 className="font-bold text-gray-800">Shipping Address</h3>
                  <input className="w-full p-3 border rounded-md" value={checkoutForm.name} onChange={e => setCheckoutForm({...checkoutForm, name: e.target.value})} placeholder="Full Name" />
                  <textarea className="w-full p-3 border rounded-md" rows={3} value={checkoutForm.address} onChange={e => setCheckoutForm({...checkoutForm, address: e.target.value})} placeholder="Area, Colony, Street" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <h3 className="font-bold text-gray-800 mb-3">Payment Method</h3>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input type="radio" name="pay" checked={selectedPayment === 'upi'} onChange={() => setSelectedPayment('upi')} />
                        <div className="flex-1"><span className="font-bold text-sm block">UPI / Online</span><span className="text-xs text-gray-500">Razorpay Secure</span></div>
                      </label>
                      <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input type="radio" name="pay" checked={selectedPayment === 'cod'} onChange={() => setSelectedPayment('cod')} />
                        <div className="flex-1"><span className="font-bold text-sm block">Cash on Delivery</span></div>
                      </label>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border">
                    <div className="flex justify-between text-lg font-bold text-[#B12704]"><span>Order Total:</span><span>₹{cartTotal}</span></div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t">
              {cart.length > 0 && <button onClick={handleCheckout} className="w-full bg-[#FFD814] text-black py-3 rounded-lg shadow-sm border border-[#FCD200] font-medium">{checkoutStep === 'payment' ? 'Place Order' : 'Proceed'}</button>}
            </div>
          </div>
        </div>
      )}

      {/* --- Bottom Navigation --- */}
      <nav className="fixed bottom-0 w-full max-w-[450px] bg-white border-t flex justify-around py-3 z-40 text-xs">
        <button onClick={() => setActiveTab(FarmerTab.SHOP)} className={`flex flex-col items-center ${activeTab === FarmerTab.SHOP ? 'text-teal-600' : 'text-gray-500'}`}><Home size={22} /><span className="mt-1">Home</span></button>
        <button onClick={() => setActiveTab(FarmerTab.WHATSAPP)} className={`flex flex-col items-center ${activeTab === FarmerTab.WHATSAPP ? 'text-teal-600' : 'text-gray-500'}`}><MessageSquare size={22} /><span className="mt-1">Expert</span></button>
        <button onClick={() => setActiveTab(FarmerTab.ORDERS)} className={`flex flex-col items-center ${activeTab === FarmerTab.ORDERS ? 'text-teal-600' : 'text-gray-500'}`}><UserIcon size={22} /><span className="mt-1">You</span></button>
      </nav>
    </div>
  );
};

export default FarmerView;