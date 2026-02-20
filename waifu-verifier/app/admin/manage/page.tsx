"use client";
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function ManageWaifus() {
  const [waifus, setWaifus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(''); 
  const [selectedSeries, setSelectedSeries] = useState('All');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchWaifus();
  }, []);

  const fetchWaifus = async () => {
    const { data, error } = await supabase
      .from('waifus')
      .select('*')
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false });
      
    if (error) console.error("Error fetching data:", error);
    if (data) setWaifus(data);
    setLoading(false);
  };

  const existingSeries = useMemo(() => {
    const series = waifus.map(w => w.series);
    return ['All', ...Array.from(new Set(series))].sort();
  }, [waifus]);

  const filteredWaifus = useMemo(() => {
    return waifus.filter((waifu) => {
      const matchesSearch = waifu.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            waifu.series.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSeries = selectedSeries === 'All' || waifu.series === selectedSeries;
      return matchesSearch && matchesSeries;
    });
  }, [waifus, searchQuery, selectedSeries]);

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Yakin ingin menghapus ${name}?`)) {
      const { error } = await supabase.from('waifus').delete().eq('id', id);
      if (error) alert("Error: " + error.message);
      else setWaifus(prev => prev.filter(w => w.id !== id));
    }
  };

  // --- DEBUGGING LOGIC ---

// --- LOGIKA INSTA-DROP (TS COMPLIANT) ---

const executeUpdate = async (id: string, newUrl: string) => {
  console.group(`🚀 DEBUG: Update Started for ID [${id}]`);
  
  setUpdatingId(id);
  
  try {
      const target = waifus.find(w => w.id === id);
      if (!target) {
          console.error("❌ ERROR: Target not found!");
          console.groupEnd();
          return;
      }

      // 1. Definisikan tipe secara gamblang: string[]
      let oldImages: string[] = []; 

      // 2. Casting data dari database agar TS tenang
      if (Array.isArray(target.image_url)) {
          oldImages = [...(target.image_url as string[])];
      } else if (typeof target.image_url === 'string' && target.image_url !== "") {
          oldImages = [target.image_url];
      }
      
      // 3. Buat array baru untuk dikirim
      const newImagesArray: string[] = [...oldImages];
      
      if (newImagesArray.length > 0) {
          newImagesArray[0] = newUrl;
      } else {
          newImagesArray.push(newUrl);
      }

      console.log("Final Array to Send:", newImagesArray);

      // 4. Update Database
      const { data, error } = await supabase
          .from('waifus')
          .update({ image_url: newImagesArray })
          .eq('id', id)
          .select();

      if (error) {
          console.error("❌ DB ERROR:", error);
          alert(`Error: ${error.message}`);
      } else {
          console.log("✅ DB SUCCESS:", data);
          setWaifus(prev => prev.map(w => w.id === id ? { ...w, image_url: newImagesArray } : w));
      }
  } catch (err) {
      console.error("🔥 CRASH:", err);
  } finally {
      setUpdatingId(null);
      console.groupEnd();
  }
};

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

const handleDrop = async (e: React.DragEvent, id: string) => {
  e.preventDefault();
  e.stopPropagation();
  
  console.group("📥 DROP DETECTED");

  const uriList = e.dataTransfer.getData("text/uri-list");
  const plainText = e.dataTransfer.getData("text/plain");
  const rawUrl = uriList || plainText;

  if (rawUrl) {
      let finalUrl = rawUrl.split('\n')[0].trim();

      // --- LOGIKA EKSTRAKSI GAMBAR ASLI ---
      try {
          // 1. Cek apakah ini URL dari Google Images
          if (finalUrl.includes("google.com/imgres")) {
              const urlParams = new URLSearchParams(finalUrl.split('?')[1]);
              const extracted = urlParams.get("imgurl"); // Ambil parameter imgurl
              if (extracted) {
                  finalUrl = decodeURIComponent(extracted); // Decode URL-nya
                  console.log("🎯 Extracted Direct URL:", finalUrl);
              }
          } 
          // 2. Cek apakah ini URL dari Pinterest (Sering ada di log kamu)
          else if (finalUrl.includes("i.pinimg.com")) {
              // Pinterest URL biasanya sudah bersih, tapi pastikan tidak ada query tambahan
              finalUrl = finalUrl.split('?')[0];
          }
      } catch (err) {
          console.warn("Parsing failed, using raw URL instead.");
      }

      console.log("🚀 Sending Clean URL to DB:", finalUrl);
      console.groupEnd();
      
      await executeUpdate(id, finalUrl);

  } else if (e.dataTransfer.files.length > 0) {
      // (Logika upload file tetap sama seperti sebelumnya...)
      console.groupEnd();
  }
};

  if (loading) return <div className="p-10 text-white font-mono animate-pulse text-center mt-20 uppercase tracking-widest">Initializing...</div>;

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 md:p-10 font-mono">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-pink-900/50 pb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-pink-500 tracking-tighter uppercase">&gt; DB_MANAGER</h1>
            <p className="text-[10px] text-gray-500 mt-1 tracking-widest">Sector: Character_Assets</p>
          </div>
          <Link href="/admin" className="text-[10px] font-bold bg-neutral-900 hover:bg-pink-600 px-6 py-2 rounded-full border border-neutral-700">
            DASHBOARD
          </Link>
        </div>

        {/* --- SEARCH --- */}
        <div className="relative mb-8">
          <input 
            type="text" 
            placeholder="Search Subject..." 
            className="w-full bg-black border border-neutral-800 p-4 pl-12 rounded-2xl focus:border-pink-500 outline-none text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <svg className="w-5 h-5 absolute left-4 top-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>

        {/* --- CHIPS --- */}
        <div className="flex gap-2 mb-8 overflow-x-auto no-scrollbar pb-2">
          {existingSeries.map((series) => (
            <button
              key={series}
              onClick={() => setSelectedSeries(series)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-lg text-[9px] font-bold border transition-all uppercase ${
                selectedSeries === series ? 'bg-pink-600 border-pink-500 text-white' : 'bg-neutral-900 border-neutral-800 text-gray-500'
              }`}
            >
              {series}
            </button>
          ))}
        </div>

        {/* --- TABLE AREA --- */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead className="bg-neutral-800/50 text-gray-500 text-[9px] uppercase tracking-[0.2em] border-b border-neutral-800">
              <tr>
                <th className="p-5">Avatar</th>
                <th className="p-5">Subject</th>
                <th className="p-5">Origin</th>
                <th className="p-5 text-center">Status</th>
                <th className="p-5 text-right">Ops</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/50 text-sm">
              {filteredWaifus.map((waifu) => {
                const displayImg = Array.isArray(waifu.image_url) ? waifu.image_url[0] : waifu.image_url;
                const isUpdating = updatingId === waifu.id;

                return (
                  <tr 
                    key={waifu.id} 
                    className="hover:bg-white/[0.02] transition-colors group"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, waifu.id)}
                  >
                    <td className="p-5">
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-neutral-700">
                         {isUpdating && (
                            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
                                <div className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                         )}
                         <img src={displayImg || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" alt="avatar" />
                      </div>
                    </td>
                    <td className="p-5 font-bold uppercase tracking-tighter text-gray-300 group-hover:text-pink-500">
                      {waifu.name}
                    </td>
                    <td className="p-5 text-gray-500 text-xs italic">
                      {waifu.series}
                    </td>
                    <td className="p-5 text-center">
                      {waifu.is_featured && <span className="bg-yellow-500/10 text-yellow-500 text-[8px] font-black px-2 py-0.5 rounded border border-yellow-500/20 uppercase tracking-widest">Featured</span>}
                    </td>
                    <td className="p-5 text-right space-x-2">
                       <Link href={`/admin/edit/${waifu.id}`} className="inline-block bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white px-3 py-1 rounded text-[10px] font-bold border border-blue-600/20">EDIT</Link>
                       <button onClick={() => handleDelete(waifu.id, waifu.name)} className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white px-3 py-1 rounded text-[10px] font-bold border border-red-600/20">DEL</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
      </div>
    </div>
  );
}