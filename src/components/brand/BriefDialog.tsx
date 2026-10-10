import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Check, Info, Loader2, Plus, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MediaUpload } from '@/components/studio/MediaUpload';
import { ReferencePicker } from '@/components/studio/ReferencePicker';
import { useAuth } from '@/hooks/useAuth';
import { useFolders } from '@/hooks/useFolders';
import { creditsToUsd, formatCredits, formatUsd } from '@/config/pricing';
import { JOB_CATEGORIES, type BrandJob, type BrandKit, type BrandProduct, type Brief, type BriefField, type Quality } from '@/brands';
import { QUALITY_LABELS, planJob } from '@/brands/compose';
import { runJob } from '@/brands/runJob';
import { useBrandAssets } from '@/brands/useBrandAssets';
import { JobCover } from './JobCover';
import { cn } from '@/lib/utils';

const RANGE = '__range';

interface BriefDialogProps {
  brand: BrandKit;
  job: BrandJob | null;
  onOpenChange: (open: boolean) => void;
  /** Open the pack-shot setup for a product (or the logo when null). */
  onAddPackShot: (product: BrandProduct | null) => void;
  onStarted: () => void;
}

export function BriefDialog(props: BriefDialogProps) {
  return (
    <Dialog open={!!props.job} onOpenChange={props.onOpenChange}>
      {props.job && <BriefForm key={props.job.id} {...props} job={props.job} />}
    </Dialog>
  );
}

function initialBrief(job: BrandJob): Brief {
  const brief: Brief = {};
  for (const f of job.fields) {
    if (f.type === 'choice') brief[f.key] = f.options[0];
    if (f.type === 'images') brief[f.key] = [];
  }
  return brief;
}

