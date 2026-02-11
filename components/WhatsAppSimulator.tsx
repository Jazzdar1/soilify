import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Mic, Phone, Video, MoreVertical, 
  ChevronLeft, CheckCheck, MapPin, 
  Play, Loader2, Smile
} from 'lucide-react';
import { Message, WhatsAppState } from '../types';
import { aiService } from '../services/ai';
import { BRAND_NAME } from '../constants';

interface WhatsAppSimulatorProps {
  brandLogo: string;
}

const WhatsAppSimulator: React.FC<WhatsAppSimulatorProps> = ({ brandLogo }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'bot',
      text: `🌱 Welcome to ${BRAND_NAME} Kashmir.\n\nI am your digital farming assistant. How can I help you today?`,
      timestamp: new Date(),
      type: 'options',
      options: ['🛒 Order Vermicompost', '🌾 Crop Advice', '📍 Track Order', '💬 Talk to Expert']
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [botState, setBotState] = useState<WhatsAppState>(WhatsAppState.START);
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [language, setLanguage] = useState('English');
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Audio Recording Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (text: string, isAudio = false, audioBase64?: string) => {
    if (!text.trim() && !isAudio) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: isAudio ? '🎤 Voice Message' : text,
      timestamp: new Date(),
      type: isAudio ? 'audio' : 'text',
      audioUrl: isAudio ? text : undefined 
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      let response;
      if (isAudio && audioBase64) {
        const voiceData = await aiService.processVoiceOrder(audioBase64);
        response = await aiService.getWhatsAppResponse(voiceData.text, botState, language);
        if (voiceData.product) {
          response.extractedData = { 
            ...response.extractedData, 
            product: voiceData.product, 
            quantity: voiceData.quantity 
          };
        }
      } else {
        response = await aiService.getWhatsAppResponse(text, botState, language);
      }
      
      setBotState(response.nextState as WhatsAppState);
      
      // Simulate network delay
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: response.text,
          timestamp: new Date(),
          type: response.options ? 'options' : 'text',
          options: response.options,
          payload: response.extractedData
        }]);
        setIsTyping(false);
      }, 1000);
    } catch (err) {
      console.error(err);
      setIsTyping(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // FIXED TYPO HERE: Changed constLx to const
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = (reader.result as string).split(',')[1];
          handleSend("Voice message received", true, base64Audio);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#e5ddd5] overflow-hidden relative whatsapp-bg">
      {/* Header */}
      <div className="bg-[#075e54] text-white px-4 py-3 flex items-center justify-between shadow-lg z-20 shrink-0">
        <div className="flex items-center gap-3">
          <ChevronLeft size={24} className="cursor-pointer" />
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-white p-0.5 border-2 border-green-500 overflow-hidden shadow-md">
              <img src={brandLogo} alt={BRAND_NAME} className="w-full h-full object-cover rounded-full" />
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#075e54] rounded-full" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-base truncate leading-none mb-0.5">{BRAND_NAME} Bot 🌱</p>
            <p className="text-[10px] text-green-100 font-medium">online</p>
          </div>
        </div>
        <div className="flex gap-5 items-center">
          <Video size={20} className="opacity-90 hover:opacity-100 cursor-pointer" />
          <Phone size={18} className="opacity-90 hover:opacity-100 cursor-pointer" />
          <MoreVertical size={20} className="opacity-90 hover:opacity-100 cursor-pointer" />
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-32 no-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 shadow-sm relative group animate-in slide-in-from-bottom-2 duration-200 ${
              msg.sender === 'user' ? 'bg-[#dcf8c6] rounded-tr-none' : 'bg-white rounded-tl-none'
            }`}>
              {msg.type === 'audio' ? (
                 <div className="flex items-center gap-2 text-gray-500 font-bold text-xs">
                   <Play size={16} /> Voice Note (Processing...)
                 </div>
              ) : msg.type === 'options' ? (
                <div className="space-y-3">
                  <p className="text-sm whitespace-pre-line leading-relaxed text-gray-800">{msg.text}</p>
                  <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
                    {msg.options?.map((opt, i) => (
                      <button 
                        key={i}
                        onClick={() => handleSend(opt)}
                        className="w-full py-2.5 px-4 text-[13px] bg-white hover:bg-green-50 border border-gray-100 rounded-lg text-blue-600 font-bold text-left shadow-sm transition-all"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-line leading-relaxed text-gray-800">{msg.text}</p>
              )}
              
              <div className="flex items-center justify-end gap-1 mt-1">
                <span className="text-[9px] text-gray-500">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {msg.sender === 'user' && <CheckCheck size={14} className="text-blue-400" />}
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white rounded-lg px-4 py-2 shadow-sm flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-green-600" />
              <span className="text-xs text-gray-500 font-medium italic">Soilify is typing...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-transparent flex items-end gap-2 z-30">
        <div className="flex-1 bg-white rounded-[24px] flex items-end px-4 py-2 shadow-lg border border-gray-200 min-h-[48px]">
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors"><Smile size={22} /></button>
          <textarea 
            rows={1}
            placeholder="Message..." 
            className="flex-1 bg-transparent border-none outline-none text-[15px] py-2.5 px-2 resize-none max-h-32 text-gray-800"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(inputText); } }}
          />
          <button className="p-2 text-gray-400"><MapPin size={22} /></button>
        </div>
        
        {isRecording ? (
          <button onClick={stopRecording} className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg animate-pulse">
            <Mic size={24} />
          </button>
        ) : inputText.trim() ? (
          <button onClick={() => handleSend(inputText)} className="w-12 h-12 bg-[#008069] rounded-full flex items-center justify-center text-white shadow-lg">
            <Send size={20} fill="currentColor" />
          </button>
        ) : (
          <button onMouseDown={startRecording} onMouseUp={stopRecording} className="w-12 h-12 bg-[#008069] rounded-full flex items-center justify-center text-white shadow-lg">
            <Mic size={24} />
          </button>
        )}
      </div>
    </div>
  );
};

export default WhatsAppSimulator;