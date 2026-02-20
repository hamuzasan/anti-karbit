"use client";
import Link from 'next/link';

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white p-10 font-mono flex flex-col items-center justify-center">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-pink-500 tracking-tighter inline-block relative">
          ADMIN_COMMAND_CENTER
          <div className="absolute -bottom-2 left-0 w-full h-1 bg-pink-500"></div>
        </h1>
        <p className="text-[10px] text-gray-500 mt-4 tracking-[0.5em] uppercase">Waifu_Verifier_Core_System</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl w-full">
        
        {/* Menu 1: Tambah Soal Quiz */}
        <Link href="/admin/questions" className="p-8 border border-neutral-800 hover:border-pink-500 bg-neutral-900/50 hover:bg-neutral-800/50 rounded-2xl transition-all group">
            <h2 className="text-xl font-bold mb-2 group-hover:text-pink-400">&gt; QUIZ_DATABASE</h2>
            <p className="text-gray-500 text-[10px] uppercase tracking-widest">Manage verification questions.</p>
        </Link>

        {/* Menu 2: Tambah Waifu */}
        <Link href="/admin/waifus" className="p-8 border border-neutral-800 hover:border-pink-500 bg-neutral-900/50 hover:bg-neutral-800/50 rounded-2xl transition-all group">
            <h2 className="text-xl font-bold mb-2 group-hover:text-pink-400">&gt; ADD_SUBJECT</h2>
            <p className="text-gray-500 text-[10px] uppercase tracking-widest">Register new waifu entity.</p>
        </Link>

        {/* Menu 3: Manage Data */}
        <Link href="/admin/manage" className="p-8 border border-neutral-800 hover:border-blue-500 bg-neutral-900/50 hover:bg-neutral-800/50 rounded-2xl transition-all group">
            <h2 className="text-xl font-bold mb-2 group-hover:text-blue-400">&gt; MANAGE_DATA</h2>
            <p className="text-gray-500 text-[10px] uppercase tracking-widest">Edit profiles, gallery, & backgrounds.</p>
        </Link>

        {/* --- OPTIMIZER (TETAP ADA) --- */}
        <Link href="/admin/optimizer" className="p-8 border border-neutral-800 hover:border-orange-500 bg-neutral-900/50 hover:bg-neutral-800/50 rounded-2xl transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity"><span className="text-4xl">⚡</span></div>
            <h2 className="text-xl font-bold mb-2 text-orange-500/80 group-hover:text-orange-400">&gt; STORAGE_OPTIMIZER</h2>
            <p className="text-gray-500 text-[10px] uppercase tracking-widest">Maintain 1MB limit for Shrine/Gallery.</p>
        </Link>

        {/* Menu 5: Card Visuals */}
        <Link href="/admin/cards" className="p-8 border border-neutral-800 hover:border-purple-500 bg-neutral-900/50 hover:bg-neutral-800/50 rounded-2xl transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity"><span className="text-4xl">🖼️</span></div>
            <h2 className="text-xl font-bold mb-2 group-hover:text-purple-400">&gt; CARD_VISUALS</h2>
            <p className="text-gray-500 text-[10px] uppercase tracking-widest">Visuals for verification tiers.</p>
        </Link>

        {/* Menu 6: Shrine Management (Opsional, jika ada halaman admin shrine) */}
        {/* Jika belum ada, bisa dihapus atau diganti */}
        <Link href="/admin/shrine" className="p-8 border border-neutral-800 hover:border-green-500 bg-neutral-900/50 hover:bg-neutral-800/50 rounded-2xl transition-all group">
            <h2 className="text-xl font-bold mb-2 group-hover:text-green-400">&gt; SHRINE_LOGS</h2>
            <p className="text-gray-500 text-[10px] uppercase tracking-widest">Review user offerings.</p>
        </Link>

      </div>
      
      <Link href="/" className="mt-20 text-[10px] text-gray-600 hover:text-pink-500 transition-colors tracking-[0.3em] uppercase">
        [ RETURN_TO_SURFACE ]
      </Link>
      <Link href="/admin/settings" className="p-8 border border-neutral-800 hover:border-yellow-500 bg-neutral-900/50 hover:bg-neutral-800/50 rounded-2xl transition-all group">
    <h2 className="text-xl font-bold mb-2 group-hover:text-yellow-400">&gt; GLOBAL_CONFIG</h2>
    <p className="text-gray-500 text-[10px] uppercase tracking-widest">Set Home Background & App Vars.</p>
</Link>
    </div>
  );
}