function BriefForm({ brand, job, onOpenChange, onAddPackShot, onStarted }: BriefDialogProps & { job: BrandJob }) {
  const { user } = useAuth();
  const { folders, createFolder } = useFolders();
  const { assetsFor, productElement, logo } = useBrandAssets(brand);
  const productField = job.fields.find((f) => f.type === 'product');
  const [brief, setBrief] = useState<Brief>(() => initialBrief(job));
  const [productId, setProductId] = useState<string>(brand.products[0]?.id ?? RANGE);
  const [quality, setQuality] = useState<Quality>(job.qualities[0]);
  const [touched, setTouched] = useState(false);
  const [starting, setStarting] = useState(false);

  const product = productField ? brand.products.find((p) => p.id === productId) : undefined;
  const assets = useMemo(() => assetsFor(product), [assetsFor, product]);
  const planned = useMemo(
    () => planJob(job, brief, { brand, product, assets, quality }),
    [job, brief, brand, product, assets, quality],
  );
  const credits = planned.reduce((sum, p) => sum + p.credits, 0);
  const models = [...new Set(planned.map((p) => p.modelName))];
  const outputs = planned.filter((p) => p.shot.output === 'video').length ? 'video' : 'image';

  const set = (key: string, value: string | string[]) => setBrief((b) => ({ ...b, [key]: value }));
  const missing = job.fields.filter((f) => (f.type === 'text' || f.type === 'textarea' || f.type === 'images') && f.required && !(brief[f.key]?.length));
  const category = JOB_CATEGORIES.find((c) => c.id === job.category);

  const start = async () => {
    setTouched(true);
    if (!user?.id || missing.length || planned.length === 0) return;
    setStarting(true);
    try {
      const folderName = `${brand.name} · ${category?.label ?? 'Work'}`;
      const folder = folders.find((f) => f.name.toLowerCase() === folderName.toLowerCase()) ?? (await createFolder(folderName).catch(() => null));
      let announced = false;
      const announce = () => {
        if (announced) return;
        announced = true;
        toast.success(`${job.name} started`, {
          description: `${planned.length} ${outputs === 'video' ? 'video' : planned.length === 1 ? 'image' : 'images'} on the way, filed in "${folderName}".`,
        });
        onStarted();
        onOpenChange(false);
      };
      runJob({
        userId: user.id,
        brand,
        job,
        planned,
        folderId: folder?.id ?? null,
        onShot: (_i, r) => {
          if (r.id) announce();
        },
      }).then(({ ids, errors }) => {
        if (errors.length) toast.error(ids.length ? `${errors.length} of ${planned.length} could not start` : `${job.name} could not start`, { description: errors[0] });
        if (!ids.length) setStarting(false);
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not start');
      setStarting(false);
    }
  };

  return (
    <DialogContent className="max-h-[92vh] w-[min(1040px,96vw)] max-w-none gap-0 overflow-hidden rounded-[20px] p-0 md:grid md:grid-cols-[minmax(0,1.25fr)_minmax(0,0.85fr)]">
      <div className="flex max-h-[92vh] min-h-0 flex-col overflow-y-auto">
        <div className="flex items-center gap-4 border-b border-border px-6 py-5 pr-12">
          <JobCover job={job} className="h-14 w-14 shrink-0 rounded-[14px]" />
          <div className="min-w-0">
            <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{brand.name} · {category?.label}</span>
            <DialogTitle className="font-serif text-[28px] font-normal leading-tight">{job.name}</DialogTitle>
            <DialogDescription className="text-[13px]">{job.tagline}</DialogDescription>
          </div>
        </div>

        <div className="flex flex-col gap-5 px-6 py-5">
          {job.fields.map((f) => (
            <FieldInput
              key={f.key}
              field={f}
              brand={brand}
              value={brief[f.key]}
              onChange={(v) => set(f.key, v)}
              productId={productId}
              onProduct={setProductId}
              invalid={touched && missing.includes(f)}
            />
          ))}
        </div>
      </div>

      <aside className="flex max-h-[92vh] min-h-0 flex-col gap-4 overflow-y-auto border-t border-border bg-muted/40 px-6 py-5 md:border-l md:border-t-0">
        <section className="flex flex-col gap-2">
          <h3 className="text-[12px] font-medium text-muted-foreground">Brand references</h3>
          {productField && (
            <RefStatus
              ok={assets.packRefs.length > 0}
              label={product ? `${product.flavour} pack shots` : 'Range pack shots'}
              detail={assets.packRefs.length
                ? `${assets.packRefs.length} image${assets.packRefs.length === 1 ? '' : 's'} attached, so the pack is reproduced`
                : product ? `No @${product.element} element yet: the pack will be invented` : 'No product pack shots yet'}
              onAdd={product && !productElement(product) ? () => onAddPackShot(product) : undefined}
            />
          )}
          {planned.some((p) => p.shot.output === 'image') && <RefStatus
            ok={!!logo}
            label="Logo"
            detail={logo ? `@${brand.logoElement} attached` : `No @${brand.logoElement} element yet`}
            onAdd={!logo ? () => onAddPackShot(null) : undefined}
          />}
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-[12px] font-medium text-muted-foreground">Quality</h3>
          <div className="flex flex-wrap gap-1.5">
            {job.qualities.map((q) => (
              <button
                key={q}
                type="button"
                aria-pressed={quality === q}
                onClick={() => setQuality(q)}
                className={cn(
                  'flex flex-col rounded-[10px] border px-3 py-1.5 text-left transition-colors',
                  quality === q ? 'border-primary bg-card' : 'border-border bg-card/60 hover:border-foreground/25',
                )}
              >
                <span className="text-[12.5px] font-semibold">{QUALITY_LABELS[q].label}</span>
                <span className="text-[11px] text-muted-foreground">{QUALITY_LABELS[q].hint}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-[12px] font-medium text-muted-foreground">You'll get</h3>
          <ul className="flex flex-col gap-1">
            {planned.map((p) => (
              <li key={p.index} className="flex items-center justify-between gap-2 rounded-[8px] bg-card px-2.5 py-1.5 text-[12.5px]">
                <span className="truncate">{p.shot.label}</span>
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{String(p.controls.aspect_ratio ?? p.controls.aspectRatio ?? '')}</span>
              </li>
            ))}
            {planned.length === 0 && <li className="text-[12.5px] text-muted-foreground">Fill in the brief to see what gets made.</li>}
          </ul>
          {models.length > 0 && <p className="text-[11.5px] text-muted-foreground">Made with {models.join(' and ')}.</p>}
        </section>

        {job.tip && (
          <p className="flex gap-2 rounded-[10px] bg-card px-3 py-2.5 text-[12px] leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {job.tip}
          </p>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-2">
          {touched && missing.length > 0 && (
            <p className="text-[12px] text-destructive">Fill in: {missing.map((f) => f.label).join(', ')}</p>
          )}
          <Button onClick={start} disabled={starting} className="h-11 gap-1.5 rounded-[11px] text-[14px] font-semibold">
            {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Make {planned.length > 1 ? `${planned.length} ${outputs === 'video' ? 'videos' : 'images'}` : `the ${outputs}`}
          </Button>
          <p className="text-center font-mono text-[11.5px] text-muted-foreground">
            ≈ {formatCredits(Math.round(credits * 10) / 10)} credits · {formatUsd(creditsToUsd(credits))}
          </p>
        </div>
      </aside>
    </DialogContent>
  );
}

function RefStatus({ ok, label, detail, onAdd }: { ok: boolean; label: string; detail: string; onAdd?: () => void }) {
  return (
    <div className="flex items-center gap-2.5 rounded-[10px] bg-card px-3 py-2">
      <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full', ok ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning')}>
        {ok ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-medium">{label}</p>
        <p className="text-[11.5px] leading-snug text-muted-foreground">{detail}</p>
      </div>
      {onAdd && (
        <Button size="sm" variant="outline" onClick={onAdd} className="h-7 shrink-0 gap-1 rounded-[8px] px-2 text-[11.5px]">
          <Plus className="h-3 w-3" /> Add
        </Button>
      )}
    </div>
  );
}

interface FieldInputProps {
  field: BriefField;
  brand: BrandKit;
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
  productId: string;
  onProduct: (id: string) => void;
  invalid: boolean;
}

function FieldInput({ field, brand, value, onChange, productId, onProduct, invalid }: FieldInputProps) {
  const text = typeof value === 'string' ? value : '';
  const id = `brief-${field.key}`;
  const label = (
    <label htmlFor={id} className="text-[13px] font-medium">
      {field.label}
      {'required' in field && field.required && <span className="text-muted-foreground"> *</span>}
    </label>
  );
  const help = field.help && <p className="text-[12px] text-muted-foreground">{field.help}</p>;

  if (field.type === 'product') {
    const lines = [...new Set(brand.products.map((p) => p.line))];
    return (
      <div className="flex flex-col gap-2">
        {label}
        <Select value={productId} onValueChange={onProduct}>
          <SelectTrigger id={id} className="h-10 rounded-[10px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {field.allowRange && <SelectItem value={RANGE}>The whole range</SelectItem>}
            {lines.map((line) => (
              <SelectGroup key={line}>
                <SelectLabel>{line}</SelectLabel>
                {brand.products.filter((p) => p.line === line).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.flavour}</SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        {help}
      </div>
    );
  }

  if (field.type === 'choice') {
    const custom = field.custom && !field.options.includes(text);
    return (
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium">{field.label}</span>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={field.label}>
          {field.options.map((o) => (
            <button
              key={o}
              type="button"
              aria-pressed={text === o}
              onClick={() => onChange(o)}
              className={cn(
                'rounded-full px-3 py-1.5 text-[12.5px] transition-colors',
                text === o ? 'bg-primary font-medium text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {o}
            </button>
          ))}
        </div>
        {field.custom && (
          <Input
            value={custom ? text : ''}
            onChange={(e) => onChange(e.target.value || field.options[0])}
            placeholder={`Or type your own ${field.label.toLowerCase()}…`}
            className="h-9 rounded-[10px]"
          />
        )}
        {help}
      </div>
    );
  }

  if (field.type === 'images') {
    const urls = Array.isArray(value) ? value : [];
    return (
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium">{field.label}{field.required && <span className="text-muted-foreground"> *</span>}</span>
        <MediaUpload kind="image" maxFiles={field.max} value={urls} onChange={onChange} maxSizeMB={10} />
        <ReferencePicker kind="image" max={field.max} value={urls} onChange={onChange} />
        {help}
        {invalid && <p className="text-[12px] text-destructive">Add at least one image</p>}
      </div>
    );
  }

  const suggestions = field.suggestions?.filter((s) => s !== text) ?? [];
  return (
    <div className="flex flex-col gap-2">
      {label}
      {field.type === 'textarea' ? (
        <Textarea
          id={id}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={Math.min(8, Math.max(3, (field.placeholder ?? '').split('\n').length))}
          className={cn('rounded-[10px] text-[13.5px]', invalid && 'border-destructive')}
        />
      ) : (
        <Input
          id={id}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={cn('h-10 rounded-[10px]', invalid && 'border-destructive')}
        />
      )}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              className="rounded-full border border-dashed border-border px-2.5 py-1 text-[11.5px] text-muted-foreground hover:border-foreground/30 hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      {help}
    </div>
  );
}
