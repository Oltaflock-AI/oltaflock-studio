import { Link } from 'react-router-dom';
import { Coins, ArrowUpRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserCredits } from '@/hooks/useUserCredits';

const formatCredits = (n: number) =>
  n.toLocaleString(undefined, { maximumFractionDigits: n % 1 === 0 ? 0 : 1 });

/**
 * Credits summary. There is no plan/allowance data in the backend, so we show
 * the real balance plus lifetime stats instead of a usage bar.
 */
export function PlanSection() {
  const { balance, totalSpent, totalGenerations, isLoading } = useUserCredits();

  const avgPerGeneration = totalGenerations > 0 ? totalSpent / totalGenerations : null;

  return (
    <section
      aria-labelledby="settings-credits"
      className="relative overflow-hidden rounded-[18px] border border-primary/20 bg-gradient-to-br from-primary/15 via-card to-card px-6 py-[22px] flex flex-col gap-4 shadow-sm"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative flex items-center justify-between">
        <h2
          id="settings-credits"
          className="text-[11px] font-medium uppercase tracking-[0.06em] text-primary"
        >
          Credits
        </h2>
        <span className="flex items-center gap-1.5 rounded-full bg-warning/10 border border-warning/25 px-2.5 py-0.5 text-[11px] text-foreground/80">
          <Coins className="h-3 w-3 text-warning" aria-hidden="true" />
          Balance
        </span>
      </div>

      <div className="relative">
        {isLoading ? (
          <Skeleton className="h-10 w-40" />
        ) : (
          <p className="font-serif text-[34px] font-medium leading-none text-foreground">
            {balance != null ? formatCredits(balance) : '—'}{' '}
            <span className="font-sans text-[15px] font-normal text-muted-foreground">credits left</span>
          </p>
        )}
      </div>

      <dl className="relative grid grid-cols-3 gap-2">
        {[
          { label: 'Total spent', value: isLoading ? null : formatCredits(totalSpent) },
          { label: 'Generations', value: isLoading ? null : totalGenerations.toLocaleString() },
          {
            label: 'Avg / generation',
            value: isLoading ? null : avgPerGeneration != null ? formatCredits(avgPerGeneration) : '—',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col gap-1 rounded-[12px] border border-border/70 bg-background/50 px-3 py-2.5 min-w-0"
          >
            <dt className="text-[10.5px] uppercase tracking-[0.05em] text-muted-foreground truncate">
              {stat.label}
            </dt>
            <dd className="text-[15px] font-semibold tabular-nums text-foreground">
              {stat.value ?? <Skeleton className="h-4 w-10" />}
            </dd>
          </div>
        ))}
      </dl>

      <Link
        to="/library?tab=history"
        className="relative self-start inline-flex items-center gap-1.5 rounded-[10px] bg-foreground px-4 py-2 text-[12.5px] font-semibold text-background transition-smooth hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
      >
        View generation history
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </section>
  );
}
