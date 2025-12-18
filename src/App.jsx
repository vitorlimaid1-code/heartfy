import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Heart, Search, User, PlusCircle, Bell, Settings, LogOut, 
  ShieldCheck, Star, Trash2, Ban, CheckCircle, Flag, 
  MessageCircle, Share2, Download, Image as ImageIcon, 
  Moon, Sun, LayoutGrid, Users, BarChart3, Globe, 
  Mail, Lock, Smartphone, ChevronRight, X, MoreHorizontal,
  Plus, Bookmark, Eye, TrendingUp, Info, HelpCircle, CreditCard,
  Send, Smile, Mic, Video, MapPin, Hash, Filter, DollarSign,
  PieChart, AlertTriangle, FileText, Briefcase, Camera, ChevronDown,
  Lock as LockIcon, Unlock, UserPlus, UserCheck, MessageSquare, AtSign,
  HeartOff, RefreshCw, UploadCloud, Link as LinkIcon, Sticker, Music,
  History, Target, CreditCard as CardIcon, MoreVertical
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInAnonymously, 
  signInWithCustomToken,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  query, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  where,
  serverTimestamp,
  increment
} from 'firebase/firestore';

// --- CONFIGURAÇÃO FIREBASE ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'heartfy-final-v3';

// --- CONSTANTES ---
const ADMIN_EMAIL = "admin@heartfy.com";
const INTERESTS_OPTIONS = [
  "Fotos", "Amor", "Casais", "Tatuagens", "Carros", "IA", "Papel de Parede", 
  "Patterns", "Decoração", "Moda", "Homens", "Mulheres", "Comida", "Locais", 
  "Objetos", "Desenhos", "Animes", "Arquitetura", "Design"
];

