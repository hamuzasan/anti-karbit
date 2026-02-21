// Lokasi: components/AdminGuard.tsx
"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase'; // Sesuaikan path import supabase-mu

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAdminClearance = async () => {
      // 1. Cek apakah ada user yang login
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.replace('/'); // Tendang ke home jika belum login
        return;
      }

      // 2. Cek Role user di database
      // Asumsi tabelmu bernama 'users' dan kolomnya 'role'
      // Ganti 'users' dengan nama tabel kamu jika berbeda (misal: 'profiles')
      const { data: userData, error } = await supabase
        .from('profiles') 
        .select('role')
        .eq('id', session.user.id)
        .single();

      // 3. Validasi Role
      if (userData?.role === 'admin') {
        setIsAuthorized(true); // Izinkan masuk
      } else {
        router.replace('/'); // Tendang ke home jika bukan admin
      }
    };

    checkAdminClearance();
  }, [router]);

  // Tampilan loading keren ala terminal selagi mengecek database
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-pink-500 font-mono">
        <div className="w-10 h-10 border-4 border-neutral-800 border-t-pink-500 rounded-full animate-spin mb-4"></div>
        <p className="text-xs tracking-[0.3em] uppercase animate-pulse">
          VERIFYING_ADMIN_CLEARANCE...
        </p>
      </div>
    );
  }

  // Jika aman, render halaman aslinya
  return <>{children}</>;
}