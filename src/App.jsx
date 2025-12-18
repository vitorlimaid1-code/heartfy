import React, { useState, useEffect, useMemo } from 'react';
import { 
  Heart, Search, User, LogOut, ShieldCheck, Star, Moon, Sun, Globe, X, MoreHorizontal 
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut 
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, getDoc, onSnapshot, updateDoc, addDoc 
} from 'firebase/firestore';

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
  "Fotos", "Amor", "Casais", "Tatuagens", "Carros", "IA", "Decoração", "Moda", "Comida", "Animes", "Arquitetura"
];

export default function App() {
  const [user, setUser] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [view, setView] = useState('home'); 
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [config, setConfig] = useState({ forbiddenWords: [], customBadges: [] });
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
    if (!user) {
      setCurrentUserData(null);
      return;
    }
    const syncProfile = async () => {
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
          followers: [],
          following: ["admin-uid"], 
          likedPosts: [],
          badges: isAdm ? [{id: 'official', label: 'Canal Oficial', type: 'gold'}] : [],
          isAdmin: isAdm,
          interests: [],
          createdAt: Date.now()
        };
        await setDoc(userRef, initialData);
        setCurrentUserData(initialData);
        setView('onboarding');
      } else {
        setCurrentUserData(snap.data());
      }
    };
    syncProfile();
  }, [user]);

  useEffect(() => {
    const unsubPosts = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'posts'), (s) => 
      setPosts(s.docs.map(d => ({id: d.id, ...d.data()})))
    );
    const unsubUsers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), (s) => 
      setUsers(s.docs.map(d => ({id: d.id, ...d.data()})))
    );
    return () => { unsubPosts(); unsubUsers(); };
  }, []);

  const showMsg = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setShowAuthModal(false);
      showMsg("Bem-vindo(a)!");
    } catch (e) {
      showMsg("Erro ao entrar");
    }
  };

  const handleLike = async (postId) => {
    if (!user) return setShowAuthModal(true);
    const myRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid);
    const isLiked = currentUserData?.likedPosts?.includes(postId);
    const newList = isLiked 
      ? currentUserData.likedPosts.filter(i => i !== postId) 
      : [...(currentUserData.likedPosts || []), postId];
    
    await updateDoc(myRef, { likedPosts: newList });
    setCurrentUserData(prev => ({...prev, likedPosts: newList}));
    showMsg(isLiked ? "Removido" : "Curtido!");
  };

  const Badge = ({ badges }) => (
    badges?.map((b, i) => (
      <div key={i} className="inline-block ml-1 group relative">
        {b.type === 'gold' ? <Star size={14} className="text-amber-500 fill-amber-500"/> : <ShieldCheck size={14} className="text-blue-500 fill-blue-500"/>}
        <span className="absolute hidden group-hover:block bg-black text-white text-[8px] p-1 rounded -top-6">
          {b.label}
        </span>
      </div>
    ))
  );

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-zinc-950 text-white' : 'bg-zinc-50 text-zinc-900'} font-sans`}>
      {/* HEADER */}
      <header className="fixed top-0 w-full h-16 border-b z-50 bg-inherit/80 backdrop-blur-md flex items-center justify-between px-6">
        <h1 onClick={() => setView('home')} className="text-2xl font-black text-rose-500 cursor-pointer">HEARTFY</h1>
        
        <div className="flex-1 max-w-md mx-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Pesquisar..." 
            className="w-full pl-10 pr-4 py-2 rounded-full bg-zinc-100 dark:bg-zinc-900 border-none outline-none focus:ring-2 ring-rose-500/20"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => setIsDarkMode(!isDarkMode)}>{isDarkMode ? <Sun /> : <Moon />}</button>
          {user ? (
            <div className="relative">
              <img 
                src={currentUserData?.profilePic} 
                className="w-10 h-10 rounded-full cursor-pointer border-2 border-rose-500" 
                onClick={() => setShowProfileMenu(!showProfileMenu)} 
              />
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 border rounded-xl shadow-xl p-2">
                  <button onClick={() => signOut(auth)} className="w-full text-left p-2 text-rose-500 flex items-center gap-2 font-bold">
                    <LogOut size={16}/> Sair
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => setShowAuthModal(true)} className="bg-rose-500 text-white px-6 py-2 rounded-full font-bold">Entrar</button>
          )}
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="pt-24 pb-20 px-6 max-w-7xl mx-auto">
        {view === 'home' && (
          <div className="columns-2 md:columns-4 lg:columns-5 gap-4">
            {posts.map(post => (
              <div key={post.id} className="mb-4 break-inside-avoid relative group cursor-pointer" onClick={() => {setSelectedPost(post); setView('detail')}}>
                <img src={post.url} className="rounded-2xl w-full" alt={post.title} />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-end p-4">
                   <button onClick={(e) => {e.stopPropagation(); handleLike(post.id)}} className="bg-white p-2 rounded-full">
                     <Heart size={18} className={currentUserData?.likedPosts?.includes(post.id) ? 'fill-rose-500 text-rose-500' : 'text-zinc-900'}/>
                   </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'detail' && selectedPost && (
          <div className="flex flex-col md:flex-row gap-8">
            <img src={selectedPost.url} className="w-full md:w-1/2 rounded-3xl" />
            <div className="flex-1">
              <button onClick={() => setView('home')} className="text-rose-500 font-bold mb-4">← Voltar</button>
              <h2 className="text-4xl font-black mb-4">{selectedPost.title}</h2>
              <p className="text-zinc-500 mb-8">{selectedPost.description}</p>
              <button onClick={() => handleLike(selectedPost.id)} className="w-full py-4 bg-rose-500 text-white rounded-2xl font-bold text-xl">
                Salvar no Perfil
              </button>
            </div>
          </div>
        )}

        {view === 'onboarding' && (
           <div className="text-center py-20">
             <h2 className="text-4xl font-black mb-8">Escolha seus interesses</h2>
             <div className="flex flex-wrap justify-center gap-2 mb-10">
               {INTERESTS_OPTIONS.map(i => (
                 <button key={i} className="px-6 py-2 border rounded-full hover:bg-rose-500 hover:text-white transition-colors">{i}</button>
               ))}
             </div>
             <button onClick={() => setView('home')} className="bg-zinc-900 text-white px-12 py-4 rounded-full font-bold">Começar Agora</button>
           </div>
        )}
      </main>

      {/* MODAL AUTH */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 p-10 rounded-[2.5rem] max-w-sm w-full text-center relative">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-6 right-6"><X /></button>
            <h3 className="text-3xl font-black text-rose-500 mb-8">HEARTFY</h3>
            <button onClick={handleGoogleLogin} className="w-full py-4 border-2 rounded-2xl font-bold flex items-center justify-center gap-3">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5" />
              Entrar com Google
            </button>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-zinc-900 text-white px-8 py-3 rounded-full font-bold shadow-2xl z-[200]">
          {toast}
        </div>
      )}
    </div>
  );
}
