import { getSpec } from '@catalog/index.ts';
import { validateSpecInput } from '@catalog/adapters.ts';
import { supabase } from '@/integrations/supabase/client';
import { calculateCost } from '@/config/pricing';
import { generateJobId } from '@/types/generation';

export interface StartGenerationInput {
  userId: string;
  modelId: string;
  prompt: string;
  /** Studio controls, including media slots under `media.<slotKey>`. */
  controls: Record<string, unknown>;
  /** Run Prompt Brain before sending (off when the prompt is already crafted). */
  enhance?: boolean;
  /** Extra fields stored on the generation row (e.g. { source: 'assistant' }). */
  extraParams?: Record<string, unknown>;
  /** Live Higgsfield quote, recorded on the row. */
  higgsfieldQuote?: { usd?: number; credits?: number } | null;
  /** Library folder to file the result in. */
  folderId?: string | null;
  /** Name for the row; left empty, the library names it from the prompt. */
  title?: string;
}

/**
 * Creates the generation row and kicks off the `generate` edge function.
 * Resolves with the row id as soon as the job is submitted; the row's status
 * then moves through running → done/error (polled by the usual hooks).
 */
export async function startGeneration(input: StartGenerationInput): Promise<string> {
  const spec = getSpec(input.modelId);
  if (!spec) throw new Error(`Unknown model: ${input.modelId}`);

  const problem = validateSpecInput(spec, input.prompt, input.controls);
  if (problem) throw new Error(problem);

  const controls = Object.fromEntries(Object.entries(input.controls).filter(([, v]) => v !== undefined));
  const cost = calculateCost(spec.id, controls);
  const isHf = spec.api === 'higgsfield';

  const { data: row, error } = await supabase
    .from('generations')
    .insert({
      request_id: generateJobId(),
      type: spec.output,
      model: spec.name,
      user_prompt: input.prompt,
      status: 'queued',
      user_id: input.userId,
      ...(input.folderId ? { folder_id: input.folderId } : {}),
      ...(input.title ? { title: input.title } : {}),
      model_params: {
        ...controls,
        ...input.extraParams,
        model_id: spec.id,
        backend: spec.backend ?? 'kie',
        cost_credits: cost.credits,
        cost_usd: isHf ? (input.higgsfieldQuote?.usd ?? null) : cost.usd,
        ...(isHf && input.higgsfieldQuote?.credits !== undefined ? { hf_credits: input.higgsfieldQuote.credits } : {}),
      },
    } as never)
    .select('id')
    .single();
  if (error || !row) throw new Error(error?.message ?? 'Could not create the generation');
  const generationId = (row as { id: string }).id;

  const { data, error: fnError } = await supabase.functions.invoke('generate', {
    body: {
      prompt: input.prompt,
      model: spec.id,
      type: spec.mode,
      controls: { ...controls, cost_credits: cost.credits },
      generationId,
      enhancePromptEnabled: input.enhance ?? false,
      useCase: 'auto',
    },
  });
  if (fnError) {
    const detail = (data as { error?: string } | null)?.error ?? fnError.message;
    await supabase.from('generations').update({ status: 'error', error_message: detail } as never).eq('id', generationId);
    throw new Error(detail);
  }
  return generationId;
}
