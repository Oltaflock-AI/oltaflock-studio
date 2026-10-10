import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { scaleIn } from '@/lib/motion';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Lock, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { BrandMark } from '@/components/brand/BrandMark';
import { BrandMarquee } from '@/components/brand/BrandMarquee';
import { IDENTITY } from '@/brands/identity';
import { cn } from '@/lib/utils';

type AuthMode = 'magic-link' | 'password';

const inputClass =
  'h-11 rounded-[10px] bg-card border-border pl-10 text-[14px] placeholder:text-muted-foreground/70';
const labelClass = 'text-[12px] font-semibold text-muted-foreground';
const primaryBtnClass =
  'w-full h-11 rounded-[11px] text-[14px] font-bold uppercase tracking-[0.04em] transition-[filter,transform] hover:brightness-110 active:scale-[0.98]';
const linkBtnClass =
  'font-semibold text-primary hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm disabled:opacity-50';

/** Supabase's wording when an email isn't on the team, in plain words. */
function friendly(message: string) {
  if (/signups? not allowed|not allowed for otp|invite only|database error saving new user|user not found/i.test(message)) {
    return `This email isn't on the ${IDENTITY.wordmark} team yet. Ask your admin for an invite.`;
  }
  if (/invalid login credentials/i.test(message)) return 'Wrong email or password. Try a sign-in link instead.';
  return message;
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.5 12.2c0-.8-.07-1.6-.2-2.3H12v4.4h5.9c-.25 1.35-1 2.5-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-1 7.28-2.7l-3.5-2.7c-.97.65-2.22 1.05-3.78 1.05-2.9 0-5.36-1.96-6.24-4.6H2.1v2.87C3.9 20.5 7.65 23 12 23z" />
      <path fill="#FBBC05" d="M5.76 14.05A6.6 6.6 0 0 1 5.4 12c0-.71.13-1.4.36-2.05V7.08H2.1A11 11 0 0 0 1 12c0 1.78.43 3.46 1.1 4.92z" />
      <path fill="#EA4335" d="M12 5.75c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.45 2.5 14.97 1.5 12 1.5 7.65 1.5 3.9 4 2.1 7.08l3.66 2.87C6.64 7.3 9.1 5.75 12 5.75z" />
    </svg>
  );
}

function BrandPanel() {
  return (
    <aside className="relative hidden lg:flex lg:w-1/2 max-w-[760px] shrink-0 flex-col justify-between overflow-hidden bg-brand-ink text-brand-cream" aria-label={IDENTITY.appName}>
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full bg-brand-red/90" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-20 h-[360px] w-[360px] rounded-full bg-brand-yellow/90" />

      <div className="relative p-12">
        <BrandMark tone="dark" />
      </div>

      <div className="relative flex max-w-[520px] flex-col gap-4 px-12">
        <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-brand-yellow">★ {IDENTITY.appName}</p>
        <h1 className="font-display text-[46px] uppercase leading-[0.98] tracking-[-0.02em]">
          Posts, packs and posters.
          <br />
          <span className="text-brand-yellow">No designer queue.</span>
        </h1>
        <p className="text-[15px] leading-relaxed text-brand-cream/75">
          Make on-brand creative with the real packs, the real claims and the PROMUNCH voice. Review it together, ship it the same day.
        </p>
      </div>

      <BrandMarquee className="relative bg-brand-red py-3 text-[13px] text-white" />
    </aside>
  );
}

function SentState({ message, onReset }: { message: string; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[15px] border border-border bg-card px-6 py-8 text-center shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <Mail className="h-6 w-6 text-primary" aria-hidden="true" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button variant="ghost" size="sm" onClick={onReset} className="text-xs">
        Send another
      </Button>
    </div>
  );
}

