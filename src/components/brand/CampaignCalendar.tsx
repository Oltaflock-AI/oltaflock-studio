import { useMemo, useState } from 'react';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { CalendarDays, ChevronDown, Repeat, Sparkles } from 'lucide-react';
import { ALWAYS_ON, CAMPAIGNS, type BrandKit, type Campaign, type CampaignIdea } from '@/brands';
import { cn } from '@/lib/utils';

const SHOWN = 3;

function when(days: number) {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

/** Upcoming occasions with ready-made briefs, plus always-on work. Picking an idea opens its job pre-filled. */
export function CampaignCalendar({ brand, onIdea }: { brand: BrandKit; onIdea: (idea: CampaignIdea) => void }) {
  const [all, setAll] = useState(false);
  const today = new Date();
  const upcoming = useMemo(
    () => CAMPAIGNS
      .map((c) => ({ c, days: differenceInCalendarDays(parseISO(c.date), today) }))
      .filter(({ days }) => days >= 0)
      .sort((a, b) => a.days - b.days),
    // Recomputed per render day is enough; today only changes at midnight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [format(today, 'yyyy-MM-dd')],
  );
  // Everything whose prep window has started, topped up with the next ones, in date order.
  const shown = all
    ? upcoming
    : (() => {
        const live = upcoming.filter(({ c, days }) => days <= c.leadDays);
        const rest = upcoming.filter((u) => !live.includes(u)).slice(0, Math.max(0, SHOWN - live.length));
        return [...live, ...rest].sort((x, y) => x.days - y.days);
      })();
  const jobName = (id: string) => brand.jobs.find((j) => j.id === id)?.name ?? id;

  return (
    <section className="flex flex-col gap-3 rounded-[16px] border border-border bg-card p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold"><CalendarDays className="h-4 w-4 text-primary" /> Coming up</h2>
        <p className="text-[12px] text-muted-foreground">Festivals and moments worth making for. Pick an idea and the brief is already filled in.</p>
      </header>

      {shown.length === 0 && <p className="text-[13px] text-muted-foreground">No dated campaigns ahead. Add next year's dates in the brand kit.</p>}

      <ul className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
        {shown.map(({ c, days }) => <CampaignCard key={c.id} campaign={c} days={days} jobName={jobName} onIdea={onIdea} />)}
      </ul>

      {upcoming.length > shown.length && !all || all && upcoming.length > SHOWN ? (
        <button type="button" onClick={() => setAll((a) => !a)} className="inline-flex items-center gap-1 self-start text-[12.5px] font-medium text-muted-foreground hover:text-foreground">
          {all ? 'Show fewer' : `See the full calendar (${upcoming.length})`}
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', all && 'rotate-180')} />
        </button>
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
        <span className="mr-1 inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground"><Repeat className="h-3.5 w-3.5" /> Every week</span>
        {ALWAYS_ON.map((idea) => (
          <IdeaChip key={idea.label} idea={idea} jobName={jobName} onIdea={onIdea} />
        ))}
      </div>
    </section>
  );
}

function CampaignCard({ campaign: c, days, jobName, onIdea }: { campaign: Campaign; days: number; jobName: (id: string) => string; onIdea: (i: CampaignIdea) => void }) {
  const startNow = days <= c.leadDays;
  return (
    <li className={cn('flex flex-col gap-2 rounded-[12px] border p-3', startNow ? 'border-primary/40 bg-primary/[0.04]' : 'border-border')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold">{c.name}</p>
          <p className="text-[12px] text-muted-foreground">{format(parseISO(c.date), 'EEE d MMM yyyy')} · {when(days)}</p>
        </div>
        {startNow && <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10.5px] font-semibold text-primary-foreground">Start now</span>}
      </div>
      <p className="text-[12.5px] leading-snug text-muted-foreground">{c.blurb}</p>
      <div className="mt-auto flex flex-wrap gap-1.5">
        {c.ideas.map((idea) => <IdeaChip key={idea.label} idea={idea} jobName={jobName} onIdea={onIdea} />)}
      </div>
    </li>
  );
}

function IdeaChip({ idea, jobName, onIdea }: { idea: CampaignIdea; jobName: (id: string) => string; onIdea: (i: CampaignIdea) => void }) {
  return (
    <button
      type="button"
      onClick={() => onIdea(idea)}
      title={`Opens ${jobName(idea.jobId)} with this brief`}
      className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[12px] text-foreground/85 transition-colors hover:bg-primary hover:text-primary-foreground"
    >
      <Sparkles className="h-3 w-3" /> {idea.label}
    </button>
  );
}
