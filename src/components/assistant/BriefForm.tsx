import { useMemo, useState, type KeyboardEvent } from 'react';
import { ArrowRight, Check, ListChecks, PenLine, Wand2 } from 'lucide-react';
import type { BriefQuestion } from '@/hooks/useAssistant';
import { cn } from '@/lib/utils';

/** Turns the picked answers into the reply the assistant reads (and the user sees). */
function composeAnswer(questions: BriefQuestion[], picks: Record<string, string[]>, custom: Record<string, string>): string {
  const lines = questions.flatMap((q) => {
    const values = [...(picks[q.id] ?? []), ...(custom[q.id]?.trim() ? [custom[q.id].trim()] : [])];
    return values.length ? [`- **${q.label}:** ${values.join(', ')}`] : [];
  });
  if (!lines.length) return 'Just draft it — make the calls yourself.';
  const rest = lines.length < questions.length ? '\n\nUse your judgement on the rest.' : '';
  return `Here's my brief:\n\n${lines.join('\n')}${rest}`;
}

interface BriefFormProps {
  questions: BriefQuestion[];
  /** Answered or superseded by a later message: shown as a compact summary. */
  locked: boolean;
  onSubmit: (answer: string) => void;
}

export function BriefForm({ questions, locked, onSubmit }: BriefFormProps) {
  const [picks, setPicks] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(questions.map((q) => [q.id, q.multi ? q.defaults : q.defaults.slice(0, 1)])),
  );
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [writing, setWriting] = useState<string | null>(null);

  const answered = useMemo(
    () => questions.filter((q) => (picks[q.id]?.length ?? 0) > 0 || !!custom[q.id]?.trim()).length,
    [questions, picks, custom],
  );

  if (locked) {
    return (
      <div className="inline-flex max-w-full items-center gap-2 rounded-[10px] border border-border bg-secondary/50 px-3 py-2 text-[12.5px] text-muted-foreground">
        <ListChecks className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="shrink-0">Brief</span>
        <span className="truncate text-foreground/80">{questions.map((q) => q.label).join(' · ')}</span>
      </div>
    );
  }

  const toggle = (q: BriefQuestion, label: string) =>
    setPicks((p) => {
      const cur = p[q.id] ?? [];
      if (q.multi) return { ...p, [q.id]: cur.includes(label) ? cur.filter((l) => l !== label) : [...cur, label] };
      return { ...p, [q.id]: cur[0] === label ? [] : [label] };
    });

  const setOwn = (q: BriefQuestion, value: string) => {
    setCustom((c) => ({ ...c, [q.id]: value }));
    // A written answer replaces the picked option on single-choice questions.
    if (!q.multi && value.trim()) setPicks((p) => ({ ...p, [q.id]: [] }));
  };

  const submit = () => onSubmit(composeAnswer(questions, picks, custom));
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); }
  };

  return (
    <div
      onKeyDown={onKey}
      className="rounded-[16px] border border-border bg-card shadow-[0_1px_2px_hsl(240_10%_10%/0.04),0_10px_28px_-18px_hsl(240_10%_10%/0.25)] dark:bg-secondary/30 dark:shadow-none animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-3 border-b border-border/70">
        <span className="inline-flex items-center gap-2 text-[12.5px] font-medium text-foreground">
          <ListChecks className="h-4 w-4 text-primary" /> Quick brief
        </span>
        <span className="flex items-center gap-2 text-[11.5px] text-muted-foreground font-mono">
          {answered}/{questions.length}
          <span className="h-1 w-16 rounded-full bg-secondary overflow-hidden">
            <span className="block h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${(answered / questions.length) * 100}%` }} />
          </span>
        </span>
      </div>

      <ol className="divide-y divide-border/60">
        {questions.map((q, i) => {
          const selected = picks[q.id] ?? [];
          const own = custom[q.id] ?? '';
          const isWriting = writing === q.id || !!own;
          return (
            <li key={q.id} className="px-4 py-3.5">
              <div className="flex items-baseline gap-2.5">
                <span className="font-mono text-[11px] text-muted-foreground/80 w-4 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium leading-snug text-foreground">
                    {q.question}
                    {q.multi && <span className="ml-1.5 text-[11.5px] font-normal text-muted-foreground">pick any</span>}
                  </p>
                  {q.hint && <p className="mt-0.5 text-[12.5px] text-muted-foreground leading-snug">{q.hint}</p>}
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {q.options.map((o) => {
                      const on = selected.includes(o.label);
                      return (
                        <button
                          key={o.label}
                          type="button"
                          onClick={() => toggle(q, o.label)}
                          title={o.description}
                          aria-pressed={on}
                          className={cn(
                            'inline-flex items-center gap-1.5 min-h-8 px-3 py-1.5 rounded-[10px] border text-left text-[13px] leading-snug transition-smooth',
                            on
                              ? 'border-primary bg-accent text-accent-foreground font-medium'
                              : 'border-border bg-background/60 text-foreground/80 hover:border-foreground/25 hover:text-foreground dark:bg-transparent',
                          )}
                        >
                          {on && <Check className="h-3.5 w-3.5 shrink-0" />}
                          {o.label}
                        </button>
                      );
                    })}
                    {!isWriting && (
                      <button
                        type="button"
                        onClick={() => setWriting(q.id)}
                        className="inline-flex items-center gap-1.5 min-h-8 px-3 rounded-[10px] border border-dashed border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-smooth"
                      >
                        <PenLine className="h-3.5 w-3.5" /> Other
                      </button>
                    )}
                  </div>
                  {isWriting && (
                    <input
                      autoFocus={writing === q.id}
                      value={own}
                      onChange={(e) => setOwn(q, e.target.value)}
                      onBlur={() => !own.trim() && setWriting(null)}
                      placeholder="Type your own answer…"
                      className="mt-2 w-full h-9 rounded-[10px] border border-border bg-background px-3 text-[13.5px] outline-none focus:border-primary/60 focus:ring-[3px] focus:ring-primary/15 dark:bg-transparent"
                    />
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border/70">
        <button
          type="button"
          onClick={() => onSubmit('Just draft it — make the calls yourself.')}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] text-[13px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-smooth"
        >
          <Wand2 className="h-3.5 w-3.5" /> Just draft it
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={answered === 0}
          className="inline-flex items-center gap-1.5 h-9 pl-4 pr-3 rounded-[10px] bg-foreground text-background text-[13px] font-medium hover:bg-foreground/90 disabled:bg-secondary disabled:text-muted-foreground transition-smooth"
        >
          Continue <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
