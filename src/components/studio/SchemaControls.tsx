import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Dices, Info } from 'lucide-react';
import type { FieldSpec, ModelSpec } from '@catalog/types.ts';
import { fieldValue, visibleFields } from '@catalog/adapters.ts';
import { useGenerationStore } from '@/store/generationStore';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { KlingMultiShotEditor, KlingElementsEditor } from './KlingEditors';

export const CONTROL_LABEL = 'text-[12.5px] font-medium text-foreground/85';

export function ControlLabel({ label, help, trailing }: { label: string; help?: string; trailing?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 min-h-5">
      <span className="flex items-center gap-1.5">
        <span className={CONTROL_LABEL}>{label}</span>
        {help && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[240px] text-xs">{help}</TooltipContent>
          </Tooltip>
        )}
      </span>
      {trailing}
    </div>
  );
}

const RATIO_RE = /^(\d+):(\d+)$/;

/** Tiny rectangle previewing an aspect ratio. */
function RatioGlyph({ value }: { value: string }) {
  const m = RATIO_RE.exec(value);
  if (!m) return <span className="h-3 w-3 rounded-[3px] border border-dashed border-current opacity-60" />;
  const w = Number(m[1]);
  const h = Number(m[2]);
  const scale = 14 / Math.max(w, h);
  return (
    <span
      className="rounded-[2.5px] border-[1.5px] border-current opacity-80"
      style={{ width: Math.max(5, w * scale), height: Math.max(5, h * scale) }}
    />
  );
}

function optionLabel(o: { value: unknown; label?: string }) {
  return o.label ?? String(o.value);
}

