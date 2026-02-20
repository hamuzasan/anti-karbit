import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import sharp from 'sharp';

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  try {
    if (!apiKey) throw new Error("API_KEY_MISSING");
    const genAI = new GoogleGenerativeAI(apiKey);

    // 1. Setup Supabase
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
             try {
                cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
             } catch {}
          },
        },
      }
    );

    // 2. Auth Check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // 3. Terima Data Form
    const formData = await req.formData();
    const file = formData.get('image') as File;
    const waifuName = formData.get('waifuName') as string;
    const waifuId = formData.get('waifuId') as string;

    if (!file || !waifuId) throw new Error("File atau Waifu ID tidak lengkap.");

    // 4. Kompresi Gambar (Sharp)
    const fileBuffer = await file.arrayBuffer();
    const compressedBuffer = await sharp(Buffer.from(fileBuffer))
      .resize(600, null, { withoutEnlargement: true }) 
      .jpeg({ quality: 60 })
      .toBuffer();
    
    const base64Candidate = compressedBuffer.toString('base64');

    // 5. Ambil 5 History untuk Cek Duplikasi
    const { data: recentCollections } = await supabase
      .from('user_collections')
      .select('image_url')
      .eq('user_id', user.id)
      .eq('waifu_id', waifuId)
      .eq('is_valid', true) 
      .order('created_at', { ascending: false })
      .limit(5);

    const historyImagesParts: any[] = [];
    if (recentCollections && recentCollections.length > 0) {
      const results = await Promise.all(recentCollections.map(async (col) => {
        try {
          const res = await fetch(col.image_url!);
          if (!res.ok) return null;
          const buf = await res.arrayBuffer();
          const resized = await sharp(Buffer.from(buf)).resize(400).jpeg({ quality: 50 }).toBuffer();
          return { inlineData: { data: resized.toString('base64'), mimeType: "image/jpeg" } };
        } catch { return null; }
      }));
      results.forEach(r => { if (r) historyImagesParts.push(r); });
    }

    // 6. Setup Gemini (Flash 2.5)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash", 
      generationConfig: { responseMimeType: "application/json" } 
    });

    const historyCount = historyImagesParts.length;

    // --- PROMPT SEMPURNA: STRICT & ANTI-HALUSINASI ---
    const prompt = `
      ROLE: Pakar Autentikasi Merchandise Anime & Detektif Duplikasi.
      
      KONTEKS:
      - GAMBAR 1: Foto merchandise baru yang sedang diperiksa (CANDIDATE).
      - GAMBAR 2 dst: Adalah data history koleksi user (${historyCount} foto).
      - NAMA KARAKTER: "${waifuName}".

      TUGAS ANDA (WAJIB PATUH):
      1. AUTENTIKASI (Hanya Gambar 1):
         - Apakah ini foto layar (monitor/HP)? -> REJECT.
         - Apakah ini stok foto internet (background putih polos/watermark)? -> REJECT.
         - Apakah benar karakter "${waifuName}"? -> Jika salah, REJECT.
      
      2. DETEKSI DUPLIKAT (SANGAT KRITIS):
         - JIKA JUMLAH GAMBAR HISTORY ADALAH 0: Maka "is_duplicate" HARUS false dan "similarity_score" HARUS 0.
         - JIKA ADA GAMBAR HISTORY: Bandingkan Gambar 1 dengan semua gambar history.
         - Duplikat terjadi jika: Objeknya sama, pose sama, sudut foto sama, atau pencahayaan identik (artinya user upload foto yang sama berulang kali).
         - "similarity_score" 0-100. Jika > 85, anggap duplikat.

      3. VALUASI:
         - Estimasi harga barang dalam Rupiah (IDR).

      OUTPUT HARUS JSON:
      {
        "valid": boolean,
        "reject_reason": "Alasan dalam Bahasa Indonesia (kosongkan jika valid)",
        "similarity_score": number,
        "is_duplicate": boolean,
        "total_value_idr": number,
        "items_detected": ["Nama barang 1", "Nama barang 2"]
      }
    `;

    const contentParts = [
      { inlineData: { data: base64Candidate, mimeType: "image/jpeg" } },
      ...historyImagesParts,
      { text: prompt }
    ];

    const result = await model.generateContent(contentParts);
    const analysis = JSON.parse(result.response.text());

    // --- FILTERING ---
    if (!analysis.valid) {
      return NextResponse.json({ success: false, message: analysis.reject_reason || "Gambar ditolak AI." });
    }

    if (historyCount > 0 && (analysis.is_duplicate || analysis.similarity_score > 85)) {
       return NextResponse.json({ 
          success: false, 
          message: `Woi, jangan upload foto yang sama! (Kemiripan ${analysis.similarity_score}%)` 
       });
    }

    // 7. Kalkulasi Poin
    const val = analysis.total_value_idr || 0;
    let points = 20; 
    if (val >= 500000) points = 200;
    else if (val >= 300000) points = 110;
    else if (val >= 100000) points = 70;

    // 8. Upload ke Storage
    const fileName = `${Date.now()}.jpg`;
    const filePath = `${user.id}/${waifuId}/${fileName}`;
    const { error: storageErr } = await supabase.storage.from('waifu-gallery').upload(filePath, compressedBuffer);
    if (storageErr) throw new Error("Storage Error: " + storageErr.message);
    
    const { data: { publicUrl } } = supabase.storage.from('waifu-gallery').getPublicUrl(filePath);

    // 9. INSERT ke 'user_collections' (Sesuai Skema Kamu)
    const { error: colErr } = await supabase.from('user_collections').insert({
      user_id: user.id,
      waifu_id: waifuId,
      image_url: publicUrl,
      ai_analysis: JSON.stringify(analysis),
      estimated_value: val,
      points_awarded: points,
      is_valid: true
    });

    if (colErr) throw new Error("Gagal simpan koleksi: " + colErr.message);

    // 10. FETCH PROGRESS (Sesuai Skema Kamu - NO UPDATED_AT)
    const { data: pData } = await supabase
      .from('user_progress')
      .select('quiz_points, collection_points, total_points_accumulated, level_cleared')
      .eq('waifu_id', waifuId)
      .eq('user_id', user.id)
      .maybeSingle();

    const qPoints = pData?.quiz_points || 0;
    const cPoints = pData?.collection_points || 0;
    const lCleared = pData?.level_cleared || 0;
    
    const newCPoints = cPoints + points;
    const newTotal = qPoints + newCPoints;

    // 11. UPSERT PROGRESS (HANYA KOLOM YANG ADA DI SQL KAMU)
    // Kolom: id (auto), user_id, waifu_id, level_cleared, total_points_accumulated, quiz_points, collection_points
    const { error: upsertErr } = await supabase.from('user_progress').upsert({
      user_id: user.id, 
      waifu_id: waifuId,
      level_cleared: lCleared,
      quiz_points: qPoints,
      collection_points: newCPoints,
      total_points_accumulated: newTotal
    }, { onConflict: 'user_id, waifu_id' });

    if (upsertErr) {
      console.error("❌ UPSERT ERROR:", upsertErr.message);
      return NextResponse.json({ success: false, message: "Sync Progress Gagal: " + upsertErr.message });
    }

    return NextResponse.json({ 
      success: true, 
      points, 
      value: val, 
      image_url: publicUrl 
    });

  } catch (error: any) {
    console.error("🚨 SYSTEM ERROR:", error.message);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}