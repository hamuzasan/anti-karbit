"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuthModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(''); // Untuk Register
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    setLoading(true);
    if (isRegister) {
      const { error } = await supabase.auth.signUp({
        email, password, options: { data: { username } }
      });
      if (error) alert(error.message);
      else alert("Registrasi Berhasil!");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
      else window.location.reload(); // Refresh untuk ambil session baru
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl animate-in zoom-in duration-300">
        <h2 className="text-2xl font-black text-slate-900 uppercase italic mb-6 tracking-tighter text-center">
          {isRegister ? 'New_Registration' : 'System_Access'}
        </h2>
        
        <div className="space-y-4">
          {isRegister && (
            <input className="w-full bg-slate-50 p-4 rounded-2xl outline-none border-2 border-transparent focus:border-blue-100 font-bold" 
                   placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
          )}
          <input className="w-full bg-slate-50 p-4 rounded-2xl outline-none border-2 border-transparent focus:border-blue-100 font-bold" 
                 placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input className="w-full bg-slate-50 p-4 rounded-2xl outline-none border-2 border-transparent focus:border-blue-100 font-bold" 
                 type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
          
          <button onClick={handleAuth} disabled={loading} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">
            {loading ? 'Processing...' : isRegister ? 'Join_Now' : 'Authenticate'}
          </button>
          
          <button onClick={() => setIsRegister(!isRegister)} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {isRegister ? 'Sudah punya akun? Login' : 'Belum punya akun? Daftar'}
          </button>
          <button onClick={onClose} className="w-full text-[10px] font-black text-red-300 uppercase tracking-widest mt-2">Batal</button>
        </div>
      </div>
    </div>
  );
}