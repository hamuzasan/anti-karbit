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
  
  // Ref Lock
  const isProcessing = useRef(false);
  const hasSaved = useRef(false);

  // 1. FETCH DATA
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
      } catch (err) { console.error(err); } 
      finally { setLoading(false); }
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

  // 3. HANDLE ANSWER
  const handleAnswer = (selectedOption: string | null) => {
    if (isProcessing.current || isFinished) return;
    isProcessing.current = true;

    const currentQ = questions[currentStep];
    if (!currentQ) return;

    if (selectedOption !== null && selectedOption === currentQ.correct_answer) {
      setScore(prev => prev + 1);
      
      if (!solvedIds.includes(currentQ.id) && !newCorrectIds.includes(currentQ.id)) {
        const totalDuration = currentQ.duration || 15;
        const basePoints = currentQ.points || 10;
        let finalPoints = basePoints;
        
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

  // 4. SAVE PROGRESS (STRICT SESUAI SQL SCHEMAMU)
  const saveProgress = async () => {
    if (hasSaved.current) return;
    hasSaved.current = true;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const userId = session.user.id;

      // A. Simpan Soal Terjawab
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

      // B. Hitung Poin (Hanya kolom yang ada di SQL: quiz_points, collection_points, total_points_accumulated, level_cleared)
      const prevQuizPoints = userProgress?.quiz_points || 0;
      const prevCollectionPoints = userProgress?.collection_points || 0;
      const currentHighestLevel = userProgress?.level_cleared || 0;
      
      const newQuizTotal = prevQuizPoints + pointsGained;
      const newLevel = Math.max(currentLevel, currentHighestLevel);

      // C. Update Database (BUANG JAUH-JAUH UPDATED_AT)
      const { error: upsertError } = await supabase
        .from('user_progress')
        .upsert({
          user_id: userId,
          waifu_id: waifuId,
          level_cleared: newLevel,
          quiz_points: newQuizTotal,
          collection_points: prevCollectionPoints,
          total_points_accumulated: newQuizTotal + prevCollectionPoints
          // TIDAK ADA UPDATED_AT DI SINI
        }, { 
          onConflict: 'user_id,waifu_id' 
        });

      if (upsertError) throw upsertError;

      console.log("✅ PROGRESS SAVED. Clean from hallucinations.");

    } catch (err) {
      console.error("❌ SAVE ERROR:", JSON.stringify(err, null, 2));
    }
  };

  useEffect(() => {
    if (isFinished) {
      saveProgress();
    }
  }, [isFinished]);

  // --- RESULT SCREEN ---
  if (isFinished) {
    const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    const accentColor = waifu?.theme_color || '#ec4899';
    
    let statusText = "TRAINING_COMPLETE";
    let statusColor = "text-slate-400";
    if (percentage === 100) { statusText = "PERFECT_SYNC"; statusColor = "text-yellow-500"; }
    else if (percentage >= 70) { statusText = "MISSION_PASSED"; statusColor = "text-green-500"; }
    else { statusText = "MISSION_COMPLETED"; statusColor = "text-slate-500"; }
    
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full flex flex-col items-center animate-in fade-in zoom-in duration-700">
          
          <div className="mb-10 text-center">
             <div className="w-12 h-1 bg-pink-100 rounded-full mx-auto mb-4" />
             <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em] mb-1">Session_Report</p>
             <h1 className="text-xs font-black text-slate-400 uppercase tracking-widest italic">{waifu?.name}</h1>
          </div>

          <div className="relative w-72 h-72 flex items-center justify-center mb-12">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="144" cy="144" r="120" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-50" />
              <circle 
                cx="144" cy="144" r="120" stroke="currentColor" strokeWidth="12" fill="transparent" 
                strokeDasharray={754} 
                strokeDashoffset={754 - (754 * percentage) / 100} 
                className="transition-all duration-1000 ease-out" 
                style={{ color: accentColor, strokeLinecap: 'round' }} 
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-7xl font-black text-slate-900 tracking-tighter">{percentage}%</span>
              <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] mt-1">Completion_Rate</span>
            </div>
          </div>

          <div className="w-full bg-slate-50 rounded-[3rem] p-8 border border-white shadow-xl relative mb-8">
            <div className="absolute -top-12 -right-4 w-28 h-28 drop-shadow-2xl">
                <img src={waifu?.image_url?.[0]} className="w-full h-full object-contain rounded-2xl animate-bounce" />
            </div>
            
            <div className="space-y-1 mb-6">
                <p className="text-[9px] font-black text-pink-400 uppercase tracking-widest">Points Acquired:</p>
                <h3 className="text-3xl font-black text-slate-900 leading-tight">
                    +{pointsGained} <span className="text-xs text-slate-400">PTS</span>
                </h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                    <p className="text-[8px] font-black text-slate-300 uppercase mb-1">Total_Benar</p>
                    <p className="text-2xl font-black text-slate-800">{score}/{questions.length}</p>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                    <p className="text-[8px] font-black text-slate-300 uppercase mb-1">Quest_Status</p>
                    <p className={`text-[10px] font-black uppercase ${statusColor}`}>
                        {statusText}
                    </p>
                </div>
            </div>
          </div>

          <button onClick={() => router.push(`/waifu/${waifuId}`)} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-[0.4em] shadow-2xl hover:bg-pink-600 transition-all">
            Next Quest ➜
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full h-[750px] shadow-2xl rounded-[3.5rem] overflow-hidden border-[10px] border-white bg-white relative">
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
          <div className="h-full flex flex-col items-center justify-center bg-slate-50 gap-4">
             <div className="w-10 h-10 border-4 border-slate-200 border-t-pink-500 rounded-full animate-spin"></div>
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading_Quest...</p>
          </div>
        )}
      </div>
    </div>
  );
}