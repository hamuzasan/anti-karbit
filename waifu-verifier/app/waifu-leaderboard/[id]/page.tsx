"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import UserProfileModal from '@/components/UserProfileModal';

// --- TYPES ---
type Profile = {
  username: string;
  name?: string; // <-- Added Display Name
  avatar_url?: string;
  role?: string;
};

type Waifu = {
  id: string;
  name: string;
  series: string;
  image_url: string[];
  theme_color: string;
};

// Tipe khusus untuk data styling Rank
type RankData = {
  title: string;
  isDynamic: boolean;
  className?: string;
  style?: React.CSSProperties;
};

type Challenger = {
  user_id: string;
  total_points: number;
  quiz_points: number;
  merch_points: number;
  profile: Profile;
  rank: number;
  rankTitleData: RankData; 
  completionRate: number;
};

// --- UTILS ---
const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US').format(num);
};

// Helper Rank Style
const getRankData = (rank: number, waifuName: string, completionRate: number, themeColor: string): RankData => {
  const shortName = waifuName.split(' ')[0]; 
  
  if (rank === 1) return { 
    title: "SUAMI SAH", 
    isDynamic: false,
    className: "bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-600 text-black border-yellow-200 shadow-[0_0_15px_rgba(234,179,8,0.6)]" 
  };

  if (rank >= 2 && rank <= 5) return { 
    title: `PEMUJA ${shortName}`, 
    isDynamic: true, 
    style: {
      background: `linear-gradient(to right, ${themeColor}, ${themeColor}CC)`,
      color: '#fff',
      borderColor: themeColor,
      boxShadow: `0 0 10px ${themeColor}60`
    }
  };

  if (completionRate > 50) return { title: `PENGIKUT ${shortName}`, isDynamic: false, className: "bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-blue-400" };
  if (completionRate >= 30) return { title: "KARBIT MUSIMAN", isDynamic: false, className: "bg-neutral-600 text-slate-300 border-neutral-500" };
  return { title: "KARBIT SAMPAH", isDynamic: false, className: "bg-neutral-800 text-slate-500 border-neutral-700 grayscale" };
};

// --- ICONS ---
const IconBack = ({ className }: { className?: string }) => (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>);
const IconTrophy = ({ className, color }: { className?: string, color?: string }) => (<svg className={className} viewBox="0 0 24 24" fill={color || "currentColor"}><path d="M19 5H16.3C16.8 3.8 17 2.6 17 2H7C7 2.6 7.2 3.8 7.7 5H5C3.3 5 2 6.3 2 8C2 10.6 4.6 12.8 8.5 13.7C9.2 15.6 11 17 13 17V19H8V21H16V19H11V17C13 17 14.8 15.6 15.5 13.7C19.4 12.8 22 10.6 22 8C22 6.3 20.7 5 19 5ZM5 8C5 7.4 5.4 7 6 7H7.2C6.5 9 6.2 11.2 6.1 12.8C4.5 12.1 5 9.7 5 8ZM19 8C19 9.7 19.5 12.1 17.9 12.8C17.8 11.2 17.5 9 16.8 7H18C18.6 7 19 7.4 19 8Z" /></svg>);
const IconSword = ({ className }: { className?: string }) => (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>);
const IconQuiz = () => (<svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>);
const IconVault = () => (<svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>);

// --- TOMBOL LINK PROFIL ---
const ProfileLinkButton = ({ onClick }: { onClick: () => void }) => (
  <button 
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className="ml-2 inline-flex items-center justify-center w-5 h-5 md:w-6 md:h-6 rounded-full bg-white/5 hover:bg-pink-500 hover:text-white text-slate-500 transition-all duration-200 border border-white/10 hover:border-pink-400 shrink-0"
    title="Lihat Profil User"
  >
    <span className="text-[10px] md:text-xs">🔗</span>
  </button>
);

