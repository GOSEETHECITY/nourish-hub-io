import { supabase } from "@/integrations/supabase/client";

export const AVATAR_BUCKET = "user-avatars";
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export async function getAvatarSignedUrl(path: string | null | undefined, expiresIn = 3600) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  if (!AVATAR_ALLOWED_TYPES.includes(file.type)) throw new Error("Avatar must be PNG, JPG, or WEBP");
  if (file.size > AVATAR_MAX_BYTES) throw new Error("Avatar must be under 2 MB");
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
  if (error) throw error;
  return path;
}

export async function removeAvatarFile(path: string | null | undefined) {
  if (!path || /^https?:\/\//i.test(path)) return;
  await supabase.storage.from(AVATAR_BUCKET).remove([path]);
}
