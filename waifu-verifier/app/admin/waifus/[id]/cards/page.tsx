"use client";
import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function WaifuCardManager({ params }: any) {
  const resolvedParams = use(params);
  const waifuId = (resolvedParams as any).id;

  const [loading, setLoading] = useState(true);
  const [waifu, setWaifu] = useState<any>(null);
  const [cardImages, setCardImages] = useState<Record<string, string>>({});
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  // Definisi Level agar admin tau sedang edit yang mana
  const levels = [
    { id: 1, title: "LEVEL 01: KARBIT TEST" },
    { id: 2, title: "LEVEL 02: NORMAL WEEBS" },
    { id: 3, title: "LEVEL 03: HARDCORE SIMP" },
    { id: 4, title: "LEVEL 04: SOUL LINK" },
  ];

  useEffect(() => {
    fetchData();
  }, [waifuId]);

  const fetchData = async () => {
    const { data, error } = await supabase
      .from('waifus')
      .select('*')
      .eq('id', waifuId)
      .single();

    if (data) {
      setWaifu(data);
      // Load data gambar card yang sudah ada (kalau ada)
      if (data.card_images) {
        setCardImages(data.card_images);
      }
    }
    setLoading(false);
  };

  const handleUpload = async (levelId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      
      setUploadingId(levelId);
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      // Nama file unik: card_lvl{id}_{waifuId}_{timestamp}
      const fileName = `card_lvl${levelId}_${waifuId}_${Date.now()}.${fileExt}`;
      const filePath = `card-backgrounds/${fileName}`;

      // 1. Upload ke Storage (Pastikan bucket 'waifu-images' ada)
      const { error: uploadError } = await supabase.storage
        .from('waifu-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Dapat URL Public
      const { data: urlData } = supabase.storage.from('waifu-images').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      // 3. Update State Lokal
      const newImages = { ...cardImages, [levelId]: publicUrl };
      setCardImages(newImages);

      // 4. Simpan ke Database (Update kolom JSONB)
      const { error: dbError } = await supabase
        .from('waifus')
        .update({ card_images: newImages })
        .eq('id', waifuId);

      if (dbError) throw dbError;

    } catch (error: any) {
      alert('Gagal Upload: ' + error.message);
    } finally {
      setUploadingId(null);
    }
  };

  if (loading) return <div className="p-10 text-white font-mono animate-pulse">LOADING_DATA...</div>;
  const accentColor = waifu?.theme_color || '#ec4899';

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 md:p-12 font-sans">
      
      {/* HEADER */}
      <div className="max-w-4xl mx-auto mb-12 border-b border-neutral-800 pb-6">
         <Link href="/admin" className="text-xs text-slate-500 hover:text-white uppercase font-bold mb-2 block">← DASHBOARD</Link>
         <h1 className="text-4xl font-black italic uppercase tracking-tighter">
            CARD IMAGE MANAGER
         </h1>
         <p className="text-sm text-slate-400 mt-2">
            Target Waifu: <span style={{color: accentColor}} className="font-bold">{waifu.name}</span>
         </p>
      </div>

      {/* GRID LEVEL EDITORS */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {levels.map((lv) => (
          <div key={lv.id} className="relative group">
            
            {/* PREVIEW CARD (MIPIR TAMPILAN ASLI) */}
            <div className="relative h-48 rounded-[35px] overflow-hidden border-2 border-neutral-800 bg-neutral-900 group-hover:border-white transition-colors">
                
                {/* Background Image Preview */}
                <div className="absolute inset-0">
                    {cardImages[lv.id] ? (
                        <img src={cardImages[lv.id]} className="w-full h-full object-cover opacity-60" />
                    ) : (
                        // Fallback jika belum ada gambar khusus card
                        <div className="w-full h-full flex items-center justify-center bg-neutral-800">
                             <span className="text-xs font-mono text-neutral-500">NO CUSTOM IMAGE</span>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent"></div>
                </div>

                {/* Content Overlay Mockup */}
                <div className="relative z-10 p-6 flex flex-col h-full justify-between pointer-events-none">
                    <span className="inline-block px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase border w-fit" 
                          style={{borderColor: accentColor, color: accentColor}}>
                        QUEST_0{lv.id}
                    </span>
                    <h3 className="text-xl font-black italic uppercase tracking-tighter">{lv.title}</h3>
                </div>

                {/* UPLOAD OVERLAY (Hanya muncul saat hover atau kosong) */}
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer">
                   <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-white">
                      {uploadingId === lv.id ? "UPLOADING..." : "CHANGE_IMAGE"}
                   </p>
                   <input 
                      type="file" 
                      accept="image/*"
                      disabled={uploadingId !== null}
                      onChange={(e) => handleUpload(lv.id, e)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                   />
                </div>
            </div>

            {/* STATUS INDICATOR */}
            <div className="mt-2 flex justify-between items-center px-2">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                    {cardImages[lv.id] ? "✅ IMAGE SET" : "⚠️ USING DEFAULT"}
                </span>
                {cardImages[lv.id] && (
                    <button 
                        onClick={() => {
                           if(confirm("Hapus gambar card ini?")) {
                               const newImgs = {...cardImages};
                               delete newImgs[lv.id];
                               setCardImages(newImgs);
                               supabase.from('waifus').update({ card_images: newImgs }).eq('id', waifuId).then();
                           }
                        }}
                        className="text-[10px] text-red-500 hover:text-red-400 font-bold uppercase"
                    >
                        RESET
                    </button>
                )}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}