import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Copy, Plug, Loader2, Unplug, Sparkles, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { SettingsCard } from './SettingsCard';

/** Public address of the PROMUNCH Studio MCP server (supabase/functions/mcp, proxied by vercel.json). */
export const MCP_SERVER_URL = 'https://studio.promunch.in/mcp';

type Step = { text: React.ReactNode; code?: string };

interface AppGuide {
  id: string;
  label: string;
  note?: string;
  steps: Step[];
}

const Em = ({ children }: { children: React.ReactNode }) => (
  <span className="font-medium text-foreground">{children}</span>
);

const GUIDES: AppGuide[] = [
  {
    id: 'claude',
    label: 'Claude',
    note: 'Works on claude.ai, Claude Desktop and the Claude mobile apps — add it once and it appears everywhere you sign in.',
    steps: [
      { text: <>Open <Em>claude.ai</Em> (or Claude Desktop) and go to <Em>Settings → Connectors</Em>.</> },
      { text: <>Click <Em>Add custom connector</Em>. Name it <Em>PROMUNCH Studio</Em> and paste the server URL:</>, code: MCP_SERVER_URL },
      { text: <>Click <Em>Add</Em>, then <Em>Connect</Em>. A window opens on PROMUNCH Studio — sign in if asked and choose <Em>Allow access</Em>.</> },
      { text: <>In a new chat, open the <Em>+</Em> menu → <Em>Connectors</Em> and make sure PROMUNCH Studio is switched on.</> },
    ],
  },
  {
    id: 'chatgpt',
    label: 'ChatGPT',
    note: 'Custom connectors need a paid ChatGPT plan with Developer mode.',
    steps: [
      { text: <>In ChatGPT open <Em>Settings → Apps & Connectors → Advanced settings</Em> and turn on <Em>Developer mode</Em>.</> },
      { text: <>Back in <Em>Apps & Connectors</Em>, click <Em>Create</Em>. Name it <Em>PROMUNCH Studio</Em> and paste the MCP server URL:</>, code: MCP_SERVER_URL },
      { text: <>Set <Em>Authentication</Em> to <Em>OAuth</Em>, tick <Em>I trust this application</Em> and click <Em>Create</Em>.</> },
      { text: <>Sign in to PROMUNCH Studio in the window that opens and choose <Em>Allow access</Em>.</> },
      { text: <>In a chat, click <Em>+</Em> → <Em>Developer mode</Em> and enable PROMUNCH Studio.</> },
    ],
  },
  {
    id: 'claude-code',
    label: 'Claude Code',
    steps: [
      { text: <>Add the server from your terminal:</>, code: `claude mcp add --transport http promunch ${MCP_SERVER_URL}` },
      { text: <>Start Claude Code, run <Em>/mcp</Em>, pick <Em>promunch</Em> and choose <Em>Authenticate</Em>.</> },
      { text: <>Your browser opens on PROMUNCH Studio — choose <Em>Allow access</Em> and return to the terminal.</> },
    ],
  },
  {
    id: 'other',
    label: 'Other apps',
    note: 'Any MCP client that supports remote (Streamable HTTP) servers with OAuth — Cursor, VS Code, Windsurf and others.',
    steps: [
      { text: <>Add a remote MCP server with this URL. Most apps accept a config like:</>, code: JSON.stringify({ mcpServers: { promunch: { url: MCP_SERVER_URL } } }, null, 2) },
      { text: <>When the app asks you to sign in, approve access on the PROMUNCH Studio page that opens.</> },
    ],
  },
];

const EXAMPLES = [
  'Direct a 20-second 9:16 ad for our new cold brew — three shots, same bottle in every shot.',
  'Look at my memory and make four product shots in my usual style.',
  'Turn my last generated image into a slow push-in video with Kling.',
  'Save "Masala Mania shots always use an orange backdrop" to memory.',
];

const ABILITIES = [
  'Generate images and videos with every Studio model',
  'Plan multi-shot videos and keep characters consistent with @elements',
  'Read and update your creative memory',
  'Search, rename and organise your library',
];

function CopyButton({ value, label = 'Copy', className }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      toast.error('Could not copy — select the text and copy it manually');
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={copy}
      aria-label={copied ? 'Copied' : label}
      className={cn('h-8 shrink-0 gap-1.5 rounded-[8px] px-2.5 text-xs', className)}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
      {copied ? 'Copied' : label}
    </Button>
  );
}

function CodeLine({ value }: { value: string }) {
  const multiline = value.includes('\n');
  return (
    <div className={cn('mt-2 flex gap-2 rounded-[10px] border border-border bg-muted/50 py-1.5 pl-3 pr-1.5', multiline ? 'items-start' : 'items-center')}>
      <code className={cn('min-w-0 flex-1 font-mono text-[11.5px] text-foreground', multiline ? 'whitespace-pre overflow-x-auto py-1' : 'break-all py-1')}>
        {value}
      </code>
      <CopyButton value={value} />
    </div>
  );
}

type Grant = { client: { id: string; name: string; uri: string; logo_uri: string }; scopes: string[]; granted_at: string };

