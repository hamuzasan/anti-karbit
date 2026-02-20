"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation'; // TAMBAHAN PENTING
import QuizScreen from '@/components/QuizScreen';
import Link from 'next/link';

// ... (CONST SLOTS & LEVEL_LABELS SAMA SEPERTI SEBELUMNYA)
const SLOTS = [
  "Slot 1: Di Atas Timer", 
  "Slot 2: Di Atas Soal", 
  "Slot 3: Background", 
  "Slot 4: Opsi B", 
  "Slot 5: Opsi C", 
  "Slot 6: Opsi D"
];

export default function AdminQuestions() {
  const params = useParams(); // 1. TANGKAP ID DARI URL
  const router = useRouter();
  
  // Ambil ID waifu dari URL (pastikan nama folder [id] sesuai di struktur folder nextjs kamu)
  // Jika link kamu /questions/[id]/cards, maka params.id berisi ID waifu
  const waifuIdFromUrl = params?.id as string; 

  // --- STATE ---
  const [activeTab, setActiveTab] = useState<'soal' | 'aset'>('soal');
  const [soalMode, setSoalMode] = useState<'tambah' | 'daftar' | 'banyak'>('tambah');
  const [waifus, setWaifus] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | 'main' | null>(null);

  const [questionData, setQuestionData] = useState({
    id: null as string | null,
    waifu_id: waifuIdFromUrl || '', // Set default langsung dari URL
    question_text: '', image_url: '',
    option_a: '', option_b: '', option_c: '', option_d: '',
    correct_answer: 'A', duration: 15,
    level: 1, points: 10 
  });

  const [bulkQuestions, setBulkQuestions] = useState<any[]>([]);

  const [visualAssets, setVisualAssets] = useState<any[]>(
    Array(6).fill(null).map(() => ({ 
      url: '', startTime: 0, endTime: 5, width: 60,
      marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0
    }))
  );

  // --- INITIALIZE DATA ---
  useEffect(() => {
    fetchWaifus();
    if (waifuIdFromUrl) {
      // Jika ada ID di URL, langsung load data soal & aset
      loadWaifuData(waifuIdFromUrl);
    }
  }, [waifuIdFromUrl]);

  const fetchWaifus = async () => {
    const { data } = await supabase.from('waifus').select('*');
    if (data) setWaifus(data);
  };

  // Fungsi wrapper untuk load semua data waifu terpilih
  const loadWaifuData = async (id: string) => {
    setLoading(true);
    // 1. Fetch Soal
    const { data: qData } = await supabase
      .from('questions')
      .select('*')
      .eq('waifu_id', id)
      .order('level', { ascending: true }) 
      .order('created_at', { ascending: false });
    if (qData) setQuestions(qData);

    // 2. Fetch Aset Visual (dari tabel waifus)
    const { data: wData } = await supabase.from('waifus').select('visual_assets').eq('id', id).single();
    
    if (wData?.visual_assets && Array.isArray(wData.visual_assets)) {
      // Mapping agar aman jika data lama kurang lengkap
      const synced = Array(6).fill(null).map((_, idx) => {
        const existing = wData.visual_assets[idx] || {};
        return {
          url: existing.url || '',
          startTime: existing.startTime || 0,
          endTime: existing.endTime || 5,
          width: existing.width || 60,
          marginTop: existing.marginTop || 0,
          marginBottom: existing.marginBottom || 0,
          marginLeft: existing.marginLeft || 0,
          marginRight: existing.marginRight || 0,
        };
      });
      setVisualAssets(synced);
    }

    // Reset form bulk
    setBulkQuestions([{
        waifu_id: id, question_text: '', option_a: '', option_b: '', option_c: '', option_d: '',
        correct_answer: 'A', duration: 15, level: 1, points: 10
    }]);

    setLoading(false);
  };

  // Helper untuk reset form single
  const resetForm = () => {
    setQuestionData(prev => ({
      id: null, waifu_id: prev.waifu_id, question_text: '', image_url: '',
      option_a: '', option_b: '', option_c: '', option_d: '',
      correct_answer: 'A', duration: 15, level: 1, points: 10
    }));
  };

  // --- UPLOAD & ASSET HANDLERS (Sama seperti sebelumnya) ---
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number | 'main') => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      setUploadingIdx(index);
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `assets-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('waifu-images').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('waifu-images').getPublicUrl(fileName);
      
      if (index === 'main') {
        setQuestionData(prev => ({ ...prev, image_url: data.publicUrl }));
      } else {
        const up = [...visualAssets];
        up[index] = { ...up[index], url: data.publicUrl };
        setVisualAssets(up);
      }
    } catch (error: any) { alert("Upload Gagal: " + error.message); } 
    finally { setUploadingIdx(null); }
  };

  const removeImage = (index: number | 'main') => {
    if (index === 'main') setQuestionData({...questionData, image_url: ''});
    else {
      const up = [...visualAssets];
      up[index] = { ...up[index], url: '' };
      setVisualAssets(up);
    }
  };

  const updateVisualAsset = (index: number, field: string, value: number) => {
    const up = [...visualAssets];
    up[index] = { ...up[index], [field]: value };
    setVisualAssets(up);
  };

  // --- CRUD ACTIONS ---
  const saveQuestion = async () => {
    if (!questionData.waifu_id) return alert("System Error: No Waifu ID Found");
    setLoading(true);
    const { id, ...payload } = questionData;
    try {
      if (id) await supabase.from('questions').update(payload).eq('id', id);
      else await supabase.from('questions').insert([payload]);
      
      alert(id ? "✅ Soal Updated!" : "✅ Soal Created!");
      if (!id) resetForm();
      loadWaifuData(questionData.waifu_id); // Refresh list
    } catch (error: any) { alert("Error: " + error.message); } 
    finally { setLoading(false); }
  };

  const handleBulkSave = async () => {
    if (bulkQuestions.length === 0) return;
    setLoading(true);
    const { error } = await supabase.from('questions').insert(bulkQuestions);
    if (error) alert(error.message);
    else {
      alert(`✅ ${bulkQuestions.length} Soal Ditambahkan!`);
      setSoalMode('daftar');
      loadWaifuData(questionData.waifu_id);
    }
    setLoading(false);
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm("Hapus soal ini?")) return;
    await supabase.from('questions').delete().eq('id', id);
    loadWaifuData(questionData.waifu_id);
  };

  const saveWaifuAssets = async () => {
    setLoading(true);
    const { error } = await supabase.from('waifus').update({ visual_assets: visualAssets }).eq('id', questionData.waifu_id);
    setLoading(false);
    if (error) alert("Gagal: " + error.message);
    else alert("✅ Visual Assets Configured!");
  };

  const shuffleQuestions = () => {
    if (questions.length < 2) return;
    const shuffled = [...questions];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setQuestions(shuffled);
  };

  // --- CARI WAIFU YG SEDANG AKTIF UTK DITAMPILKAN ---
  const currentWaifu = waifus.find(w => w.id === waifuIdFromUrl);

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 md:p-10 font-mono flex flex-col lg:flex-row gap-10 items-start">
      
      {/* KOLOM KIRI: FORM */}
      <div className="w-full lg:w-2/3 space-y-8">
        
        {/* HEADER AREA */}
        <div className="flex justify-between items-center border-b border-pink-900 pb-4">
            <h2 className="text-3xl font-black text-pink-500 tracking-tighter uppercase italic">
                &gt; CONFIG_PROTOCOL_V2
            </h2>
            <button 
                onClick={() => router.back()} 
                className="text-[10px] font-bold bg-neutral-900 border border-neutral-700 px-4 py-2 rounded-full hover:bg-pink-600 transition-all"
            >
                EXIT_TO_SELECTION
            </button>
        </div>

        {/* TABS UTAMA */}
        <div className="flex bg-black border border-neutral-800 p-2 rounded-2xl shadow-2xl">
          <button onClick={() => setActiveTab('soal')} className={`flex-1 py-4 rounded-xl text-xs font-black tracking-widest uppercase transition-all duration-300 ${activeTab === 'soal' ? 'bg-pink-600 text-white shadow-lg' : 'text-neutral-600 hover:bg-neutral-900'}`}>01. QUESTION_DATABASE</button>
          <button onClick={() => setActiveTab('aset')} className={`flex-1 py-4 rounded-xl text-xs font-black tracking-widest uppercase transition-all duration-300 ${activeTab === 'aset' ? 'bg-blue-600 text-white shadow-lg' : 'text-neutral-600 hover:bg-neutral-900'}`}>02. GLOBAL_SPRITE_REGISTRY</button>
        </div>

        <div className="bg-neutral-900/50 p-8 md:p-10 rounded-[3rem] border border-neutral-800 space-y-10 relative overflow-hidden shadow-inner">
          
          {/* --- INFO SUBJEK (READ ONLY SEKARANG) --- */}
          <div className="flex items-center gap-6 p-6 bg-black border border-neutral-800 rounded-3xl relative overflow-hidden group">
            {currentWaifu ? (
                <>
                    <img src={Array.isArray(currentWaifu.image_url) ? currentWaifu.image_url[0] : currentWaifu.image_url} className="w-20 h-20 rounded-2xl object-cover border border-neutral-700" />
                    <div>
                        <p className="text-[10px] text-pink-500 uppercase tracking-widest font-black mb-1">Target_Subject_Locked</p>
                        <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">{currentWaifu.name}</h3>
                        <p className="text-[10px] text-neutral-500 font-bold uppercase">{currentWaifu.series}</p>
                    </div>
                    <div className="absolute right-6 top-6 opacity-20 group-hover:opacity-50 transition-all">
                        <span className="text-6xl text-neutral-700">🔒</span>
                    </div>
                </>
            ) : (
                <div className="animate-pulse text-neutral-500 text-sm font-black uppercase">Retrieving Subject Data...</div>
            )}
          </div>

          {activeTab === 'soal' ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* SUB-MODES TABS */}
              <div className="flex gap-2 p-1 bg-black rounded-xl border border-neutral-800 shadow-inner">
                <button onClick={() => setSoalMode('tambah')} className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase transition-all ${soalMode === 'tambah' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-600 hover:text-neutral-400'}`}>SINGLE_ADD</button>
                <button onClick={() => setSoalMode('daftar')} className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase transition-all ${soalMode === 'daftar' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-600 hover:text-neutral-400'}`}>REGISTRY_VIEW</button>
                <button onClick={() => setSoalMode('banyak')} className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase transition-all ${soalMode === 'banyak' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-600 hover:text-neutral-400'}`}>BULK_INJECTOR</button>
              </div>

              {soalMode === 'tambah' && (
                <div className="space-y-8">
                  {/* LEVEL & POINTS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-black border border-neutral-800 p-6 rounded-3xl">
                        <label className="text-[10px] font-black text-pink-500 uppercase tracking-widest block mb-4 italic">Difficulty_Tier</label>
                        <select 
                          className="w-full bg-neutral-900 border border-neutral-700 text-white p-4 rounded-xl text-xs font-black outline-none focus:border-pink-500"
                          value={questionData.level}
                          onChange={(e) => setQuestionData({...questionData, level: Number(e.target.value)})}
                        >
                          <option value={1}>Tier 1: Karbit Test</option>
                          <option value={2}>Tier 2: Normal Weebs</option>
                          <option value={3}>Tier 3: Hardcore Simp</option>
                          <option value={4}>Tier 4: Soul Link (Mythic)</option>
                        </select>
                    </div>
                    <div className="bg-black border border-neutral-800 p-6 rounded-3xl flex items-center justify-between">
                        <div>
                            <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1 italic">Value_Pts</label>
                            <p className="text-[9px] text-neutral-600 uppercase font-black">Success Reward</p>
                        </div>
                        <input type="number" className="w-24 bg-neutral-900 border border-neutral-700 p-4 rounded-xl text-center font-black text-blue-400 text-lg outline-none" value={questionData.points} onChange={(e) => setQuestionData({...questionData, points: Number(e.target.value)})} />
                    </div>
                  </div>

                  {/* SOAL INPUT */}
                  <div className="space-y-3">
                    <label className="block text-[11px] text-gray-500 tracking-widest uppercase font-black ml-1">Question_Data_Buffer</label>
                    <textarea className="w-full bg-black border border-neutral-700 p-6 rounded-3xl text-sm h-40 focus:border-pink-500 outline-none transition-all text-white leading-relaxed resize-none" placeholder="Write question content..." value={questionData.question_text} onChange={(e)=>setQuestionData({...questionData, question_text: e.target.value})} />
                  </div>

                  {/* IMAGE UPLOAD SOAL */}
                  <div className="relative border-2 border-dashed border-neutral-800 bg-black/40 p-10 rounded-[3rem] text-center hover:border-pink-500 transition-all cursor-pointer group">
                      {questionData.image_url ? (
                        <div className="flex flex-col items-center gap-6 animate-in zoom-in-95">
                          <img src={questionData.image_url} className="w-48 h-48 rounded-3xl object-contain shadow-2xl border border-neutral-700 p-2 bg-black" />
                          <button onClick={() => removeImage('main')} className="bg-red-900/20 text-red-500 px-8 py-3 rounded-full text-[10px] font-black uppercase border border-red-900/50 hover:bg-red-600 hover:text-white transition-all">REMOVE IMAGE</button>
                        </div>
                      ) : (
                        <div className="py-6">
                          <div className="w-12 h-12 bg-neutral-900 rounded-2xl flex items-center justify-center border border-neutral-800 mx-auto mb-4 text-neutral-600 font-black">+</div>
                          <p className="text-[11px] text-neutral-500 uppercase font-black tracking-[0.3em] group-hover:text-neutral-300">Push_image_hint.vpk</p>
                          <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e)=>handleUpload(e, 'main')} />
                        </div>
                      )}
                  </div>

                  {/* OPSI JAWABAN */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {['a','b','c','d'].map(o => (
                      <div key={o} className="relative space-y-2">
                          <label className="block text-[10px] text-neutral-600 font-black uppercase tracking-widest ml-1">Option_{o}</label>
                          <input className="w-full bg-black border border-neutral-700 p-5 rounded-2xl text-xs font-black focus:border-pink-500 outline-none text-neutral-300 transition-all" value={(questionData as any)[`option_${o}`]} onChange={(e)=>setQuestionData({...questionData, [`option_${o}`]: e.target.value})} />
                      </div>
                    ))}
                  </div>

                  {/* KUNCI JAWABAN & DURASI */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center pt-6">
                    <div className="bg-black border border-neutral-800 p-6 rounded-[2.5rem] space-y-4">
                      <label className="text-[10px] font-black text-pink-500 uppercase tracking-widest italic block ml-2">Final_Key_Solution</label>
                      <div className="flex gap-2">
                        {['A','B','C','D'].map(k => (
                          <button key={k} onClick={()=>setQuestionData({...questionData, correct_answer: k})} className={`flex-1 py-5 rounded-2xl font-black transition-all border ${questionData.correct_answer === k ? 'bg-pink-600 border-pink-400 text-white shadow-lg shadow-pink-900/50 scale-105' : 'bg-neutral-900 border-neutral-800 text-neutral-600 hover:border-neutral-500'}`}>{k}</button>
                        ))}
                      </div>
                    </div>
                    <div className="bg-black border border-neutral-800 p-6 rounded-[2.5rem] flex items-center justify-between">
                        <div className="ml-2">
                            <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest italic block">Process_Time</label>
                            <p className="text-[9px] text-neutral-600 font-black uppercase">Auto Timeout</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <input type="number" className="w-24 bg-neutral-900 border border-neutral-700 p-4 rounded-2xl text-center font-black text-blue-400 outline-none text-lg" value={questionData.duration} onChange={(e) => setQuestionData({...questionData, duration: Number(e.target.value)})} />
                            <span className="text-[10px] font-black text-neutral-600">S</span>
                        </div>
                    </div>
                  </div>

                  <button onClick={saveQuestion} disabled={loading} className="w-full bg-pink-600 hover:bg-pink-500 text-white py-8 rounded-[2.5rem] font-black uppercase tracking-[0.5em] text-sm shadow-2xl shadow-pink-900/40 transition-all active:scale-95">
                    {questionData.id ? "UPDATE_DATA_PACK" : "COMMIT_ENTRY_TO_CORE"}
                  </button>
                </div>
              )}

              {soalMode === 'daftar' && (
                <div className="space-y-6 max-h-[800px] overflow-y-auto no-scrollbar pt-2 pr-2">
                  <div className="flex justify-between items-center mb-6 border-b border-neutral-800 pb-6 px-2">
                    <h3 className="text-xs font-black uppercase text-neutral-500 tracking-[0.4em]">REGISTRY_LOG: {questions.length}_ENTRY</h3>
                    <button onClick={shuffleQuestions} disabled={questions.length < 2} className="bg-neutral-900 border border-neutral-800 px-6 py-3 rounded-full text-[10px] font-black uppercase hover:border-pink-500 transition-all text-neutral-400 hover:text-pink-500">🎲 SHUFFLE</button>
                  </div>
                  {questions.map((q, idx) => (
                    <div key={q.id} className="p-8 bg-black border border-neutral-800 rounded-[2.5rem] flex gap-8 items-start relative group hover:border-neutral-500 transition-all overflow-hidden animate-in fade-in slide-in-from-left-4 duration-300">
                      <span className="absolute -right-6 -bottom-8 text-[120px] font-black text-neutral-900 pointer-events-none italic opacity-40 select-none tracking-tighter">{idx + 1}</span>
                      <div className="flex-1 min-w-0 relative z-10">
                        <div className="flex gap-3 mb-4">
                           <span className={`text-[9px] font-black px-4 py-1.5 rounded-full text-white ${q.level === 4 ? 'bg-purple-600' : q.level === 3 ? 'bg-red-600' : q.level === 2 ? 'bg-blue-600' : 'bg-neutral-700'}`}>TIER_{q.level}</span>
                           <span className="text-[9px] font-black px-4 py-1.5 rounded-full bg-yellow-500 text-black">+{q.points}_PTS</span>
                        </div>
                        <p className="text-base font-bold text-neutral-300 leading-relaxed mb-6">{q.question_text}</p>
                        <div className="flex gap-4">
                           <span className="text-[10px] font-black bg-neutral-900 text-pink-500 border border-pink-900/30 px-4 py-2 rounded-xl uppercase tracking-widest">KEY: {q.correct_answer}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 relative z-10">
                        <button onClick={() => { setQuestionData(q); setSoalMode('tambah'); }} className="w-14 h-14 bg-blue-600/10 text-blue-400 border border-blue-900/50 rounded-2xl text-[10px] font-black flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all">EDIT</button>
                        <button onClick={() => deleteQuestion(q.id)} className="w-14 h-14 bg-red-600/10 text-red-500 border border-red-900/50 rounded-2xl text-[10px] font-black flex items-center justify-center hover:bg-red-600 hover:text-white transition-all">DEL</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {soalMode === 'banyak' && (
                <div className="space-y-8 pt-2">
                   {/* BULK UPLOAD MODE SAMA SEPERTI KODE SEBELUMNYA */}
                   <div className="flex justify-between items-center bg-black border border-neutral-800 p-6 rounded-3xl shadow-inner">
                        <p className="text-[11px] font-black text-neutral-500 uppercase tracking-[0.3em] italic">Buffer_Queue: {bulkQuestions.length}_ENTRIES</p>
                        <button onClick={() => setBulkQuestions([...bulkQuestions, { waifu_id: waifuIdFromUrl, question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A', duration: 15, level: 1, points: 10 }])} className="text-[11px] font-black text-blue-400 bg-blue-900/20 border border-blue-900/50 px-6 py-3 rounded-2xl hover:bg-blue-600 hover:text-white transition-all">＋ ADD_ROW</button>
                   </div>
                   <div className="max-h-[600px] overflow-y-auto no-scrollbar space-y-10 px-2">
                        {bulkQuestions.map((q, idx) => (
                             <div key={idx} className="p-10 bg-black border border-neutral-800 rounded-[3rem] space-y-8 shadow-2xl relative group hover:border-neutral-600 transition-all">
                                <div className="flex flex-wrap gap-6 items-center border-b border-neutral-900 pb-6">
                                    <span className="text-2xl font-black text-pink-600 italic">#{idx + 1}</span>
                                    {/* ... Form Bulk ... */}
                                    <textarea className="w-full bg-neutral-900/40 border border-neutral-800 p-6 rounded-3xl text-sm font-bold text-neutral-200 outline-none h-28 resize-none focus:border-neutral-500 transition-all" value={q.question_text} onChange={(e) => { const up = [...bulkQuestions]; up[idx].question_text = e.target.value; setBulkQuestions(up); }} placeholder="Question content..." />
                                    {/* ... Sisanya sama ... */}
                                </div>
                             </div>
                        ))}
                   </div>
                   <button onClick={handleBulkSave} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-8 rounded-[2.5rem] font-black uppercase text-sm tracking-[0.5em] shadow-2xl shadow-blue-900/40 transition-all active:scale-[0.98]">INJECT_ALL</button>
                </div>
              )}
            </div>
          ) : (
            /* TAB 02: GLOBAL SPRITE REGISTRY */
            <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
              <div className="grid grid-cols-1 gap-10 max-h-[850px] overflow-y-auto pr-3 no-scrollbar">
                {SLOTS.map((label, idx) => {
                  const asset = visualAssets[idx];
                  return (
                    <div key={idx} className="p-10 bg-black border border-neutral-800 rounded-[3.5rem] relative group hover:border-blue-500 transition-all duration-300 shadow-2xl">
                      <div className="flex justify-between items-center mb-8 px-2">
                        <p className="text-[12px] font-black text-blue-400 uppercase italic tracking-[0.3em]">{label}</p>
                        {asset?.url && <button onClick={() => removeImage(idx)} className="text-[10px] font-black text-red-500 border border-red-900/40 px-6 py-2 rounded-full uppercase hover:bg-red-600 hover:text-white transition-all">TERMINATE</button>}
                      </div>
                      
                      {asset?.url ? (
                        <div className="flex items-center gap-8 p-8 bg-neutral-900 rounded-[2.5rem] mb-10 border border-neutral-800">
                          <img src={asset.url} className="w-32 h-32 object-contain bg-black rounded-3xl p-4 border border-neutral-800 shadow-2xl" />
                          <div className="flex-1">
                             <label className="text-[9px] font-black text-neutral-600 uppercase mb-2 block tracking-widest">CORE_ASSET_ID</label>
                             <p className="text-[11px] font-bold text-blue-400 truncate bg-black p-4 rounded-xl border border-neutral-800 font-mono italic">{asset.url.split('/').pop()}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="relative h-28 bg-black border-2 border-dashed border-neutral-800 rounded-[2.5rem] flex items-center justify-center mb-10 hover:border-blue-500 transition-all cursor-pointer group">
                           <p className="text-[11px] font-black text-neutral-600 uppercase tracking-widest group-hover:text-neutral-400">UPLOAD_SPRITE_PACK.png</p>
                           <input type="file" onChange={(e)=>handleUpload(e, idx)} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                      )}

{/* --- SLIDER CONTROLS LENGKAP (SCALE & POSISI) --- */}
                      <div className="bg-black border border-neutral-900 p-8 rounded-[2.5rem] shadow-inner mt-8">
                        
                        {/* 1. SCALE / UKURAN */}
                        <div className="mb-8">
                           <div className="flex justify-between items-center mb-4 px-1">
                              <label className="text-[10px] font-black text-pink-500 uppercase italic tracking-widest">Sprite_Scale_Factor</label>
                              <p className="text-xl font-black text-white">{asset.width || 60}<span className="text-[10px] text-neutral-600 ml-2">PX</span></p>
                           </div>
                           <input 
                              type="range" min="10" max="500" step="1" 
                              className="w-full accent-pink-500 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer" 
                              value={asset.width || 60} 
                              onChange={(e)=>updateVisualAsset(idx, 'width', Number(e.target.value))} 
                           />
                        </div>

                        {/* 2. POSISI / MARGINS (GRID 2 KOLOM) */}
                        <div className="grid grid-cols-2 gap-x-8 gap-y-6 pt-8 border-t border-neutral-800/50">
                            
                            {/* Margin Top */}
                            <div>
                                <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest block mb-3">Margin_Top (Y+)</label>
                                <input 
                                    type="range" min="-200" max="200" 
                                    className="w-full accent-blue-500 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                                    value={asset.marginTop || 0} 
                                    onChange={(e) => updateVisualAsset(idx, 'marginTop', Number(e.target.value))} 
                                />
                            </div>

                            {/* Margin Bottom */}
                            <div>
                                <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest block mb-3">Margin_Bottom (Y-)</label>
                                <input 
                                    type="range" min="-200" max="200" 
                                    className="w-full accent-blue-500 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                                    value={asset.marginBottom || 0} 
                                    onChange={(e) => updateVisualAsset(idx, 'marginBottom', Number(e.target.value))} 
                                />
                            </div>

                            {/* Margin Left */}
                            <div>
                                <label className="text-[9px] font-black text-green-400 uppercase tracking-widest block mb-3">Margin_Left (X-)</label>
                                <input 
                                    type="range" min="-200" max="200" 
                                    className="w-full accent-green-500 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                                    value={asset.marginLeft || 0} 
                                    onChange={(e) => updateVisualAsset(idx, 'marginLeft', Number(e.target.value))} 
                                />
                            </div>

                            {/* Margin Right */}
                            <div>
                                <label className="text-[9px] font-black text-green-400 uppercase tracking-widest block mb-3">Margin_Right (X+)</label>
                                <input 
                                    type="range" min="-200" max="200" 
                                    className="w-full accent-green-500 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                                    value={asset.marginRight || 0} 
                                    onChange={(e) => updateVisualAsset(idx, 'marginRight', Number(e.target.value))} 
                                />
                            </div>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
              
              <button onClick={saveWaifuAssets} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-8 rounded-[2.5rem] font-black uppercase text-sm tracking-[0.5em] shadow-2xl shadow-blue-900/40 transition-all active:scale-[0.98]">COMMIT_SPRITE_REGISTRY_TO_CORE</button>
            </div>
          )}
        </div>
      </div>

      {/* --- KOLOM KANAN: ULTRA-REALISTIC PREVIEW --- */}
      <div className="w-full lg:w-1/3 flex flex-col items-center">
        <div className="sticky top-10 w-full flex flex-col items-center animate-in fade-in duration-1000">
            <h3 className="text-[11px] font-black text-neutral-700 uppercase tracking-[0.6em] mb-8 italic">&gt; LIVE_HOLOGRAPH_PREVIEW</h3>
            
            {/* Phone Body Container */}
            <div className="relative w-full max-w-[340px] aspect-[9/19.5] bg-black rounded-[4.5rem] p-4 shadow-[0_0_100px_-20px_rgba(236,72,153,0.15)] border-[10px] border-neutral-900 overflow-visible transition-all duration-700 group hover:scale-[1.02] ring-1 ring-white/5">
              
              {/* Hardware Buttons Logic */}
              <div className="absolute top-28 -left-[12px] w-[4px] h-16 bg-neutral-800 rounded-l-md shadow-sm" />
              <div className="absolute top-48 -left-[12px] w-[4px] h-16 bg-neutral-800 rounded-l-md shadow-sm" />
              <div className="absolute top-36 -right-[12px] w-[4px] h-28 bg-neutral-800 rounded-r-md shadow-sm" />

              {/* Internal Screen */}
              <div className="w-full h-full bg-white rounded-[3.2rem] overflow-hidden relative shadow-2xl">
                
                {/* Dynamic Island Detail */}
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-[100] flex items-center justify-center gap-1.5 px-3">
                   <div className="w-2.5 h-2.5 rounded-full bg-neutral-900 ring-2 ring-neutral-800/50" />
                   <div className="flex-1 h-1.5 bg-neutral-900 rounded-full opacity-30" />
                </div>

                <QuizScreen 
                  waifu={currentWaifu} 
                  question={questionData} 
                  visual_assets={visualAssets} 
                  timeLeft={questionData.duration} 
                  timeElapsed={0} 
                  isCMS={true} 
                  currentIndex={questions.indexOf(questions.find(q => q.id === questionData.id)) !== -1 ? questions.indexOf(questions.find(q => q.id === questionData.id)) : 0}
                  totalQuestions={questions.length || 1}
                />
              </div>
            </div>

            <div className="mt-12 flex flex-col items-center gap-3">
              <div className="flex items-center gap-3 bg-neutral-900/50 px-6 py-2 rounded-full border border-neutral-800">
                 <div className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
                 <p className="text-[11px] font-black text-pink-500 uppercase tracking-[0.4em] italic">SYNC_ACTIVE</p>
              </div>
              <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest italic opacity-50 font-mono underline decoration-neutral-800 underline-offset-4">Aspect: 19.5:9 | Scale: 1.0X</p>
            </div>
        </div>
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        /* Modern Scrollbar for List & Bulk */
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #050505; }
        ::-webkit-scrollbar-thumb { background: #262626; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #ec4899; }

        /* Modern Range Input Style */
        input[type=range] { -webkit-appearance: none; }
        input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none;
            height: 18px; width: 18px;
            border-radius: 50%;
            background: #fff;
            cursor: pointer;
            box-shadow: 0 0 15px rgba(0,0,0,0.5), 0 0 5px currentColor;
            margin-top: -6px;
        }
        input[type=range]::-webkit-slider-runnable-track {
            width: 100%; height: 6px;
            background: #111;
            border-radius: 10px;
            border: 1px solid #222;
        }
      `}</style>
    </div>
  );
}