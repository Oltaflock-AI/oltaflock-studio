import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Lock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SettingsCard, fieldInputClass, fieldLabelClass } from './SettingsCard';

function PasswordStrength({ password }: { password: string }) {
  const getStrength = () => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const strength = getStrength();
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
  const colors = ['', 'bg-destructive', 'bg-warning', 'bg-warning', 'bg-success', 'bg-success'];

  if (!password) return null;

  return (
    <div className="space-y-1.5 pt-0.5">
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              i <= strength ? colors[strength] : 'bg-muted'
            )}
          />
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground" aria-live="polite">Strength: {labels[strength]}</p>
    </div>
  );
}

export function SecuritySection() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in both password fields');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated successfully');
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to update password');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SettingsCard title="Security" description="Change the password you use to sign in">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleChangePassword();
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="newPassword" className={fieldLabelClass}>New password</Label>
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={6}
            className={fieldInputClass}
          />
          <PasswordStrength password={newPassword} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmPassword" className={fieldLabelClass}>Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={6}
            className={fieldInputClass}
          />
        </div>

        <Button
          type="submit"
          variant="secondary"
          disabled={isSaving || !newPassword || !confirmPassword}
          className="self-start h-9 rounded-[10px] px-[18px] text-[12.5px] font-semibold"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Updating…
            </>
          ) : (
            <>
              <Lock className="h-3.5 w-3.5 mr-2" />
              Update password
            </>
          )}
        </Button>
      </form>

      {/* 2FA placeholder */}
      <div className="flex items-start gap-3 rounded-[12px] border border-border bg-muted/40 px-4 py-3">
        <ShieldCheck className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" aria-hidden="true" />
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[12.5px] font-medium">Two-factor authentication</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 rounded-full">Coming soon</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Add an extra layer of security to your account.
          </p>
        </div>
      </div>
    </SettingsCard>
  );
}
