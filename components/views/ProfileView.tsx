
import React, { useState, useRef } from 'react';
import { User, ShieldCheck, Mail, MapPin, Phone, Upload, CheckCircle, AlertCircle, Camera, CreditCard, Loader2, XCircle, Key, ExternalLink, Info, ShieldAlert, TrendingUp } from 'lucide-react';
import { verifyIdentityDocuments } from '../../services/geminiService';
import { BotState, UserStats } from '../../types';
import NebulaFeeDashboard from '../NebulaFeeDashboard';

interface ProfileViewProps {
  userEmail: string;
  botState: BotState;
  userStats: UserStats | null;
  onConnectBinance: (apiKey: string, apiSecret: string) => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ userEmail, botState, userStats, onConnectBinance }) => {
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'KYC' | 'BINANCE' | 'FEES'>('DETAILS');
  const [formData, setFormData] = useState({
    name: 'John Doe',
    address: '123 Wall Street, Financial District, NY 10005',
    phone: '+1 (555) 012-3456',
  });

  const [binanceKeys, setBinanceKeys] = useState({
    apiKey: botState.binanceApiKey || '',
    apiSecret: botState.binanceApiSecret || '',
  });
  
  const [kycFiles, setKycFiles] = useState<{ front: string | null; back: string | null }>({
    front: null,
    back: null,
  });
  
  const [kycStatus, setKycStatus] = useState<'UNVERIFIED' | 'SCANNING' | 'VERIFIED' | 'REJECTED'>('UNVERIFIED');
  const [kycReason, setKycReason] = useState('');

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setKycFiles(prev => ({ ...prev, [side]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const submitKyc = async () => {
    if (kycFiles.front && kycFiles.back) {
      setKycStatus('SCANNING');
      setKycReason('AI is currently analyzing your documents and verifying age requirements...');
      
      try {
        const result = await verifyIdentityDocuments(kycFiles.front, kycFiles.back);
        
        if (result.isVerified) {
          setKycStatus('VERIFIED');
          setKycReason('Age verified (18+). Welcome to the professional tier.');
        } else {
          setKycStatus('REJECTED');
          setKycReason(result.reason || 'Verification failed. Requirements not met.');
        }
      } catch (err) {
        setKycStatus('REJECTED');
        setKycReason('Neural link error during scan. Please try again.');
      }
    } else {
      alert("Please upload both front and back sides of your ID.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-fade-in">
      <div className="mb-10 space-y-2">
        <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Account Profile</h1>
        <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">Global Trader Identity & Verification</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Nav */}
        <div className="lg:col-span-3 space-y-2">
          <button 
            onClick={() => setActiveTab('DETAILS')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'DETAILS' ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/20' : 'text-zinc-500 hover:bg-white/5 hover:text-white'}`}
          >
            <User size={16} /> Personal Info
          </button>
          <button 
            onClick={() => setActiveTab('KYC')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'KYC' ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/20' : 'text-zinc-500 hover:bg-white/5 hover:text-white'}`}
          >
            <ShieldCheck size={16} /> KYC Verification
            {kycStatus === 'VERIFIED' && <div className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>}
            {kycStatus === 'REJECTED' && <div className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full"></div>}
          </button>
          <button 
            onClick={() => setActiveTab('BINANCE')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'BINANCE' ? 'bg-yellow-500 text-black shadow-xl shadow-yellow-900/20' : 'text-zinc-500 hover:bg-white/5 hover:text-white'}`}
          >
            <Key size={16} /> Binance API
            {botState.isBinanceConnected && <div className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>}
          </button>
          <button 
            onClick={() => setActiveTab('FEES')}
            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'FEES' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/20' : 'text-zinc-500 hover:bg-white/5 hover:text-white'}`}
          >
            <TrendingUp size={16} /> Nebula Share
            {userStats?.isLocked && <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>}
          </button>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-9">
          <div className="glass-panel p-8 rounded-[32px] border-white/5 bg-zinc-900/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-32 bg-blue-500/5 blur-[100px] pointer-events-none"></div>
            
            {activeTab === 'DETAILS' && (
              <div className="space-y-8 animate-fade-in">
                <div className="flex items-center gap-6 mb-4">
                    <div className="w-20 h-20 rounded-3xl bg-blue-600/10 border-2 border-dashed border-blue-500/30 flex items-center justify-center relative group cursor-pointer hover:border-blue-500 transition-all">
                        <User size={32} className="text-blue-500 group-hover:scale-110 transition-transform" />
                        <div className="absolute -bottom-2 -right-2 p-2 bg-zinc-900 rounded-full border border-white/10 group-hover:text-blue-400">
                            <Camera size={12} />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">{formData.name}</h3>
                        <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest">Active Member since 2025</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2 px-1">
                            <User size={10} className="text-blue-500" /> Full Name
                        </label>
                        <input 
                            type="text" 
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all font-medium"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2 px-1">
                            <Mail size={10} className="text-blue-500" /> Email Address
                        </label>
                        <input 
                            type="email" 
                            value={userEmail}
                            disabled
                            className="w-full bg-black/20 border border-white/5 rounded-2xl py-4 px-6 text-zinc-500 text-sm cursor-not-allowed font-mono"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2 px-1">
                            <Phone size={10} className="text-blue-500" /> Phone Number
                        </label>
                        <input 
                            type="text" 
                            value={formData.phone}
                            onChange={e => setFormData({...formData, phone: e.target.value})}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all font-medium"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2 px-1">
                            <MapPin size={10} className="text-blue-500" /> Residential Address
                        </label>
                        <input 
                            type="text" 
                            value={formData.address}
                            onChange={e => setFormData({...formData, address: e.target.value})}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all font-medium"
                        />
                    </div>
                </div>

                <div className="pt-6">
                    <button className="px-10 py-4 bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/20 active:scale-95">
                        Save Profile Changes
                    </button>
                </div>
              </div>
            )}

            {activeTab === 'KYC' && (
              <div className="space-y-10 animate-fade-in">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 bg-white/5 rounded-3xl border border-white/5">
                    <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-2xl ${
                          kycStatus === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-500' : 
                          kycStatus === 'REJECTED' ? 'bg-rose-500/10 text-rose-500' :
                          kycStatus === 'SCANNING' ? 'bg-blue-500/10 text-blue-500' :
                          'bg-amber-500/10 text-amber-500'
                        }`}>
                            {kycStatus === 'VERIFIED' ? <CheckCircle size={24} /> : 
                             kycStatus === 'REJECTED' ? <XCircle size={24} /> :
                             kycStatus === 'SCANNING' ? <Loader2 size={24} className="animate-spin" /> :
                             <AlertCircle size={24} />}
                        </div>
                        <div>
                            <h4 className="text-white font-black uppercase tracking-tight text-lg">Verification Status</h4>
                            <p className={`text-[10px] font-black uppercase tracking-widest ${
                              kycStatus === 'VERIFIED' ? 'text-emerald-500' : 
                              kycStatus === 'REJECTED' ? 'text-rose-500' :
                              kycStatus === 'SCANNING' ? 'text-blue-500' :
                              'text-amber-500'
                            }`}>
                                {kycStatus === 'VERIFIED' ? 'Verified Account' : 
                                 kycStatus === 'REJECTED' ? 'Verification Rejected' :
                                 kycStatus === 'SCANNING' ? 'AI Scanning System Active...' : 
                                 'Unverified • Required for Withdrawal'}
                            </p>
                            {kycReason && <p className="text-[9px] text-zinc-500 mt-1 font-medium">{kycReason}</p>}
                        </div>
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-[0.2em]">Tier 1 Verification</div>
                </div>

                <div className="space-y-6">
                    <h3 className="text-white font-black uppercase tracking-tight text-sm px-1">Identity Document (National ID / Passport)</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Front Side */}
                        <div className="space-y-4">
                            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest text-center">Front Side</p>
                            <div 
                                onClick={() => kycStatus !== 'SCANNING' && frontInputRef.current?.click()}
                                className={`aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group relative ${kycFiles.front ? 'border-emerald-500/30' : 'border-white/10 hover:border-blue-500/40 bg-black/40'} ${kycStatus === 'SCANNING' ? 'cursor-wait' : ''}`}
                            >
                                {kycFiles.front ? (
                                    <>
                                        <img src={kycFiles.front} className="w-full h-full object-cover opacity-60" />
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Upload size={20} className="text-white mb-2" />
                                            <span className="text-[9px] font-black text-white uppercase tracking-widest">Replace Image</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <CreditCard size={32} className="text-zinc-700 mb-3 group-hover:text-blue-500/60 transition-colors" />
                                        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest group-hover:text-zinc-300">Click to Upload</span>
                                    </>
                                )}
                            </div>
                            <input type="file" ref={frontInputRef} onChange={e => handleFileUpload(e, 'front')} className="hidden" accept="image/*" />
                        </div>

                        {/* Back Side */}
                        <div className="space-y-4">
                            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest text-center">Back Side</p>
                            <div 
                                onClick={() => kycStatus !== 'SCANNING' && backInputRef.current?.click()}
                                className={`aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group relative ${kycFiles.back ? 'border-emerald-500/30' : 'border-white/10 hover:border-blue-500/40 bg-black/40'} ${kycStatus === 'SCANNING' ? 'cursor-wait' : ''}`}
                            >
                                {kycFiles.back ? (
                                    <>
                                        <img src={kycFiles.back} className="w-full h-full object-cover opacity-60" />
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Upload size={20} className="text-white mb-2" />
                                            <span className="text-[9px] font-black text-white uppercase tracking-widest">Replace Image</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <CreditCard size={32} className="text-zinc-700 mb-3 group-hover:text-blue-500/60 transition-colors" />
                                        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest group-hover:text-zinc-300">Click to Upload</span>
                                    </>
                                )}
                            </div>
                            <input type="file" ref={backInputRef} onChange={e => handleFileUpload(e, 'back')} className="hidden" accept="image/*" />
                        </div>
                    </div>
                </div>

                <div className="pt-10 flex flex-col items-center gap-6">
                    <p className="text-[9px] text-zinc-600 text-center max-w-md leading-relaxed uppercase tracking-tighter">
                        Nebula Market uses Gemini AI Vision for ultra-secure identity verification. Users must be 18+ to trade. Documents are processed in an encrypted sandbox.
                    </p>
                    <button 
                        onClick={submitKyc}
                        disabled={kycStatus === 'SCANNING' || kycStatus === 'VERIFIED'}
                        className="w-full md:w-auto px-16 py-5 bg-emerald-600 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-full hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-950/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                        {kycStatus === 'SCANNING' && <Loader2 size={16} className="animate-spin" />}
                        {kycStatus === 'SCANNING' ? 'AI Scanning...' : kycStatus === 'VERIFIED' ? 'Account Verified' : kycStatus === 'REJECTED' ? 'Retry Verification' : 'Verify My Identity'}
                    </button>
                </div>
              </div>
            )}
            {activeTab === 'BINANCE' && (
              <div className="space-y-10 animate-fade-in">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 bg-white/5 rounded-3xl border border-white/5">
                    <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-2xl ${
                          botState.isBinanceConnected ? 'bg-emerald-500/10 text-emerald-500' : 'bg-yellow-500/10 text-yellow-500'
                        }`}>
                            {botState.isBinanceConnected ? <CheckCircle size={24} /> : <Key size={24} />}
                        </div>
                        <div>
                            <h4 className="text-white font-black uppercase tracking-tight text-lg">Binance Connection</h4>
                            <p className={`text-[10px] font-black uppercase tracking-widest ${
                              botState.isBinanceConnected ? 'text-emerald-500' : 'text-yellow-500'
                            }`}>
                                {botState.isBinanceConnected ? 'API Connected & Active' : 'Not Connected • Real Trading Disabled'}
                            </p>
                        </div>
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-[0.2em]">Spot Trading Only</div>
                </div>

                <div className="p-6 rounded-3xl bg-rose-500/5 border border-rose-500/10 space-y-4">
                    <div className="flex items-center gap-2 text-rose-500">
                        <ShieldAlert size={18} />
                        <span className="text-[11px] font-black uppercase tracking-widest">Security Protocol</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Nebula Market requires API keys with <span className="text-emerald-500 font-bold">Spot Trading</span> enabled. 
                        For your protection, <span className="text-rose-500 font-bold underline">Withdrawals must be disabled</span>. 
                        Nebula will never ask for withdrawal permissions.
                    </p>
                    <a 
                        href="https://www.binance.com/en/my/settings/api-management" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-[10px] font-black text-blue-500 hover:text-blue-400 transition-colors uppercase tracking-widest"
                    >
                        Binance API Management <ExternalLink size={12} />
                    </a>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2 px-1">
                            <Key size={10} className="text-yellow-500" /> API Key
                        </label>
                        <input 
                            type="text" 
                            value={binanceKeys.apiKey}
                            onChange={e => setBinanceKeys({...binanceKeys, apiKey: e.target.value})}
                            placeholder="Enter your Binance API Key"
                            className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm font-mono focus:outline-none focus:border-yellow-500/50 transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2 px-1">
                            <ShieldCheck size={10} className="text-yellow-500" /> Secret Key
                        </label>
                        <input 
                            type="password" 
                            value={binanceKeys.apiSecret}
                            onChange={e => setBinanceKeys({...binanceKeys, apiSecret: e.target.value})}
                            placeholder="Enter your Binance Secret Key"
                            className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm font-mono focus:outline-none focus:border-yellow-500/50 transition-all"
                        />
                    </div>
                </div>

                <div className="pt-6">
                    <button 
                        onClick={() => onConnectBinance(binanceKeys.apiKey, binanceKeys.apiSecret)}
                        disabled={!binanceKeys.apiKey || !binanceKeys.apiSecret}
                        className="w-full py-5 bg-yellow-500 text-black text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-yellow-400 transition-all shadow-xl shadow-yellow-900/20 active:scale-[0.98] disabled:opacity-30"
                    >
                        {botState.isBinanceConnected ? 'Update Connection' : 'Connect Real Account'}
                    </button>
                </div>
              </div>
            )}

            {activeTab === 'FEES' && userStats && (
              <div className="animate-fade-in">
                <NebulaFeeDashboard 
                  stats={userStats} 
                  onPaySuccess={() => {
                    // Stats will update via onSnapshot in App.tsx
                  }} 
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
