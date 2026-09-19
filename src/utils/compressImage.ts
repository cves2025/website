export interface CompressImageOptions {
  maxDimension?: number; // longest side, in px
  quality?: number; // 0-1, JPEG quality
}

export async function compressImage(
  file: File,
  { maxDimension = 800, quality = 0.8 }: CompressImageOptions = {},
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);

  const scale = Math.min(
    1,
    maxDimension / Math.max(bitmap.width, bitmap.height),
  );
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get canvas context to compress the image.");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to compress the image."));
      },
      "image/jpeg",
      quality,
    );
  });
}