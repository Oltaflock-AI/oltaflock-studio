import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Check, ChevronDown, Copy, ExternalLink, Plus, Sparkles } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { ElementDialog } from '@/components/elements/ElementDialog';
import { BriefDialog } from '@/components/brand/BriefDialog';
import { JobCover } from '@/components/brand/JobCover';
import { RecentRuns } from '@/components/brand/RecentRuns';
import { ACTIVE_BRAND, JOB_CATEGORIES, type BrandJob, type BrandKit, type BrandProduct, type JobCategory } from '@/brands';
import { useBrandAssets } from '@/brands/useBrandAssets';
import { cn } from '@/lib/utils';

type Filter = JobCategory | 'all';

/** The brand workspace: pick a job, fill in a short brief, get on-brand work. */
export default function BrandStudio() {
  if (!ACTIVE_BRAND) return <Navigate to="/" replace />;
  return <Workspace brand={ACTIVE_BRAND} />;
}

function Workspace({ brand }: { brand: BrandKit }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [openJob, setOpenJob] = useState<BrandJob | null>(null);
  // A product to add pack shots for; null is the logo; undefined is closed.
  const [adding, setAdding] = useState<BrandProduct | null | undefined>(undefined);

  const shown = brand.jobs.filter((j) => filter === 'all' || j.category === filter);

  return (
    <AppShell>
      <div className="flex w-full flex-col gap-6 px-4 pb-10 pt-5 sm:px-5">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-[720px]">
            <h1 className="font-serif text-[28px] font-medium leading-tight">{brand.name} Studio</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Posters, posts, carousels, pack ideas and reels without waiting on a designer. Pick a job, fill in the brief, and the brand rules and real pack shots go in for you.
            </p>
          </div>
          <a
            href={`https://${brand.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground"
          >
            {brand.website} <ExternalLink className="h-3 w-3" />
          </a>
        </header>

        <BrandSetup brand={brand} onAdd={setAdding} />

        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[15px] font-semibold">What do you need?</h2>
            <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]" role="group" aria-label="Filter jobs">
              {[{ id: 'all' as const, label: 'All' }, ...JOB_CATEGORIES].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={filter === c.id}
                  onClick={() => setFilter(c.id)}
                  className={cn(
                    'shrink-0 rounded-full px-[14px] py-1.5 text-xs transition-colors',
                    filter === c.id ? 'bg-primary font-semibold text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground',
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          {(filter === 'all' ? JOB_CATEGORIES : JOB_CATEGORIES.filter((c) => c.id === filter)).map((c) => {
            const jobs = shown.filter((j) => j.category === c.id);
            if (!jobs.length) return null;
            return (
              <div key={c.id} className="flex flex-col gap-2.5">
                <h3 className="flex flex-wrap items-baseline gap-x-2 text-[13px] font-semibold">
                  {c.label}
                  <span className="font-normal text-muted-foreground">{c.blurb}</span>
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {jobs.map((j) => <JobCard key={j.id} job={j} onOpen={() => setOpenJob(j)} />)}
                </div>
              </div>
            );
          })}
        </section>

        <section id="brand-recent" className="flex scroll-mt-4 flex-col gap-3">
          <h2 className="text-[15px] font-semibold">Recent work</h2>
          <RecentRuns brand={brand} />
        </section>

        <CheatSheet brand={brand} />
      </div>

      <BriefDialog
        brand={brand}
        job={openJob}
        onOpenChange={(o) => !o && setOpenJob(null)}
        onAddPackShot={setAdding}
        onStarted={() => document.getElementById('brand-recent')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
      />
      <ElementDialog
        open={adding !== undefined}
        onOpenChange={(o) => !o && setAdding(undefined)}
        initialValues={adding === null
          ? { name: brand.logoElement, kind: 'logo', description: `The ${brand.name} logo. Keep it crisp and unchanged.` }
          : adding ? { name: adding.element, kind: 'product', description: adding.description } : undefined}
      />
    </AppShell>
  );
}

function JobCard({ job, onOpen }: { job: BrandJob; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col overflow-hidden rounded-[15px] border border-border bg-card text-left transition-smooth hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <JobCover job={job} className="aspect-[16/10] w-full transition-transform duration-500 group-hover:scale-[1.03]" />
      <div className="flex flex-1 flex-col gap-1 px-3 pb-3 pt-2.5">
        <span className="font-serif text-[19px] leading-tight">{job.name}</span>
        <span className="line-clamp-2 text-[12px] text-muted-foreground">{job.tagline}</span>
        <div className="mt-auto flex flex-wrap gap-1 pt-1">
          {job.notes.map((n) => (
            <span key={n} className="rounded-[6px] bg-muted px-1.5 py-0.5 text-[10.5px] text-muted-foreground">{n}</span>
          ))}
        </div>
      </div>
    </button>
  );
}

/** One-time setup: the logo and a pack shot per product, saved as Elements. */
function BrandSetup({ brand, onAdd }: { brand: BrandKit; onAdd: (p: BrandProduct | null) => void }) {
  const { logo, productElement, ready, isLoading } = useBrandAssets(brand);
  const total = brand.products.length + 1;
  const have = ready + (logo ? 1 : 0);
  const complete = have === total;
  const [open, setOpen] = useState(false);
  if (isLoading) return null;
  const expanded = open || !complete;

  return (
    <section className="rounded-[16px] border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full', complete ? 'bg-success/15 text-success' : 'bg-primary/10 text-primary')}>
          {complete ? <Check className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold">
            {complete ? 'Pack shots and logo are set up' : 'Set up once: add the logo and a pack shot per product'}
          </span>
          <span className="block text-[12px] text-muted-foreground">
            {have} of {total} ready. With pack shots, every job shows the real pack instead of an invented one. A clear front photo of each pouch is enough.
          </span>
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-180')} />
      </button>
      {expanded && (
        <div className="grid grid-cols-1 gap-2 border-t border-border px-4 py-3 min-[480px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          <AssetChip label="Logo" sub={`@${brand.logoElement}`} image={logo?.image_urls[0]} onAdd={() => onAdd(null)} />
          {brand.products.map((p) => {
            const el = productElement(p);
            return <AssetChip key={p.id} label={p.flavour} sub={p.line} image={el?.image_urls[0]} onAdd={() => onAdd(p)} />;
          })}
        </div>
      )}
    </section>
  );
}

function AssetChip({ label, sub, image, onAdd }: { label: string; sub: string; image?: string; onAdd: () => void }) {
  return (
    <div className="flex items-center gap-2.5 rounded-[12px] border border-border px-2.5 py-2">
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-[8px] bg-muted">
        {image && <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-medium">{label}</p>
        <p className="truncate text-[11px] text-muted-foreground">{sub}</p>
      </div>
      {image ? (
        <Check className="h-4 w-4 shrink-0 text-success" aria-label="Ready" />
      ) : (
        <button type="button" onClick={onAdd} aria-label={`Add ${label}`} className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] border border-dashed border-border text-muted-foreground hover:text-foreground">
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/** Lines, offers and rules to hand, for writing briefs and captions. */
function CheatSheet({ brand }: { brand: BrandKit }) {
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied', { duration: 1200 });
    } catch {
      toast.error('Could not copy');
    }
  };
  const chip = (text: string) => (
    <button
      key={text}
      type="button"
      onClick={() => copy(text)}
      className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-left text-[12px] hover:border-foreground/25"
    >
      {text} <Copy className="h-3 w-3 shrink-0 text-muted-foreground" />
    </button>
  );

  return (
    <section className="grid gap-3 rounded-[16px] border border-border bg-card p-4 lg:grid-cols-3">
      <div className="flex flex-col gap-2">
        <h2 className="text-[13px] font-semibold">Brand voice</h2>
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">{brand.voice}</p>
        <p className="text-[12.5px] leading-relaxed text-muted-foreground"><span className="font-medium text-foreground">For: </span>{brand.audience}</p>
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-[13px] font-semibold">Lines that work</h2>
        <div className="flex flex-wrap gap-1.5">{brand.taglines.map(chip)}</div>
        <h2 className="mt-1 text-[13px] font-semibold">Offers</h2>
        <div className="flex flex-wrap gap-1.5">{brand.offers.map((o) => chip(`${o.text} · code ${o.code}`))}</div>
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-[13px] font-semibold">Always</h2>
        <ul className="list-disc space-y-0.5 pl-4 text-[12.5px] text-muted-foreground">{brand.rules.map((r) => <li key={r}>{r}</li>)}</ul>
        <h2 className="mt-1 text-[13px] font-semibold">Never</h2>
        <p className="text-[12.5px] text-muted-foreground">{brand.avoid.join(' · ')}</p>
      </div>
    </section>
  );
}
