import { getSpec, specBackend, specsForMode } from '@catalog/index.ts';
import { BACKEND_LABELS, type Backend } from '@catalog/types.ts';
import { usePreferencesStore } from '@/store/preferencesStore';
import { useGenerationStore } from '@/store/generationStore';
import { useHiggsfieldStatus } from '@/hooks/useHiggsfield';
import { toStudioMode } from '@/types/generation';
import { cn } from '@/lib/utils';
import { SEGMENT_TRACK, segmentItem } from '@/components/layout/studioSurface';

const BACKENDS: Backend[] = ['kie', 'higgsfield'];

/** Chooses which API account the Studio generates with. Each has its own model list. */
export function BackendToggle() {
  const backend = usePreferencesStore((s) => s.studioBackend);
  const setBackend = usePreferencesStore((s) => s.setStudioBackend);
  const { mode, selectedModel, setSelectedModel } = useGenerationStore();
  const hf = useHiggsfieldStatus(backend === 'higgsfield');

  const choose = (next: Backend) => {
    if (next === backend) return;
    setBackend(next);
    // Keep the selection only if it belongs to the new backend.
    const current = selectedModel ? getSpec(selectedModel) : undefined;
    if (!current || specBackend(current) !== next) {
      setSelectedModel((specsForMode(toStudioMode(mode), next)[0]?.id ?? null) as never);
    }
  };

  const hfNotReady = backend === 'higgsfield' && hf.data && !hf.data.configured;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-muted-foreground">Provider</span>
      <div className={cn(SEGMENT_TRACK, 'grid-cols-2 p-[2px] rounded-[9px]')} role="radiogroup" aria-label="API provider">
        {BACKENDS.map((b) => {
          const active = backend === b;
          return (
            <button
              key={b}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => choose(b)}
              className={cn(
                'h-7 px-3 flex items-center justify-center gap-1.5 rounded-[7px] text-[12.5px] transition-smooth',
                segmentItem(active),
              )}
            >
              <span
                className={cn('h-1.5 w-1.5 rounded-full', b === 'kie' ? 'bg-brand-red' : 'bg-brand-green', !active && 'opacity-40')}
                aria-hidden="true"
              />
              {BACKEND_LABELS[b]}
            </button>
          );
        })}
      </div>
      </div>
      {hfNotReady && (
        <p className="text-[12px] leading-snug px-0.5 text-destructive">
          Higgsfield API key isn't set on the server yet (HF_CREDENTIALS).
        </p>
      )}
    </div>
  );
}
