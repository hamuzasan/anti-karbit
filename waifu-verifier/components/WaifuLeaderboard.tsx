"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// --- 1. LOGO TIKTOK ASLI (BENTUK NADA) ---
const TiktokIcon = () => (
  <svg className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 448 512">
    {/* FontAwesome TikTok Path */}
    <path d="M448 209.91a210.06 210.06 0 0 1-122.77-39.25V349.38A162.55 162.55 0 1 1 185 188.31V278.2a74.62 74.62 0 1 0 52.23 71.18V0l88 0a121.18 121.18 0 0 0 1.86 22.17h0A122.18 122.18 0 0 0 381 102.39a121.43 121.43 0 0 0 67 20.14z" />
  </svg>
);

const FacebookIcon = () => (
  <svg className="w-3 h-3 md:w-4 md:h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.791-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

export default function WaifuLeaderboard({ waifuId, themeColor }: { waifuId: string, themeColor: string }) {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setMyId(session?.user?.id || null);

      const { data } = await supabase
        .from('user_progress')
        .select(`
          total_points_accumulated,
          level_cleared,
          user_id,
          profiles!inner ( username, avatar_url, social_fb, social_tiktok )
        `)
        .eq('waifu_id', waifuId)
        .order('total_points_accumulated', { ascending: false })
        .limit(10);

      if (data) setLeaders(data);
      setLoading(false);
    };

    fetchLeaderboard();
  }, [waifuId]);

  if (loading) return <div className="h-16 w-full animate-pulse bg-neutral-900/50 rounded-2xl border border-neutral-800"></div>;

  if (leaders.length === 0) {
    return (
      <div className="bg-neutral-900/50 backdrop-blur-md rounded-2xl p-4 border border-neutral-800 text-center">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">BELUM ADA SUAMI SAH</p>
      </div>
    );
  }

  const topOne = leaders[0];
  const others = leaders.slice(1);
  const isTopMe = topOne.user_id === myId;

  // --- HELPER RENDER ROW ---
  const RenderRow = ({ entry, rank, isMe, isCompact = false }: any) => {
    const p = entry.profiles;
    
    // Warna Badge Ranking
    let rankBadgeColor = "bg-neutral-700 text-slate-300 border-neutral-600"; // Default
    if (rank === 1) rankBadgeColor = "bg-yellow-500 text-black border-yellow-300 shadow-lg shadow-yellow-500/50";
    if (rank === 2) rankBadgeColor = "bg-slate-300 text-slate-900 border-white";
    if (rank === 3) rankBadgeColor = "bg-orange-500 text-white border-orange-300";

    // Style Container Rank
    let containerStyle = "bg-neutral-800 text-slate-400 border border-neutral-700";
    if (rank === 1) containerStyle = "bg-gradient-to-br from-yellow-400 to-yellow-700 text-white border-none shadow-lg shadow-yellow-500/20";
    
    return (
      <div className="flex items-center justify-between gap-3 w-full">
         <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
            
            {/* 1. AVATAR & RANK BADGE */}
            <div className="relative flex-shrink-0">
               {/* Bingkai Avatar */}
               <div className={`${isCompact ? 'w-10 h-10' : 'w-12 h-12'} rounded-xl p-0.5 ${containerStyle}`}>
                  {p?.avatar_url ? (
                    <img src={p.avatar_url} className="w-full h-full object-cover rounded-[10px]" />
                  ) : (
                    <div className="w-full h-full bg-neutral-900 rounded-[10px] flex items-center justify-center text-lg">
                      {rank === 1 ? '🥇' : '👤'}
                    </div>
                  )}
               </div>

               {/* BADGE PERINGKAT (DULU LEVEL) */}
               <div className={`absolute -bottom-1 -right-2 px-1.5 py-0.5 rounded-md border text-[8px] font-black uppercase tracking-tighter shadow-sm ${rankBadgeColor}`}>
                 #{rank}
               </div>
            </div>

            {/* 2. NAMA & SOSMED */}
            <div className="flex flex-col min-w-0">
               <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-black uppercase truncate ${isMe ? 'text-pink-500' : 'text-white'}`}>
                     {p?.username || 'Unknown'} {isMe && '(YOU)'}
                  </span>
                  
                  {/* --- TOMBOL SOSMED --- */}
                  <div className="flex gap-1.5 items-center">
                    {/* TikTok */}
                    {p?.social_tiktok && (
                      <a 
                        href={p.social_tiktok.startsWith('http') ? p.social_tiktok : `https://tiktok.com/@${p.social_tiktok.replace('@', '')}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        onClick={(e) => e.stopPropagation()} 
                        className="p-1.5 bg-black text-white border border-neutral-700 rounded-md hover:bg-[#00f2ea] hover:text-black hover:border-transparent transition-all hover:scale-110 shadow-lg group/icon flex items-center justify-center"
                        title="TikTok Profile"
                      >
                        <TiktokIcon />
                      </a>
                    )}
                    
                    {/* Facebook */}
                    {p?.social_fb && (
                      <a 
                        href={p.social_fb.startsWith('http') ? p.social_fb : `https://facebook.com/${p.social_fb}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        onClick={(e) => e.stopPropagation()} 
                        className="p-1.5 bg-[#1877F2] text-white rounded-md hover:bg-[#1877F2]/80 transition-all hover:scale-110 shadow-lg shadow-blue-500/30 flex items-center justify-center"
                        title="Facebook Profile"
                      >
                        <FacebookIcon />
                      </a>
                    )}
                  </div>
               </div>
               
               <span className={`text-[9px] font-bold uppercase tracking-wider ${rank === 1 ? 'text-yellow-500' : 'text-slate-500'}`}>
                 {entry.total_points_accumulated.toLocaleString()} PTS
               </span>
            </div>
         </div>
      </div>
    );
  };

  return (
    <div className="w-full relative mt-6 transition-all duration-300 z-30">
      
      {/* LABEL SUAMI SAH */}
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
         <div className="bg-gradient-to-r from-yellow-600 to-yellow-400 text-black px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(234,179,8,0.5)] flex items-center gap-2 whitespace-nowrap border-2 border-white/20">
             <span>👑</span> SUAMI SAH
          </div>
      </div>

      {/* CONTAINER */}
      <div 
        className={`
           relative bg-neutral-900/90 backdrop-blur-xl rounded-[24px] shadow-2xl transition-all duration-500 border-2 overflow-hidden
           ${isOpen ? 'border-pink-500/50 shadow-pink-900/20' : 'border-neutral-800'}
        `}
      >
        
        {/* HEADER (JUARA 1) */}
        <div 
          onClick={() => setIsOpen(!isOpen)} 
          className="relative px-5 py-4 cursor-pointer group bg-gradient-to-b from-neutral-800/40 to-black/40 hover:bg-neutral-800/60 transition-colors pt-6"
        >
          <div className="flex items-center justify-between">
             <div className="flex-1">
               <RenderRow entry={topOne} rank={1} isMe={isTopMe} />
             </div>
             <div className={`ml-4 w-8 h-8 flex-shrink-0 rounded-full bg-neutral-800/50 border border-neutral-700 flex items-center justify-center text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-pink-500 border-pink-500' : ''}`}>
               ▼
             </div>
          </div>
        </div>

        {/* LIST (RANK 2-10) */}
        <div className={`bg-black/60 transition-[max-height,opacity] duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="p-3 space-y-2 border-t border-neutral-800">
            {others.map((entry, idx) => (
                <div key={entry.user_id} className={`p-2 rounded-xl border ${entry.user_id === myId ? 'bg-pink-900/20 border-pink-500/50' : 'bg-transparent border-transparent hover:bg-neutral-800/30'}`}>
                   <RenderRow entry={entry} rank={idx + 2} isMe={entry.user_id === myId} isCompact={true} />
                </div>
            ))}
             <div className="text-center pt-2 pb-1">
                <button onClick={() => setIsOpen(false)} className="text-[8px] font-black text-slate-600 uppercase hover:text-white transition-colors">▲ Close Ranking</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}