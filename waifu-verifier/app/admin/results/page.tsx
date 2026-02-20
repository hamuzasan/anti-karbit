"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminResults() {
  const [waifus, setWaifus] = useState<any[]>([]);
  const [selectedWaifuId, setSelectedWaifuId] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultData, setResultData] = useState<any>({
    rank_0_20: 'KARBIT UGLY BASTARD', msg_0_20: '',
    rank_21_40: 'KARBIT DEK', msg_21_40: '',
    rank_41_60: 'MASIH TEMENAN', msg_41_60: '',
    rank_61_80: 'PACAR', msg_61_80: '',
    rank_81_99: 'SUAMI UJI COBA', msg_81_99: '',
    rank_100: 'SUAMI SAH', msg_100: ''
  });

  useEffect(() => { fetchWaifus(); }, []);

  const fetchWaifus = async () => {
    const { data } = await supabase.from('waifus').select('*');
    if (data) setWaifus(data);
  };

  const fetchResultSettings = async (id: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('waifu_results')
      .select('*')
      .eq('waifu_id', id)
      .single();

    if (data) {
      setResultData(data);
    } else {
      // Jika belum ada, reset ke default
      const selected = waifus.find(w => w.id === id);
      setResultData({
        waifu_id: id,
        rank_0_20: 'KARBIT UGLY BASTARD',
        rank_21_40: 'KARBIT DEK',
        rank_41_60: 'MASIH TEMENAN',
        rank_61_80: `PACAR ${selected?.name.toUpperCase()}`,
        rank_81_99: `SUAMI UJI COBA ${selected?.name.toUpperCase()}`,
        rank_100: `SUAMI SAH ${selected?.name.toUpperCase()}`,
        msg_0_20: '', msg_21_40: '', msg_41_60: '', msg_61_80: '', msg_81_99: '', msg_100: ''
      });
    }
    setLoading(false);
  };

  const saveSettings = async () => {
    if (!selectedWaifuId) return alert("Pilih Waifu-nya dulu bos!");
    setLoading(true);
    
    // Upsert logic: Update jika ada, Insert jika tidak ada
    const { error } = await supabase
      .from('waifu_results')
      .upsert({ waifu_id: selectedWaifuId, ...resultData }, { onConflict: 'waifu_id' });

    if (error) alert(error.message);
    else alert("✅ Logika Rank Berhasil Disinkronkan!");
    setLoading(false);
  };

  const tiers = [
    { key: '0_20', label: 'Tier: < 20 Poin (Bad End)' },
    { key: '21_40', label: 'Tier: 21 - 40 Poin (Weak)' },
    { key: '41_60', label: 'Tier: 41 - 60 Poin (Average)' },
    { key: '61_80', label: 'Tier: 61 - 80 Poin (Strong Link)' },
    { key: '81_99', label: 'Tier: 81 - 99 Poin (Propose Phase)' },
    { key: '100', label: 'Tier: 100 Poin (True Ending)' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-8">
        
        {/* HEADER */}
        <div className="text-center">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Result_Logic_Matrix</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.5em] mt-2">Setting_Up_Your_Waifu_Personality</p>
        </div>

        <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl border border-white">
          {/* SELECTOR */}
          <div className="mb-10">
            <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-4 mb-2 block">Target Character</label>
            <select 
              className="w-full bg-slate-50 border-none p-5 rounded-2xl text-sm font-bold outline-none shadow-inner"
              value={selectedWaifuId}
              onChange={(e) => { setSelectedWaifuId(e.target.value); fetchResultSettings(e.target.value); }}
            >
              <option value="">-- PILIH KARAKTER UNTUK DIATUR --</option>
              {waifus.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>

          {selectedWaifuId && (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              <div className="grid grid-cols-1 gap-8">
                {tiers.map((tier) => (
                  <div key={tier.key} className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 relative group transition-all hover:bg-white hover:shadow-xl">
                    <div className="flex justify-between items-center mb-6">
                       <span className="px-4 py-1.5 bg-slate-900 text-white text-[9px] font-black rounded-full uppercase italic tracking-widest">{tier.label}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2">Rank Title</label>
                        <input 
                          className="w-full bg-white p-4 rounded-xl text-xs font-black shadow-sm outline-none border border-slate-100 focus:border-pink-300 transition-all"
                          value={resultData[`rank_${tier.key}`]}
                          onChange={(e) => setResultData({...resultData, [`rank_${tier.key}`]: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2">Waifu Message (Quotes)</label>
                        <textarea 
                          className="w-full bg-white p-4 rounded-xl text-xs font-bold shadow-sm outline-none border border-slate-100 focus:border-blue-300 transition-all h-20 resize-none"
                          placeholder="Ketik kata-kata mautnya di sini..."
                          value={resultData[`msg_${tier.key}`]}
                          onChange={(e) => setResultData({...resultData, [`msg_${tier.key}`]: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={saveSettings}
                disabled={loading}
                className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase text-xs tracking-[0.5em] shadow-2xl hover:bg-blue-600 transition-all active:scale-95 shadow-slate-200"
              >
                {loading ? 'Processing...' : 'SYNC_PERSONALITY_DATABASE'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}