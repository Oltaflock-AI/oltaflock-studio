import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useGenerationStore } from '@/store/generationStore';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Calendar, Fingerprint, LogOut, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SettingsCard } from './SettingsCard';

export function AccountSection() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { clearAll } = useGenerationStore();

  const handleSignOut = async () => {
    clearAll();
    queryClient.clear();
    await signOut();
    toast.success('Signed out successfully');
    navigate('/auth');
  };

  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Unknown';

  return (
    <SettingsCard
      title="Account"
      action={
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              className="h-8 rounded-[9px] px-3 text-xs font-medium"
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" />
              Sign out
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign out?</AlertDialogTitle>
              <AlertDialogDescription>
                You will be redirected to the login page. Any unsaved work will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleSignOut} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Sign Out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      }
    >
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-[12.5px]">
        <dt className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
          Member since
        </dt>
        <dd className="font-medium text-right">{createdAt}</dd>
        <dt className="flex items-center gap-2 text-muted-foreground">
          <Fingerprint className="h-3.5 w-3.5" aria-hidden="true" />
          Account ID
        </dt>
        <dd className="text-right">
          <code className="text-[11px] bg-muted px-2 py-0.5 rounded-md font-mono">
            {user?.id?.slice(0, 8)}...
          </code>
        </dd>
      </dl>
    </SettingsCard>
  );
}

export function DangerZoneSection() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { clearAll } = useGenerationStore();
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;

    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Session expired. Please sign in again.');
        return;
      }

      const { error } = await supabase.functions.invoke('delete-account', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      // Clear everything locally
      clearAll();
      queryClient.clear();

      toast.success('Account deleted successfully');
      navigate('/auth');
    } catch (error) {
      console.error('Failed to delete account:', error);
      toast.error('Failed to delete account. Please try again or contact support.');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setDeleteConfirmText('');
    }
  };

  return (
    <SettingsCard
      title="Danger zone"
      tone="danger"
      description="Deleting your account permanently removes your profile, every generation, uploaded files, credits and transaction history."
    >
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="self-start h-8 rounded-[9px] px-3.5 text-xs border-destructive text-destructive bg-transparent hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Delete account
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Delete your account?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span className="block">
                This action is <strong>permanent and cannot be undone</strong>. The following will be deleted:
              </span>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Your profile and avatar</li>
                <li>All generation history and outputs</li>
                <li>Credit balance and transaction logs</li>
                <li>All uploaded files</li>
              </ul>
              <span className="block font-medium text-foreground">
                Type <code className="bg-muted px-1.5 py-0.5 rounded text-destructive font-bold">DELETE</code> to confirm:
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="Type DELETE to confirm"
            aria-label="Type DELETE to confirm account deletion"
            autoComplete="off"
            className="border-destructive/30 focus:border-destructive"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText('')}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleteConfirmText !== 'DELETE' || isDeleting}
              onClick={handleDeleteAccount}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Permanently Delete
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsCard>
  );
}
