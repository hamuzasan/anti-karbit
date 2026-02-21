"use client";
import { useEffect, useState, use, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import QuizScreen from '@/components/QuizScreen';
import { useSearchParams, useRouter } from 'next/navigation';

export default function QuizPage({ params }: any) {
  const resolvedParams = use(params);
  const waifuId = (resolvedParams as any).id;
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const currentLevel = Number(searchParams.get('level')) || 1;

  const [waifu, setWaifu] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [score, setScore] = useState(0);
  const [pointsGained, setPointsGained] = useState(0); 
  const [userProgress, setUserProgress] = useState<any>(null);
  const [solvedIds, setSolvedIds] = useState<string[]>([]);
  const [newCorrectIds, setNewCorrectIds] = useState<string[]>([]);
  
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [isFinished, setIsFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Ref Lock agar tidak terjadi double save atau double answer
  const isProcessing = useRef(false);
  const hasSaved = useRef(false);

  // 1. FETCH DATA (Waifu, Questions, Progress, & Answered)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return router.push('/');

        const [wRes, qRes, pRes, sRes] = await Promise.all([
          supabase.from('waifus').select('*').eq('id', waifuId).single(),
          supabase.from('questions').select('*').eq('waifu_id', waifuId).eq('level', currentLevel),
          supabase.from('user_progress').select('*').eq('waifu_id', waifuId).eq('user_id', session.user.id).maybeSingle(),
          supabase.from('answered_questions').select('question_id').eq('user_id', session.user.id).eq('waifu_id', waifuId)
        ]);

        if (wRes.data) setWaifu(wRes.data);
        if (pRes.data) setUserProgress(pRes.data);
        if (sRes.data) setSolvedIds(sRes.data.map((d: any) => d.question_id));
        if (qRes.data && qRes.data.length > 0) {
          setQuestions(qRes.data.sort(() => Math.random() - 0.5));
        }
      } catch (err) { 
        console.error(err); 
      } finally { 
        setLoading(false); 
      }
    };
    if (waifuId) fetchData();
  }, [waifuId, currentLevel, router]);

  // 2. TIMER LOGIC
  useEffect(() => {
    if (loading || isFinished || questions.length === 0 || !questions[currentStep]) return;

    isProcessing.current = false;
    const currentQ = questions[currentStep];
    setTimeLeft(currentQ.duration || 15);
    setTimeElapsed(0);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!isProcessing.current) handleAnswer(null); 
          return 0;
        }
        return prev - 1;
      });
      setTimeElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [currentStep, questions, isFinished, loading]);

  // 3. HANDLE ANSWER (Logic Point Multiplier x1.5 Tetap Ada)
  const handleAnswer = (selectedOption: string | null) => {
    if (isProcessing.current || isFinished) return;
    isProcessing.current = true;

    const currentQ = questions[currentStep];
    if (!currentQ) return;

    if (selectedOption !== null && selectedOption === currentQ.correct_answer) {
      setScore(prev => prev + 1);
      
      // Jika soal ini belum pernah dijawab benar sebelumnya (Solved)
      if (!solvedIds.includes(currentQ.id) && !newCorrectIds.includes(currentQ.id)) {
        const totalDuration = currentQ.duration || 15;
        const basePoints = currentQ.points || 10;
        let finalPoints = basePoints;
        
        // Bonus 1.5x jika waktu tersisa > 50%
        if (timeLeft > (totalDuration / 2)) {
           finalPoints = Math.round(basePoints * 1.5);
        }

        setPointsGained(prev => prev + finalPoints);
        setNewCorrectIds(prev => [...prev, currentQ.id]);
      }
    }

    setTimeout(() => {
      if (currentStep + 1 < questions.length) {
        setCurrentStep(prev => prev + 1);
      } else {
        setIsFinished(true);
      }
    }, 100); 
  };

  // 4. SAVE PROGRESS KE SUPABASE
  const saveProgress = async () => {
    if (hasSaved.current) return;
    hasSaved.current = true;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const userId = session.user.id;

      // Simpan Log Soal Terjawab
      if (newCorrectIds.length > 0) {
        const answeredData = newCorrectIds.map(qId => ({
          user_id: userId,
          waifu_id: waifuId,
          question_id: qId
        }));
        
        await supabase
            .from('answered_questions')
            .upsert(answeredData, { onConflict: 'user_id,question_id' });
      }

      const prevQuizPoints = userProgress?.quiz_points || 0;
      const prevCollectionPoints = userProgress?.collection_points || 0;
      const currentHighestLevel = userProgress?.level_cleared || 0;
      
      const newQuizTotal = prevQuizPoints + pointsGained;
      const newLevel = Math.max(currentLevel, currentHighestLevel);

      // Update User Progress
      const { error: upsertError } = await supabase
        .from('user_progress')
        .upsert({
          user_id: userId,
          waifu_id: waifuId,
          level_cleared: newLevel,
          quiz_points: newQuizTotal,
          collection_points: prevCollectionPoints,
          total_points_accumulated: newQuizTotal + prevCollectionPoints
        }, { 
          onConflict: 'user_id,waifu_id' 
        });

      if (upsertError) throw upsertError;
      console.log("✅ PROGRESS SAVED.");
    } catch (err) {
      console.error("❌ SAVE ERROR:", JSON.stringify(err, null, 2));
    }
  };

  useEffect(() => {
    if (isFinished) {
      saveProgress();
    }
  }, [isFinished]);

  // --- 5. RESULT SCREEN (UI FINISHED) ---
