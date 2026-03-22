
import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Bot, User, Image as ImageIcon, X, Trash2, Sparkles } from 'lucide-react';
import { ChatMessage, MarketDetails, Symbol } from '../../types';
import { generateChatResponse } from '../../services/geminiService';
import { storageService } from '../../services/storageService';
import { ASSETS } from '../../constants';
import { getMarketDetails } from '../../services/priceService';

interface AssistantViewProps {
  activeSymbol: Symbol;
  marketDetails: MarketDetails;
}

const AssistantView: React.FC<AssistantViewProps> = ({ activeSymbol, marketDetails }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = storageService.loadChatHistory();
    if (saved && saved.length > 0) return saved;
    
    return [{
      id: 'welcome',
      role: 'assistant',
      content: `Welcome to Nebulamarket. I am your smart trading assistant.\n\nI can analyze market trends, explain news headlines, or help you with trading strategies. How can I help you today?`,
      timestamp: Date.now()
    }];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    storageService.saveChatHistory(messages);
  }, [messages]);

  const handleClearChat = () => {
    if (confirm("Reset chat history?")) {
        storageService.clearChatHistory();
        setMessages([{
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `History reset. Ready for your questions.`,
            timestamp: Date.now()
        }]);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const detectSymbolInInput = (text: string): Symbol | null => {
    const upperText = text.toUpperCase();
    const assetKeys = Object.keys(ASSETS) as Symbol[];
    for (const key of assetKeys) {
        const asset = ASSETS[key];
        const shortName = key.replace('USD', '');
        if (upperText.includes(key) || upperText.includes(asset.NAME.toUpperCase()) || upperText.includes(shortName)) {
            return key;
        }
    }
    return null;
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userText = input;
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userText,
      timestamp: Date.now(),
      image: selectedImage || undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    const imageToSend = selectedImage; 
    setSelectedImage(null); 
    setIsLoading(true);

    const detectedSymbol = detectSymbolInInput(userText);
    const targetSymbol = detectedSymbol || activeSymbol;
    const targetData = detectedSymbol ? getMarketDetails(targetSymbol) : marketDetails;

    const contextData = `
      CURRENTLY ANALYZING: ${targetSymbol} (${ASSETS[targetSymbol].NAME})
      --------------------------------------------------
      Price: $${targetData.price.toLocaleString()}
      24h Change: ${targetData.change24hPercent.toFixed(2)}%
      24h Vol: ${targetData.volume.toLocaleString()}
      High: ${targetData.high}
      Low: ${targetData.low}
      Bid/Ask: ${targetData.bid} / ${targetData.ask}
      --------------------------------------------------
      User Input: "${userText}"
      
      Instructions:
      - Always maintain professional, clear tone.
      - Refer to the platform as Nebulamarket.
      - Use simple words.
    `;

    try {
      const responseText = await generateChatResponse(
        userText, 
        contextData, 
        imageToSend || undefined
      );

      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: responseText,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "Neural core link timeout. Reconnecting...",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)] animate-fade-in relative bg-black/20 overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>

      {/* Assistant Header */}
      <div className="px-6 py-4 border-b border-white/5 bg-black/60 backdrop-blur-md z-10 flex items-center justify-between shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 relative">
               <Sparkles size={18} className="text-blue-400" />
               <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
            </div>
            <div>
            <h2 className="text-lg font-black text-white tracking-tight uppercase">AI Terminal Assistant</h2>
            <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
                <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Active Intelligence Session</p>
            </div>
            </div>
        </div>
        <button 
            onClick={handleClearChat}
            className="text-zinc-600 hover:text-rose-400 p-2 hover:bg-white/5 rounded-full transition-all" 
            title="Purge History"
        >
            <Trash2 size={16} />
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6 scroll-smooth bg-black/10">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border shadow-lg ${msg.role === 'user' ? 'bg-zinc-800 border-zinc-700' : 'bg-blue-600 border-white/10'}`}>
              {msg.role === 'user' ? <User size={14} className="text-zinc-300" /> : <Bot size={14} className="text-white" />}
            </div>
            
            <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`px-5 py-3.5 text-sm leading-7 shadow-xl backdrop-blur-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm' 
                  : 'bg-white/[0.03] text-zinc-200 border border-white/10 rounded-2xl rounded-tl-sm'
              }`}>
                {msg.image && (
                  <div className="mb-3 rounded-lg overflow-hidden border border-white/10 shadow-lg">
                    <img src={msg.image} alt="Upload" className="max-w-full max-h-64 object-cover" />
                  </div>
                )}
                <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
              </div>
              <span className="text-[9px] text-zinc-600 mt-1.5 font-mono px-1 opacity-60">
                {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
          </div>
        ))}
        {isLoading && (
           <div className="flex gap-4 animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-blue-900/20 border border-blue-500/30 flex items-center justify-center">
                <Bot size={14} className="text-blue-400" />
              </div>
              <div className="bg-white/5 px-5 py-4 rounded-2xl rounded-tl-sm flex items-center gap-1.5 border border-white/5">
                 <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                 <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                 <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
              </div>
           </div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input Section */}
      <div className="p-4 bg-black/60 border-t border-white/5 backdrop-blur-xl shrink-0">
        <div className="relative flex items-end gap-2 bg-white/[0.03] border border-white/10 rounded-2xl p-2 focus-within:border-blue-500/50 focus-within:bg-black/60 transition-all shadow-2xl">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageSelect} 
            accept="image/*" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-zinc-500 hover:text-blue-400 hover:bg-white/5 rounded-lg transition-colors"
          >
            <Paperclip size={20} />
          </button>
          
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Query Nebula Intelligence..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-zinc-200 text-sm py-2.5 max-h-32 min-h-[2.75rem] resize-none custom-scrollbar font-sans placeholder:text-zinc-700 uppercase tracking-widest font-bold"
            rows={1}
            style={{ height: 'auto' }} 
          />
          
          <button 
            onClick={handleSend}
            disabled={(!input.trim() && !selectedImage) || isLoading}
            className={`p-2.5 rounded-xl shadow-lg transition-all duration-300 flex items-center justify-center ${
                (!input.trim() && !selectedImage) || isLoading 
                ? 'bg-zinc-900 text-zinc-700 opacity-50 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40 hover:scale-105 active:scale-95'
            }`}
          >
            <Send size={18} />
          </button>
        </div>
        {selectedImage && (
            <div className="mt-2 flex items-center gap-2 p-2 bg-blue-500/5 border border-blue-500/20 rounded-lg animate-in slide-in-from-bottom-1">
                <div className="w-8 h-8 rounded bg-zinc-800 overflow-hidden shrink-0">
                    <img src={selectedImage} alt="Selected" className="w-full h-full object-cover" />
                </div>
                <span className="text-[10px] text-zinc-500 truncate flex-1">Image Loaded</span>
                <button onClick={() => setSelectedImage(null)} className="text-rose-500 hover:bg-rose-500/10 p-1 rounded-full"><X size={14}/></button>
            </div>
        )}
      </div>
    </div>
  );
};

export default AssistantView;
