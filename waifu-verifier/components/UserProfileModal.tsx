"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

// --- ICONS ---
const IconClose = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const IconTiktok = () => <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 448 512"><path d="M448 209.91a210.06 210.06 0 0 1-122.77-39.25V349.38A162.55 162.55 0 1 1 185 188.31V278.2a74.62 74.62 0 1 0 52.23 71.18V0l88 0a121.18 121.18 0 0 0 1.86 22.17h0A122.18 122.18 0 0 0 381 102.39a121.43 121.43 0 0 0 67 20.14z" /></svg>;
const IconFB = () => <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.791-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>;
const IconCrown = () => <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5M19 19C19 19.6 18.6 20 18 20H6C5.4 20 5 19.6 5 19V18H19V19Z" /></svg>;
const IconHeart = () => <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>;
const IconImage = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;

// --- TYPES ---
type UserProfile = {
  id: string;
  username: string;
  name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  social_tiktok: string | null;
  social_fb: string | null;
};

type TopWaifu = {
  name: string;
  points: number;
  image_url: string;
  theme_color: string;
};

type RankBadge = {
  waifuName: string;
  color: string;
  rank: number;
};

export default function UserProfileModal({ isOpen, onClose, userId }: { isOpen: boolean, onClose: () => void, userId: string | null }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState({ totalPoints: 0, totalCollections: 0, quizPoints: 0, merchPoints: 0 }); // Added breakdown to state
  const [topWaifus, setTopWaifus] = useState<TopWaifu[]>([]);
  const [rankBadges, setRankBadges] = useState<RankBadge[]>([]); 
  const [merchImages, setMerchImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [bgSlideshow, setBgSlideshow] = useState<string[]>([]);
  const [currentBgIdx, setCurrentBgIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  const getWaifuData = (waifuRelation: any) => {
    if (Array.isArray(waifuRelation)) return waifuRelation[0] || {};
    return waifuRelation || {};
  };

  const getSocialLink = (input: string | null, type: 'tiktok' | 'facebook') => {
    if (!input) return '#';
    const cleanInput = input.trim();
    if (cleanInput.startsWith('http://') || cleanInput.startsWith('https://')) return cleanInput;
    if (type === 'tiktok') return `https://www.tiktok.com/${cleanInput.startsWith('@') ? cleanInput : `@${cleanInput}`}`;
    if (type === 'facebook') return `https://www.facebook.com/${cleanInput}`;
    return '#';
  };

  useEffect(() => {
    if (bgSlideshow.length > 1) {
      const interval = setInterval(() => { setCurrentBgIdx((prev) => (prev + 1) % bgSlideshow.length); }, 3000); 
      return () => clearInterval(interval);
    }
  }, [bgSlideshow.length]);

  useEffect(() => {
    if (!isOpen || !userId) return;

    const fetchFullProfileData = async () => {
      setLoading(true);
      try {
        const { data: pData } = await supabase.from('profiles').select('*').eq('id', userId).single();
        if (pData) setProfile(pData);

        const { data: collData, count: collCount } = await supabase
          .from('user_collections')
          .select('image_url, is_valid', { count: 'exact' })
          .eq('user_id', userId);
        
        setMerchImages(collData?.map(c => c.image_url).filter((url): url is string => !!url) || []);

        const { data: progData } = await supabase
          .from('user_progress')
          .select(`
            waifu_id, 
            quiz_points,
            collection_points,
            total_points_accumulated, 
            waifus ( name, image_url, background_image, theme_color )
          `)
          .eq('user_id', userId)
          .order('total_points_accumulated', { ascending: false });

        if (progData && progData.length > 0) {
          const topOshi = progData[0];
          const wData = getWaifuData(topOshi.waifus);
          let oshiImages: string[] = [];
          if (wData.background_image) oshiImages.push(wData.background_image);
          if (Array.isArray(wData.image_url)) oshiImages = [...oshiImages, ...wData.image_url];
          setBgSlideshow(Array.from(new Set(oshiImages)).filter(Boolean)); 
          setCurrentBgIdx(0); 

          // --- LOGIKA POIN 3 KOLOM SINKRON ---
          const totalQuiz = progData.reduce((acc, curr) => acc + (curr.quiz_points || 0), 0);
          const totalMerch = progData.reduce((acc, curr) => acc + (curr.collection_points || 0), 0);
          const totalGrand = progData.reduce((acc, curr) => acc + (curr.total_points_accumulated || 0), 0);

          setStats({ 
            totalPoints: totalGrand, 
            totalCollections: collCount || 0,
            quizPoints: totalQuiz,
            merchPoints: totalMerch
          });

          setTopWaifus(progData.map((item: any) => ({
            name: getWaifuData(item.waifus).name || 'Unknown',
            points: item.total_points_accumulated,
            image_url: getWaifuData(item.waifus).image_url?.[0] || '',
            theme_color: getWaifuData(item.waifus).theme_color || '#ec4899'
          })));

          const badges: RankBadge[] = [];
          await Promise.all(progData.map(async (item: any) => {
             const { count } = await supabase.from('user_progress').select('*', { count: 'exact', head: true }).eq('waifu_id', item.waifu_id).gt('total_points_accumulated', item.total_points_accumulated);
             const rank = (count || 0) + 1;
             if (rank <= 5) badges.push({ waifuName: getWaifuData(item.waifus).name, color: getWaifuData(item.waifus).theme_color, rank: rank });
          }));
          setRankBadges(badges.sort((a, b) => a.rank - b.rank));
        }
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchFullProfileData();
  }, [isOpen, userId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-black/90 flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#0a0a0a] w-full max-w-md rounded-[40px] border border-neutral-800 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-neutral-900">
          <AnimatePresence mode="popLayout">
            {bgSlideshow.length > 0 ? (
              <motion.img key={`${bgSlideshow[currentBgIdx]}-${currentBgIdx}`} src={bgSlideshow[currentBgIdx]} initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.5, ease: "easeInOut" }} className="w-full h-full object-cover" />
            ) : <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black" />}
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent via-60%"></div>
        </div>

        <button onClick={onClose} className="absolute top-4 right-4 z-50 w-8 h-8 rounded-full bg-black/40 border border-white/20 flex items-center justify-center text-white hover:bg-red-500 transition-colors shadow-lg"><IconClose /></button>

        <div className="relative z-10 overflow-y-auto custom-scrollbar h-full">
          {loading ? (
             <div className="h-[500px] flex flex-col items-center justify-center gap-4">
               <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
               <p className="text-[10px] font-black tracking-widest text-white animate-pulse uppercase">Syncing...</p>
             </div>
          ) : profile ? (
            <div className="px-6 pt-24 pb-8 min-h-full flex flex-col justify-end">
                <div className="flex justify-between items-end mb-4">
                  <div className="w-24 h-24 rounded-full p-1 bg-black/50 border-2 border-white/10 relative shadow-2xl backdrop-blur-sm">
                     <img src={profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.username}`} className="w-full h-full rounded-full object-cover" alt="avatar" />
                     <div className="absolute bottom-1 right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-black"></div>
                  </div>
                  <div className="flex gap-2 mb-2">
                     {profile.social_tiktok && <a href={getSocialLink(profile.social_tiktok, 'tiktok')} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-white/10 border border-white/10 rounded-full text-white hover:bg-pink-600 transition-all backdrop-blur-sm"><IconTiktok /></a>}
                     {profile.social_fb && <a href={getSocialLink(profile.social_fb, 'facebook')} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-white/10 border border-white/10 rounded-full text-white hover:bg-blue-600 transition-all backdrop-blur-sm"><IconFB /></a>}
                  </div>
                </div>

                <div className="mb-6">
                  <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-1 drop-shadow-md">{profile.name ? profile.name : profile.username}</h2>
                  <p className="text-[10px] font-bold text-slate-400 mb-4 tracking-widest">@{profile.username}</p>
                  {profile.bio && <div className="bg-white/5 p-3 rounded-xl border-l-2 border-pink-500 mb-4"><p className="text-xs text-slate-300 italic">"{profile.bio}"</p></div>}
                  <div className="flex flex-wrap gap-2">
                     {rankBadges.length > 0 ? rankBadges.map((badge, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-black/40 backdrop-blur-md" style={{ borderColor: badge.color }}>
                           {badge.rank === 1 ? <><IconCrown /><span className="text-[10px] font-black uppercase" style={{ color: badge.color }}>Suami Sah: {badge.waifuName}</span></> : <><IconHeart /><span className="text-[9px] font-extrabold uppercase text-white">Pemuja {badge.waifuName}</span></>}
                        </div>
                     )) : <span className="text-[9px] px-3 py-1 rounded-full border border-white/10 bg-black/40 text-slate-400 font-black uppercase tracking-widest">Warga Biasa</span>}
                  </div>
                </div>

                {/* 3. STATS GRID (FIXED 3 COLUMN POINTS) */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                  <div className="bg-neutral-900/60 border border-white/10 p-4 rounded-2xl text-center backdrop-blur-sm">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Power</p>
                      <p className="text-2xl font-black text-yellow-400 font-mono tracking-tighter drop-shadow-lg">{stats.totalPoints.toLocaleString()}</p>
                      
                      {/* --- POINT BREAKDOWN --- */}
                      <div className="flex justify-center gap-3 mt-2 border-t border-white/5 pt-2">
                        <div className="flex flex-col">
                           <span className="text-[7px] text-slate-500 font-bold uppercase">Quiz</span>
                           <span className="text-[10px] text-blue-400 font-mono font-bold">{stats.quizPoints.toLocaleString()}</span>
                        </div>
                        <div className="w-px h-4 bg-white/10 self-center"></div>
                        <div className="flex flex-col">
                           <span className="text-[7px] text-slate-500 font-bold uppercase">Koleksi</span>
                           <span className="text-[10px] text-pink-400 font-mono font-bold">{stats.merchPoints.toLocaleString()}</span>
                        </div>
                      </div>
                  </div>
                  <div className="bg-neutral-900/60 border border-white/10 p-4 rounded-2xl text-center backdrop-blur-sm flex flex-col justify-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Barang Koleksi</p>
                      <p className="text-2xl font-black text-pink-500 font-mono tracking-tighter drop-shadow-lg">{stats.totalCollections}</p>
                  </div>
                </div>

                {topWaifus.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-3 flex items-center gap-2"><div className="w-1 h-3 bg-pink-500 rounded-full"></div> Main_Oshi</h3>
                    <div className="space-y-2">
                       {topWaifus.slice(0, 3).map((w, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-2 rounded-xl bg-black/40 border border-white/5 hover:bg-black/60 transition-all backdrop-blur-sm">
                             <img src={w.image_url} className="w-10 h-10 rounded-lg object-cover border border-white/10" alt={w.name} />
                             <div className="flex-1 min-w-0">
                                <h4 className="text-[10px] font-black text-white uppercase italic truncate">{w.name}</h4>
                                <div className="h-1 w-full bg-white/10 rounded-full mt-1.5"><div className="h-full rounded-full" style={{ width: '70%', backgroundColor: w.theme_color }}></div></div>
                             </div>
                             <p className="text-[10px] font-black font-mono text-slate-200">{w.points.toLocaleString()}</p>
                          </div>
                       ))}
                    </div>
                  </div>
                )}

                <div>
                   <div className="flex items-center gap-3 mb-3">
                      <span className="text-pink-500"><IconImage /></span>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Koleksi_Gallery</h3>
                      <div className="flex-1 h-px bg-white/10"></div>
                   </div>
                   <div className="grid grid-cols-4 gap-2">
                      {merchImages.length > 0 ? merchImages.map((url, idx) => (
                         <div key={idx} onClick={() => setSelectedImage(url)} className="aspect-square rounded-xl overflow-hidden border border-white/10 bg-black/50 cursor-zoom-in hover:scale-110 transition-transform">
                            <img src={url} className="w-full h-full object-cover" alt="merch" />
                         </div>
                      )) : <div className="col-span-4 text-center text-[9px] text-slate-500 italic py-4 border border-dashed border-white/10 rounded-xl">No Merch Captured</div>}
                   </div>
                </div>
            </div>
          ) : <div className="p-12 text-center text-red-400 font-black">PROFILE_NOT_FOUND</div>}
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedImage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedImage(null)} className="fixed inset-0 z-[1000] bg-black/95 flex items-center justify-center p-8 cursor-zoom-out">
            <motion.img initial={{ scale: 0.9 }} animate={{ scale: 1 }} src={selectedImage} className="max-w-full max-h-full rounded-3xl shadow-2xl border border-white/10" />
            <button className="absolute top-10 right-10 text-white text-3xl">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
      `}</style>
    </div>
  );
}