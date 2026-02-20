"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function AddWaifuPage() {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  
  const [existingSeries, setExistingSeries] = useState<string[]>([]);
  const [filteredSeries, setFilteredSeries] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    series: '',
    image_url: [] as string[],
    theme_color: '#ec4899', // Warna Default Pink
    is_featured: false 
  });

  const [previewIndex, setPreviewIndex] = useState(0);

  useEffect(() => {
    const fetchSeries = async () => {
      const { data } = await supabase.from('waifus').select('series');
      if (data) {
        const uniqueSeries = Array.from(new Set(data.map(item => item.series)));
        setExistingSeries(uniqueSeries.sort());
      }
    };
    fetchSeries();
  }, []);

  useEffect(() => {
    if (formData.image_url.length <= 1) return;
    const interval = setInterval(() => {
        setPreviewIndex(prev => (prev + 1) % formData.image_url.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [formData.image_url.length]);

  const handleSeriesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    setFormData({ ...formData, series: inputVal });
    if (inputVal.length > 0) {
      const filtered = existingSeries.filter((s) => s.toLowerCase().includes(inputVal.toLowerCase()));
      setFilteredSeries(filtered);
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  };

  const selectSeries = (seriesName: string) => {
    setFormData({ ...formData, series: seriesName });
    setShowDropdown(false);
  };

  const addImageViaUrl = () => {
    if (!imageUrlInput) return;
    if (formData.image_url.length >= 10) return alert("Max 10 images!");
    setFormData(prev => ({ ...prev, image_url: [...prev.image_url, imageUrlInput] }));
    setImageUrlInput('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      if (formData.image_url.length + e.target.files.length > 10) return alert("Max 10 images!");

      setUploading(true);
      const newUrls: string[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        const fileName = `${Date.now()}-${Math.random()}.${file.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage.from('waifu-images').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('waifu-images').getPublicUrl(fileName);
        newUrls.push(data.publicUrl);
      }
      setFormData(prev => ({ ...prev, image_url: [...prev.image_url, ...newUrls] }));
    } catch (error: any) {
      alert('Gagal: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setFormData(prev => ({ ...prev, image_url: prev.image_url.filter((_, i) => i !== indexToRemove) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.image_url.length === 0) return alert("Minimal 1 gambar!");
    setLoading(true);
    const { error } = await supabase.from('waifus').insert([formData]);
    setLoading(false);
    if (error) alert(error.message);
    else {
      alert("✅ Berhasil disimpan ke Database!");
      setFormData({ name: '', series: '', image_url: [], theme_color: '#ec4899', is_featured: false });
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 md:p-10 font-mono flex flex-col md:flex-row gap-10">
      <div className="w-full md:w-1/2">
        <h2 className="text-2xl font-bold mb-6 text-pink-500 border-b border-pink-900 pb-4 tracking-tighter uppercase italic">&gt; ADD_NEW_WAIFU</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Identity Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-[10px] text-gray-500 mb-1 tracking-widest uppercase font-bold">Character Name</label>
                <input type="text" placeholder="Ex: Makima" className="w-full bg-black border border-neutral-700 p-3 rounded-xl focus:border-pink-500 outline-none transition-all text-sm" value={formData.name} onChange={(e)=>setFormData({...formData, name: e.target.value})} required />
            </div>

            <div className="relative">
                <label className="block text-[10px] text-gray-500 mb-1 tracking-widest uppercase font-bold">Source Material</label>
                <input type="text" placeholder="Anime/Game Name..." className="w-full bg-black border border-neutral-700 p-3 rounded-xl focus:border-pink-500 outline-none transition-all text-sm" value={formData.series} onChange={handleSeriesChange} onFocus={() => { if(formData.series) setShowDropdown(true) }} onBlur={() => setTimeout(() => setShowDropdown(false), 200)} autoComplete="off" required />
                {showDropdown && filteredSeries.length > 0 && (
                    <div className="absolute z-50 left-0 mt-1 w-full bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl max-h-40 overflow-y-auto">
                        {filteredSeries.map((s, idx) => (
                            <div key={idx} onMouseDown={() => selectSeries(s)} className="p-3 text-xs hover:bg-pink-600 cursor-pointer border-b border-neutral-800 last:border-0">{s}</div>
                        ))}
                    </div>
                )}
            </div>
          </div>

          {/* --- FITUR WARNA & PIN (KEMBALI HADIR) --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-[10px] text-gray-500 mb-1 tracking-widest uppercase font-bold">Theme Color</label>
                <div className="flex gap-2 items-center bg-black border border-neutral-700 p-1.5 rounded-xl">
                    <input type="color" value={formData.theme_color} onChange={(e) => setFormData({...formData, theme_color: e.target.value})} className="h-8 w-10 bg-transparent cursor-pointer border-none" />
                    <input type="text" value={formData.theme_color} onChange={(e) => setFormData({...formData, theme_color: e.target.value})} className="bg-transparent text-xs w-full outline-none uppercase font-bold text-gray-400" maxLength={7} />
                </div>
            </div>

            <div className="flex flex-col">
                <label className="block text-[10px] text-gray-500 mb-1 tracking-widest uppercase font-bold">Visibility Status</label>
                <label className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 p-3 rounded-xl cursor-pointer hover:border-pink-500 transition-all select-none">
                    <input type="checkbox" checked={formData.is_featured} onChange={(e) => setFormData({...formData, is_featured: e.target.checked})} className="w-4 h-4 accent-pink-500" />
                    <span className="text-[10px] font-bold tracking-tighter uppercase">Pin to Featured</span>
                </label>
            </div>
          </div>
          
          {/* Gallery Section */}
          <div className="bg-neutral-900/50 p-4 rounded-2xl border border-neutral-800 space-y-4">
             <label className="block text-xs text-blue-400 font-bold uppercase tracking-widest">Live Gallery ({formData.image_url.length}/10)</label>
             <div className="flex gap-2">
                <input type="text" placeholder="Paste URL..." className="flex-1 bg-black border border-neutral-700 p-2 rounded-lg text-sm focus:border-pink-500 outline-none" value={imageUrlInput} onChange={(e) => setImageUrlInput(e.target.value)} />
                <button type="button" onClick={addImageViaUrl} className="bg-blue-600 hover:bg-blue-500 px-4 rounded-lg text-[10px] font-bold transition-all">ADD_LINK</button>
             </div>
             <div className="relative border-2 border-dashed border-neutral-800 p-6 rounded-2xl text-center hover:border-pink-500 transition-colors group cursor-pointer">
                <input type="file" multiple accept="image/*" onChange={handleFileUpload} disabled={uploading || formData.image_url.length >= 10} className="absolute inset-0 opacity-0 cursor-pointer" />
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">{uploading ? 'SYSTEM_UPLOADING...' : 'Drop files or click to upload'}</p>
             </div>
             <div className="grid grid-cols-5 gap-2">
                {formData.image_url.map((url, idx) => (
                    <div key={idx} className="relative group aspect-square bg-black rounded-lg border border-neutral-800 overflow-hidden shadow-lg">
                        <img src={url} className="w-full h-full object-cover" alt="thumb" />
                        <button type="button" onClick={() => removeImage(idx)} className="absolute inset-0 bg-red-600/90 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[8px] font-black uppercase transition-all">Hapus</button>
                    </div>
                ))}
             </div>
          </div>

          <div className="flex gap-4">
            <Link href="/admin" className="px-6 py-3 text-xs text-gray-500 hover:text-white flex items-center uppercase font-bold">Cancel</Link>
            <button type="submit" disabled={loading || uploading} className="flex-1 bg-pink-600 hover:bg-pink-500 py-3 rounded-xl font-bold transition-all shadow-lg shadow-pink-900/20 uppercase tracking-widest text-sm">
                {loading ? "INITIALIZING_DATA..." : "Confirm & Save"}
            </button>
          </div>
        </form>
      </div>

      {/* Preview Box - Real Time Style Sync */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-neutral-900/20 rounded-3xl p-10 border border-neutral-800/50">
          <div className="relative rounded-[35px] overflow-hidden w-[300px] h-[400px] shadow-2xl transition-all duration-500" style={{ border: `3px solid ${formData.theme_color}`, boxShadow: `0 0 40px ${formData.theme_color}30` }}>
            {formData.image_url.length > 0 ? (
                formData.image_url.map((img, idx) => (
                    <img key={idx} src={img} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${idx === previewIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-110'}`} alt="preview" />
                ))
            ) : (
                <div className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-600 tracking-widest bg-neutral-900">WAITING_FOR_DATA...</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />
            <div className="absolute bottom-8 left-8 right-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: formData.theme_color }}>{formData.series || 'SOURCE_ORIGIN'}</p>
                <h2 className="text-2xl font-black tracking-tighter text-white uppercase italic leading-none drop-shadow-xl">{formData.name || 'SUBJECT_NAME'}</h2>
            </div>
            {formData.is_featured && (
                <div className="absolute top-6 left-6 bg-yellow-400 text-black p-1.5 rounded-full shadow-lg z-20">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                </div>
            )}
          </div>
      </div>
    </div>
  );
}