// --- COMPONENT: PODIUM AVATAR ---
const PodiumAvatar = ({ challenger, rank, onProfileClick }: { challenger?: Challenger, rank: number, onProfileClick: (id: string) => void }) => {
  if (!challenger) return <div className="w-1/3 h-48 opacity-0"></div>;

  const isFirst = rank === 1;
  const size = isFirst ? 'w-24 h-24 md:w-32 md:h-32' : 'w-16 h-16 md:w-20 md:h-20';
  const borderColors = isFirst ? 'border-yellow-400' : rank === 2 ? 'border-slate-300' : 'border-orange-500';
  const crownColor = isFirst ? '#facc15' : rank === 2 ? '#cbd5e1' : '#f97316';
  const delay = rank === 1 ? 0.2 : rank === 2 ? 0.1 : 0.3;

  const rankData = challenger.rankTitleData || { title: 'Unknown', isDynamic: false, className: 'bg-neutral-800' };

  // Logic Nama Podium: Prioritaskan Display Name
  const displayName = challenger.profile.name || challenger.profile.username;
  const username = challenger.profile.name ? challenger.profile.username : null;

  return (
    <motion.div 
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay, type: "spring", stiffness: 100 }}
      className={`flex flex-col items-center relative z-10 ${isFirst ? '-mt-16 scale-110' : ''}`}
    >
      <div className="relative group cursor-default">
        <div className={`absolute -top-10 left-1/2 -translate-x-1/2 ${isFirst ? 'scale-125 animate-bounce' : 'scale-90'}`}>
           <IconTrophy className="w-10 h-10 drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]" color={crownColor} />
        </div>
        <div className={`${size} rounded-full p-1 bg-[#121212] border-4 ${borderColors} shadow-[0_0_30px_rgba(0,0,0,0.6)] relative overflow-hidden transition-transform group-hover:scale-105`}>
           <img 
             src={challenger.profile.avatar_url || `https://ui-avatars.com/api/?name=${challenger.profile.username}`} 
             className="w-full h-full object-cover rounded-full"
             alt={challenger.profile.username}
           />
        </div>
        <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-black border-2 shadow-xl whitespace-nowrap bg-[#121212] text-white ${borderColors}`}>
           #{rank}
        </div>
      </div>

      <div className="mt-6 text-center flex flex-col items-center gap-1">
         <div className="flex flex-col items-center justify-center">
             <div className="flex items-center justify-center gap-1">
                <h3 className={`font-black uppercase text-white tracking-wider ${isFirst ? 'text-lg' : 'text-sm'} drop-shadow-lg truncate max-w-[120px]`}>
                    {displayName}
                </h3>
                <ProfileLinkButton onClick={() => onProfileClick(challenger.user_id)} />
             </div>
             {/* Jika ada Display Name, tampilkan username kecil di bawahnya */}
             {username && (
                <p className="text-[8px] font-bold text-slate-400 -mt-1 tracking-widest">@{username}</p>
             )}
         </div>
         
         <div 
            className={`px-2 py-0.5 rounded-md border text-[8px] font-black uppercase tracking-widest ${!rankData.isDynamic ? rankData.className : ''} mt-1`}
            style={rankData.isDynamic ? rankData.style : {}}
         >
            {rankData.title}
         </div>

         <div className="mt-1 inline-block bg-white/10 border border-white/5 backdrop-blur-md px-3 py-1 rounded-full">
            <p className="text-[10px] font-mono font-bold text-yellow-400">
                {formatNumber(challenger.total_points)} PTS
            </p>
         </div>
      </div>
    </motion.div>
  );
};

