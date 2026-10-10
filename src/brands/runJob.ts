import { supabase } from '@/integrations/supabase/client';
import { startGeneration } from '@/lib/startGeneration';
import { matchFirstNote, type PlannedShot } from './compose';
import type { BrandJob, BrandKit } from './types';

/** Stored in model_params so the brand page can group a run's results. */
export interface BrandRunMeta {
  source: 'brand';
  brand: string;
  job: string;
  run_id: string;
  shot_label: string;
  shot_index: number;
  shot_total: number;
}

export const isBrandRun = (params: Record<string, unknown> | null | undefined, brandId: string) =>
  params?.source === 'brand' && params?.brand === brandId && typeof params?.run_id === 'string';

const WAIT_STEP_MS = 5000;
const WAIT_LIMIT_MS = 6 * 60 * 1000;

/** Waits for a generation to finish; resolves with its output URL, or null if it failed or took too long. */
async function waitForOutput(id: string): Promise<string | null> {
  const started = Date.now();
  while (Date.now() - started < WAIT_LIMIT_MS) {
    const { data } = await supabase.from('generations').select('status, output_url').eq('id', id).single();
    const row = data as { status: string; output_url: string | null } | null;
    if (row?.status === 'done') return row.output_url;
    if (row?.status === 'error') return null;
    await new Promise((r) => setTimeout(r, WAIT_STEP_MS));
  }
  return null;
}

interface RunJobInput {
  userId: string;
  brand: BrandKit;
  job: BrandJob;
  planned: PlannedShot[];
  folderId: string | null;
  /** Called once per shot as it starts (or fails to start). */
  onShot?: (index: number, result: { id?: string; error?: string }) => void;
}

/**
 * Starts every shot of a job. Shots marked `matchFirst` wait for the first
 * shot to finish and get its result as an extra reference, so a carousel or
 * ad set shares one look. Resolves once every shot has been submitted.
 */
export async function runJob({ userId, brand, job, planned, folderId, onShot }: RunJobInput): Promise<{ runId: string; ids: string[]; errors: string[] }> {
  const runId = crypto.randomUUID();
  const ids: string[] = [];
  const errors: string[] = [];

  const start = async (p: PlannedShot, firstOutput?: string | null) => {
    const controls = { ...p.controls };
    let prompt = p.prompt;
    if (firstOutput && p.refSlot) {
      const refs = [...p.refs, firstOutput];
      controls[p.refSlot] = refs;
      prompt = `${matchFirstNote(refs.length)}\n\n${prompt}`;
    }
    const meta: BrandRunMeta = {
      source: 'brand',
      brand: brand.id,
      job: job.id,
      run_id: runId,
      shot_label: p.shot.label,
      shot_index: p.index,
      shot_total: planned.length,
    };
    try {
      const id = await startGeneration({
        userId,
        modelId: p.modelId,
        prompt,
        controls,
        extraParams: { ...meta },
        folderId,
        title: `${job.name} · ${p.shot.label}`,
      });
      ids.push(id);
      onShot?.(p.index, { id });
      return id;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not start';
      errors.push(`${p.shot.label}: ${message}`);
      onShot?.(p.index, { error: message });
      return null;
    }
  };

  const [first, ...rest] = planned;
  if (!first) return { runId, ids, errors };
  const firstId = await start(first);

  const now = rest.filter((p) => !p.shot.matchFirst);
  const later = rest.filter((p) => p.shot.matchFirst);
  await Promise.all(now.map((p) => start(p)));
  if (later.length) {
    // If the first one fails, still make the rest, just without the shared look.
    const firstOutput = firstId ? await waitForOutput(firstId) : null;
    await Promise.all(later.map((p) => start(p, firstOutput)));
  }
  return { runId, ids, errors };
}

/** Upscales a finished image with Topaz for print, filed with the run it came from. */
export async function upscaleForPrint({ userId, sourceId, outputUrl, factor, title, params, folderId }: {
  userId: string;
  sourceId: string;
  outputUrl: string;
  factor: '2' | '4';
  title: string;
  params: Record<string, unknown> | null;
  folderId: string | null;
}): Promise<string> {
  return startGeneration({
    userId,
    modelId: 'topaz-image-upscale',
    prompt: '',
    controls: { upscale_factor: factor, 'media.images': [outputUrl] },
    extraParams: {
      ...(params?.source === 'brand' ? { source: 'brand', brand: params.brand, job: params.job, run_id: params.run_id, shot_index: params.shot_index, shot_total: params.shot_total } : {}),
      shot_label: `${String(params?.shot_label ?? 'Image')} · ${factor}× for print`,
      upscaled_from: sourceId,
    },
    folderId,
    title: `${title} · ${factor}× for print`,
  });
}
