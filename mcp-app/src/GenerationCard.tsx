import { useEffect, useState } from 'react';
import {
  Check, Download, ExternalLink, Film, FolderInput, FolderPlus, ImagePlus, Maximize2, MessageSquarePlus, MoreHorizontal,
  Pencil, RefreshCw, Shapes, SlidersHorizontal, Sparkles, Star, Wand2, X, ZoomIn,
} from 'lucide-react';
import { host } from './bridge';
import { fileNameOf, titleOf, type Folder, type Generation } from './lib';
import { ConfirmButton, IconBtn, Media, Menu, MenuItem, useAction, useNav, useToast } from './ui';

let folderCache: Promise<Folder[]> | null = null;
export function loadFolders(refresh = false): Promise<Folder[]> {
  if (!folderCache || refresh) {
    folderCache = host.callTool<{ folders: Folder[] }>('studio_list_folders').then((r) => r.folders ?? []);
    folderCache.catch(() => { folderCache = null; });
  }
  return folderCache;
}

const ELEMENT_KINDS = ['character', 'product', 'logo', 'place', 'style', 'other'];

type Panel = null | 'rename' | 'edit' | 'element' | 'newFolder';

/**
 * One generation with everything you can do to it: star, rename, file, download,
 * view large, regenerate (after confirming the cost), hand it back to the model
 * (variations, animate, edit…) or reuse it (composer, element).
 */
