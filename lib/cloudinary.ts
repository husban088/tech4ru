// lib/cloudinary.ts
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;
const REVIEW_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_REVIEW_PRESET!;

// ─────────────────────────────────────────────────────────────────
// IMAGE UPLOAD (Existing)
// ─────────────────────────────────────────────────────────────────
export async function uploadToCloudinary(
  file: File,
  type: "product" | "review" = "product",
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  // Use different preset based on type
  const preset = type === "review" ? REVIEW_PRESET : UPLOAD_PRESET;
  formData.append("upload_preset", preset);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData },
  );

  if (!res.ok) {
    let msg = "Cloudinary upload failed";
    try {
      const err = await res.json();
      msg = err?.error?.message || msg;
    } catch {
      // ignore parse error
    }
    throw new Error(msg);
  }

  const data = await res.json();

  if (!data.secure_url) {
    throw new Error("Cloudinary returned no URL");
  }

  return data.secure_url as string;
}

// ─────────────────────────────────────────────────────────────────
// REVIEW IMAGE UPLOAD (Existing)
// ─────────────────────────────────────────────────────────────────
export async function uploadReviewImage(file: File): Promise<string> {
  return uploadToCloudinary(file, "review");
}

// ─────────────────────────────────────────────────────────────────
// VIDEO UPLOAD (NEW - for product videos)
// ─────────────────────────────────────────────────────────────────
export async function uploadVideoToCloudinary(file: File): Promise<string> {
  // Validate file type
  const validTypes = [
    "video/mp4",
    "video/webm",
    "video/ogg",
    "video/mov",
    "video/quicktime",
    "video/avi",
    "video/x-msvideo",
  ];

  if (!validTypes.includes(file.type) && !file.type.startsWith("video/")) {
    throw new Error(
      `"${file.name}" is not a valid video file. Please upload MP4, WebM, MOV, or AVI format.`,
    );
  }

  // Validate file size (max 100MB)
  const maxSize = 100 * 1024 * 1024; // 100MB
  if (file.size > maxSize) {
    throw new Error(
      `Video file is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum size is 100MB.`,
    );
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("resource_type", "video");
  formData.append("folder", "products/videos");

  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
      { method: "POST", body: formData },
    );

    if (!res.ok) {
      let msg = "Cloudinary video upload failed";
      try {
        const err = await res.json();
        msg = err?.error?.message || msg;
      } catch {
        // ignore parse error
      }
      throw new Error(msg);
    }

    const data = await res.json();

    if (!data.secure_url) {
      throw new Error("Cloudinary returned no URL for video");
    }

    return data.secure_url as string;
  } catch (err: any) {
    console.error("Video upload error:", err);
    throw new Error(err.message || "Failed to upload video to Cloudinary");
  }
}

// ─────────────────────────────────────────────────────────────────
// OPTIMIZE URL (Existing - works for both images and videos)
// ─────────────────────────────────────────────────────────────────
export function cloudinaryOptimize(url: string, width = 800): string {
  if (!url || !url.includes("cloudinary.com")) return url;

  // For videos, don't apply image transformations
  if (url.includes("/video/upload/")) {
    return url;
  }

  return url.replace("/upload/", `/upload/w_${width},q_auto,f_auto/`);
}

// ─────────────────────────────────────────────────────────────────
// VIDEO OPTIMIZATION (NEW - for video thumbnails or quality)
// ─────────────────────────────────────────────────────────────────
export function cloudinaryVideoOptimize(url: string, quality = "auto"): string {
  if (!url || !url.includes("cloudinary.com")) return url;

  if (!url.includes("/video/upload/")) return url;

  // Add quality parameter for better performance
  return url.replace("/upload/", `/upload/q_${quality},f_auto/`);
}

// ─────────────────────────────────────────────────────────────────
// GET VIDEO THUMBNAIL (NEW - extract thumbnail from video)
// ─────────────────────────────────────────────────────────────────
export function cloudinaryVideoThumbnail(
  videoUrl: string,
  timeInSeconds = 2,
): string {
  if (!videoUrl || !videoUrl.includes("cloudinary.com")) return "";

  // Cloudinary can generate thumbnail from video at specific timestamp
  // Format: https://res.cloudinary.com/cloud_name/video/upload/so_2/video_id.mp4.jpg
  // so_2 = start offset 2 seconds
  if (videoUrl.includes("/video/upload/")) {
    return (
      videoUrl.replace("/video/upload/", `/video/upload/so_${timeInSeconds}/`) +
      ".jpg"
    );
  }

  return "";
}