// --- RESULT SCREEN (DIUBAH AGAR BISA SCROLL) ---
  if (isFinished) {
    const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    const accentColor = waifu?.theme_color || '#ec4899';
    
    let statusText = "TRAINING_COMPLETE";
    let statusColor = "text-slate-400";
    if (percentage === 100) { statusText = "PERFECT_SYNC"; statusColor = "text-yellow-500"; }
    else if (percentage >= 70) { statusText = "MISSION_PASSED"; statusColor = "text-green-500"; }
    else { statusText = "MISSION_COMPLETED"; statusColor = "text-slate-500"; }
    
    return (
      /* UBAH: overflow-hidden menjadi overflow-y-auto dan hapus items-center agar bisa scroll dari atas */
      <div className="min-h-[100dvh] w-full bg-[#050505] flex flex-col items-center p-6 font-sans overflow-y-auto relative no-scrollbar">
        
        {/* Dynamic Dark Background Image */}
        {waifu?.background_image && (
          <div className="absolute inset-0 z-0 pointer-events-none fixed">
            <img 
              src={waifu.background_image} 
              alt="background" 
              className="w-full h-full object-cover opacity-20 mix-blend-luminosity" 
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/40 via-[#050505]/80 to-[#050505]"></div>
          </div>
        )}
        
        {/* Konten Utama: Berikan margin top/bottom agar tidak nempel pojok saat scroll */}
        <div className="max-w-md w-full flex flex-col items-center animate-in fade-in zoom-in duration-700 relative z-10 my-auto py-10">
          
          <div className="mb-10 text-center">
             <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-4" />
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] mb-1">Session_Report</p>
             <h1 className="text-sm font-black text-white uppercase tracking-widest italic drop-shadow-md">{waifu?.name}</h1>
          </div>

          <div className="relative w-64 h-64 md:w-72 md:h-72 flex items-center justify-center mb-10 shrink-0">
            <svg className="w-full h-full transform -rotate-90 drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]">
              <circle cx="50%" cy="50%" r="40%" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
              <circle 
                cx="50%" cy="50%" r="40%" stroke="currentColor" strokeWidth="10" fill="transparent" 
                strokeDasharray="251.2%" 
                strokeDashoffset={`${251.2 - (251.2 * percentage) / 100}%`} 
                className="transition-all duration-1500 ease-out" 
                style={{ color: accentColor, strokeLinecap: 'round', filter: `drop-shadow(0 0 12px ${accentColor})` }} 
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-6xl md:text-7xl font-black text-white tracking-tighter drop-shadow-lg">{percentage}%</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Sync_Rate</span>
            </div>
          </div>

          <div className="w-full bg-[#111]/90 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/5 shadow-2xl relative mb-8">
            <div className="space-y-1 mb-6 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: accentColor }}>Points Acquired</p>
                <h3 className="text-4xl font-black text-white leading-tight drop-shadow-md">
                    +{pointsGained} <span className="text-sm text-slate-500">PTS</span>
                </h3>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-black/50 p-4 rounded-3xl border border-white/5 shadow-inner flex flex-col items-center text-center">
                    <p className="text-[8px] font-black text-slate-500 uppercase mb-1 tracking-widest">Accuracy</p>
                    <p className="text-xl font-black text-white">{score}<span className="text-slate-500 text-sm">/{questions.length}</span></p>
                </div>
                <div className="bg-black/50 p-4 rounded-3xl border border-white/5 shadow-inner flex flex-col items-center text-center justify-center">
                    <p className="text-[8px] font-black text-slate-500 uppercase mb-1 tracking-widest">Status</p>
                    <p className={`text-[9px] font-black uppercase ${statusColor} drop-shadow-md`}>
                        {statusText}
                    </p>
                </div>
            </div>

            <button 
              onClick={() => router.push(`/waifu-leaderboard/${waifuId}`)} 
              className="w-full py-3 bg-black/40 border border-white/10 text-slate-300 rounded-2xl font-black uppercase text-[9px] tracking-[0.2em] hover:bg-white/10 hover:text-white transition-all active:scale-95"
            >
              View Leaderboard
            </button>
          </div>

          <div className="w-full">
            <button onClick={() => router.push(`/waifu/${waifuId}`)} className="w-full py-5 bg-white text-black rounded-full font-black uppercase text-[11px] tracking-[0.3em] shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-[1.02] transition-all active:scale-95">
              Next Phase ➜
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- 6. QUIZ SCREEN RENDERING (FULLSCREEN) ---
  return (
    <div className="h-[100dvh] w-full bg-[#050505] relative overflow-hidden flex flex-col">
      {questions[currentStep] ? (
        <QuizScreen 
          waifu={waifu} 
          question={questions[currentStep]} 
          visual_assets={waifu?.visual_assets} 
          timeLeft={timeLeft} 
          timeElapsed={timeElapsed} 
          accentColor={waifu?.theme_color} 
          onAnswer={handleAnswer} 
          currentIndex={currentStep} 
          totalQuestions={questions.length} 
        />
      ) : (
        <div className="h-full flex flex-col items-center justify-center bg-[#050505] gap-4">
           {/* Loading State Imersif */}
           <div className="w-10 h-10 border-4 border-white/10 border-t-pink-500 rounded-full animate-spin"></div>
           <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Loading_Memory...</p>
        </div>
      )}
    </div>
  );
}