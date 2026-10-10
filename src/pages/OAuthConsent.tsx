import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, ImageIcon, Brain, FolderOpen, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BrandMark } from '@/components/brand/BrandMark';

type Details = {
  authorization_id: string;
  redirect_uri: string;
  client: { id: string; name: string; uri: string; logo_uri: string };
  user: { id: string; email: string };
  scope: string;
};

const ACCESS = [
  { icon: ImageIcon, text: 'Generate images and videos in your account' },
  { icon: Coins, text: 'Spend credits on those generations' },
  { icon: FolderOpen, text: 'Read, rename and organise your library, folders and elements' },
  { icon: Brain, text: 'Read and update your creative memory' },
];

/**
 * Consent screen for Supabase's OAuth 2.1 server: an MCP client (Claude,
 * ChatGPT, …) sends the user here to approve access to PROMUNCH Studio.
 */
export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get('authorization_id');
  const { user } = useAuth();
  const [details, setDetails] = useState<Details | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'approve' | 'deny' | null>(null);

  useEffect(() => {
    if (!authorizationId) {
      setError('This sign-in link is missing its authorization id. Start connecting again from your AI app.');
      return;
    }
    let cancelled = false;
    supabase.auth.oauth.getAuthorizationDetails(authorizationId).then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data) return setError(error?.message ?? 'This request has expired. Start connecting again from your AI app.');
      // Already approved before: Supabase hands back the redirect straight away.
      if ('redirect_url' in data && !('authorization_id' in data)) {
        window.location.assign(data.redirect_url as string);
        return;
      }
      setDetails(data as Details);
    });
    return () => { cancelled = true; };
  }, [authorizationId]);

  const decide = async (approve: boolean) => {
    if (!authorizationId) return;
    setBusy(approve ? 'approve' : 'deny');
    const { data, error } = approve
      ? await supabase.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
      : await supabase.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true });
    if (error || !data?.redirect_url) {
      setBusy(null);
      setError(error?.message ?? 'Something went wrong. Start connecting again from your AI app.');
      return;
    }
    window.location.assign(data.redirect_url);
  };

  const clientName = details?.client.name || 'An app';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16">
      <div className="mb-10"><BrandMark /></div>

      <div className="flex w-full max-w-[400px] flex-col gap-6">
        {error ? (
          <div className="flex flex-col gap-2">
            <h1 className="font-serif text-2xl font-medium">Couldn't connect</h1>
            <p className="text-[13px] text-muted-foreground">{error}</p>
          </div>
        ) : !details ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading" />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary">Connect an app</p>
              <h1 className="font-serif text-2xl font-medium">
                {clientName} wants to use your PROMUNCH Studio
              </h1>
              <p className="text-[12.5px] text-muted-foreground">
                Signed in as {details.user.email || user?.email}
              </p>
            </div>

            <ul className="flex flex-col gap-3 rounded-[12px] border border-border bg-muted/40 p-4">
              {ACCESS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3 text-[13px]">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  {text}
                </li>
              ))}
            </ul>

            <p className="text-[12px] text-muted-foreground">
              You'll return to <span className="font-medium text-foreground">{new URL(details.redirect_uri).host}</span>.
              Only approve apps you trust. You can disconnect it at any time from the app's connector settings.
            </p>

            <div className="flex gap-3">
              <Button variant="outline" className="h-11 flex-1 rounded-[11px]" disabled={!!busy} onClick={() => decide(false)}>
                {busy === 'deny' ? <Loader2 className="h-4 w-4 animate-spin" aria-label="Working" /> : 'Deny'}
              </Button>
              <Button className="h-11 flex-1 rounded-[11px]" disabled={!!busy} onClick={() => decide(true)}>
                {busy === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" aria-label="Working" /> : 'Allow access'}
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