export function GenerationCard({ g, onChange, onAdd, compact, onPick }: {
  g: Generation;
  onChange: (g: Generation) => void;
  /** Called with a new generation started from this card (regenerate). */
  onAdd?: (g: Generation) => void;
  compact?: boolean;
  /** Shown on multi-result cards: "this one". */
  onPick?: () => void;
}) {
  const [run, busy] = useAction();
  const toast = useToast();
  const nav = useNav();
  const [panel, setPanel] = useState<Panel>(null);
  const [text, setText] = useState('');
  const [kind, setKind] = useState('character');
  const [folders, setFolders] = useState<Folder[] | null>(null);
  const [zoom, setZoom] = useState(false);
  const done = g.status === 'done' && !!g.output_url;
  const name = titleOf(g);
  const ref = `“${name}” (Oltaflock generation ${g.id}${g.output_url ? `, ${g.output_url}` : ''})`;

  const open = (p: Panel, initial = '') => { setPanel(p); setText(initial); };
  const ask = (message: string) => run('ask', async () => {
    await host.sendMessage(message);
  }, 'Sent to chat');

  const star = () => run('star', async () => {
    const r = await host.callTool<{ starred: boolean }>('studio_app_star', { id: g.id });
    onChange({ ...g, starred: r.starred });
    toast(r.starred ? 'Starred' : 'Unstarred');
  });

  const rename = () => run('rename', async () => {
    const r = await host.callTool<{ generation: Generation }>('studio_update_generation', { id: g.id, title: text.trim() });
    onChange({ ...g, title: r.generation.title });
    setPanel(null);
  }, 'Renamed');

  const moveTo = (folder: Folder | null) => run('folder', async () => {
    await host.callTool('studio_update_generation', { id: g.id, folder_id: folder?.id ?? null });
    onChange({ ...g, folder_id: folder?.id ?? null });
  }, folder ? `Moved to ${folder.name}` : 'Moved to Unfiled');

  const newFolder = () => run('folder', async () => {
    const r = await host.callTool<{ folder: Folder }>('studio_create_folder', { name: text.trim() });
    await host.callTool('studio_update_generation', { id: g.id, folder_id: r.folder.id });
    onChange({ ...g, folder_id: r.folder.id });
    loadFolders(true);
    setPanel(null);
  }, `Filed in ${text.trim()}`);

  const regenerate = () => run('rerun', async () => {
    const r = await host.callTool<{ generation: Generation; credits: number }>('studio_app_rerun', { id: g.id });
    onAdd?.(r.generation);
    host.updateContext(`The user regenerated ${ref} from the chat panel. New generation id: ${r.generation.id} (${r.credits} credits).`);
  }, 'Regenerating…');

  const saveElement = () => run('element', async () => {
    const clean = text.trim().replace(/\s+/g, '_');
    await host.callTool('studio_save_element', { name: clean, kind, image_urls: [g.output_url], description: g.prompt?.slice(0, 600) || undefined });
    setPanel(null);
    host.updateContext(`The user saved ${ref} as element @${clean} (${kind}).`);
    toast(`Saved as @${clean}`);
  });

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeZoom(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  const openZoom = () => { setZoom(true); if (host.canFullscreen && host.displayMode === 'inline') host.setDisplayMode('fullscreen'); };
  const closeZoom = () => { setZoom(false); };

  return (
    <div className={`card${compact ? ' compact' : ''}`}>
      <Media g={g} width={compact ? 512 : 1024} onOpen={done ? openZoom : undefined} />

      <div className="meta">
        <div className="t">
          <div className="title" title={g.prompt}>{name}</div>
          <div className="sub">{[g.model, g.credits ? `${g.credits} credits` : ''].filter(Boolean).join(' · ')}</div>
        </div>
        {onPick && done && <button type="button" className="btn outline sm" onClick={onPick}><Check width={13} height={13} /> Pick</button>}
      </div>

      {done && (
        <div className="actions">
          <IconBtn label={g.starred ? 'Unstar' : 'Star'} active={g.starred} busy={busy === 'star'} onClick={star}>
            <Star width={15} height={15} fill={g.starred ? 'currentColor' : 'none'} />
          </IconBtn>
          <IconBtn label="Rename" onClick={() => open('rename', g.title ?? '')}><Pencil width={15} height={15} /></IconBtn>
          <Menu
            align="left"
            trigger={(toggle) => (
              <IconBtn label="Move to folder" busy={busy === 'folder'} onClick={() => { toggle(); loadFolders().then(setFolders).catch(() => setFolders([])); }}>
                <FolderInput width={15} height={15} />
              </IconBtn>
            )}
          >
            {(close) => (
              <>
                {folders === null && <div className="menu-note">Loading folders…</div>}
                {folders?.map((f) => (
                  <MenuItem key={f.id} onClick={() => { close(); moveTo(f); }} icon={g.folder_id === f.id ? <Check width={14} height={14} /> : <span className="dot" style={{ background: f.color ?? 'var(--muted)' }} />}>
                    {f.name}
                  </MenuItem>
                ))}
                {g.folder_id && <MenuItem onClick={() => { close(); moveTo(null); }} icon={<X width={14} height={14} />}>Remove from folder</MenuItem>}
                <MenuItem onClick={() => { close(); open('newFolder'); }} icon={<FolderPlus width={14} height={14} />}>New folder…</MenuItem>
              </>
            )}
          </Menu>
          <IconBtn label="Download" onClick={() => host.download(g.output_url!, fileNameOf(g), g.type === 'video' ? 'video/mp4' : undefined)}>
            <Download width={15} height={15} />
          </IconBtn>
          <IconBtn label="View large" onClick={openZoom}><Maximize2 width={15} height={15} /></IconBtn>

          <span className="grow" />

          {g.model_id && (
            <ConfirmButton
              className="btn ghost sm"
              busy={busy === 'rerun'}
              onConfirm={regenerate}
              confirm={<>Spend {g.credits ?? '?'} credits</>}
            >
              <RefreshCw width={13} height={13} /> Regenerate
            </ConfirmButton>
          )}
          <Menu
            trigger={(toggle) => <IconBtn label="More" busy={busy === 'ask'} onClick={toggle}><MoreHorizontal width={16} height={16} /></IconBtn>}
          >
            {(close) => (
              <>
                <div className="menu-label">Ask {host.kind === 'openai' ? 'ChatGPT' : 'Claude'}</div>
                <MenuItem icon={<Sparkles width={14} height={14} />} onClick={() => { close(); ask(`Make 3 variations of ${ref}. Keep what works; vary composition, angle and lighting.`); }}>Variations</MenuItem>
                {g.type === 'image' && (
                  <MenuItem icon={<Film width={14} height={14} />} onClick={() => { close(); ask(`Animate ${ref} into a short video, using it as the first frame (image-to-video). Suggest the motion and a good model, and tell me the cost first.`); }}>Animate into video</MenuItem>
                )}
                {g.type === 'image' && <MenuItem icon={<Wand2 width={14} height={14} />} onClick={() => { close(); open('edit'); }}>Edit with a prompt…</MenuItem>}
                {g.type === 'image' && (
                  <MenuItem icon={<ZoomIn width={14} height={14} />} onClick={() => { close(); ask(`Upscale ${ref} to the highest quality available.`); }}>Upscale</MenuItem>
                )}
                <MenuItem icon={<MessageSquarePlus width={14} height={14} />} onClick={() => { close(); ask(`Use ${ref} as the reference for what we make next.`); }}>Use as reference</MenuItem>
                <div className="menu-sep" />
                <MenuItem icon={<SlidersHorizontal width={14} height={14} />} onClick={() => { close(); nav.push({ kind: 'composer', prefill: { prompt: g.prompt, model_id: g.model_id ?? undefined } }); }}>Tweak in Studio panel</MenuItem>
                {g.type === 'image' && (
                  <MenuItem icon={<ImagePlus width={14} height={14} />} onClick={() => { close(); nav.push({ kind: 'composer', prefill: { reference_images: [g.output_url], output: 'video' } }); }}>Use as reference in Studio</MenuItem>
                )}
                {g.type === 'image' && <MenuItem icon={<Shapes width={14} height={14} />} onClick={() => { close(); open('element'); }}>Save as element…</MenuItem>}
                <MenuItem icon={<ExternalLink width={14} height={14} />} onClick={() => { close(); host.openLink(g.studio_url); }}>Open in Oltaflock</MenuItem>
              </>
            )}
          </Menu>
        </div>
      )}

      {g.status === 'error' && (
        <div className="actions">
          <button type="button" className="btn ghost sm" onClick={() => ask(`Generation ${ref} failed: "${g.error}". Figure out why and try again with a fix.`)}>
            <Sparkles width={13} height={13} /> Ask to fix
          </button>
          <span className="grow" />
          {g.model_id && (
            <ConfirmButton className="btn ghost sm" busy={busy === 'rerun'} onConfirm={regenerate} confirm={<>Spend {g.credits ?? '?'} credits</>}>
              <RefreshCw width={13} height={13} /> Retry
            </ConfirmButton>
          )}
        </div>
      )}

      {panel && (
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            if (panel === 'rename') rename();
            else if (panel === 'newFolder') newFolder();
            else if (panel === 'element') saveElement();
            else if (panel === 'edit') { ask(`Edit ${ref}: ${text.trim()}. Use an image edit model with it as the reference.`); setPanel(null); }
          }}
        >
          {panel === 'element' && (
            <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Element kind">
              {ELEMENT_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          )}
          <input
            autoFocus
            value={text}
            maxLength={panel === 'element' ? 40 : panel === 'newFolder' ? 60 : 300}
            onChange={(e) => setText(panel === 'element' ? e.target.value.replace(/[^A-Za-z0-9_\- ]/g, '') : e.target.value)}
            placeholder={{ rename: 'Name', newFolder: 'Folder name', element: 'Element name, e.g. Maya', edit: 'What should change? e.g. make it night time' }[panel]}
          />
          <button type="submit" className="btn primary sm" disabled={!text.trim() || !!busy}>
            {{ rename: 'Save', newFolder: 'Create', element: 'Save', edit: 'Send' }[panel]}
          </button>
          <button type="button" className="btn ghost sm" onClick={() => setPanel(null)}>Cancel</button>
        </form>
      )}

      {zoom && done && (
        <div className="lightbox" role="dialog" aria-label={name} onClick={closeZoom}>
          <button type="button" className="icon-btn close" aria-label="Close" onClick={closeZoom}><X width={18} height={18} /></button>
          <div className="lightbox-body" onClick={(e) => e.stopPropagation()}>
            {g.type === 'video'
              ? <video src={g.output_url!} controls autoPlay playsInline loop />
              : <img src={g.output_url!} alt={name} />}
            <div className="lightbox-meta">
              <div className="title">{name}</div>
              {g.prompt && <p>{g.prompt}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
