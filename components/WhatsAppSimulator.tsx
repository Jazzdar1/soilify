import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Mic, Phone, Video, MoreVertical, 
  CheckCheck, Paperclip, Smile, Camera, 
  ShoppingBag, XCircle, FileText, Truck
} from 'lucide-react';
import { Product, Order, User } from '../types';
import { BRAND_NAME } from '../constants';

// --- TYPES ---
type ChatState = 'IDLE' | 'BROWSING' | 'QUANTITY_INPUT' | 'CONFIRM_ORDER' | 'MANAGE_ORDERS';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read';
  type?: 'text' | 'product-card' | 'order-card' | 'invoice' | 'options';
  data?: any;
}

interface WhatsAppSimulatorProps {
  brandLogo: string;
  products: Product[];
  orders: Order[];
  user?: User; // Made optional to prevent crash
  onNewOrder: (order: Order) => void;
  onUpdateOrder: (order: Order) => void;
}

const WhatsAppSimulator: React.FC<WhatsAppSimulatorProps> = ({ 
  brandLogo, 
  products = [], 
  orders = [], 
  user, 
  onNewOrder, 
  onUpdateOrder 
}) => {
  // Safe User Fallback (Prevents Crash)
  const safeUser = user || { name: 'Farmer', phone: '9906XXXXXX', email: '', isLoggedIn: false };

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatState, setChatState] = useState<ChatState>('IDLE');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    setMessages([
      {
        id: '1',
        text: `Salam ${safeUser.name}! 👋\n\nI am the ${BRAND_NAME} Smart Assistant. I can help you buy products, track orders, or answer farming queries.\n\nWhat would you like to do?`,
        sender: 'bot',
        timestamp: new Date(),
        type: 'options',
        data: ['🛒 Buy Products', '📦 My Orders', '❌ Cancel Order', '👨‍🌾 Talk to Expert']
      }
    ]);
  }, [safeUser.name]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  // --- BOT LOGIC ---
  const processUserMessage = (text: string) => {
    const userMsg: Message = { id: Date.now().toString(), text, sender: 'user', timestamp: new Date(), status: 'sent' };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      let botResponse: Message[] = [];
      const lowerText = text.toLowerCase();

      // --- STATE: IDLE (Main Menu) ---
      if (chatState === 'IDLE') {
        if (lowerText.includes('buy') || lowerText.includes('shop')) {
          setChatState('BROWSING');
          botResponse = [{
            id: Date.now().toString(),
            text: "Here are our top selling products. Tap 'Buy' to order:",
            sender: 'bot',
            timestamp: new Date(),
            type: 'product-card',
            data: products.slice(0, 5)
          }];
        } else if (lowerText.includes('order') || lowerText.includes('track')) {
          const myOrders = orders.filter(o => o.phone === safeUser.phone && o.status !== 'Cancelled');
          if (myOrders.length === 0) {
            botResponse = [{ id: Date.now().toString(), text: "You have no active orders.", sender: 'bot', timestamp: new Date(), type: 'options', data: ['🛒 Buy Products'] }];
          } else {
            botResponse = [{
              id: Date.now().toString(),
              text: `You have ${myOrders.length} active orders:`,
              sender: 'bot',
              timestamp: new Date(),
              type: 'order-card',
              data: myOrders
            }];
          }
        } else if (lowerText.includes('cancel')) {
            const activeOrders = orders.filter(o => o.phone === safeUser.phone && o.status === 'Pending');
            if (activeOrders.length === 0) {
              botResponse = [{ id: Date.now().toString(), text: "You have no pending orders that can be cancelled.", sender: 'bot', timestamp: new Date(), type: 'options', data: ['Main Menu'] }];
            } else {
              setChatState('MANAGE_ORDERS');
              botResponse = [{
                id: Date.now().toString(),
                text: "Select an order to cancel:",
                sender: 'bot',
                timestamp: new Date(),
                type: 'order-card',
                data: activeOrders
              }];
            }
        } else {
          botResponse = [{ 
            id: Date.now().toString(), 
            text: "Please choose an option:", 
            sender: 'bot', 
            timestamp: new Date(), 
            type: 'options',
            data: ['🛒 Buy Products', '📦 My Orders', '❌ Cancel Order'] 
          }];
        }
      } 
      
      // --- STATE: QUANTITY INPUT ---
      else if (chatState === 'QUANTITY_INPUT' && selectedProduct) {
        const qty = parseInt(text);
        if (isNaN(qty) || qty <= 0) {
          botResponse = [{ id: Date.now().toString(), text: "Please enter a valid quantity (e.g., 1, 2, 5).", sender: 'bot', timestamp: new Date() }];
        } else {
          setChatState('CONFIRM_ORDER');
          const total = qty * selectedProduct.price;
          // Store qty in state temporarily by augmenting product object
          setSelectedProduct({...selectedProduct, stockCount: qty}); 
          
          botResponse = [{ 
            id: Date.now().toString(), 
            text: `Confirm Order:\n\n📦 *${selectedProduct.name}*\n🔢 Quantity: ${qty}\n💰 Total: ₹${total}\n\nShall I place this order?`, 
            sender: 'bot', 
            timestamp: new Date(), 
            type: 'options',
            data: ['✅ Yes, Place Order', '❌ No, Cancel'] 
          }];
        }
      }

      // --- STATE: CONFIRM ORDER ---
      else if (chatState === 'CONFIRM_ORDER' && selectedProduct) {
        if (lowerText.includes('yes') || lowerText.includes('place')) {
           const qty = selectedProduct.stockCount;
           const newOrder: Order = {
             id: `ORD-${Math.floor(Math.random()*10000)}`,
             farmerName: safeUser.name,
             phone: safeUser.phone,
             product: `${selectedProduct.name} (x${qty})`,
             quantity: qty,
             totalPrice: qty * selectedProduct.price,
             status: 'Pending',
             paymentStatus: 'Awaiting',
             paymentMethod: 'COD',
             location: safeUser.address || 'Kashmir',
             date: new Date().toLocaleDateString(),
             type: 'WhatsApp'
           };
           
           onNewOrder(newOrder);
           setChatState('IDLE');
           setSelectedProduct(null);

           botResponse = [
             { id: Date.now().toString(), text: "✅ Order Placed Successfully! Here is your invoice.", sender: 'bot', timestamp: new Date() },
             { 
               id: (Date.now()+1).toString(), 
               text: "Invoice", 
               sender: 'bot', 
               timestamp: new Date(), 
               type: 'invoice', 
               data: newOrder 
             },
             { 
                id: (Date.now()+2).toString(), 
                text: "What else can I do for you?", 
                sender: 'bot', 
                timestamp: new Date(), 
                type: 'options',
                data: ['📦 My Orders', '👨‍🌾 Expert Advice']
             }
           ];
        } else {
           setChatState('IDLE');
           setSelectedProduct(null);
           botResponse = [{ id: Date.now().toString(), text: "Order cancelled.", sender: 'bot', timestamp: new Date(), type: 'options', data: ['Main Menu'] }];
        }
      }
      
      // --- STATE: MANAGE ORDERS (CANCEL) ---
      else if (chatState === 'MANAGE_ORDERS') {
         // Logic handled by button click, but if user types text:
         botResponse = [{ id: Date.now().toString(), text: "Please tap 'Cancel Order' on the card above.", sender: 'bot', timestamp: new Date() }];
      }

      setMessages(prev => [...prev, ...botResponse]);
    }, 1000);
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setChatState('QUANTITY_INPUT');
    const prompt: Message = { 
        id: Date.now().toString(), 
        text: `You selected: *${product.name}* (₹${product.price})\n\nHow many units do you need? (Type a number)`, 
        sender: 'bot', 
        timestamp: new Date() 
    };
    setMessages(prev => [...prev, prompt]);
  };

  const handleOrderCancel = (order: Order) => {
      const updated = { ...order, status: 'Cancelled' };
      onUpdateOrder(updated as Order);
      
      const prompt: Message = { 
        id: Date.now().toString(), 
        text: `🚫 Order #${order.id} has been cancelled successfully.`, 
        sender: 'bot', 
        timestamp: new Date(),
        type: 'options',
        data: ['Main Menu']
      };
      setMessages(prev => [...prev, prompt]);
      setChatState('IDLE');
  };

  return (
    <div className="flex flex-col h-full bg-[#E5DDD5] relative overflow-hidden font-sans">
      
      {/* HEADER */}
      <div className="bg-[#008069] p-2 flex items-center gap-2 text-white shadow-sm z-20 shrink-0">
         <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-white/20 overflow-hidden flex items-center justify-center border border-white/30">
               <img src={brandLogo} className="w-full h-full object-cover" />
            </div>
            <div>
               <h3 className="font-bold text-base leading-tight flex items-center gap-1">
                 {BRAND_NAME} Official
                 <CheckCheck size={14} className="text-[#25D366] bg-white rounded-full p-[1px]" />
               </h3>
               <p className="text-[10px] text-white/80 leading-tight">Business Account</p>
            </div>
         </div>
         <div className="ml-auto flex gap-4 pr-2">
            <Video size={20} />
            <Phone size={20} />
            <MoreVertical size={20} />
         </div>
      </div>

      {/* CHAT AREA */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 relative"
        style={{ 
          backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
          backgroundRepeat: 'repeat',
          backgroundSize: '400px',
        }}
      >
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
            
            {/* TEXT BUBBLES */}
            {(msg.type === 'text' || !msg.type) && (
                <div className={`relative max-w-[85%] p-2 rounded-lg text-sm shadow-sm ${msg.sender === 'user' ? 'bg-[#D9FDD3] rounded-tr-none' : 'bg-white rounded-tl-none'}`}>
                  <p className="whitespace-pre-wrap text-gray-800 leading-relaxed">{msg.text}</p>
                  <div className="flex justify-end items-center gap-1 mt-1">
                     <span className="text-[9px] text-gray-500">{msg.timestamp.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                     {msg.sender === 'user' && <CheckCheck size={12} className="text-[#53bdeb]" />}
                  </div>
                </div>
            )}

            {/* PRODUCT CAROUSEL */}
            {msg.type === 'product-card' && (
                <div className="flex gap-2 overflow-x-auto max-w-full pb-2 no-scrollbar pl-2 w-full">
                    {msg.data.map((p: Product) => (
                        <div key={p.id} className="min-w-[160px] w-[160px] bg-white rounded-lg shadow-md overflow-hidden border border-gray-100 flex-shrink-0">
                            <div className="h-28 bg-gray-50 flex items-center justify-center p-2"><img src={p.image} className="max-h-full max-w-full mix-blend-multiply" /></div>
                            <div className="p-2">
                                <h4 className="font-bold text-xs line-clamp-1">{p.name}</h4>
                                <p className="text-sm font-bold text-green-700">₹{p.price}</p>
                                <button onClick={() => handleProductSelect(p)} className="w-full mt-2 bg-[#25D366] text-white py-1.5 rounded-md text-xs font-bold uppercase shadow-sm">Buy Now</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* INVOICE BUBBLE */}
            {msg.type === 'invoice' && msg.data && (
                <div className="bg-white rounded-lg shadow-md w-64 overflow-hidden border border-gray-200">
                    <div className="bg-gray-50 p-3 border-b flex items-center gap-2">
                        <FileText size={18} className="text-red-500" />
                        <span className="font-bold text-xs text-gray-700">INVOICE.PDF</span>
                    </div>
                    <div className="p-3">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <p className="text-xs font-bold text-gray-900">Order #{msg.data.id}</p>
                                <p className="text-[10px] text-gray-500">{msg.data.date}</p>
                            </div>
                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold">Placed</span>
                        </div>
                        <div className="border-t border-dashed my-2"></div>
                        <div className="space-y-1">
                            <p className="text-xs font-bold">{msg.data.product}</p>
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-500">Total Amount</span>
                                <span className="font-bold">₹{msg.data.totalPrice}</span>
                            </div>
                        </div>
                        <div className="mt-3 bg-blue-50 p-2 rounded flex gap-2 items-center">
                            <Truck size={14} className="text-blue-600" />
                            <span className="text-[10px] text-blue-700 font-bold">Delivery by Wed, 14 Feb</span>
                        </div>
                    </div>
                    <div className="bg-gray-50 p-2 text-center border-t cursor-pointer hover:bg-gray-100">
                        <span className="text-xs font-bold text-[#008069]">Download PDF</span>
                    </div>
                </div>
            )}

            {/* OPTIONS */}
            {msg.type === 'options' && (
                <div className="flex flex-wrap gap-2 mt-1 max-w-[85%]">
                    {msg.data.map((opt: string) => (
                        <button key={opt} onClick={() => processUserMessage(opt)} className="bg-white border border-gray-200 text-[#008069] text-xs font-bold px-4 py-2 rounded-full shadow-sm active:bg-gray-50">{opt}</button>
                    ))}
                </div>
            )}

            {/* ORDER CARDS */}
             {msg.type === 'order-card' && (
                <div className="space-y-2 w-64">
                    {msg.data.map((o: Order) => (
                        <div key={o.id} className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-xs text-gray-800">{o.product}</p>
                                    <p className="text-[10px] text-gray-500">#{o.id} • ₹{o.totalPrice}</p>
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${o.status === 'Pending' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                                    {o.status}
                                </span>
                            </div>
                            {chatState === 'MANAGE_ORDERS' && o.status === 'Pending' && (
                                <button onClick={() => handleOrderCancel(o)} className="w-full mt-2 bg-red-50 text-red-600 py-1.5 rounded text-xs font-bold border border-red-100 flex items-center justify-center gap-1">
                                    <XCircle size={12} /> Cancel Order
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

          </div>
        ))}
        {isTyping && <div className="text-[10px] text-gray-500 italic ml-2">Soilify is typing...</div>}
      </div>

      {/* INPUT AREA */}
      <div className="bg-[#F0F2F5] shrink-0 z-20 pb-safe px-2 py-2 flex items-end gap-2">
           <div className="flex-1 bg-white rounded-2xl flex items-center shadow-sm border border-white px-1 py-1">
              <button className="p-2 text-gray-400 hover:text-gray-600"><Smile size={24} /></button>
              <textarea 
                rows={1}
                className="flex-1 max-h-24 bg-transparent outline-none text-gray-800 text-sm px-1 py-2 resize-none placeholder:text-gray-400"
                placeholder="Message"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => {
                  if(e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    processUserMessage(inputText);
                  }
                }}
              />
              <button className="p-2 text-gray-400 hover:text-gray-600 rotate-45"><Paperclip size={20} /></button>
              {!inputText && <button className="p-2 text-gray-400 hover:text-gray-600"><Camera size={20} /></button>}
           </div>
           <button 
             onClick={() => inputText && processUserMessage(inputText)}
             className={`w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md transition-all active:scale-95 ${inputText ? 'bg-[#008069]' : 'bg-[#008069]'}`}
           >
             {inputText ? <Send size={20} className="ml-0.5" /> : <Mic size={20} />}
           </button>
      </div>
      
      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .pb-safe { padding-bottom: env(safe-area-inset-bottom, 20px); }`}</style>
    </div>
  );
};

export default WhatsAppSimulator;