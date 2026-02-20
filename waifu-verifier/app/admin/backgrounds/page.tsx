"use client";
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function BackgroundSelectionList() {
  const [waifus, setWaifus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // 1. Menggunakan logika fetch yang sama dengan 'ManageWaifus'
  useEffect(() => {
    fetchWaifus();
  }, []);

  const fetchWaifus = async () => {
    // Kita ambil semua (*) agar tidak ada kolom yang tertinggal/error
    const { data, error } = await supabase
      .from('waifus')
      .select('*')
      .order('name', { ascending: true }); // Tetap urut nama agar mudah dicari

    if (error) {
        console.error("Error fetching data:", error);
        alert("Gagal memuat data: " + error.message);
    } 
    
    if (data) {
        setWaifus(data);
    }
    setLoading(false);
  };

  // 2. Menggunakan useMemo untuk filtering (Optimasi seperti referensi)
  const filteredWaifus = useMemo(() => {
    return waifus.filter((waifu) => {
        const lowerSearch = search.toLowerCase();
        return (
            waifu.name.toLowerCase().includes(lowerSearch) || 
            waifu.series.toLowerCase().includes(lowerSearch)
        );
    });
  }, [waifus, search]);

  if (loading) return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center font-mono text-purple-500 animate-pulse tracking-widest">
      LOADING_DATABASE_ASSETS...
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 md:p-10 font-mono">
      
      {/* HEADER */}
      <div className="max-w-6xl mx-auto mb-10 border-b border-neutral-800 pb-6 flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
            <Link href="/admin" className="text-xs text-gray-500 hover:text-white mb-2 block uppercase font-bold">← Back to Dashboard</Link>
            <h1 className="text-3xl md:text-4xl font-black text-purple-500 tracking-tighter italic uppercase">
              VISUAL_CONFIG_HUB
            </h1>
            <p className="text-xs text-gray-400 mt-2 uppercase tracking-widest">
              Select a target to modify background environment
            </p>
        </div>

        {/* SEARCH BAR */}
        <div className="w-full md:w-1/3">
            <input 
                type="text" 
                placeholder="SEARCH_TARGET..." 
                className="w-full bg-neutral-900 border border-neutral-700 p-3 rounded-xl focus:border-purple-500 outline-none transition-all text-sm uppercase placeholder:text-neutral-600"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
        </div>
      </div>

      {/* GRID LIST */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredWaifus.map((waifu) => {
            // LOGIC PENTING: Cek apakah image_url array atau string (seperti di referensi)
            const displayImg = Array.isArray(waifu.image_url) 
                ? waifu.image_url[0] 
                : (waifu.image_url || '/placeholder.png');

            const hasBg = !!waifu.background_image;

            return (
                <Link 
                    key={waifu.id} 
                    href={`/admin/waifus/${waifu.id}/background`}
                    className="group relative bg-neutral-900/40 border border-neutral-800 p-4 rounded-2xl hover:bg-neutral-900 hover:border-purple-500 transition-all flex items-center gap-4 overflow-hidden"
                >
                    {/* Avatar Thumbnail */}
                    <div className="relative w-16 h-16 flex-shrink-0">
                        <img 
                            src={displayImg} 
                            alt={waifu.name} 
                            className="w-full h-full object-cover rounded-xl border border-neutral-700 group-hover:border-purple-500 transition-colors"
                        />
                        {/* Status Dot */}
                        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-neutral-900 ${hasBg ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-neutral-600'}`}></div>
                    </div>

                    {/* Text Info */}
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold truncate group-hover:text-purple-400 transition-colors uppercase italic tracking-tight">
                            {waifu.name}
                        </h3>
                        <p className="text-[10px] text-gray-500 truncate uppercase tracking-widest font-bold">
                            {waifu.series}
                        </p>
                        
                        {/* Status Text Indicator */}
                        <div className="mt-2 flex items-center gap-2">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-wider ${
                                hasBg 
                                ? 'border-green-900 bg-green-900/20 text-green-400' 
                                : 'border-neutral-700 bg-neutral-800 text-neutral-500'
                            }`}>
                                {hasBg ? 'CUSTOM_BG_ACTIVE' : 'NO_BACKGROUND'}
                            </span>
                        </div>
                    </div>

                    {/* Arrow Icon */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity -translate-x-4 group-hover:translate-x-0 duration-300">
                        <span className="text-purple-500 text-xl">➜</span>
                    </div>

                    {/* Decorative Hover Line */}
                    <div className="absolute bottom-0 left-0 h-1 bg-purple-500 w-0 group-hover:w-full transition-all duration-500"></div>
                </Link>
            );
        })}

        {filteredWaifus.length === 0 && (
            <div className="col-span-full py-20 text-center text-gray-600 uppercase tracking-widest font-bold">
                NO_DATA_MATCHED_QUERY
            </div>
        )}
      </div>

    </div>
  );
}