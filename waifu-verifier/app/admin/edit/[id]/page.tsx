"use client";
import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Helper Type untuk unwrap params
interface EditParams {
    params: Promise<{ id: string }>;
}

export default function EditWaifuPage({ params }: EditParams) {
  const router = useRouter();
  const resolvedParams = use(params);
  const waifuId = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState(''); // State untuk input link manual
  const [bgUrlInput, setBgUrlInput] = useState(''); // State untuk input link bg manual

  // State Form
  const [formData, setFormData] = useState({
    name: '',
    series: '',
    image_url: [] as string[], 
    background_image: '', // TARGET BARU
    theme_color: '#3b82f6',
    is_featured: false
  });

  // State untuk Slideshow Preview
  const [previewIndex, setPreviewIndex] = useState(0);

  // 1. Fetch Data Lama
  useEffect(() => {
    if (!waifuId || waifuId === 'undefined') {
        alert("ID Tidak Valid!");
        router.push('/admin/manage');
        return;
    }

    const fetchWaifu = async () => {
      const { data, error } = await supabase
        .from('waifus')
        .select('*')
        .eq('id', waifuId)
        .single();

      if (error) {
        alert("Error fetch data: " + error.message);
        router.push('/admin/manage'); 
      } else if (data) {
        // Konversi data lama (string) ke array jika perlu
        let images: string[] = [];
        if (Array.isArray(data.image_url)) {
            images = data.image_url;
        } else if (typeof data.image_url === 'string' && data.image_url !== "") {
            images = [data.image_url];
        }

        setFormData({
            name: data.name,
            series: data.series,
            image_url: images,
            background_image: data.background_image || '', // Load data BG
            theme_color: data.theme_color || '#3b82f6',
            is_featured: data.is_featured || false
        });
      }
      setLoading(false);
    };

    fetchWaifu();
  }, [waifuId, router]);

  // 2. Auto-Slideshow Logic untuk Preview
  useEffect(() => {
    if (formData.image_url.length <= 1) return;
    const interval = setInterval(() => {
        setPreviewIndex(prev => (prev + 1) % formData.image_url.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [formData.image_url.length]);

  // 3. Tambah Gambar via Link URL (Gallery)
  const addImageViaUrl = () => {
    if (!imageUrlInput) return;
    if (formData.image_url.length >= 10) {
      alert("Maksimal 10 gambar!");
      return;
    }
    setFormData(prev => ({
      ...prev,
      image_url: [...prev.image_url, imageUrlInput]
    }));
    setImageUrlInput('');
  };

  // 4. Handle Upload Multi-Image (Gallery)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      if (formData.image_url.length + e.target.files.length > 10) {
        alert("Maksimal 10 gambar!");
        return;
      }

      setUploading(true);
      const newUrls: string[] = [];

      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        const fileName = `gallery/${Date.now()}-${Math.random()}.${file.name.split('.').pop()}`;
        
        const { error: uploadError } = await supabase.storage
            .from('waifu-images')
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from('waifu-images')
            .getPublicUrl(fileName);
            
        newUrls.push(data.publicUrl);
      }

      setFormData(prev => ({
        ...prev,
        image_url: [...prev.image_url, ...newUrls]
      }));

    } catch (error: any) {
      alert('Gagal upload: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // 5. Handle Background Image (Upload)
  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploadingBg(true);
        const file = e.target.files[0];
        const fileName = `backgrounds/${Date.now()}-${Math.random()}.${file.name.split('.').pop()}`;

        const { error: uploadError } = await supabase.storage
            .from('waifu-images')
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from('waifu-images')
            .getPublicUrl(fileName);
            
        setFormData(prev => ({ ...prev, background_image: data.publicUrl }));
    } catch (error: any) {
        alert('Gagal upload background: ' + error.message);
    } finally {
        setUploadingBg(false);
    }
  };

  // 6. Hapus Gambar dari Gallery
  const removeImage = (indexToRemove: number) => {
    setFormData(prev => ({
        ...prev,
        image_url: prev.image_url.filter((_, i) => i !== indexToRemove)
    }));
  };

  // 7. Update Database
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.image_url.length === 0) return alert("Minimal harus ada 1 gambar!");

    setSaving(true);
    const { error } = await supabase
      .from('waifus')
      .update(formData) 
      .eq('id', waifuId);
    setSaving(false);

    if (error) {
      alert("Gagal update: " + error.message);
    } else {
      alert("✅ Data berhasil diperbarui!");
      router.push('/admin/manage');
    }
  };

  if (loading) return <div className="p-10 text-white font-mono animate-pulse tracking-tighter text-center mt-20">SYSTEM_RECOVERING_DATA_ID: {waifuId}...</div>;

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 md:p-10 font-mono flex flex-col md:flex-row gap-10">
      
      {/* --- KOLOM KIRI: FORM EDIT --- */}
      <div className="w-full md:w-1/2">
        <h2 className="text-2xl font-bold mb-6 text-blue-500 border-b border-blue-900 pb-4 tracking-tighter">
          &gt; EDIT_SUBJECT_ID: {waifuId.slice(0,8)}...
        </h2>

        <form onSubmit={handleUpdate} className="space-y-6">
          <div>
            <label className="block text-[10px] text-gray-500 mb-1 tracking-widest">CHARACTER_NAME</label>
            <input type="text" className="w-full bg-black border border-neutral-700 p-3 rounded focus:border-blue-500 outline-none transition-all" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
          </div>

          <div>
            <label className="block text-[10px] text-gray-500 mb-1 tracking-widest">SOURCE_MATERIAL</label>
            <input type="text" className="w-full bg-black border border-neutral-700 p-3 rounded focus:border-blue-500 outline-none transition-all" value={formData.series} onChange={(e) => setFormData({...formData, series: e.target.value})} required />
          </div>

          {/* --- BACKGROUND IMAGE MANAGER (NEW FEATURE) --- */}
          <div className="bg-neutral-900/50 p-4 rounded-xl border border-blue-900/30 space-y-4">
             <label className="block text-xs text-blue-400 font-bold tracking-widest uppercase">Background Image</label>
             <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Paste Background URL..." 
                  className="flex-1 bg-black border border-neutral-700 p-2 rounded text-sm focus:border-blue-500 outline-none"
                  value={formData.background_image}
                  onChange={(e) => setFormData({...formData, background_image: e.target.value})}
                />
             </div>
             <div className="relative border border-dashed border-neutral-700 p-4 rounded-xl text-center hover:border-blue-500 transition-all group">
                <input type="file" accept="image/*" onChange={handleBgUpload} disabled={uploadingBg} className="absolute inset-0 opacity-0 cursor-pointer" />
                <p className="text-[10px] text-gray-500 uppercase">{uploadingBg ? 'UPLOADING_BG...' : 'Upload New Background'}</p>
             </div>
             {formData.background_image && (
                <div className="relative h-20 w-full rounded-lg overflow-hidden border border-neutral-800">
                    <img src={formData.background_image} className="w-full h-full object-cover opacity-50" alt="bg-preview" />
                    <button type="button" onClick={() => setFormData({...formData, background_image: ''})} className="absolute inset-0 bg-red-600/20 hover:bg-red-600/60 transition-all flex items-center justify-center text-[8px] font-bold">REMOVE_BACKGROUND</button>
                </div>
             )}
          </div>

          {/* --- GALLERY MANAGER --- */}
          <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800 space-y-4">
             <label className="block text-xs text-blue-400 font-bold tracking-widest uppercase">Image Gallery ({formData.image_url.length}/10)</label>
             
             {/* Method 1: Input Link */}
             <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Paste Image URL..." 
                  className="flex-1 bg-black border border-neutral-700 p-2 rounded text-sm focus:border-blue-500 outline-none"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                />
                <button type="button" onClick={addImageViaUrl} className="bg-blue-600 hover:bg-blue-500 px-4 rounded text-[10px] font-bold transition-all">ADD_LINK</button>
             </div>

             {/* Method 2: Upload File */}
             <div className="relative border-2 border-dashed border-neutral-700 p-6 rounded-xl text-center hover:border-blue-500 transition-all group">
                <input type="file" multiple accept="image/*" onChange={handleFileUpload} disabled={uploading || formData.image_url.length >= 10} className="absolute inset-0 opacity-0 cursor-pointer" />
                <p className="text-xs text-gray-500 group-hover:text-blue-400">{uploading ? 'UPLOADING...' : 'OR DRAG & DROP / CLICK TO UPLOAD'}</p>
             </div>

             {/* Thumbnail Grid */}
             <div className="grid grid-cols-5 gap-2">
                {formData.image_url.map((url, idx) => (
                    <div key={idx} className="relative group aspect-square bg-black rounded-lg border border-gray-700 overflow-hidden">
                        <img src={url} className="w-full h-full object-cover" alt="thumb" />
                        <button type="button" onClick={() => removeImage(idx)} className="absolute inset-0 bg-red-600/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-bold">REMOVE</button>
                    </div>
                ))}
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-gray-500 mb-1 tracking-widest">THEME_COLOR</label>
              <div className="flex gap-2">
                <input type="color" value={formData.theme_color} onChange={(e) => setFormData({...formData, theme_color: e.target.value})} className="h-10 w-10 bg-transparent cursor-pointer" />
                <input type="text" value={formData.theme_color} onChange={(e) => setFormData({...formData, theme_color: e.target.value})} className="bg-black border border-neutral-700 p-2 rounded w-full uppercase text-xs" />
              </div>
            </div>
            <div className="flex items-center gap-3 bg-neutral-800/50 p-3 rounded border border-neutral-700 mt-4">
               <input type="checkbox" checked={formData.is_featured} onChange={(e) => setFormData({...formData, is_featured: e.target.checked})} className="w-4 h-4 accent-blue-500" id="feat" />
               <label htmlFor="feat" className="text-[10px] font-bold cursor-pointer">PIN_TO_TOP</label>
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <Link href="/admin/manage" className="px-6 py-3 text-xs text-gray-400 hover:text-white transition">CANCEL</Link>
            <button type="submit" disabled={saving || uploading || uploadingBg} className="flex-1 bg-blue-700 hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-blue-900/20">
              {saving ? "UPDATING_CORE..." : "SAVE_CHANGES"}
            </button>
          </div>
        </form>
      </div>

      {/* --- KOLOM KANAN: LIVE PREVIEW (REAL SIZE) --- */}
      <div className="w-full md:w-1/2 flex flex-col items-center justify-center bg-neutral-900/30 rounded-[40px] border border-neutral-800 p-10">
          <h3 className="text-blue-500 text-[10px] tracking-[0.3em] font-bold mb-8">RENDER_PREVIEW_V3.2</h3>
          
          <div 
            className="relative rounded-[30px] overflow-hidden w-[300px] h-[400px] shadow-2xl transition-all duration-500" 
            style={{ 
                border: `2px solid ${formData.theme_color}`, 
                boxShadow: `0 0 40px ${formData.theme_color}30` 
            }}
          >
            {/* BACKGROUND IMAGE LAYER */}
            {formData.background_image && (
                <img 
                    src={formData.background_image} 
                    className="absolute inset-0 w-full h-full object-cover z-0 opacity-40 blur-[2px]" 
                    alt="bg-layer"
                />
            )}

            {/* CHARACTER SLIDESHOW LAYER */}
            {formData.image_url.length > 0 ? (
                formData.image_url.map((img, idx) => (
                    <img key={idx} src={img} className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-in-out z-10 ${idx === previewIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-110'}`} alt="preview" />
                ))
            ) : (
                <div className="absolute inset-0 bg-neutral-800 flex items-center justify-center text-[10px] text-gray-500 z-10">NO_IMAGE_DATA</div>
            )}

            {/* Indicator Dots */}
            {formData.image_url.length > 1 && (
                <div className="absolute top-5 right-5 flex gap-1.5 z-30">
                  {formData.image_url.map((_, idx) => (
                    <div key={idx} className={`h-1 rounded-full transition-all duration-300 ${idx === previewIndex ? 'bg-white w-4' : 'bg-white/30 w-1'}`} />
                  ))}
                </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90 z-20" />
            
            <div className="absolute bottom-8 left-8 right-8 z-30">
                <span className="inline-block px-2 py-1 rounded-md text-[8px] font-bold tracking-widest uppercase mb-3 bg-white/10 backdrop-blur-md border border-white/10" style={{ color: formData.theme_color }}>
                  {formData.series || 'SOURCE_UNKNOWN'}
                </span>
                <h2 className="text-2xl font-black text-white leading-tight tracking-tighter drop-shadow-xl uppercase italic">
                  {formData.name || 'SUBJECT_NAME'}
                </h2>
                <div className="mt-4 flex items-center gap-2 text-[9px] font-bold text-white/50 tracking-[0.2em]">
                    VERIFY_AUTHENTICITY <span className="animate-pulse">_</span>
                </div>
            </div>

            {formData.is_featured && (
                <div className="absolute top-5 left-5 bg-yellow-400 text-black p-1.5 rounded-full shadow-lg z-30">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                </div>
            )}
          </div>
      </div>
    </div>
  );
}