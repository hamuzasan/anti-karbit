"use client";
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function AdminCardSelection() {
  const [waifus, setWaifus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 1. Ambil State Search & Filter dari ManageWaifus
  const [searchQuery, setSearchQuery] = useState(''); 
  const [selectedSeries, setSelectedSeries] = useState('All');

  useEffect(() => {
    fetchWaifus();
  }, []);

  const fetchWaifus = async () => {
    const { data, error } = await supabase
      .from('waifus')
      .select('id, name, image_url, series, theme_color') // Ambil field yg butuh aja
      .order('created_at', { ascending: false });
      
    if (error) console.error("Error fetching data:", error);
    if (data) setWaifus(data);
    setLoading(false);
  };

  // 2. Logic Series (Sama persis dengan ManageWaifus)
  const existingSeries = useMemo(() => {
    const series = waifus.map(w => w.series);
    return ['All', ...Array.from(new Set(series))].sort();
  }, [waifus]);

  // 3. Logic Filter (Sama persis dengan ManageWaifus)
  const filteredWaifus = useMemo(() => {
    return waifus.filter((waifu) => {
      const matchesSearch = waifu.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (waifu.series && waifu.series.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesSeries = selectedSeries === 'All' || waifu.series === selectedSeries;
      return matchesSearch && matchesSeries;
    });
  }, [waifus, searchQuery, selectedSeries]);

  if (loading) return <div className="p-10 text-white font-mono animate-pulse text-center mt-20 tracking-widest uppercase">Initializing_Visual_Config...</div>;

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 md:p-10 font-mono">
      <div className="max-w-6xl mx-auto">
        
        {/* --- HEADER (Style ManageWaifus) --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-pink-900/50 pb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-pink-500 tracking-tighter uppercase">&gt; CARD_VISUAL_CONFIG</h1>
            <p className="text-[10px] text-gray-500 mt-1 tracking-widest uppercase">Select Subject to Edit Backgrounds</p>
          </div>
          <Link href="/admin" className="text-[10px] font-bold bg-neutral-900 hover:bg-pink-600 px-6 py-2 rounded-full transition-all border border-neutral-700">
            BACK_TO_DASHBOARD
          </Link>
        </div>

        {/* --- SEARCH BAR (Copy-Paste dari ManageWaifus) --- */}
        <div className="relative group mb-4">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-600 group-focus-within:text-pink-500 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          <input 
            type="text" 
            placeholder="Search Subject..." 
            className="w-full bg-black border border-neutral-800 p-3 pl-10 rounded-xl focus:border-pink-500 outline-none transition-all text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* --- DYNAMIC SERIES CHIPS (Copy-Paste dari ManageWaifus) --- */}
        <div className="flex gap-2 mb-8 overflow-x-auto no-scrollbar pb-2">
          {existingSeries.map((series) => (
            <button
              key={series}
              onClick={() => setSelectedSeries(series)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-lg text-[9px] font-bold border transition-all uppercase tracking-tighter ${
                selectedSeries === series 
                ? 'bg-pink-600 border-pink-500 text-white shadow-[0_0_10px_rgba(236,72,153,0.3)]' 
                : 'bg-neutral-900 border-neutral-800 text-gray-500 hover:text-gray-300'
              }`}
            >
              {series}
            </button>
          ))}
        </div>

        {/* --- GRID LIST (Tampilan Card untuk memilih) --- */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredWaifus.map((waifu) => {
                const displayImg = Array.isArray(waifu.image_url) ? waifu.image_url[0] : waifu.image_url;
                
                return (
                  <Link 
                    key={waifu.id} 
                    // LINK INI PENTING: Menuju halaman edit card spesifik
                    href={`/admin/questions/${waifu.id}/`}
                    className="group relative h-64 rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900 hover:border-pink-500 transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(236,72,153,0.2)]"
                  >
                    {/* Background Image (Foto Waifu) */}
                    <div className="absolute inset-0">
                        <img 
                            src={displayImg} 
                            className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity duration-500" 
                            alt={waifu.name}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent"></div>
                    </div>

                    {/* Nama Waifu & Status */}
                    <div className="absolute bottom-0 left-0 p-4 w-full">
                        <p className="text-[9px] text-pink-500 font-bold uppercase tracking-widest mb-1">
                            {waifu.series}
                        </p>
                        <h3 className="text-xl font-black italic uppercase tracking-tighter truncate text-white group-hover:text-pink-200">
                            {waifu.name}
                        </h3>
                        
                        <div className="mt-2 inline-block border border-pink-500/30 bg-pink-500/10 px-2 py-1 rounded text-[8px] font-bold text-pink-400 uppercase tracking-widest">
                            OPEN_CONFIG &gt;
                        </div>
                    </div>
                  </Link>
                );
            })}
        </div>

        {/* Empty State */}
        {filteredWaifus.length === 0 && (
          <div className="p-20 text-center text-gray-600 text-xs tracking-widest uppercase border border-dashed border-neutral-800 rounded-xl mt-4">
              No subjects found match your query.
          </div>
        )}

      </div>
    </div>
  );
}