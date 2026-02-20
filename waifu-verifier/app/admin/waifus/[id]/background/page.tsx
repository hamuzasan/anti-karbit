"use client";
import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function WaifuHomeBackgroundManager({ params }: any) {
  const resolvedParams = use(params);
  const waifuId = (resolvedParams as any).id;

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [waifu, setWaifu] = useState<any>(null);
  const [bgInput, setBgInput] = useState('');

  // Ambil data Waifu
  useEffect(() => {
    fetchWaifuData();
  }, [waifuId]);

  const fetchWaifuData = async () => {
    const { data, error } = await supabase
      .from('waifus')
      .select('*')
      .eq('id', waifuId)
      .single();

    if (error) {
      alert("Error: " + error.message);
    } else {
      setWaifu(data);
      if (data.background_image) setBgInput(data.background_image);
    }
    setLoading(false);
  };

  // 1. Upload File ke Supabase Storage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      
      setUploading(true);
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      // Nama file unik: bg_home_{id}_{timestamp}
      const fileName = `bg_home_${waifuId}_${Date.now()}.${fileExt}`;
      const filePath = `backgrounds/${fileName}`;

      // Upload
      const { error: uploadError } = await supabase.storage
        .from('waifu-images') // Pastikan bucket ini ada
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get URL
      const { data } = supabase.storage.from('waifu-images').getPublicUrl(filePath);
      
      // Simpan ke DB
      await updateDatabase(data.publicUrl);

    } catch (error: any) {
      alert('Upload Gagal: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // 2. Set URL Manual
  const handleUrlSubmit = () => {
    if (!bgInput) return alert("URL Kosong!");
    updateDatabase(bgInput);
  };

  // 3. Update Kolom background_image di tabel waifus
  const updateDatabase = async (url: string) => {
    setUploading(true);
    const { error } = await supabase
      .from('waifus')
      .update({ background_image: url })
      .eq('id', waifuId);

    setUploading(false);
    
    if (error) {
        alert("DB Error: " + error.message);
    } else {
        // Update state lokal biar preview berubah
        setWaifu({ ...waifu, background_image: url });
        alert("✅ Background Halaman Utama Berhasil Diupdate!");
    }
  };

  const handleRemove = async () => {
      if(confirm("Hapus background dan kembali ke hitam polos?")) {
          await updateDatabase("");
          setBgInput("");
      }
  }

  if (loading) return <div className="p-10 text-white font-mono animate-pulse">LOADING_DATA...</div>;

  const accentColor = waifu?.theme_color || '#ec4899';

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 md:p-8 font-mono flex flex-col xl:flex-row gap-8">
      
      {/* --- KIRI: PANEL CONTROLLER --- */}
      <div className="w-full xl:w-1/3 flex flex-col gap-6">
        <div className="border-b border-neutral-800 pb-4">
             <Link href="/admin" className="text-xs text-gray-500 hover:text-white uppercase font-bold mb-2 block">← DASHBOARD</Link>
             <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                HUB_BG_EDITOR
             </h1>
             <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">
                Target: <span style={{color: accentColor}} className="font-bold">{waifu.name}</span>
             </p>
        </div>

        {/* Upload Section */}
        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl space-y-6">
            
            {/* Input URL */}
            <div>
                <label className="text-[9px] text-blue-400 font-bold uppercase tracking-widest block mb-2">Option A: Direct URL</label>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={bgInput} 
                        onChange={(e) => setBgInput(e.target.value)}
                        placeholder="https://..."
                        className="flex-1 bg-black border border-neutral-700 p-2 rounded text-xs focus:border-blue-500 outline-none"
                    />
                    <button onClick={handleUrlSubmit} disabled={uploading} className="bg-blue-600 hover:bg-blue-500 px-4 rounded text-[10px] font-bold">
                        {uploading ? '...' : 'SET'}
                    </button>
                </div>
            </div>

            <div className="text-center text-[10px] text-gray-600 font-bold uppercase tracking-widest">- OR -</div>

            {/* Upload File */}
            <div>
                <label className="text-[9px] text-green-400 font-bold uppercase tracking-widest block mb-2">Option B: Upload File</label>
                <div className="border-2 border-dashed border-neutral-700 hover:border-green-500 rounded-xl p-8 text-center cursor-pointer relative bg-black/40 group transition-colors">
                    <input type="file" accept="image/*" onChange={handleFileUpload} disabled={uploading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <span className="text-2xl block mb-2">🖼️</span>
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest group-hover:text-white">
                        {uploading ? 'UPLOADING...' : 'CLICK TO UPLOAD'}
                    </span>
                </div>
            </div>

            {/* Remove */}
            {waifu.background_image && (
                <button onClick={handleRemove} className="w-full py-3 border border-red-900/50 text-red-500 hover:bg-red-900/20 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors">
                    [ RESET_TO_DEFAULT_BLACK ]
                </button>
            )}
        </div>

        <div className="bg-yellow-900/10 border border-yellow-900/30 p-4 rounded-xl">
            <p className="text-[9px] text-yellow-500 uppercase tracking-wide leading-relaxed">
                <span className="font-bold">⚠️ DESIGN TIP:</span><br/>
                Sistem akan otomatis menambahkan layer gelap (Opacity 85%) di atas gambar agar teks tetap terbaca. Pilih gambar yang tidak terlalu ramai.
            </p>
        </div>
      </div>

      {/* --- KANAN: LIVE SIMULATOR (MENGGUNAKAN LOGIKA UI USER) --- */}
      <div className="w-full xl:w-2/3">
        <div className="bg-neutral-800 text-[10px] text-gray-400 py-2 px-4 rounded-t-xl font-bold uppercase tracking-widest flex justify-between">
            <span>Live Preview: Waifu Selection Hub</span>
            <span>Ratio 16:9</span>
        </div>
        
        {/* CONTAINER SIMULATOR */}
        <div className="relative w-full aspect-video rounded-b-xl overflow-hidden border border-neutral-800 shadow-2xl group">
            
            {/* 1. BACKGROUND LAYER (Meniru code user) */}
            <div className="absolute inset-0 z-0 bg-neutral-950">
                {waifu.background_image ? (
                    <>
                        <img 
                            src={waifu.background_image} 
                            className="w-full h-full object-cover" 
                            alt="preview"
                        />
                        {/* Overlay Gelap 85% sesuai code user */}
                        <div className="absolute inset-0 bg-neutral-950/85 backdrop-blur-sm"></div>
                        {/* Vignette */}
                        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-neutral-950"></div>
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-neutral-800 font-bold text-4xl uppercase tracking-tighter">Default Black</span>
                    </div>
                )}
            </div>

            {/* 2. CONTENT LAYER MOCKUP (Meniru posisi elemen user) */}
            <div className="absolute inset-0 z-10 p-6 flex flex-col justify-center items-center scale-[0.6] md:scale-[0.8] origin-center pointer-events-none select-none">
                
                {/* Header Mockup */}
                <div className="flex items-center gap-6 mb-8 w-full max-w-2xl">
                    <div className="w-24 h-24 rounded-full border-4 shadow-lg object-cover bg-neutral-800" style={{borderColor: accentColor}}>
                        <img src={waifu.image_url?.[0]} className="w-full h-full object-cover rounded-full" />
                    </div>
                    <div>
                        <h1 className="text-5xl font-black italic uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                            {waifu.name}
                        </h1>
                        <div className="text-white font-bold italic text-xl mt-1">LV.1 <span className="text-gray-500 text-sm not-italic ml-2">VERIFICATION PTS: 10</span></div>
                    </div>
                </div>

                {/* Grid Mockup */}
                <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
                    {/* Card 1 */}
                    <div className="h-32 rounded-[25px] border border-white/10 bg-[rgba(10,10,10,0.6)] backdrop-blur-md p-4 relative overflow-hidden" style={{borderColor: accentColor}}>
                        <div className="absolute inset-0 opacity-20">
                             <img src={waifu.image_url?.[0]} className="w-full h-full object-cover" />
                        </div>
                        <div className="relative z-10">
                            <span className="text-[8px] px-2 py-0.5 border rounded" style={{borderColor: accentColor, color: accentColor}}>QUEST_01</span>
                            <h3 className="text-lg font-black italic uppercase mt-2 text-white">KARBIT TEST</h3>
                        </div>
                    </div>
                    {/* Card 2 */}
                    <div className="h-32 rounded-[25px] border border-neutral-800 bg-neutral-900/50 p-4 opacity-50 grayscale">
                        <span className="text-[8px] px-2 py-0.5 border border-neutral-700 text-neutral-500 rounded">QUEST_02</span>
                        <h3 className="text-lg font-black italic uppercase mt-2 text-gray-500">NORMAL WEEBS</h3>
                        <p className="text-[8px] mt-2 text-gray-600">LOCKED</p>
                    </div>
                </div>

            </div>
            
            {/* Label Preview */}
            <div className="absolute bottom-4 right-4 bg-black/80 px-2 py-1 text-[8px] text-white font-mono rounded border border-white/20">
                PREVIEW_MODE
            </div>
        </div>
      </div>
    </div>
  );
}