import { Metadata } from 'next';
import { redirect } from 'next/navigation';

type Props = {
  params: { id: string }
}

// Fungsi ini yang bertugas memberi tahu Facebook gambar mana yang harus ditampilkan
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const imageId = params.id;
  
  // URL public dari bucket Supabase kamu
  // GANTI tulisan URL_SUPABASE_KAMU dengan URL proyekmu (ada di Supabase > Settings > API > Project URL)
  const imageUrl = `https://bbdcnsyksnjnjjuccsbp.supabase.co/storage/v1/object/public/share-cards/${imageId}.png`;

  return {
    title: 'Lisensi Waifu | Anti-Karbit',
    description: 'Lihat status rank dan koleksiku di Anti-Karbit! Ada yang berani adu mekanik? 👑🔥',
    openGraph: {
      title: 'Lisensi Waifu | Anti-Karbit',
      description: 'Lihat status rank dan koleksiku di Anti-Karbit! Ada yang berani adu mekanik? 👑🔥',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: 'Kartu Lisensi Waifu',
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Lisensi Waifu | Anti-Karbit',
      description: 'Lihat status rank dan koleksiku di Anti-Karbit! 👑🔥',
      images: [imageUrl],
    },
  }
}

// Saat teman dari Facebook ngeklik link tersebut, mereka akan langsung diarahkan ke halaman utama web kamu
export default function SharePage() {
  redirect('/');
}