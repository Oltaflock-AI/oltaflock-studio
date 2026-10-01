import { useCallback, useEffect, useState } from 'react';
import { Check, Film, FolderInput, MessageSquarePlus, Search, X } from 'lucide-react';
import { host } from '../bridge';
import { GenerationCard, loadFolders } from '../GenerationCard';
import { merge, plural, titleOf, useDebounced, usePolling, type Folder, type Generation } from '../lib';
import { Empty, Media, Menu, MenuItem, Spinner, useAction } from '../ui';

const PAGE = 30;

/** The user's library as a grid: filter, open, select several and hand them to the chat. */
export function LibraryView({ filters }: { filters?: { folder_id?: string; type?: 'image' | 'video'; search?: string } }) {
  const [run, busy] = useAction();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderId, setFolderId] = useState(filters?.folder_id ?? '');
  const [type, setType] = useState<'' | 'image' | 'video'>(filters?.type ?? '');
  const [search, setSearch] = useState(filters?.search ?? '');
  const q = useDebounced(search, 350);
  const [items, setItems] = useState<Generation[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => { loadFolders().then(setFolders).catch(() => {}); }, []);

  const fetchPage = useCallback((offset: number) => host.callTool<{ generations: Generation[]; total: number }>('studio_list_generations', {
    limit: PAGE, offset, folder_id: folderId || undefined, type: type || undefined, search: q.trim() || undefined,
  }), [folderId, type, q]);

  useEffect(() => {
    let live = true;
    setItems(null);
    setError(null);
    fetchPage(0)
      .then((r) => { if (live) { setItems(r.generations ?? []); setTotal(r.total ?? 0); } })
      .catch((e) => { if (live) setError(e instanceof Error ? e.message : String(e)); });
    return () => { live = false; };
  }, [fetchPage]);

  usePolling(items ?? [], (fresh) => setItems((list) => (list ? merge(list, fresh) : list)));

  const more = async () => {
    if (!items) return;
    setLoadingMore(true);
    try {
      const r = await fetchPage(items.length);
      setItems([...items, ...(r.generations ?? [])]);
    } finally {
      setLoadingMore(false);
    }
  };

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const picked = (items ?? []).filter((g) => selected.has(g.id));
  const describe = (list: Generation[]) => list.map((g, i) => `${i + 1}. “${titleOf(g)}” (${g.type}, id ${g.id}${g.output_url ? `, ${g.output_url}` : ''})`).join('\n');

  const send = (intro: string) => run('send', async () => {
    await host.sendMessage(`${intro}\n${describe(picked)}`);
    setSelected(new Set());
  }, 'Sent to chat');

  const moveAll = (folder: Folder | null) => run('move', async () => {
    await Promise.all(picked.map((g) => host.callTool('studio_update_generation', { id: g.id, folder_id: folder?.id ?? null })));
    setItems((list) => list?.map((g) => (selected.has(g.id) ? { ...g, folder_id: folder?.id ?? null } : g)) ?? null);
    setSelected(new Set());
  }, `Moved ${plural(picked.length, 'item')}`);

  const openItem = (id: string) => {
    setOpenId(id);
    if (host.canFullscreen && host.displayMode === 'inline') host.setDisplayMode('fullscreen');
  };
  const open = items?.find((g) => g.id === openId);
  const replace = (g: Generation) => setItems((list) => list?.map((x) => (x.id === g.id ? g : x)) ?? null);

  return (
    <div className="library">
      <div className="row wrap gap toolbar">
        <label className="search grow"><Search width={14} height={14} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search names and prompts" /></label>
        <span className="seg sm">
          {([['', 'All'], ['image', 'Images'], ['video', 'Videos']] as const).map(([v, label]) => (
            <button key={v} type="button" className={type === v ? 'on' : ''} onClick={() => setType(v)}>{label}</button>
          ))}
        </span>
        <select value={folderId} onChange={(e) => setFolderId(e.target.value)} aria-label="Folder">
          <option value="">All folders</option>
          {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>

      {error && <Empty>{error}</Empty>}
      {!error && items === null && <div className="loading"><Spinner /> Loading your library…</div>}
      {items?.length === 0 && <Empty>Nothing here{q || type || folderId ? ' with these filters' : ' yet'}.</Empty>}

      {items && items.length > 0 && (
        <>
          <div className="muted small">{plural(total, 'item')}{selected.size ? ` · ${selected.size} selected` : ' · click the circle to select several'}</div>
          <div className="tiles">
            {items.map((g) => (
              <div key={g.id} className={`tile${selected.has(g.id) ? ' selected' : ''}`}>
                <Media g={g} width={360} fill controls={false} onOpen={() => (selected.size ? toggle(g.id) : openItem(g.id))} />
                <button type="button" className="tick" aria-label={selected.has(g.id) ? 'Deselect' : 'Select'} aria-pressed={selected.has(g.id)} onClick={() => toggle(g.id)}>
                  <Check width={12} height={12} strokeWidth={3} />
                </button>
                <span className="tile-title">{titleOf(g)}</span>
              </div>
            ))}
          </div>
          {items.length < total && (
            <button type="button" className="btn outline more" onClick={more} disabled={loadingMore}>
              {loadingMore ? <Spinner size={14} /> : null} Load more
            </button>
          )}
        </>
      )}

      {selected.size > 0 && (
        <div className="selection-bar">
          <span><b>{selected.size}</b> selected</span>
          <span className="grow" />
          <button type="button" className="btn primary sm" disabled={!!busy} onClick={() => send('Use these from my Oltaflock library as references for what we make next:')}>
            <MessageSquarePlus width={13} height={13} /> Use in chat
          </button>
          {picked.some((g) => g.type === 'image') && (
            <button type="button" className="btn outline sm" disabled={!!busy} onClick={() => send('Animate these into short videos (image-to-video, each as the first frame). Suggest motion for each and tell me the total cost first:')}>
              <Film width={13} height={13} /> Animate
            </button>
          )}
          <Menu trigger={(t) => <button type="button" className="btn outline sm" onClick={t} disabled={!!busy}><FolderInput width={13} height={13} /> Move</button>}>
            {(close) => (
              <>
                {folders.map((f) => <MenuItem key={f.id} onClick={() => { close(); moveAll(f); }} icon={<span className="dot" style={{ background: f.color ?? 'var(--muted)' }} />}>{f.name}</MenuItem>)}
                <MenuItem onClick={() => { close(); moveAll(null); }} icon={<X width={14} height={14} />}>Unfiled</MenuItem>
              </>
            )}
          </Menu>
          <button type="button" className="btn ghost sm" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      {open && (
        <div className="sheet" role="dialog" aria-label={titleOf(open)} onClick={() => setOpenId(null)}>
          <div className="sheet-body" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="icon-btn close" aria-label="Close" onClick={() => setOpenId(null)}><X width={18} height={18} /></button>
            <GenerationCard g={open} onChange={replace} onAdd={(g) => setItems((list) => (list ? [g, ...list] : list))} />
          </div>
        </div>
      )}
    </div>
  );
}