function ConnectedApps() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [revoking, setRevoking] = useState<Grant | null>(null);
  const [busy, setBusy] = useState(false);
  const key = ['oauth-grants', user?.id];

  const { data: grants = [], isLoading, error } = useQuery({
    queryKey: key,
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.auth.oauth.listGrants();
      if (error) throw error;
      return (data ?? []) as Grant[];
    },
  });

  const revoke = async () => {
    if (!revoking) return;
    setBusy(true);
    const { error } = await supabase.auth.oauth.revokeGrant({ clientId: revoking.client.id });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${revoking.client.name || 'App'} disconnected`);
    setRevoking(null);
    queryClient.invalidateQueries({ queryKey: key });
  };

  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-[12.5px] font-medium">Connected apps</span>
      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Loading…
        </div>
      ) : error ? (
        <p className="text-xs text-muted-foreground">Couldn't load connected apps right now.</p>
      ) : grants.length === 0 ? (
        <p className="text-xs text-muted-foreground">No apps connected yet. Follow the steps above — the app shows up here once you allow access.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-[12px] border border-border">
          {grants.map((g) => (
            <li key={g.client.id} className="flex items-center gap-3 px-3.5 py-2.5">
              {g.client.logo_uri ? (
                <img src={g.client.logo_uri} alt="" className="h-7 w-7 shrink-0 rounded-[7px] object-contain" />
              ) : (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-muted">
                  <Plug className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                </div>
              )}
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13px] font-medium">{g.client.name || 'Unnamed app'}</span>
                <span className="text-[11.5px] text-muted-foreground">
                  Connected {new Date(g.granted_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRevoking(g)}
                className="h-8 gap-1.5 rounded-[8px] px-2.5 text-xs text-muted-foreground hover:text-destructive"
              >
                <Unplug className="h-3.5 w-3.5" aria-hidden="true" />
                Disconnect
              </Button>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={!!revoking} onOpenChange={(open) => !open && !busy && setRevoking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {revoking?.client.name || 'this app'}?</AlertDialogTitle>
            <AlertDialogDescription>
              It will lose access to your Studio straight away. Your generations, memory and elements stay as they are,
              and you can connect it again any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); revoke(); }}
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-label="Working" /> : 'Disconnect'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Settings guide for connecting Claude, ChatGPT and other MCP clients to the Studio. */
export function ConnectAISection() {
  return (
    <SettingsCard
      title="Connect Claude & ChatGPT"
      icon={<Plug className="h-3.5 w-3.5 text-primary" aria-hidden="true" />}
      description="Use PROMUNCH Studio from your AI chat. Ask for images or whole videos in plain words — they're made with your credits, saved to your library, and follow your memory."
    >
      <div className="flex flex-col gap-5">
        {/* Server URL */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-medium">Server URL</span>
          <div className="flex items-center gap-2 rounded-[11px] border border-primary/30 bg-primary/[0.04] py-1.5 pl-3.5 pr-1.5">
            <code className="min-w-0 flex-1 truncate font-mono text-[12px]">{MCP_SERVER_URL}</code>
            <CopyButton value={MCP_SERVER_URL} label="Copy URL" />
          </div>
          <p className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            No API key needed — you sign in with your PROMUNCH Studio account and approve access.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          {/* Setup steps per app */}
          <Tabs defaultValue="claude" className="flex min-w-0 flex-col gap-3">
            <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-[11px] bg-muted/60 p-1 sm:w-fit">
              {GUIDES.map((g) => (
                <TabsTrigger key={g.id} value={g.id} className="rounded-[9px] px-3 py-1.5 text-xs">
                  {g.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {GUIDES.map((g) => (
              <TabsContent key={g.id} value={g.id} className="mt-0 flex flex-col gap-3 data-[state=inactive]:hidden">
                <ol className="flex flex-col gap-3.5">
                  {g.steps.map((s, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1 pt-px text-[13px] leading-relaxed text-muted-foreground">
                        {s.text}
                        {s.code && <CodeLine value={s.code} />}
                      </div>
                    </li>
                  ))}
                </ol>
                {g.note && <p className="rounded-[10px] bg-muted/50 px-3 py-2 text-[11.5px] text-muted-foreground">{g.note}</p>}
              </TabsContent>
            ))}
          </Tabs>

          {/* What it can do + example prompts */}
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-[12.5px] font-medium">What your AI can do</span>
              <ul className="flex flex-col gap-1.5">
                {ABILITIES.map((a) => (
                  <li key={a} className="flex items-start gap-2 text-[12.5px] text-muted-foreground">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-1.5 text-[12.5px] font-medium">
                <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Try asking
              </span>
              <ul className="flex flex-col gap-1.5">
                {EXAMPLES.map((e) => (
                  <li key={e} className="group flex items-center gap-2 rounded-[10px] border border-border px-3 py-2">
                    <span className="min-w-0 flex-1 text-[12.5px]">“{e}”</span>
                    <CopyButton value={e} label="Copy" className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100" />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="h-px bg-border" />

        <ConnectedApps />
      </div>
    </SettingsCard>
  );
}
