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
  Unlock, UserPlus, UserCheck, MessageSquare, AtSign,
  HeartOff, RefreshCw, UploadCloud, Link as LinkIcon, Sticker, Music,
  History, Target, MoreVertical
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
const firebaseConfig = {
  apiKey: "AIzaSyDSbmqfTYS8dt3BQDnqFRzicEXHWmqUDDc",
  authDomain: "heartfy-2c58b.firebaseapp.com",
  projectId: "heartfy-2c58b",
  storageBucket: "heartfy-2c58b.firebasestorage.app",
  messagingSenderId: "962356538144",
  appId: "1:962356538144:web:cbfa91ce5abc6d63598545",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = 'heartfy-prod-v1';

const ADMIN_EMAIL = "admin@heartfy.com";
const INTERESTS_OPTIONS = [
  "Fotos", "Amor", "Casais", "Tatuagens", "Carros", "IA", "Papel de Parede", 
  "Patterns", "Decoração", "Moda", "Homens", "Mulheres", "Comida", "Locais", 
  "Objetos", "Desenhos", "Animes", "Arquitetura", "Design"
];

export default function App() {
  const [user, setUser] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [view, setView] = useState('home'); 
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [collections, setCollections] = useState([]);
  const [reports, setReports] = useState([]);
  const [config, setConfig] = useState({ forbiddenWords: [], customBadges: [], stripeKey: '' });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPost, setSelectedPost] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

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
          username: user.email?.split('@')[0] || `user_${Math.random().toString(36).substr(2, 5)}`,
          bio: isAdm ? "Canal Oficial do Heartfy" : "",
          profilePic: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
          headerPic: "[https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200](https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200)",
          followers: [],
          following: ["admin-uid"], 
          likedPosts: [],
          likedCollections: [],
          badges: isAdm ? [{id: 'official', label: 'Canal Oficial', type: 'gold'}] : [],
          isAdmin: isAdm,
          isVerified: isAdm,
          interests: [],
          email: user.email || "",
          createdAt: Date.now()
        };
        await setDoc(userRef, initialData);
        setCurrentUserData(initialData);
        setView('onboarding');
      } else {
        const data = snap.data();
        setCurrentUserData(data);
        if (!data.interests?.length && !data.isAdmin && !user.isAnonymous) setView('onboarding');
      }
    };
    sync();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsubPosts = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'posts'), (s) => setPosts(s.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubUsers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), (s) => setUsers(s.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubColl = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'collections'), (s) => setCollections(s.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubConfig = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global'), (s) => s.exists() && setConfig(s.data()));
    const unsubReports = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'reports'), (s) => setReports(s.docs.map(d => ({id: d.id, ...d.data()}))));
    return () => { unsubPosts(); unsubUsers(); unsubColl(); unsubConfig(); unsubReports(); };
  }, [user]);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setShowAuthModal(false);
      showMsg("Bem-vindo(a)!");
    } catch (e) {
      console.error(e);
      showMsg("Erro ao entrar", "error");
    }
  };

  const sanitize = (text) => {
    if (!text) return "";
    let clean = text.replace(/(https?:\/\/[^\s]+)/g, "[Link Removido]");
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

  const handleLike = async (postId) => {
    if (!user || (user.isAnonymous && !currentUserData?.isAdmin)) return setShowAuthModal(true);
    const myRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid);
    const postRef = doc(db, 'artifacts', appId, 'public', 'data', 'posts', postId);
    const isLiked = currentUserData?.likedPosts?.includes(postId);
    const newList = isLiked ? currentUserData.likedPosts.filter(i => i !== postId) : [...(currentUserData.likedPosts || []), postId];
    await updateDoc(myRef, { likedPosts: newList });
    const snap = await getDoc(postRef);
    if (snap.exists()) {
      const currentLikes = snap.data().likes || [];
      await updateDoc(postRef, { likes: isLiked ? currentLikes.filter(u => u !== user.uid) : [...currentLikes, user.uid] });
    }
    showMsg(isLiked ? "Removido do coração" : "Adicionado ao coração!");
  };

  const handleFollow = async (targetUid) => {
    if (!user || (user.isAnonymous && !currentUserData?.isAdmin)) return setShowAuthModal(true);
    const myRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid);
    const isFollowing = currentUserData?.following?.includes(targetUid);
    const newFollowing = isFollowing ? currentUserData.following.filter(id => id !== targetUid) : [...(currentUserData.following || []), targetUid];
    await updateDoc(myRef, { following: newFollowing });
    showMsg(isFollowing ? "Deixou de seguir" : "Seguindo agora!");
  };

  const homePosts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return posts.filter(p => {
      const matchesSearch = p.title?.toLowerCase().includes(term) || p.tags?.some(t => t.toLowerCase().includes(term));
      const matchesInterests = !currentUserData?.interests?.length || p.isAdminPost || p.tags?.some(t => currentUserData.interests.includes(t));
      return matchesSearch && matchesInterests;
    }).sort((a, b) => (b.isAdminPost ? 1 : 0) - (a.isAdminPost ? 1 : 0));
  }, [posts, searchTerm, currentUserData]);

  const Badge = ({ badges }) => {
    if (!badges || !badges.length) return null;
    return badges.map((b, i) => (
      <div key={i} className="group relative inline-block ml-1">
        {b.type === 'gold' ? <Star size={14} className="text-amber-500 fill-amber-500"/> : <ShieldCheck size={14} className="text-blue-500 fill-blue-500"/>}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-zinc-900 text-white text-[10px] px-2 py-1 rounded font-black uppercase whitespace-nowrap z-50">{b.label}</div>
      </div>
    ));
  };

  const Header = () => (
    <header className={`fixed top-0 w-full z-50 h-16 border-b transition-all duration-300 ${isDarkMode ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white/95 backdrop-blur-md border-zinc-100 shadow-sm'}`}>
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        <div className="flex items-center gap-8">
          <h1 onClick={() => setView('home')} className="text-2xl font-black tracking-tighter text-rose-500 cursor-pointer hover:scale-105 transition-all">HEARTFY</h1>
          <nav className="hidden md:flex gap-6 text-[10px] font-black uppercase tracking-widest">
            <button onClick={() => setView('home')} className={view === 'home' ? 'text-rose-500' : 'text-zinc-500'}>Explorar</button>
            <button onClick={() => setView('pulse')} className={view === 'pulse' ? 'text-rose-500' : 'text-zinc-500'}>Pulse</button>
          </nav>
        </div>
        <div className="flex-1 max-w-lg mx-8 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input 
            type="text" placeholder="Pesquisar..." 
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-12 pr-4 py-2.5 rounded-full text-sm outline-none transition-all ${isDarkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-zinc-100 border-transparent focus:bg-white focus:border-rose-200'}`} 
          />
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2">{isDarkMode ? <Sun size={20}/> : <Moon size={20}/>}</button>
          {currentUserData ? (
            <div className="relative">
              <img src={currentUserData.profilePic} className="w-9 h-9 rounded-full cursor-pointer border-2 border-rose-100" onClick={() => setShowProfileMenu(!showProfileMenu)} />
              {showProfileMenu && (
                <div className={`absolute right-0 mt-3 w-56 rounded-2xl shadow-2xl border p-2 z-[100] ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white'}`}>
                  <button onClick={() => { setView('profile'); setShowProfileMenu(false); }} className="w-full text-left p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl flex items-center gap-3 text-sm font-bold transition-all"><User size={18}/> Perfil</button>
                  <button onClick={() => { setView('global'); setShowProfileMenu(false); }} className="w-full text-left p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl flex items-center gap-3 text-sm font-bold transition-all"><Globe size={18}/> Global</button>
                  {currentUserData.isAdmin && <button onClick={() => { setView('admin'); setShowProfileMenu(false); }} className="w-full text-left p-3 hover:bg-amber-50 dark:hover:bg-amber-900/10 text-amber-600 rounded-xl flex items-center gap-3 text-sm font-black transition-all"><ShieldCheck size={18}/> Admin</button>}
                  <button onClick={() => signOut(auth)} className="w-full text-left p-3 text-rose-500 rounded-xl flex items-center gap-3 text-sm font-bold transition-all"><LogOut size={18}/> Sair</button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setShowAuthModal(true)} className="bg-rose-500 text-white px-8 py-2 rounded-full font-black text-xs uppercase hover:bg-rose-600 transition-all">Entrar</button>
          )}
        </div>
      </div>
    </header>
  );

  const HomeView = () => (
    <div className="pt-24 max-w-7xl mx-auto px-4 pb-32">
      <div className="flex gap-4 overflow-x-auto pb-10 no-scrollbar mb-4">
        {users.slice(0, 15).map(u => (
          <div key={u.uid} className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer group">
            <div className="w-16 h-16 rounded-full p-0.5 border-2 border-rose-500 group-hover:scale-105 transition-transform duration-500">
              <img src={u.profilePic} className="w-full h-full rounded-full object-cover shadow-lg" alt={u.username} />
            </div>
            <span className="text-[10px] font-black text-zinc-500">@{u.username}</span>
          </div>
        ))}
      </div>
      <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-6 space-y-6">
        {homePosts.map(post => (
          <div key={post.id} className="relative group break-inside-avoid rounded-[2.5rem] overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-700" onClick={() => { setSelectedPost(post); setView('detail'); }}>
            <img src={post.url} className="w-full h-auto object-cover" alt={post.title} />
            <div className="absolute inset-0 bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <Heart size={80} className="text-white fill-white animate-pulse" />
            </div>
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all z-10">
              <button onClick={(e) => { e.stopPropagation(); handleLike(post.id); }} className={`p-2.5 rounded-full backdrop-blur-xl transition-all ${currentUserData?.likedPosts?.includes(post.id) ? 'bg-rose-500 text-white' : 'bg-white/30 text-white hover:bg-rose-500'}`}>
                <Heart size={20} className={currentUserData?.likedPosts?.includes(post.id) ? 'fill-current' : ''} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const PulseView = () => {
    const [pulseText, setPulseText] = useState("");
    const postPulse = async () => {
      if (!pulseText.trim() || !user) return;
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'posts'), { type: 'pulse', content: sanitize(pulseText), userId: user.uid, createdAt: Date.now(), likes: [] });
      setPulseText("");
      showMsg("Pulse enviado!");
    };
    return (
      <div className="pt-24 max-w-2xl mx-auto px-4 pb-40">
        <div className={`p-8 rounded-[2.5rem] mb-12 shadow-xl border ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'}`}>
          <textarea value={pulseText} onChange={(e) => setPulseText(e.target.value)} placeholder="O que está a pulsar agora?" className="w-full bg-transparent border-none focus:ring-0 text-lg font-medium resize-none min-h-[100px]"></textarea>
          <div className="flex justify-end mt-4"><button onClick={postPulse} className="bg-rose-500 text-white px-10 py-3 rounded-full font-black hover:bg-rose-600 transition shadow-lg">Pulsar</button></div>
        </div>
        <div className="space-y-6">
          {posts.filter(p => p.type === 'pulse').sort((a,b) => b.createdAt - a.createdAt).map(pulse => (
            <div key={pulse.id} className={`p-8 rounded-[2.5rem] shadow-sm border ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white'}`}>
              <div className="flex gap-4">
                <img src={users.find(u => u.uid === pulse.userId)?.profilePic} className="w-12 h-12 rounded-full" />
                <div className="flex-1"><p className="font-black">@{users.find(u => u.uid === pulse.userId)?.username}</p><p className="mt-2 text-zinc-600 dark:text-zinc-300 leading-relaxed">{pulse.content}</p></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const AdminPanel = () => {
    const [activeTab, setActiveTab] = useState('users');
    const [newBadge, setNewBadge] = useState({ label: '', type: 'blue' });
    const addBadge = async () => {
      if (!newBadge.label) return;
      const updated = { ...config, customBadges: [...(config.customBadges || []), { ...newBadge, id: Date.now() }] };
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global'), updated);
      setNewBadge({ label: '', type: 'blue' });
      showMsg("Selo criado!");
    };
    return (
      <div className="pt-24 max-w-7xl mx-auto px-4 pb-40">
        <div className="flex items-center justify-between mb-12"><h2 className="text-4xl font-black tracking-tighter">Painel Master</h2><div className="flex bg-zinc-100 dark:bg-zinc-800 p-2 rounded-[2rem]">{['users', 'content', 'badges'].map(t => (<button key={t} onClick={() => setActiveTab(t)} className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-white shadow-lg text-rose-500' : 'text-zinc-400'}`}>{t}</button>))}</div></div>
        {activeTab === 'users' && (<div className="bg-white dark:bg-zinc-900 rounded-[3rem] overflow-hidden border"><table className="w-full text-left"><thead><tr className="bg-zinc-50 dark:bg-zinc-800 text-[10px] font-black uppercase text-zinc-400"><th className="p-8">Membro</th><th className="p-8">Badges</th><th className="p-8 text-right">Ações</th></tr></thead><tbody>{users.map(u => (<tr key={u.uid} className="border-t border-zinc-100 dark:border-zinc-800"><td className="p-8 flex items-center gap-4"><img src={u.profilePic} className="w-10 h-10 rounded-full" /><b>@{u.username}</b></td><td className="p-8"><Badge badges={u.badges}/></td><td className="p-8 text-right"><select className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-xl text-[10px] font-black" onChange={async (e) => { const b = config.customBadges?.find(x => x.id.toString() === e.target.value); if (!b) return; await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', u.uid), { badges: [...(u.badges || []), b] }); showMsg("Concedido!"); }}><option>Conceder...</option>{config.customBadges?.map(cb => <option key={cb.id} value={cb.id}>{cb.label}</option>)}</select></td></tr>))}</tbody></table></div>)}
      </div>
    );
  };

  const Onboarding = () => {
    const [selected, setSelected] = useState([]);
    const toggle = (i) => setSelected(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
    const save = async () => {
      if (selected.length < 3) return showMsg("Escolha pelo menos 3!", "error");
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid), { interests: selected });
      setCurrentUserData(prev => ({ ...prev, interests: selected }));
      setView('home');
    };
    return (
      <div className="fixed inset-0 z-[200] bg-white dark:bg-zinc-950 flex items-center justify-center p-8">
        <div className="max-w-3xl w-full text-center">
          <h2 className="text-5xl font-black mb-6 tracking-tighter">O que faz o seu coração bater?</h2>
          <div className="flex flex-wrap justify-center gap-3 mb-12">{INTERESTS_OPTIONS.map(i => (<button key={i} onClick={() => toggle(i)} className={`px-8 py-4 rounded-full font-black border-2 transition-all ${selected.includes(i) ? 'bg-rose-500 border-rose-500 text-white' : 'border-zinc-100 text-zinc-400'}`}>{i}</button>))}</div>
          <button onClick={save} className="bg-zinc-900 text-white px-20 py-6 rounded-[2.5rem] font-black text-xl hover:scale-105 transition">Entrar no Heartfy</button>
        </div>
      </div>
    );
  };

  const Footer = () => (
    <footer className={`mt-40 py-24 border-t ${isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-400' : 'bg-white border-zinc-100 text-zinc-500'}`}>
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-12 text-sm font-bold uppercase">
        <div className="col-span-2 normal-case font-medium"><h2 className="text-3xl font-black text-rose-500 mb-6">HEARTFY</h2><p className="max-w-xs leading-relaxed">Onde as imagens encontram sentimentos. Colecione inspiração todos os dias.</p></div>
        <div><h4 className="mb-8 opacity-50">Explorar</h4><ul className="space-y-4 text-[10px] tracking-widest"><li>Sobre Nós</li><li>Blog</li><li>API</li></ul></div>
      </div>
      <div className="max-w-7xl mx-auto px-4 mt-20 pt-10 border-t border-zinc-100 dark:border-zinc-900 flex justify-between text-[10px] font-black opacity-40"><span>© 2025 Heartfy. Viva com beleza.</span><div className="flex gap-8"><span>Português (Brasil)</span><span>English</span></div></div>
    </footer>
  );

  return (
    <div className={`min-h-screen transition-all duration-700 ${isDarkMode ? 'bg-black text-white' : 'bg-[#FAFAFA] text-zinc-900'} font-sans antialiased`}>
      <Header />
      <main className="min-h-screen">
        {view === 'home' && <HomeView />}
        {view === 'pulse' && <PulseView />}
        {view === 'onboarding' && <Onboarding />}
        {view === 'admin' && <AdminPanel />}
        {view === 'detail' && selectedPost && (
          <div className="pt-24 max-w-7xl mx-auto px-4 pb-40 animate-in fade-in slide-in-from-bottom-5 duration-700">
             <button onClick={() => setView('home')} className="mb-10 text-rose-500 font-black uppercase text-xs tracking-widest flex items-center gap-2">Voltar</button>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                <img src={selectedPost.url} className="w-full rounded-[4rem] shadow-2xl border-4 border-white dark:border-zinc-800" alt="Post" />
                <div className="py-8">
                   <div className="flex items-center justify-between mb-10 p-6 bg-white dark:bg-zinc-900 rounded-[2.5rem] border shadow-sm"><div className="flex items-center gap-4"><img src={users.find(u => u.uid === selectedPost.userId)?.profilePic} className="w-14 h-14 rounded-full" alt="Avatar" /><p className="font-black text-xl">@{users.find(u => u.uid === selectedPost.userId)?.username}</p></div><button onClick={() => handleFollow(selectedPost.userId)} className="bg-rose-500 text-white px-10 py-3 rounded-full font-black">Seguir</button></div>
                   <h2 className="text-5xl font-black tracking-tighter mb-6">{sanitize(selectedPost.title)}</h2>
                   <p className="text-zinc-500 text-xl font-medium mb-12">{sanitize(selectedPost.description)}</p>
                   <button onClick={() => handleLike(selectedPost.id)} className={`w-full py-6 rounded-[2.5rem] font-black text-xl flex items-center justify-center gap-4 transition-all ${currentUserData?.likedPosts?.includes(selectedPost.id) ? 'bg-zinc-950 text-white' : 'bg-rose-500 text-white shadow-2xl'}`}><Heart className={currentUserData?.likedPosts?.includes(selectedPost.id) ? 'fill-current' : ''} size={28}/> Salvar no Perfil</button>
                </div>
             </div>
          </div>
        )}
      </main>
      <Footer />
      {showAuthModal && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6">
          <div className={`w-full max-w-md p-12 rounded-[4rem] relative ${isDarkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white shadow-2xl'}`}>
            <button onClick={() => setShowAuthModal(false)} className="absolute top-10 right-10 p-2"><X/></button>
            <h2 className="text-5xl font-black text-rose-500 text-center mb-10">HEARTFY</h2>
            <button onClick={handleGoogleLogin} className="w-full py-5 bg-white border-4 border-zinc-50 rounded-[2rem] font-black flex items-center justify-center gap-4 hover:shadow-xl transition-all">
              <img src="[https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg](https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg)" className="w-6 h-6" alt="Google Logo" /> 
              Entrar com Google
            </button>
          </div>
        </div>
      )}
      {toast && (<div className="fixed bottom-10 left-1/2 -translate-x-1/2 px-10 py-5 bg-zinc-950 text-white rounded-full font-black text-sm shadow-2xl z-[1000] flex items-center gap-4"><div className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></div> {toast.msg}</div>)}
    </div>
  );
}
