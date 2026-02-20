"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function AdminCleanup() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [trashFiles, setTrashFiles] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, used: 0, trash: 0, size: 0 });

  // Fungsi untuk mengekstrak nama file dari URL Supabase
  const getFileName = (url: string) => {
    if (!url) return null;
    return url.split('/').pop()?.split('?')[0];
  };

  const scanStorage = async () => {
    setLoading(true);
    setStatus('scanning');
    setTrashFiles([]);

    try {
      // 1. Ambil semua file di Storage (Folder waifu-images)
      const { data: storageFiles, error: storageError } = await supabase.storage.from('waifu-images').list();
      if (storageError) throw storageError;

      // 2. Ambil referensi dari Database
      const { data: waifus } = await supabase.from('waifus').select('image_url, visual_assets');
      const { data: questions } = await supabase.from('questions').select('image_url');

      const usedFiles = new Set<string>();

      // Mapping file yang digunakan di Waifu (Foto Profil & Chibi)
      waifus?.forEach(w => {
        w.image_url?.forEach((url: string) => { if(url) usedFiles.add(getFileName(url) || ''); });
        w.visual_assets?.forEach((as: any) => { if(as.url) usedFiles.add(getFileName(as.url) || ''); });
      });

      // Mapping file yang digunakan di Questions (Hint Gambar)
      questions?.forEach(q => {
        if(q.image_url) usedFiles.add(getFileName(q.image_url) || '');
      });

      // 3. Filter file yang tidak ada di database (Trash)
      const identifiedTrash = storageFiles.filter(f => 
        f.name !== '.emptyFolderPlaceholder' && !usedFiles.has(f.name)
      );

      // 4. Hitung Statistik
      const totalSize = identifiedTrash.reduce((acc, curr) => acc + (curr.metadata?.size || 0), 0);
      
      setTrashFiles(identifiedTrash);
      setStats({
        total: storageFiles.length,
        used: usedFiles.size,
        trash: identifiedTrash.length,
        size: Math.round(totalSize / 1024) // KB
      });
      setStatus('success');
    } catch (err) {
      console.error(err);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const purgeTrash = async () => {
    if (!window.confirm(`Hapus permanen ${trashFiles.length} file sampah? Tindakan ini tidak bisa dibatalkan.`)) return;
    
    setLoading(true);
    try {
      const fileNames = trashFiles.map(f => f.name);
      const { error } = await supabase.storage.from('waifu-images').remove(fileNames);
      if (error) throw error;
      
      alert(`Berhasil memusnahkan ${fileNames.length} file sampah!`);
      scanStorage(); // Scan ulang setelah hapus
    } catch (err: any) {
      alert("Gagal menghapus: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-300 font-sans p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">Terminal_Cleanup_v1.0</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">System_Maintenance_Mode</p>
          </div>
          <Link href="/admin/questions" className="text-[10px] font-bold border border-slate-700 px-4 py-2 rounded-full hover:bg-slate-800 transition-all">
            BACK_TO_CMS
          </Link>
        </div>

        {/* STATS PANEL */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Files', val: stats.total, color: 'text-white' },
            { label: 'In Use', val: stats.used, color: 'text-blue-400' },
            { label: 'Trash Found', val: stats.trash, color: 'text-red-500' },
            { label: 'Space Saved', val: `${stats.size} KB`, color: 'text-green-400' },
          ].map((s, i) => (
            <div key={i} className="bg-slate-800/50 border border-slate-700 p-6 rounded-[25px]">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">{s.label}</p>
              <p className={`text-xl font-black ${s.color}`}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* ACTION AREA */}
        <div className="bg-slate-800 border border-slate-700 rounded-[40px] p-8 overflow-hidden relative">
          {status === 'idle' && (
            <div className="text-center py-20">
              <div className="text-5xl mb-6">🔍</div>
              <button onClick={scanStorage} disabled={loading} className="bg-white text-slate-900 px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all">
                Mulai Pindaian System
              </button>
            </div>
          )}

          {(status === 'scanning' || loading) && (
            <div className="text-center py-20">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
              <p className="text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">Analyzing_Storage_Clusters...</p>
            </div>
          )}

          {status === 'success' && !loading && (
            <div className="animate-in fade-in duration-500">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-black uppercase tracking-widest italic text-red-500">Trash_Manifest_Detected</h3>
                {trashFiles.length > 0 && (
                  <button onClick={purgeTrash} className="bg-red-500 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all">
                    Purge_All_Trash
                  </button>
                )}
              </div>

              <div className="max-h-[400px] overflow-y-auto pr-4 space-y-2 no-scrollbar">
                {trashFiles.length > 0 ? (
                  trashFiles.map((f, i) => (
                    <div key={i} className="flex justify-between items-center p-4 bg-slate-900/50 rounded-2xl border border-slate-700/50 group">
                      <div className="flex items-center gap-4 overflow-hidden">
                        <span className="text-[8px] font-bold text-slate-600">{i + 1}</span>
                        <p className="text-[10px] font-mono text-slate-400 truncate">{f.name}</p>
                      </div>
                      <span className="text-[8px] font-bold text-slate-600 uppercase">{(f.metadata?.size / 1024).toFixed(1)} KB</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10">
                    <p className="text-[10px] font-black text-slate-500 uppercase">System_Is_Clean_No_Trash_Found</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* WARNING FOOTER */}
        <div className="mt-8 p-6 border border-red-900/30 bg-red-950/10 rounded-3xl">
          <p className="text-[9px] font-bold text-red-500/70 leading-relaxed uppercase tracking-tighter">
            <span className="font-black underline">Perhatian:</span> Halaman ini akan membandingkan file fisik di Supabase Storage dengan link URL di tabel waifus & questions. File yang tidak terhubung ke entitas manapun akan dihapus permanen untuk mengoptimalkan kuota penyimpanan Anda.
          </p>
        </div>
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}