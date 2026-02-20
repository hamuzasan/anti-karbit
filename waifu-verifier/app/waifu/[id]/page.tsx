"use client";
import { useEffect, useState, use, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ShareCardModal from '@/components/ShareCardModal';
import UserProfileModal from '@/components/UserProfileModal';
import ProfileSettingsModal from '@/components/ProfileSettingsModal'; // IMPORT KOMPONEN KARTU LISENSI

// --- UTILS ---
const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US').format(num);
};

// ========================================================
// 1. KOMPONEN RULES MODAL (LENGKAP)
// ========================================================
const RulesModal = ({ isOpen, onClose, accentColor }: { isOpen: boolean, onClose: () => void, accentColor: string }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="bg-neutral-900 w-full max-w-lg p-8 rounded-[40px] shadow-2xl border-2 animate-in zoom-in duration-300 relative overflow-hidden"
        style={{ borderColor: `${accentColor}40` }}
      >
        {/* Decor Blob */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-[100px] opacity-20 pointer-events-none" style={{ backgroundColor: accentColor }}></div>

        <div className="text-center mb-8 relative z-10">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2">System_Protocol</p>
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">
              Game <span style={{ color: accentColor }}>Rules</span>
            </h2>
        </div>

        <div className="space-y-4 text-slate-300 text-xs md:text-sm font-medium leading-relaxed relative z-10 h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {/* Rule 1 */}
            <div className="bg-neutral-800/50 p-4 rounded-2xl border border-neutral-700/50">
              <h3 className="text-white font-bold uppercase mb-1 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px]">1</span> 
                Sistem Leveling
              </h3>
              <p className="text-slate-400 text-[11px]">
                Level harus diselesaikan berurutan. Cukup selesaikan quiz sampai finish (Result Screen) untuk membuka level berikutnya.
              </p>
            </div>
            {/* Rule 2 */}
            <div className="bg-neutral-800/50 p-4 rounded-2xl border border-neutral-700/50">
              <h3 className="text-white font-bold uppercase mb-1 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px]">2</span> 
                Perhitungan Poin
              </h3>
              <p className="text-slate-400 text-[11px]">
                Poin hanya dihitung untuk jawaban yang <strong>pertama kali benar</strong>. Jawaban salah tidak mengurangi poin.
              </p>
            </div>
            {/* Rule 3 */}
            <div className="bg-neutral-800/50 p-4 rounded-2xl border border-neutral-700/50">
              <h3 className="text-white font-bold uppercase mb-1 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px]">3</span> 
                Bonus Kecepatan
              </h3>
              <p className="text-slate-400 text-[11px]">
                Jawab benar dengan sisa waktu &gt; 50% untuk mendapatkan <strong>1.5x Multiplier Poin</strong>.
              </p>
            </div>
            {/* Rule 4 */}
            <div className="bg-neutral-800/50 p-4 rounded-2xl border border-neutral-700/50">
              <h3 className="text-white font-bold uppercase mb-1 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px]">4</span> 
                Sistem Status
              </h3>
              <p className="text-slate-400 text-[11px]">
                Selesaikan Level 4 untuk membuka status asli. <br/>
                Rank #1: <strong>Suami Sah</strong>.<br/>
                Rank #2-#5: <strong>Pemuja</strong>.<br/>
                Rank #6+: Tergantung % Completion (Karbit/Pengikut).
              </p>
            </div>
            {/* Rule 5 (Collection) */}
            <div className="bg-neutral-800/50 p-4 rounded-2xl border border-neutral-700/50">
              <h3 className="text-white font-bold uppercase mb-1 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px]">5</span> 
                Shrine Mode (Merch)
              </h3>
              <p className="text-slate-400 text-[11px]">
                 Upload foto koleksi asli (bukan Google). AI akan menilai harganya.<br/>
                 &gt;100k (70pts), &gt;500k (200pts).
              </p>
            </div>
        </div>
        
        <div className="mt-8">
          <button 
            onClick={onClose} 
            className="w-full py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] hover:brightness-110 transition-all shadow-lg text-black"
            style={{ backgroundColor: accentColor }}
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}

// ========================================================
// 2. KOMPONEN COLLECTION MODAL (LENGKAP)
// ========================================================
const CollectionModal = ({ isOpen, onClose, waifu, onSuccess }: any) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  

  if (!isOpen) return null;

  const handleFileChange = (e: any) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setResult(null);
      setErrorMsg("");
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setAnalyzing(true);
    setErrorMsg("");

    const formData = new FormData();
    formData.append("image", file);
    formData.append("waifuName", waifu.name);
    formData.append("waifuId", waifu.id);

    try {
      const res = await fetch('/api/analyze-collection', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setResult(data);
        setTimeout(() => {
           onSuccess(); 
        }, 2000);
      } else {
        setErrorMsg(data.message || "Gagal menganalisis gambar.");
      }
    } catch (err) {
      setErrorMsg("Terjadi kesalahan sistem.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-neutral-900 w-full max-w-md p-6 rounded-[30px] border border-neutral-700 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">✕</button>
        
        <div className="text-center mb-6">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Shrine_Mode</p>
          <h2 className="text-2xl font-black text-white uppercase italic">Upload Koleksi</h2>
        </div>

        {!result ? (
          <div className="space-y-4">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`w-full h-64 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative ${preview ? 'border-pink-500' : 'border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800'}`}
            >
              {preview ? (
                <img src={preview} className="w-full h-full object-cover" alt="preview" />
              ) : (
                <>
                  <span className="text-4xl mb-2">📸</span>
                  <p className="text-xs text-slate-400 font-bold uppercase">Tap to Take Photo / Upload</p>
                  <p className="text-[9px] text-slate-600 mt-2 px-4 text-center">Pastikan foto asli, bukan screenshot Google. AI akan mendeteksi.</p>
                </>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>

            {errorMsg && (
              <div className="bg-red-900/20 border border-red-500/50 p-3 rounded-xl text-red-200 text-xs font-medium text-center">
                ⚠️ {errorMsg}
              </div>
            )}

            <button 
              onClick={handleUpload} 
              disabled={!file || analyzing}
              className="w-full py-4 bg-white text-black rounded-xl font-black uppercase tracking-widest text-xs hover:bg-pink-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {analyzing ? 'AI ANALYZING (Wait...)' : 'Start Appraisal'}
            </button>
          </div>
        ) : (
          <div className="text-center animate-in zoom-in">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(34,197,94,0.5)]">
               <span className="text-3xl">💎</span>
            </div>
            <h3 className="text-xl font-black text-white uppercase mb-1">Valid Collection!</h3>
            <p className="text-xs text-slate-400 mb-6">Estimasi: Rp {result.value?.toLocaleString()}</p>
            
            <div className="bg-neutral-800 p-4 rounded-xl border border-neutral-700 mb-6">
               <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Points Awarded</p>
               <p className="text-4xl font-black text-yellow-400">+{result.points}</p>
            </div>
            <p className="text-[10px] text-slate-500">Points added to your total.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ========================================================
// 3. MAIN PAGE COMPONENT (LENGKAP)
// ========================================================
export default function WaifuSelectionHub({ params }: any) {
  const resolvedParams = use(params);
  const waifuId = (resolvedParams as any).id;
  const router = useRouter();
const [showProfileSettings, setShowProfileSettings] = useState(false);

const handleCetakLisensi = () => {
  // Validasi: Jika avatar masih pakai UI-Avatars (default) atau kosong
  const isDefault = !userProfile?.avatar_url || userProfile.avatar_url.includes('ui-avatars.com');
  
  if (isDefault) {
    alert("Waduh! Pasang foto profil manualmu dulu di Settings agar Lisensi terlihat eksklusif.");
    setShowProfileSettings(true);
  } else {
    setShowShareCard(true);
  }
};
const [showProfileModal, setShowProfileModal] = useState(false);
  const [waifu, setWaifu] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showRules, setShowRules] = useState(false);
  const [showCollection, setShowCollection] = useState(false); 
  const [showShareCard, setShowShareCard] = useState(false); 
  
  const [myRank, setMyRank] = useState<number>(0);
  const [topChallenger, setTopChallenger] = useState<any>(null); 
  const [completionStats, setCompletionStats] = useState({ answered: 0, total: 0 });
  const [pointsBreakdown, setPointsBreakdown] = useState({ quiz: 0, collection: 0, grandTotal: 0 });
  const [userProfile, setUserProfile] = useState<any>(null);

  const accentColor = waifu?.theme_color || '#ec4899';
  const hasCustomBg = !!waifu?.background_image;

  // --- REFRESH DATA LOGIC (FIXED DOUBLE POINTS) ---
  const fetchAllData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push('/');
      const userId = session.user.id;

      const { data: pProfile } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (pProfile) setUserProfile(pProfile);

      const { data: wData } = await supabase.from('waifus').select('*').eq('id', waifuId).single();
      if (wData) setWaifu(wData);

      // 1. Ambil data progress (Single Source of Truth)
      const { data: pData } = await supabase
        .from('user_progress')
        .select('*')
        .eq('waifu_id', waifuId)
        .eq('user_id', userId)
        .maybeSingle();

      // 2. Mapping poin langsung dari kolom database (Mencegah Double Count di UI)
      const quizPts = pData?.quiz_points || 0;
      const totalCollPts = pData?.collection_points || 0;
      const grandTotal = pData?.total_points_accumulated || 0;

      setPointsBreakdown({ 
        quiz: quizPts, 
        collection: totalCollPts,
        grandTotal: grandTotal
      });

      if (pData) {
        setProgress(pData);
      } else {
        setProgress({ level_cleared: 0, total_points_accumulated: 0, quiz_points: 0, collection_points: 0 });
      }

      // 3. Hitung Rank
      const { count: higherRankCount } = await supabase
        .from('user_progress')
        .select('*', { count: 'exact', head: true })
        .eq('waifu_id', waifuId)
        .gt('total_points_accumulated', grandTotal);
      
      setMyRank((higherRankCount || 0) + 1);

      // 4. Ambil Rank #1
      const { data: topData } = await supabase
        .from('user_progress')
        .select(`
          total_points_accumulated, 
          user_id, 
          profiles!inner ( username, name, avatar_url )
        `)
        .eq('waifu_id', waifuId)
        .order('total_points_accumulated', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (topData) {
        setTopChallenger({
          ...topData,
          total_score: topData.total_points_accumulated || 0
        });
      }

      // 5. Completion Stats
      const { count: totalQ } = await supabase.from('questions').select('*', { count: 'exact', head: true }).eq('waifu_id', waifuId);
      const { count: answeredQ } = await supabase.from('answered_questions').select('*', { count: 'exact', head: true }).eq('waifu_id', waifuId).eq('user_id', userId);

      setCompletionStats({ answered: answeredQ || 0, total: totalQ || 1 });

    } catch (err) {
      console.error("Error fetching hub data:", err);
    } finally {
      setLoading(false);
    }
  }, [waifuId, router]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // --- LOGIKA STATUS ---
  const getUserStatus = () => {
    const { answered, total } = completionStats;
    const percentage = total > 0 ? (answered / total) * 100 : 0;
    const name = waifu?.name || "Character";
    const clearedLevel = progress?.level_cleared || 0;

    if (clearedLevel < 4) {
      return { 
        title: "KARBIT OR NO?", 
        color: "bg-neutral-800 text-slate-400 border-neutral-600 border-dashed animate-pulse",
        desc: `Selesaikan Quest 4 dulu! (Progress: ${clearedLevel}/4)`
      };
    }
    if (myRank === 1) {
      return { 
        title: "SUAMI SAH", 
        color: "bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-600 text-black border-yellow-200 shadow-yellow-500/20 shadow-lg",
        desc: `Pemilik sah ${name}.`
      };
    }
    if (myRank >= 2 && myRank <= 5) {
      return { 
        title: `PEMUJA ${name}`, 
        color: "bg-gradient-to-r from-pink-500 to-rose-600 text-white border-pink-400 shadow-pink-500/20 shadow-lg",
        desc: "Loyalis garis keras."
      };
    }
    if (percentage > 50) {
      return { 
        title: `PENGIKUT ${name}`, 
        color: "bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-blue-400",
        desc: "Fans setia yang berdedikasi."
      };
    }
    return { 
      title: "KARBIT SAMPAH", 
      color: "bg-neutral-800 text-slate-500 border-neutral-700 grayscale",
      desc: "Tau nama doang, pengetahuan nol."
    };
  };

  const status = getUserStatus();

  if (loading) return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center font-bold text-slate-600 animate-pulse text-xs tracking-widest uppercase">
      INITIALIZING_HUB...
    </div>
  );

  const levels = [
    { id: 1, title: "Level 1: Karbit Test", desc: "Uji dasar pengetahuan oshi." },
    { id: 2, title: "Level 2: Normal Weebs", desc: "Masuk ke detail karakter lebih dalam." },
    { id: 3, title: "Level 3: Hardcore Simp", desc: "Hanya untuk fans yang benar-benar hafal." },
    { id: 4, title: "Level 4: Soul Link", desc: "Tingkat Mythic. Ujian kesetiaan mutlak." },
  ];

  const isLocked = (lv: number) => lv > 1 && (progress?.level_cleared || 0) < lv - 1;

  return (
    <div className="min-h-screen relative font-sans overflow-x-hidden text-white">
      
      {/* BACKGROUND AREA */}
      {hasCustomBg ? (
        <div className="fixed inset-0 z-0">
             <img src={waifu.background_image} className="w-full h-full object-cover animate-in fade-in duration-1000" alt="bg" />
             <div className="absolute inset-0 bg-neutral-950/85 backdrop-blur-sm"></div>
             <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-neutral-950"></div>
        </div>
      ) : (
        <div className="fixed inset-0 bg-neutral-950 z-0"></div>
      )}

      {/* CONTENT WRAPPER */}
      <div className="relative z-10 p-6 md:p-12">
        <div className="max-w-6xl mx-auto">
          
          {/* HEADER SECTION */}
          <div className="flex flex-col md:flex-row items-center gap-8 w-full mb-12 mt-4">
            <div className="relative group">
               <div className="absolute -inset-1 rounded-full opacity-70 blur group-hover:opacity-100 transition duration-1000" style={{ backgroundColor: accentColor }}></div>
               <img src={waifu?.image_url?.[0]} className="relative w-32 h-32 md:w-48 md:h-48 rounded-full object-cover border-4 shadow-2xl animate-in zoom-in" style={{ borderColor: accentColor }} alt="waifu" />
               <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-neutral-900 px-3 py-1 rounded-full border border-neutral-700 md:hidden whitespace-nowrap z-20">
                 <span className="text-[10px] font-black uppercase text-yellow-500">#{myRank} Server</span>
               </div>
            </div>
            
            <div className="text-center md:text-left flex-1 w-full">
              <Link href="/" className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block hover:text-white transition-colors">
                ← Back_to_Database
              </Link>
              
              <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
                <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                  {waifu?.name}
                </h1>
                
                <div className="flex flex-col items-center md:items-start mb-2 md:mb-4">
                   <div className={`px-4 py-1.5 rounded-full border ${status.color} animate-in fade-in zoom-in duration-700`}>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{status.title}</span>
                   </div>
                </div>
              </div>

              {/* STATS ROW */}
              <div className="grid grid-cols-2 md:flex md:flex-row gap-y-8 md:gap-x-10 justify-center md:justify-start items-start md:items-center w-full">
                <div className="flex flex-col items-center md:items-start border-r md:border-r-0 border-neutral-800 md:pr-0">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Server_Rank</span>
                  <span className="text-3xl md:text-4xl font-black text-white italic leading-none">#{myRank}</span>
                </div>
                
                <div className="flex flex-col items-center md:items-start md:border-l md:border-neutral-800 md:pl-10">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Knowledge</span>
                  <span className="text-3xl md:text-4xl font-black italic leading-none" style={{ color: accentColor }}>
                    {Math.round((completionStats.answered / (completionStats.total || 1)) * 100)}%
                  </span>
                </div>

<div className="col-span-2 md:col-span-1 flex flex-col items-center md:items-start w-full md:w-auto md:border-l md:border-neutral-800 md:pl-10">
  <div className="flex items-center gap-3 mb-1">
    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total_Pts</span>
    {/* Tombol Help Rules dipindah ke sini agar mungil */}
    <button onClick={() => setShowRules(true)} className="text-[10px] text-slate-600 hover:text-white transition-colors">
      [ Rules? ]
    </button>
  </div>
  
  <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
    <div className="flex flex-col items-center md:items-start">
      <div className="flex items-center gap-6">
        <span className="text-5xl md:text-6xl font-black text-white italic leading-none drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
          {pointsBreakdown.grandTotal}
        </span>
        
        {/* --- TOMBOL CETAK LISENSI BARU --- */}
        <button 
          onClick={handleCetakLisensi}
          className="group flex items-center gap-2 px-4 py-2 rounded-2xl bg-white text-black hover:bg-pink-500 hover:text-white transition-all active:scale-95 shadow-lg"
        >
          <span className="text-lg group-hover:rotate-12 transition-transform">🪪</span>
          <div className="flex flex-col items-start leading-none">
            <span className="text-[8px] font-black uppercase tracking-tighter opacity-60">ID_Card</span>
            <span className="text-[10px] font-black uppercase">Cetak</span>
          </div>
        </button>
      </div>
      
      {/* Quiz & Collection Breakdown tetap di bawahnya */}
      <div className="flex gap-4 md:gap-6 mt-4 p-4 bg-white/5 backdrop-blur-md rounded-[24px] border border-white/10 shadow-xl w-full md:w-auto justify-center md:justify-start">
        <div className="flex flex-col items-center md:items-start">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter mb-1">Quiz_Earnings</span>
          <span className="text-xl md:text-2xl font-black text-slate-100 italic">+{pointsBreakdown.quiz}</span>
        </div>
        <div className="w-px h-10 bg-neutral-700 self-center opacity-50" />
        <div className="flex flex-col items-center md:items-start">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter mb-1">Collection_Value</span>
          <span className="text-xl md:text-2xl font-black text-yellow-500 italic">+{pointsBreakdown.collection}</span>
        </div>
      </div>
    </div>
  </div>
</div>
              </div>
            </div>
          </div>

          {/* MAIN STACK */}
          <div className="flex flex-col gap-12">
            
<div className="w-full max-w-2xl mx-auto z-20 px-4 md:px-0">
  <Link 
    href={`/waifu-leaderboard/${waifuId}`}
    className="relative flex flex-col md:flex-row items-center gap-6 p-5 rounded-[30px] border transition-all group overflow-hidden bg-neutral-900/40 backdrop-blur-md hover:bg-neutral-900/60 shadow-xl hover:scale-[1.01]"
    style={{ 
      borderColor: `${accentColor}30`, 
      boxShadow: `0 20px 40px -20px ${accentColor}15` 
    }}
  >
    {/* Efek Shimmer halus */}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent -translate-x-full group-hover:animate-[shimmer_3s_infinite] pointer-events-none"></div>
    
    {/* Avatar Area */}
    <div className="relative shrink-0">
      <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full p-0.5 bg-neutral-800 border border-white/10 overflow-hidden shadow-2xl">
        <img 
          src={topChallenger?.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${topChallenger?.profiles?.username || '?'}&background=111&color=fff`} 
          className="w-full h-full object-cover rounded-full"
          alt="Suami Sah"
        />
      </div>
      <div className="absolute -top-1 -right-1 w-7 h-7 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg text-sm border-2 border-neutral-900">
        👑
      </div>
    </div>

    {/* Detail Info */}
    <div className="flex-1 text-center md:text-left z-10 min-w-0">
      <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
         {/* STATUS SUAMI SAH - Kembali dengan desain Minimalis-Premium */}
         <div className="px-2.5 py-0.5 rounded-md bg-yellow-500/10 border border-yellow-500/20">
            <span className="text-[9px] font-black text-yellow-500 uppercase tracking-[0.2em]">SUAMI SAH</span>
         </div>
         <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest opacity-50">Top Ranker</span>
      </div>
      
      <h2 className="text-xl md:text-2xl font-bold text-white uppercase tracking-tight leading-none truncate mb-2">
        {topChallenger?.profiles?.name || topChallenger?.profiles?.username || 'POSITION VACANT'}
      </h2>
      
      <div className="flex items-center justify-center md:justify-start gap-6">
        <div className="flex flex-col">
          <span className="text-[9px] font-medium text-slate-500 uppercase tracking-wider">Record Score</span>
          <span className="text-sm font-mono font-bold text-white">
            {formatNumber(topChallenger?.total_score || 0)} <span className="text-[9px] text-slate-500">PTS</span>
          </span>
        </div>

        <div className="w-px h-6 bg-white/5"></div>

        {/* Action: Open UserProfileModal */}
        <div className="flex flex-col">
          <span className="text-[9px] font-medium text-slate-500 uppercase tracking-wider">Profile Info</span>
          <button 
            onClick={(e) => {
              e.preventDefault(); // Stop Link navigation
              e.stopPropagation(); // Stop event bubbling
              setShowProfileModal(true);
            }}
            className="text-[10px] font-black uppercase tracking-tighter transition-colors flex items-center gap-1 group/btn"
            style={{ color: accentColor }}
          >
            <span className="group-hover/btn:underline">View Stats</span>
            <span className="text-[8px] opacity-70 group-hover/btn:translate-x-0.5 transition-transform">↗</span>
          </button>
        </div>
      </div>
    </div>

    {/* Leaderboard CTA */}
    <div className="relative z-10 shrink-0 md:ml-4">
      <div className="bg-neutral-800 text-white group-hover:bg-white group-hover:text-black px-6 py-3 rounded-xl font-bold uppercase text-[9px] tracking-widest transition-all border border-white/5 shadow-lg flex items-center gap-2">
        Leaderboard <span className="opacity-50">→</span>
      </div>
    </div>
  </Link>
</div>

            <div>

              <div className="flex items-center gap-4 mb-6">
                <div className="h-px bg-neutral-800 flex-1"></div>
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.4em]">Mission_Select</h3>
                <div className="h-px bg-neutral-800 flex-1"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                {levels.map((lv) => {
                  const locked = isLocked(lv.id);
                  
                  return (
                    <button
                      key={lv.id}
                      disabled={locked}
                      onClick={() => router.push(`/quiz/${waifuId}?level=${lv.id}`)}
                      className={`relative h-56 rounded-[35px] overflow-hidden text-left transition-all duration-300 group border-2 w-full ${
                        locked 
                        ? 'border-neutral-800 cursor-not-allowed' 
                        : 'hover:-translate-y-2 hover:shadow-2xl hover:bg-neutral-900 cursor-pointer' 
                      }`}
                      style={!locked ? { 
                        borderColor: `${accentColor}40`,
                        backgroundColor: 'rgba(10, 10, 10, 0.6)', 
                        backdropFilter: 'blur(10px)'
                      } : { backgroundColor: '#0a0a0a' }}
                    >
                      <div className={`absolute inset-0 transition-all duration-500 ${locked ? 'opacity-30 grayscale blur-[2px]' : 'opacity-40 group-hover:opacity-60'}`}>
                        <img 
                          src={waifu?.card_images?.[lv.id] || waifu?.image_url?.[0]} 
                          className="w-full h-full object-cover" 
                          alt={`level-${lv.id}`}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent"></div>
                      </div>

                      <div className="relative z-10 p-8 flex flex-col h-full justify-between">
                        <div>
                          <span 
                            className="inline-block px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase mb-3 border backdrop-blur-md"
                            style={{ 
                              borderColor: locked ? '#555' : accentColor, 
                              color: locked ? '#777' : accentColor,
                              backgroundColor: locked ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.05)'
                            }}
                          >
                            QUEST_0{lv.id}
                          </span>
                          <h3 className={`text-2xl font-black italic uppercase tracking-tighter block leading-none ${locked ? 'text-neutral-500' : 'text-white'}`}>
                            {lv.title}
                          </h3>
                        </div>
                        
                        <div className="flex items-end justify-between">
                          <p className={`text-[10px] font-bold uppercase tracking-widest leading-relaxed max-w-[70%] ${locked ? 'text-neutral-600' : 'text-slate-400'}`}>
                            {locked ? "Clear Previous Level to Unlock" : lv.desc}
                          </p>
                          
                          {!locked ? (
                            <div 
                              className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold shadow-lg transition-all group-hover:scale-110 group-hover:rotate-3"
                              style={{ backgroundColor: accentColor }}
                            >
                              <span className="text-white text-xl">➜</span>
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-full border-2 border-neutral-700 bg-neutral-900/80 flex items-center justify-center animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                              <svg className="w-5 h-5 text-neutral-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
                
                <button 
                  onClick={() => setShowCollection(true)}
                  className="relative h-56 rounded-[35px] overflow-hidden text-center group transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(236,72,153,0.3)] w-full cursor-pointer"
                  style={{
                    background: 'linear-gradient(145deg, #1a1a1a, #0a0a0a)',
                    border: '2px solid transparent',
                  }}
                >
                  <div className="absolute inset-0 rounded-[35px] p-[2px] bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 opacity-50 group-hover:opacity-100 transition-opacity" style={{ mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', maskComposite: 'exclude' }}></div>
                  
                  <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

                  <div className="relative z-10 flex flex-col items-center justify-center h-full p-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-3xl flex items-center justify-center mb-4 shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                        <span className="text-3xl">📸</span>
                      </div>
                      
                      <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 uppercase italic tracking-tighter mb-2 drop-shadow-sm">
                        SHRINE MODE
                      </h3>
                      
                      <p className="text-[10px] font-bold text-white uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full mb-3">
                        Pamerkan Koleksi Asli!
                      </p>
                      
                      <p className="text-[9px] text-slate-400 max-w-[80%] leading-relaxed">
                        Upload foto Manga, Merch, atau Novel milikmu. AI akan menilai harganya dan memberi Poin!
                      </p>
                  </div>
                </button>

              </div>
            </div>

          </div>
        </div>
      </div>
      
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} accentColor={accentColor} />
      <CollectionModal 
        isOpen={showCollection} 
        onClose={() => setShowCollection(false)} 
        waifu={waifu} 
        onSuccess={() => {
          setShowCollection(false);
          fetchAllData(); 
        }} 
      />
      
      <ShareCardModal 
          isOpen={showShareCard} 
          onClose={() => setShowShareCard(false)}
          user={userProfile} 
          waifu={waifu}
          progress={progress}
          rank={myRank}
          status={status}
      />
 <UserProfileModal 
        isOpen={showProfileModal} 
        onClose={() => setShowProfileModal(false)} 
        userId={topChallenger?.user_id} 
      />
      <ProfileSettingsModal 
  isOpen={showProfileSettings} 
  onClose={() => setShowProfileSettings(false)} 
  userId={userProfile?.id} 
/>
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}