import AdminGuard from '@/components/AdminGuard';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Semua halaman (page.tsx) di dalam folder /admin 
    // akan otomatis masuk sebagai "children" di sini dan dilindungi oleh AdminGuard
    <AdminGuard>
      {children}
    </AdminGuard>
  );
}