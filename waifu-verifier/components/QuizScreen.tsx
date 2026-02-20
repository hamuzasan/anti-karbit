"use client";
import { useRef, useEffect, useState } from 'react';

export default function QuizScreen({ 
  waifu, 
  question, 
  visual_assets, 
  timeLeft, 
  timeElapsed = 0, 
  accentColor = "#3b82f6",
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

  const radius = 32; 
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
    // KUNCINYA DI SINI: Naikkan Z-Index ke 100 agar di atas segalanya
    zIndex: 100, 
    pointerEvents: 'none' as const, // Agar tidak menghalangi klik pada tombol soal
  });

  return (
    <div className={`relative w-full h-full flex flex-col font-sans transition-colors duration-500 overflow-hidden ${isCritical ? 'bg-red-50' : 'bg-slate-50'}`}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes chibiFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
        .animate-in { animation: slideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .chibi-anim { animation: chibiFloat 3s infinite ease-in-out; }
        .shake-effect { animation: shake 0.15s infinite; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}} />

      {/* 1. HUD HEADER (z-index tetap tinggi) */}
      <div className="relative z-[60] w-full p-6 pt-10 bg-white/70 backdrop-blur-md border-b border-slate-100">
        <div className="flex gap-1.5 mb-6">
          {Array.from({ length: totalQuestions }).map((_, i) => (
            <div key={i} className="h-1.5 flex-1 rounded-full transition-all duration-700" 
                 style={{ backgroundColor: i <= currentIndex ? accentColor : '#f1f5f9' }} />
          ))}
        </div>
        <div className="flex justify-between items-center">
          <div>
            <p className={`text-[9px] font-black tracking-widest mb-1 ${isCritical ? 'text-red-500 italic' : 'text-slate-400'}`}>
              {isCritical ? '⚠️ ALERT_TIME_LOW' : 'PHASE_VERIFICATION'}
            </p>
            <h2 className="text-5xl font-black italic tracking-tighter" style={{ color: accentColor }}>
              {String(currentIndex + 1).padStart(2, '0')}
            </h2>
          </div>
          <div className={`relative w-24 h-24 ${isCritical ? 'shake-effect' : ''}`}>
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r={radius} stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
              <circle cx="50" cy="50" r={radius} stroke={isCritical ? '#ef4444' : accentColor} strokeWidth="8" fill="transparent" 
                strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-linear" />
            </svg>
            <div className={`absolute inset-0 flex items-center justify-center font-black text-2xl ${isCritical ? 'text-red-600 animate-pulse' : 'text-slate-800'}`}>
              {timeLeft}
            </div>
          </div>
        </div>
      </div>

      {/* 2. CONTENT AREA (z-index rendah agar tertutup sprite jika bertabrakan) */}
      <div ref={scrollRef} className={`flex-1 overflow-y-auto no-scrollbar relative z-10 px-6 pt-8 pb-10 transition-all ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100 animate-in'}`}>
        {question?.image_url && (
          <div className="w-full flex justify-center mb-8">
            <img src={question.image_url} className="max-h-[240px] w-auto max-w-full object-contain rounded-[2rem] border-[6px] border-white shadow-2xl bg-slate-100" />
          </div>
        )}
        <h3 className="text-xl font-bold text-slate-800 text-center mb-10 leading-snug">{question?.question_text}</h3>
        <div className="flex flex-col gap-3">
          {['A', 'B', 'C', 'D'].map((opt) => (
            <button key={opt} onClick={() => onAnswer(opt)} className="group w-full flex items-center p-5 rounded-[1.8rem] border-2 border-white bg-white/80 shadow-sm hover:bg-white active:scale-[0.97] transition-all text-left">
              <span className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mr-4 font-black text-xs text-slate-400 group-hover:text-white transition-colors">{opt}</span>
              <p className="text-[14px] font-bold text-slate-600 flex-1 leading-tight">{question?.[`option_${opt.toLowerCase()}`]}</p>
              <style dangerouslySetInnerHTML={{ __html: `.group:hover span { background-color: ${accentColor} !important; }` }} />
            </button>
          ))}
        </div>
      </div>

      {/* 3. SPRITE LAYER (Diletakkan terakhir dengan z-index tertinggi) */}
      <div className="absolute inset-0 pointer-events-none z-[100]">
        {[0, 1, 2, 3, 4, 5].map((idx) => {
          const asset = getAssetData(idx);
          if (!asset) return null;
          return (
            <img 
              key={`sprite-${idx}-${currentIndex}`}
              src={asset.url} 
              style={getAssetStyle(asset)}
              className={`transition-opacity duration-500 ${asset.isBackground ? 'opacity-10 grayscale' : 'chibi-anim'} ${idx === 3 ? 'bottom-0 right-0' : ''}`} 
            />
          );
        })}
      </div>

    </div>
  );
}