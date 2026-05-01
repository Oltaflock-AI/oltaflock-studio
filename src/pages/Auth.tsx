import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { scaleIn, staggerContainer, staggerItem } from '@/lib/motion';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Mail, Lock, ArrowLeft } from 'lucide-react';
import oltaflockLogo from '@/assets/oltaflock-logo.jpeg';
import { toast } from 'sonner';
import { GlowOrb } from '@/components/effects/GlowOrb';
import { TiltCard } from '@/components/effects/TiltCard';

export default function Auth() {
  const { user, loading, signIn, signUp, signInWithMagicLink, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

  const handleSignUp = async (e: React.FormEvent) => {
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

  // Password Reset View
  if (showResetPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
        <GlowOrb interactive />
        <motion.div
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          className="w-full max-w-md relative z-10"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex flex-col items-center gap-2 mb-2">
              <img src={oltaflockLogo} alt="Oltaflock" className="h-20 object-contain" />
              <h2 className="text-3xl font-bold tracking-tight">
                Creative Studio
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              For internal use only
            </p>
          </div>

          <Card className="border-border">
            <CardHeader className="space-y-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowResetPassword(false);
                  setResetSent(false);
                  setResetEmail('');
                }}
                className="w-fit -ml-2 mb-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to sign in
              </Button>
              <CardTitle className="text-xl">Reset Password</CardTitle>
              <CardDescription>
                Enter your email to receive a password reset link
              </CardDescription>
            </CardHeader>
            <CardContent>
              {resetSent ? (
                <div className="text-center py-6 space-y-2">
                  <Mail className="h-12 w-12 text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    Check your email for the password reset link
                  </p>
                  <Button
                    variant="ghost"
                    onClick={() => setResetSent(false)}
                    className="text-xs"
                  >
                    Send another
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="operator@oltaflock.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Send Reset Link'
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Authorized personnel only
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      <GlowOrb interactive />
      <motion.div
        variants={scaleIn}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex flex-col items-center gap-2 mb-2">
            <img src={oltaflockLogo} alt="Oltaflock" className="h-20 object-contain" />
            <h2 className="text-3xl font-bold tracking-tight">
              Creative Studio
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            For internal use only
          </p>
        </div>

        <TiltCard intensity={3}>
        <Card className="border-border">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
            <CardDescription>
              Sign in to access the generation studio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="password" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="password">Password</TabsTrigger>
                <TabsTrigger value="magic-link">Magic Link</TabsTrigger>
              </TabsList>

              <TabsContent value="password">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="operator@oltaflock.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Button
                        type="button"
                        variant="link"
                        className="px-0 h-auto text-xs text-muted-foreground hover:text-primary"
                        onClick={() => setShowResetPassword(true)}
                      >
                        Forgot Password?
                      </Button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Sign In'
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      disabled={isSubmitting}
                      onClick={handleSignUp}
                    >
                      Sign Up
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="magic-link">
                {magicLinkSent ? (
                  <div className="text-center py-6 space-y-2">
                    <Mail className="h-12 w-12 text-primary mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      Check your email for the magic link
                    </p>
                    <Button
                      variant="ghost"
                      onClick={() => setMagicLinkSent(false)}
                      className="text-xs"
                    >
                      Send another
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleMagicLink} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="magic-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="magic-email"
                          type="email"
                          placeholder="operator@oltaflock.com"
                          value={magicLinkEmail}
                          onChange={(e) => setMagicLinkEmail(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Send Magic Link'
                      )}
                    </Button>
                  </form>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        </TiltCard>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Authorized personnel only
        </p>
      </motion.div>
    </div>
  );
}
