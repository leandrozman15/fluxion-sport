/**
 * Compress an image file to a target max size while preserving quality.
 * Uses canvas to resize and re-encode as JPEG/WebP.
 * 
 * @param file - The image File object
 * @param maxWidth - Max width in pixels (default 1200)
 * @param maxHeight - Max height in pixels (default 1200)
 * @param quality - JPEG/WebP quality 0-1 (default 0.82)
 * @returns base64 data URL of the compressed image
 */
export function compressImage(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Error reading file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Error loading image"));
      img.onload = () => {
        let { width, height } = img;

        // Scale down if exceeds max dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context unavailable"));
          return;
        }

        // High-quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Try WebP first (smaller), fallback to JPEG
        let result = canvas.toDataURL("image/webp", quality);
        if (!result.startsWith("data:image/webp")) {
          result = canvas.toDataURL("image/jpeg", quality);
        }

        resolve(result);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Compress specifically for profile photos (smaller dimensions).
 */
export function compressProfilePhoto(file: File): Promise<string> {
  return compressImage(file, 600, 600, 0.85);
}

/**
 * Compress specifically for logos (small, high quality).
 */
export function compressLogo(file: File): Promise<string> {
  return compressImage(file, 400, 400, 0.9);
}
