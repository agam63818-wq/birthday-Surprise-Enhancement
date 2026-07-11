import { supabase } from "@/lib/supabase";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10MB

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function uploadToBucket(
  bucket: "photos" | "audio",
  userId: string,
  file: File,
): Promise<string> {
  const path = `${userId}/${Date.now()}-${sanitizeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// Uploads an image to the "photos" bucket at {user_id}/{filename}. Throws
// a clear error if the file is missing, not an image, or too large.
export async function uploadPhoto(userId: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error("Photo must be 5MB or smaller.");
  }
  return uploadToBucket("photos", userId, file);
}

// Uploads audio to the "audio" bucket at {user_id}/{filename}. Throws a
// clear error if the file is missing, not audio, or too large.
export async function uploadAudio(userId: string, file: File): Promise<string> {
  if (!file.type.startsWith("audio/")) {
    throw new Error("Please choose an audio file.");
  }
  if (file.size > MAX_AUDIO_BYTES) {
    throw new Error("Audio must be 10MB or smaller.");
  }
  return uploadToBucket("audio", userId, file);
}
