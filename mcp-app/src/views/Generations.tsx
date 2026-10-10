import { useState } from 'react';
import { host } from '../bridge';
import { GenerationCard } from '../GenerationCard';
import { merge, titleOf, usePolling, type Generation } from '../lib';
import { Empty, useToast } from '../ui';

/** Results of studio_generate / studio_get_generations / studio_list_generations, updating live. */
export function GenerationsView({ initial }: { initial: Generation[] }) {
  const [items, setItems] = useState(initial);
  const toast = useToast();
  usePolling(items, (fresh) => setItems((list) => merge(list, fresh)));

  if (!items.length) return <Empty>No generations to show.</Empty>;
  const multi = items.length > 1;
  const replace = (g: Generation) => setItems((list) => list.map((x) => (x.id === g.id ? g : x)));
  const add = (g: Generation) => setItems((list) => [g, ...list]);

  const pick = async (g: Generation, i: number) => {
    const text = `I pick #${i + 1}: “${titleOf(g)}” (PROMUNCH Studio generation ${g.id}, ${g.output_url}).`;
    host.updateContext(text, { picked_generation_id: g.id });
    try { await host.sendMessage(text); } catch (e) { toast(e instanceof Error ? e.message : String(e), 'error'); }
  };

  return (
    <div className={multi ? 'grid' : 'single'}>
      {items.map((g, i) => (
        <GenerationCard key={g.id} g={g} compact={multi} onChange={replace} onAdd={add} onPick={multi ? () => pick(g, i) : undefined} />
      ))}
    </div>
  );
}
