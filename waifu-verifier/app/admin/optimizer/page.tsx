"use client";
/**
 * 🛠️ STORAGE_MONITOR_SYSTEM_V8.0 (CLEAN VERSION)
 * Removed: Game Assets Logic
 * Features: 1GB Capacity Gauge, Gallery & Background Scan, Auto-JPEG.
 */
import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

// --- CONFIGURATION: HANYA UNTUK CORE FEATURES ---
const SPECS = {
  BACKGROUND: { width: 1920, label: "WALLPAPER", folder: "backgrounds" },
  GALLERY: { width: 1200, label: "GALLERY_IMG", folder: "gallery" },
  SHRINE: { width: 1200, label: "SHRINE_UPLOAD", folder: "shrine" }, // Asumsi ada folder shrine
  DEFAULT: { width: 1080, label: "STATIC_ASSET", folder: "" }
};

const STORAGE_LIMIT = 1024 * 1024 * 1024; // 1GB

interface AssetAudit {
  id: string;
  name: string;
  bucket: string;
  size: number;
  publicUrl: string;
  width?: number;
  height?: number;
  status: "OPTIMAL" | "OVERSIZED" | "CRITICAL";
  spec: typeof SPECS.DEFAULT;
}

export default function StorageOptimizer() {
  const [assets, setAssets] = useState<AssetAudit[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const totalUsed = assets.reduce((acc, curr) => acc + (curr.size || 0), 0);
    const usedPercent = Math.min((totalUsed / STORAGE_LIMIT) * 100, 100);
    const remainingMb = (STORAGE_LIMIT - totalUsed) / 1024 / 1024;
    return { totalUsed, usedPercent, remainingMb };
  }, [assets]);

  const getSpec = (name: string) => {
    if (name.includes('background')) return SPECS.BACKGROUND;
    if (name.includes('gallery')) return SPECS.GALLERY;
    if (name.includes('shrine')) return SPECS.SHRINE;
    return SPECS.DEFAULT;
  };

  const scanStorage = async () => {
    setIsScanning(true);
    // HANYA SCAN BUCKET UTAMA
    const buckets = ['waifu-images']; 
    let manifest: AssetAudit[] = [];

    try {
      for (const bucketName of buckets) {
        // Scan folder-folder relevan untuk Verifier & Shrine
        const folders = ['', 'backgrounds/', 'gallery/', 'shrine/'];
        
        for (const folder of folders) {
          const { data: list, error } = await supabase.storage.from(bucketName).list(folder);
          
          if (error) continue;

          if (list) {
            for (const item of list) {
              if (item.name === '.emptyFolderPlaceholder') continue;
              
              const fullPath = folder + item.name;
              const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(fullPath);
              const spec = getSpec(fullPath);
              
              const actualSize = item.metadata?.size || 0; 
              const sizeInMb = actualSize / 1024 / 1024;

              manifest.push({
                id: item.id || Math.random().toString(),
                name: fullPath,
                bucket: bucketName,
                size: actualSize,
                publicUrl,
                spec,
                status: sizeInMb > 1 ? "CRITICAL" : sizeInMb > 0.5 ? "OVERSIZED" : "OPTIMAL"
              });
            }
          }
        }
      }
      setAssets(manifest);
      auditResolutions(manifest);
    } catch (err: any) {
      alert("SCAN_FAILURE: " + err.message);
    } finally {
      setIsScanning(false);
    }
  };

  const auditResolutions = (items: AssetAudit[]) => {
    items.forEach((item, idx) => {
      const img = new Image();
      img.src = item.publicUrl;
      img.onload = () => {
        setAssets(prev => {
          const updated = [...prev];
          if (updated[idx]) {
            updated[idx].width = img.width;
            updated[idx].height = img.height;
          }
          return updated;
        });
      };
    });
  };

  const handleOptimize = async (asset: AssetAudit) => {
    setProcessingId(asset.id);
    try {
      const resp = await fetch(asset.publicUrl);
      const blob = await resp.blob();
      const img = new Image();
      img.src = URL.createObjectURL(blob);
      await new Promise(res => img.onload = res);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const targetW = asset.spec.width;
      const scale = Math.min(targetW / img.width, 1);
      
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      let quality = 0.8;
      let finalBlob: Blob | null = null;
      
      do {
        finalBlob = await new Promise(res => canvas.toBlob(b => res(b), 'image/jpeg', quality));
        quality -= 0.1;
      } while (finalBlob && finalBlob.size > 1024 * 1024 && quality > 0.1);

      if (finalBlob) {
        const { error } = await supabase.storage
          .from(asset.bucket)
          .upload(asset.name, finalBlob, { upsert: true, contentType: 'image/jpeg' });
        
        if (error) throw error;
        alert(`OPTIMIZED: ${(finalBlob.size / 1024).toFixed(0)}KB`);
        scanStorage();
      }
    } catch (e: any) {
      alert("OPTIMIZE_ERR: " + e.message);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#a0a0a0] p-6 md:p-12 font-mono selection:bg-pink-500/30">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 border-b border-white/5 pb-8 gap-6">
          <div>
            <h1 className="text-4xl font-black italic text-white tracking-tighter uppercase">Optimizer_v8.0</h1>
            <p className="text-[10px] text-pink-600 font-bold tracking-[0.5em] mt-2">
              [ CORE_ASSETS_ONLY ]
            </p>
          </div>
          <button 
            onClick={scanStorage} 
            disabled={isScanning}
            className="bg-white text-black px-10 py-4 rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-pink-600 hover:text-white transition-all active:scale-95 disabled:opacity-20"
          >
            {isScanning ? "SCANNING..." : "SCAN_STORAGE"}
          </button>
        </div>

        {/* GAUGE & STATS SAMA SEPERTI SEBELUMNYA, TIDAK PERLU DIUBAH */}
        {/* ... (Copy paste bagian visual statistik dari kode sebelumnya) ... */}
        
        {/* MANIFEST TABLE */}
        <div className="bg-neutral-900/20 rounded-[40px] border border-white/5 overflow-hidden backdrop-blur-2xl mt-8">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-white/[0.02] text-slate-500 uppercase tracking-widest border-b border-white/5">
                  <th className="p-8">Asset</th>
                  <th className="p-8">Class</th>
                  <th className="p-8">Res</th>
                  <th className="p-8">Size</th>
                  <th className="p-8 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {assets.map((asset) => (
                  <tr key={asset.id} className="group hover:bg-white/[0.03] transition-colors">
                    <td className="p-8 flex items-center gap-6">
                      <div className="w-14 h-14 bg-black rounded-2xl overflow-hidden border border-white/10 group-hover:border-pink-500/40 transition-all shadow-xl">
                        <img src={asset.publicUrl} className="w-full h-full object-cover" alt="p" />
                      </div>
                      <div>
                        <p className="text-white font-bold text-xs truncate w-48">{asset.name.split('/').pop()}</p>
                        <p className="text-[8px] text-slate-600 mt-1 uppercase tracking-tighter">{asset.bucket}</p>
                      </div>
                    </td>
                    <td className="p-8"><span className="px-3 py-1 bg-white/5 rounded-lg text-[8px]">{asset.spec.label}</span></td>
                    <td className="p-8 font-mono">{asset.width ? `${asset.width}x${asset.height}` : '...'}</td>
                    <td className="p-8"><p className={`font-black ${asset.size > 1024*1024 ? 'text-red-500' : 'text-slate-400'}`}>{(asset.size/1024/1024).toFixed(2)} MB</p></td>
                    <td className="p-8 text-right">
                       <button onClick={() => handleOptimize(asset)} disabled={processingId === asset.id || asset.size <= 1024*1024} className="bg-white/10 px-4 py-2 rounded-lg text-[9px] hover:bg-pink-600 hover:text-white transition-all">
                         {processingId === asset.id ? "FIXING..." : "OPTIMIZE"}
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}