"use client";

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// ==========================================
// 1. TYPE DEFINITIONS & UTILS
// ==========================================

type Profile = {
  username: string;
  avatar_url?: string;
};

type Waifu = {
  id: string;
  name: string;
  series: string;
  image_url: string[];
  theme_color: string;
  background_image?: string; 
};

type LeaderboardEntry = {
  user_id: string;
  total_points: number;
  profile: Profile;
};

type WaifuLeaderboardData = {
  waifu: Waifu;
  top_simps: LeaderboardEntry[];
  total_players: number;
};

const formatNumber = (num: number) => {
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
};

// --- ICONS ---
const IconSearch = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const IconChevronDown = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
  </svg>
);

const IconCrown = ({ className, color }: { className?: string, color?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill={color || "currentColor"} stroke="none">
    <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5ZM19 19C19 19.6 18.6 20 18 20H6C5.4 20 5 19.6 5 19V18H19V19Z" />
  </svg>
);

const LeaderboardCardSkeleton = () => (
  <div className="bg-neutral-900 rounded-[2rem] h-[100px] relative overflow-hidden animate-pulse mb-4 border border-white/5">
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shimmer-effect" />
  </div>
);

// ==========================================
// 2. PODIUM COMPONENT
// ==========================================

const PodiumBlock = ({ entry, rank }: { entry: LeaderboardEntry | undefined, rank: number }) => {
  const isFirst = rank === 1;
  const isSecond = rank === 2;
  
  const heightClass = isFirst ? 'h-36 md:h-40' : isSecond ? 'h-24 md:h-28' : 'h-16 md:h-20';
  
  let bgGradient = "";
  let borderColor = "";
  let rankLabel = "";
  let rankColor = "";

  if (isFirst) {
    bgGradient = "bg-gradient-to-b from-yellow-500 to-yellow-800"; 
    borderColor = "border-yellow-400";
    rankLabel = "1ST";
    rankColor = "text-yellow-300";
  } else if (isSecond) {
    bgGradient = "bg-gradient-to-b from-slate-400 to-slate-700"; 
    borderColor = "border-slate-300";
    rankLabel = "2ND";
    rankColor = "text-slate-200";
  } else {
    bgGradient = "bg-gradient-to-b from-orange-600 to-orange-900"; 
    borderColor = "border-orange-500";
    rankLabel = "3RD";
    rankColor = "text-orange-300";
  }

  if (!entry) {
    return (
      <div className={`flex flex-col items-center justify-end w-1/3 opacity-20`}>
        <div className={`w-full rounded-t-lg bg-white/5 border-t border-white/10 ${heightClass}`}></div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 15, delay: rank * 0.1 }}
      className={`flex flex-col items-center justify-end w-1/3 group relative z-10 ${isFirst ? '-mt-6' : ''}`}
    >
      {/* Avatar */}
      <div className={`relative mb-2 transition-transform duration-300 group-hover:-translate-y-2 ${isFirst ? 'scale-110' : 'scale-90'}`}>
        <div className={`w-10 h-10 md:w-14 md:h-14 rounded-full p-0.5 bg-gradient-to-br ${isFirst ? 'from-yellow-300 to-yellow-600' : 'from-white/20 to-white/5'} shadow-xl`}>
          <img 
            src={entry.profile.avatar_url || `https://ui-avatars.com/api/?name=${entry.profile.username}`} 
            className="w-full h-full object-cover rounded-full border-2 border-black" 
            alt="avatar"
          />
        </div>
        {isFirst && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 animate-bounce drop-shadow-[0_0_10px_rgba(234,179,8,0.8)]">
            <IconCrown className="w-5 h-5 md:w-6 md:h-6" color="#fbbf24" />
          </div>
        )}
      </div>

      {/* Podium Pillar */}
      <div className={`w-full ${heightClass} ${bgGradient} rounded-t-xl border-t-2 border-x ${borderColor} flex flex-col items-center justify-start pt-2 relative overflow-hidden shadow-2xl`}>
        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-30"></div>
        <span className={`text-[9px] md:text-[10px] font-black ${rankColor} tracking-widest mb-1 z-10`}>{rankLabel}</span>
        <p className="text-[8px] md:text-[9px] font-bold text-white uppercase truncate max-w-[90%] z-10 px-1 text-center leading-tight drop-shadow-md">
          {entry.profile.username}
        </p>
        <div className="mt-auto mb-2 px-2 py-0.5 bg-black/40 rounded-full backdrop-blur-sm z-10 border border-white/10">
          <p className="text-[7px] md:text-[8px] font-mono font-bold text-white">
            {formatNumber(entry.total_points)}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

// ==========================================
// 3. WAIFU CARD (BACKGROUND IMAGE STYLE)
// ==========================================
const WaifuLeaderboardCard = ({ waifu, isOpen, onToggle }: { waifu: any, isOpen: boolean, onToggle: () => void }) => {
  const [data, setData] = useState<WaifuLeaderboardData | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchTopSimps = async () => {
      const { data: progressData } = await supabase
        .from('user_progress')
        .select(`total_points_accumulated, user_id, profiles!inner ( username, avatar_url )`)
        .eq('waifu_id', waifu.id)
        .order('total_points_accumulated', { ascending: false })
        .limit(3);
        
      const { count } = await supabase
        .from('user_progress')
        .select('*', { count: 'exact', head: true })
        .eq('waifu_id', waifu.id);
        
      const formattedSimps: LeaderboardEntry[] = (progressData || []).map((p: any) => ({
        user_id: p.user_id,
        total_points: p.total_points_accumulated,
        profile: { 
          username: p.profiles?.username || "Mystery Simp", 
          avatar_url: p.profiles?.avatar_url 
        }
      }));

      setData({ waifu, top_simps: formattedSimps, total_players: count || 0 });
    };
    fetchTopSimps();
  }, [waifu.id]);

  const accent = waifu.theme_color || '#ec4899';
  const top1 = data?.top_simps?.[0];
  const top2 = data?.top_simps?.[1];
  const top3 = data?.top_simps?.[2];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mb-5"
    >
      <div 
        className={`relative overflow-hidden rounded-[2rem] transition-all duration-500 border border-white/10 group shadow-lg`}
        style={{ 
          boxShadow: isOpen ? `0 0 25px -5px ${accent}60` : '0 10px 20px -5px rgba(0,0,0,0.5)'
        }}
      >
        {/* --- BACKGROUND IMAGE LAYER (Darkened) --- */}
        <div className="absolute inset-0 z-0 h-full w-full">
           <img 
              src={waifu.image_url[0]} 
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
              alt="bg" 
           />
           {/* Dark Overlay: Gelap tapi masih kelihatan gambarnya */}
           <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
           <div className="absolute inset-0 bg-gradient-to-r from-black via-black/20 to-transparent"></div>
        </div>

        {/* --- HEADER --- */}
        <div 
          className="relative z-10 p-5 flex items-center gap-4 md:gap-6 cursor-pointer" 
          onClick={onToggle}
        >
          {/* Avatar Icon */}
          <div className="relative shrink-0">
            <div 
              className="w-16 h-16 rounded-xl p-0.5 shadow-2xl transform transition-transform duration-300 group-hover:scale-105"
              style={{ background: `linear-gradient(135deg, ${accent}, transparent)` }}
            >
              <img 
                src={waifu.image_url[0]} 
                className="w-full h-full object-cover rounded-[10px] bg-black" 
                alt="icon" 
              />
            </div>
          </div>

          {/* Info Text */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            {/* Series Label */}
            <div className="flex items-center gap-2 mb-1">
               <span 
                 className="px-2 py-0.5 rounded text-[8px] font-bold text-white uppercase tracking-wider border border-white/20 bg-black/40 backdrop-blur-md"
                 style={{ borderColor: `${accent}50` }}
               >
                 {waifu.series}
               </span>
               <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wide">
                 • {data?.total_players || 0} Challengers
               </span>
            </div>

            <h3 className="text-xl font-black text-white uppercase italic tracking-tighter leading-none truncate drop-shadow-lg">
              {waifu.name}
            </h3>
            
            {/* SUAMI SAH (VISIBLE WHEN CLOSED) */}
            <AnimatePresence>
              {!isOpen && top1 && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  exit={{ opacity: 0, height: 0 }} 
                  className="mt-2 flex items-center gap-2"
                >
                   <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-pink-500/10 border border-pink-500/30">
                      <IconCrown className="w-3 h-3 text-pink-400" />
                      <p className="text-[9px] font-bold text-pink-200 uppercase tracking-wide">Suami Sah:</p>
                      <p className="text-[9px] font-black text-white italic truncate">
                          {top1.profile.username}
                      </p>
                      
                   </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Chevron */}
          <div 
            className={`w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white transition-all duration-300 group-hover:bg-white/10 ${isOpen ? 'rotate-180 bg-pink-500/20 text-pink-400 border-pink-500/50' : ''}`}
          >
            <IconChevronDown className="w-5 h-5" />
          </div>
        </div>

        {/* --- PODIUM SECTION --- */}
        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }} 
              animate={{ height: 'auto', opacity: 1 }} 
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
              className="relative z-10 border-t border-white/10 bg-black/40"
            >
               <div className="px-6 py-6">
                  {/* Podium */}
                  <div className="flex items-end justify-center gap-3 md:gap-6 h-48 mb-6 px-2 max-w-lg mx-auto">
                     <PodiumBlock entry={top2} rank={2} />
                     <PodiumBlock entry={top1} rank={1} />
                     <PodiumBlock entry={top3} rank={3} />
                  </div>

                  {/* Action Button */}
                  <div className="text-center">
                    <button 
                      onClick={(e) => { e.stopPropagation(); router.push(`/waifu-leaderboard/${waifu.id}`); }} 
                      className="w-full md:w-auto px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-[10px] font-black text-white uppercase tracking-[0.2em] shadow-lg hover:shadow-pink-500/20 hover:border-pink-500/50 transition-all active:scale-95 flex items-center justify-center gap-2 mx-auto"
                    >
                      LIHAT DETAIL LEADERBOARD ➜
                    </button>
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// ==========================================
// 4. MAIN PAGE
// ==========================================
export default function LeaderboardPage() {
  const [waifus, setWaifus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [waifuOfTheMonth, setWaifuOfTheMonth] = useState<any>(null);
  const [queenImageIndex, setQueenImageIndex] = useState(0);
  const [openWaifuId, setOpenWaifuId] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      const { data: wData } = await supabase.from('waifus').select('*').order('name', { ascending: true });
      if (!wData) return;
      setWaifus(wData);

      const { data: allProgress } = await supabase.from('user_progress').select(`waifu_id, total_points_accumulated, profiles:user_id ( username )`);
      if (allProgress) {
        const pointsPerWaifu: any = {}; const topUserPerWaifu: any = {}; const maxUserPoints: any = {};
        allProgress.forEach((p: any) => {
          const profileData = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
          const uname = profileData?.username || "Guest";
          pointsPerWaifu[p.waifu_id] = (pointsPerWaifu[p.waifu_id] || 0) + p.total_points_accumulated;
          if (!maxUserPoints[p.waifu_id] || p.total_points_accumulated > maxUserPoints[p.waifu_id]) {
            maxUserPoints[p.waifu_id] = p.total_points_accumulated;
            topUserPerWaifu[p.waifu_id] = uname;
          }
        });
        let winnerId = ""; let maxPoints = -1;
        Object.entries(pointsPerWaifu).forEach(([id, pts]: any) => { if (pts > maxPoints) { maxPoints = pts; winnerId = id; } });
        const winner = wData.find(w => w.id === winnerId);
        if (winner) setWaifuOfTheMonth({ ...winner, total_faction_points: maxPoints, suami_sah: topUserPerWaifu[winnerId] });
      }
      setLoading(false);
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!waifuOfTheMonth || !waifuOfTheMonth.image_url || waifuOfTheMonth.image_url.length <= 1) return;
    const interval = setInterval(() => { setQueenImageIndex((prev) => (prev + 1) % waifuOfTheMonth.image_url.length); }, 3000);
    return () => clearInterval(interval);
  }, [waifuOfTheMonth]);

  const seriesList = useMemo(() => {
    const allSeries = waifus.map(w => w.series);
    return ['All', ...Array.from(new Set(allSeries))];
  }, [waifus]);

  const filteredWaifus = waifus.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase()) || w.series.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedFilter === 'All' || w.series === selectedFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <main className="min-h-screen bg-[#0a0a0a] font-sans selection:bg-pink-500/30 overflow-x-hidden">
      
      {/* --- CROWNED QUEEN --- */}
      <section className="relative min-h-[75vh] flex flex-col items-center justify-start px-6 pt-10 pb-12">
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-yellow-500/5 rounded-full blur-[100px]"></div>
        </div>

        {waifuOfTheMonth && (
          <div className="relative z-10 flex flex-col items-center w-full max-w-4xl">
             <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl md:text-4xl font-black uppercase italic tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-yellow-500 to-yellow-800 drop-shadow-[0_0_15px_rgba(234,179,8,0.4)] mb-8 text-center">
                Waifu of The Month
             </motion.h1>

             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative mb-8">
                <div className="w-52 h-52 md:w-72 md:h-72 relative z-10">
                   <div className="absolute inset-0 border-4 border-yellow-500/30 rounded-full animate-[spin_30s_linear_infinite]"></div>
                   <div className="w-full h-full rounded-full overflow-hidden border-[8px] border-neutral-900 shadow-2xl relative bg-neutral-900">
                      {waifuOfTheMonth.image_url.map((img: string, idx: number) => (
                        <img key={idx} src={img} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out scale-110 ${idx === queenImageIndex ? 'opacity-100' : 'opacity-0'}`} alt="queen" />
                      ))}
                   </div>
                </div>
             </motion.div>

             <div className="text-center mb-10 w-full">
                <h2 className="text-5xl md:text-8xl font-black text-white uppercase italic tracking-tighter leading-none drop-shadow-2xl">
                   {waifuOfTheMonth.name}
                </h2>
                <div className="inline-block mt-4 px-4 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                   <p className="text-xs md:text-sm font-bold text-slate-300 uppercase tracking-[0.2em]">
                      {waifuOfTheMonth.series}
                   </p>
                </div>
             </div>

             <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="w-full max-w-lg bg-gradient-to-r from-pink-500/20 via-neutral-900/50 to-yellow-500/10 border border-white/5 rounded-3xl p-6 flex items-center justify-between shadow-2xl">
                <div className="flex flex-col">
                   <p className="text-[9px] font-black text-pink-500 uppercase tracking-widest mb-1 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse"></span>Suami Sah</p>
                   
                   <h4 className="text-xl md:text-3xl font-black text-white italic uppercase truncate max-w-[150px] md:max-w-none drop-shadow-[0_0_10px_rgba(236,72,153,0.3)]">{waifuOfTheMonth.suami_sah}</h4>
                </div>
                <div className="h-10 w-px bg-white/10 mx-4"></div>
                <div className="flex flex-col text-right">
                   <p className="text-[9px] font-black text-yellow-500 uppercase tracking-widest mb-1">Faction Power</p>
                   <h4 className="text-xl md:text-3xl font-black text-white italic uppercase">{formatNumber(waifuOfTheMonth.total_faction_points)} <span className="text-xs font-light text-slate-500">pts</span></h4>
                </div>
             </motion.div>
          </div>
        )}
      </section>

      {/* --- SEARCH & FILTER --- */}
      <div className="sticky top-0 z-50 px-6 py-4 -mt-10 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5 shadow-2xl">
         <div className="max-w-2xl mx-auto">
            <div className="relative group mb-4">
               <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none"><IconSearch className="h-5 w-5 text-slate-400 group-focus-within:text-pink-500 transition-colors" /></div>
               <input 
                  type="text" 
                  className="block w-full pl-14 pr-6 py-4 rounded-2xl bg-neutral-900/80 border border-neutral-700 text-white font-bold focus:border-pink-500/50 focus:ring-4 focus:ring-pink-500/10 focus:outline-none transition-all shadow-inner placeholder:text-neutral-500" 
                  placeholder="Cari Waifu atau Series..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
               />
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
               {seriesList.map((series) => (
                  <button
                     key={series}
                     onClick={() => setSelectedFilter(series)}
                     className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${
                        selectedFilter === series 
                           ? 'bg-white text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.3)]' 
                           : 'bg-neutral-900 text-slate-400 border-neutral-700 hover:border-pink-500/50 hover:text-pink-400'
                     }`}
                  >
                     {series}
                  </button>
               ))}
            </div>
         </div>
      </div>

      <section className="px-6 max-w-[1400px] mx-auto py-8 pb-20">
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWaifus.map((waifu) => (
               <WaifuLeaderboardCard 
                  key={waifu.id} 
                  waifu={waifu}
                  isOpen={openWaifuId === waifu.id}
                  onToggle={() => setOpenWaifuId(openWaifuId === waifu.id ? null : waifu.id)}
               />
            ))}
            
            {loading && [1,2,3,4,5,6].map(i => <LeaderboardCardSkeleton key={i} />)}

            {!loading && filteredWaifus.length === 0 && (
               <div className="col-span-full text-center py-20 opacity-50">
                  <p className="text-white font-black uppercase tracking-widest text-xs">Waifu tidak ditemukan.</p>
               </div>
            )}
         </div>
      </section>

      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg) scale(1.05); } to { transform: rotate(360deg) scale(1.05); } }
        .shimmer-effect { animation: shimmer 1.5s infinite; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </main>
  );
}