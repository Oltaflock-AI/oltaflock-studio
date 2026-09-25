import type { ModelSpec } from '@catalog/types.ts';
import { mediaValue, visibleMedia } from '@catalog/adapters.ts';
import { useGenerationStore } from '@/store/generationStore';
import { MediaUpload } from '@/components/studio/MediaUpload';
import { ControlLabel } from './SchemaControls';

/** Upload slots (start frame, end frame, references…) declared by a model spec. */
export function MediaInputs({ spec }: { spec: ModelSpec }) {
  const { controls, setControl } = useGenerationStore();
  const slots = visibleMedia(spec, controls);
  if (slots.length === 0) return null;

  return (
    <div className="space-y-4">
      {slots.map((slot) => {
        const urls = mediaValue(slot, controls);
        return (
          <div key={slot.key} className="space-y-2">
            <ControlLabel
              label={slot.min ? slot.label : `${slot.label} · optional`}
              help={slot.help}
              trailing={slot.max > 1 ? <span className="text-[11px] tabular-nums text-muted-foreground">{urls.length}/{slot.max}</span> : undefined}
            />
            <MediaUpload
              kind={slot.kind}
              maxFiles={slot.max}
              value={urls}
              onChange={(next) => setControl(`media.${slot.key}`, next)}
              maxSizeMB={slot.kind === 'image' ? 10 : 50}
            />
          </div>
        );
      })}
    </div>
  );
}