// ==========================================
// MAIN PAGE COMPONENT
// ==========================================
export default function WaifuDetailLeaderboard() {
  const { id } = useParams();
  const router = useRouter();
  
  const [waifu, setWaifu] = useState<Waifu | null>(null);
  const [challengers, setChallengers] = useState<Challenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [bgImageIndex, setBgImageIndex] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);

      // 1. Get Waifu Data
      const { data: wData } = await supabase.from('waifus').select('*').eq('id', id).single();
      if (wData) setWaifu(wData);

      // 2. Get Total Questions
      const { count: totalQuestions } = await supabase.from('questions').select('*', { count: 'exact', head: true }).eq('waifu_id', id);
      const totalQ = totalQuestions || 1;

      // 3. Get Points (Note: Added 'name' to select)
      const { data: quizData } = await supabase
        .from('user_progress')
        .select(`total_points_accumulated, user_id, profiles!inner ( username, name, avatar_url, role )`)
        .eq('waifu_id', id);

      const { data: merchData } = await supabase
        .from('user_collections')
        .select('user_id, points_awarded')
        .eq('waifu_id', id)
        .eq('is_valid', true);

      if (quizData) {
        const userMap = new Map<string, any>();

        quizData.forEach((q: any) => {
           userMap.set(q.user_id, {
              user_id: q.user_id,
              quiz_points: q.total_points_accumulated || 0,
              merch_points: 0, 
              total_points: q.total_points_accumulated || 0,
              profile: q.profiles
           });
        });

        if (merchData) {
           merchData.forEach((m: any) => {
              if (userMap.has(m.user_id)) {
                 const userData = userMap.get(m.user_id);
                 userData.merch_points += (m.points_awarded || 0);
                 userData.total_points += (m.points_awarded || 0);
                 userMap.set(m.user_id, userData);
              }
           });
        }

        const combinedChallengers = Array.from(userMap.values());
        combinedChallengers.sort((a, b) => b.total_points - a.total_points);
        const top100 = combinedChallengers.slice(0, 100);

        const challengersWithStats = await Promise.all(top100.map(async (p: any, index: number) => {
           const rank = index + 1;
           const { count: answeredCount } = await supabase.from('answered_questions').select('*', { count: 'exact', head: true }).eq('waifu_id', id).eq('user_id', p.user_id);
           const answered = answeredCount || 0;
           const completionRate = (answered / totalQ) * 100;
           
           const rankData = getRankData(rank, wData?.name || "", completionRate, wData?.theme_color || '#ec4899');

           return {
             ...p,
             profile: {
                username: p.profile.username,
                name: p.profile.name, // Mapping Name
                avatar_url: p.profile.avatar_url,
                role: p.profile.role
             },
             rank: rank,
             rankTitleData: rankData,
             completionRate: completionRate
           };
        }));
        
        setChallengers(challengersWithStats);
      }
      setLoading(false);
    };

    fetchData();
  }, [id]);

  useEffect(() => {
    if (!waifu || !waifu.image_url || waifu.image_url.length <= 1) return;
    const interval = setInterval(() => { setBgImageIndex((prev) => (prev + 1) % waifu.image_url.length); }, 5000);
    return () => clearInterval(interval);
  }, [waifu]);

  const getSafeRankData = (challenger: Challenger) => {
    return challenger?.rankTitleData || { title: 'Unknown', isDynamic: false, className: 'bg-neutral-800 text-slate-500' };
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4">
       <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
       <div className="text-white font-black tracking-[0.3em] text-xs animate-pulse">ANALYZING FACTION DATA...</div>
    </div>
  );

  if (!waifu) return <div className="text-white flex justify-center items-center h-screen">Waifu tidak ditemukan.</div>;

  const top1 = challengers[0];
  const top2 = challengers[1];
  const top3 = challengers[2];
  const restChallengers = challengers.slice(3);

  return (
    <main className="min-h-screen bg-[#0a0a0a] font-sans selection:bg-pink-500/30 pb-20 overflow-x-hidden relative">
      
      {/* --- HERO HEADER --- */}
      <section className="relative h-[75vh] flex flex-col justify-end pb-20 overflow-hidden">
         <div className="absolute inset-0 z-0">
            <AnimatePresence mode='wait'>
              <motion.img 
                key={bgImageIndex}
                src={waifu.image_url[bgImageIndex]} 
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
                className="absolute inset-0 w-full h-full object-cover" 
                alt="bg" 
              />
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/30 via-[#0a0a0a]/70 to-[#0a0a0a]"></div>
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"></div>
         </div>

         <div className="absolute top-6 left-6 z-50">
            <button onClick={() => router.back()} className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/10 hover:border-white/30 transition-all active:scale-90 group">
               <IconBack className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
            </button>
         </div>

         <div className="relative z-10 px-6 text-center">
             <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="inline-block px-4 py-1.5 rounded-full border border-white/10 bg-black/60 backdrop-blur-md mb-4 shadow-xl">
                <span className="text-[10px] md:text-xs font-bold text-slate-300 uppercase tracking-[0.3em]">{waifu.series}</span>
             </motion.div>
             <motion.h1 initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-5xl md:text-8xl font-black text-white uppercase italic tracking-tighter drop-shadow-[0_0_30px_rgba(0,0,0,0.8)] mb-2">
                {waifu.name}
             </motion.h1>
             <p className="text-xs md:text-sm font-bold text-white/80 uppercase tracking-widest mb-2 drop-shadow-md">
                Total Kekuatan Faksi: <span className="text-yellow-400">{formatNumber(challengers.reduce((acc, curr) => acc + curr.total_points, 0))} PTS</span>
             </p>

             <div className="flex items-end justify-center gap-3 md:gap-16 mt-32 pb-4 mx-auto max-w-4xl px-4 relative z-20">
                {top2 && <PodiumAvatar challenger={{...top2, rankTitleData: getSafeRankData(top2)}} rank={2} onProfileClick={(uid) => setSelectedUserId(uid)} />}
                {top1 && <PodiumAvatar challenger={{...top1, rankTitleData: getSafeRankData(top1)}} rank={1} onProfileClick={(uid) => setSelectedUserId(uid)} />}
                {top3 && <PodiumAvatar challenger={{...top3, rankTitleData: getSafeRankData(top3)}} rank={3} onProfileClick={(uid) => setSelectedUserId(uid)} />}
             </div>
         </div>
      </section>

      {/* --- LIST SECTION (RANK 4+) --- */}
      <section className="px-4 md:px-6 max-w-4xl mx-auto mt-4 relative z-20 pb-32">
         <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-white font-black uppercase italic tracking-wider text-xl flex items-center gap-2">
                <span className="w-1 h-6 rounded-full" style={{ backgroundColor: waifu.theme_color || '#ec4899' }}></span>
                Challenger Zone
            </h2>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/5">
               Top 100
            </span>
         </div>

         <div className="flex flex-col gap-2">
            {restChallengers.length > 0 ? (
               restChallengers.map((challenger) => {
                  const rankData = getSafeRankData(challenger);
                  const displayName = challenger.profile.name || challenger.profile.username;
                  const username = challenger.profile.name ? challenger.profile.username : null;

                  return (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        key={challenger.user_id} 
                        className="flex items-center justify-between p-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/5 hover:border-pink-500/30 hover:bg-white/5 transition-all duration-300 group shadow-lg"
                    >
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                            <div className="flex flex-col items-center justify-center w-10 shrink-0">
                                <span className="text-xs font-black text-slate-500 group-hover:text-white transition-colors">RANK</span>
                                <span className="text-xl font-black text-white italic">#{challenger.rank}</span>
                            </div>

                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-neutral-800 p-0.5 border border-white/10 group-hover:border-pink-500 transition-colors shadow-lg shrink-0 relative overflow-hidden">
                                <img src={challenger.profile.avatar_url || `https://ui-avatars.com/api/?name=${challenger.profile.username}`} className="w-full h-full rounded-full object-cover" />
                            </div>

                            <div className="flex flex-col min-w-0 flex-1 justify-center">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm md:text-base font-bold text-white uppercase tracking-wide group-hover:text-pink-400 transition-colors truncate">
                                        {displayName}
                                    </span>
                                    <ProfileLinkButton onClick={() => setSelectedUserId(challenger.user_id)} />
                                </div>
                                
                                {/* Username kecil di bawah nama display */}
                                {username && (
                                   <span className="text-[10px] text-slate-500 font-bold -mt-0.5 tracking-wider">@{username}</span>
                                )}

                                <div className="flex items-center gap-2 mt-1">
                                    <span 
                                        className={`text-[8px] px-2 py-0.5 rounded border font-black uppercase tracking-widest ${!rankData.isDynamic ? rankData.className : ''} bg-opacity-10 backdrop-blur-sm`}
                                        style={rankData.isDynamic ? rankData.style : {}}
                                    >
                                        {rankData.title}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="text-right shrink-0 ml-4 flex flex-col items-end">
                            <span className="text-sm md:text-lg font-mono font-black text-slate-300 group-hover:text-yellow-400 transition-colors block tracking-tighter shadow-black drop-shadow-sm">
                                {formatNumber(challenger.total_points)}
                            </span>
                            
                            <div className="flex items-center gap-2 mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                <div className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded border border-white/5" title="Quiz Points">
                                    <IconQuiz /> <span className="text-[9px] font-mono text-blue-300">{formatNumber(challenger.quiz_points)}</span>
                                </div>
                                <div className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded border border-white/5" title="Vault Points">
                                    <IconVault /> <span className="text-[9px] font-mono text-pink-300">{formatNumber(challenger.merch_points)}</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                  );
               })
            ) : (
               <div className="text-center py-20 bg-black/40 backdrop-blur-md rounded-3xl border border-white/5 flex flex-col items-center border-dashed">
                  <p className="text-white font-black uppercase tracking-widest text-xs mb-2">Belum ada penantang lain.</p>
                  <p className="text-[10px] text-slate-500">Jadilah yang pertama mengisi posisi Rank 4!</p>
               </div>
            )}
         </div>
      </section>

      {/* --- FLOATING ACTION BUTTON --- */}
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1 }}
        className="fixed bottom-6 inset-x-0 z-40 flex justify-center px-4"
      >
         <Link 
            href={`/quiz/${id}`}
            style={{
                borderColor: waifu.theme_color || '#db2777', 
                boxShadow: `0 0 30px ${waifu.theme_color ? waifu.theme_color + '40' : 'rgba(219, 39, 119, 0.4)'}` 
            }}
            className="group relative flex items-center justify-center gap-4 px-8 py-3.5 rounded-full bg-[#050505] border-2 transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
         >
            <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500"
                style={{ background: `radial-gradient(circle, ${waifu.theme_color || '#db2777'} 0%, transparent 70%)` }}
            ></div>

            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent z-10"></div>
            <IconSword className="w-5 h-5 text-white animate-pulse drop-shadow-md" />
            <div className="flex flex-col items-start relative z-20">
               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1 group-hover:text-white transition-colors">
                  Tantang Faksi Ini
               </span>
               <span 
                  className="text-sm font-black uppercase italic tracking-wider leading-none drop-shadow-md"
                  style={{ color: waifu.theme_color || 'white' }} 
               >
                  Mulai Verifikasi
               </span>
            </div>
         </Link>
      </motion.div>

{selectedUserId && (
  <UserProfileModal 
    isOpen={!!selectedUserId} 
    onClose={() => setSelectedUserId(null)} 
    userId={selectedUserId}
  />
)}

    </main>
  );
}