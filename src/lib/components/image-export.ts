import type { CropArea } from "svelte-easy-crop";
import { maxOutfitImageBytes } from "#lib/outfit-submission.ts";

/** Largest original file accepted for cropping. Only the converted image is uploaded. */
export const maxSourceImageBytes = 20 * 1024 * 1024;

/** Check that the browser can decode a chosen file before it is shown in the cropper. */
export const canDecodeImage = async (file: File) => {
  try {
    const bitmap = await createImageBitmap(file);
    bitmap.close();
    return true;
  } catch {
    return false;
  }
};

/**
 * Crop an image to an area in source pixels, scale it to the published size, and encode
 * it as WebP. Throws an error with a user-facing message when conversion fails.
 */
export const exportCroppedWebP = async (
  source: File,
  area: CropArea,
  size: { width: number; height: number },
  fileName: string,
) => {
  const bitmap = await createImageBitmap(source);

  try {
    const canvas = new OffscreenCanvas(size.width, size.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare your images in this browser.");

    context.imageSmoothingQuality = "high";
    context.drawImage(
      bitmap,
      area.x,
      area.y,
      area.width,
      area.height,
      0,
      0,
      size.width,
      size.height,
    );

    const blob = await canvas.convertToBlob({ type: "image/webp", quality: 0.9 });

    // Browsers without a WebP encoder return PNG instead of failing.
    if (blob.type !== "image/webp") {
      throw new Error("This browser cannot convert images to WebP. Try another browser.");
    }
    if (blob.size > maxOutfitImageBytes) {
      throw new Error("An image is too detailed to publish. Try zooming in or another image.");
    }

    return new File([blob], fileName, { type: "image/webp" });
  } finally {
    bitmap.close();
  }
};
