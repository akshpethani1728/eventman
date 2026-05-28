import { createClient } from "@/lib/supabase/client";

export async function uploadAvatar(file: Blob, userId: string): Promise<string> {
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : file.type === "image/gif" ? "gif" : "jpg";
  const path = `${userId}/${Date.now()}.${ext}`;

  // Send to server-side API which uses service role key (bypasses RLS)
  const formData = new FormData();
  formData.append("file", file, `avatar.${ext}`);
  formData.append("path", path);

  const res = await fetch("/api/upload-avatar", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Upload failed");

  return data.url;
}
