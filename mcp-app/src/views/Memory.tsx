import { useEffect, useState } from 'react';
import { MessageSquarePlus, Pencil, Pin, PinOff, Plus, Trash2 } from 'lucide-react';
import { host } from '../bridge';
import { previewUrl, type Element } from '../lib';
import { ConfirmButton, Empty, IconBtn, Spinner, useAction } from '../ui';

interface Memory { id: string; category: string; content: string; pinned: boolean; updated_at: string }

const CATEGORY_LABELS: Record<string, string> = {
  about: 'About you', style: 'Style', brand: 'Brands & clients', subject: 'Recurring subjects',
  technical: 'Technical defaults', dislike: 'Dislikes', workflow: 'Workflow',
};

/** What Oltaflock remembers (memory) and the saved references (elements), editable in place. */
export function MemoryView({ tab: initialTab, categories }: { tab: 'memory' | 'elements'; categories: string[] }) {
  const [tab, setTab] = useState(initialTab);
  return (
    <div className="memory">
      <div className="seg" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'memory'} className={tab === 'memory' ? 'on' : ''} onClick={() => setTab('memory')}>Memory</button>
        <button type="button" role="tab" aria-selected={tab === 'elements'} className={tab === 'elements' ? 'on' : ''} onClick={() => setTab('elements')}>Elements</button>
      </div>
      {tab === 'memory' ? <Memories categories={categories} /> : <Elements />}
    </div>
  );
}

function Memories({ categories }: { categories: string[] }) {
  const [run, busy] = useAction();
  const [items, setItems] = useState<Memory[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [newText, setNewText] = useState('');
  const [newCat, setNewCat] = useState(categories[1] ?? 'style');

  useEffect(() => {
    host.callTool<{ memories: Memory[] }>('studio_list_memories')
      .then((r) => setItems(r.memories ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const patch = (m: Memory, changes: Partial<Memory>) => run(`m${m.id}`, async () => {
    const r = await host.callTool<{ memory: Memory }>('studio_update_memory', { id: m.id, ...changes });
    setItems((list) => list?.map((x) => (x.id === m.id ? r.memory : x)) ?? null);
    setEditing(null);
  });

  const remove = (m: Memory) => run(`m${m.id}`, async () => {
    await host.callTool('studio_forget_memory', { id: m.id });
    setItems((list) => list?.filter((x) => x.id !== m.id) ?? null);
  }, 'Forgotten');

  const add = () => run('add', async () => {
    const r = await host.callTool<{ memory: Memory; created: boolean }>('studio_remember', { content: newText.trim(), category: newCat, pinned: false });
    if (r.created) setItems((list) => [r.memory, ...(list ?? [])]);
    setNewText('');
  }, 'Remembered');

  if (error) return <Empty>{error}</Empty>;
  if (!items) return <div className="loading"><Spinner /> Loading memory…</div>;

  const groups = categories.map((c) => ({ c, list: items.filter((m) => m.category === c) })).filter((g) => g.list.length);

  return (
    <div className="stack">
      <form className="inline-form" onSubmit={(e) => { e.preventDefault(); if (newText.trim().length >= 3) add(); }}>
        <select value={newCat} onChange={(e) => setNewCat(e.target.value)} aria-label="Category">
          {categories.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>)}
        </select>
        <input value={newText} maxLength={400} onChange={(e) => setNewText(e.target.value)} placeholder="Something to remember, e.g. brand blue is #229DE7" />
        <button type="submit" className="btn primary sm" disabled={newText.trim().length < 3 || busy === 'add'}><Plus width={13} height={13} /> Add</button>
      </form>

      {!groups.length && <Empty>Nothing saved yet. Add a preference above, or tell the chat things like “never use lens flare”.</Empty>}
      {groups.map(({ c, list }) => (
        <section key={c}>
          <h3>{CATEGORY_LABELS[c] ?? c}</h3>
          <ul className="mem-list">
            {list.map((m) => (
              <li key={m.id} className={m.pinned ? 'pinned' : ''}>
                {editing === m.id ? (
                  <form className="inline-form grow" onSubmit={(e) => { e.preventDefault(); if (draft.trim().length >= 3) patch(m, { content: draft.trim() }); }}>
                    <input autoFocus value={draft} maxLength={400} onChange={(e) => setDraft(e.target.value)} />
                    <button type="submit" className="btn primary sm">Save</button>
                    <button type="button" className="btn ghost sm" onClick={() => setEditing(null)}>Cancel</button>
                  </form>
                ) : (
                  <>
                    <span className="grow">{m.content}</span>
                    <IconBtn label={m.pinned ? 'Unpin' : 'Pin (always applied)'} active={m.pinned} busy={busy === `m${m.id}`} onClick={() => patch(m, { pinned: !m.pinned })}>
                      {m.pinned ? <PinOff width={14} height={14} /> : <Pin width={14} height={14} />}
                    </IconBtn>
                    <IconBtn label="Edit" onClick={() => { setEditing(m.id); setDraft(m.content); }}><Pencil width={14} height={14} /></IconBtn>
                    <ConfirmButton className="icon-btn" onConfirm={() => remove(m)} confirm={<span className="danger-text">Forget</span>}>
                      <Trash2 width={14} height={14} aria-label="Forget" />
                    </ConfirmButton>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Elements() {
  const [run] = useAction();
  const [items, setItems] = useState<Element[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    host.callTool<{ elements: Element[] }>('studio_list_elements')
      .then((r) => setItems(r.elements ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const remove = (el: Element) => run(`e${el.id}`, async () => {
    await host.callTool('studio_delete_element', { id: el.id });
    setItems((list) => list?.filter((x) => x.id !== el.id) ?? null);
  }, `Deleted @${el.name}`);

  const use = (el: Element) => run('use', () => host.sendMessage(`Use @${el.name} (my saved ${el.kind}) in what we make next.`), 'Sent to chat');

  if (error) return <Empty>{error}</Empty>;
  if (!items) return <div className="loading"><Spinner /> Loading elements…</div>;
  if (!items.length) return <Empty>No elements yet. On any generated image, open ⋯ → Save as element to reuse a character or product across shots.</Empty>;

  return (
    <div className="elements">
      {items.map((el) => (
        <div key={el.id} className="element">
          <div className="strip">
            {el.image_urls.slice(0, 3).map((u) => <img key={u} src={previewUrl(u, 240)} alt="" />)}
          </div>
          <div className="meta">
            <div className="t">
              <div className="title">@{el.name}</div>
              <div className="sub">{el.kind}{el.description ? ` · ${el.description}` : ''}</div>
            </div>
          </div>
          <div className="actions">
            <button type="button" className="btn outline sm" onClick={() => use(el)}><MessageSquarePlus width={13} height={13} /> Use</button>
            <span className="grow" />
            <ConfirmButton className="btn ghost sm" onConfirm={() => remove(el)} confirm={<span className="danger-text">Delete @{el.name}</span>}>
              <Trash2 width={13} height={13} />
            </ConfirmButton>
          </div>
        </div>
      ))}
    </div>
  );
}
