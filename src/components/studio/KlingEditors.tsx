import { Plus, X } from 'lucide-react';
import { useGenerationStore } from '@/store/generationStore';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MediaUpload } from '@/components/studio/MediaUpload';
import { ControlLabel } from './SchemaControls';

interface MultiShot {
  prompt: string;
  duration: number;
}

interface KlingElement {
  name: string;
  description: string;
  element_input_urls: string[];
}

const MAX_SHOTS = 5;
const MAX_ELEMENTS = 3;

const ADD_BUTTON =
  'w-full h-9 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-[12px] text-muted-foreground hover:text-foreground hover:border-primary/50 transition-smooth disabled:opacity-50';

/** Kling 3.0 storyboard shot list, shown while the `multi_shots` setting is on. */
export function KlingMultiShotEditor({ disabled = false }: { disabled?: boolean }) {
  const { controls, setControl } = useGenerationStore();
  const enabled = controls.multi_shots === true;
  const shots: MultiShot[] = (controls.multi_prompt as MultiShot[]) ?? [];

  const write = (next: MultiShot[]) => {
    setControl('multi_prompt', next);
    const total = next.reduce((s, x) => s + (Number(x.duration) || 0), 0);
    if (total > 0) setControl('duration', Math.min(15, total));
  };

  if (!enabled) return null;

  return (
    <div className="space-y-2.5">
      {shots.map((shot, i) => (
        <div key={i} className="rounded-lg bg-muted/40 p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold text-muted-foreground">Shot {i + 1}</span>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={1}
                max={12}
                value={shot.duration}
                onChange={(e) => write(shots.map((s, j) => (j === i ? { ...s, duration: Number(e.target.value) || 1 } : s)))}
                className="h-7 w-14 text-[12px] text-center"
                disabled={disabled}
                aria-label={`Shot ${i + 1} seconds`}
              />
              <span className="text-[11px] text-muted-foreground">s</span>
              <button
                type="button"
                onClick={() => write(shots.filter((_, j) => j !== i))}
                disabled={disabled}
                className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label={`Remove shot ${i + 1}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <Textarea
            value={shot.prompt}
            onChange={(e) => write(shots.map((s, j) => (j === i ? { ...s, prompt: e.target.value } : s)))}
            placeholder="What happens in this shot — subject, action, camera"
            maxLength={500}
            className="min-h-[56px] text-[12.5px] bg-card border-border/60"
            disabled={disabled}
          />
        </div>
      ))}
      {shots.length < MAX_SHOTS && (
        <button type="button" className={ADD_BUTTON} onClick={() => write([...shots, { prompt: '', duration: 3 }])} disabled={disabled}>
          <Plus className="h-3.5 w-3.5" /> Add shot ({shots.length}/{MAX_SHOTS})
        </button>
      )}
    </div>
  );
}

/** Kling elements: named characters/objects (2–4 images each) referenced as @name. */
export function KlingElementsEditor({ disabled = false }: { disabled?: boolean }) {
  const { controls, setControl } = useGenerationStore();
  const elements: KlingElement[] = (controls.kling_elements as KlingElement[]) ?? [];
  const write = (next: KlingElement[]) => setControl('kling_elements', next);
  const patch = (i: number, p: Partial<KlingElement>) => write(elements.map((el, j) => (j === i ? { ...el, ...p } : el)));

  return (
    <div className="space-y-3 rounded-xl border border-border/60 p-3.5">
      <ControlLabel label="Elements" help="Lock a character or product across the clip. Upload 2–4 angles, then mention it in the prompt as @name." />
      {elements.map((el, i) => (
        <div key={i} className="rounded-lg bg-muted/40 p-2.5 space-y-2">
          <div className="flex items-center gap-1.5">
            <Input
              value={el.name}
              onChange={(e) => patch(i, { name: e.target.value.replace(/\s+/g, '_') })}
              placeholder="name (e.g. hero_bottle)"
              className="h-8 text-[12.5px] bg-card"
              disabled={disabled}
            />
            <button
              type="button"
              onClick={() => write(elements.filter((_, j) => j !== i))}
              disabled={disabled}
              className="h-8 w-8 shrink-0 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
              aria-label="Remove element"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <Input
            value={el.description}
            onChange={(e) => patch(i, { description: e.target.value })}
            placeholder="Short description"
            className="h-8 text-[12.5px] bg-card"
            disabled={disabled}
          />
          <MediaUpload
            kind="image"
            maxFiles={4}
            value={el.element_input_urls}
            onChange={(urls) => patch(i, { element_input_urls: urls.slice(0, 4) })}
            disabled={disabled}
            helperText={`${el.element_input_urls.length}/4 images · need at least 2`}
          />
        </div>
      ))}
      {elements.length < MAX_ELEMENTS && (
        <button
          type="button"
          className={ADD_BUTTON}
          onClick={() => write([...elements, { name: '', description: '', element_input_urls: [] }])}
          disabled={disabled}
        >
          <Plus className="h-3.5 w-3.5" /> Add element ({elements.length}/{MAX_ELEMENTS})
        </button>
      )}
    </div>
  );
}
