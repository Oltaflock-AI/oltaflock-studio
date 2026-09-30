import { supabase } from '@/integrations/supabase/client';
import { uploadFile } from '@/lib/storage';
import { generateJobId } from '@/types/generation';

/** Model label stored on rows the user uploaded rather than generated. */
export const UPLOAD_MODEL = 'Upload';
export const UPLOAD_ACCEPT = 'image/*,video/*';
// The storage Worker rejects uploads above 95MB.
const MAX_BYTES = 95 * 1024 * 1024;

/** Why a file can't go into the library, or null when it can. */
export function uploadProblem(file: File): string | null {
  if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) return `${file.name} is not an image or video`;
  if (file.size > MAX_BYTES) return `${file.name} is over 95MB`;
  return null;
}

/**
 * Stores a file from the user's device and adds it to their library as a
 * finished item (filed into `folderId` when given). Returns the new row id.
 */
export async function uploadToLibrary(userId: string, file: File, folderId: string | null): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || (file.type.split('/')[1] ?? 'bin');
  const url = await uploadFile('uploads', userId, `${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`, file);
  const title = file.name.replace(/\.[^.]+$/, '').trim().slice(0, 120) || null;

  const { data, error } = await supabase
    .from('generations')
    .insert({
      request_id: generateJobId(),
      type: file.type.startsWith('video/') ? 'video' : 'image',
      model: UPLOAD_MODEL,
      user_prompt: '',
      status: 'done',
      progress: 100,
      output_url: url,
      user_id: userId,
      folder_id: folderId,
      title,
      model_params: { source: 'upload', file_name: file.name, size_bytes: file.size },
    } as never)
    .select('id')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Could not add the upload to your library');
  return (data as { id: string }).id;
}
