"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function AdminSettings() {
  const [bgUrl, setBgUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    // Fetch current background from 'app_config' table
    const { data } = await supabase.from('app_config').select('value').eq('key', 'home_background').single();
    if (data) setBgUrl(data.value);
  };

  const handleUpload = async () => {
    if (!file) return alert("Pilih gambar dulu!");
    setUploading(true);

    try {
      // 1. Upload File
      const fileName = `global-bg-${Date.now()}.jpg`;
      const { error: uploadErr } = await supabase.storage.from('waifu-images').upload(`backgrounds/${fileName}`, file);
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from('waifu-images').getPublicUrl(`backgrounds/${fileName}`);

      // 2. Save to DB (Upsert)
      const { error: dbErr } = await supabase
        .from('app_config')
        .upsert({ key: 'home_background', value: publicUrl }, { onConflict: 'key' });

      if (dbErr) throw dbErr;
      
      setBgUrl(publicUrl);
      alert("Background Updated!");
      setFile(null);
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-10 font-mono flex flex-col items-center">
      <h1 className="text-3xl font-black text-pink-500 mb-8 uppercase italic">Global Settings</h1>
      
      <div className="w-full max-w-xl bg-neutral-900 p-8 rounded-3xl border border-white/10">
        <h2 className="text-xl font-bold mb-4">Home Page Background</h2>
        
        {/* Preview */}
        <div className="w-full h-48 bg-black rounded-xl border border-white/5 mb-6 overflow-hidden relative group">
           {bgUrl ? (
             <img src={bgUrl} className="w-full h-full object-cover" />
           ) : (
             <div className="flex items-center justify-center h-full text-neutral-600 text-xs">NO BACKGROUND SET</div>
           )}
           <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
             <p className="text-[10px] font-bold uppercase tracking-widest">Current Active BG</p>
           </div>
        </div>

        {/* Uploader */}
        <div className="space-y-4">
            <input 
              type="file" 
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-pink-500 file:text-white hover:file:bg-pink-600"
            />
            <button 
              onClick={handleUpload}
              disabled={uploading || !file}
              className="w-full py-3 bg-white text-black font-black uppercase tracking-widest text-xs rounded-xl hover:bg-pink-500 hover:text-white disabled:opacity-50 transition-all"
            >
              {uploading ? "UPLOADING..." : "SAVE CHANGES"}
            </button>
        </div>
      </div>

      <Link href="/admin" className="mt-8 text-xs text-neutral-500 hover:text-white uppercase tracking-widest">[ BACK TO DASHBOARD ]</Link>
    </div>
  );
}