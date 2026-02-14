import React, { useState, useEffect, useRef } from 'react';
import { Send, ShoppingBag, MapPin, CreditCard, CheckCircle2, User } from 'lucide-react';
import { Product, Order, User as UserType, CartItem } from '../types';
import { BRAND_NAME } from '../constants';

interface WhatsAppSimulatorProps {
  brandLogo: string;
  user: UserType;
  products: Product[];
  orders: Order[];
  onNewOrder: (order: Order, cartItems: CartItem[]) => void;
  razorpayKey: string;
}

type ChatStep = 'INIT' | 'MENU' | 'QUANTITY' | 'DETAILS' | 'PAYMENT' | 'CONFIRM';

const WhatsAppSimulator: React.FC<WhatsAppSimulatorProps> = ({ 
  brandLogo, user, products, onNewOrder, razorpayKey 
}) => {
  const [messages, setMessages] = useState<{id: number, text: string, type: 'user' | 'bot', component?: any}[]>([
    { id: 1, text: `Hello ${user.name || 'Farmer'}! 👋 Welcome to Soilify Expert Chat.`, type: 'bot' },
    { id: 2, text: "I can help you place an order quickly. Type 'Order' or click below to start.", type: 'bot' }
  ]);
  const [step, setStep] = useState<ChatStep>('INIT');
  const [input, setInput] = useState('');
  
  // Order Staging
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [address, setAddress] = useState(user.address || '');
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const addBotMessage = (text: string, component?: any) => {
      setMessages(prev => [...prev, { id: Date.now(), text, type: 'bot', component }]);
  };

  const addUserMessage = (text: string) => {
      setMessages(prev => [...prev, { id: Date.now(), text, type: 'user' }]);
  };

  // --- FLOW HANDLERS ---

  const handleStartOrder = () => {
      setStep('MENU');
      addBotMessage("Please select a product from our catalog:", (
          <div className="grid grid-cols-2 gap-2 mt-2">
              {products.map(p => (
                  <button key={p.id} onClick={() => handleProductSelect(p)} className="bg-white p-2 rounded-lg border text-left shadow-sm hover:border-green-500 transition-all">
                      <div className="h-16 w-full flex items-center justify-center mb-1"><img src={p.image} className="h-full object-contain mix-blend-multiply"/></div>
                      <p className="font-bold text-xs truncate">{p.name}</p>
                      <p className="text-xs text-green-700 font-bold">₹{p.price}</p>
                  </button>
              ))}
          </div>
      ));
  };

  const handleProductSelect = (p: Product) => {
      setSelectedProduct(p);
      addUserMessage(`Selected: ${p.name}`);
      setStep('QUANTITY');
      setTimeout(() => {
          addBotMessage(`Good choice! How many quantities of ${p.name}?`, (
              <div className="flex gap-2 mt-2">
                  {[1, 2, 5, 10].map(q => (
                      <button key={q} onClick={() => handleQtySelect(q)} className="px-4 py-2 bg-white border rounded-full text-sm font-bold shadow-sm hover:bg-green-50">{q}</button>
                  ))}
              </div>
          ));
      }, 500);
  };

  const handleQtySelect = (q: number) => {
      setQty(q);
      addUserMessage(`${q} items`);
      setStep('DETAILS');
      setTimeout(() => {
          addBotMessage("Where should we ship this? Please confirm your address details.");
      }, 500);
  };

  const handleDetailsSubmit = () => {
      if (!address) return;
      addUserMessage(address);
      setStep('PAYMENT');
      setTimeout(() => {
          const total = (selectedProduct?.price || 0) * qty;
          addBotMessage(`Order Summary:\nProduct: ${selectedProduct?.name}\nQty: ${qty}\nTotal: ₹${total}\n\nSelect Payment Method:`, (
              <div className="flex flex-col gap-2 mt-2 w-full max-w-[200px]">
                  <button onClick={() => handlePayment('cod')} className="w-full py-2 bg-white border border-green-500 text-green-700 rounded-lg font-bold text-sm">Cash on Delivery</button>
                  <button onClick={() => handlePayment('online')} className="w-full py-2 bg-green-600 text-white rounded-lg font-bold text-sm">Pay Online Now</button>
              </div>
          ));
      }, 600);
  };

  const finalizeOrder = (method: 'COD' | 'Online', status: 'Pending' | 'Paid') => {
      if (!selectedProduct) return;
      
      const total = selectedProduct.price * qty;
      const newOrder: Order = {
          id: 'ORD-WA-' + Math.floor(100000 + Math.random() * 900000),
          farmerName: user.name || 'WhatsApp User',
          phone: user.phone || '',
          email: user.email || '',
          product: `${selectedProduct.name} (x${qty})`,
          quantity: qty,
          totalPrice: total,
          status: 'Pending',
          paymentStatus: status === 'Paid' ? 'Paid' : 'Awaiting',
          paymentMethod: method,
          location: address,
          district: 'Srinagar', // Default for chat
          nearby: 'Via Chat',
          date: new Date().toLocaleDateString(),
          type: 'WhatsApp'
      };

      // Cart Item format for stock reduction
      const cartItem: CartItem = { ...selectedProduct, quantity: qty };

      // HIT DB & UPDATE CLOUD
      onNewOrder(newOrder, [cartItem]);

      setStep('CONFIRM');
      addBotMessage("✅ Order Placed Successfully! You can track it in the 'You' tab.");
      
      // Reset after delay
      setTimeout(() => {
          setStep('INIT');
          addBotMessage("Type 'Order' to place another one.");
      }, 5000);
  };

  const handlePayment = (type: 'cod' | 'online') => {
      addUserMessage(type === 'cod' ? "Cash on Delivery" : "Online Payment");
      
      if (type === 'online') {
          const total = (selectedProduct?.price || 0) * qty;
          const options = {
              key: razorpayKey,
              amount: total * 100,
              currency: "INR",
              name: BRAND_NAME,
              description: "WhatsApp Order",
              image: brandLogo,
              handler: function (response: any) {
                  finalizeOrder('Online', 'Paid');
              },
              prefill: {
                  name: user.name,
                  email: user.email,
                  contact: user.phone
              },
              theme: { color: "#075E54" }
          };
          const rzp1 = new (window as any).Razorpay(options);
          rzp1.open();
      } else {
          finalizeOrder('COD', 'Pending');
      }
  };

  const handleSend = () => {
      if (!input.trim()) return;
      addUserMessage(input);
      
      if (step === 'INIT' && input.toLowerCase().includes('order')) {
          handleStartOrder();
      } else if (step === 'DETAILS') {
          setAddress(input);
          handleDetailsSubmit();
      } else if (step === 'QUANTITY') {
          const q = parseInt(input);
          if (!isNaN(q) && q > 0) handleQtySelect(q);
          else addBotMessage("Please enter a valid number.");
      } else {
          setTimeout(() => addBotMessage("I am an automated ordering bot. Type 'Order' to start buying!"), 500);
      }
      setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-[#E5DDD5] relative font-sans">
      {/* Header */}
      <div className="bg-[#075E54] p-3 px-4 flex items-center gap-3 text-white shadow-md shrink-0 z-10">
        <div className="w-10 h-10 bg-white rounded-full p-0.5"><img src={brandLogo} className="w-full h-full object-cover rounded-full"/></div>
        <div>
            <h3 className="font-bold text-sm leading-tight">Soilify Expert</h3>
            <p className="text-[10px] opacity-90">Verified Business • Online</p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20" ref={scrollRef}>
        {messages.map(m => (
            <div key={m.id} className={`flex flex-col ${m.type === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-lg text-sm shadow-sm relative ${m.type === 'user' ? 'bg-[#DCF8C6] rounded-tr-none' : 'bg-white rounded-tl-none'}`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                    {m.component}
                    <span className="text-[9px] text-gray-400 absolute bottom-1 right-2">{new Date(m.id).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
            </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 w-full bg-[#F0F2F5] p-2 px-3 flex items-center gap-2 border-t shrink-0 z-20 pb-safe">
        {step === 'INIT' && (
            <button onClick={handleStartOrder} className="p-2 bg-white rounded-full text-[#075E54] shadow-sm"><ShoppingBag size={20}/></button>
        )}
        <input 
            className="flex-1 p-3 bg-white rounded-full text-sm outline-none border-none shadow-sm" 
            placeholder={step === 'DETAILS' ? "Enter Delivery Address..." : step === 'QUANTITY' ? "Enter Quantity..." : "Type 'Order' to start..."}
            value={input} 
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSend()}
        />
        <button onClick={handleSend} className="p-3 bg-[#075E54] text-white rounded-full shadow-md transform active:scale-95 transition-transform"><Send size={18}/></button>
      </div>
    </div>
  );
};

export default WhatsAppSimulator;