// --- COMPONENTE PRINCIPAL ---
export default function App() {
  // Estados de Sessão
  const [user, setUser] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [view, setView] = useState('home'); 
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Estados de Dados (Firestore)
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [collections, setCollections] = useState([]);
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [reports, setReports] = useState([]);
  const [config, setConfig] = useState({ 
    forbiddenWords: [], 
    customBadges: [], 
    stripeKey: '', 
    stripeSecret: '',
    adPlans: [] 
  });

  // Estados de UI
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [toast, setToast] = useState(null);

  // --- REGRA 3: AUTH INITIALIZATION ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) { console.error(e); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  // --- SYNC PROFILE & ADMIN FOLLOW ---
  useEffect(() => {
    if (!user) return;
    const sync = async () => {
      const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid);
      const snap = await getDoc(userRef);
      const isAdm = user.email === ADMIN_EMAIL;

      if (!snap.exists()) {
        const initialData = {
          uid: user.uid,
          name: user.displayName || "Inspirador(a)",
          username: user.email?.split('@')[0] || `heart_${Math.random().toString(36).substr(2, 5)}`,
          bio: isAdm ? "Canal Oficial do Heartfy" : "",
          profilePic: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
          headerPic: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200",
          followers: [],
          following: ["admin-uid"], 
          likedPosts: [],
          likedCollections: [],
          badges: isAdm ? [{id: 'official', label: 'Canal Oficial', type: 'gold'}] : [],
          isAdmin: isAdm,
          isVerified: isAdm,
          isPrivate: false,
          interests: [],
          socials: { instagram: '', twitter: '', website: '' },
          email: user.email || "",
          createdAt: Date.now()
        };
        await setDoc(userRef, initialData);
        setCurrentUserData(initialData);
        setView('onboarding');
      } else {
        const data = snap.data();
        setCurrentUserData(data);
        if (!data.interests?.length && !data.isAdmin) setView('onboarding');
        if (!data.following?.includes('admin-uid')) {
          await updateDoc(userRef, { following: [...(data.following || []), 'admin-uid'] });
        }
      }
    };
    sync();
  }, [user]);

  // --- FIRESTORE LISTENERS ---
  useEffect(() => {
    if (!user) return;
    
    const unsubPosts = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'posts'), (s) => setPosts(s.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubUsers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), (s) => setUsers(s.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubColl = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'collections'), (s) => setCollections(s.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubConfig = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global'), (s) => s.exists() && setConfig(s.data()));
    const unsubMsg = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'messages'), (s) => setMessages(s.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubReports = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'reports'), (s) => setReports(s.docs.map(d => ({id: d.id, ...d.data()}))));

    return () => {
      unsubPosts(); unsubUsers(); unsubColl(); unsubConfig(); unsubMsg(); unsubReports();
    };
  }, [user]);

  // --- MODERAÇÃO DE CONTEÚDO ---
  const sanitize = (text) => {
    if (!text) return "";
    let clean = text.replace(/(https?:\/\/[^\s]+)/g, "[Link Bloqueado]");
    config.forbiddenWords?.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      clean = clean.replace(regex, '***');
    });
    return clean;
  };

  const showMsg = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLike = async (id, type = 'post') => {
    if (!user || (user.isAnonymous && !currentUserData?.isAdmin)) return setShowAuthModal(true);
    const myRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid);
    const itemRef = doc(db, 'artifacts', appId, 'public', 'data', type === 'post' ? 'posts' : 'collections', id);
    
    const field = type === 'post' ? 'likedPosts' : 'likedCollections';
    const isLiked = currentUserData[field]?.includes(id);
    const newList = isLiked ? currentUserData[field].filter(i => i !== id) : [...(currentUserData[field] || []), id];

    await updateDoc(myRef, { [field]: newList });
    const snap = await getDoc(itemRef);
    if (snap.exists()) {
      const likes = snap.data().likes || [];
      await updateDoc(itemRef, { likes: isLiked ? likes.filter(u => u !== user.uid) : [...likes, user.uid] });
    }
    showMsg(isLiked ? "Removido dos favoritos" : "Favoritado com sucesso!");
  };

  const handleFollow = async (targetUid) => {
    if (!user || (user.isAnonymous && !currentUserData?.isAdmin)) return setShowAuthModal(true);
    if (targetUid === 'admin-uid' && currentUserData.following.includes('admin-uid')) return;

    const myRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid);
    const isFollowing = currentUserData.following.includes(targetUid);
    const newFollowing = isFollowing 
      ? currentUserData.following.filter(id => id !== targetUid)
      : [...currentUserData.following, targetUid];

    await updateDoc(myRef, { following: newFollowing });
    showMsg(isFollowing ? "Deixou de seguir" : "Seguindo agora!");
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setShowAuthModal(false);
      showMsg("Bem-vindo ao Heartfy!");
    } catch (e) { showMsg("Erro ao entrar", "error"); }
  };

  const homePosts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return posts.filter(p => {
      if (p.type && p.type !== 'image') return false;
      const matchesSearch = p.title?.toLowerCase().includes(term) || p.tags?.some(t => t.toLowerCase().includes(term));
      const matchesInterests = !currentUserData?.interests?.length || p.isAdminPost || p.tags?.some(t => currentUserData.interests.includes(t)) || currentUserData.interests.includes(p.category);
      return matchesSearch && matchesInterests;
    }).sort((a, b) => (b.isAdminPost ? 1 : 0) - (a.isAdminPost ? 1 : 0));
  }, [posts, searchTerm, currentUserData]);

  // --- SUBCOMPONENTES ---

  const Badge = ({ badges }) => {
    if (!badges || !badges.length) return null;
    return (
      <>
        {badges.map((b, i) => (
          <div key={i} className="group relative inline-block ml-1">
            {b.type === 'gold' ? <Star size={14} className="text-amber-500 fill-amber-500"/> : <ShieldCheck size={14} className="text-blue-500 fill-blue-500"/>}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-zinc-900 text-white text-[10px] px-3 py-1.5 rounded-xl whitespace-nowrap z-50 shadow-2xl border border-zinc-800 font-black uppercase tracking-widest">
              {b.label}
            </div>
          </div>
        ))}
      </>
    );
  };

  const Header = () => (
    <header className={`fixed top-0 w-full z-50 h-16 border-b transition-all duration-500 ${isDarkMode ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white/95 backdrop-blur-md border-zinc-100 shadow-sm'}`}>
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        <div className="flex items-center gap-10">
          <h1 onClick={() => setView('home')} className="text-2xl font-black tracking-tighter text-rose-500 cursor-pointer hover:scale-105 transition-all active:scale-95">HEARTFY</h1>
          <nav className="hidden lg:flex gap-8 text-[11px] font-black uppercase tracking-[0.2em]">
            <button onClick={() => setView('home')} className={`transition hover:text-rose-500 ${view === 'home' ? 'text-rose-500' : 'text-zinc-500'}`}>Explorar</button>
            <button onClick={() => setView('pulse')} className={`transition hover:text-rose-500 ${view === 'pulse' ? 'text-rose-500' : 'text-zinc-500'}`}>Pulse</button>
            <button onClick={() => setView('global')} className={`transition hover:text-rose-500 ${view === 'global' ? 'text-rose-500' : 'text-zinc-500'}`}>Global</button>
          </nav>
        </div>

        <div className="flex-1 max-w-xl mx-10 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-rose-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Pesquisar inspirações..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-12 pr-4 py-2.5 rounded-full text-sm outline-none transition-all ${isDarkMode ? 'bg-zinc-900 border border-zinc-800 focus:border-rose-500' : 'bg-zinc-100 border-transparent focus:bg-white focus:border-rose-200 focus:shadow-lg'}`} 
          />
        </div>

        <div className="flex items-center gap-5">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          {currentUserData ? (
            <div className="flex items-center gap-4 relative">
              <button className="relative p-2.5 hover:text-rose-500 transition-all"><Bell size={20}/><span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span></button>
              <button onClick={() => setView('chat')} className="p-2.5 hover:text-rose-500 transition-all"><MessageSquare size={20}/></button>
              <div 
                className="w-10 h-10 rounded-full overflow-hidden cursor-pointer border-2 border-rose-100 hover:border-rose-500 transition-all shadow-md" 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <img src={currentUserData.profilePic} className="w-full h-full object-cover" />
              </div>

              {showProfileMenu && (
                <div className={`absolute right-0 top-14 w-64 rounded-[2rem] shadow-2xl border p-2 z-[100] animate-in fade-in slide-in-from-top-3 ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-50'}`}>
                  <div className="p-5 border-b border-zinc-50 dark:border-zinc-800 mb-2 text-center">
                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Olá,</p>
                    <p className="font-black text-sm truncate">@{currentUserData.username}</p>
                  </div>
                  <button onClick={() => { setView('profile'); setShowProfileMenu(false); }} className="w-full text-left p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-2xl flex items-center gap-3 text-sm font-bold transition-all"><User size={18}/> Perfil</button>
                  <button onClick={() => { setView('settings'); setShowProfileMenu(false); }} className="w-full text-left p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-2xl flex items-center gap-3 text-sm font-bold transition-all"><Settings size={18}/> Configurações</button>
                  {currentUserData.isAdmin && (
                    <button onClick={() => { setView('admin'); setShowProfileMenu(false); }} className="w-full text-left p-4 hover:bg-amber-50 dark:hover:bg-amber-900/10 text-amber-600 rounded-2xl flex items-center gap-3 text-sm font-black transition-all"><ShieldCheck size={18}/> Painel Master</button>
                  )}
                  <div className="h-px bg-zinc-50 dark:bg-zinc-800 my-2"></div>
                  <button onClick={() => signOut(auth)} className="w-full text-left p-4 hover:bg-rose-50 dark:hover:bg-rose-900/10 text-rose-500 rounded-2xl flex items-center gap-3 text-sm font-bold transition-all"><LogOut size={18}/> Sair</button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setShowAuthModal(true)} className="bg-rose-500 text-white px-8 py-2.5 rounded-full font-black text-xs uppercase tracking-widest hover:bg-rose-600 shadow-xl shadow-rose-100 transition-all active:scale-95">Entrar</button>
          )}
        </div>
      </div>
    </header>
  );

  const HomeView = () => (
    <div className="pt-24 max-w-7xl mx-auto px-4 pb-32">
      <div className="flex gap-6 overflow-x-auto pb-10 no-scrollbar mb-4">
        {users.slice(0, 15).map(u => (
          <div key={u.uid} className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer group">
            <div className="w-20 h-20 rounded-full p-1 border-2 border-rose-500 group-hover:scale-105 transition-transform duration-700 shadow-lg">
              <img src={u.profilePic} className="w-full h-full rounded-full object-cover" alt={u.username} />
            </div>
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">@{u.username}</span>
          </div>
        ))}
      </div>

      <div className="mb-14">
        <h3 className="text-xs font-black uppercase text-zinc-400 tracking-[0.3em] mb-8 flex items-center gap-3"><LayoutGrid size={16} className="text-rose-500"/> Coleções para se Inspirar</h3>
        <div className="flex gap-8 overflow-x-auto no-scrollbar pb-6">
          {collections.filter(c => c.isPublic).map(c => (
            <div 
              key={c.id} 
              onClick={() => { setSelectedCollection(c); setView('collection_detail'); }}
              className="flex-shrink-0 w-80 h-48 rounded-[3rem] overflow-hidden relative cursor-pointer group shadow-2xl border-4 border-white dark:border-zinc-900 transition-all hover:scale-[1.02]"
            >
              <img src={c.headerPic || c.preview} className="w-full h-full object-cover group-hover:scale-110 transition duration-1000" alt={c.title} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent flex flex-col justify-end p-8">
                <h4 className="text-white font-black text-xl tracking-tight">{c.title}</h4>
                <div className="flex items-center gap-4 text-white/70 text-[10px] font-black uppercase tracking-widest mt-2">
                   <span className="flex items-center gap-1"><ImageIcon size={14}/> {c.pins?.length || 0}</span>
                   <span className="flex items-center gap-1"><Heart size={14} className="fill-rose-500 text-rose-500"/> {c.likes?.length || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-8 space-y-8">
        {homePosts.map(post => {
          const isLiked = currentUserData?.likedPosts?.includes(post.id);
          const author = users.find(u => u.uid === post.userId);

          return (
            <div 
              key={post.id} 
              className="relative group break-inside-avoid rounded-[2.5rem] overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-700 hover:-translate-y-2"
              onClick={() => { setSelectedPost(post); setView('detail'); }}
            >
              <img src={post.url} className="w-full h-auto object-cover" alt={post.title} />
              
              <div className="absolute inset-0 bg-rose-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 flex items-center justify-center pointer-events-none backdrop-blur-[2px]">
                <Heart size={100} className="text-white fill-white animate-pulse" />
              </div>

              <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-500 z-10">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleLike(post.id); }}
                  className={`p-3 rounded-full backdrop-blur-xl transition-all ${isLiked ? 'bg-rose-500 text-white scale-110 shadow-xl' : 'bg-white/40 text-white hover:bg-rose-500 hover:scale-110'}`}
                >
                  <Heart size={20} className={isLiked ? 'fill-current' : ''} />
                </button>
              </div>

              <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col gap-2 translate-y-4 group-hover:translate-y-0">
                <div className="flex items-center gap-3">
                  <img src={author?.profilePic} className="w-8 h-8 rounded-full border-2 border-white/50" alt={author?.username} />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                      <span className="text-white text-[11px] font-black truncate max-w-[80px]">@{author?.username}</span>
                      <Badge badges={author?.badges} />
                    </div>
                  </div>
                  {author?.uid !== user?.uid && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleFollow(author?.uid); }}
                      className="ml-auto bg-white/20 hover:bg-white text-white hover:text-black px-4 py-1.5 rounded-full text-[9px] font-black uppercase transition-all"
                    >
                      {currentUserData?.following?.includes(author?.uid) ? 'Seguindo' : 'Seguir'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const PulseView = () => {
    const [pulseText, setPulseText] = useState("");
    const timeline = posts.filter(p => p.type === 'pulse').sort((a,b) => b.createdAt - a.createdAt);

    const postPulse = async () => {
      if (!pulseText.trim()) return;
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'posts'), {
        type: 'pulse',
        content: sanitize(pulseText),
        userId: user.uid,
        username: currentUserData.username,
        likes: [],
        comments: [],
        createdAt: Date.now()
      });
      setPulseText("");
      showMsg("Pulse enviado!");
    };

    return (
      <div className="pt-24 max-w-2xl mx-auto px-4 pb-40">
        <div className={`p-8 rounded-[2.5rem] mb-12 shadow-xl border ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'}`}>
           <h3 className="text-xl font-black mb-6 flex items-center gap-2"><MessageCircle className="text-rose-500"/> O que está pulsando agora?</h3>
           <div className="flex gap-4">
              <img src={currentUserData?.profilePic} className="w-14 h-14 rounded-full shadow-md" alt="Avatar" />
              <div className="flex-1">
                <textarea 
                  value={pulseText}
                  onChange={(e) => setPulseText(e.target.value)}
                  placeholder="Compartilhe um pensamento, uma frase ou uma ideia..." 
                  className="w-full bg-transparent border-none focus:ring-0 text-lg font-medium resize-none min-h-[120px]"
                ></textarea>
                <div className="flex justify-between items-center mt-6 pt-6 border-t border-zinc-50 dark:border-zinc-800">
                  <div className="flex gap-4 text-zinc-400">
                    <button className="hover:text-rose-500"><ImageIcon size={20}/></button>
                    <button className="hover:text-rose-500"><Smile size={20}/></button>
                  </div>
                  <button onClick={postPulse} className="bg-rose-500 text-white px-10 py-3 rounded-full font-black hover:bg-rose-600 transition shadow-lg shadow-rose-100">Pulsar</button>
                </div>
              </div>
           </div>
        </div>

        <div className="space-y-8">
          {timeline.map(pulse => {
            const author = users.find(u => u.uid === pulse.userId);
            return (
              <div key={pulse.id} className={`p-8 rounded-[2.5rem] shadow-sm border transition-all hover:shadow-xl ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'}`}>
                <div className="flex gap-5">
                  <img src={author?.profilePic} className="w-14 h-14 rounded-full shadow-sm" alt={author?.username} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                         <span className="font-black text-lg">@{author?.username}</span>
                         <Badge badges={author?.badges} />
                      </div>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{new Date(pulse.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="mt-4 text-zinc-600 dark:text-zinc-300 leading-relaxed text-lg">{pulse.content}</p>
                    <div className="mt-8 flex gap-10 text-zinc-400 font-black text-xs uppercase tracking-widest">
                       <button className="flex items-center gap-2 hover:text-rose-500"><MessageCircle size={18}/> {pulse.comments?.length || 0}</button>
                       <button className="flex items-center gap-2 hover:text-rose-500"><RefreshCw size={18}/> Repulsar</button>
                       <button onClick={() => handleLike(pulse.id, 'post')} className={`flex items-center gap-2 hover:text-rose-500 ${pulse.likes?.includes(user?.uid) ? 'text-rose-500' : ''}`}>
                          <Heart size={18} className={pulse.likes?.includes(user?.uid) ? 'fill-current' : ''}/> {pulse.likes?.length || 0}
                       </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const AdminPanel = () => {
    const [tab, setTab] = useState('users');
    const [newBadge, setNewBadge] = useState({ label: '', type: 'blue' });
    const [newWord, setNewWord] = useState('');

    const addBadgeType = async () => {
      if (!newBadge.label) return;
      const updated = { ...config, customBadges: [...(config.customBadges || []), { ...newBadge, id: Date.now() }] };
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global'), updated);
      setNewBadge({ label: '', type: 'blue' });
      showMsg("Selo criado!");
    };

    const blockWord = async () => {
      if (!newWord) return;
      const updated = { ...config, forbiddenWords: [...(config.forbiddenWords || []), newWord.toLowerCase()] };
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global'), updated);
      setNewWord('');
      showMsg("Palavra/Link bloqueado!");
    };

    return (
      <div className="pt-24 max-w-7xl mx-auto px-4 pb-40">
        <div className="flex flex-col md:flex-row items-center justify-between mb-16 gap-8">
           <h2 className="text-5xl font-black tracking-tighter">Painel de Administração Master</h2>
           <div className="flex bg-zinc-100 dark:bg-zinc-800 p-2 rounded-[2.5rem] shadow-inner">
             {['users', 'content', 'badges', 'revenue'].map(t => (
               <button 
                key={t} 
                onClick={() => setTab(t)}
                className={`px-8 py-3.5 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${tab === t ? 'bg-white dark:bg-zinc-700 shadow-xl text-rose-500 scale-105' : 'text-zinc-400 hover:text-zinc-600'}`}
               >
                 {t}
               </button>
             ))}
           </div>
        </div>

        {tab === 'users' && (
          <div className={`rounded-[3.5rem] overflow-hidden border transition-all ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white shadow-2xl border-zinc-50'}`}>
            <table className="w-full text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-[10px] font-black uppercase text-zinc-400 tracking-[0.3em]">
                <tr>
                  <th className="p-10">Membro</th>
                  <th className="p-10">Status / Selos</th>
                  <th className="p-10">Ações de Selo</th>
                  <th className="p-10 text-right">Moderação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                {users.map(u => (
                  <tr key={u.uid} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="p-10 flex items-center gap-6">
                      <img src={u.profilePic} className="w-16 h-16 rounded-full border-4 border-rose-100 shadow-sm" alt="Avatar" />
                      <div>
                        <p className="font-black text-lg tracking-tight">@{u.username}</p>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase">{u.email}</p>
                      </div>
                    </td>
                    <td className="p-10">
                       <div className="flex flex-wrap gap-2"><Badge badges={u.badges}/></div>
                    </td>
                    <td className="p-10">
                      <select 
                        className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-2xl text-[10px] font-black uppercase outline-none focus:ring-4 focus:ring-rose-100 border-none shadow-sm"
                        onChange={async (e) => {
                          const badge = config.customBadges?.find(b => b.id.toString() === e.target.value);
                          if (!badge) return;
                          const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', u.uid);
                          await updateDoc(userRef, { badges: [...(u.badges || []), badge] });
                          showMsg("Selo concedido!");
                        }}
                      >
                        <option value="">Conceder Selo...</option>
                        {config.customBadges?.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
                      </select>
                    </td>
                    <td className="p-10 text-right">
                       <div className="flex gap-4 justify-end">
                          <button className="p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"><Ban size={20}/></button>
                          <button 
                            onClick={async () => {
                              await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', u.uid), { badges: [] });
                              showMsg("Selos resetados.");
                            }}
                            className="p-4 bg-zinc-100 text-zinc-400 rounded-2xl hover:bg-zinc-950 hover:text-white transition-all shadow-sm"
                          >
                            <RefreshCw size={20}/>
                          </button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'content' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className={`p-12 rounded-[4rem] ${isDarkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white shadow-2xl border'}`}>
              <h3 className="text-3xl font-black mb-8 tracking-tighter">Filtro Master de Segurança</h3>
              <p className="text-zinc-500 text-sm mb-10 leading-relaxed font-medium">Bloqueie palavras ofensivas ou domínios de links indesejados. O conteúdo será higienizado em toda a plataforma.</p>
              <div className="flex gap-4 mb-12">
                <input 
                  placeholder="Ex: ofensivo, linksuspito.com..." 
                  className="flex-1 p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-800 border-none outline-none focus:ring-4 focus:ring-rose-100 font-bold" 
                  value={newWord}
                  onChange={e => setNewWord(e.target.value)}
                />
                <button onClick={blockWord} className="bg-rose-500 text-white px-10 rounded-3xl font-black hover:bg-rose-600 shadow-xl shadow-rose-100 transition-all active:scale-95">Bloquear</button>
              </div>
              <div className="flex flex-wrap gap-3">
                {config.forbiddenWords?.map(w => (
                  <span key={w} className="px-6 py-3 bg-rose-50 text-rose-500 rounded-full text-[11px] font-black uppercase tracking-widest flex items-center gap-4 border border-rose-100 animate-in fade-in zoom-in duration-300">
                    {w} <X size={16} className="cursor-pointer hover:rotate-90 transition-transform" onClick={async () => {
                       const updated = config.forbiddenWords.filter(x => x !== w);
                       await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global'), { ...config, forbiddenWords: updated });
                    }}/>
                  </span>
                ))}
              </div>
            </div>

            <div className={`p-12 rounded-[4rem] ${isDarkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white shadow-2xl border'}`}>
              <h3 className="text-3xl font-black mb-8 tracking-tighter flex items-center gap-4">Denúncias Ativas <span className="text-xs bg-rose-100 text-rose-500 px-4 py-1 rounded-full">{reports.length}</span></h3>
              <div className="space-y-6">
                {reports.map(r => (
                  <div key={r.id} className="p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl flex items-center justify-between border border-zinc-100 dark:border-zinc-800">
                    <div>
                      <p className="font-black text-sm uppercase tracking-widest">Motivo: {r.reason}</p>
                      <p className="text-xs text-zinc-400 mt-1">Por: @{r.reporterName}</p>
                    </div>
                    <div className="flex gap-2">
                       <button className="p-3 bg-white dark:bg-zinc-700 text-zinc-400 rounded-xl hover:text-emerald-500 shadow-sm"><CheckCircle size={18}/></button>
                       <button className="p-3 bg-white dark:bg-zinc-700 text-zinc-400 rounded-xl hover:text-rose-500 shadow-sm"><Trash2 size={18}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'badges' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className={`p-12 rounded-[4rem] ${isDarkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white shadow-2xl'}`}>
              <h3 className="text-3xl font-black mb-8 tracking-tighter">Criar Categorias de Selo</h3>
              <div className="space-y-8">
                <input 
                  placeholder="Título (Ex: Curador, VIP, Parceiro)" 
                  className="w-full p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-800 outline-none font-bold text-lg focus:ring-4 focus:ring-rose-100 border-none transition-all" 
                  value={newBadge.label} 
                  onChange={e => setNewBadge({...newBadge, label: e.target.value})} 
                />
                <div className="flex gap-6">
                  <button onClick={() => setNewBadge({...newBadge, type: 'blue'})} className={`flex-1 py-6 rounded-3xl border-4 transition-all font-black uppercase tracking-[0.2em] text-xs ${newBadge.type === 'blue' ? 'border-blue-500 bg-blue-50 text-blue-500 shadow-xl' : 'border-zinc-100 text-zinc-400'}`}>Estilo Azul</button>
                  <button onClick={() => setNewBadge({...newBadge, type: 'gold'})} className={`flex-1 py-6 rounded-3xl border-4 transition-all font-black uppercase tracking-[0.2em] text-xs ${newBadge.type === 'gold' ? 'border-amber-500 bg-amber-50 text-amber-500 shadow-xl' : 'border-zinc-100 text-zinc-400'}`}>Estilo Dourado</button>
                </div>
                <button onClick={addBadgeType} className="w-full py-7 bg-zinc-950 dark:bg-white dark:text-black text-white rounded-[2.5rem] font-black text-xl shadow-2xl transition-all hover:scale-[1.02] active:scale-95">Publicar Categoria</button>
              </div>
            </div>
            
            <div className="space-y-6">
              {config.customBadges?.map(b => (
                <div key={b.id} className={`p-10 rounded-[3rem] flex items-center justify-between transition-all hover:shadow-2xl ${isDarkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white shadow-xl border border-zinc-50'}`}>
                   <div className="flex items-center gap-6">
                      <div className={`p-5 rounded-[1.5rem] ${b.type === 'gold' ? 'bg-amber-100 text-amber-500' : 'bg-blue-100 text-blue-500'} shadow-inner`}>
                         {b.type === 'gold' ? <Star size={28}/> : <ShieldCheck size={28}/>}
                      </div>
                      <div>
                        <p className="font-black text-2xl tracking-tight">{b.label}</p>
                        <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.3em]">{b.type === 'gold' ? 'Badge de Ouro' : 'Badge Verificado'}</p>
                      </div>
                   </div>
                   <button 
                    onClick={async () => {
                      const updated = config.customBadges.filter(x => x.id !== b.id);
                      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global'), { ...config, customBadges: updated });
                    }}
                    className="p-5 text-zinc-300 hover:text-rose-500 transition-all hover:scale-125"
                   >
                     <Trash2 size={28}/>
                   </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const Onboarding = () => {
    const [selected, setSelected] = useState([]);
    
    const toggle = (interest) => {
      setSelected(prev => prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]);
    };

    const save = async () => {
      if (selected.length < 3) return showMsg("Selecione pelo menos 3 interesses", "error");
      const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid);
      await updateDoc(userRef, { interests: selected });
      setCurrentUserData(prev => ({ ...prev, interests: selected }));
      setView('home');
      showMsg("Bem-vindo ao Heartfy!");
    };

    return (
      <div className="fixed inset-0 z-[200] bg-white dark:bg-zinc-950 flex items-center justify-center p-6">
        <div className="max-w-3xl w-full text-center">
          <h2 className="text-5xl font-black mb-6 tracking-tighter">O que faz seu coração bater?</h2>
          <p className="text-zinc-500 text-lg mb-12">Selecione os temas que você mais ama para personalizarmos sua jornada.</p>
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {INTERESTS_OPTIONS.map(i => (
              <button 
                key={i} 
                onClick={() => toggle(i)}
                className={`px-8 py-4 rounded-full font-black transition-all text-sm border-2 ${selected.includes(i) ? 'bg-rose-500 border-rose-500 text-white shadow-xl scale-110' : 'bg-transparent border-zinc-100 dark:border-zinc-800 text-zinc-400 hover:border-rose-200'}`}
              >
                {i}
              </button>
            ))}
          </div>
          <button onClick={save} className="bg-zinc-900 dark:bg-white dark:text-black text-white px-16 py-5 rounded-[2rem] font-black text-xl hover:scale-105 transition active:scale-95 shadow-2xl">Entrar no Heartfy</button>
        </div>
      </div>
    );
  };

  const Footer = () => (
    <footer className={`mt-40 py-32 border-t ${isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-400' : 'bg-white border-zinc-100 text-zinc-500'} transition-all duration-300`}>
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-20">
        <div className="col-span-2">
          <h2 className="text-5xl font-black text-rose-500 mb-10 tracking-tighter">HEARTFY</h2>
          <p className="max-w-sm text-base font-bold leading-relaxed mb-12 opacity-80">Capture a beleza, colecione a inspiração e compartilhe a sua alma criativa com o mundo. Onde as imagens se tornam sentimentos.</p>
          <div className="flex gap-8">
            <div className="w-14 h-14 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center cursor-pointer hover:bg-rose-500 hover:text-white transition-all hover:scale-110 shadow-sm group">
              <AtSign size={24}/>
            </div>
            <div className="w-14 h-14 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center cursor-pointer hover:bg-rose-500 hover:text-white transition-all hover:scale-110 shadow-sm group">
              <Globe size={24}/>
            </div>
            <div className="w-14 h-14 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center cursor-pointer hover:bg-rose-500 hover:text-white transition-all hover:scale-110 shadow-sm group">
              <Users size={24}/>
            </div>
            <div className="w-14 h-14 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center cursor-pointer hover:bg-rose-500 hover:text-white transition-all hover:scale-110 shadow-sm group">
              <Target size={24}/>
            </div>
          </div>
        </div>
        <div>
          <h4 className="font-black text-xs text-zinc-900 dark:text-white mb-10 uppercase tracking-[0.4em] opacity-50">Explorar</h4>
          <ul className="space-y-5 text-[10px] font-black uppercase tracking-widest">
            {['Sobre Nós', 'Carreiras', 'Blog', 'Publicidade', 'Empresa'].map(l => <li key={l} className="hover:text-rose-500 cursor-pointer transition-all">{l}</li>)}
          </ul>
        </div>
        <div>
          <h4 className="font-black text-xs text-zinc-900 dark:text-white mb-10 uppercase tracking-[0.4em] opacity-50">Suporte</h4>
          <ul className="space-y-5 text-[10px] font-black uppercase tracking-widest">
            {['FAQ', 'Diretrizes', 'Ajuda', 'Segurança', 'Contato'].map(l => <li key={l} className="hover:text-rose-500 cursor-pointer transition-all">{l}</li>)}
          </ul>
        </div>
        <div>
          <h4 className="font-black text-xs text-zinc-900 dark:text-white mb-10 uppercase tracking-[0.4em] opacity-50">Legal</h4>
          <ul className="space-y-5 text-[10px] font-black uppercase tracking-widest">
            {['Privacidade', 'Termos', 'Cookies', 'Licenças'].map(l => <li key={l} className="hover:text-rose-500 cursor-pointer transition-all">{l}</li>)}
          </ul>
        </div>
        <div>
          <h4 className="font-black text-xs text-zinc-900 dark:text-white mb-10 uppercase tracking-[0.4em] opacity-50">Premium</h4>
          <ul className="space-y-5 text-[10px] font-black uppercase tracking-widest">
            {['Selo Gold', 'Selo Blue', 'Doações', 'API Heartfy'].map(l => <li key={l} className="hover:text-amber-500 cursor-pointer transition-all">{l}</li>)}
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 mt-32 pt-16 border-t border-zinc-100 dark:border-zinc-900 flex flex-col md:flex-row justify-between gap-10 text-[10px] font-black uppercase tracking-[0.5em] text-zinc-400">
        <span className="opacity-50">© 2025 Heartfy Inc. Inspirando cada pixel.</span>
        <div className="flex gap-12">
          <span className="text-rose-500 underline underline-offset-8 decoration-2">Português (Brasil)</span>
          <span className="hover:text-zinc-600 transition-all cursor-pointer">English (US)</span>
          <span className="hover:text-zinc-600 transition-all cursor-pointer">Español</span>
        </div>
      </div>
    </footer>
  );

  return (
    <div className={`min-h-screen transition-all duration-700 ${isDarkMode ? 'bg-black text-white' : 'bg-[#FAFAFA] text-zinc-900'} font-sans antialiased selection:bg-rose-100 selection:text-rose-600`}>
      <Header />
      
      <main className="min-h-screen">
        {view === 'home' && <HomeView />}
        {view === 'pulse' && <PulseView />}
        {view === 'onboarding' && <Onboarding />}
        {view === 'admin' && <AdminPanel />}
        
        {view === 'global' && (
          <div className="pt-24 max-w-5xl mx-auto px-4 pb-40">
             <div className="text-center mb-20 animate-in fade-in zoom-in-95 duration-700">
               <h2 className="text-6xl font-black tracking-tighter mb-4">Universo Heartfy</h2>
               <p className="text-zinc-400 font-black uppercase tracking-[0.4em] text-[10px]">Descubra as mentes mais criativas da nossa comunidade</p>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
               {users.map(u => {
                 const isFollowing = currentUserData?.following?.includes(u.uid);
                 return (
                   <div key={u.uid} className={`p-10 rounded-[3.5rem] flex flex-col items-center transition-all duration-500 hover:shadow-2xl hover:-translate-y-3 ${isDarkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white shadow-xl border border-zinc-50'}`}>
                     <div className="relative mb-8">
                       <img src={u.profilePic} className="w-28 h-28 rounded-full object-cover border-4 border-rose-100 shadow-xl" alt="Avatar" />
                       <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-6 h-6 rounded-full border-4 border-white shadow-md animate-pulse"></div>
                     </div>
                     <div className="text-center mb-10">
                        <div className="flex items-center justify-center gap-2 font-black text-2xl tracking-tighter">
                          {u.name} <Badge badges={u.badges} />
                        </div>
                        <p className="text-xs text-rose-500 font-black uppercase tracking-[0.2em] mt-2">@{u.username}</p>
                        <p className="text-[10px] text-zinc-400 mt-6 font-black uppercase tracking-widest">{u.followers?.length || 0} Seguidores</p>
                     </div>
                     {u.uid !== user?.uid && (
                       <button 
                        onClick={() => handleFollow(u.uid)}
                        className={`w-full py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] transition-all ${isFollowing ? 'bg-zinc-100 text-zinc-400' : 'bg-rose-500 text-white shadow-2xl shadow-rose-100 hover:scale-105 active:scale-95'}`}
                       >
                         {isFollowing ? 'Seguindo' : 'Seguir'}
                       </button>
                     )}
                   </div>
                 );
               })}
             </div>
          </div>
        )}

        {view === 'detail' && selectedPost && (
          <div className="pt-24 max-w-7xl mx-auto px-4 pb-40 animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <button onClick={() => setView('home')} className="mb-14 flex items-center gap-4 font-black text-rose-500 hover:gap-6 transition-all uppercase tracking-[0.3em] text-[10px] group">
              <ChevronRight className="rotate-180 group-hover:scale-125 transition" size={24}/> Voltar ao Feed
            </button>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-24">
              <div className="relative group">
                 <img src={selectedPost.url} className="w-full rounded-[4rem] shadow-2xl border-4 border-white dark:border-zinc-800 transition-all duration-1000" alt={selectedPost.title} />
                 <div className="absolute top-10 right-10 flex flex-col gap-5 scale-0 group-hover:scale-100 transition-transform duration-700 origin-right">
                    <button className="p-6 bg-white/40 backdrop-blur-3xl rounded-[2rem] text-white hover:bg-rose-500 transition shadow-2xl active:scale-90"><Download size={32}/></button>
                    <button className="p-6 bg-white/40 backdrop-blur-3xl rounded-[2rem] text-white hover:bg-zinc-950 transition shadow-2xl active:scale-90"><Flag size={32}/></button>
                 </div>
              </div>
              <div className="flex flex-col py-10">
                <div className="flex items-center justify-between mb-16 bg-white/40 dark:bg-zinc-900/40 p-8 rounded-[3rem] backdrop-blur-2xl shadow-sm border border-zinc-100/50 dark:border-zinc-800/50">
                  <div className="flex items-center gap-6">
                    <img src={users.find(u => u.uid === selectedPost.userId)?.profilePic} className="w-20 h-20 rounded-full border-4 border-rose-100 shadow-xl" alt="Avatar" />
                    <div>
                       <div className="flex items-center gap-2">
                          <h3 className="text-3xl font-black tracking-tighter">@{users.find(u => u.uid === selectedPost.userId)?.username}</h3>
                          <Badge badges={users.find(u => u.uid === selectedPost.userId)?.badges}/>
                       </div>
                       <p className="text-zinc-400 font-black uppercase tracking-[0.2em] text-[9px] mt-2">{users.find(u => u.uid === selectedPost.userId)?.followers?.length || 0} Seguidores</p>
                    </div>
                  </div>
                  {selectedPost.userId !== user?.uid && (
                    <button 
                      onClick={() => handleFollow(selectedPost.userId)}
                      className={`px-12 py-4.5 rounded-full font-black text-[10px] uppercase tracking-[0.3em] transition-all shadow-2xl ${currentUserData?.following?.includes(selectedPost.userId) ? 'bg-zinc-100 text-zinc-400' : 'bg-rose-500 text-white shadow-rose-200 hover:scale-105 active:scale-95'}`}
                    >
                      {currentUserData?.following?.includes(selectedPost.userId) ? 'Seguindo' : 'Seguir'}
                    </button>
                  )}
                </div>

                <h2 className="text-6xl font-black mb-10 leading-tight tracking-tighter">{sanitize(selectedPost.title || "Inspiracional Heartfy")}</h2>
                <p className="text-zinc-500 text-2xl leading-relaxed mb-20 font-medium opacity-90">{sanitize(selectedPost.description || "Uma curadoria exclusiva para a sua alma criativa.")}</p>
                
                <div className="flex flex-wrap gap-5 mb-20">
                   {selectedPost.tags?.map(t => (
                     <span key={t} className="px-10 py-4 bg-zinc-100 dark:bg-zinc-900 rounded-full text-[11px] font-black uppercase tracking-widest text-zinc-400 hover:text-rose-500 hover:bg-rose-50 transition-all cursor-pointer shadow-sm">#{t}</span>
                   ))}
                </div>

                <div className="flex gap-8 mt-auto">
                   <button 
                    onClick={() => handleLike(selectedPost.id)}
                    className={`flex-1 py-8 rounded-[3rem] font-black text-2xl flex items-center justify-center gap-5 transition-all shadow-2xl ${currentUserData?.likedPosts?.includes(selectedPost.id) ? 'bg-zinc-950 text-white scale-105 shadow-zinc-200' : 'bg-rose-500 text-white shadow-rose-200 hover:scale-[1.03] active:scale-95'}`}
                   >
                     <Heart className={currentUserData?.likedPosts?.includes(selectedPost.id) ? 'fill-current' : ''} size={32}/> {currentUserData?.likedPosts?.includes(selectedPost.id) ? 'Salvo no Perfil' : 'Salvar Inspiração'}
                   </button>
                   <button className="p-8 bg-zinc-100 dark:bg-zinc-800 rounded-[3rem] hover:scale-110 transition-all active:scale-95 shadow-xl group hover:bg-rose-500 hover:text-white"><Share2 size={32}/></button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {showAuthModal && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-3xl flex items-center justify-center p-8 animate-in fade-in zoom-in duration-500">
          <div className={`w-full max-w-xl p-16 rounded-[4.5rem] relative overflow-hidden transition-all ${isDarkMode ? 'bg-zinc-900 text-white border border-zinc-800' : 'bg-white shadow-2xl'}`}>
            <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-rose-400 via-rose-500 to-rose-600"></div>
            <button onClick={() => setShowAuthModal(false)} className="absolute top-14 right-14 p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all hover:rotate-90"><X/></button>
            <div className="text-center mb-20">
               <h2 className="text-6xl font-black text-rose-500 mb-4 tracking-tighter">HEARTFY</h2>
               <p className="text-zinc-400 font-black uppercase tracking-[0.5em] text-[10px]">Explore o belo. Viva o agora.</p>
            </div>
            
            <button onClick={handleGoogleLogin} className="w-full py-7 bg-white border-4 border-zinc-50 text-zinc-900 rounded-[3rem] font-black flex items-center justify-center gap-5 hover:shadow-2xl transition-all shadow-xl shadow-zinc-100 hover:-translate-y-2 mb-10 group">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-8 h-8 group-hover:scale-110 transition" alt="Google" /> Entrar com Google
            </button>
            
            <div className="flex items-center gap-8 my-14 opacity-40">
              <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700"></div>
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.5em]">Acesso Manual</span>
              <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700"></div>
            </div>

            <div className="space-y-6">
               <input type="email" placeholder="Seu e-mail..." className="w-full p-6 rounded-[2rem] bg-zinc-50 dark:bg-zinc-800 border-none outline-none focus:ring-4 focus:ring-rose-100 transition-all font-bold text-lg" />
               <input type="password" placeholder="Sua senha..." className="w-full p-6 rounded-[2rem] bg-zinc-50 dark:bg-zinc-800 border-none outline-none focus:ring-4 focus:ring-rose-100 transition-all font-bold text-lg" />
               <button className="w-full py-7 bg-rose-500 text-white rounded-[3rem] font-black text-2xl shadow-2xl shadow-rose-200 hover:bg-rose-600 transition-all hover:scale-[1.02] active:scale-95">Criar Conta no Heartfy</button>
            </div>

            <p className="mt-16 text-center text-[10px] text-zinc-400 font-black uppercase tracking-widest leading-relaxed">Sua jornada começa aqui. Ao entrar, você concorda com nossas <br/><span className="text-rose-400 cursor-pointer underline underline-offset-8">Diretrizes de Comunidade</span>.</p>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-14 left-1/2 -translate-x-1/2 px-16 py-7 bg-zinc-950 text-white rounded-[4rem] font-black text-sm shadow-2xl z-[1000] animate-in slide-in-from-bottom-20 fade-in duration-500 flex items-center gap-6 border border-zinc-800 backdrop-blur-2xl">
          <div className={`w-3 h-3 rounded-full animate-ping ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
          <span className="uppercase tracking-widest">{toast.msg}</span>
        </div>
      )}

      <Footer />
    </div>
  );
}
