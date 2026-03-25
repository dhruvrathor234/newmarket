
import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Mail, Cpu, Globe, Zap, ArrowRight, Activity, ShieldCheck, X, Lock, UserPlus, CheckCircle2, RotateCcw } from 'lucide-react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface LoginScreenProps {
  onLogin: (email: string) => void;
  onCancel?: () => void;
}

interface Node {
  x: number;
  y: number;
  z: number;
  active: number; // 0 to 1
}

interface Signal {
  startX: number;
  startY: number;
  startZ: number;
  endX: number;
  endY: number;
  endZ: number;
  progress: number;
  speed: number;
}

const NeuralGridBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    const nodes: Node[] = [];
    const signals: Signal[] = [];
    const rows = 8;
    const cols = 8;
    const depth = 3;
    const spacing = 150;

    for (let z = 0; z < depth; z++) {
      for (let y = -rows / 2; y < rows / 2; y++) {
        for (let x = -cols / 2; x < cols / 2; x++) {
          nodes.push({
            x: x * spacing,
            y: y * spacing,
            z: z * spacing - (depth * spacing) / 2,
            active: 0
          });
        }
      }
    }

    const project = (x: number, y: number, z: number, camera: { x: number, y: number, z: number, rotation: number }) => {
      const cosR = Math.cos(camera.rotation);
      const sinR = Math.sin(camera.rotation);
      const rx = x * cosR - z * sinR;
      const rz = x * sinR + z * cosR;
      const tx = rx - camera.x;
      const ty = y - camera.y;
      const tz = rz - camera.z;
      const fov = 600;
      const scale = fov / (fov + tz);
      return {
        x: w / 2 + tx * scale,
        y: h / 2 + ty * scale,
        scale: scale,
        visible: tz > -fov
      };
    };

    let time = 0;
    const animate = () => {
      time += 0.005;
      ctx.fillStyle = '#020408';
      ctx.fillRect(0, 0, w, h);

      const camera = {
        x: Math.sin(time * 0.5) * 100,
        y: Math.cos(time * 0.3) * 50,
        z: 400 + Math.sin(time * 0.2) * 100,
        rotation: time * 0.1
      };

      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.05)';
      
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const wave = Math.sin(node.x * 0.01 + node.z * 0.01 + time * 2);
        node.active = Math.max(0, wave);
        const p1 = project(node.x, node.y, node.z, camera);
        if (!p1.visible) continue;
        if ((i + 1) % cols !== 0) {
          const p2 = project(nodes[i + 1].x, nodes[i + 1].y, nodes[i + 1].z, camera);
          if (p2.visible) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
        if (i + cols < nodes.length) {
          const p2 = project(nodes[i + cols].x, nodes[i + cols].y, nodes[i + cols].z, camera);
          if (p2.visible) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      if (Math.random() < 0.15) {
        const startIdx = Math.floor(Math.random() * nodes.length);
        const startNode = nodes[startIdx];
        const neighbors = [1, -1, cols, -cols];
        const offset = neighbors[Math.floor(Math.random() * neighbors.length)];
        const endIdx = startIdx + offset;
        if (endIdx >= 0 && endIdx < nodes.length) {
          const endNode = nodes[endIdx];
          signals.push({
            startX: startNode.x, startY: startNode.y, startZ: startNode.z,
            endX: endNode.x, endY: endNode.y, endZ: endNode.z,
            progress: 0,
            speed: 0.01 + Math.random() * 0.02
          });
        }
      }

      for (let i = signals.length - 1; i >= 0; i--) {
        const s = signals[i];
        s.progress += s.speed;
        if (s.progress >= 1) {
          signals.splice(i, 1);
          continue;
        }
        const curX = s.startX + (s.endX - s.startX) * s.progress;
        const curY = s.startY + (s.endY - s.startY) * s.progress;
        const curZ = s.startZ + (s.endZ - s.startZ) * s.progress;
        const tail = Math.max(0, s.progress - 0.2);
        const tailX = s.startX + (s.endX - s.startX) * tail;
        const tailY = s.startY + (s.endY - s.startY) * tail;
        const tailZ = s.startZ + (s.endZ - s.startZ) * tail;
        const pStart = project(tailX, tailY, tailZ, camera);
        const pEnd = project(curX, curY, curZ, camera);
        if (pStart.visible && pEnd.visible) {
          const grad = ctx.createLinearGradient(pStart.x, pStart.y, pEnd.x, pEnd.y);
          grad.addColorStop(0, 'rgba(59, 130, 246, 0)');
          grad.addColorStop(1, 'rgba(147, 197, 253, 0.8)');
          ctx.strokeStyle = grad;
          ctx.lineWidth = 2 * pEnd.scale;
          ctx.beginPath();
          ctx.moveTo(pStart.x, pStart.y);
          ctx.lineTo(pEnd.x, pEnd.y);
          ctx.stroke();
          ctx.fillStyle = 'rgba(147, 197, 253, 0.5)';
          ctx.beginPath();
          ctx.arc(pEnd.x, pEnd.y, 2 * pEnd.scale, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      nodes.forEach(node => {
        const p = project(node.x, node.y, node.z, camera);
        if (p.visible) {
          const alpha = 0.05 + node.active * 0.3;
          ctx.fillStyle = `rgba(59, 130, 246, ${alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.5 * p.scale, 0, Math.PI * 2);
          ctx.fill();
          if (node.active > 0.8) {
            ctx.shadowBlur = 10 * node.active;
            ctx.shadowColor = '#3b82f6';
            ctx.fillStyle = `rgba(147, 197, 253, ${node.active})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1 * p.scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      });

      requestRef.current = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };

    window.addEventListener('resize', handleResize);
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0" />;
};

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onCancel }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [loginProgress, setLoginProgress] = useState(0);
  const [error, setError] = useState('');
  const [bootLogs, setBootLogs] = useState<string[]>([]);
  
  const logs = [
    "Starting AI System...",
    "Connecting to Markets...",
    "Setting up secure connection...",
    "Verifying credentials...",
    "Initializing smart data feed...",
    "AI Trading Engine: ONLINE"
  ];

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < logs.length) {
        setBootLogs(prev => [...prev, logs[i]]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 400);
    return () => clearInterval(interval);
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
        setError('Login failed: Invalid Email');
        return;
    }

    if (isSignUp) {
      if (!password || password.length < 6) {
        setError('Security Error: Password too short');
        return;
      }
      if (password !== confirmPassword) {
        setError('Security Error: Passwords mismatch');
        return;
      }
    }

    setIsLoading(true);
    setError('');
    setLoginProgress(10);
    
    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Initialize User Stats with 7-day trial
        const now = new Date();
        const trialEnd = new Date();
        trialEnd.setDate(now.getDate() + 7);

        await setDoc(doc(db, 'user_stats', userCredential.user.uid), {
          userId: userCredential.user.uid,
          totalProfit: 0,
          totalFeesOwed: 0,
          totalFeesPaid: 0,
          amountOwed: 0,
          isLocked: false,
          subscriptionActive: false,
          trialStart: now.toISOString(),
          trialEnd: trialEnd.toISOString(),
          lastUpdated: now.toISOString()
        });

        // Send Verification Email immediately after signup
        await sendEmailVerification(userCredential.user);
        setIsVerificationSent(true);
        setIsLoading(false);
        setLoginProgress(100);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Check if email is verified
        if (!userCredential.user.emailVerified) {
          setError('Verification Required: Please confirm your identity via the link sent to your email.');
          // Automatically sign out because the App.tsx filter will block verified access anyway
          await signOut(auth); 
          setIsLoading(false);
          setLoginProgress(0);
          return;
        }

        setLoginProgress(100);
        setTimeout(() => {
          onLogin(email);
        }, 500);
      }
    } catch (err: any) {
      setIsLoading(false);
      setLoginProgress(0);
      const errorCode = err.code;
      switch (errorCode) {
        case 'auth/invalid-credential':
          setError('Access Denied: Invalid credentials.');
          break;
        case 'auth/email-already-in-use':
          setError('Conflict: Trader ID already registered.');
          break;
        case 'auth/weak-password':
          setError('Security Violation: Password too simple.');
          break;
        case 'auth/user-not-found':
          setError('Identity Missing: Account not found.');
          break;
        case 'auth/network-request-failed':
          setError('Network Error: Connection to secure terminal failed. Please check your internet connection or firewall settings.');
          break;
        default:
          setError(`Protocol Error: ${err.message}`);
      }
    }
  };

  const handleRetry = () => {
    setError('');
    setIsLoading(false);
    setLoginProgress(0);
  };

  const handleResendLink = async () => {
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setError('New link transmitted. Please check your inbox.');
      }
    } catch (e: any) {
      setError(`Link error: ${e.message}`);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setIsVerificationSent(false);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-[#020408] text-white font-sans flex items-center justify-center relative overflow-hidden p-4">
        <NeuralGridBackground />
        <div className="absolute inset-0 pointer-events-none z-10 bg-[linear-gradient(rgba(18,24,38,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(59,130,246,0.01)_1px,transparent_1px)] bg-[length:100%_4px,40px_100%] opacity-20"></div>
        
        {onCancel && (
          <button 
            onClick={onCancel}
            className="absolute top-8 right-8 z-[1010] p-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all text-slate-400 hover:text-white"
          >
            <X size={24} />
          </button>
        )}

        <div className="relative z-20 w-full max-w-lg">
            <div className="flex flex-col items-center mb-10">
                <div className="relative mb-6">
                    <div className="w-24 h-24 relative flex items-center justify-center">
                        <div className="absolute inset-0 bg-blue-500/5 blur-3xl rounded-full"></div>
                        <div className="p-5 rounded-2xl bg-black/40 border border-blue-500/20 shadow-2xl backdrop-blur-md">
                           <Activity size={40} className="text-blue-500" />
                        </div>
                    </div>
                </div>
                <h1 className="text-3xl font-extrabold tracking-[0.2em] text-white uppercase text-center whitespace-nowrap">
                   Nebula<span className="text-blue-500">market</span>
                </h1>
                <p className="text-[10px] tracking-[0.4em] text-blue-500/50 font-bold mt-2 uppercase">Secure AI Terminal</p>
            </div>

            <div className="glass-panel rounded-sm border border-white/5 shadow-2xl relative overflow-hidden backdrop-blur-3xl bg-black/60">
                <div className="bg-white/[0.03] px-5 py-4 flex justify-between items-center border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <Terminal size={14} className="text-blue-400/40" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {isVerificationSent ? 'Protocol: Awaiting Confirmation' : isSignUp ? 'Protocol: Register Account' : 'Protocol: Secure Access'}
                        </span>
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    {isVerificationSent ? (
                        <div className="animate-fade-in flex flex-col items-center text-center space-y-6 py-4">
                            <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center relative">
                                <Mail size={32} className="text-blue-500 animate-pulse" />
                                <div className="absolute -top-1 -right-1 bg-emerald-500 p-1 rounded-full border-2 border-black">
                                    <CheckCircle2 size={12} className="text-white" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-black uppercase tracking-widest">Identity Link Sent</h3>
                                <p className="text-xs text-slate-400 leading-relaxed px-4">
                                    A secure verification link has been transmitted to <span className="text-blue-400 font-mono">{email}</span>. Please click the link to initialize your terminal access.
                                </p>
                            </div>
                            
                            <div className="w-full h-px bg-white/5"></div>
                            
                            <div className="flex flex-col w-full gap-3">
                                <button 
                                    onClick={() => window.location.reload()}
                                    className="w-full font-bold py-4 rounded-sm bg-blue-600 text-white uppercase tracking-[0.3em] text-[11px] border border-blue-500 hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/20"
                                >
                                    Access Terminal Login
                                </button>
                                <button 
                                    onClick={handleResendLink}
                                    className="w-full text-[10px] font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-widest flex items-center justify-center gap-2"
                                >
                                    <RotateCcw size={14} /> Resend verification link
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-1.5 h-16 overflow-hidden bg-black/80 p-3 rounded-sm border border-white/5 font-mono shadow-inner custom-scrollbar">
                                {bootLogs.slice(-3).map((log, i) => (
                                    <div key={i} className="text-[10px] text-blue-400/40 flex gap-2">
                                        <span className="opacity-20">&gt;&gt;</span>
                                        <span>{log}</span>
                                    </div>
                                ))}
                            </div>

                            <form onSubmit={handleLoginSubmit} className="space-y-5">
                                <div className="space-y-2.5">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                           TRADER_ID (EMAIL)
                                        </label>
                                    </div>
                                    
                                    <div className="relative group">
                                        <input 
                                            type="email" 
                                            value={email}
                                            onChange={(e) => { setEmail(e.target.value); setError(''); }}
                                            placeholder="Enter Your Email"
                                            className="w-full bg-black/40 border border-white/10 rounded-sm py-4 px-4 text-white focus:outline-none focus:border-blue-500/40 focus:bg-black/60 transition-all font-sans text-sm placeholder:text-slate-700 uppercase tracking-wide"
                                            autoFocus
                                            disabled={isLoading}
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600">
                                           <Mail size={16} />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">
                                        ACCESS_CODE (PASSWORD)
                                    </label>
                                    <div className="relative group">
                                        <input 
                                            type="password" 
                                            value={password}
                                            onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                            placeholder={isSignUp ? "Create Password" : "Enter Password"}
                                            className="w-full bg-black/40 border border-white/10 rounded-sm py-4 px-4 text-white focus:outline-none focus:border-blue-500/40 focus:bg-black/60 transition-all font-sans text-sm placeholder:text-slate-700 uppercase tracking-wide"
                                            disabled={isLoading}
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600">
                                           <Lock size={16} />
                                        </div>
                                    </div>
                                </div>

                                {isSignUp && (
                                    <div className="space-y-2.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">
                                           VERIFY_CODE (CONFIRM)
                                        </label>
                                        <div className="relative group">
                                            <input 
                                                type="password" 
                                                value={confirmPassword}
                                                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                                                placeholder="Repeat Password"
                                                className="w-full bg-black/40 border border-white/10 rounded-sm py-4 px-4 text-white focus:outline-none focus:border-blue-500/40 focus:bg-black/60 transition-all font-sans text-sm placeholder:text-slate-700 uppercase tracking-wide"
                                                disabled={isLoading}
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600">
                                               <ShieldCheck size={16} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {error && (
                                    <div className="p-3 bg-rose-500/5 border border-rose-500/20 text-rose-500 text-[10px] text-center font-bold tracking-wider rounded-sm animate-fade-in">
                                        {error}
                                        {!isSignUp && error.includes('Verification Required') && (
                                            <button 
                                                type="button"
                                                onClick={handleResendLink}
                                                className="block mx-auto mt-2 text-blue-400 hover:text-white underline"
                                            >
                                                Resend Confirmation Link
                                            </button>
                                        )}
                                        {error.includes('Network Error') && (
                                            <button 
                                                type="button"
                                                onClick={handleRetry}
                                                className="block mx-auto mt-2 text-blue-400 hover:text-white underline flex items-center justify-center gap-1"
                                            >
                                                <RotateCcw size={12} /> Retry Connection
                                            </button>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-4 pt-4">
                                    <button 
                                        type="submit" 
                                        disabled={isLoading}
                                        className={`w-full font-bold py-4 rounded-sm transition-all flex items-center justify-center gap-4 uppercase tracking-[0.3em] text-[11px] relative overflow-hidden group border
                                            ${isLoading 
                                                ? 'bg-blue-600/5 text-blue-500 border-blue-500/20 cursor-wait' 
                                                : 'bg-blue-600 text-white border-blue-500 hover:bg-blue-500 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]'
                                            }`}
                                    >
                                        {isLoading ? "Synchronizing..." : <>{isSignUp ? 'Construct Account' : 'Enter Terminal'} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform"/></>}
                                    </button>
                                    
                                    {!isLoading && (
                                      <button 
                                        type="button"
                                        onClick={toggleMode}
                                        className="w-full text-center text-[10px] font-bold text-slate-500 hover:text-blue-400 transition-colors uppercase tracking-[0.1em] flex items-center justify-center gap-2 py-2"
                                      >
                                        {isSignUp ? (
                                          <>Back to System Access</>
                                        ) : (
                                          <>Create New Account <UserPlus size={14}/></>
                                        )}
                                      </button>
                                    )}

                                    {isLoading && (
                                        <div className="w-full h-[2px] bg-slate-900 rounded-sm overflow-hidden mt-4">
                                            <div 
                                                className="h-full bg-blue-500 transition-all duration-300 ease-out"
                                                style={{ width: `${loginProgress}%` }}
                                            ></div>
                                        </div>
                                    )}
                                </div>
                            </form>
                        </>
                    )}
                </div>
            </div>

            <p className="text-center text-[10px] text-slate-600 mt-10 uppercase tracking-[0.2em] font-semibold opacity-40">
               Nebula OS 2.0 • Pro Trading Core • © 2025
            </p>
        </div>
    </div>
  );
};

export default LoginScreen;
