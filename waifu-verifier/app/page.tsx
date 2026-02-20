"use client";
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProfileSettingsModal from '@/components/ProfileSettingsModal';

// --- TIPE DATA ---
type Waifu = {
  id: string;
  name: string;
  series: string;
  image_url: string[];
  theme_color: string;
  is_featured: boolean;
}

type Profile = {
  username: string;
  name?: string;
  role: 'dewa' | 'admin' | 'karbit';
  avatar_url?: string;
}

// --- ICONS ---
const IconUsers = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const IconCrown = () => (
    <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
);

const IconChevronDown = ({ className }: { className?: string }) => (
    <svg className={`w-4 h-4 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
)

// --- AUTH MODAL ---
const AuthModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAuth = async () => {
    if (!username || !password || (isRegister && !name)) {
        return alert("Isi semua data dulu dong!");
    }
    setLoading(true);
    const fakeEmail = `${username.toLowerCase().replace(/\s/g, '')}@verifier.local`;

    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({
          email: fakeEmail, 
          password, 
          options: { data: { username: username, name: name } }
        });
        if (error) throw error;
        alert("Akun berhasil dibuat! Silakan Login.");
        setIsRegister(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: fakeEmail, password });
        if (error) throw error;
        onClose();
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[999] flex items-center justify-center p-4">
      <div className="bg-neutral-900 w-full max-w-sm rounded-[45px] p-10 shadow-2xl border border-white/10 animate-in zoom-in duration-300">
        <div className="text-center mb-8">
          <p className="text-[10px] font-black text-pink-500 uppercase tracking-[0.5em] mb-2">GA RIBET !</p>
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">
            {isRegister ? 'DAFTAR BIT' : 'LOGIN BIT ?'}
          </h2>
        </div>
        <div className="space-y-4">
          {isRegister && (
             <div className="relative group animate-in fade-in slide-in-from-top-2">
                <input className="w-full bg-black border border-white/10 p-5 rounded-2xl outline-none focus:border-pink-500 font-bold text-white transition-all placeholder:text-neutral-600" placeholder="Nama Panggilan" value={name} onChange={e => setName(e.target.value)} />
             </div>
          )}
          <div className="relative group">
            <input className="w-full bg-black border border-white/10 p-5 rounded-2xl outline-none focus:border-pink-500 font-bold text-white transition-all placeholder:text-neutral-600" placeholder="Username (Login id)" value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          <div className="relative group">
            <input className="w-full bg-black border border-white/10 p-5 rounded-2xl outline-none focus:border-pink-500 font-bold text-white transition-all placeholder:text-neutral-600" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button onClick={handleAuth} disabled={loading} className="w-full py-6 bg-white text-black rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-[10px] shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-pink-500 hover:text-white hover:shadow-pink-500/50 active:scale-95 transition-all">
            {loading ? 'MEMPROSES...' : isRegister ? 'DAFTAR SEKARANG' : 'MASUK KE SISTEM'}
          </button>
          <div className="flex flex-col gap-4 mt-6 text-center">
            <button onClick={() => setIsRegister(!isRegister)} className="text-[9px] font-black text-neutral-500 hover:text-white uppercase tracking-widest transition-colors">
              {isRegister ? 'Udah punya akun? Login aja' : 'Belum punya akun? Bikin di sini'}
            </button>
            <button onClick={onClose} className="text-[9px] font-black text-red-500 uppercase tracking-widest opacity-50 hover:opacity-100">[ BATAL ]</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- WAIFU CARD ---
const WaifuCard = ({ waifu, onClick }: { waifu: Waifu, onClick: () => void }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [karbitCount, setKarbitCount] = useState<number>(0);
  const [suamiSah, setSuamiSah] = useState<string>('-'); // State untuk Suami Sah
  const accentColor = waifu.theme_color || '#ec4899';
  const images = waifu.image_url && waifu.image_url.length > 0 ? waifu.image_url : [];

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [images.length]);

  useEffect(() => {
    const fetchData = async () => {
      // 1. Hitung Challengers
      const { count } = await supabase.from('user_progress').select('*', { count: 'exact', head: true }).eq('waifu_id', waifu.id);
      setKarbitCount(count || 0);

      // 2. Cari Suami Sah (Rank 1 & Level >= 4)
      // Kita perlu mengambil profile dari user_progress
      const { data: topUser } = await supabase
        .from('user_progress')
        .select(`
            total_points_accumulated,
            profiles (name, username)
        `)
        .eq('waifu_id', waifu.id)
        .gte('level_cleared', 4) // Syarat: Minimal level 4
        .order('total_points_accumulated', { ascending: false })
        .limit(1)
        .single();

      if (topUser && topUser.profiles) {
          // @ts-ignore - Supabase type inference terkadang tricky dengan join
          const profileName = topUser.profiles.name || topUser.profiles.username || 'Anonim';
          setSuamiSah(profileName);
      } else {
          setSuamiSah('-');
      }
    };
    fetchData();
  }, [waifu.id]);

  return (
    <div 
      onClick={onClick}
      // UPDATE 1: Ukuran card lebih pendek (h-[300px])
      className="relative rounded-2xl md:rounded-[30px] overflow-hidden group h-[300px] md:h-[340px] cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 block bg-white"
      style={{ border: `1px solid ${accentColor}`, boxShadow: `0 0 15px ${accentColor}20` }}
    >
      <div className="absolute inset-0 w-full h-full">
         {images.map((img, index) => (
           <img key={index} src={img} alt={`${waifu.name}-${index}`} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${index === currentImageIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`} />
         ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-90 group-hover:opacity-100 transition-opacity"></div>
      
      {waifu.is_featured && (
        <div className="absolute top-3 left-3 bg-pink-500 text-white p-1.5 md:p-2 rounded-full shadow-[0_0_15px_rgba(236,72,153,0.5)] z-20 animate-pulse">
          <svg className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
        </div>
      )}

      <div className="absolute bottom-0 left-0 w-full p-4 md:p-5 text-left z-10 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase mb-1.5 bg-white text-black border shadow-l" style={{ borderColor: accentColor, color: accentColor }}>{waifu.series}</span>
        <h2 className="text-lg md:text-xl font-black text-white mb-1 leading-tight tracking-tighter line-clamp-1 drop-shadow-md">{waifu.name}</h2>
        
        {/* STATS ROW */}
        <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-slate-300 group-hover:text-white transition-colors">
                <IconUsers />
                <span className="text-[9px] font-bold uppercase tracking-wider">{karbitCount > 0 ? `${karbitCount} Challengers` : 'Belum ada'}</span>
            </div>

            {/* UPDATE 4: Suami Sah Section */}
            <div className="flex items-center gap-1.5 text-yellow-400 group-hover:text-yellow-300 transition-colors bg-white/5 w-fit pr-3 rounded-r-full">
                <div className="p-1 bg-yellow-500/20 rounded-full"><IconCrown /></div>
                <span className="text-[9px] font-black uppercase tracking-wider">
                    Suami Sah: <span className="text-white italic">{suamiSah}</span>
                </span>
            </div>
        </div>

        <div className="h-0 group-hover:h-auto overflow-hidden transition-all duration-300 opacity-0 group-hover:opacity-100 mt-3">
           <span className="inline-block w-full text-center py-2 rounded-xl text-[9px] font-black uppercase tracking-widest bg-white text-black transition-all hover:bg-pink-500 hover:text-white">Mulai Tes</span>
        </div>
      </div>
    </div>
  );
};