function FieldControl({ field, disabled }: { field: FieldSpec; disabled: boolean }) {
  const { controls, setControl } = useGenerationStore();
  const value = fieldValue(field, controls);
  const set = (v: unknown) => setControl(field.key, v);

  if (field.type === 'boolean') {
    return (
      <label className="flex items-center justify-between gap-3 py-0.5 cursor-pointer">
        <ControlLabel label={field.label} help={field.help} />
        <Switch checked={value === true} onCheckedChange={set} disabled={disabled} />
      </label>
    );
  }

  if (field.type === 'enum' && field.options) {
    const isRatio = field.key.toLowerCase().includes('aspect') || field.key === 'size' || field.key === 'image_size';
    const labels = field.options.map(optionLabel);
    const compact = field.options.length <= 5 && labels.every((l) => l.length <= 9);
    const ratioChips = isRatio && field.options.length <= 10;

    if (ratioChips) {
      return (
        <div className="space-y-2">
          <ControlLabel label={field.label} help={field.help} />
          <div className="grid grid-cols-5 gap-1.5">
            {field.options.map((o) => {
              const active = String(value) === String(o.value);
              return (
                <button
                  key={String(o.value)}
                  type="button"
                  disabled={disabled}
                  onClick={() => set(o.value)}
                  aria-pressed={active}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 h-12 rounded-lg border text-[11px] tabular-nums transition-smooth',
                    active
                      ? 'border-primary/60 bg-primary/10 text-foreground font-semibold'
                      : 'border-border/70 text-muted-foreground hover:border-border hover:text-foreground',
                    disabled && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  <span className="h-4 flex items-center"><RatioGlyph value={String(o.value)} /></span>
                  {optionLabel(o)}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (compact) {
      return (
        <div className="space-y-2">
          <ControlLabel label={field.label} help={field.help} />
          <div className="flex p-0.5 rounded-lg bg-muted/70 border border-border/50">
            {field.options.map((o) => {
              const active = String(value) === String(o.value);
              return (
                <button
                  key={String(o.value)}
                  type="button"
                  disabled={disabled}
                  onClick={() => set(o.value)}
                  aria-pressed={active}
                  className={cn(
                    'flex-1 h-8 px-2 rounded-md text-[12px] whitespace-nowrap transition-smooth',
                    active
                      ? 'bg-card text-foreground font-semibold shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                    disabled && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  {optionLabel(o)}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <ControlLabel label={field.label} help={field.help} />
        <Select
          value={value === undefined ? undefined : String(value)}
          onValueChange={(v) => set(field.options!.find((o) => String(o.value) === v)?.value ?? v)}
          disabled={disabled}
        >
          <SelectTrigger className="h-9 rounded-lg bg-muted/50 border-border/60 text-[13px]">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {field.options.map((o) => (
              <SelectItem key={String(o.value)} value={String(o.value)} className="text-[13px]">
                {optionLabel(o)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (field.type === 'number') {
    const num = Number(value ?? field.min ?? 0);
    const hasRange = field.min !== undefined && field.max !== undefined;
    return (
      <div className="space-y-2.5">
        <ControlLabel
          label={field.label}
          help={field.help}
          trailing={<span className="text-[12px] tabular-nums text-muted-foreground">{num}</span>}
        />
        {hasRange ? (
          <Slider
            value={[num]}
            min={field.min}
            max={field.max}
            step={field.step ?? 1}
            onValueChange={([v]) => set(v)}
            disabled={disabled}
          />
        ) : (
          <Input type="number" value={num} onChange={(e) => set(Number(e.target.value))} disabled={disabled} className="h-9" />
        )}
      </div>
    );
  }

  if (field.type === 'seed') {
    const seed = value === undefined || value === -1 ? '' : String(value);
    return (
      <div className="space-y-2">
        <ControlLabel label={field.label} help={field.help ?? 'Same seed + same settings ≈ same result. Leave empty for random.'} />
        <div className="flex gap-1.5">
          <Input
            inputMode="numeric"
            placeholder="Random"
            value={seed}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '');
              set(v === '' ? undefined : Number(v));
            }}
            disabled={disabled}
            className="h-9 text-[13px] tabular-nums"
          />
          <button
            type="button"
            onClick={() => set(Math.floor(Math.random() * (field.max ?? 2147483647)))}
            disabled={disabled}
            className="h-9 w-9 shrink-0 flex items-center justify-center rounded-md border border-border/70 text-muted-foreground hover:text-foreground"
            aria-label="Random seed"
          >
            <Dices className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <div className="space-y-2">
        <ControlLabel label={field.label} help={field.help} />
        <Textarea
          value={(value as string) ?? ''}
          onChange={(e) => set(e.target.value)}
          disabled={disabled}
          className="min-h-[64px] text-[13px] bg-muted/40 border-border/60 rounded-lg"
          placeholder={field.help}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <ControlLabel label={field.label} help={field.help} />
      <Input value={(value as string) ?? ''} onChange={(e) => set(e.target.value)} disabled={disabled} className="h-9 text-[13px]" />
    </div>
  );
}

/** Renders every control a model exposes, straight from its catalog spec. */
export function SchemaControls({ spec }: { spec: ModelSpec }) {
  const { controls, pendingRating } = useGenerationStore();
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const fields = visibleFields(spec, controls);
  const basic = fields.filter((f) => !f.advanced);
  const advanced = fields.filter((f) => f.advanced);

  return (
    <div className="space-y-4">
      {basic.map((f) => <FieldControl key={f.key} field={f} disabled={pendingRating} />)}

      {spec.editors?.includes('kling-multishot') && <KlingMultiShotEditor disabled={pendingRating} />}
      {spec.editors?.includes('kling-elements') && <KlingElementsEditor disabled={pendingRating} />}

      {advanced.length > 0 && (
        <div className="rounded-xl border border-border/60">
          <button
            type="button"
            onClick={() => setAdvancedOpen((o) => !o)}
            className="w-full flex items-center justify-between px-3.5 h-10 text-[12.5px] font-medium text-muted-foreground hover:text-foreground"
            aria-expanded={advancedOpen}
          >
            Advanced
            <span className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground/70">{advanced.length} settings</span>
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', advancedOpen && 'rotate-180')} />
            </span>
          </button>
          <AnimatePresence initial={false}>
            {advancedOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <div className="px-3.5 pb-3.5 pt-1 space-y-4 border-t border-border/50">
                  {advanced.map((f) => <FieldControl key={f.key} field={f} disabled={pendingRating} />)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
