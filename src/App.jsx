import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, Search, User, PlusCircle, Bell, Settings, LogOut, 
  ShieldCheck, Star, Trash2, Ban, CheckCircle, Flag, 
  MessageCircle, Share2, Download, Image as ImageIcon, 
  Moon, Sun, LayoutGrid, Users, BarChart3, Globe, 
  Mail, Lock, Smartphone, ChevronRight, X, MoreHorizontal,
  Plus, Bookmark, Eye, TrendingUp, Info, HelpCircle, CreditCard,
  Send, Smile, Mic, Video, MapPin, Hash, Filter, DollarSign,
  PieChart, AlertTriangle, FileText, Briefcase, Camera
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInAnonymously, 
  signInWithCustomToken 
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
  deleteDoc 
} from 'firebase/firestore';

// --- CONFIGURAÇÃO FIREBASE ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'heartfy-v1';

// --- CONSTANTES ---
const ADMIN_EMAIL = "admin@heartfy.com";
const ADMIN_PASS = "HeartfyAdmin2025";
const INTERESTS = [
  "Fotos", "Amor", "Casais", "Tatuagens", "Carros", "IA", "Papel de Parede", 
  "Patterns", "Decoração", "Moda", "Homens", "Mulheres", "Comida", "Locais", 
  "Objetos", "Desenhos", "Animes", "Arquitetura", "Design"
];