export default function Auth() {
  const { user, loading, signIn, signInWithGoogle, signInWithMagicLink, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<AuthMode>('magic-link');
  const [linkSent, setLinkSent] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const run = async (action: () => Promise<{ error: Error | null }>, onDone?: () => void) => {
    setIsSubmitting(true);
    const { error } = await action();
    setIsSubmitting(false);
    if (error) toast.error(friendly(error.message));
    else onDone?.();
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    run(() => signIn(email, password));
  };

  const handleMagicLink = (e: React.FormEvent) => {
    e.preventDefault();
    run(() => signInWithMagicLink(email), () => setLinkSent(true));
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    run(() => resetPassword(email), () => setResetSent(true));
  };

  const handleGoogle = async () => {
    setIsSubmitting(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setIsSubmitting(false);
      toast.error(friendly(error.message));
    }
    // On success the browser redirects to Google; keep the loading state.
  };

  const submitLabel = (label: string) =>
    isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-label="Working" /> : label;

  const emailField = (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="email" className={labelClass}>Work email</Label>
      <div className="relative">
        <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@promunch.in"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          required
        />
      </div>
    </div>
  );

  let formContent: React.ReactNode;

  if (showResetPassword) {
    formContent = (
      <>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => { setShowResetPassword(false); setResetSent(false); }}
            className="mb-3 -ml-1 inline-flex w-fit items-center gap-1.5 rounded-md px-1 py-0.5 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to sign in
          </button>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">★ Account recovery</p>
          <h2 className="font-display text-[26px] uppercase leading-tight">Reset password</h2>
          <p className="text-[13px] text-muted-foreground">We'll email you a link to set a new one.</p>
        </div>
        {resetSent ? (
          <SentState message="Check your email for the reset link." onReset={() => setResetSent(false)} />
        ) : (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-5">
            {emailField}
            <Button type="submit" className={primaryBtnClass} disabled={isSubmitting}>{submitLabel('Send reset link')}</Button>
          </form>
        )}
      </>
    );
  } else {
    formContent = (
      <>
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">★ Team only</p>
          <h2 className="font-display text-[30px] uppercase leading-[1.02]">Welcome back, muncher.</h2>
          <p className="text-[13px] text-muted-foreground">Sign in with the email your {IDENTITY.wordmark} admin invited.</p>
        </div>

        {mode === 'magic-link' && linkSent ? (
          <SentState message={`Check ${email || 'your inbox'} for a sign-in link.`} onReset={() => setLinkSent(false)} />
        ) : (
          <form onSubmit={mode === 'magic-link' ? handleMagicLink : handleSignIn} className="flex flex-col gap-5">
            {emailField}
            {mode === 'password' && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className={labelClass}>Password</Label>
                  <button type="button" onClick={() => setShowResetPassword(true)} className={cn(linkBtnClass, 'text-[11.5px]')}>
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                    required
                    minLength={6}
                  />
                </div>
              </div>
            )}
            <Button type="submit" className={primaryBtnClass} disabled={isSubmitting}>
              {submitLabel(mode === 'magic-link' ? 'Email me a sign-in link' : 'Sign in')}
            </Button>
          </form>
        )}

        <p className="text-center text-[12px] text-muted-foreground">
          or{' '}
          <button type="button" onClick={() => setMode(mode === 'magic-link' ? 'password' : 'magic-link')} className={linkBtnClass}>
            {mode === 'magic-link' ? 'use a password instead' : 'email me a link instead'}
          </button>
        </p>

        <div className="flex items-center gap-3" aria-hidden="true">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[11px] text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleGoogle}
          disabled={isSubmitting}
          className="h-11 w-full gap-2.5 rounded-[11px] border-border bg-card text-[13.5px] font-semibold hover:bg-muted active:scale-[0.98]"
        >
          <GoogleIcon />
          Continue with Google
        </Button>

        <p className="text-center text-[12px] leading-relaxed text-muted-foreground">
          New to the team? {IDENTITY.appName} is invite only. Ask an admin to invite you from Settings → Team.
        </p>
      </>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <BrandPanel />
      <main className="relative flex flex-1 flex-col items-center justify-center px-4 py-16 sm:px-8">
        <div className="mb-10 lg:hidden"><BrandMark /></div>
        <motion.div
          key={showResetPassword ? 'reset' : mode}
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          className="flex w-full max-w-[380px] flex-col gap-[22px]"
        >
          {formContent}
        </motion.div>
        <p className="mt-10 text-center text-[11.5px] text-muted-foreground">
          Trouble signing in? Write to <a href={`mailto:${IDENTITY.supportEmail}`} className="font-semibold text-foreground/80 hover:underline">{IDENTITY.supportEmail}</a>
        </p>
      </main>
    </div>
  );
}
