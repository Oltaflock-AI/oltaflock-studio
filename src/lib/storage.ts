import { supabase } from '@/integrations/supabase/client';

/**
 * File storage for user uploads and avatars.
 *
 * When VITE_STORAGE_API_URL is set, files go to Cloudflare R2 through the
 * oltaflock-storage Worker. When it is unset, they go to Supabase Storage as
 * before, so unsetting the variable is the rollback.
 */
const STORAGE_API_URL = (import.meta.env.VITE_STORAGE_API_URL as string | undefined)?.replace(/\/$/, '');

export type StorageKind = 'uploads' | 'avatars';

const LEGACY_BUCKET: Record<StorageKind, string> = {
  uploads: 'generation-uploads',
  avatars: 'avatars',
};

interface UploadOptions {
  /** Overwrite an existing object with the same name (avatars). */
  upsert?: boolean;
}

/** Uploads `file` as `{userId}/{name}` in the given area and returns its public URL. */
export async function uploadFile(
  kind: StorageKind,
  userId: string,
  name: string,
  file: Blob,
  { upsert = false }: UploadOptions = {},
): Promise<string> {
  const safeName = name.replace(/[^A-Za-z0-9._-]/g, '_');

  if (!STORAGE_API_URL) {
    const bucket = LEGACY_BUCKET[kind];
    const path = `${userId}/${safeName}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert,
      contentType: file.type || undefined,
    });
    if (error) throw error;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${STORAGE_API_URL}/o/${kind}/${userId}/${safeName}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.url) throw new Error(body.error || `Upload failed (${res.status})`);
  return body.url as string;
}
