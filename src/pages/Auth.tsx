import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { scaleIn } from '@/lib/motion';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/studio/ThemeToggle';
import { Loader2, Mail, Lock, ArrowLeft } from 'lucide-react';
import logoMark from '@/assets/logo-mark.png';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type AuthMode = 'password' | 'magic-link';

const inputClass =
  'h-11 rounded-[10px] bg-muted/40 border-border pl-10 text-[13px] placeholder:text-muted-foreground/70';
const labelClass = 'text-[11.5px] font-normal text-muted-foreground';
const primaryBtnClass =
  'w-full h-11 rounded-[11px] text-[13px] font-semibold shadow-[0_8px_20px_hsl(var(--primary)/0.3)] transition-[filter,transform] hover:brightness-110 active:scale-[0.98]';
const linkBtnClass =
  'text-primary hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm disabled:opacity-50';

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
    <aside
      className="relative hidden lg:flex lg:w-1/2 max-w-[720px] shrink-0 flex-col justify-between overflow-hidden bg-[#0E2436] p-12"
      aria-label="Oltaflock Studio"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_15%,rgba(122,196,245,0.18),transparent_55%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_85%_90%,rgba(34,157,231,0.14),transparent_50%)]"
      />

      <div className="relative flex items-center gap-2.5">
        <img src={logoMark} alt="" className="h-7 w-7 object-contain" />
        <span className="font-serif text-[21px] font-medium text-[#F5F5F2]">Oltaflock</span>
      </div>

      <div className="relative flex max-w-[480px] flex-col gap-4">
        <h1 className="font-serif text-[38px] font-medium leading-[1.2] text-[#F5F5F2]">
          Every model.
          <br />
          One canvas.
        </h1>
        <p className="text-sm leading-relaxed text-[#B9C7D2]">
          Text, image and video generation from every model we use — one prompt bar, one library, one team.
        </p>
      </div>

      <p className="relative text-[11px] uppercase tracking-[0.14em] text-[#8FA3B0]">
        Creative Studio · Internal use only
      </p>
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
  const { user, loading, signIn, signUp, signInWithGoogle, signInWithMagicLink, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<AuthMode>('password');
  const [magicLinkEmail, setMagicLinkEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    setIsSubmitting(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Signed in successfully');
    }
  };

  const handleSignUp = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();

    // Validate inputs before sending to Supabase
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Restrict signup to @oltaflock.ai domain only
    if (!email.toLowerCase().endsWith('@oltaflock.ai')) {
      toast.error('Sign up is restricted to @oltaflock.ai email addresses only');
      return;
    }

    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);
    const { error } = await signUp(email, password);
    setIsSubmitting(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Account created! You are now signed in.');
    }
  };

  const handleGoogle = async () => {
    setIsSubmitting(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setIsSubmitting(false);
      toast.error(error.message);
    }
    // On success the browser redirects to Google; keep the loading state.
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!magicLinkEmail.toLowerCase().endsWith('@oltaflock.ai')) {
      toast.error('Magic link is restricted to @oltaflock.ai email addresses');
      return;
    }

    setIsSubmitting(true);
    const { error } = await signInWithMagicLink(magicLinkEmail);
    setIsSubmitting(false);
    if (error) {
      toast.error(error.message);
    } else {
      setMagicLinkSent(true);
      toast.success('Magic link sent! Check your email.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetEmail || !resetEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    const { error } = await resetPassword(resetEmail);
    setIsSubmitting(false);
    if (error) {
      toast.error(error.message);
    } else {
      setResetSent(true);
      toast.success('Password reset email sent! Check your inbox.');
    }
  };

  const switchMode = (next: AuthMode) => {
    // Carry the typed email across so users don't have to re-enter it.
    if (next === 'magic-link' && !magicLinkEmail && email) setMagicLinkEmail(email);
    if (next === 'password' && !email && magicLinkEmail) setEmail(magicLinkEmail);
    setMode(next);
  };

  const openResetPassword = () => {
    if (!resetEmail && email) setResetEmail(email);
    setShowResetPassword(true);
  };

  const closeResetPassword = () => {
    setShowResetPassword(false);
    setResetSent(false);
    setResetEmail('');
  };

  const submitLabel = (label: string) =>
    isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-label="Working" /> : label;

  const googleButton = (
    <Button
      type="button"
      variant="outline"
      onClick={handleGoogle}
      disabled={isSubmitting}
      className="h-11 w-full gap-2.5 rounded-[11px] border-border bg-muted/50 text-[13px] font-medium hover:bg-muted transition-[filter,transform,background-color] active:scale-[0.98]"
    >
      <GoogleIcon />
      Continue with Google
    </Button>
  );

  const divider = (
    <div className="flex items-center gap-3" aria-hidden="true">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[11px] text-muted-foreground">or</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );

  let formContent: React.ReactNode;

  if (showResetPassword) {
    formContent = (
      <>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={closeResetPassword}
            className="mb-3 -ml-1 inline-flex w-fit items-center gap-1.5 rounded-md px-1 py-0.5 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to sign in
          </button>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary">Account recovery</p>
          <h2 className="font-serif text-2xl font-medium">Reset password</h2>
          <p className="text-[12.5px] text-muted-foreground">
            Enter your email to receive a password reset link
          </p>
        </div>

        {resetSent ? (
          <SentState message="Check your email for the password reset link" onReset={() => setResetSent(false)} />
        ) : (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reset-email" className={labelClass}>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@oltaflock.ai"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
            </div>
            <Button type="submit" className={primaryBtnClass} disabled={isSubmitting}>
              {submitLabel('Send reset link')}
            </Button>
          </form>
        )}
      </>
    );
  } else if (mode === 'magic-link') {
    formContent = (
      <>
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary">Passwordless</p>
          <h2 className="font-serif text-2xl font-medium">Sign in with a magic link</h2>
          <p className="text-[12.5px] text-muted-foreground">
            We'll email a one-time sign-in link to your @oltaflock.ai address
          </p>
        </div>

        {googleButton}
        {divider}

        {magicLinkSent ? (
          <SentState message="Check your email for the magic link" onReset={() => setMagicLinkSent(false)} />
        ) : (
          <form onSubmit={handleMagicLink} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="magic-email" className={labelClass}>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="magic-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@oltaflock.ai"
                  value={magicLinkEmail}
                  onChange={(e) => setMagicLinkEmail(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
            </div>
            <Button type="submit" className={primaryBtnClass} disabled={isSubmitting}>
              {submitLabel('Send magic link')}
            </Button>
          </form>
        )}

        <p className="text-center text-[11.5px] text-muted-foreground">
          or{' '}
          <button type="button" onClick={() => switchMode('password')} className={linkBtnClass}>
            sign in with a password instead
          </button>
        </p>
      </>
    );
  } else {
    formContent = (
      <>
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary">Creative Studio</p>
          <h2 className="font-serif text-2xl font-medium">Welcome back</h2>
          <p className="text-[12.5px] text-muted-foreground">Sign in with your @oltaflock.ai account</p>
        </div>

        {googleButton}
        {divider}

        <form onSubmit={handleSignIn} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" className={labelClass}>Email</Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@oltaflock.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                required
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className={labelClass}>Password</Label>
              <button type="button" onClick={openResetPassword} className={cn(linkBtnClass, 'text-[11px]')}>
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
          <Button type="submit" className={primaryBtnClass} disabled={isSubmitting}>
            {submitLabel('Sign in')}
          </Button>
        </form>

        <p className="text-center text-[11.5px] text-muted-foreground">
          or{' '}
          <button type="button" onClick={() => switchMode('magic-link')} className={linkBtnClass}>
            send me a magic link instead
          </button>
        </p>

        <div className="h-px bg-border" aria-hidden="true" />

        <p className="text-center text-[11.5px] leading-relaxed text-muted-foreground">
          New here? Sign up is restricted to{' '}
          <span className="font-semibold text-foreground/80">@oltaflock.ai</span> addresses. Enter your email and a
          password above, then{' '}
          <button type="button" onClick={handleSignUp} disabled={isSubmitting} className={linkBtnClass}>
            create an account
          </button>
        </p>
      </>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <BrandPanel />

      <main className="relative flex flex-1 flex-col items-center justify-center px-4 py-16 sm:px-8">
        <div className="absolute right-4 top-4 sm:right-8 sm:top-7">
          <ThemeToggle />
        </div>

        {/* Compact brand mark when the brand panel is collapsed */}
        <div className="mb-10 flex items-center gap-2.5 lg:hidden">
          <img src={logoMark} alt="" className="h-7 w-7 object-contain" />
          <span className="font-serif text-xl font-medium">Oltaflock</span>
        </div>

        <motion.div
          key={showResetPassword ? 'reset' : mode}
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          className="flex w-full max-w-[380px] flex-col gap-[22px]"
        >
          {formContent}
        </motion.div>

        <p className="mt-10 text-center text-[11px] text-muted-foreground">Authorized personnel only</p>
      </main>
    </div>
  );
}