export default function App() {
  // State
  const [user, setUser] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [view, setView] = useState('home'); 
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [chats, setChats] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPost, setSelectedPost] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showVerificationNotice, setShowVerificationNotice] = useState(false);

  // Auth Initialization (RULE 3)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Erro Auth:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // Sync User Data & Admin Logic - separate to wait for user
  useEffect(() => {
    if (!user) return;

    const syncUser = async () => {
      const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        const isActuallyAdmin = auth.currentUser?.email === ADMIN_EMAIL;
        const initialData = {
          uid: user.uid,
          name: isActuallyAdmin ? "Heartfy Admin" : "Novo Usuário",
          username: isActuallyAdmin ? "admin" : `user_${Math.random().toString(36).substr(2, 5)}`,
          bio: isActuallyAdmin ? "Canal Oficial do Heartfy" : "Explorando inspirações ✨",
          profilePic: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
          headerPic: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200",
          followers: ["admin-uid"], // Todos seguem o admin
          following: ["admin-uid"],
          isVerified: isActuallyAdmin,
          isAdmin: isActuallyAdmin,
          isTrendsetter: false,
          interests: [],
          email: auth.currentUser?.email || "",
          phone: "",
          country: "Brasil",
          language: "Português",
          isPrivate: false,
          createdAt: Date.now()
        };
        await setDoc(userRef, initialData);
        setCurrentUserData(initialData);
      } else {
        setCurrentUserData(snap.data());
      }
    };
    syncUser();
  }, [user]);

  // Listeners (RULE 1 & 2)
  useEffect(() => {
    if (!user) return;
    const postsRef = collection(db, 'artifacts', appId, 'public', 'data', 'posts');
    const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
    const reportsRef = collection(db, 'artifacts', appId, 'public', 'data', 'reports');

    const unsubPosts = onSnapshot(postsRef, 
      (s) => setPosts(s.docs.map(d => ({id: d.id, ...d.data()}))),
      (err) => console.error("Firestore Posts Error:", err)
    );
    const unsubUsers = onSnapshot(usersRef, 
      (s) => setUsers(s.docs.map(d => ({id: d.id, ...d.data()}))),
      (err) => console.error("Firestore Users Error:", err)
    );
    const unsubReports = onSnapshot(reportsRef, 
      (s) => setReports(s.docs.map(d => ({id: d.id, ...d.data()}))),
      (err) => console.error("Firestore Reports Error:", err)
    );

    return () => { unsubPosts(); unsubUsers(); unsubReports(); };
  }, [user]);

  const showMsg = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Components
  const Badge = ({ user }) => {
    if (!user) return null;
    if (user.isAdmin) return (
      <div className="group relative inline-block">
        <Star className="w-4 h-4 text-amber-500 fill-amber-500 ml-1" />
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-zinc-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-50">Canal Oficial</span>
      </div>
    );
    if (user.isTrendsetter) return (
      <div className="group relative inline-block">
        <Star className="w-4 h-4 text-rose-500 fill-rose-500 ml-1" />
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-zinc-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-50">Criador de Tendências</span>
      </div>
    );
    if (user.isVerified) return (
      <div className="group relative inline-block">
        <ShieldCheck className="w-4 h-4 text-blue-500 fill-blue-500 ml-1" />
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-zinc-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-50">Conta Verificada</span>
      </div>
    );
    return null;
  };

  const Header = () => (
    <header className={`fixed top-0 w-full z-50 h-16 border-b transition-all ${isDarkMode ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white/80 backdrop-blur-md border-zinc-100'}`}>
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        <div className="flex items-center gap-8">
          <h1 onClick={() => setView('home')} className="text-2xl font-black tracking-tighter text-rose-500 cursor-pointer">HEARTFY</h1>
          <nav className="hidden md:flex gap-6 text-sm font-bold">
            <button onClick={() => setView('home')} className={view === 'home' ? 'text-rose-500' : 'text-zinc-500'}>Descobrir</button>
            <button onClick={() => setView('community')} className={view === 'community' ? 'text-rose-500' : 'text-zinc-500'}>Pulse</button>
          </nav>
        </div>

        <div className="flex-1 max-lg mx-8 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Buscar por tags, pessoas ou coleções..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-12 pr-4 py-2.5 rounded-full text-sm outline-none transition-all ${isDarkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-zinc-100 border-transparent focus:bg-white focus:border-rose-200'}`} 
          />
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          {currentUserData ? (
            <div className="flex items-center gap-4">
              <button className="relative p-2"><Bell size={20}/><span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full"></span></button>
              <button onClick={() => setView('chat')} className="p-2"><MessageCircle size={20}/></button>
              <div className="w-8 h-8 rounded-full overflow-hidden cursor-pointer border border-zinc-200" onClick={() => setView('profile')}>
                <img src={currentUserData.profilePic} className="w-full h-full object-cover" />
              </div>
              {currentUserData.isAdmin && <button onClick={() => setView('admin')} className="p-2 text-amber-500"><ShieldCheck size={20}/></button>}
            </div>
          ) : (
            <button onClick={() => setShowAuthModal(true)} className="bg-rose-500 text-white px-6 py-2 rounded-full font-bold text-sm hover:bg-rose-600 transition">Entrar</button>
          )}
        </div>
      </div>
    </header>
  );

  const Footer = () => (
    <footer className={`mt-20 py-16 border-t ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-10">
        <div className="col-span-2">
          <h2 className="text-xl font-black text-rose-500 mb-4">HEARTFY</h2>
          <p className="text-sm text-zinc-500 max-w-xs">A rede social inspiradora onde você encontra, salva e compartilha tudo o que ama.</p>
          <div className="flex gap-4 mt-6">
            <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center cursor-pointer hover:bg-rose-500 transition"><Globe size={16}/></div>
            <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center cursor-pointer hover:bg-rose-500 transition"><Users size={16}/></div>
            <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center cursor-pointer hover:bg-rose-500 transition"><Star size={16}/></div>
          </div>
        </div>
        <div>
          <h4 className="font-bold text-sm mb-4">Plataforma</h4>
          <ul className="text-sm text-zinc-500 space-y-2">
            <li className="hover:text-rose-500 cursor-pointer">Sobre nós</li>
            <li className="hover:text-rose-500 cursor-pointer">Carreiras</li>
            <li className="hover:text-rose-500 cursor-pointer">Imprensa</li>
            <li className="hover:text-rose-500 cursor-pointer">Anúncios</li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-sm mb-4">Suporte</h4>
          <ul className="text-sm text-zinc-500 space-y-2">
            <li className="hover:text-rose-500 cursor-pointer">FAQ</li>
            <li className="hover:text-rose-500 cursor-pointer">Diretrizes</li>
            <li className="hover:text-rose-500 cursor-pointer">Ajuda</li>
            <li className="hover:text-rose-500 cursor-pointer">Segurança</li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-sm mb-4">Legal</h4>
          <ul className="text-sm text-zinc-500 space-y-2">
            <li className="hover:text-rose-500 cursor-pointer">Privacidade</li>
            <li className="hover:text-rose-500 cursor-pointer">Termos de Uso</li>
            <li className="hover:text-rose-500 cursor-pointer">Cookies</li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-sm mb-4">Outros</h4>
          <ul className="text-sm text-zinc-500 space-y-2">
            <li className="hover:text-rose-500 cursor-pointer">API</li>
            <li className="hover:text-rose-500 cursor-pointer">Banners</li>
            <li className="hover:text-rose-500 cursor-pointer">Doações</li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 mt-16 pt-8 border-t border-zinc-200 dark:border-zinc-800 flex justify-between text-xs text-zinc-400 font-medium">
        <span>© 2025 Heartfy. Inspirando o mundo.</span>
        <div className="flex gap-6">
          <span>Brasil (Português)</span>
          <span>English</span>
          <span>Español</span>
        </div>
      </div>
    </footer>
  );

  const Home = () => {
    // Basic filter for images
    const featuredPosts = posts.filter(p => p.type === 'image' || !p.type);
    
    return (
      <div className="pt-24 max-w-7xl mx-auto px-4 pb-20">
        {/* Stories Bar */}
        <div className="flex gap-4 overflow-x-auto pb-8 no-scrollbar mb-4">
          {users.slice(0, 12).map(u => (
            <div key={u.uid} className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer group">
              <div className="w-16 h-16 rounded-full p-0.5 border-2 border-rose-500">
                <img src={u.profilePic} className="w-full h-full rounded-full object-cover group-hover:scale-105 transition" />
              </div>
              <span className="text-[10px] font-bold truncate w-16 text-center">{u.username}</span>
            </div>
          ))}
        </div>

        {/* Featured Collections Suggestions */}
        <div className="mb-10 p-6 rounded-3xl bg-zinc-900 text-white flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black mb-1">Inspirações do Dia</h3>
            <p className="text-zinc-400 text-sm">Coleções selecionadas para você baseadas em seus gostos.</p>
          </div>
          <button className="bg-white text-black px-6 py-2 rounded-full font-bold text-sm">Explorar Tudo</button>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between mb-8 overflow-x-auto no-scrollbar pb-2">
          <div className="flex gap-4 text-sm font-bold">
            <button className="text-rose-500 border-b-2 border-rose-500 pb-2">Explorar</button>
            <button className="text-zinc-400 hover:text-zinc-900 pb-2">Seguindo</button>
            <button className="text-zinc-400 hover:text-zinc-900 pb-2">Popular</button>
            <button className="text-zinc-400 hover:text-zinc-900 pb-2">Mais Recentes</button>
          </div>
          <div className="flex gap-2">
            <button className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg"><Filter size={18}/></button>
          </div>
        </div>

        {/* Masonry Grid */}
        <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-6 space-y-6">
          {featuredPosts.map(post => {
            const author = users.find(u => u.uid === post.userId);
            const isLiked = post.likes?.includes(user?.uid);

            return (
              <div 
                key={post.id} 
                className="relative group break-inside-avoid rounded-3xl overflow-hidden cursor-pointer shadow-sm hover:shadow-2xl transition-all duration-500"
                onClick={() => { setSelectedPost(post); setView('detail'); }}
              >
                <img src={post.url} className="w-full h-auto object-cover" />
                
                {/* BIG HEART HOVER - Classic WeHeartIt */}
                <div className="absolute inset-0 bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <Heart size={80} className="text-white fill-white animate-pulse" />
                </div>

                {/* Top Overlay */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleLike(post.id); }}
                    className={`p-2 rounded-full backdrop-blur-md transition ${isLiked ? 'bg-rose-500 text-white' : 'bg-white/20 text-white hover:bg-rose-500'}`}
                  >
                    <Heart size={20} className={isLiked ? 'fill-current' : ''} />
                  </button>
                </div>

                {/* Bottom Info Overlay */}
                <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <img src={author?.profilePic} className="w-6 h-6 rounded-full border border-white/40" />
                    <span className="text-white text-xs font-bold truncate">@{author?.username}</span>
                    <Badge user={author} />
                    <button className="ml-auto bg-white/20 hover:bg-white text-white hover:text-black px-3 py-1 rounded-full text-[10px] font-black transition">Seguir</button>
                  </div>
                  <div className="flex items-center gap-3 text-white/80 text-[10px]">
                    <span className="flex items-center gap-1"><Heart size={10} className="fill-current text-rose-500"/> {post.likes?.length || 0}</span>
                    <span className="flex items-center gap-1"><Eye size={10}/> {post.views || 0}</span>
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
    const stats = [
      { label: "Membros", val: users.length, icon: Users, color: "text-blue-500" },
      { label: "Posts", val: posts.length, icon: LayoutGrid, color: "text-rose-500" },
      { label: "Denúncias", val: reports.length, icon: Flag, color: "text-amber-500" },
      { label: "Receita Ads", val: "R$ 15.200", icon: DollarSign, color: "text-emerald-500" }
    ];

    return (
      <div className="pt-24 max-w-7xl mx-auto px-4 pb-20">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-3xl font-black">Painel Administrativo</h2>
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-2xl">
            {['users', 'content', 'reports', 'settings'].map(t => (
              <button 
                key={t}
                onClick={() => setTab(t)}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition ${tab === t ? 'bg-white shadow text-rose-500' : 'text-zinc-500'}`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {stats.map(s => (
            <div key={s.label} className={`p-6 rounded-3xl ${isDarkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white shadow-sm border border-zinc-100'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 ${s.color}`}><s.icon size={24}/></div>
              </div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{s.label}</p>
              <h4 className="text-2xl font-black mt-1">{s.val}</h4>
            </div>
          ))}
        </div>

        {tab === 'users' && (
          <div className={`rounded-3xl overflow-hidden border ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'}`}>
            <table className="w-full text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-xs font-black text-zinc-400 uppercase">
                <tr>
                  <th className="p-6">Perfil</th>
                  <th className="p-6">Selo</th>
                  <th className="p-6">Criação</th>
                  <th className="p-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {users.map(u => (
                  <tr key={u.uid} className="border-t border-zinc-100 dark:border-zinc-800">
                    <td className="p-6 flex items-center gap-4">
                      <img src={u.profilePic} className="w-10 h-10 rounded-full" />
                      <div>
                        <p className="font-bold">@{u.username}</p>
                        <p className="text-xs text-zinc-500">{u.email}</p>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => updateUserBadge(u.uid, 'isVerified', !u.isVerified)}
                          className={`p-2 rounded-lg transition ${u.isVerified ? 'bg-blue-100 text-blue-600' : 'bg-zinc-100 text-zinc-400'}`}
                        >
                          <ShieldCheck size={18}/>
                        </button>
                        <button 
                          onClick={() => updateUserBadge(u.uid, 'isTrendsetter', !u.isTrendsetter)}
                          className={`p-2 rounded-lg transition ${u.isTrendsetter ? 'bg-amber-100 text-amber-600' : 'bg-zinc-100 text-zinc-400'}`}
                        >
                          <Star size={18}/>
                        </button>
                      </div>
                    </td>
                    <td className="p-6 text-zinc-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="p-6 text-right">
                      <div className="flex gap-2 justify-end">
                        <button className="p-2 text-zinc-400 hover:text-rose-500"><Ban size={18}/></button>
                        <button className="p-2 text-zinc-400 hover:text-red-500"><Trash2 size={18}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className={`p-8 rounded-3xl ${isDarkMode ? 'bg-zinc-900' : 'bg-white shadow-sm border border-zinc-100'}`}>
              <h3 className="text-xl font-black mb-6 flex items-center gap-2"><CreditCard className="text-indigo-500"/> Integração STRIPE</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase">Publishable Key</label>
                  <input type="password" value="pk_live_******************" className="w-full mt-2 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border-none text-sm" readOnly />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase">Secret Key</label>
                  <input type="password" value="sk_live_******************" className="w-full mt-2 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border-none text-sm" readOnly />
                </div>
                <button className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold mt-4">Salvar Configurações</button>
              </div>
            </div>

            <div className={`p-8 rounded-3xl ${isDarkMode ? 'bg-zinc-900' : 'bg-white shadow-sm border border-zinc-100'}`}>
              <h3 className="text-xl font-black mb-6 flex items-center gap-2"><DollarSign className="text-emerald-500"/> Planos de Verificação</h3>
              <div className="p-6 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-center">
                <Star className="mx-auto text-amber-500 mb-4" size={32}/>
                <h4 className="font-bold">Selo Gold/Blue Automático</h4>
                <p className="text-2xl font-black text-zinc-900 dark:text-white mt-2">R$ 259,00 / ano</p>
                <p className="text-xs text-zinc-400 mt-4">Usuários podem adquirir o selo via perfil {'>'} configurações. O processo é automatizado via STRIPE.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleLike = async (postId) => {
    if (!currentUserData) return setShowAuthModal(true);
    const postRef = doc(db, 'artifacts', appId, 'public', 'data', 'posts', postId);
    const post = posts.find(p => p.id === postId);
    const likes = post.likes || [];
    const isLiked = likes.includes(user.uid);
    await updateDoc(postRef, {
      likes: isLiked ? likes.filter(id => id !== user.uid) : [...likes, user.uid]
    });
    showMsg(isLiked ? "Removido dos favoritos" : "Adicionado aos favoritos!");
  };

  const updateUserBadge = async (uid, field, val) => {
    const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', uid);
    await updateDoc(userRef, { [field]: val });
    showMsg("Selo atualizado com sucesso.");
  };

  const AuthModal = () => {
    const [mode, setMode] = useState('login');
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');

    const handleAction = async () => {
      if (email === ADMIN_EMAIL && pass === ADMIN_PASS) {
        // Simular login admin
        setView('admin');
        setShowAuthModal(false);
        showMsg("Bem-vindo de volta, Admin!");
      } else {
        showMsg("Login realizado com sucesso!");
        setShowAuthModal(false);
      }
    };

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <div className={`w-full max-w-md p-10 rounded-[2.5rem] relative overflow-hidden ${isDarkMode ? 'bg-zinc-950 border border-zinc-800 text-white' : 'bg-white'}`}>
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-400 to-rose-600"></div>
          <button onClick={() => setShowAuthModal(false)} className="absolute top-6 right-6 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
            <X size={20} />
          </button>

          <div className="text-center mb-10">
            <h2 className="text-4xl font-black tracking-tighter text-rose-500 mb-2">HEARTFY</h2>
            <p className="text-zinc-500 text-sm font-medium">Entre para o mundo das inspirações.</p>
          </div>

          <div className="space-y-4">
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5 group-focus-within:text-rose-500 transition" />
              <input 
                type="email" 
                placeholder="Seu e-mail" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full pl-12 pr-4 py-4 rounded-3xl outline-none focus:ring-2 focus:ring-rose-200 transition-all ${isDarkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-zinc-50 border-transparent'}`} 
              />
            </div>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5 group-focus-within:text-rose-500 transition" />
              <input 
                type="password" 
                placeholder="Sua senha" 
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                className={`w-full pl-12 pr-4 py-4 rounded-3xl outline-none focus:ring-2 focus:ring-rose-200 transition-all ${isDarkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-zinc-50 border-transparent'}`} 
              />
            </div>

            <button onClick={handleAction} className="w-full py-5 bg-rose-500 text-white rounded-[2rem] font-black text-lg hover:bg-rose-600 transition shadow-xl shadow-rose-200 dark:shadow-none active:scale-95">
              {mode === 'login' ? 'Entrar' : 'Criar Conta'}
            </button>

            <div className="flex items-center gap-4 py-6">
              <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800"></div>
              <span className="text-[10px] font-black text-zinc-400 uppercase">Ou continue com</span>
              <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800"></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button className="flex items-center justify-center gap-2 py-4 border border-zinc-200 dark:border-zinc-800 rounded-3xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition text-xs font-black">
                <Globe size={16} /> Google
              </button>
              <button className="flex items-center justify-center gap-2 py-4 border border-zinc-200 dark:border-zinc-800 rounded-3xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition text-xs font-black">
                <Smartphone size={16} /> Facebook
              </button>
            </div>
          </div>
          
          <p className="mt-8 text-center text-xs text-zinc-500 font-medium">
            {mode === 'login' ? 'Não tem conta?' : 'Já tem conta?'}
            <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="ml-2 font-black text-rose-500 hover:underline">
              {mode === 'login' ? 'Cadastre-se' : 'Entrar'}
            </button>
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 ${isDarkMode ? 'bg-black text-white' : 'bg-[#FAFAFA] text-zinc-900'} font-sans`}>
      <Header />
      
      <main className="min-h-screen">
        {view === 'home' && <Home />}
        {view === 'admin' && <AdminPanel />}
        {/* Detail view for posts */}
        {view === 'detail' && selectedPost && (
           <div className="pt-24 max-w-7xl mx-auto px-4 pb-20">
              <button onClick={() => setView('home')} className="mb-6 flex items-center gap-2 text-rose-500 font-bold"><ChevronRight className="rotate-180" size={18}/> Voltar</button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="bg-zinc-100 dark:bg-zinc-900 rounded-3xl overflow-hidden flex items-center justify-center p-4">
                  <img src={selectedPost.url} className="max-w-full h-auto rounded-xl shadow-2xl" />
                </div>
                <div>
                  <h2 className="text-3xl font-black mb-4">{selectedPost.title || "Inspiracional"}</h2>
                  <div className="flex items-center gap-4 mb-8">
                    <img src={users.find(u => u.uid === selectedPost.userId)?.profilePic} className="w-12 h-12 rounded-full" />
                    <span className="font-bold text-lg">@{users.find(u => u.uid === selectedPost.userId)?.username}</span>
                  </div>
                  <p className="text-zinc-500 mb-10 leading-relaxed">{selectedPost.description || "Esta imagem captura um momento de pura inspiração no Heartfy."}</p>
                  <div className="flex gap-4">
                    <button onClick={() => handleLike(selectedPost.id)} className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-black flex items-center justify-center gap-2">
                      <Heart className={selectedPost.likes?.includes(user?.uid) ? "fill-current" : ""} /> {selectedPost.likes?.includes(user?.uid) ? "Favoritado" : "Favoritar"}
                    </button>
                    <button className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl"><Share2/></button>
                  </div>
                </div>
              </div>
           </div>
        )}
      </main>

      <Footer />

      {showAuthModal && <AuthModal />}
      
      {toast && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-10 py-4 rounded-[2rem] text-white font-black text-sm shadow-2xl z-[1000] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 ${toast.type === 'success' ? 'bg-zinc-900 shadow-zinc-200' : 'bg-rose-500 shadow-rose-200'}`}>
          <CheckCircle size={20} /> {toast.msg}
        </div>
      )}
    </div>
  );
}
