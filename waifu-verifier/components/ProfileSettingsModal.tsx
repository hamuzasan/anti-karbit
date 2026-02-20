"use client";
import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { motion, AnimatePresence } from 'framer-motion';
import Cropper from 'react-easy-crop';

// --- SUPABASE CLIENT ---
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- ICONS ---
const IconCamera = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const IconCheck = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>;
const IconImage = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;

export default function ProfileSettingsModal({ isOpen, onClose, userId }: { isOpen: boolean, onClose: () => void, userId: string }) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [stats, setStats] = useState({ totalPoints: 0, merchCount: 0 });
  const [merchImages, setMerchImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    bio: '',
    social_fb: '',
    social_tiktok: '',
    avatar_url: ''
  });

  // --- STATE CROPPER ---
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const fetchProfile = async () => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (data) {
        setFormData({
          username: data.username || '',
          name: data.name || '',
          bio: data.bio || '',
          social_fb: data.social_fb || '',
          social_tiktok: data.social_tiktok || '',
          avatar_url: data.avatar_url || ''
        });
      }
    } catch (err) { console.error(err); }
  };

  const fetchUserStatsAndGallery = async () => {
    try {
      const { data: dbData } = await supabase.from('user_collections').select('image_url, is_valid').eq('user_id', userId);
      const { data: storageFiles } = await supabase.storage.from('waifu-gallery').list(userId);

      let finalImages: string[] = [];
      if (dbData && dbData.length > 0) {
        finalImages = dbData.map(d => d.image_url).filter((url): url is string => !!url);
        setStats(prev => ({ ...prev, merchCount: dbData.filter(i => i.is_valid).length }));
      } else if (storageFiles && storageFiles.length > 0) {
        finalImages = storageFiles.map(file => supabase.storage.from('waifu-gallery').getPublicUrl(`${userId}/${file.name}`).data.publicUrl);
        setStats(prev => ({ ...prev, merchCount: storageFiles.length }));
      }
      setMerchImages(finalImages);

      const { data: progData } = await supabase.from('user_progress').select('total_points_accumulated').eq('user_id', userId);
      setStats(prev => ({ ...prev, totalPoints: progData?.reduce((acc, curr) => acc + (curr.total_points_accumulated || 0), 0) || 0 }));
    } catch (err) { console.error(err); }
    setFetching(false);
  };

  useEffect(() => {
    if (isOpen && userId) {
      fetchProfile();
      fetchUserStatsAndGallery();
    }
  }, [isOpen, userId]);

  // --- CROPPER ACTIONS ---
  const onCropComplete = useCallback((_area: any, pixels: any) => { setCroppedAreaPixels(pixels); }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setImageToCrop(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const executeCrop = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;
    setLoading(true);
    try {
      const image = new Image();
      image.src = imageToCrop;
      await new Promise(r => image.onload = r);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 400; canvas.height = 400;
      ctx?.drawImage(image, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 0, 0, 400, 400);
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const fileName = `${userId}-${Date.now()}.jpg`;
        const { error } = await supabase.storage.from('avatars').upload(fileName, blob);
        if (!error) {
          const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
          setFormData(prev => ({ ...prev, avatar_url: data.publicUrl }));
          setImageToCrop(null);
        }
        setLoading(false);
      }, 'image/jpeg', 0.9);
    } catch (err) { setLoading(false); }
  };

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase.from('profiles').update({ ...formData, updated_at: new Date().toISOString() }).eq('id', userId);
    if (!error) { onClose(); window.location.reload(); }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#0a0a0a] border border-neutral-800 w-full max-w-2xl rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* CROPPER OVERLAY */}
        <AnimatePresence>
          {imageToCrop && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[100] bg-black p-6 flex flex-col">
              <div className="relative flex-1 rounded-3xl overflow-hidden"><Cropper image={imageToCrop} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} cropShape="round" showGrid={false} /></div>
              <div className="flex gap-4 mt-6">
                <button onClick={() => setImageToCrop(null)} className="flex-1 py-4 bg-neutral-900 rounded-2xl text-[10px] font-black uppercase text-slate-500">Cancel</button>
                <button onClick={executeCrop} disabled={loading} className="flex-[2] py-4 bg-pink-600 rounded-2xl text-[10px] font-black uppercase text-white">{loading ? 'Processing...' : 'Save Avatar'}</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-6 md:p-10 overflow-y-auto custom-scrollbar">
          <header className="text-center mb-10">
            <p className="text-[10px] font-black text-pink-500 uppercase tracking-[0.5em] mb-2">Protocol_Identity</p>
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Settings</h2>
          </header>

          {fetching ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4"><div className="w-10 h-10 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div></div>
          ) : (
            <div className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col items-center justify-center p-6 bg-white/5 rounded-[35px] border border-white/5 relative group">
                  <div className="relative w-28 h-28 rounded-full border-4 border-neutral-800 overflow-hidden bg-neutral-900 group-hover:scale-105 transition-transform">
                    {formData.avatar_url ? <img src={formData.avatar_url} className="w-full h-full object-cover" /> : <div className="text-3xl flex h-full items-center justify-center">👤</div>}
                    <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer"><IconCamera /><input type="file" accept="image/*" className="hidden" onChange={handleFileChange} /></label>
                  </div>
                  <p className="text-[9px] font-black text-slate-500 uppercase mt-4 tracking-widest">Profile_Image</p>
                </div>
                <div className="md:col-span-2 space-y-4">
                   <div className="bg-neutral-900/50 p-6 rounded-[30px] border border-white/5 flex justify-between">
                     <div><p className="text-[9px] font-black text-slate-500 uppercase">Power</p><p className="text-3xl font-black text-yellow-400 font-mono">{stats.totalPoints.toLocaleString()}</p></div>
                     <div className="text-right"><p className="text-[9px] font-black text-slate-500 uppercase">Vault</p><p className="text-3xl font-black text-pink-500 font-mono">{stats.merchCount}</p></div>
                   </div>
                   <div className="bg-neutral-900/50 p-4 rounded-[30px] border border-white/5">
                      <label className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1 block">Bio_Status</label>
                      <textarea value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} className="w-full bg-transparent p-2 text-slate-300 text-xs outline-none h-16 resize-none" placeholder="Say something..." />
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div><label className="text-[9px] font-black text-slate-500 uppercase ml-3 mb-1 block">Username</label><input value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full bg-neutral-900/50 border border-neutral-800 p-4 rounded-2xl text-slate-200 font-bold outline-none text-sm" /></div>
                <div><label className="text-[9px] font-black text-slate-500 uppercase ml-3 mb-1 block">Display Name</label><input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-neutral-900/50 border border-neutral-800 p-4 rounded-2xl text-slate-200 font-bold outline-none text-sm" /></div>
              </div>

              {/* SOCIAL MEDIA SECTION */}
              <div className="space-y-4 pt-6 border-t border-white/5">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-pink-500 italic uppercase tracking-tighter">"Agar orang lain tau sosial media pemilik waifu nya"</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div><label className="text-[9px] font-black text-blue-500 uppercase ml-3 mb-1 block">Facebook</label><input value={formData.social_fb} onChange={e => setFormData({...formData, social_fb: e.target.value})} className="w-full bg-neutral-900/50 border border-neutral-800 p-4 rounded-2xl text-white text-xs outline-none" placeholder="Link Profile" /></div>
                  <div><label className="text-[9px] font-black text-pink-500 uppercase ml-3 mb-1 block">TikTok</label><input value={formData.social_tiktok} onChange={e => setFormData({...formData, social_tiktok: e.target.value})} className="w-full bg-neutral-900/50 border border-neutral-800 p-4 rounded-2xl text-white text-xs outline-none" placeholder="@username" /></div>
                </div>
              </div>

              {/* GALLERY */}
              <div>
                <div className="flex items-center gap-3 mb-4"><span className="text-pink-500"><IconImage /></span><h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Vault_Gallery</h3><div className="flex-1 h-px bg-neutral-800"></div></div>
                <div className="grid grid-cols-5 gap-2">
                  {merchImages.length > 0 ? merchImages.map((url, i) => (
                    <motion.div whileHover={{ scale: 1.05 }} key={i} onClick={() => setSelectedImage(url)} className="aspect-square rounded-xl overflow-hidden border border-white/5 bg-neutral-900 cursor-zoom-in"><img src={url} className="w-full h-full object-cover" /></motion.div>
                  )) : <div className="col-span-5 py-8 text-center text-[9px] text-slate-600 border border-dashed border-neutral-800 rounded-3xl uppercase">Empty Vault</div>}
                </div>
              </div>

              <div className="flex gap-4 sticky bottom-0 bg-[#0a0a0a] py-4 border-t border-white/5">
                <button onClick={onClose} className="flex-1 py-4 rounded-2xl bg-neutral-900 text-slate-500 font-black text-[10px] uppercase tracking-[0.2em]">Discard</button>
                <button onClick={handleSave} disabled={loading} className="flex-[2] py-4 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 text-white font-black text-[10px] uppercase shadow-lg flex items-center justify-center gap-2 tracking-[0.2em]">{loading ? 'Updating...' : <><IconCheck /> Save_Changes</>}</button>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* LIGHTBOX */}
      <AnimatePresence>{selectedImage && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedImage(null)} className="fixed inset-0 z-[1000] bg-black/95 flex items-center justify-center p-8 cursor-zoom-out"><motion.img initial={{ scale: 0.9 }} animate={{ scale: 1 }} src={selectedImage} className="max-w-full max-h-full rounded-3xl shadow-2xl border border-white/10" /></motion.div>}</AnimatePresence>
      <style jsx global>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }`}</style>
    </div>
  );
}