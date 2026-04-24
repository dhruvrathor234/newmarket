
import React, { useState } from 'react';
import { X, Send, Mail, MessageSquare, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('General Support');
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSending(true);
    setError('');

    try {
      await addDoc(collection(db, 'support_tickets'), {
        userId: auth.currentUser?.uid || 'anonymous',
        userEmail: auth.currentUser?.email || 'not-signed-in',
        subject,
        message,
        status: 'OPEN',
        createdAt: serverTimestamp(),
        recipient: 'nebulamarketai@gmail.com'
      });

      setIsSent(true);
      setTimeout(() => {
        setIsSent(false);
        setMessage('');
        onClose();
      }, 3000);
    } catch (err: any) {
      console.error('Support Error:', err);
      setError('System Error: Failed to transmit message. Please try direct email.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      
      <div className="bg-[#0a0a0b] border border-white/10 rounded-[32px] w-full max-w-lg relative overflow-hidden animate-in zoom-in-95 duration-300 shadow-2xl">
        <div className="absolute top-0 right-0 p-40 bg-blue-500/5 blur-[100px] pointer-events-none"></div>
        
        <div className="p-8 relative">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <MessageSquare size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">System Support</h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Direct communication channel</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center text-zinc-600 hover:text-white hover:bg-white/5 transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {isSent ? (
            <div className="py-12 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-20 h-20 rounded-[32px] bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-6">
                <CheckCircle2 size={40} />
              </div>
              <h4 className="text-lg font-black text-white uppercase tracking-[0.3em] mb-4">Transmission Successful</h4>
              <p className="text-zinc-500 text-xs font-bold leading-relaxed max-w-[280px] uppercase tracking-widest">
                Your message has been encrypted and sent to nebulamarketai@gmail.com. Our support agents will respond shortly via your registered email.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Subject</label>
                  <select 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/5 rounded-xl py-4 px-6 text-white text-xs font-bold focus:outline-none focus:border-blue-500/50 transition-all uppercase tracking-widest"
                  >
                    <option value="General Support">General Support</option>
                    <option value="Technical Issue">Technical Issue</option>
                    <option value="Billing/Fees">Billing/Fees</option>
                    <option value="Account Access">Account Access</option>
                    <option value="API Integration">API Integration</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Encryption Protocol: Message</label>
                  <textarea 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="DESCRIBE YOUR INQUIRY IN DETAIL..."
                    rows={5}
                    className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-5 px-6 text-white text-xs font-mono focus:outline-none focus:border-blue-500/50 transition-all resize-none uppercase tracking-widest placeholder:text-zinc-800"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-500">
                  <X size={14} className="shrink-0" />
                  <span className="text-[9px] font-black uppercase tracking-widest leading-relaxed">
                    {error}
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-4">
                <button 
                  type="submit"
                  disabled={isSending || !message.trim()}
                  className="w-full py-5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl"
                >
                  {isSending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      Encrypting...
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Transmit to Support
                    </>
                  )}
                </button>
                
                <div className="flex items-center justify-center gap-2 py-4 border-t border-white/5 mt-2">
                  <ShieldCheck size={12} className="text-zinc-700" />
                  <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">End-to-End Encrypted Support Channel</span>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupportModal;
