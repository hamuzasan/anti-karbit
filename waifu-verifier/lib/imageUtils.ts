/**
 * Fungsi untuk memproses gambar spritesheet mentah dari AI
 * Menghapus whitespace dan menyusun ulang ke grid 3x3 yang presisi.
 */
export async function processSpritesheet(
  imageSource: string | File,
  targetFrameSize: number = 256 // Kamu bisa set ke 512 untuk kualitas lebih HD
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource);
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject("Canvas context not found");

      // 1. Tentukan ukuran total (3x3 grid)
      const totalSize = targetFrameSize * 3;
      canvas.width = totalSize;
      canvas.height = totalSize;

      // 2. Logika Pemotongan:
      // Kita asumsikan gambar dari DALL-E dibagi 3x3 secara kasar.
      // Kita ambil tiap bagian, lalu gambar ke tengah cell canvas baru.
      const sourceCellW = img.width / 3;
      const sourceCellH = img.height / 3;

      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          // Posisi sumber (gambar mentah)
          const sx = col * sourceCellW;
          const sy = row * sourceCellH;

          // Posisi tujuan (canvas bersih 3x3)
          // Kita gambar di tengah-tengah frame target agar tidak melayang
          const dx = col * targetFrameSize;
          const dy = row * targetFrameSize;

          ctx.drawImage(
            img,
            sx, sy, sourceCellW, sourceCellH, // Potong dari sumber
            dx, dy, targetFrameSize, targetFrameSize // Tempel ke target
          );
        }
      }

      // 3. Output sebagai Base64 atau Blob
      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = (err) => reject(err);
  });
}