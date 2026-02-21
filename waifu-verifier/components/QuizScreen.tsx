"use client";
import { useRef, useEffect, useState } from 'react';

export default function QuizScreen({ 
  waifu, 
  question, 
  visual_assets, 
  timeLeft, 
  timeElapsed = 0, 
  accentColor = "#ec4899", // Default pink-ish for VN vibe
  onAnswer = () => {},
  currentIndex = 0,
  totalQuestions = 5
}: any) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 500);
    return () => clearTimeout(timer);
  }, [currentIndex]);

  if (!question) return null;

  const radius = 24; // Diperkecil agar lebih elegan untuk HUD
  const circumference = 2 * Math.PI * radius;
  const duration = question?.duration || 15;
  const offset = circumference - (timeLeft / duration) * circumference;
  const isCritical = timeLeft <= 3 && timeLeft > 0;

  const getAssetData = (index: number) => {
    const asset = visual_assets?.[index];
    if (!asset || !asset.url) return null;
    if (timeElapsed >= asset.startTime && timeElapsed < asset.endTime) return asset;
    return null;
  };

  const getAssetStyle = (asset: any) => ({
    width: `${asset.width || 60}px`,
    marginTop: `${asset.marginTop || 0}px`,
    marginBottom: `${asset.marginBottom || 0}px`,
    marginLeft: `${asset.marginLeft || 0}px`,
    marginRight: `${asset.marginRight || 0}px`,
    position: 'absolute' as const,
    zIndex: 100, 
    pointerEvents: 'none' as const, 
  });

  return (
    <div className={`relative w-full h-full flex flex-col font-sans transition-colors duration-500 overflow-hidden ${isCritical ? 'bg-red-950' : 'bg-[#050505]'}`}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes chibiFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }
        .vn-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        .chibi-anim { animation: chibiFloat 3.5s infinite ease-in-out; }
        .shake-effect { animation: shake 0.2s infinite; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}} />

      {/* --- 1. SCENE BACKGROUND (CG) --- */}
      {/* Gambar soal diubah menjadi background ala Visual Novel */}
      {question?.image_url && (
        <div className="absolute top-0 left-0 w-full h-[60%] z-0 pointer-events-none">
          <img 
            src={question.image_url} 
            className="w-full h-full object-cover opacity-60 mix-blend-luminosity" 
            alt="Scene CG"
          />
          {/* Gradient penutup agar gambar menyatu mulus dengan layar bawah yang gelap */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/80 to-[#050505]"></div>
        </div>
      )}

      {/* --- 2. GAME HUD (Top Bar) --- */}
      <div className="relative z-[60] w-full pt-8 px-6 pb-2">
        {/* Top Progress Line */}
        <div className="absolute top-0 left-0 w-full flex h-1">
          {Array.from({ length: totalQuestions }).map((_, i) => (
            <div key={i} className="flex-1 transition-all duration-700 border-r border-black/50" 
                 style={{ backgroundColor: i <= currentIndex ? accentColor : '#1f2937' }} />
          ))}
        </div>

        <div className="flex justify-between items-start mt-2">
          {/* Chapter / Phase Info */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: isCritical ? '#ef4444' : accentColor }}></span>
               <p className={`text-[9px] font-black tracking-[0.3em] uppercase ${isCritical ? 'text-red-500' : 'text-slate-400'}`}>
                 {isCritical ? 'CRITICAL PHASE' : 'MEMORY LINK'}
               </p>
            </div>
            <h2 className="text-3xl font-black italic tracking-tighter text-white drop-shadow-lg opacity-80 mt-1">
              CH. {String(currentIndex + 1).padStart(2, '0')}
            </h2>
          </div>

          {/* Sci-Fi VN Timer */}
          <div className={`relative w-16 h-16 flex items-center justify-center ${isCritical ? 'shake-effect' : ''}`}>
            <svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r={radius} stroke="#1f2937" strokeWidth="6" fill="transparent" />
              <circle cx="50" cy="50" r={radius} stroke={isCritical ? '#ef4444' : accentColor} strokeWidth="6" fill="transparent" 
                strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-linear" 
                style={{ filter: `drop-shadow(0 0 4px ${isCritical ? '#ef4444' : accentColor})` }}
              />
            </svg>
            <span className={`font-black text-xl z-10 ${isCritical ? 'text-red-500' : 'text-white'}`}>
              {timeLeft}
            </span>
          </div>
        </div>
      </div>

      {/* Ruang kosong fleksibel untuk Sprite / Karakter berdiri */}
      <div className="flex-1 w-full relative z-10 pointer-events-none"></div>

      {/* --- 3. VISUAL NOVEL DIALOGUE & CHOICES AREA --- */}
      <div ref={scrollRef} className={`relative z-40 w-full flex flex-col justify-end px-4 pb-8 overflow-y-auto no-scrollbar transition-all ${isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0 vn-fade-in'}`}>
        
        {/* VN Dialogue Box (Teks Soal) */}
        <div className="relative w-full bg-black/70 backdrop-blur-md border border-white/10 rounded-xl p-5 pt-7 mb-6 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
          {/* Speaker Name Tag */}
<div 
  className="absolute -top-2 left-4 px-4 py-1.5 text-[10px] leading-none font-black text-white uppercase tracking-widest skew-x-[-12deg] shadow-lg"
  style={{ backgroundColor: accentColor }}
>
  <span className="block skew-x-[12deg] leading-none">
    {waifu?.name || 'SYSTEM'}
  </span>
</div>

          <p className="text-sm md:text-base font-medium text-slate-200 leading-relaxed italic">
            "{question?.question_text}"
          </p>
        </div>

        {/* VN Choice Branches (Opsi Jawaban) */}
        <div className="flex flex-col gap-3">
          {['A', 'B', 'C', 'D'].map((opt) => (
            <button 
              key={opt} 
              onClick={() => onAnswer(opt)} 
              className="group relative w-full flex items-center p-4 bg-black/50 backdrop-blur-sm border border-white/10 hover:border-white/40 active:scale-[0.98] transition-all text-left overflow-hidden rounded-lg"
            >
              {/* Highlight gradient on hover */}
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300" 
                style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }}
              ></div>
              
              <span 
                className="text-[10px] font-black text-slate-500 mr-4 w-6 text-center group-hover:text-white transition-colors"
              >
                {opt}
              </span>
              <p className="text-[13px] font-bold text-slate-300 group-hover:text-white flex-1 leading-tight relative z-10">
                {question?.[`option_${opt.toLowerCase()}`]}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* --- 4. SPRITE LAYER (z-index 100 sesuai request) --- */}
      <div className="absolute inset-0 pointer-events-none z-[100]">
        {[0, 1, 2, 3, 4, 5].map((idx) => {
          const asset = getAssetData(idx);
          if (!asset) return null;
          return (
            <img 
              key={`sprite-${idx}-${currentIndex}`}
              src={asset.url} 
              style={getAssetStyle(asset)}
              className={`transition-opacity duration-500 ${asset.isBackground ? 'opacity-10 grayscale mix-blend-screen' : 'chibi-anim'} ${idx === 3 ? 'bottom-0 right-0' : ''}`} 
            />
          );
        })}
      </div>

    </div>
  );
}