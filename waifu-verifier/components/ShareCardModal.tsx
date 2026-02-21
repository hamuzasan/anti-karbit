"use client";
import { useRef, useState, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabase'; // PASTIKAN IMPORT SUPABASE INI ADA

// Pattern "Subtle Cubes" versi Base64 (Aman dari CORS)
const PATTERN_BG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzjwq1ev/s+IImZnZ4eoBwAwqhF7h9rM1gAAAABJRU5ErkJggg==";

export default function ShareCardModal({ isOpen, onClose, user, waifu, progress, rank, status }: any) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [isSharingFB, setIsSharingFB] = useState(false); // STATE BARU UNTUK FB
  const [isPortrait, setIsPortrait] = useState(false);
  
  // State Base64
  const [base64Images, setBase64Images] = useState({ bg: '', waifu: '', user: '' });
  const [isReady, setIsReady] = useState(false);

  // Data
  const referralLink = typeof window !== 'undefined' ? `${window.location.origin}/?ref=${user?.username}` : '';
  const accent = waifu?.theme_color || '#ec4899';
  const userName = user?.name || user?.username || 'ANONIM';
  
  // URL Gambar
  const bgUrl = waifu?.background_image || waifu?.image_url?.[0];
  const waifuUrl = waifu?.image_url?.[0];
  const userUrl = user?.avatar_url;
  const serialNumber = `${waifu?.id?.substring(0, 4)}-${user?.id?.substring(0, 4)}-${new Date().getFullYear()}`;

  // --- 1. CONVERT KE BASE64 (Supaya tidak kena CORS saat download) ---
  const convertToBase64 = async (url: string) => {
    if (!url) return '';
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Network response was not ok');
        const blob = await res.blob();
        return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn("Gagal load gambar:", url);
        return ''; 
    }
  };

  useEffect(() => {
    if (isOpen) {
        setIsReady(false);
        const prepareImages = async () => {
            const [bg, w, u] = await Promise.all([
                convertToBase64(bgUrl),
                convertToBase64(waifuUrl),
                convertToBase64(userUrl)
            ]);
            setBase64Images({ bg, waifu: w, user: u });
            setIsReady(true);
        };
        prepareImages();
    }
  }, [isOpen, bgUrl, waifuUrl, userUrl]);


  // --- 2. FUNGSI DOWNLOAD ---
  const handleDownload = async () => {
    if (!cardRef.current || !isReady) return;
    setLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      const dataUrl = await toPng(cardRef.current, {
        cacheBust: false,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        skipFonts: true,
      });
      
      const link = document.createElement('a');
      const orientation = isPortrait ? 'PORTRAIT' : 'LANDSCAPE';
      const coupleName = `${waifu.name.split(' ')[0]}_x_${userName.split(' ')[0]}`;
      link.download = `KTP_${orientation}_${coupleName.toUpperCase()}.png`;
      link.href = dataUrl;
      link.click();

    } catch (err: any) {
      console.error("Error Detail:", err);
      alert("Gagal menyimpan. Coba refresh halaman.");
    } finally {
      setLoading(false);
    }
  };

  // --- 3. FUNGSI SHARE FACEBOOK (DIPERBAIKI) ---
  const handleShareFB = async () => {
    if (!cardRef.current || !isReady) return;
    setIsSharingFB(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      // 1. Buat gambar pakai toPng (Sama persis seperti fitur Download)
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: false,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        skipFonts: true,
      });

      // 2. Ubah base64 dataUrl menjadi File Blob
      const blob = await (await fetch(dataUrl)).blob();

      // 3. Generate nama unik & Upload ke Supabase
      const uniqueId = `card_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const fileName = `${uniqueId}.png`;

      const { error } = await supabase.storage
        .from('share-cards')
        .upload(fileName, blob, { contentType: 'image/png' });

      if (error) throw error;

      // 4. DAPATKAN PUBLIC URL DARI GAMBAR YANG BARU DIUPLOAD
      // Ini kunci agar Facebook bisa menampilkan preview gambar kartunya
      const { data: publicUrlData } = supabase.storage
        .from('share-cards')
        .getPublicUrl(fileName);
        
      const shareUrl = publicUrlData.publicUrl;

      // 5. Buka Dialog Share Facebook dengan link gambar tersebut
      const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
      
      window.open(fbShareUrl, 'facebook-share-dialog', 'width=600,height=400');

    } catch (err: any) {
      console.error("Error Share FB:", err);
      alert("Gagal memproses share Facebook: " + err.message);
    } finally {
      setIsSharingFB(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
      <div className={`w-full transition-all duration-300 flex flex-col items-center ${isPortrait ? 'max-w-sm' : 'max-w-xl'}`}>
        
        {/* --- AREA KARTU --- */}
        <div 
            ref={cardRef} 
            className={`relative w-full bg-slate-50 overflow-hidden shadow-2xl text-slate-900 border-[6px] border-double transition-all duration-500 ${isPortrait ? 'aspect-[9/16] rounded-[2rem]' : 'aspect-[1.58/1] rounded-2xl'}`}
            style={{ borderColor: accent, backgroundColor: '#f8fafc' }}
        >
            {/* 1. BACKGROUND LAYER */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `url(${PATTERN_BG})` }}></div>
                {base64Images.bg && (
                    <div className="absolute inset-0 opacity-[0.15] mix-blend-multiply pointer-events-none">
                        <img src={base64Images.bg} className="w-full h-full object-cover grayscale" alt="" />
                    </div>
                )}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(255,255,255,0.95))' }}></div>
            </div>

            {/* 2. HEADER RESMI */}
            <div className="absolute top-0 left-0 w-full z-20 h-16 flex items-center justify-between px-6 border-b-2 border-slate-200" style={{ background: `linear-gradient(90deg, ${accent}20, transparent)` }}>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-xs border border-white">PAK</div>
                    <div>
                        <h2 className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-500">PERSATUAN ANTI KARBIT</h2>
                        <h1 className="text-sm font-black uppercase tracking-tighter leading-none" style={{ color: accent }}>KARTU TANDA SETIA</h1>
                    </div>
                </div>
                {!isPortrait && (
                    <div className="text-right">
                        <p className="text-[8px] font-bold text-slate-400">SERI</p>
                        <p className="text-[10px] font-mono font-black">{serialNumber}</p>
                    </div>
                )}
            </div>

            {/* 3. KONTEN UTAMA */}
            <div className="relative z-10 w-full h-full pt-16 pb-4">
            
                {/* === LAYOUT HORIZONTAL (LANDSCAPE) === */}
                {!isPortrait && (
                    <div className="p-6 flex gap-6 h-full items-center">
                        <div className="w-1/3 flex flex-col items-center justify-center relative">
                            <div className="w-20 h-20 rounded-full border-4 shadow-lg overflow-hidden relative z-20 bg-white" style={{ borderColor: accent }}>
                                {base64Images.waifu ? <img src={base64Images.waifu} className="w-full h-full object-cover" alt="" /> : <div className="bg-slate-200 w-full h-full"/>}
                            </div>
                            
                            <div className="h-8 w-1 -my-1 relative z-10" style={{ background: 'linear-gradient(to bottom, #f472b6, #db2777)' }}></div>
                            <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 text-pink-500 text-xl z-30 drop-shadow-md animate-pulse">❤️</div>
                            
                            <div className="w-16 h-16 rounded-full border-4 border-slate-200 shadow-lg overflow-hidden relative z-20 bg-slate-100">
                                {base64Images.user ? <img src={base64Images.user} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-xl">👤</div>}
                            </div>
                            
                            <div className="mt-2 px-3 py-1 shadow-lg rounded-full text-white text-[8px] font-black tracking-widest uppercase shadow-md" style={{ backgroundColor: accent }}>
                               <p className="shadow-lg">Berlaku Seumur Hidup</p>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col justify-center space-y-2">
                            <div className="border-b border-slate-200 pb-1">
                                <p className="text-[8px] font-bold text-slate-400 uppercase">NAMA LENGKAP</p>
                                <p className="text-xl font-black text-slate-900 tracking-tight truncate">{userName}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase">STATUS</p>
                                    <p className="text-xs font-black uppercase px-2 py-0.5 rounded bg-slate-100 w-fit mt-0.5" style={{ color: accent }}>{status?.title}</p>
                                </div>
                                <div>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase">PASANGAN</p>
                                    <p className="text-xs font-black text-slate-800 uppercase mt-0.5 truncate">{waifu.name}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 p-2 rounded-lg border border-slate-100" style={{ backgroundColor: 'rgba(248,250,252, 0.8)' }}>
                                 <div><p className="text-[8px] font-bold text-slate-400">RANK</p><span className="text-sm font-black text-slate-900">#{rank || '-'}</span></div>
                                 <div><p className="text-[8px] font-bold text-slate-400">POIN</p><span className="text-sm font-black text-slate-900">{progress?.total_points_accumulated || 0}</span></div>
                            </div>
                            <div className="flex items-center justify-between mt-auto pt-2">
                                <div className="text-[9px] text-slate-500 leading-tight font-medium italic pr-2">
                                    Dengan ini menyatakan kesetiaan mutlak kepada <span className="font-bold text-slate-800 not-italic">{waifu.name}</span>.
                                </div>
                                <div className="bg-white p-1 rounded border border-slate-200 shadow-sm shrink-0">
                                    <QRCodeSVG value={referralLink} size={38} fgColor="#1e293b" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* === LAYOUT VERTIKAL (PORTRAIT - STORY MODE) === */}
                {isPortrait && (
                    <div className="p-6 h-full flex flex-col justify-between items-center text-center">
                        <div className="flex flex-col items-center w-full mt-4">
                            <div className="flex items-center justify-center gap-4 mb-6 w-full relative">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-1 bg-slate-200 -z-10"></div>
                                <div className="w-24 h-24 rounded-full border-[5px] shadow-2xl overflow-hidden bg-white relative z-10" style={{ borderColor: accent }}>
                                    {base64Images.waifu ? <img src={base64Images.waifu} className="w-full h-full object-cover" alt="" /> : <div className="bg-slate-200 w-full h-full"/>}
                                </div>
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-2xl shadow-lg border-2 border-slate-100 z-20 animate-pulse">❤️</div>
                                <div className="w-20 h-20 rounded-full border-[4px] border-slate-200 shadow-xl overflow-hidden bg-slate-100 relative z-10">
                                    {base64Images.user ? <img src={base64Images.user} className="w-full h-full object-cover" alt="" /> : <div className="flex items-center justify-center w-full h-full">👤</div>}
                                </div>
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none px-2 mb-2">
                                {waifu.name.split(' ')[0]} <span style={{ color: accent }} className="font-serif italic text-3xl mx-1">&</span> {userName.split(' ')[0]}
                            </h2>
                            <div className="inline-block px-4 py-1 rounded-full text-[10px] font-black tracking-[0.2em] uppercase text-white shadow-md mb-2" style={{ backgroundColor: accent }}>
                                {status?.title}
                            </div>
                        </div>

                        <div className="w-full space-y-4">
                             <div className="flex justify-center gap-4 w-full p-4 rounded-2xl border border-slate-200 shadow-sm" style={{ backgroundColor: 'rgba(241,245,249,0.7)' }}>
                                 <div className="text-center flex-1">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">RANKING</p>
                                    <p className="text-3xl font-black text-slate-900 leading-none mt-1">#{rank}</p>
                                 </div>
                                 <div className="w-px bg-slate-300"></div>
                                 <div className="text-center flex-1">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">POIN CINTA</p>
                                    <p className="text-3xl font-black text-slate-900 leading-none mt-1">{progress?.total_points_accumulated}</p>
                                 </div>
                             </div>
                             <div className="w-full bg-slate-900 text-white p-3 rounded-xl shadow-lg flex items-center justify-between px-6 border-2 border-white/20">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">MASA BERLAKU</span>
                                <span className="text-sm font-black uppercase tracking-[0.2em] text-yellow-400 animate-pulse">SEUMUR HIDUP</span>
                             </div>
                        </div>

                        <div className="w-full pt-4 border-t-2 border-dashed border-slate-300 flex items-center justify-between gap-4 text-left">
                            <div>
                                <div className="text-[11px] text-slate-600 leading-snug font-bold italic mb-1">
                                     Dengan ini menyatakan kesetiaan mutlak kepada <span className="font-bold text-slate-800 not-italic">{waifu.name}</span>.
                                </div>
                                <p className="text-[8px] font-mono text-slate-400 font-bold tracking-widest uppercase">ID: {serialNumber}</p>
                            </div>
                            <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-md shrink-0">
                                <QRCodeSVG value={referralLink} size={50} fgColor="#1e293b" />
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <div className="absolute bottom-0 left-0 w-full h-3" style={{ backgroundColor: accent }}></div>
        </div>

        {/* --- NAVIGASI MODE --- */}
        <div className="flex bg-neutral-900/50 backdrop-blur-md p-1.5 rounded-2xl mt-6 border border-white/10 w-full shadow-2xl relative z-50">
            <button onClick={() => setIsPortrait(false)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!isPortrait ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white'}`}>
                💳 Horizontal
            </button>
            <button onClick={() => setIsPortrait(true)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isPortrait ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white'}`}>
                📱 Vertikal
            </button>
        </div>

        {/* --- TOMBOL AKSI --- */}
        <div className="mt-4 flex gap-2 md:gap-3 w-full">
            <button onClick={onClose} className="flex-[0.8] py-4 bg-neutral-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-neutral-700 transition-colors">
                Tutup
            </button>
            
            <button 
                onClick={handleDownload}
                disabled={!isReady || loading || isSharingFB}
                className="flex-[1.2] py-4 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: accent }}
            >
                {loading ? 'MEMPROSES...' : !isReady ? 'MEMUAT...' : '💾 SIMPAN'}
            </button>

            {/* Tombol Share FB */}
            <button 
                onClick={handleShareFB}
                disabled={!isReady || loading || isSharingFB}
                className="flex-[1.2] py-4 bg-[#1877F2]/10 hover:bg-[#1877F2] text-[#1877F2] hover:text-white border border-[#1877F2]/30 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 group"
            >
                {isSharingFB ? 'MENGUNGGAH...' : (
                    <>
                        <svg className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" viewBox="0 0 320 512">
                            <path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z"/>
                        </svg>
                        SHARE FB
                    </>
                )}
            </button>
        </div>

      </div>
    </div>
  );
}