"use client";
import React from 'react';

interface FacebookShareProps {
  url: string; // URL halaman yang mau di-share
}

export default function FacebookShareButton({ url }: FacebookShareProps) {
  const handleShare = () => {
    // Membuka jendela dialog share bawaan Facebook
    const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    
    // Popup ukuran standar agar terlihat profesional (tidak buka tab full baru)
    window.open(fbShareUrl, 'facebook-share-dialog', 'width=600,height=400');
  };

  return (
    <button 
      onClick={handleShare}
      className="flex items-center justify-center gap-2 bg-[#1877F2]/10 hover:bg-[#1877F2] text-[#1877F2] hover:text-white border border-[#1877F2]/30 px-5 py-3 rounded-2xl transition-all group flex-1 shadow-lg"
    >
      {/* Icon Facebook Resmi SVG */}
      <svg className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" viewBox="0 0 320 512">
        <path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z"/>
      </svg>
      <span className="text-[10px] font-black uppercase tracking-widest">Share ke FB</span>
    </button>
  );
}