// --- MAIN PAGE ---
export default function Home() {
  const [waifus, setWaifus] = useState<Waifu[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('Semua');
  const [bgImage, setBgImage] = useState<string | null>(null);

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAllSeries, setShowAllSeries] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const { data: waifuData } = await supabase
        .from('waifus')
        .select('*')
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });
      if (waifuData) setWaifus(waifuData);

      const { data: config } = await supabase.from('app_config').select('value').eq('key', 'home_background').single();
      if (config) setBgImage(config.value);

      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
    });

    fetchData();
    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setProfile(data);
  };

  const handleCardClick = (waifuId: string) => {
    if (!user) {
      setShowAuthModal(true);
    } else {
      router.push(`/waifu/${waifuId}`);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const seriesList = useMemo(() => {
    const allSeries = waifus.map(w => w.series);
    return ['Semua', ...Array.from(new Set(allSeries))];
  }, [waifus]);

  const visibleSeries = showAllSeries ? seriesList : seriesList.slice(0, 15); 
  const hasMoreSeries = seriesList.length > 15;

  const filteredWaifus = waifus.filter((waifu) => {
    const matchesSearch = waifu.name.toLowerCase().includes(searchQuery.toLowerCase()) || waifu.series.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedFilter === 'Semua' || waifu.series === selectedFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <main className="min-h-screen relative font-mono selection:bg-pink-500/30 text-white overflow-hidden">
      
      {/* BACKGROUND */}
      {bgImage ? (
        <div className="fixed inset-0 z-0">
             <img src={bgImage} className="w-full h-full object-cover animate-in fade-in duration-1000" alt="bg" />
             <div className="absolute inset-0 bg-neutral-950/85 backdrop-blur-sm"></div>
             <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-neutral-950"></div>
        </div>
      ) : (
        <div className="fixed inset-0 bg-neutral-950 z-0"></div>
      )}

      {/* CONTENT */}
      <div className="relative z-10 p-4 md:p-8">
          
          {/* USER STATUS */}
          {user && (
            <div className="fixed top-4 right-4 z-50 flex items-center gap-3 bg-neutral-900/90 backdrop-blur-xl p-1.5 pl-4 rounded-full border border-white/10 shadow-2xl transition-all hover:border-pink-500/50">
               <div className="flex flex-col items-end cursor-pointer group" onClick={() => setShowProfileModal(true)}>
                 <p className="text-[10px] font-black text-white uppercase italic leading-none group-hover:text-pink-500 transition-colors">
                   {profile?.name || profile?.username || user.email.split('@')[0]}
                 </p>
                 <p className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest mt-0.5">{profile?.role || 'karbit'}</p>
               </div>
               <div className="w-9 h-9 rounded-full border border-white/10 overflow-hidden cursor-pointer group-hover:border-pink-500 transition-colors relative" onClick={() => setShowProfileModal(true)}>
                 {profile?.avatar_url ? (
                   <img src={profile.avatar_url} className="w-full h-full object-cover" />
                 ) : (
                   <div className="w-full h-full bg-neutral-800 flex items-center justify-center text-[10px] text-neutral-500">?</div>
                 )}
               </div>
               <button onClick={handleLogout} className="bg-white/5 text-neutral-400 w-9 h-9 flex items-center justify-center rounded-full hover:bg-red-500/10 hover:text-red-500 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
               </button>
            </div>
          )}

          <div className="max-w-7xl mx-auto mb-24 pt-16 md:pt-20">
            
            {/* HERO HEADER */}
            <div className="flex flex-col items-start gap-6 mb-10">
                <div className="w-full">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-500 text-[9px] font-black tracking-[0.2em] mb-4 shadow-[0_0_15px_rgba(236,72,153,0.1)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse"></span>
                      Created by Yunastore
                    </div>
                    
                    {/* UPDATE 5: Nama Website ganti jadi Anti Karbit */}
<div className="relative flex flex-row items-center justify-between gap-6 md:gap-10">
  
  {/* SISI KIRI: Teks Bertumpuk */}
  <div className="flex flex-col items-start">
    <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white uppercase italic drop-shadow-2xl leading-[0.85]">
      Anti
    </h1>
    <h1 className="text-6xl md:text-8xl font-black tracking-tighter uppercase italic leading-[0.85]">
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 drop-shadow-sm">
        Karbit
      </span>
    </h1>
    {/* Garis dekoratif */}
    <div className="h-1.5 w-24 bg-gradient-to-r from-pink-500 to-transparent mt-4 rounded-full"></div>
  </div>

  {/* SISI KANAN: Logo Besar */}
  <div className="relative">
    <img 
      src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/page-image/logo2.png`}
      alt="Logo"
      // h-full atau manual height yang besar agar sejajar dengan dua baris teks
      className="h-32 w-auto md:h-52 object-contain drop-shadow-[0_0_30px_rgba(236,72,153,0.3)] animate-pulse-subtle"
      style={{ filter: 'drop-shadow(0 0 20px rgba(236,72,153,0.4))' }}
    />
    
    {/* Efek cahaya di belakang logo agar lebih 'pop' */}
    <div className="absolute inset-0 bg-pink-500/20 blur-[60px] -z-10 rounded-full"></div>
  </div>

</div>
                    
                    {/* UPDATE 5: Bahasa Indonesia */}
                    <p className="text-neutral-400 text-xs md:text-sm mt-6 max-w-lg leading-relaxed font-medium border-l-2 border-pink-500/50 pl-4">
                        Identifikasi, Verifikasi, dan Eliminasi fans palsu. <br className="hidden md:block"/>Buktikan kesetiaanmu melalui protokol pengujian yang ketat.
                    </p>
                </div>
                
                {/* UPDATE 2 & 3: Navigasi Baru */}
                <div className="flex flex-wrap gap-3 w-full max-w-2xl">
                    <Link href="/leaderboard" className="flex-1 md:flex-none py-4 px-6 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-neutral-200 transition-all active:scale-95 shadow-lg shadow-white/10 text-center flex items-center justify-center gap-2">
                       <span>🏆</span> Leaderboard
                    </Link>
                    
                    <button className="flex-1 md:flex-none py-4 px-6 bg-neutral-900/50 backdrop-blur border border-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:border-pink-500/50 transition-all active:scale-95 text-center flex items-center justify-center gap-2">
                       <span>📩</span> Request Chara
                    </button>

                    <button className="flex-1 md:flex-none py-4 px-6 bg-neutral-900/50 backdrop-blur border border-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:border-yellow-500/50 transition-all active:scale-95 text-center flex items-center justify-center gap-2">
                       <span>🎉</span> Event Yunastore
                    </button>

                    <button className="flex-1 md:flex-none py-4 px-6 bg-neutral-900/50 backdrop-blur border border-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:border-purple-500/50 transition-all active:scale-95 text-center flex items-center justify-center gap-2">
                       <span>👕</span> Merch Yunastore
                    </button>
                </div>
            </div>

            {/* SEARCH BAR */}
            <div className="relative group mb-8 w-full max-w-2xl">
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center p-2 focus-within:border-pink-500/50 focus-within:ring-1 focus-within:ring-pink-500/50 transition-all shadow-xl">
                 <div className="pl-4 text-neutral-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                 </div>
                 {/* UPDATE 5: Placeholder Indo */}
                 <input 
                    type="text" 
                    placeholder="Cari Karakter atau Series..." 
                    className="w-full bg-transparent border-none outline-none text-white placeholder:text-neutral-600 font-bold text-xs tracking-wider p-4"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="p-2 text-neutral-500 hover:text-white transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
              </div>
            </div>

            {/* SERIES FILTER */}
            <div className="mb-12">
                <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Filter Series</h3>
                    {hasMoreSeries && (
                        <button 
                            onClick={() => setShowAllSeries(!showAllSeries)} 
                            className="text-[10px] font-bold text-pink-500 hover:text-pink-400 uppercase tracking-widest flex items-center gap-1 transition-colors"
                        >
                            {showAllSeries ? 'Tutup' : 'Lihat Semua'}
                            <IconChevronDown className={`w-3 h-3 transition-transform ${showAllSeries ? 'rotate-180' : ''}`} />
                        </button>
                    )}
                </div>
                
                <div className={`flex flex-wrap gap-2 transition-all duration-500 ease-in-out overflow-hidden ${showAllSeries ? 'max-h-[1000px]' : 'max-h-[140px] md:max-h-[100px]'}`}>
                  {visibleSeries.map((series) => (
                    <button
                      key={series}
                      onClick={() => setSelectedFilter(series)}
                      className={`px-4 py-2.5 rounded-xl text-[9px] font-bold tracking-widest uppercase transition-all border ${
                        selectedFilter === series 
                          ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)] scale-105 z-10' 
                          : 'bg-neutral-900/50 backdrop-blur text-neutral-500 border-white/5 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      {series}
                    </button>
                  ))}
                  {!showAllSeries && hasMoreSeries && (
                      <button 
                         onClick={() => setShowAllSeries(true)}
                         className="px-4 py-2.5 rounded-xl text-[9px] font-bold tracking-widest uppercase transition-all border border-pink-500/20 text-pink-500 bg-pink-500/5 hover:bg-pink-500 hover:text-white"
                      >
                         + {seriesList.length - 15} Lainnya
                      </button>
                  )}
                </div>
            </div>

            {/* WAIFU GRID */}
            {loading && (
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    {[1,2,3,4].map(i => <div key={i} className="h-[300px] bg-neutral-900/50 rounded-[30px] animate-pulse border border-white/5" />)}
                 </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8 pb-20">
              {filteredWaifus.map((waifu) => (
                 <WaifuCard key={waifu.id} waifu={waifu} onClick={() => handleCardClick(waifu.id)} />
              ))}
            </div>
            
            {!loading && filteredWaifus.length === 0 && (
                <div className="text-center py-24 border border-dashed border-white/10 rounded-[40px] bg-neutral-900/20 backdrop-blur-sm mx-4">
                    <p className="text-neutral-500 font-bold uppercase tracking-widest text-xs">Tidak ada karakter ditemukan.</p>
                </div>
            )}
          </div>
      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <ProfileSettingsModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} userId={user?.id} />

    </main>
  );
}