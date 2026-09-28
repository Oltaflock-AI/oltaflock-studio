import { getSpec, specBackend, specsForMode } from '@catalog/index.ts';
import { BACKEND_LABELS, type Backend } from '@catalog/types.ts';
import { usePreferencesStore } from '@/store/preferencesStore';
import { useGenerationStore } from '@/store/generationStore';
import { useHiggsfieldStatus } from '@/hooks/useHiggsfield';
import { toStudioMode } from '@/types/generation';
import { cn } from '@/lib/utils';

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
      <div className="grid grid-cols-2 p-1 rounded-xl bg-muted/70 border border-border/50" role="radiogroup" aria-label="API provider">
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
                'h-8 flex items-center justify-center gap-2 rounded-lg text-[12.5px] transition-smooth',
                active ? 'bg-card text-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span
                className={cn('h-1.5 w-1.5 rounded-full', b === 'kie' ? 'bg-sky-500' : 'bg-lime-500', !active && 'opacity-40')}
                aria-hidden="true"
              />
              {BACKEND_LABELS[b]}
            </button>
          );
        })}
      </div>
      <p className={cn('text-[11.5px] leading-snug px-0.5', hfNotReady ? 'text-destructive' : 'text-muted-foreground')}>
        {backend === 'kie'
          ? 'Generating with your kie.ai account.'
          : hfNotReady
            ? 'Higgsfield API key not set on the server yet. Add HF_CREDENTIALS to Supabase secrets.'
            : 'Generating with your Higgsfield API account · priced live per request.'}
      </p>
    </div>
  );
}
