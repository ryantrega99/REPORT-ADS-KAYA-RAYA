/// <reference types="vite/client" />
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Users, 
  Facebook, 
  Globe, 
  Edit3, 
  Clock, 
  Settings, 
  LogOut, 
  ChevronDown, 
  Search, 
  Download, 
  RefreshCw, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Database,
  Image,
  UserCircle,
  History,
  ShieldCheck,
  UserPlus,
  X,
  Copy,
  Calendar,
  Target,
  Camera,
  Upload,
  ExternalLink,
  Lock,
  Check,
  Moon,
  Sun,
  Zap,
  Save,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Campaign, Creative, PRODUCTS } from './types';
import { cn, fmtNum, generateLocalId } from './lib/utils';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot,
  query,
  where,
  updateDoc
} from './firebase';

// --- Constants ---
const GOOGLE_CONFIG = {
  CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'GANTI_DENGAN_CLIENT_ID.apps.googleusercontent.com',
  API_KEY: import.meta.env.VITE_GOOGLE_API_KEY || 'GANTI_DENGAN_API_KEY',
  SCOPES: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
  DISCOVERY: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
};

// --- Components ---

const Logo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <div className={cn("bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xs", className)}>
    ADS
  </div>
);

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'warn' | 'info', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 20, opacity: 0 }}
      className={cn(
        "fixed bottom-6 right-6 px-5 py-3 rounded-xl font-bold shadow-xl z-[9999] flex items-center gap-3 border backdrop-blur-md",
        type === 'success' && "bg-emerald-600 text-white border-emerald-500",
        type === 'warn' && "bg-amber-500 text-white border-amber-400",
        type === 'info' && "bg-[var(--bg-surface)] text-[var(--text-base)] border-[var(--border-base)]"
      )}
    >
      <div className="flex-shrink-0">
        {type === 'success' && <CheckCircle2 size={18} />}
        {type === 'warn' && <AlertCircle size={18} />}
        {type === 'info' && <RefreshCw size={18} className="animate-spin" />}
      </div>
      <span className="text-sm tracking-tight">{message}</span>
      <button onClick={onClose} className="ml-2 p-1 hover:bg-white/10 rounded-lg transition-colors">
        <X size={14} />
      </button>
    </motion.div>
  );
};

const SyncPanel = ({ 
  platform, 
  accessToken, 
  googleUser,
  sheetId, 
  sheetTab, 
  autoSync, 
  appendMode, 
  syncLogs, 
  isSyncing, 
  lastSync, 
  isOpen, 
  onToggle, 
  onSignIn, 
  onSignOut,
  onConnect, 
  onSync, 
  onTabChange, 
  onAutoSyncChange, 
  onAppendModeChange,
  columns,
  exportCols,
  onToggleColumn
}: { 
  platform: string, 
  accessToken: string | null,
  googleUser: any,
  sheetId: string, 
  sheetTab: string, 
  autoSync: boolean, 
  appendMode: boolean, 
  syncLogs: { msg: string, type: 'ok' | 'err' | 'info' | 'warn', ts: string }[], 
  isSyncing: boolean, 
  lastSync: string, 
  isOpen: boolean, 
  onToggle: () => void, 
  onSignIn: () => void, 
  onSignOut: () => void,
  onConnect: (url: string) => void, 
  onSync: () => void, 
  onTabChange: (val: string) => void, 
  onAutoSyncChange: (val: boolean) => void, 
  onAppendModeChange: (val: boolean) => void,
  columns: string[],
  exportCols: string[],
  onToggleColumn: (col: string) => void
}) => {
  const [urlInput, setUrlInput] = useState('');

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-2xl shadow-sm overflow-hidden mb-8">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-base)] cursor-pointer bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface)] transition-colors" onClick={onToggle}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="4" fill="#0F9D58"/><rect x="5" y="7" width="14" height="1.5" rx=".75" fill="#fff"/><rect x="5" y="11" width="14" height="1.5" rx=".75" fill="#fff"/><rect x="5" y="15" width="9" height="1.5" rx=".75" fill="#fff"/></svg>
          </div>
          <div>
            <h3 className="text-sm font-black text-[var(--text-base)]">Google Sheets Sync</h3>
            <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-0.5">Export data ke spreadsheet</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
            sheetId ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
          )}>
            <div className={cn("w-1.5 h-1.5 rounded-full", sheetId ? "bg-emerald-500" : "bg-red-500")}></div>
            {sheetId ? 'Connected' : 'Disconnected'}
          </div>
          <ChevronDown size={18} className={cn("text-[var(--text-muted)] transition-transform duration-300", isOpen && "rotate-180")} />
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-3">Akun Google</label>
                    <div className="flex gap-2">
                      <button 
                        onClick={accessToken ? undefined : onSignIn}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all flex-1",
                          accessToken ? "bg-[var(--bg-subtle)] border-[var(--border-base)] text-[var(--text-base)] cursor-default" : "bg-[var(--bg-surface)] border-[var(--border-base)] hover:border-indigo-300 hover:bg-indigo-50/10 text-[var(--text-muted)]"
                        )}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        <span className="text-xs font-bold">{accessToken ? (googleUser?.name || googleUser?.email || 'Connected') : 'Login dengan Google'}</span>
                      </button>
                      {accessToken && (
                        <button onClick={onSignOut} className="btn btn-outline px-3 text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200" title="Logout">
                          <LogOut size={16} />
                        </button>
                      )}
                    </div>
                    {accessToken && googleUser?.email && (
                      <p className="text-[10px] text-emerald-600 font-bold mt-2 flex items-center gap-1">
                        <Check size={10} /> {googleUser.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-3">Spreadsheet ID / URL</label>
                    <div className="flex gap-2">
                      <input 
                        className="input h-10 text-xs" 
                        placeholder="https://docs.google.com/spreadsheets/d/..." 
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                      />
                      <button onClick={() => onConnect(urlInput)} className="btn btn-outline h-10 px-4 text-xs shrink-0">Hubungkan</button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-3">Nama Tab / Sheet</label>
                    <input 
                      className="input h-10 text-xs" 
                      value={sheetTab}
                      onChange={(e) => onTabChange(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-3">Kolom yang di-export <span className="font-medium lowercase tracking-normal">(klik untuk on/off)</span></label>
                    <div className="flex flex-wrap gap-2">
                      {columns.map(col => {
                        const isOn = exportCols.includes(col);
                        return (
                          <button 
                            key={col}
                            onClick={() => onToggleColumn(col)}
                            className={cn(
                              "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all",
                              isOn 
                                ? "bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100" 
                                : "bg-[var(--bg-subtle)] text-[var(--text-muted)] border-[var(--border-base)] hover:bg-[var(--bg-surface)] line-through"
                            )}
                          >
                            {col}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-3">Pengaturan Sync</label>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-base)]">
                        <div>
                          <p className="text-xs font-bold text-[var(--text-base)]">Auto sync setelah fetch</p>
                          <p className="text-[10px] text-[var(--text-muted)] font-medium">Otomatis kirim data setelah Fetch</p>
                        </div>
                        <button 
                          onClick={() => onAutoSyncChange(!autoSync)}
                          className={cn(
                            "w-10 h-5 rounded-full relative transition-colors",
                            autoSync ? "bg-indigo-600" : "bg-[var(--border-base)]"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-3 h-3 bg-[var(--bg-surface)] rounded-full transition-all",
                            autoSync ? "right-1" : "left-1"
                          )}></div>
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-base)]">
                        <div>
                          <p className="text-xs font-bold text-[var(--text-base)]">Mode append</p>
                          <p className="text-[10px] text-[var(--text-muted)] font-medium">Jika off, data lama ditimpa</p>
                        </div>
                        <button 
                          onClick={() => onAppendModeChange(!appendMode)}
                          className={cn(
                            "w-10 h-5 rounded-full relative transition-colors",
                            appendMode ? "bg-indigo-600" : "bg-[var(--border-base)]"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-3 h-3 bg-[var(--bg-surface)] rounded-full transition-all",
                            appendMode ? "right-1" : "left-1"
                          )}></div>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-4 border-t border-[var(--border-base)]">
                    <div className="flex items-center justify-between">
                      <button 
                        onClick={onSync}
                        disabled={!sheetId || isSyncing}
                        className="btn btn-primary h-10 px-6 text-xs bg-emerald-600 hover:bg-emerald-700 border-none shadow-emerald-500/20"
                      >
                        {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : <Database size={14} />}
                        {isSyncing ? 'Syncing...' : 'Sync ke Sheets'}
                      </button>
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                        {lastSync ? `Terakhir: ${lastSync}` : 'Belum pernah sync'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest block">Sync Log</label>
                <div className="bg-black border border-[var(--border-base)] rounded-xl p-4 font-mono text-[10px] h-32 overflow-y-auto space-y-1.5 scrollbar-hide">
                  {syncLogs.length === 0 ? (
                    <div className="text-[var(--text-muted)] italic">[--:--:--] Siap. Login Google dan hubungkan spreadsheet.</div>
                  ) : (
                    syncLogs.map((log, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-[var(--text-muted)] shrink-0">[{log.ts}]</span>
                        <span className={cn(
                          log.type === 'ok' && "text-emerald-400",
                          log.type === 'err' && "text-red-400",
                          log.type === 'info' && "text-blue-400",
                          log.type === 'warn' && "text-amber-400"
                        )}>
                          {log.msg}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [activePage, setActivePage] = useState<string>('dashboard');
  const [dataTab, setDataTab] = useState<'ads' | 'creatives'>('ads');
  const [userSearch, setUserSearch] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regPassConfirm, setRegPassConfirm] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isAuthMode, setIsAuthMode] = useState<'login' | 'register'>('login');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kayaraya_theme');
      if (saved) return saved === 'dark';
      return true; // Default to dark mode
    }
    return true;
  });
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('kayaraya_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('kayaraya_theme', 'light');
    }
  }, [isDarkMode]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [data, setData] = useState<Record<string, { campaigns: Campaign[] }>>({});
  const [toasts, setToasts] = useState<{ id: number, message: string, type: 'success' | 'warn' | 'info' }[]>([]);
  
  // Dashboard State
  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | '7d' | '30d' | 'custom'>('7d');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'fb' | 'google'>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');

  // Google API State
  const [gapiReady, setGapiReady] = useState(false);
  const [gapiError, setGapiError] = useState<string | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [googleTokenExpiry, setGoogleTokenExpiry] = useState(0);
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [sheetIds, setSheetIds] = useState<Record<string, string>>({ ads: '', ca: '' });
  const [sheetTabs, setSheetTabs] = useState<Record<string, string>>({ ads: 'Ads Data', ca: 'Creative Assets' });
  const [connectedSheets, setConnectedSheets] = useState<Record<string, boolean>>({ ads: false, ca: false });
  const [syncLogs, setSyncLogs] = useState<Record<string, { msg: string, type: 'ok' | 'err' | 'info' | 'warn', ts: string }[]>>({ ads: [], ca: [] });
  const [isSyncing, setIsSyncing] = useState<Record<string, boolean>>({ ads: false, ca: false });
  const [lastSync, setLastSync] = useState<Record<string, string>>({ ads: '', ca: '' });
  const [collapsedSync, setCollapsedSync] = useState<Record<string, boolean>>({ ads: false, ca: false });
  const [isSyncPanelOpen, setIsSyncPanelOpen] = useState<Record<string, boolean>>({ ads: true, ca: true });
  const [autoSync, setAutoSync] = useState<Record<string, boolean>>({ ads: true, ca: true });
  const [appendMode, setAppendMode] = useState<Record<string, boolean>>({ ads: true, ca: true });
  const [exportCols, setExportCols] = useState<Record<string, string[]>>({
    ads: ['Tanggal Fetch', 'User', 'Date', 'Platform', 'Product', 'Spend', 'Impressions', 'Clicks', 'Leads', 'CPR'],
    ca: ['Tanggal Fetch', 'Product', 'Performance', 'Leads', 'Spend', 'CPR', 'Creative ID', 'Status', 'Impressions', 'Thruplays'],
  });

  const pendingActionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (currentUser && !fetchUser) {
      setFetchUser(currentUser.name);
    }
  }, [currentUser]);

  // Fetch initial data
  useEffect(() => {
    // Initial data is now handled by Firebase onSnapshot listeners
  }, []);

  useEffect(() => {
    // Handle OAuth popup redirect
    if (window.location.hash.includes('access_token=')) {
      const params = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = params.get('access_token');
      const expiresIn = params.get('expires_in');
      if (accessToken && window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_OAUTH_SUCCESS',
          payload: { access_token: accessToken, expires_in: Number(expiresIn) }
        }, '*');
        window.close();
      }
    }

    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_OAUTH_SUCCESS') {
        const { access_token, expires_in } = event.data.payload;
        setGoogleAccessToken(access_token);
        setGoogleTokenExpiry(Date.now() + (expires_in - 60) * 1000);
        
        if ((window as any).gapi?.client) {
          (window as any).gapi.client.setToken({ access_token });
        }

        try {
          const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: 'Bearer ' + access_token },
          });
          if (r.ok) {
            const user = await r.json();
            setGoogleUser(user);
            allLog('Login berhasil sebagai ' + user.email + '.', 'ok');
            addToast('Login Google berhasil!', 'success');
          }
        } catch (_) {}

        if (pendingActionRef.current) {
          const fn = pendingActionRef.current;
          pendingActionRef.current = null;
          fn();
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const signInGoogle = (pendingFn?: () => void) => {
    if (googleClientId.includes('GANTI_DENGAN') || googleApiKey.includes('GANTI_DENGAN')) {
      addToast('Google API belum dikonfigurasi. Silakan buka Setup API.', 'warn');
      setIsGoogleApiModalOpen(true);
      return;
    }
    if (gapiError) {
      addToast(`Error API: ${gapiError}. Cek konfigurasi API Key.`, 'warn');
      setIsGoogleApiModalOpen(true);
      return;
    }
    if (!gapiReady) {
      addToast('Google API sedang inisialisasi. Silakan tunggu atau refresh halaman.', 'warn');
      initGoogleApis();
      return;
    }

    if (googleAccessToken && Date.now() < googleTokenExpiry) {
      if (pendingFn) pendingFn();
      return;
    }

    if (pendingFn) pendingActionRef.current = pendingFn;
    
    const redirectUri = window.location.origin;
    const cleanClientId = googleClientId.trim();
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${cleanClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(GOOGLE_CONFIG.SCOPES)}&prompt=consent`;
    
    const popup = window.open(authUrl, 'google_oauth', 'width=600,height=700');
    if (!popup) {
      addToast('Popup diblokir oleh browser. Izinkan popup untuk login.', 'err');
    }
  };

  const addSyncLog = (p: string, msg: string, type: 'ok' | 'err' | 'info' | 'warn') => {
    const ts = new Date().toLocaleTimeString('id-ID');
    setSyncLogs(prev => ({
      ...prev,
      [p]: [...(prev[p] || []), { msg, type, ts }]
    }));
  };

  const allLog = (msg: string, type: 'ok' | 'err' | 'info' | 'warn') => {
    ['ads', 'ca'].forEach(p => addSyncLog(p, msg, type));
  };

  useEffect(() => {
    if (!currentUser) {
      fetch('/api/health')
        .then(r => r.json())
        .then(data => {
          if (data.ok) console.log('Server health check passed');
          else console.warn('Server health check failed', data);
        })
        .catch(err => console.error('Server health check error', err));
    }
  }, [currentUser]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!loginEmail || !loginPass) {
      addToast('Email dan password harus diisi!', 'warn');
      return;
    }
    setIsLoggingIn(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPass })
      });
      
      if (!res.ok) {
        const text = await res.text();
        let errorMsg = `Login gagal (Status: ${res.status})`;
        try {
          const errJson = JSON.parse(text);
          errorMsg = errJson.error || errorMsg;
        } catch (e) {
          errorMsg += `: ${text.substring(0, 50)}...`;
        }
        addToast(errorMsg, 'warn');
        return;
      }

      const result = await res.json();
      if (result.ok) {
        setCurrentUser(result.user);
        localStorage.setItem('kayaraya_user', JSON.stringify(result.user));
        addToast(`Selamat datang, ${result.user.name}!`, 'success');
        setLoginEmail('');
        setLoginPass('');
      } else {
        addToast(result.error || 'Login gagal', 'warn');
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err instanceof Error) {
        addToast(`Kesalahan: ${err.message}`, 'warn');
      } else {
        addToast('Terjadi kesalahan koneksi ke server.', 'warn');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleForgotPassword = () => {
    addToast('Fitur reset password dinonaktifkan.', 'info');
  };

  const handleRegister = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!regName || !regEmail || !regPass) {
      addToast('Semua field harus diisi!', 'warn');
      return;
    }
    setIsRegistering(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName, email: regEmail, password: regPass })
      });
      const result = await res.json();
      if (result.ok) {
        const fullUser = {
          ...result.user,
          color: ['#4f46e5', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899'][Math.floor(Math.random() * 6)],
          initials: regName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
          status: 'Aktif',
          createdAt: new Date().toISOString(),
          assignedProducts: [],
          assignedFBAccounts: [],
          assignedGAdsAccounts: []
        };
        
        await fetch('/api/users/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fullUser)
        });

        setCurrentUser(fullUser);
        localStorage.setItem('kayaraya_user', JSON.stringify(fullUser));
        addToast('Pendaftaran berhasil!', 'success');
        setRegName('');
        setRegEmail('');
        setRegPass('');
        setIsAuthMode('login');
      } else {
        addToast(result.error || 'Pendaftaran gagal', 'warn');
      }
    } catch (err) {
      addToast('Terjadi kesalahan koneksi', 'warn');
    } finally {
      setIsRegistering(false);
    }
  };

  // WA Page State
  const [waToken, setWaToken] = useState(localStorage.getItem('kayaraya_wa_token') || '');
  const [waTarget, setWaTarget] = useState('');
  const [waUserSelect, setWaUserSelect] = useState('');
  const [waProductSelect, setWaProductSelect] = useState('all');
  const [waPlatformSelect, setWaPlatformSelect] = useState('all');
  const [waMessage, setWaMessage] = useState('');
  const [isSendingWA, setIsSendingWA] = useState(false);

  // Setup State
  const [fbToken, setFbToken] = useState(localStorage.getItem('kayaraya_fb_token') || '');
  const [gadsRefreshToken, setGadsRefreshToken] = useState(localStorage.getItem('kayaraya_gads_refresh_token') || '');
  const [fbAdvertisers, setFbAdvertisers] = useState<string[]>(() => {
    const saved = localStorage.getItem('kayaraya_fb_advertisers_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && typeof parsed[0] === 'string') return parsed;
        if (Array.isArray(parsed) && typeof parsed[0] === 'object') return parsed.map((a: any) => a.accountId || '').filter(Boolean);
      } catch (e) { console.error('Error parsing fbAdvertisers', e); }
    }
    // Fallback to old key
    const old = localStorage.getItem('kayaraya_fb_advertisers');
    if (old) {
      try {
        const parsed = JSON.parse(old);
        if (Array.isArray(parsed)) return parsed.map((a: any) => typeof a === 'string' ? a : a.accountId || '').filter(Boolean);
      } catch (e) { console.error('Error parsing old fbAdvertisers', e); }
    }
    return [''];
  });
  const [fbDatePreset, setFbDatePreset] = useState('last_7d');
  const [gadsDatePreset, setGadsDatePreset] = useState('LAST_7_DAYS');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [fetchUser, setFetchUser] = useState<string>('');
  const [fetchProduct, setFetchProduct] = useState<string>('all');

  // Ads Data State
  const [adsRawData, setAdsRawData] = useState<any[]>([]);
  const [isAdsLoading, setIsAdsLoading] = useState(false);
  const [gadsAdvertisers, setGadsAdvertisers] = useState<string[]>(() => {
    const saved = localStorage.getItem('kayaraya_gads_advertisers');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) { console.error('Error parsing gadsAdvertisers', e); }
    }
    const oldCid = localStorage.getItem('kayaraya_gads_cid');
    return oldCid ? [oldCid] : [''];
  });

  // Creatives State
  const [fbCreatives, setFbCreatives] = useState<Creative[]>([]);
  const [isCreativesLoading, setIsCreativesLoading] = useState(false);

  // Google API Config State
  const [googleClientId, setGoogleClientId] = useState(localStorage.getItem('kayaraya_google_client_id') || GOOGLE_CONFIG.CLIENT_ID);
  const [googleApiKey, setGoogleApiKey] = useState(localStorage.getItem('kayaraya_google_api_key') || GOOGLE_CONFIG.API_KEY);

  // Google API Initialization
  const initGoogleApis = useCallback(() => {
    if (googleClientId.includes('GANTI_DENGAN') || googleApiKey.includes('GANTI_DENGAN')) {
      allLog('Google API belum dikonfigurasi. Silakan buka Setup API.', 'warn');
      return;
    }

    const loadGapi = () => {
      const initClient = async () => {
        try {
          await (window as any).gapi.client.init({
            apiKey: googleApiKey,
            discoveryDocs: GOOGLE_CONFIG.DISCOVERY
          });
          setGapiReady(true);
          setGapiError(null);
          allLog('Google Sheets API siap.', 'ok');
        } catch (err: any) {
          const msg = err.message || err.details || JSON.stringify(err);
          setGapiError(msg);
          allLog('Gagal init Google API: ' + msg, 'err');
        }
      };

      const checkGapi = () => {
        if ((window as any).gapi) {
          if ((window as any).gapi.client) {
            initClient();
          } else {
            (window as any).gapi.load('client', initClient);
          }
        } else {
          setTimeout(checkGapi, 500);
        }
      };
      checkGapi();
    };

    loadGapi();
  }, [googleClientId, googleApiKey]);

  useEffect(() => {
    initGoogleApis();
  }, [initGoogleApis]);

  // User Management State
  const [isGoogleApiModalOpen, setIsGoogleApiModalOpen] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);
  
  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user ? 'Logged in' : 'Logged out');
      
      // Set auth ready immediately so we don't stay on the splash screen
      setIsAuthReady(true);

      if (user) {
        setIsProfileLoading(true);
        try {
          // Sync with Express API instead of Firestore
          const res = await fetch('/api/users');
          const result = await res.json();
          const existingUser = result.ok ? result.users.find((u: any) => u.id === user.uid || u.email === user.email) : null;

          if (existingUser) {
            setCurrentUser(existingUser);
            localStorage.setItem('kayaraya_user', JSON.stringify(existingUser));
          } else {
            const newUser: User = {
              id: user.uid,
              name: user.displayName || 'User',
              email: user.email || '',
              photoURL: user.photoURL || '',
              role: user.email === 'lkbimrbob@gmail.com' ? 'admin' : 'user',
              color: ['#4f46e5', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899'][Math.floor(Math.random() * 6)],
              initials: (user.displayName || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
              status: 'Aktif',
              createdAt: new Date().toISOString(),
              assignedProducts: [],
              assignedFBAccounts: [],
              assignedGAdsAccounts: []
            };
            
            await fetch('/api/users/add', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newUser)
            });

            setCurrentUser(newUser);
            localStorage.setItem('kayaraya_user', JSON.stringify(newUser));
            fetchUsers();
          }
        } catch (err) {
          console.error('Error syncing user with Express API:', err);
          addToast('Gagal sinkronisasi profil user', 'warn');
        } finally {
          setIsProfileLoading(false);
        }
      } else {
        setCurrentUser(null);
        localStorage.removeItem('kayaraya_user');
        setIsProfileLoading(false);
      }
    }, (error) => {
      console.error('Auth state error:', error);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Safety timeout for Auth Ready
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isAuthReady) {
        console.warn('Auth ready timeout reached, forcing ready state');
        setIsAuthReady(true);
      }
    }, 8000); 
    return () => clearTimeout(timer);
  }, [isAuthReady]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const result = await res.json();
      if (result.ok) {
        setUsers(result.users);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  // Real-time Users Listener (Replaced with polling/manual fetch for Express compatibility)
  useEffect(() => {
    if (!currentUser) return;
    fetchUsers();
    const interval = setInterval(fetchUsers, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [currentUser]);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/data');
      const result = await res.json();
      if (result.ok) {
        setData(result.data);
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    }
  };

  // Real-time Data Listener (Replaced with polling/manual fetch for Express compatibility)
  useEffect(() => {
    if (!currentUser) return;
    fetchCampaigns();
    const interval = setInterval(fetchCampaigns, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleFirebaseLogin = async () => {
    setIsLoggingIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
      addToast('Login berhasil!', 'success');
    } catch (err: any) {
      addToast('Login gagal: ' + err.message, 'warn');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleFirebaseLogout = async () => {
    try {
      await signOut(auth);
      addToast('Berhasil logout', 'info');
    } catch (err: any) {
      addToast('Logout gagal', 'warn');
    }
  };
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');
  const [newUserWhatsApp, setNewUserWhatsApp] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserPhotoURL, setNewUserPhotoURL] = useState('');
  const [newUserStatus, setNewUserStatus] = useState<'Aktif' | 'Nonaktif'>('Aktif');
  const [newUserAssignedProducts, setNewUserAssignedProducts] = useState<string[]>([]);

  useEffect(() => {
    localStorage.setItem('kayaraya_users', JSON.stringify(users));
  }, [users]);

  const handleGoogleSignIn = () => {
    signInGoogle();
  };

  const handleGoogleSignOut = () => {
    setGoogleAccessToken('');
    setGoogleUser(null);
    setGoogleTokenExpiry(0);
    addToast('Berhasil logout dari akun Google', 'info');
  };

  const connectSheet = async (p: string, url: string) => {
    if (!googleAccessToken || Date.now() >= googleTokenExpiry) {
      signInGoogle(() => connectSheet(p, url));
      return;
    }
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const id = match ? match[1] : url.trim();
    if (!id) {
      addToast('Masukkan URL spreadsheet yang valid.', 'warn');
      return;
    }

    try {
      addSyncLog(p, 'Memverifikasi spreadsheet...', 'info');
      const response = await (window as any).gapi.client.sheets.spreadsheets.get({
        spreadsheetId: id,
      });
      if (response.status === 200) {
        setSheetIds(prev => ({ ...prev, [p]: id }));
        setConnectedSheets(prev => ({ ...prev, [p]: true }));
        addSyncLog(p, `Terhubung ke: ${response.result.properties.title}`, 'ok');
        addToast('Spreadsheet terhubung!', 'success');
      }
    } catch (err: any) {
      const msg = err.result?.error?.message || 'Gagal terhubung ke spreadsheet.';
      addSyncLog(p, msg, 'err');
      addToast(msg, 'warn');
    }
  };

  const doSync = async (p: string, dataToSync: any[], forceAppend?: boolean) => {
    if (!googleAccessToken || !sheetIds[p]) {
      if (!googleAccessToken) addToast('Login Google dulu.', 'warn');
      return;
    }
    
    setIsSyncing(prev => ({ ...prev, [p]: true }));
    const tabName = sheetTabs[p];
    const isAppend = forceAppend !== undefined ? forceAppend : appendMode[p];
    addSyncLog(p, `Memulai sync ke tab "${tabName}" (${isAppend ? 'append' : 'overwrite'})...`, 'info');
    
    const activeCols = exportCols[p];
    const now = () => new Date().toLocaleString('id-ID');

    const colExtractors: Record<string, Record<string, (r: any) => any>> = {
      ads: {
        'Tanggal Fetch': r => r.timestamp,
        'User': r => r.user_name,
        'Date': r => r.date_range,
        'Platform': r => r.platform,
        'Product': r => r.product || '–',
        'Spend': r => r.spend || 0,
        'Impressions': r => parseInt(r.impressions) || 0, 
        'Clicks': r => parseInt(r.clicks) || 0,
        'Leads': r => r.leads || 0, 
        'CPR': r => Math.round(r.cpr || 0),
      },
      ca: {
        'Tanggal Fetch': () => now(), 
        'Product': r => r.product || r.produk || '–',
        'Performance': r => r.performance_label || r.performance_status || '–', 
        'Leads': r => r.leads || 0,
        'Spend': r => r.spend || 0,
        'CPR': r => Math.round(r.cpr || 0),
        'Creative ID': r => r.creative_id || r.id || '–', 
        'Status': r => r.status || 'UNKNOWN',
        'Impressions': r => r.impressions || 0, 
        'Thruplays': r => r.thruplays || 0,
      },
    };

    const ex = colExtractors[p];
    const values = [activeCols];
    dataToSync.forEach(r => values.push(activeCols.map(col => ex[col] ? ex[col](r) : '')));

    try {
      const range = `'${tabName}'!A1`;
      const valueInputOption = 'USER_ENTERED';
      
      if (isAppend) {
        // Check if headers exist, if not add them
        try {
          const checkHeader = await (window as any).gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: sheetIds[p],
            range: `'${tabName}'!A1:Z1`,
          });
          
          if (!checkHeader.result.values || checkHeader.result.values.length === 0) {
            await (window as any).gapi.client.sheets.spreadsheets.values.update({
              spreadsheetId: sheetIds[p],
              range: `'${tabName}'!A1`,
              valueInputOption,
              resource: { values: [activeCols] }
            });
          }
        } catch (e) {}

        await (window as any).gapi.client.sheets.spreadsheets.values.append({
          spreadsheetId: sheetIds[p],
          range: `'${tabName}'!A2`,
          valueInputOption,
          insertDataOption: 'INSERT_ROWS',
          resource: { values: values.slice(1) }
        });
      } else {
        // Overwrite mode: Clear and then update
        await (window as any).gapi.client.sheets.spreadsheets.values.clear({
          spreadsheetId: sheetIds[p],
          range: `'${tabName}'!A1:Z1000`,
        });
        await (window as any).gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId: sheetIds[p],
          range: `'${tabName}'!A1`,
          valueInputOption,
          resource: { values }
        });
      }

      addSyncLog(p, `${dataToSync.length} baris berhasil di-sync ke "${tabName}".`, 'ok');
      setLastSync(prev => ({ ...prev, [p]: new Date().toLocaleString('id-ID') }));
      addToast('Sync berhasil!', 'success');
    } catch (err: any) {
      if (err.status === 401) {
        addSyncLog(p, 'Token expired — memperbarui token...', 'warn');
        signInGoogle(() => doSync(p, dataToSync));
        return;
      }
      const msg = err.result?.error?.message || 'Gagal melakukan sync.';
      addSyncLog(p, msg, 'err');
      addToast(msg, 'warn');
    } finally {
      setIsSyncing(prev => ({ ...prev, [p]: false }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        addToast('Ukuran foto terlalu besar (maks 1MB)', 'warn');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        callback(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddUser = async () => {
    if (!newUserName || !newUserEmail || !newUserPass) {
      addToast('Nama, Email, dan Password harus diisi!', 'warn');
      return;
    }
    setIsSavingUser(true);
    try {
      const newUser: User = {
        id: 'user_' + Date.now(),
        name: newUserName,
        email: newUserEmail,
        pass: newUserPass,
        photoURL: newUserPhotoURL,
        role: newUserRole,
        color: ['#4f46e5', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899'][Math.floor(Math.random() * 6)],
        initials: newUserName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
        whatsapp: newUserWhatsApp,
        status: newUserStatus,
        createdAt: new Date().toISOString(),
        assignedProducts: newUserAssignedProducts,
        assignedFBAccounts: [],
        assignedGAdsAccounts: []
      };

      const newUserDoc: User = {
        ...newUser,
        id: generateLocalId(),
      };

      const res = await fetch('/api/users/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserDoc)
      });
      
      const result = await res.json();

      if (result.ok) {
        addToast('User berhasil ditambahkan', 'success');
        fetchUsers();
        setIsAddingUser(false);
        setNewUserName('');
        setNewUserEmail('');
        setNewUserRole('user');
        setNewUserWhatsApp('');
        setNewUserPass('');
        setNewUserPhotoURL('');
        setNewUserStatus('Aktif');
        setNewUserAssignedProducts([]);
      } else {
        throw new Error(result.error || 'Gagal menambahkan user');
      }
    } catch (error: any) {
      console.error("Error adding user:", error);
      addToast('Gagal menambahkan user: ' + error.message, 'warn');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleUpdateUserAdmin = async (userId: string, updates: Partial<User>) => {
    setIsSavingUser(true);
    try {
      const res = await fetch('/api/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, ...updates })
      });
      const result = await res.json();
      if (result.ok) {
        addToast('User berhasil diperbarui', 'success');
        fetchUsers();
        setEditingUser(null);
      } else {
        throw new Error(result.error || 'Gagal memperbarui user');
      }
    } catch (error: any) {
      console.error("Error updating user:", error);
      addToast('Gagal memperbarui user: ' + error.message, 'warn');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    // Optimistic update: remove from UI immediately
    const previousUsers = [...users];
    setUsers(prev => prev.filter(u => u.id !== userId));

    try {
      const res = await fetch('/api/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId })
      });
      const result = await res.json();
      if (result.ok) {
        addToast('User berhasil dihapus permanen', 'success');
        // fetchUsers() is still good to ensure sync with server
        fetchUsers();
      } else {
        // Rollback on error
        setUsers(previousUsers);
        throw new Error(result.error || 'Gagal menghapus user');
      }
    } catch (error: any) {
      console.error("Error deleting user:", error);
      // Rollback on error
      setUsers(previousUsers);
      addToast('Gagal menghapus user: ' + error.message, 'warn');
    }
  };

  const toggleColumn = (p: string, col: string) => {
    setExportCols(prev => {
      const current = prev[p as keyof typeof prev] || [];
      const next = current.includes(col) 
        ? current.filter(c => c !== col)
        : [...current, col];
      return { ...prev, [p]: next };
    });
  };
  const addToast = (message: string, type: 'success' | 'warn' | 'info' | 'err' = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const logActivity = (action: string, details: string = '') => {
    if (!currentUser) return;
    const newLog = {
      id: 'log_' + Date.now(),
      userId: currentUser.id,
      userName: currentUser.name,
      action,
      details,
      timestamp: new Date().toISOString()
    };
    setActivityLogs(prev => [newLog, ...prev].slice(0, 100));
  };

  const handleLogout = async () => {
    if (currentUser) {
      logActivity('logout', `${currentUser.name} logged out`);
    }
    await handleFirebaseLogout();
  };

  // --- API Logic ---

  const testFbConnection = async () => {
    const token = fbToken.trim();
    const accId = fbAdvertisers.find(id => id.trim() !== '');

    if (!token || !accId) {
      addToast('Isi Access Token & minimal satu Ad Account ID di daftar Tim', 'warn');
      return;
    }
    
    let accountId = accId;
    if (!accountId.startsWith('act_')) {
      accountId = 'act_' + accountId;
    }

    addToast(`Menghubungkan ke Facebook (${accountId})...`, 'info');
    try {
      const params = new URLSearchParams({
        fields: 'name,account_id,account_status,currency',
        access_token: token
      });
      const url = `https://graph.facebook.com/v21.0/${accountId}?${params.toString()}`;
      const res = await fetch(url).catch(e => {
        if (e.message === 'Failed to fetch') {
          throw new Error('Koneksi diblokir browser. Matikan AdBlocker/uBlock dan coba lagi.');
        }
        throw e;
      });
      const result = await res.json();
      if (result.error) throw new Error(`${result.error.message} (Code: ${result.error.code})`);
      
      setFbToken(token);
      localStorage.setItem('kayaraya_fb_token', token);
      addToast(`Terhubung ke: ${result.name}`);
    } catch (err: any) {
      addToast('Gagal: ' + err.message, 'warn');
    }
  };

  const runDailyAutomation = async () => {
    if (!currentUser || currentUser.role === 'admin') return;

    const fbTokenTrimmed = fbToken.trim();
    const fbActiveIds = fbAdvertisers.filter(id => id.trim() !== '');
    const gadsActiveIds = gadsAdvertisers.filter(id => id.trim() !== '');

    if ((!fbTokenTrimmed || fbActiveIds.length === 0) && gadsActiveIds.length === 0) {
      logActivity('automation_failed', 'Missing API credentials');
      addToast('Auto-Fetch gagal: Kredensial API belum lengkap', 'warn');
      return;
    }

    addToast('Memulai proses Auto-Fetch & Sync harian...', 'info');
    logActivity('automation_start', 'Memulai auto-fetch harian (15:30)');

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Format YYYY-MM-DD
    const startStr = yesterday.toLocaleDateString('en-CA'); 
    const endStr = today.toLocaleDateString('en-CA');
    const dateRangeStr = `${startStr} to ${endStr}`;
    const nowStr = today.toLocaleString('id-ID');

    let allProcessed: any[] = [];
    let fbSuccess = 0;
    let gadsSuccess = 0;
    let errors: string[] = [];

    // 1. Fetch FB
    if (fbTokenTrimmed && fbActiveIds.length > 0) {
      for (const id of fbActiveIds) {
        let accountId = id.trim();
        if (!accountId.startsWith('act_')) accountId = 'act_' + accountId;
        try {
          const res = await fetch('/api/fb-ads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accountId,
              token: fbTokenTrimmed,
              datePreset: 'custom',
              startDate: startStr,
              endDate: endStr
            })
          });
          const result = await res.json();
          if (!result.ok) throw new Error(result.error);
          
          (result.data || []).forEach((c: any) => {
            allProcessed.push({
              id: c.campaign_id,
              name: c.campaign_name,
              spend: parseFloat(c.spend || '0'),
              impressions: c.impressions || '0',
              clicks: c.clicks || '0',
              leads: 0,
              platform: 'Meta',
              timestamp: nowStr,
              date_range: dateRangeStr,
              user_name: currentUser.name,
              product: 'all',
            });
          });
          fbSuccess++;
        } catch (e: any) {
          errors.push(`FB (${id}): ${e.message}`);
        }
      }
    }

    // 2. Fetch GAds
    if (gadsActiveIds.length > 0) {
      for (const id of gadsActiveIds) {
        const cid = id.trim().replace(/-/g, '');
        try {
          const res = await fetch('/api/google-ads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customerId: cid,
              dateRange: 'CUSTOM',
              startDate: startStr,
              endDate: endStr
            })
          });
          const result = await res.json();
          if (!result.ok) throw new Error(result.error);

          (result.data || []).forEach((c: any) => {
            allProcessed.push({
              id: c.campaign.id,
              name: c.campaign.name,
              spend: (c.metrics.costMicros || 0) / 1000000,
              impressions: c.metrics.impressions || '0',
              clicks: c.metrics.clicks || '0',
              leads: c.metrics.conversions || 0,
              platform: 'Google',
              timestamp: nowStr,
              date_range: dateRangeStr,
              user_name: currentUser.name,
              product: 'all',
            });
          });
          gadsSuccess++;
        } catch (e: any) {
          errors.push(`GAds (${id}): ${e.message}`);
        }
      }
    }

    setAdsRawData(allProcessed);

    // 3. Auto Sync
    let syncStatus = 'Skipped (No Google Sheets connected)';
    if (googleAccessToken && sheetIds.ads) {
      try {
        await doSync('ads', allProcessed, true);
        syncStatus = 'Success';
      } catch (e: any) {
        syncStatus = `Failed: ${e.message}`;
        errors.push(`Sync: ${e.message}`);
      }
    } else {
      errors.push('Google Sheets tidak terhubung');
    }

    // 4. Log & Summary
    const summary = `Auto-Fetch Selesai. Meta: ${fbSuccess} akun, Google: ${gadsSuccess} akun. Total Data: ${allProcessed.length}. Sync: ${syncStatus}.`;
    logActivity('automation_complete', summary + (errors.length > 0 ? ` Errors: ${errors.join(', ')}` : ''));
    
    addToast(`Automasi Selesai! Total data: ${allProcessed.length}`, errors.length > 0 ? 'warn' : 'success');
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      
      // 15:30 local time
      if (hours === 15 && minutes === 30) {
        const todayStr = now.toLocaleDateString('en-CA');
        const lastRun = localStorage.getItem('kayaraya_last_auto_sync');
        
        if (lastRun !== todayStr) {
          localStorage.setItem('kayaraya_last_auto_sync', todayStr);
          runDailyAutomation();
        }
      }
    }, 60000); // check every minute
    
    return () => clearInterval(interval);
  }, [currentUser, fbToken, fbAdvertisers, gadsAdvertisers, googleAccessToken, sheetIds]);

  const saveAutomationConfig = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentUser.id,
          fbToken,
          gadsRefreshToken,
          fbAdvertisers,
          gadsAdvertisers,
          waToken,
          waTarget,
          sheetIds,
          automationEnabled: true
        })
      });
      const result = await res.json();
      if (result.ok) {
        addToast('Automation configuration saved to cloud!');
        localStorage.setItem('kayaraya_fb_token', fbToken);
        localStorage.setItem('kayaraya_gads_refresh_token', gadsRefreshToken);
        localStorage.setItem('kayaraya_wa_token', waToken);
        localStorage.setItem('kayaraya_wa_target', waTarget);
        localStorage.setItem('kayaraya_fb_advertisers_v2', JSON.stringify(fbAdvertisers));
        localStorage.setItem('kayaraya_gads_advertisers', JSON.stringify(gadsAdvertisers));
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      addToast(`Failed to save config: ${err.message}`, 'err');
    }
  };

  const fetchAdsData = async () => {
    const fbTokenTrimmed = fbToken.trim();
    const fbActiveIds = fbAdvertisers.filter(id => id.trim() !== '');
    const gadsActiveIds = gadsAdvertisers.filter(id => id.trim() !== '');

    if ((!fbTokenTrimmed || fbActiveIds.length === 0) && gadsActiveIds.length === 0) {
      addToast('Lengkapi konfigurasi Facebook Ads atau Google Ads terlebih dahulu', 'warn');
      return;
    }

    setIsAdsLoading(true);
    addToast('Mengambil data dari Facebook & Google Ads...', 'info');
    
    try {
      let allProcessed: any[] = [];
      const now = new Date().toLocaleString('id-ID');

      // Fetch Facebook Ads
      if (fbTokenTrimmed && fbActiveIds.length > 0) {
        const fbByDate: Record<string, { spend: number, impressions: number, clicks: number, leads: number }> = {};

        for (const id of fbActiveIds) {
          let accountId = id.trim();
          if (!accountId.startsWith('act_')) {
            accountId = 'act_' + accountId;
          }

          const res = await fetch('/api/fb-ads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accountId,
              token: fbTokenTrimmed,
              datePreset: fbDatePreset,
              startDate,
              endDate
            })
          });
          
          const result = await res.json();

          if (!result.ok) {
            console.error(`FB API Error (${id}):`, result.error);
            addToast(`Gagal ambil data FB ${id}: ${result.error}`, 'warn');
            continue;
          }
          
          (result.data || []).forEach((c: any) => {
            const spend = parseFloat(c.spend) || 0;
            const impressions = parseInt(c.impressions) || 0;
            if (spend === 0 && impressions === 0) return;

            const date = c.date_start;
            if (!fbByDate[date]) fbByDate[date] = { spend: 0, impressions: 0, clicks: 0, leads: 0 };

            const actions = c.actions || [];
            const leadAct = actions.find((a: any) => a.action_type === 'lead' || a.action_type === 'onsite_conversion.lead_grouped');
            const leads = leadAct ? parseInt(leadAct.value) : 0;
            
            fbByDate[date].impressions += impressions;
            fbByDate[date].clicks += parseInt(c.clicks) || 0;
            fbByDate[date].spend += spend;
            fbByDate[date].leads += leads;
          });
        }

        Object.entries(fbByDate).forEach(([date, stats]) => {
          if (stats.spend > 0 || stats.impressions > 0) {
            allProcessed.push({
              id: `fb_${date}`,
              platform: 'Facebook',
              impressions: stats.impressions,
              clicks: stats.clicks,
              spend: stats.spend,
              leads: stats.leads,
              ctr: stats.impressions > 0 ? ((stats.clicks / stats.impressions) * 100).toFixed(2) + '%' : '0.00%',
              cpr: stats.leads > 0 ? stats.spend / stats.leads : 0,
              timestamp: now,
              date_range: date,
              user_name: fetchUser || currentUser?.name || 'Unknown',
              product: fetchProduct,
            });
          }
        });
      }

      // Fetch Google Ads
      if (gadsActiveIds.length > 0) {
        const gaByDate: Record<string, { spend: number, impressions: number, clicks: number, leads: number }> = {};

        for (const id of gadsActiveIds) {
          const payload: any = {
            customerId: id.replace(/\D/g, ''),
            includePaused: true,
            gadsRefreshToken: gadsRefreshToken.trim()
          };
          
          if (gadsDatePreset === 'CUSTOM') {
            payload.startDate = startDate.replace(/-/g, '');
            payload.endDate = endDate.replace(/-/g, '');
            payload.dateRange = 'CUSTOM';
          } else {
            payload.dateRange = gadsDatePreset;
          }

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);

          const res = await fetch('/api/google-ads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
          }).catch(e => {
            if (e.name === 'AbortError') {
              throw new Error(`Koneksi timeout. Proses pengambilan data Google Ads memakan waktu terlalu lama (> 30 detik) untuk ID ${id}.`);
            }
            throw new Error(`Koneksi ke server lokal gagal: ${e.message}`);
          }).finally(() => clearTimeout(timeoutId));
          
          let result;
          let rawText = '';
          try {
            rawText = await res.text();
            if (rawText.includes('<title>Starting Server...</title>')) {
              throw new Error('Server sedang memulai ulang. Silakan tunggu beberapa detik dan coba lagi.');
            }
            result = JSON.parse(rawText);
          } catch (e: any) {
            if (e.message.includes('Server sedang memulai ulang')) {
              throw e;
            }
            console.error("Raw response:", rawText);
            throw new Error('Server mengembalikan respons yang tidak valid.');
          }

          if (!result.ok) {
            console.error(`GAds API Error (${id}):`, result.error);
            addToast(`Gagal ambil data GAds ${id}: ${result.error}`, 'warn');
            continue;
          }

          (result.campaigns || []).forEach((c: any) => {
            const spend = parseFloat(c.spend) || 0;
            const impressions = parseInt(c.impressions) || 0;
            if (spend === 0 && impressions === 0) return;

            const date = c.tanggal;
            if (!gaByDate[date]) gaByDate[date] = { spend: 0, impressions: 0, clicks: 0, leads: 0 };

            const conv = parseFloat(c.conversions) || 0;
            
            gaByDate[date].impressions += impressions;
            gaByDate[date].clicks += parseInt(c.clicks) || 0;
            gaByDate[date].spend += spend;
            gaByDate[date].leads += Math.round(conv);
          });
        }

        Object.entries(gaByDate).forEach(([date, stats]) => {
          if (stats.spend > 0 || stats.impressions > 0) {
            allProcessed.push({
              id: `ga_${date}`,
              platform: 'Google',
              impressions: stats.impressions,
              clicks: stats.clicks,
              spend: stats.spend,
              leads: stats.leads,
              ctr: stats.impressions > 0 ? ((stats.clicks / stats.impressions) * 100).toFixed(2) + '%' : '0.00%',
              cpr: stats.leads > 0 ? stats.spend / stats.leads : 0,
              timestamp: now,
              date_range: date,
              user_name: fetchUser || currentUser?.name || 'Unknown',
              product: fetchProduct,
            });
          }
        });
      }

      setAdsRawData(allProcessed);
      addToast(`Berhasil mengambil total ${allProcessed.length} data harian`);
      
      // Auto import to WA menu
      await importAdsToApp(allProcessed);
      
      if (autoSync.ads && googleAccessToken && sheetIds.ads) {
        doSync('ads', allProcessed);
      }
    } catch (err: any) {
      addToast('Gagal: ' + err.message, 'warn');
    } finally {
      setIsAdsLoading(false);
    }
  };

  const handleEditLeads = (index: number, val: string) => {
    const newVal = parseInt(val) || 0;
    const updated = [...adsRawData];
    updated[index] = { 
      ...updated[index], 
      leads: newVal,
      cpr: newVal > 0 ? updated[index].spend / newVal : 0
    };
    setAdsRawData(updated);
  };

  const importAdsToApp = async (dataToImport?: any[] | React.MouseEvent) => {
    const rawData = Array.isArray(dataToImport) ? dataToImport : adsRawData;
    if (rawData.length === 0) return;
    const uid = currentUser?.id;
    if (!uid) return;
    
    const newCampaigns: Campaign[] = rawData.map(c => {
      const camp: any = {
        id: c.id,
        name: c.platform + ' Ads Total',
        platform: c.platform === 'Facebook' ? 'fb' : 'google',
        product: fetchProduct === 'all' ? PRODUCTS[0] : fetchProduct,
        spend: Math.round(c.spend || 0),
        leads: c.leads || 0,
        ctr: typeof c.ctr === 'string' ? c.ctr.replace('%', '') : (c.ctr || 0).toFixed(2),
        tanggal: c.date_range || new Date().toLocaleDateString('id-ID'),
        date_range: c.date_range || '',
        impressions: c.impressions || 0,
        clicks: c.clicks || 0,
        user_id: users.find(u => u.name === (fetchUser || currentUser?.name))?.id || uid,
        user_name: fetchUser || currentUser?.name || 'Unknown'
      };

      if (c.platform === 'Facebook') camp.fb_campaign_id = c.id;
      if (c.platform === 'Google') camp.gads_campaign_id = c.id;
      
      return camp as Campaign;
    });

    try {
      const merged = [...newCampaigns];

      // Save to Express API instead of Firestore
      const groupedByUserId: Record<string, Campaign[]> = {};
      merged.forEach(c => {
        if (!groupedByUserId[c.user_id]) groupedByUserId[c.user_id] = [];
        groupedByUserId[c.user_id].push(c);
      });

      for (const [userId, userCamps] of Object.entries(groupedByUserId)) {
        await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, campaigns: userCamps })
        });
      }
      
      fetchCampaigns();
      addToast(`Berhasil mengimport ${rawData.length} kampanye`);
      const fbToDateRange: Record<string, string> = {
        'today': 'today',
        'yesterday': 'yesterday',
        'last_7d': '7d',
        'last_30d': '30d',
        'custom': 'custom'
      };
      setDateRange(fbToDateRange[fbDatePreset] as any);
    } catch (err: any) {
      console.error('Firebase Save Error:', err);
      addToast('Gagal menyimpan data ke Firebase: ' + (err.message || 'Unknown error'), 'warn');
    }
  };

  const testGadsConnection = async () => {
    const cid = gadsAdvertisers.find(id => id.trim() !== '');

    if (!cid) {
      addToast('Isi minimal satu Customer ID di daftar', 'warn');
      return;
    }
    addToast(`Menghubungkan ke Google Ads (${cid})...`, 'info');
    try {
      const res = await fetch(`/api/google-ads/test?gadsRefreshToken=${encodeURIComponent(gadsRefreshToken)}`).catch(e => {
        throw new Error(`Koneksi ke server lokal gagal: ${e.message}`);
      });
      
      let result;
      let rawText = '';
      try {
        rawText = await res.text();
        if (rawText.includes('<title>Starting Server...</title>')) {
          throw new Error('Server sedang memulai ulang. Silakan tunggu beberapa detik dan coba lagi.');
        }
        result = JSON.parse(rawText);
      } catch (e: any) {
        if (e.message.includes('Server sedang memulai ulang')) {
          throw e;
        }
        console.error("Raw response:", rawText);
        throw new Error('Server mengembalikan respons yang tidak valid.');
      }

      if (!result.ok) {
        throw new Error(result.error || 'Koneksi gagal. Periksa kembali API Keys Anda di panel Secrets.');
      }
      
      localStorage.setItem('kayaraya_gads_cid', cid);
      addToast('Google Ads terhubung!');
    } catch (err: any) {
      addToast('Gagal: ' + err.message, 'warn');
    }
  };



  const fetchFbCreatives = async () => {
    const token = fbToken.trim();
    const activeIds = fbAdvertisers.filter(id => id.trim() !== '');

    if (!token || activeIds.length === 0) {
      addToast('Isi Access Token & minimal satu Ad Account ID di daftar Tim', 'warn');
      return;
    }

    setIsCreativesLoading(true);
    addToast(`Mengambil data Creative dari ${activeIds.length} akun...`, 'info');
    
    try {
      let allCreatives: Creative[] = [];

      for (const id of activeIds) {
        let accountId = id.trim();
        if (!accountId.startsWith('act_')) {
          accountId = 'act_' + accountId;
        }

        let insightsQuery = '';
        if (fbDatePreset === 'custom') {
          const range = { since: startDate, until: endDate };
          insightsQuery = `insights.time_range(${JSON.stringify(range)})`;
        } else {
          insightsQuery = `insights.date_preset(${fbDatePreset})`;
        }

        const fields = `name,status,creative{id,thumbnail_url,image_url,effective_object_story_id},${insightsQuery}{impressions,spend,actions,video_thruplay_watched_actions}`;
        const url = `https://graph.facebook.com/v21.0/${accountId}/ads?fields=${encodeURIComponent(fields)}&limit=100&access_token=${token}`;

        const res = await fetch(url).catch(e => {
          if (e.message === 'Failed to fetch') {
            throw new Error('Koneksi diblokir browser. Matikan AdBlocker/uBlock dan coba lagi.');
          }
          throw e;
        });
        const result = await res.json();

        if (result.error) {
          console.error(`FB Creative Error (${id}):`, result.error);
          addToast(`Gagal ambil creative ${id}: ${result.error.message}`, 'warn');
          continue;
        }

        const creatives: Creative[] = (result.data || []).map((ad: any) => {
          const insight = ad.insights?.data?.[0] || {};
          const thruplays = parseInt(insight.video_thruplay_watched_actions?.find((ac: any) => ac.action_type === 'video_thruplay')?.value || '0');
          
          const actions = insight.actions || [];
          const leadsAction = actions.find((a: any) => a.action_type === 'lead' || a.action_type === 'offsite_conversion.fb_pixel_lead' || a.action_type === 'onsite_conversion.lead_grouped');
          const leads = parseInt(leadsAction?.value || '0');

          const storyId = ad.creative?.effective_object_story_id;
          let linkKonten = '';
          if (storyId) {
            const parts = storyId.split('_');
            linkKonten = parts.length === 2 ? `https://www.facebook.com/${parts[0]}/posts/${parts[1]}/` : `https://www.facebook.com/${storyId}/`;
          }

          const productName = PRODUCTS.find(p => ad.name.toLowerCase().includes(p.toLowerCase())) || 'Umum';
          const isVideo = ad.creative?.thumbnail_url?.includes('video') || ad.name.toLowerCase().includes('video');

          return {
            id: ad.creative?.id || 'N/A',
            name: ad.creative?.name || ad.name,
            status: ad.status,
            thumbnail_url: ad.creative?.thumbnail_url || ad.creative?.image_url,
            ad_id: ad.id,
            ad_name: ad.name,
            advertiser_name: id,
            link_konten: linkKonten,
            produk: productName,
            format_konten: isVideo ? 'Video' : 'Image',
            impressions: parseInt(insight.impressions || '0'),
            leads: leads,
            spend: parseFloat(insight.spend || '0'),
            cpr: leads > 0 ? parseFloat(insight.spend || '0') / leads : 0,
            performance_status: leads >= 10 ? 'Winning' : leads > 2 ? 'Good' : 'Worst',
            thruplays: thruplays,
          };
        }).filter((c: any) => (c.status === 'ACTIVE' || c.status === 'PAUSED') && (c.spend || 0) > 0);

        allCreatives = [...allCreatives, ...creatives];
      }

      setFbCreatives(allCreatives);
      addToast(`Berhasil mengambil total ${allCreatives.length} Creative ID`);

      if (autoSync.ca && googleAccessToken && sheetIds.ca) {
        doSync('ca', allCreatives);
      }
    } catch (err: any) {
      addToast('Gagal: ' + err.message, 'warn');
    } finally {
      setIsCreativesLoading(false);
    }
  };

  // --- Data Logic ---

  const getFilteredCampaigns = () => {
    if (!currentUser) return [];
    
    let usersToInclude = currentUser.role === 'admin' 
      ? (userFilter === 'all' ? users : users.filter(u => u.id === userFilter))
      : [currentUser];

    let campaigns: (Campaign & { user: User })[] = [];
    usersToInclude.forEach(u => {
      if (data[u.id]) {
        data[u.id].campaigns.forEach(c => campaigns.push({ ...c, user: u }));
      }
    });

    if (platformFilter !== 'all') campaigns = campaigns.filter(c => c.platform === platformFilter);
    if (productFilter !== 'all') campaigns = campaigns.filter(c => c.product === productFilter);

    return campaigns.map(c => ({
      ...c,
      spend: Math.round(c.spend),
      leads: Math.round(c.leads),
    }));
  };

  const campaigns = getFilteredCampaigns();
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalLeads = campaigns.reduce((s, c) => s + c.leads, 0);
  const fbSpend = campaigns.filter(c => c.platform === 'fb').reduce((s, c) => s + c.spend, 0);
  const gSpend = campaigns.filter(c => c.platform === 'google').reduce((s, c) => s + c.spend, 0);

  // --- WA Logic ---

  const generateWAMessage = () => {
    const uid = waUserSelect || currentUser?.id;
    if (!uid) return;
    const user = users.find(u => u.id === uid);
    if (!user) return;

    let userCamps = data[uid]?.campaigns || [];
    if (waProductSelect !== 'all') userCamps = userCamps.filter(c => c.product === waProductSelect);
    if (waPlatformSelect !== 'all') userCamps = userCamps.filter(c => c.platform === waPlatformSelect);

    if (!userCamps || userCamps.length === 0) {
      setWaMessage(`⚠️ *LAPORAN KOSONG*\n\nBelum ada data kampanye untuk ${user.name}.\nSilakan tarik data dari menu *Tarik Data Ads* terlebih dahulu.`);
      return;
    }

    // Group by Date
    const dateGroups: Record<string, Campaign[]> = {};
    userCamps.forEach(c => {
      const dateKey = c.date_range || c.tanggal;
      if (!dateGroups[dateKey]) dateGroups[dateKey] = [];
      dateGroups[dateKey].push(c);
    });

    const sortedDates = Object.keys(dateGroups).sort((a, b) => {
      // Simple date sort (assuming YYYY-MM-DD or similar)
      return a.localeCompare(b);
    });

    const reportSections = sortedDates.map(date => {
      const camps = dateGroups[date];
      const platformStats: Record<string, { spend: number, product: string }> = {};
      
      camps.forEach(c => {
        const platformName = c.platform === 'fb' ? 'Facebook' : 'Google';
        const key = `${platformName} ${c.product}`;
        if (!platformStats[key]) platformStats[key] = { spend: 0, product: c.product };
        platformStats[key].spend += c.spend;
      });

      const lines = Object.entries(platformStats)
        .map(([key, stats]) => `=> ${key} = Rp ${fmtNum(Math.round(stats.spend))}`)
        .join('\n');

      return `Spent Iklan ${date}\n${lines}`;
    }).join('\n\n');

    const msg = `Advertiser Mr.BOB: Advertiser ${user.name}
${reportSections}`;

    setWaMessage(msg);
  };

  useEffect(() => {
    if (currentUser && !waUserSelect) setWaUserSelect(currentUser.id);
  }, [currentUser]);

  useEffect(() => {
    if (activePage === 'wa') generateWAMessage();
  }, [activePage, waUserSelect, waProductSelect, waPlatformSelect, data, dateRange, startDate, endDate]);

  const sendToWA = async () => {
    if (!waTarget) {
      addToast('Nomor target WA wajib diisi', 'warn');
      return;
    }
    
    setIsSendingWA(true);
    try {
      const res = await fetch('/api/wa/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: waTarget,
          message: waMessage,
          token: waToken
        })
      });
      const result = await res.json();
      if (result.ok) {
        addToast('Laporan terkirim via WhatsApp!');
      } else {
        // Fallback to WhatsApp Web if API fails or token is missing
        const encodedMsg = encodeURIComponent(waMessage);
        const url = `https://wa.me/${waTarget.replace(/[^0-9]/g, '')}?text=${encodedMsg}`;
        window.open(url, '_blank');
        addToast('Membuka WhatsApp Web (API Token tidak valid/kosong)', 'info');
      }
    } catch (err) {
      const encodedMsg = encodeURIComponent(waMessage);
      const url = `https://wa.me/${waTarget.replace(/[^0-9]/g, '')}?text=${encodedMsg}`;
      window.open(url, '_blank');
      addToast('Membuka WhatsApp Web...', 'info');
    } finally {
      setIsSendingWA(false);
    }
  };

  // --- Render Helpers ---

  if (window.location.hash.includes('access_token=')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthReady || (isProfileLoading && !currentUser)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full animate-pulse"></div>
            <Logo className="w-20 h-20 relative z-10 animate-float" />
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="text-2xl font-black text-[var(--text-base)] tracking-tighter">REPORT ADS KAYA RAYA</div>
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-[var(--text-muted)] font-medium">
                <RefreshCw size={14} className="animate-spin" />
                <span>{isProfileLoading ? 'Sinkronisasi profil...' : 'Menyiapkan dashboard Anda...'}</span>
              </div>
              <button 
                onClick={() => {
                  setIsAuthReady(true);
                  setIsProfileLoading(false);
                }}
                className="text-[10px] font-bold text-indigo-600 hover:underline mt-4 opacity-50 hover:opacity-100 transition-opacity"
              >
                Masuk Paksa (Jika loading terlalu lama)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex bg-[var(--bg-base)] font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
        {/* Left Side - Branding & Info */}
        <div className="hidden lg:flex lg:w-1/2 bg-black relative overflow-hidden flex-col justify-between p-20">
          {/* Abstract Background Elements */}
          <div className="absolute top-[-10%] left-[-10%] w-[80%] h-[80%] rounded-full bg-gradient-to-br from-indigo-600/30 to-transparent blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[80%] rounded-full bg-gradient-to-tl from-violet-600/20 to-transparent blur-[120px]"></div>
          
          <div className="relative z-10">
              <div className="flex items-center gap-4 mb-16">
                <Logo className="w-14 h-14 shadow-2xl shadow-indigo-500/20" />
                <div className="text-4xl font-black tracking-tighter text-white">
                  REPORT ADS<span className="text-indigo-500"> KAYA RAYA</span>
                </div>
              </div>
            
            <h1 className="text-7xl font-black text-white leading-[0.95] mb-8 tracking-tighter">
              Automate Your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Ads Reporting</span> <br />
              Effortlessly.
            </h1>
            
            <p className="text-xl text-[var(--text-muted)] max-w-md leading-relaxed font-medium">
              Sistem otomatisasi pelaporan Facebook Ads & Google Ads langsung ke WhatsApp tim Anda. Pantau performa iklan secara real-time.
            </p>
          </div>
          
          <div className="relative z-10">
            <div className="grid grid-cols-3 gap-8 max-w-lg">
              <div className="flex flex-col gap-1">
                <span className="text-4xl font-black text-white tracking-tighter">100%</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] font-bold">Automated</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-4xl font-black text-white tracking-tighter">Live</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] font-bold">Insights</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-4xl font-black text-white tracking-tighter">Direct</span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] font-bold">WhatsApp</span>
              </div>
            </div>
            
            <div className="mt-16 text-[var(--text-muted)] text-xs font-bold tracking-widest uppercase">
              &copy; 2026 KAYA RAYA FOUNDATION &bull; PREMIUM ADS AUTOMATION
            </div>
          </div>
        </div>

        {/* Right Side - Login/Register Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[var(--bg-base)] relative">
          <div className="absolute top-8 right-8">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-3 rounded-full bg-[var(--bg-surface)] border border-[var(--border-base)] text-[var(--text-muted)] hover:text-[var(--text-base)] shadow-sm transition-all"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
          <div className="w-full max-w-[420px]">
            <div className="lg:hidden flex items-center gap-3 mb-12 justify-center">
              <Logo className="w-12 h-12 shadow-xl shadow-indigo-500/10" />
              <div className="text-3xl font-black tracking-tighter text-[var(--text-base)]">
                REPORT ADS<span className="text-indigo-600 dark:text-indigo-500"> KAYA RAYA</span>
              </div>
            </div>

            <div className="mb-12 text-center lg:text-left">
              <h2 className="text-4xl font-black text-[var(--text-base)] mb-3 tracking-tighter">
                {isRegistering ? 'Buat Akun Baru' : 'Selamat Datang'}
              </h2>
              <p className="text-[var(--text-muted)] font-medium">
                {isRegistering 
                  ? 'Mulai otomatisasi laporan iklan Anda hari ini.' 
                  : 'Masuk untuk mengelola dashboard iklan Anda.'}
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-5">
                <button 
                  onClick={handleFirebaseLogin}
                  disabled={isLoggingIn}
                  className="btn btn-primary w-full h-13 text-base font-bold mt-4 flex items-center justify-center gap-3"
                >
                  {isLoggingIn ? <RefreshCw size={20} className="animate-spin" /> : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#ffffff"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#ffffff" opacity="0.8"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#ffffff" opacity="0.6"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#ffffff" opacity="0.9"/>
                      </svg>
                      Masuk dengan Google
                    </>
                  )}
                </button>

                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[var(--border-base)]"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
                    <span className="bg-[var(--bg-surface)] px-4 text-[var(--text-muted)]">Atau Gunakan Email</span>
                  </div>
                </div>

                <div>
                  <label className="label">Alamat Email</label>
                  <input 
                    className="input h-13" 
                    type="email" 
                    placeholder="name@company.com" 
                    value={isRegistering ? regEmail : loginEmail}
                    onChange={(e) => isRegistering ? setRegEmail(e.target.value) : setLoginEmail(e.target.value)}
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="label mb-0">Password</label>
                    {!isRegistering && (
                      <button 
                        onClick={handleForgotPassword}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                      >
                        Lupa Password?
                      </button>
                    )}
                  </div>
                  <input 
                    className="input h-13" 
                    type="password" 
                    placeholder="••••••••" 
                    value={isRegistering ? regPass : loginPass}
                    onChange={(e) => isRegistering ? setRegPass(e.target.value) : setLoginPass(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (isRegistering ? handleRegister() : handleLogin())}
                  />
                </div>
                
                <button 
                  onClick={() => isRegistering ? handleRegister() : handleLogin()}
                  disabled={isLoggingIn || isRegistering}
                  className="btn btn-primary w-full h-13 text-base font-bold mt-4"
                >
                  {isLoggingIn || isRegistering ? <RefreshCw size={20} className="animate-spin" /> : (isRegistering ? 'Daftar Sekarang' : 'Masuk ke Dashboard')}
                </button>

                <div className="text-center mt-6">
                  <p className="text-sm text-[var(--text-muted)] font-medium">
                    {isRegistering ? 'Sudah punya akun?' : 'Belum punya akun?'}
                    <button 
                      onClick={() => setIsRegistering(!isRegistering)}
                      className="ml-1.5 font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                    >
                      {isRegistering ? 'Masuk Sekarang' : 'Daftar Gratis'}
                    </button>
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-16 pt-8 border-t border-[var(--border-base)] flex flex-col items-center gap-3">
              <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em]">Powered By</div>
              <div className="text-lg font-black text-[var(--text-base)] tracking-tighter">
                REPORT ADS<span className="text-blue-600"> KAYA RAYA</span>
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {toasts.map(t => <Toast key={t.id} {...t} onClose={() => removeToast(t.id)} />)}
        </AnimatePresence>
      </div>
    );
  }


  const totalCreativeThruplays = fbCreatives.reduce((sum, c) => sum + (c.thruplays || 0), 0);
  const totalCreativeLeads = fbCreatives.reduce((sum, c) => sum + (c.leads || 0), 0);
  const totalCreativeImpressions = fbCreatives.reduce((sum, c) => sum + (c.impressions || 0), 0);

  const totalAdsFetchSpend = adsRawData.reduce((sum, c) => sum + (c.spend || 0), 0);
  const totalAdsFetchImpressions = adsRawData.reduce((sum, r) => sum + (parseInt(r.impressions) || 0), 0);
  const totalAdsFetchClicks = adsRawData.reduce((sum, r) => sum + (parseInt(r.clicks) || 0), 0);
  const totalAdsFetchLeads = adsRawData.reduce((sum, r) => sum + (r.leads || 0), 0);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-base)] selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Topbar */}
      <header className="h-18 bg-[var(--bg-surface)]/80 backdrop-blur-md border-b border-[var(--border-base)] px-8 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <Logo className="w-9 h-9 shadow-lg shadow-indigo-500/10" />
          <div className="text-2xl font-black tracking-tighter text-[var(--text-base)]">
            REPORT ADS<span className="text-indigo-600 dark:text-indigo-500"> KAYA RAYA</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-subtle)] border border-[var(--border-base)] rounded-full">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">System Online</span>
          </div>

          <button 
            onClick={() => setIsGoogleApiModalOpen(true)}
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-xl hover:border-indigo-300 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20 transition-all group"
          >
            <div className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors">
              <Globe size={12} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-xs font-bold text-[var(--text-muted)] group-hover:text-[var(--text-base)]">Google API</span>
          </button>
          
          <div className="h-8 w-[1px] bg-[var(--border-base)] mx-2"></div>

          <div className="flex items-center gap-3 p-1.5 pr-4 bg-[var(--bg-subtle)] border border-[var(--border-base)] rounded-full hover:border-indigo-300 dark:hover:border-indigo-700 cursor-pointer transition-all group" onClick={() => setActivePage('profile')}>
            {currentUser.photoURL ? (
              <img src={currentUser.photoURL} alt="profile" className="w-8 h-8 rounded-full object-cover border-2 border-[var(--bg-surface)] shadow-sm" referrerPolicy="no-referrer" />
            ) : (
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 border-[var(--bg-surface)] shadow-sm"
                style={{ 
                  background: currentUser.role === 'admin' ? '#4f46e5' : currentUser.color, 
                  color: '#fff' 
                }}
              >
                {currentUser.initials}
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[var(--text-base)] leading-none mb-0.5">
                {currentUser.name}
                {currentUser.email === 'lkbimrbob@gmail.com' && (
                  <span className="ml-2 text-[8px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-full uppercase tracking-tighter">Super Admin</span>
                )}
              </span>
              <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider">{currentUser.role}</span>
            </div>
          </div>
          
          <button onClick={handleLogout} className="p-2.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-[260px] bg-[var(--bg-surface)] border-r border-[var(--border-base)] p-6 flex flex-col gap-1 shrink-0 hidden md:flex justify-between">
          <div className="space-y-8">
            <div>
              <div className="text-[10px] font-black tracking-[0.2em] uppercase text-[var(--text-muted)] px-4 mb-4">Main Menu</div>
              <div className="space-y-1">
                <SidebarItem icon={<LayoutDashboard size={18} />} label="Dashboard" active={activePage === 'dashboard'} onClick={() => setActivePage('dashboard')} />
                <SidebarItem icon={<MessageSquare size={18} />} label="Kirim Laporan WA" active={activePage === 'wa'} onClick={() => setActivePage('wa')} />
                {currentUser.role === 'admin' && (
                  <SidebarItem icon={<Users size={18} />} label="Manajemen User" active={activePage === 'admin'} onClick={() => setActivePage('admin')} />
                )}
              </div>
            </div>

            {currentUser.role !== 'admin' && (
              <div>
                <div className="text-[10px] font-black tracking-[0.2em] uppercase text-[var(--text-muted)] px-4 mb-4">Data Fetching</div>
                <div className="space-y-1">
                  <SidebarItem icon={<Database size={18} />} label="Tarik Data Ads" active={activePage === 'data'} onClick={() => setActivePage('data')} />
                </div>
              </div>
            )}
            
            <div>
              <div className="text-[10px] font-black tracking-[0.2em] uppercase text-[var(--text-muted)] px-4 mb-4">Settings</div>
              <div className="space-y-1">
                {currentUser.role === 'admin' && (
                  <SidebarItem icon={<History size={18} />} label="Activity Logs" active={activePage === 'logs'} onClick={() => setActivePage('logs')} />
                )}
                <SidebarItem icon={<RefreshCw size={18} />} label="Automation" active={activePage === 'schedule'} onClick={() => setActivePage('schedule')} />
                <SidebarItem icon={<Database size={18} />} label="API Connections" active={activePage === 'setup'} onClick={() => setActivePage('setup')} />
              </div>
            </div>
          </div>

          <div className="mt-auto pt-10 space-y-4">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all w-full text-left text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-base)]"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </button>
            <div className="p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-base)] relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition-all"></div>
              <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Version</div>
              <div className="text-xs font-bold text-[var(--text-base)] dark:text-white">v2.4.0 Stable</div>
              <div className="mt-3 flex items-center gap-2 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                <ShieldCheck size={12} />
                Secure Mode
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-10 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activePage === 'dashboard' && (
              <motion.div key="dash" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                  <div>
                    <h1 className="text-4xl font-black tracking-tighter text-[var(--text-base)] mb-2">
                      Dashboard
                    </h1>
                    <div className="flex items-center gap-2 text-[var(--text-muted)] font-medium">
                      <LayoutDashboard size={16} />
                      <span>Overview performance for {currentUser.role === 'admin' ? (userFilter === 'all' ? 'All Advertisers' : users.find(u => u.id === userFilter)?.name) : 'Your Campaigns'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button onClick={() => setActivePage('wa')} className="btn btn-primary">
                      <MessageSquare size={18} /> Send Report
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-6 mb-8 p-2 bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-[2rem] shadow-sm">
                  <div className="flex items-center gap-1 p-1 bg-[var(--bg-subtle)] rounded-2xl">
                    <Pill label="Today" active={dateRange === 'today'} onClick={() => setDateRange('today')} />
                    <Pill label="Yesterday" active={dateRange === 'yesterday'} onClick={() => setDateRange('yesterday')} />
                    <Pill label="7 Days" active={dateRange === '7d'} onClick={() => setDateRange('7d')} />
                    <Pill label="30 Days" active={dateRange === '30d'} onClick={() => setDateRange('30d')} />
                    <Pill label="Custom" active={dateRange === 'custom'} onClick={() => setDateRange('custom')} />
                  </div>
                  
                  <div className="flex items-center gap-3 pr-4">
                    {dateRange === 'custom' && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-subtle)] border border-[var(--border-base)] rounded-xl">
                        <input type="date" className="bg-transparent border-none text-xs font-bold outline-none text-[var(--text-base)]" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        <span className="text-[var(--text-muted)]">&mdash;</span>
                        <input type="date" className="bg-transparent border-none text-xs font-bold outline-none text-[var(--text-base)]" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                      </div>
                    )}
                    
                    <select 
                      className="bg-[var(--bg-subtle)] border border-[var(--border-base)] rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-indigo-500 transition-all text-[var(--text-base)]"
                      value={platformFilter}
                      onChange={(e) => setPlatformFilter(e.target.value as any)}
                    >
                      <option value="all">All Platforms</option>
                      <option value="fb">Facebook Ads</option>
                      <option value="google">Google Ads</option>
                    </select>

                    {currentUser.role === 'admin' && (
                      <select 
                        className="bg-[var(--bg-subtle)] border border-[var(--border-base)] rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-indigo-500 transition-all text-[var(--text-base)]"
                        value={userFilter}
                        onChange={(e) => setUserFilter(e.target.value)}
                      >
                        <option value="all">All Users</option>
                        {users.filter(u => u.role === 'user').map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-10">
                  <MetricCard label="Total Spend" value={`Rp ${fmtNum(totalSpend)}`} change="+12.5%" trend="up" platform="all" />
                  <MetricCard label="Total Leads" value={totalLeads.toString()} change="+18.2%" trend="up" platform="all" />
                  <MetricCard label="FB Spend" value={`Rp ${fmtNum(fbSpend)}`} change="+8.4%" trend="up" platform="fb" />
                  <MetricCard label="Google Spend" value={`Rp ${fmtNum(gSpend)}`} change="+15.1%" trend="up" platform="google" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                  <div className="lg:col-span-2 bento-card">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Performance Trend</h3>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-indigo-500" />
                          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Spend</span>
                        </div>
                      </div>
                    </div>
                    <div className="h-[200px] flex items-end gap-3 px-2">
                      {[40, 65, 50, 85, 70, 95, 80].map((h, i) => (
                        <motion.div 
                          key={i}
                          initial={{ height: 0 }}
                          animate={{ height: `${h}%` }}
                          transition={{ delay: i * 0.1, duration: 0.5, ease: "easeOut" }}
                          className="flex-1 bg-indigo-500 rounded-t-lg hover:bg-indigo-600 transition-colors cursor-pointer group relative"
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--text-base)] text-[var(--bg-base)] text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                            Rp {fmtNum(h * 100000)}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-4 px-2 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                      <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                    </div>
                  </div>

                  <div className="lg:col-span-1 bento-card">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6">Quick Actions</h3>
                    <div className="flex flex-col gap-3">
                      <button 
                        onClick={() => setIsGoogleApiModalOpen(true)}
                        className="btn btn-primary w-full h-12 text-sm font-bold"
                      >
                        <Globe size={18} /> Google API Config
                      </button>
                      {currentUser.role !== 'admin' && (
                        <button 
                          onClick={() => { setActivePage('data'); setDataTab('ads'); }}
                          className="btn btn-outline w-full h-12 text-sm font-bold"
                        >
                          <RefreshCw size={18} /> Fetch Ads Data
                        </button>
                      )}
                    </div>
                    
                    <div className="mt-8 p-4 bg-[var(--bg-subtle)] border border-[var(--border-base)] rounded-2xl">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-black text-[var(--text-base)] uppercase tracking-widest">System Status</span>
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] font-medium leading-relaxed">
                        All API connections are stable. Automated reporting is scheduled for 08:00 AM.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="card">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-sm text-[var(--text-base)]">Kampanye Aktif</h3>
                      <span className="text-[11px] font-medium text-[var(--text-muted)]">{campaigns.length} kampanye</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[13px]">
                        <thead>
                          <tr className="border-b border-[var(--border-base)]">
                            {currentUser.role === 'admin' && <th className="pb-2 font-bold text-[11px] uppercase tracking-wider text-[var(--text-muted)]">User</th>}
                            <th className="pb-2 font-bold text-[11px] uppercase tracking-wider text-[var(--text-muted)]">Kampanye</th>
                            <th className="pb-2 font-bold text-[11px] uppercase tracking-wider text-[var(--text-muted)]">Platform</th>
                            <th className="pb-2 font-bold text-[11px] uppercase tracking-wider text-[var(--text-muted)]">Spend</th>
                            <th className="pb-2 font-bold text-[11px] uppercase tracking-wider text-[var(--text-muted)]">Leads</th>
                          </tr>
                        </thead>
                        <tbody>
                          {campaigns.map((c, i) => (
                            <tr key={i} className="border-b border-[var(--border-base)] last:border-0 hover:bg-[var(--bg-subtle)] transition-all">
                              {currentUser.role === 'admin' && (
                                <td className="py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: `${c.user.color}20`, color: c.user.color }}>{c.user.initials}</div>
                                    <span className="font-medium text-[var(--text-base)]">{c.user.name}</span>
                                  </div>
                                </td>
                              )}
                              <td className="py-3 font-semibold text-[var(--text-base)]">{c.name}</td>
                              <td className="py-3">
                                <span className={cn(
                                  "text-[10px] font-bold px-2 py-0.5 rounded-full",
                                  c.platform === 'fb' ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                )}>
                                  {c.platform === 'fb' ? 'FB Ads' : 'Google'}
                                </span>
                              </td>
                              <td className="py-3 font-mono text-xs text-[var(--text-base)]">Rp {fmtNum(c.spend)}</td>
                              <td className="py-3 font-mono text-xs text-[var(--text-base)]">{c.leads}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="card">
                    <h3 className="font-bold text-sm mb-4 text-[var(--text-base)]">Performa per Produk</h3>
                    <div className="space-y-4">
                      {getTopProducts(campaigns).map((p, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-[12.5px] mb-1">
                            <span className="font-semibold text-[var(--text-base)]">{p.name}</span>
                            <span className="font-mono text-[11.5px] text-[var(--text-muted)]">Rp {fmtNum(p.spend)} · {p.leads} leads</span>
                          </div>
                          <div className="h-1.5 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${p.percent}%` }}
                              className="h-full bg-indigo-500 rounded-full"
                            />
                          </div>
                        </div>
                      ))}
                      {campaigns.length === 0 && <div className="text-[var(--text-muted)] text-center py-10">Tidak ada data</div>}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activePage === 'admin' && currentUser.role === 'admin' && (
              <motion.div key="admin" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div>
                    <h1 className="text-4xl font-black tracking-tighter text-[var(--text-base)] mb-2">
                      User Management
                    </h1>
                    <div className="flex items-center gap-2 text-[var(--text-muted)] font-medium">
                      <Users size={16} />
                      <span>Manage your team of advertisers and system access</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                      <input 
                        className="input h-12 pl-12 w-full sm:w-64" 
                        placeholder="Search users..." 
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                      />
                    </div>
                    <button 
                      onClick={() => setIsAddingUser(true)}
                      className="btn btn-primary h-12 px-6 shadow-xl shadow-blue-500/20"
                    >
                      <Plus size={20} /> Add New User
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                  <MetricCard label="Total Spend (Team)" value={`Rp ${fmtNum(totalSpend)}`} change="▲ team" trend="up" platform="all" />
                  <MetricCard label="Total Leads (Team)" value={totalLeads.toString()} change="▲ all users" trend="up" platform="all" />
                  <MetricCard label="Total Campaigns" value={campaigns.length.toString()} change="→ active" trend="neu" platform="all" />
                </div>

                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Active Team Members</h3>
                  <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Showing {users.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase())).length} users</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-10">
                  {users.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase())).map(u => {
                    const userCamps = (data[u.id]?.campaigns || []);
                    const uSpend = userCamps.reduce((s, c) => s + c.spend, 0);
                    const uLeads = userCamps.reduce((s, c) => s + c.leads, 0);
                    const uFbSpend = userCamps.filter(c => c.platform === 'fb').reduce((s, c) => s + c.spend, 0);
                    const uGSpend = userCamps.filter(c => c.platform === 'google').reduce((s, c) => s + c.spend, 0);
                    const maxBar = Math.max(uSpend, 1);

                    return (
                      <div key={u.id} className="bento-card group hover:border-blue-200 transition-all">
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-4 cursor-pointer" onClick={() => { setUserFilter(u.id); setActivePage('dashboard'); }}>
                            <div 
                              className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black shadow-lg overflow-hidden" 
                              style={{ background: `${u.color}15`, color: u.color, border: `2px solid ${u.color}30` }}
                            >
                              {u.photoURL ? (
                                <img src={u.photoURL} alt={u.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                u.initials
                              )}
                            </div>
                            <div>
                              <div className="font-black text-[var(--text-base)] group-hover:text-indigo-600 transition-colors">{u.name}</div>
                              <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1">{u.role} &bull; {u.status || 'Aktif'}</div>
                              <div className="text-[10px] text-[var(--text-muted)] font-medium mt-1 flex items-center gap-1">
                                <MessageSquare size={10} /> {u.whatsapp || '-'}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setEditingUser(u); }}
                              className="w-8 h-8 rounded-xl flex items-center justify-center bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400 transition-all"
                            >
                              <Settings size={14} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); if(window.confirm(`Hapus user ${u.name}?`)) handleDeleteUser(u.id); }}
                              className="w-8 h-8 rounded-xl flex items-center justify-center bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:bg-red-50 hover:text-red-600 transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-end justify-between">
                            <div>
                              <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Total Spend</div>
                              <div className="text-2xl font-black text-[var(--text-base)] tracking-tighter">Rp {fmtNum(uSpend)}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Leads</div>
                              <div className="text-sm font-black text-[var(--text-base)]">{uLeads} <span className="text-[10px] text-[var(--text-muted)] font-bold">Leads</span></div>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-[var(--border-base)] space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 text-[9px] font-black text-blue-600 uppercase tracking-widest">FB Ads</div>
                              <div className="flex-1 h-1.5 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(uFbSpend / maxBar) * 100}%` }}
                                  className="h-full bg-blue-600"
                                />
                              </div>
                              <div className="w-16 text-right text-[10px] font-black text-[var(--text-base)]">Rp {fmtNum(uFbSpend)}</div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-10 text-[9px] font-black text-red-600 uppercase tracking-widest">Google</div>
                              <div className="flex-1 h-1.5 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(uGSpend / maxBar) * 100}%` }}
                                  className="h-full bg-red-600"
                                />
                              </div>
                              <div className="w-16 text-right text-[10px] font-black text-[var(--text-base)]">Rp {fmtNum(uGSpend)}</div>
                            </div>
                          </div>

                          <div className="pt-4 flex flex-col gap-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <Clock size={12} />
                                Joined {u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID') : '-'}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Target size={12} />
                                {u.assignedProducts?.length || 0} Products
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                              <History size={12} />
                              Last Login: {u.lastLogin ? new Date(u.lastLogin).toLocaleString('id-ID') : 'Never'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {activePage === 'wa' && (
              <motion.div key="wa" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                  <div>
                    <h1 className="text-4xl font-black tracking-tighter text-[var(--text-base)] mb-2">
                      WhatsApp Reporting
                    </h1>
                    <div className="flex items-center gap-2 text-[var(--text-muted)] font-medium">
                      <MessageSquare size={16} />
                      <span>Send performance summaries directly to your team</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1 space-y-6">
                    <div className="bento-card">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6">Configuration</h3>
                      <div className="space-y-5">
                        {currentUser.role === 'admin' && (
                          <div>
                            <label className="label">Select Advertiser</label>
                            <select className="input h-11" value={waUserSelect} onChange={(e) => setWaUserSelect(e.target.value)}>
                              <option value="">Choose User...</option>
                              {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div>
                          <label className="label">Report Period</label>
                          <select className="input h-11" value={dateRange} onChange={(e) => setDateRange(e.target.value as any)}>
                            <option value="today">Today</option>
                            <option value="yesterday">Yesterday</option>
                            <option value="7d">Last 7 Days</option>
                            <option value="30d">Last 30 Days</option>
                            <option value="custom">Custom Range</option>
                          </select>
                        </div>
                        <div>
                          <label className="label">Target WhatsApp Number</label>
                          <input 
                            className="input h-11" 
                            placeholder="e.g. 628123456789" 
                            value={waTarget} 
                            onChange={(e) => setWaTarget(e.target.value)} 
                          />
                          <p className="text-[10px] text-[var(--text-muted)] mt-2 font-medium">Use international format (628...)</p>
                        </div>
                        <div>
                          <label className="label">API Gateway Token</label>
                          <input 
                            className="input h-11 text-xs" 
                            type="password" 
                            value={waToken} 
                            onChange={(e) => setWaToken(e.target.value)} 
                            placeholder="Fonnte/Wablas Token..." 
                          />
                        </div>
                        <button onClick={saveAutomationConfig} className="btn btn-primary w-full h-11 mt-4 bg-emerald-600 hover:bg-emerald-700 border-none">Save WA Config</button>
                      </div>
                    </div>

                    <div className="p-6 rounded-3xl bg-emerald-600 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden">
                      <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                      <h3 className="font-black text-sm mb-4 flex items-center gap-2">
                        <ShieldCheck size={18} />
                        Automation Requirements
                      </h3>
                      <ul className="text-xs space-y-3 font-medium text-blue-100">
                        <li className="flex gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-white mt-1.5 shrink-0"></div>
                          <span>Fetch data from FB/Google Ads API first.</span>
                        </li>
                        <li className="flex gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-white mt-1.5 shrink-0"></div>
                          <span>Ensure your WA Gateway token is valid.</span>
                        </li>
                        <li className="flex gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-white mt-1.5 shrink-0"></div>
                          <span>Reports are sent automatically at 08:00 & 17:00.</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <div className="bento-card h-full flex flex-col">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Message Preview</h3>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(waMessage);
                            addToast('Message copied to clipboard');
                          }}
                          className="btn btn-ghost py-1.5 px-3 text-[10px]"
                        >
                          <Copy size={14} /> Copy Text
                        </button>
                      </div>
                      <textarea 
                        className="flex-1 w-full p-6 bg-[var(--bg-subtle)] border border-[var(--border-base)] rounded-2xl text-xs font-mono leading-relaxed outline-none focus:border-indigo-500 focus:bg-[var(--bg-surface)] transition-all resize-none text-[var(--text-base)]"
                        value={waMessage}
                        onChange={(e) => setWaMessage(e.target.value)}
                        rows={15}
                      />
                      <div className="mt-8 flex gap-4">
                        <button onClick={sendToWA} className="btn btn-primary flex-1 h-13 text-base">
                          <MessageSquare size={20} /> Send to WhatsApp Now
                        </button>
                        <button onClick={() => addToast('Auto-schedule enabled', 'info')} className="btn btn-outline w-13 h-13 p-0 flex items-center justify-center">
                          <Clock size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activePage === 'data' && (
              <motion.div key="data" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                  <div>
                    <h1 className="text-4xl font-black tracking-tighter text-[var(--text-base)] mb-2">
                      Tarik Data Ads
                    </h1>
                    <div className="flex items-center gap-2 text-[var(--text-muted)] font-medium">
                      <Database size={16} />
                      <span>Fetch and sync live data from Meta and Google</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-8 bg-[var(--bg-subtle)] p-1.5 rounded-2xl w-fit">
                  <button 
                    onClick={() => setDataTab('ads')}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all",
                      dataTab === 'ads' ? "bg-[var(--bg-surface)] text-indigo-600 shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-base)]"
                    )}
                  >
                    <Database size={18} />
                    Ads Data
                  </button>
                  <button 
                    onClick={() => setDataTab('creatives')}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all",
                      dataTab === 'creatives' ? "bg-[var(--bg-surface)] text-indigo-600 shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-base)]"
                    )}
                  >
                    <Image size={18} />
                    Creative Assets
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {dataTab === 'ads' && (
                    <motion.div key="ads-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                  <div className="lg:col-span-1 space-y-6">
                    <div className="bento-card">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">API Configuration</h3>
                      </div>
                      
                      <div className="space-y-5">
                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                          <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
                            <b>Info:</b> Konfigurasi API (Access Token, Account ID) sekarang dikelola di menu <b>API Connections</b>.
                          </p>
                        </div>
                        
                        <div className="pt-2 flex flex-col gap-3">
                          <div className="flex gap-2">
                            <select 
                              className="input h-11 text-xs flex-1" 
                              value={fbDatePreset} 
                              onChange={(e) => {
                                setFbDatePreset(e.target.value as any);
                                setGadsDatePreset(e.target.value.toUpperCase());
                              }}
                            >
                              <option value="today">Today</option>
                              <option value="yesterday">Yesterday</option>
                              <option value="last_7d">Last 7 Days</option>
                              <option value="last_30d">Last 30 Days</option>
                              <option value="this_month">This Month</option>
                              <option value="custom">Custom Range</option>
                            </select>
                            <button onClick={testFbConnection} className="btn btn-outline h-11 px-3 shrink-0" title="Test FB Connection">
                              <Facebook size={16} />
                            </button>
                            <button onClick={testGadsConnection} className="btn btn-outline h-11 px-3 shrink-0" title="Test Google Ads Connection">
                              <Globe size={16} />
                            </button>
                          </div>
                          
                          {fbDatePreset === 'custom' && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-subtle)] border border-[var(--border-base)] rounded-xl">
                              <input type="date" className="bg-transparent border-none text-xs font-bold outline-none w-full text-[var(--text-base)]" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                              <span className="text-[var(--text-muted)]">&mdash;</span>
                              <input type="date" className="bg-transparent border-none text-xs font-bold outline-none w-full text-[var(--text-base)]" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                            </div>
                          )}

                          <div className="space-y-4 pt-2">
                            <div>
                              <label className="label">Assign to User</label>
                              <select 
                                className="input h-11 text-xs" 
                                value={fetchUser} 
                                onChange={(e) => setFetchUser(e.target.value)}
                              >
                                <option value="">Select User</option>
                                {users.map(u => (
                                  <option key={u.id} value={u.name}>{u.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="label">Product</label>
                              <select 
                                className="input h-11 text-xs" 
                                value={fetchProduct} 
                                onChange={(e) => setFetchProduct(e.target.value)}
                              >
                                <option value="all">All Products</option>
                                {PRODUCTS.map(p => (
                                  <option key={p} value={p}>{p}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <button 
                            onClick={fetchAdsData}
                            disabled={isAdsLoading}
                            className="btn btn-primary w-full h-11 text-sm mt-4"
                          >
                            {isAdsLoading ? (
                              <><RefreshCw size={18} className="animate-spin mr-2" /> Fetching...</>
                            ) : (
                              <><RefreshCw size={18} className="mr-2" /> Fetch Data</>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <SyncPanel 
                      platform="ads"
                      accessToken={googleAccessToken}
                      googleUser={googleUser}
                      sheetId={sheetIds.ads}
                      sheetTab={sheetTabs.ads}
                      autoSync={autoSync.ads}
                      appendMode={appendMode.ads}
                      syncLogs={syncLogs.ads}
                      isSyncing={isSyncing.ads}
                      lastSync={lastSync.ads}
                      isOpen={isSyncPanelOpen.ads}
                      onToggle={() => setIsSyncPanelOpen(prev => ({ ...prev, ads: !prev.ads }))}
                      onSignIn={handleGoogleSignIn}
                      onSignOut={handleGoogleSignOut}
                      onConnect={(url) => connectSheet('ads', url)}
                      onSync={() => doSync('ads', adsRawData)}
                      onTabChange={(val) => setSheetTabs(prev => ({ ...prev, ads: val }))}
                      onAutoSyncChange={(val) => setAutoSync(prev => ({ ...prev, ads: val }))}
                      onAppendModeChange={(val) => setAppendMode(prev => ({ ...prev, ads: val }))}
                      columns={['Tanggal Fetch', 'User', 'Date', 'Platform', 'Product', 'Spend', 'Impressions', 'Clicks', 'Leads']}
                      exportCols={exportCols.ads}
                      onToggleColumn={(col) => toggleColumn('ads', col)}
                    />
                  </div>
                </div>

                {adsRawData.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-black text-[var(--text-base)]">Fetch Results ({adsRawData.length})</h3>
                      <button onClick={importAdsToApp} className="btn btn-primary py-2 px-5 text-xs">
                        <Download size={14} /> Import to Dashboard
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {adsRawData.map((c, i) => (
                        <div key={i} className="bento-card p-5 flex flex-col gap-4">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                c.platform === 'Facebook' ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600"
                              )}>
                                {c.platform === 'Facebook' ? <Facebook size={20} /> : <Globe size={20} />}
                              </div>
                              <div>
                                <h4 className="font-bold text-sm text-[var(--text-base)]">{c.product || 'Unknown Product'}</h4>
                                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-0.5">{c.date_range}</p>
                              </div>
                            </div>
                            <span className={cn(
                              "px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                              c.platform === 'Facebook' ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
                            )}>
                              {c.platform}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[var(--bg-subtle)] rounded-xl p-3">
                              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Spend</p>
                              <p className="font-mono font-bold text-[var(--text-base)] text-sm">Rp {fmtNum(c.spend)}</p>
                            </div>
                            <div className="bg-blue-50 rounded-xl p-3">
                              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Leads</p>
                              <input 
                                type="number" 
                                className="w-full bg-transparent border-none font-mono font-black text-blue-600 text-sm outline-none focus:ring-0 p-0"
                                value={c.leads}
                                onChange={(e) => handleEditLeads(i, e.target.value)}
                              />
                            </div>
                            <div className="bg-emerald-50 rounded-xl p-3">
                              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">CPR</p>
                              <p className="font-mono font-black text-emerald-600 text-sm">Rp {fmtNum(Math.round(c.cpr || 0))}</p>
                            </div>
                            <div className="bg-[var(--bg-subtle)] rounded-xl p-3">
                              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Impressions</p>
                              <p className="font-mono font-bold text-[var(--text-base)] text-sm">{fmtNum(parseInt(c.impressions))}</p>
                            </div>
                            <div className="bg-[var(--bg-subtle)] rounded-xl p-3">
                              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Clicks</p>
                              <p className="font-mono font-bold text-[var(--text-base)] text-sm">{fmtNum(parseInt(c.clicks))}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between pt-3 border-t border-[var(--border-base)] mt-auto">
                            <div className="flex items-center gap-2 text-[var(--text-muted)]">
                              <UserCircle size={14} />
                              <span className="text-[10px] font-bold">{c.user_name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[var(--text-muted)]">
                              <Clock size={14} />
                              <span className="text-[10px] font-bold">{c.timestamp}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bento-card py-20 flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-6">
                      <Database size={40} className="text-blue-600" />
                    </div>
                    <h3 className="text-xl font-black text-[var(--text-base)] mb-2">No Ads Data Yet</h3>
                    <p className="text-[var(--text-muted)] max-w-sm font-medium mb-8">Configure your API credentials above to start fetching live campaign performance data.</p>
                    <button onClick={fetchAdsData} className="btn btn-primary h-12 px-8" disabled={isAdsLoading}>
                      {isAdsLoading ? <RefreshCw size={20} className="animate-spin" /> : <RefreshCw size={20} />}
                      {isAdsLoading ? 'Fetching...' : 'Fetch Data Now'}
                    </button>
                  </div>
                )}
                    </motion.div>
                  )}

                  {dataTab === 'creatives' && (
                    <motion.div key="creatives-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                  <div className="lg:col-span-1 space-y-6">
                    <div className="bento-card">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Creative Audit</h3>
                      </div>
                      
                      <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex gap-4 text-indigo-700 mb-6 dark:bg-indigo-900/20 dark:border-indigo-800/50 dark:text-indigo-400">
                        <AlertCircle className="shrink-0" size={20} />
                        <p className="text-xs font-medium leading-relaxed">
                          This tool extracts <b>Creative IDs</b> from all <b>Active</b> or <b>Paused</b> ads with spend. 
                        </p>
                      </div>

                      <div className="space-y-5">
                        <div>
                          <label className="label">Report Period</label>
                          <select className="input h-11 text-xs" value={fbDatePreset} onChange={(e) => setFbDatePreset(e.target.value as any)}>
                            <option value="today">Today</option>
                            <option value="yesterday">Yesterday</option>
                            <option value="last_7d">Last 7 Days</option>
                            <option value="last_30d">Last 30 Days</option>
                            <option value="custom">Custom Range</option>
                          </select>
                        </div>
                        
                        {fbDatePreset === 'custom' && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-subtle)] border border-[var(--border-base)] rounded-xl">
                            <input type="date" className="bg-transparent border-none text-xs font-bold outline-none w-full text-[var(--text-base)]" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                            <span className="text-[var(--text-muted)]">&mdash;</span>
                            <input type="date" className="bg-transparent border-none text-xs font-bold outline-none w-full text-[var(--text-base)]" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                          </div>
                        )}
                        
                        <div className="pt-4">
                          <button onClick={fetchFbCreatives} className="btn btn-primary w-full h-11 text-sm bg-indigo-600 hover:bg-indigo-700 border-none" disabled={isCreativesLoading || !fbToken}>
                            {isCreativesLoading ? <RefreshCw size={18} className="animate-spin mr-2" /> : <Download size={18} className="mr-2" />}
                            {isCreativesLoading ? 'Fetching...' : 'Fetch Creative Data'}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 rounded-3xl bg-black border border-[var(--border-base)] text-white shadow-xl relative overflow-hidden">
                      <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl"></div>
                      <h3 className="font-black text-sm mb-4 flex items-center gap-2">
                        <Image size={18} className="text-indigo-400" />
                        Creative Assets
                      </h3>
                      <p className="text-xs text-[var(--text-muted)] font-medium leading-relaxed mb-6">
                        Audit and track performance of your ad creatives to identify winning visual assets.
                      </p>
                      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                        <span>Status</span>
                        <span className="text-emerald-400">Operational</span>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-2 space-y-6">

                <SyncPanel 
                  platform="ca"
                  accessToken={googleAccessToken}
                  googleUser={googleUser}
                  sheetId={sheetIds.ca}
                  sheetTab={sheetTabs.ca}
                  autoSync={autoSync.ca}
                  appendMode={appendMode.ca}
                  syncLogs={syncLogs.ca}
                  isSyncing={isSyncing.ca}
                  lastSync={lastSync.ca}
                  isOpen={isSyncPanelOpen.ca}
                  onToggle={() => setIsSyncPanelOpen(prev => ({ ...prev, ca: !prev.ca }))}
                  onSignIn={handleGoogleSignIn}
                  onSignOut={handleGoogleSignOut}
                  onConnect={(url) => connectSheet('ca', url)}
                  onSync={() => doSync('ca', fbCreatives)}
                  onTabChange={(val) => setSheetTabs(prev => ({ ...prev, ca: val }))}
                  onAutoSyncChange={(val) => setAutoSync(prev => ({ ...prev, ca: val }))}
                  onAppendModeChange={(val) => setAppendMode(prev => ({ ...prev, ca: val }))}
                  columns={['Tanggal Fetch', 'Product', 'Performance', 'Leads', 'Creative ID', 'Status', 'Impressions', 'Thruplays']}
                  exportCols={exportCols.ca}
                  onToggleColumn={(col) => toggleColumn('ca', col)}
                />

                {fbCreatives.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-black text-[var(--text-base)]">Creative Assets ({fbCreatives.length})</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {fbCreatives.map((c, i) => (
                        <div key={i} className="bento-card p-0 overflow-hidden flex flex-col group">
                          <div className="relative h-48 bg-[var(--bg-subtle)] overflow-hidden">
                            {c.thumbnail_url ? (
                              <img src={c.thumbnail_url} alt="thumb" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]"><Image size={40} /></div>
                            )}
                            <div className="absolute top-3 left-3 flex flex-col gap-2">
                              {c.performance_status === 'Winning' && (
                                <span className="px-2.5 py-1 rounded-md bg-amber-500/90 text-white text-[10px] font-black uppercase tracking-widest backdrop-blur-md shadow-sm">Winning</span>
                              )}
                              {c.performance_status === 'Good' && (
                                <span className="px-2.5 py-1 rounded-md bg-emerald-500/90 text-white text-[10px] font-black uppercase tracking-widest backdrop-blur-md shadow-sm">Good</span>
                              )}
                              {c.performance_status === 'Worst' && (
                                <span className="px-2.5 py-1 rounded-md bg-red-500/90 text-white text-[10px] font-black uppercase tracking-widest backdrop-blur-md shadow-sm">Worst</span>
                              )}
                            </div>
                            <div className="absolute top-3 right-3">
                              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-surface)] backdrop-blur-md shadow-sm opacity-90">
                                <span className="text-[10px] font-bold text-[var(--text-base)] uppercase tracking-widest">{c.status}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="p-5 flex flex-col flex-1">
                            <div className="mb-4">
                              <div className="text-xs font-black text-blue-600 uppercase tracking-wider mb-1">{c.produk || 'Unknown Product'}</div>
                              <h4 className="text-sm font-bold text-[var(--text-base)] line-clamp-2" title={c.ad_name}>{c.ad_name}</h4>
                              <p className="text-[10px] font-mono text-[var(--text-muted)] mt-1">ID: {c.id}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 mt-auto">
                              <div className="bg-blue-50 rounded-xl p-2 text-center">
                                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-0.5">Leads</p>
                                <p className="font-black text-blue-600 text-sm">{c.leads || 0}</p>
                              </div>
                              <div className="bg-emerald-50 rounded-xl p-2 text-center">
                                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-0.5">Spend</p>
                                <p className="font-black text-emerald-600 text-sm">Rp {fmtNum(c._spend || 0)}</p>
                              </div>
                              <div className="bg-[var(--bg-subtle)] rounded-xl p-2 text-center">
                                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-0.5">Impr</p>
                                <p className="font-bold text-[var(--text-base)] text-sm">{fmtNum(c.impressions || 0)}</p>
                              </div>
                              <div className="bg-[var(--bg-subtle)] rounded-xl p-2 text-center">
                                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-0.5">Thruplay</p>
                                <p className="font-bold text-[var(--text-base)] text-sm">{fmtNum(c.thruplays || 0)}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bento-card py-20 flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-6">
                      <Image size={40} className="text-indigo-600" />
                    </div>
                    <h3 className="text-xl font-black text-[var(--text-base)] mb-2">No Creative Data</h3>
                    <p className="text-[var(--text-muted)] max-w-sm font-medium mb-8">Fetch creative IDs to analyze visual performance and track winning assets.</p>
                    <button onClick={fetchFbCreatives} className="btn btn-primary h-12 px-8" disabled={isCreativesLoading}>
                      {isCreativesLoading ? <RefreshCw size={20} className="animate-spin" /> : <RefreshCw size={20} />}
                      {isCreativesLoading ? 'Fetching...' : 'Fetch Creatives Now'}
                    </button>
                  </div>
                )}
                  </div>
                </div>
                    </motion.div>
                  )}


                </AnimatePresence>
              </motion.div>
            )}

            {activePage === 'schedule' && (
              <motion.div key="schedule" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                  <div>
                    <h1 className="text-4xl font-black tracking-tighter text-[var(--text-base)] mb-2">
                      Automation & Reporting
                    </h1>
                    <div className="flex items-center gap-2 text-[var(--text-muted)] font-medium">
                      <Clock size={16} />
                      <span>Manage automated reporting and WhatsApp notifications</span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={async () => {
                        const secret = prompt('Enter Automation Secret (default: kayaraya123)');
                        if (!secret) return;
                        addToast('Triggering automation...', 'info');
                        try {
                          const res = await fetch('/api/automation/run', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ secret })
                          });
                          const result = await res.json();
                          if (result.ok) addToast('Automation triggered successfully!', 'success');
                          else addToast(`Failed: ${result.error}`, 'err');
                        } catch (e: any) {
                          addToast(`Error: ${e.message}`, 'err');
                        }
                      }}
                      className="btn btn-primary h-12 px-6 bg-indigo-600 hover:bg-indigo-700 border-none"
                    >
                      <Zap size={20} /> Run Now (Test)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bento-card">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6">Active Schedules</h3>
                      <div className="space-y-4">
                        {[
                          { name: 'Daily Performance Summary', time: '15:30 WIB', status: 'Active', target: 'WhatsApp', freq: 'Daily' },
                          { name: 'Meta Ads Data Sync', time: 'Real-time', status: 'Active', target: 'Internal DB', freq: 'Continuous' },
                          { name: 'Google Ads Data Sync', time: 'Real-time', status: 'Active', target: 'Internal DB', freq: 'Continuous' },
                        ].map((task, i) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-[var(--bg-subtle)] rounded-2xl border border-[var(--border-base)] group hover:border-indigo-200 transition-all">
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                task.status === 'Active' ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"
                              )}>
                                <Clock size={20} />
                              </div>
                              <div>
                                <h4 className="font-bold text-[var(--text-base)] text-sm">{task.name}</h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{task.freq}</span>
                                  <span className="w-1 h-1 rounded-full bg-[var(--border-base)]"></span>
                                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{task.time}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                                task.status === 'Active' ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"
                              )}>
                                {task.status}
                              </div>
                              <button onClick={() => addToast('This schedule is managed by the server.', 'info')} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-white hover:text-indigo-600 transition-all">
                                <Settings size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bento-card bg-indigo-600 text-white">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                          <ShieldCheck size={24} />
                        </div>
                        <div>
                          <h3 className="font-black text-lg mb-1">Automation Status</h3>
                          <p className="text-indigo-100 text-xs font-medium leading-relaxed mb-4">
                            Server automation is currently active. It will automatically fetch data from Meta & Google Ads and send reports to your WhatsApp.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <div className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-[10px] font-bold flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                              Meta API: Connected
                            </div>
                            <div className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-[10px] font-bold flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                              Google API: Connected
                            </div>
                            <div className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-[10px] font-bold flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                              WhatsApp: Ready
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bento-card">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6">WhatsApp Settings</h3>
                      <div className="space-y-5">
                        <div>
                          <label className="label">Target Number</label>
                          <input 
                            className="input h-11" 
                            placeholder="628123456789" 
                            value={waTarget} 
                            onChange={(e) => setWaTarget(e.target.value)} 
                          />
                        </div>
                        <div>
                          <label className="label">Fonnte Token</label>
                          <input 
                            className="input h-11 text-xs" 
                            type="password" 
                            value={waToken} 
                            onChange={(e) => setWaToken(e.target.value)} 
                            placeholder="Token..." 
                          />
                        </div>
                        <button onClick={saveAutomationConfig} className="btn btn-primary w-full h-11 bg-emerald-600 hover:bg-emerald-700 border-none">
                          <Save size={18} /> Save Settings
                        </button>
                      </div>
                    </div>

                    <div className="bento-card border-red-100 bg-red-50/30">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-red-600 mb-4">Troubleshooting</h3>
                      <p className="text-[10px] text-red-700 font-medium leading-relaxed mb-4">
                        Jika muncul error <b>"Missing credentials"</b>, pastikan Anda sudah mengisi <b>GADS_CLIENT_ID</b>, <b>GADS_CLIENT_SECRET</b>, dan <b>GADS_REFRESH_TOKEN</b> di menu <b>Settings (Secrets)</b> AI Studio.
                      </p>
                      <button onClick={() => setActivePage('setup')} className="text-[10px] font-black text-red-600 uppercase tracking-widest hover:underline flex items-center gap-1">
                        Go to API Setup <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activePage === 'setup' && (
              <motion.div key="setup" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                  <div>
                    <h1 className="text-4xl font-black tracking-tighter text-[var(--text-base)] mb-2">
                      API Connections
                    </h1>
                    <div className="flex items-center gap-2 text-[var(--text-muted)] font-medium">
                      <Settings size={16} />
                      <span>Configure external service integrations and API keys</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bento-card">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Facebook size={24} />
                      </div>
                      <div>
                        <h3 className="font-black text-[var(--text-base)]">Meta Marketing API</h3>
                        <p className="text-xs text-[var(--text-muted)] font-medium">For Facebook & Instagram Ads</p>
                      </div>
                    </div>
                    <div className="space-y-5">
                      <div>
                        <label className="label">Access Token</label>
                        <input className="input h-11" type="password" value={fbToken} onChange={(e) => setFbToken(e.target.value)} placeholder="EAABxxxx..." />
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Ad Account IDs</h4>
                        <button onClick={() => setFbAdvertisers([...fbAdvertisers, ''])} className="text-[10px] font-bold text-blue-600 flex items-center gap-1 hover:underline">
                          <Plus size={12} /> Add ID
                        </button>
                      </div>
                      <div className="space-y-3">
                        {fbAdvertisers.map((id, idx) => (
                          <div key={idx} className="flex gap-2 items-center bg-[var(--bg-subtle)] p-2 rounded-xl border border-[var(--border-base)]">
                            <input className="input h-9 text-xs py-1.5 flex-1" value={id} onChange={(e) => {
                              const newIds = [...fbAdvertisers];
                              newIds[idx] = e.target.value;
                              setFbAdvertisers(newIds);
                            }} placeholder="act_123..." />
                            <button onClick={() => {
                              const newIds = fbAdvertisers.filter((_, i) => i !== idx);
                              setFbAdvertisers(newIds.length ? newIds : ['']);
                            }} className="p-1.5 text-[var(--text-muted)] hover:text-red-600 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button onClick={saveAutomationConfig} className="btn btn-primary w-full h-11 mt-4">Save Meta Config</button>
                    </div>
                  </div>

                  <div className="bento-card">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                        <Globe size={24} />
                      </div>
                      <div>
                        <h3 className="font-black text-[var(--text-base)]">Google Ads API</h3>
                        <p className="text-xs text-[var(--text-muted)] font-medium">For Search & Display Ads</p>
                      </div>
                    </div>
                    <div className="space-y-5">
                      <div>
                        <label className="label">Refresh Token (Optional per User)</label>
                        <input className="input h-11" type="password" value={gadsRefreshToken} onChange={(e) => setGadsRefreshToken(e.target.value)} placeholder="1//0xxxx..." />
                        <p className="text-[9px] text-[var(--text-muted)] mt-1 italic">Kosongkan jika ingin menggunakan token global dari Admin.</p>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Customer IDs (Optional)</h4>
                        <button onClick={() => setGadsAdvertisers([...gadsAdvertisers, ''])} className="text-[10px] font-bold text-red-600 flex items-center gap-1 hover:underline">
                          <Plus size={12} /> Add ID
                        </button>
                      </div>
                      <div className="space-y-3">
                        {gadsAdvertisers.map((id, idx) => (
                          <div key={idx} className="flex gap-2 items-center bg-[var(--bg-subtle)] p-2 rounded-xl border border-[var(--border-base)]">
                            <input className="input h-9 text-xs py-1.5 flex-1" value={id} onChange={(e) => {
                              const newIds = [...gadsAdvertisers];
                              newIds[idx] = e.target.value;
                              setGadsAdvertisers(newIds);
                            }} placeholder="123-456-7890" />
                            <button onClick={() => {
                              const newIds = gadsAdvertisers.filter((_, i) => i !== idx);
                              setGadsAdvertisers(newIds.length ? newIds : ['']);
                            }} className="p-1.5 text-[var(--text-muted)] hover:text-red-600 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                        <p className="text-[11px] text-red-700 font-medium leading-relaxed">
                          <b>Penting:</b> Pastikan Anda telah memasukkan <b>GADS_CLIENT_ID</b>, <b>GADS_CLIENT_SECRET</b>, dan <b>GADS_REFRESH_TOKEN</b> di panel <b>Secrets</b> AI Studio agar koneksi ini dapat berfungsi.
                        </p>
                      </div>
                      <button onClick={() => {
                        saveAutomationConfig();
                        testGadsConnection();
                      }} className="btn btn-primary w-full h-11 mt-4 bg-red-600 hover:bg-red-700 border-none">Save & Test Connection</button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activePage === 'logs' && currentUser.role === 'admin' && (
              <motion.div key="logs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                  <div>
                    <h1 className="text-4xl font-black tracking-tighter text-[var(--text-base)] mb-2">
                      Activity Logs
                    </h1>
                    <div className="flex items-center gap-2 text-[var(--text-muted)] font-medium">
                      <History size={16} />
                      <span>Audit trail of all system actions and user events</span>
                    </div>
                  </div>
                </div>

                <div className="bento-card p-0 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-[var(--bg-subtle)]/50">
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Timestamp</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">User</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Action</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-base)]">
                        {activityLogs.length > 0 ? activityLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-[var(--bg-subtle)]/50 transition-colors">
                            <td className="px-6 py-4 text-xs font-mono font-bold text-[var(--text-muted)]">
                              {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : '...'}
                            </td>
                            <td className="px-6 py-4 text-xs font-black text-[var(--text-base)]">
                              {log.userName}
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                                log.action === 'login' ? "bg-emerald-100 text-emerald-700" :
                                log.action === 'logout' ? "bg-red-100 text-red-700" :
                                log.action === 'register' ? "bg-blue-100 text-blue-700" : "bg-[var(--bg-subtle)] text-[var(--text-muted)]"
                              )}>
                                {log.action}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs text-[var(--text-muted)] font-medium max-w-xs truncate">
                              {log.details || '-'}
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={4} className="px-6 py-20 text-center">
                              <div className="flex flex-col items-center">
                                <History size={40} className="text-[var(--border-base)] mb-4" />
                                <p className="text-[var(--text-muted)] font-bold">No activity logs found</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Nav */}
      <nav className="md:hidden h-16 bg-[var(--bg-surface)] border-t border-[var(--border-base)] flex items-center justify-around px-2 sticky bottom-0 z-50">
        <MobileNavItem icon={<LayoutDashboard size={20} />} active={activePage === 'dashboard'} onClick={() => setActivePage('dashboard')} />
        <MobileNavItem icon={<MessageSquare size={20} />} active={activePage === 'wa'} onClick={() => setActivePage('wa')} />
        <MobileNavItem icon={<Settings size={20} />} active={activePage === 'setup'} onClick={() => setActivePage('setup')} />
      </nav>

      {/* Modal Add User */}
      <AnimatePresence>
        {isAddingUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsAddingUser(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-2xl bg-[var(--bg-surface)] rounded-[2.5rem] shadow-2xl shadow-indigo-900/10 overflow-hidden">
              <div className="p-8 border-b border-[var(--border-base)] flex justify-between items-center">
                <h2 className="text-2xl font-black tracking-tighter text-[var(--text-base)]">Add New User</h2>
                <button onClick={() => setIsAddingUser(false)} className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] transition-all">
                  <X size={20} />
                </button>
              </div>
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto">
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Basic Information</h4>
                  <div>
                    <label className="label">Full Name</label>
                    <input className="input h-12" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="e.g. John Doe" />
                  </div>
                  <div>
                    <label className="label">Email Address</label>
                    <input className="input h-12" type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="john@example.com" />
                  </div>
                  <div>
                    <label className="label">Password</label>
                    <input className="input h-12" type="password" value={newUserPass} onChange={(e) => setNewUserPass(e.target.value)} placeholder="Set password..." />
                  </div>
                  <div>
                    <label className="label">User Photo</label>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="w-16 h-16 rounded-2xl bg-[var(--bg-subtle)] border-2 border-dashed border-[var(--border-base)] flex items-center justify-center overflow-hidden">
                        {newUserPhotoURL ? (
                          <img src={newUserPhotoURL} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <Camera size={24} className="text-[var(--text-muted)]" />
                        )}
                      </div>
                      <label className="flex-1">
                        <div className="btn bg-[var(--bg-surface)] border border-[var(--border-base)] text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-base)] h-10 text-xs cursor-pointer flex items-center justify-center gap-2">
                          <Upload size={14} /> Upload Photo
                        </div>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, (base64) => setNewUserPhotoURL(base64))}
                        />
                      </label>
                      {newUserPhotoURL && (
                        <button 
                          onClick={() => setNewUserPhotoURL('')}
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="label">WhatsApp Number</label>
                    <input className="input h-12" value={newUserWhatsApp} onChange={(e) => setNewUserWhatsApp(e.target.value)} placeholder="628..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Role</label>
                      <select className="input h-12" value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as any)}>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Status</label>
                      <select className="input h-12" value={newUserStatus} onChange={(e) => setNewUserStatus(e.target.value as any)}>
                        <option value="Aktif">Active</option>
                        <option value="Nonaktif">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Assigned Products</h4>
                  <div className="p-4 bg-[var(--bg-subtle)] border border-[var(--border-base)] rounded-2xl h-[300px] overflow-y-auto space-y-2">
                    {PRODUCTS.map(product => (
                      <label key={product} className="flex items-center gap-3 p-2 hover:bg-[var(--bg-surface)] rounded-xl cursor-pointer transition-all border border-transparent hover:border-[var(--border-base)]">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-[var(--border-base)] text-indigo-600 focus:ring-indigo-500 bg-[var(--bg-surface)]"
                          checked={newUserAssignedProducts.includes(product)}
                          onChange={(e) => {
                            if (e.target.checked) setNewUserAssignedProducts([...newUserAssignedProducts, product]);
                            else setNewUserAssignedProducts(newUserAssignedProducts.filter(p => p !== product));
                          }}
                        />
                        <span className="text-xs font-bold text-[var(--text-base)]">{product}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-8 border-t border-[var(--border-base)] bg-[var(--bg-subtle)]/50">
                <button 
                  onClick={handleAddUser} 
                  disabled={isSavingUser}
                  className="btn btn-primary w-full h-14 text-lg disabled:opacity-70"
                >
                  {isSavingUser ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw size={20} className="animate-spin" /> Creating...
                    </div>
                  ) : 'Create User Account'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Edit User */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingUser(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-2xl bg-[var(--bg-surface)] rounded-[2.5rem] shadow-2xl shadow-indigo-900/10 overflow-hidden">
              <div className="p-8 border-b border-[var(--border-base)] flex justify-between items-center">
                <h2 className="text-2xl font-black tracking-tighter text-[var(--text-base)]">Edit User Profile</h2>
                <button onClick={() => setEditingUser(null)} className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] transition-all">
                  <X size={20} />
                </button>
              </div>
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto">
                <div className="space-y-6">
                  <div className="flex items-center gap-4 p-4 bg-[var(--bg-subtle)] rounded-2xl border border-[var(--border-base)]">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black shadow-sm" 
                      style={{ background: `${editingUser.color}20`, color: editingUser.color }}
                    >
                      {editingUser.initials}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-0.5">Editing User</p>
                      <p className="text-sm font-black text-[var(--text-base)]">{editingUser.name}</p>
                    </div>
                  </div>

                  <div>
                    <label className="label">Full Name</label>
                    <input className="input h-12" value={editingUser.name} onChange={(e) => setEditingUser({...editingUser, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="label">Email Address</label>
                    <input className="input h-12" type="email" value={editingUser.email || ''} onChange={(e) => setEditingUser({...editingUser, email: e.target.value})} placeholder="john@example.com" />
                  </div>
                  <div>
                    <label className="label">Password</label>
                    <input className="input h-12" type="password" value={editingUser.pass || ''} onChange={(e) => setEditingUser({...editingUser, pass: e.target.value})} placeholder="Change password..." />
                  </div>
                  <div>
                    <label className="label">User Photo</label>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="w-16 h-16 rounded-2xl bg-[var(--bg-subtle)] border-2 border-dashed border-[var(--border-base)] flex items-center justify-center overflow-hidden">
                        {editingUser.photoURL ? (
                          <img src={editingUser.photoURL} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <Camera size={24} className="text-[var(--text-muted)]" />
                        )}
                      </div>
                      <label className="flex-1">
                        <div className="btn bg-[var(--bg-surface)] border border-[var(--border-base)] text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-base)] h-10 text-xs cursor-pointer flex items-center justify-center gap-2">
                          <Upload size={14} /> Change Photo
                        </div>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, (base64) => setEditingUser({...editingUser, photoURL: base64}))}
                        />
                      </label>
                      {editingUser.photoURL && (
                        <button 
                          onClick={() => setEditingUser({...editingUser, photoURL: ''})}
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="label">WhatsApp Number</label>
                    <input className="input h-12" value={editingUser.whatsapp || ''} onChange={(e) => setEditingUser({...editingUser, whatsapp: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Role</label>
                      <select className="input h-12" value={editingUser.role} onChange={(e) => setEditingUser({...editingUser, role: e.target.value as any})}>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Status</label>
                      <select className="input h-12" value={editingUser.status} onChange={(e) => setEditingUser({...editingUser, status: e.target.value as any})}>
                        <option value="Aktif">Active</option>
                        <option value="Nonaktif">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Assigned Products</h4>
                  <div className="p-4 bg-[var(--bg-subtle)] border border-[var(--border-base)] rounded-2xl h-[300px] overflow-y-auto space-y-2">
                    {PRODUCTS.map(product => (
                      <label key={product} className="flex items-center gap-3 p-2 hover:bg-[var(--bg-surface)] rounded-xl cursor-pointer transition-all border border-transparent hover:border-[var(--border-base)]">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-[var(--border-base)] text-indigo-600 focus:ring-indigo-500 bg-[var(--bg-surface)]"
                          checked={editingUser.assignedProducts?.includes(product) || false}
                          onChange={(e) => {
                            const current = editingUser.assignedProducts || [];
                            if (e.target.checked) setEditingUser({...editingUser, assignedProducts: [...current, product]});
                            else setEditingUser({...editingUser, assignedProducts: current.filter(p => p !== product)});
                          }}
                        />
                        <span className="text-xs font-bold text-[var(--text-base)]">{product}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-8 border-t border-[var(--border-base)] bg-[var(--bg-subtle)]/50">
                <button 
                  onClick={() => handleUpdateUserAdmin(editingUser.id, editingUser)}
                  disabled={isSavingUser}
                  className="btn btn-primary w-full h-14 text-lg disabled:opacity-70"
                >
                  {isSavingUser ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw size={20} className="animate-spin" /> Saving...
                    </div>
                  ) : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toasts */}
      <AnimatePresence>
        {toasts.map(t => <Toast key={t.id} {...t} onClose={() => removeToast(t.id)} />)}
      </AnimatePresence>

      {/* Modal Google API */}
      <AnimatePresence>
        {isGoogleApiModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsGoogleApiModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md bg-[var(--bg-surface)] rounded-[2.5rem] shadow-2xl overflow-hidden">
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-[var(--text-base)] tracking-tighter">Google API Config</h2>
                    <p className="text-xs text-[var(--text-muted)] font-medium mt-1">Configure your Google Cloud credentials</p>
                  </div>
                  <button onClick={() => setIsGoogleApiModalOpen(false)} className="p-2 hover:bg-[var(--bg-subtle)] rounded-full transition-colors"><X size={20} /></button>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="label">Google Client ID</label>
                    <input 
                      className="input h-12 text-xs" 
                      value={googleClientId} 
                      onChange={(e) => setGoogleClientId(e.target.value)}
                      placeholder="744658823456-abc123xyz.apps.googleusercontent.com"
                    />
                  </div>
                  <div>
                    <label className="label">Google API Key</label>
                    <input 
                      className="input h-12 text-xs" 
                      type="password" 
                      value={googleApiKey} 
                      onChange={(e) => setGoogleApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                    />
                  </div>
                  <div>
                    <label className="label">Redirect URI (Authorized for OAuth)</label>
                    <input className="input h-12 text-xs bg-[var(--bg-subtle)]" value={window.location.origin} readOnly />
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl mt-4">
                    <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
                      <b>Note:</b> After saving, please refresh the page to apply the new credentials. Ensure this URL is added to "Authorized JavaScript origins" in your Google Cloud Console.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <button onClick={() => {
                      localStorage.setItem('kayaraya_google_client_id', googleClientId.trim());
                      localStorage.setItem('kayaraya_google_api_key', googleApiKey.trim());
                      addToast('Configuration saved. Re-initializing...', 'success');
                      initGoogleApis();
                      setIsGoogleApiModalOpen(false);
                    }} className="btn btn-primary h-12 text-sm font-bold">Save Config</button>
                    <button onClick={() => setIsGoogleApiModalOpen(false)} className="btn btn-outline h-12 text-sm font-bold">Cancel</button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Sub-components ---

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all w-full text-left group",
        active 
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 dark:bg-indigo-500 dark:shadow-indigo-900/30" 
          : "text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-base)]"
      )}
    >
      <span className={cn("transition-colors", active ? "text-white" : "text-[var(--text-muted)] group-hover:text-[var(--text-base)]")}>{icon}</span>
      {label}
    </button>
  );
}

function MobileNavItem({ icon, active, onClick }: { icon: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "p-3.5 rounded-2xl transition-all",
        active ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-base)]"
      )}
    >
      {icon}
    </button>
  );
}

function Pill({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
        active 
          ? "bg-indigo-600 text-white shadow-md dark:bg-indigo-500" 
          : "text-[var(--text-muted)] hover:text-[var(--text-base)] hover:bg-[var(--bg-surface)]"
      )}
    >
      {label}
    </button>
  );
}

function MetricCard({ label, value, change, trend, platform }: { label: string, value: string, change: string, trend: 'up' | 'down' | 'neu', platform: 'fb' | 'google' | 'all' }) {
  return (
    <div className="bento-card group">
      <div className={cn(
        "absolute -right-8 -top-8 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500",
        platform === 'fb' ? "bg-blue-600" : platform === 'google' ? "bg-red-600" : "bg-indigo-600"
      )}></div>
      
      <div className="flex items-center justify-between mb-6">
        <span className="text-[10px] font-black text-[var(--text-muted)] tracking-[0.2em] uppercase">{label}</span>
        <div className={cn(
          "w-8 h-8 rounded-xl flex items-center justify-center",
          platform === 'fb' ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : platform === 'google' ? "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400" : "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
        )}>
          {platform === 'fb' ? <Facebook size={14} /> : platform === 'google' ? <Globe size={14} /> : <TrendingUp size={14} />}
        </div>
      </div>
      
      <div className="text-2xl font-black text-[var(--text-base)] tracking-tighter mb-3">{value}</div>
      
      <div className={cn(
        "text-[10px] font-black flex items-center gap-1.5 px-2 py-1 rounded-lg inline-flex uppercase tracking-wider",
        trend === 'up' ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400" : trend === 'down' ? "text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400" : "text-[var(--text-muted)] bg-[var(--bg-subtle)]"
      )}>
        {trend === 'up' && <TrendingUp size={12} />}
        {trend === 'down' && <TrendingDown size={12} />}
        {trend === 'neu' && <Minus size={12} />}
        {change}
      </div>
    </div>
  );
}

function getTopProducts(campaigns: Campaign[]) {
  const prodMap: Record<string, { spend: number, leads: number }> = {};
  campaigns.forEach(c => {
    if (!prodMap[c.product]) prodMap[c.product] = { spend: 0, leads: 0 };
    prodMap[c.product].spend += c.spend;
    prodMap[c.product].leads += c.leads;
  });
  
  const sorted = Object.entries(prodMap)
    .sort((a, b) => b[1].spend - a[1].spend)
    .slice(0, 6);
    
  const maxSpend = sorted[0]?.[1].spend || 1;
  
  return sorted.map(([name, data]) => ({
    name,
    spend: data.spend,
    leads: data.leads,
    percent: Math.round((data.spend / maxSpend) * 100)
  }));
}

function ScheduleItem({ title, sub, time, day, checked }: { title: string, sub: string, time?: string, day?: string, checked: boolean }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#e2e8f0] last:border-0">
      <div>
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-[11.5px] text-[#64748b]">{sub}</div>
      </div>
      <div className="flex items-center gap-3">
        {time && <input type="time" defaultValue={time} className="bg-[#f1f5f9] border border-[#e2e8f0] rounded-md px-2 py-1 text-xs font-mono outline-none focus:border-[#4f46e5]" />}
        {day && (
          <select defaultValue={day} className="bg-[#f1f5f9] border border-[#e2e8f0] rounded-md px-2 py-1 text-xs font-semibold outline-none focus:border-[#4f46e5]">
            <option>Senin</option>
            <option>Selasa</option>
            <option>Rabu</option>
            <option>Kamis</option>
            <option>Jumat</option>
          </select>
        )}
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" defaultChecked={checked} className="sr-only peer" />
          <div className="w-10 h-5.5 bg-[#e2e8f0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:start-[3px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4f46e5]"></div>
        </label>
      </div>
    </div>
  );
}


