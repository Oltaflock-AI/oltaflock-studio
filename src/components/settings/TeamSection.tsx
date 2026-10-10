import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, MailPlus, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { memberName, useTeam, type TeamMember, type TeamRole } from '@/hooks/useTeam';
import { SettingsCard } from './SettingsCard';

/** Who's on the team. Admins invite people by email, change roles and remove people. */
export function TeamSection() {
  const { user } = useAuth();
  const { members, isAdmin, isLoading, invite, inviting, remove, setRole } = useTeam();
  const [email, setEmail] = useState('');
  const [role, setNewRole] = useState<TeamRole>('member');
  const [removing, setRemoving] = useState<TeamMember | null>(null);

  const send = async () => {
    const clean = email.trim();
    if (!clean) return;
    try {
      await invite({ email: clean, role });
      toast.success(`Invite sent to ${clean}`, { description: 'They get an email with a link to set up their account.' });
      setEmail('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send the invite');
    }
  };

  const changeRole = async (m: TeamMember, next: TeamRole) => {
    try {
      await setRole({ userId: m.user_id, role: next });
      toast.success(`${memberName(m)} is now ${next === 'admin' ? 'an admin' : 'a member'}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not change the role');
    }
  };

  const confirmRemove = async () => {
    if (!removing) return;
    try {
      await remove(removing.user_id);
      toast.success(`${memberName(removing)} has been removed`, { description: 'Everything they made stays with the team.' });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not remove');
    } finally {
      setRemoving(null);
    }
  };

  return (
    <SettingsCard
      title="Team"
      description={isAdmin ? 'Invite people by email. Members make and review work; admins also manage the team.' : 'Everyone on the team sees and reviews each other\'s work. Ask an admin to invite someone.'}
      icon={<Users className="h-4 w-4" />}
    >
      {isAdmin && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="name@promunch.in"
            aria-label="Email to invite"
            className="h-10 rounded-[10px] sm:flex-1"
          />
          <Select value={role} onValueChange={(v) => setNewRole(v as TeamRole)}>
            <SelectTrigger className="h-10 rounded-[10px] sm:w-[130px]" aria-label="Role"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={send} disabled={inviting || !email.trim()} className="h-10 gap-1.5 rounded-[10px]">
            {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailPlus className="h-4 w-4" />} Invite
          </Button>
        </div>
      )}

      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {members.map((m) => {
            const me = m.user_id === user?.id;
            return (
              <li key={m.user_id} className="flex items-center gap-3 py-2.5">
                <Avatar className="h-8 w-8">
                  {m.avatar_url && <AvatarImage src={m.avatar_url} alt="" />}
                  <AvatarFallback className="bg-primary/10 text-[11px] font-medium text-primary">{memberName(m).slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium">{memberName(m)}{me && <span className="font-normal text-muted-foreground"> (you)</span>}</p>
                  <p className="truncate text-[12px] text-muted-foreground">{m.email}</p>
                </div>
                {isAdmin && !me ? (
                  <>
                    <Select value={m.role} onValueChange={(v) => changeRole(m, v as TeamRole)}>
                      <SelectTrigger className="h-8 w-[110px] rounded-[8px] text-[12.5px]" aria-label={`Role for ${memberName(m)}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="sm" onClick={() => setRemoving(m)} className="h-8 rounded-[8px] text-[12.5px] text-destructive hover:text-destructive">
                      Remove
                    </Button>
                  </>
                ) : (
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11.5px] capitalize text-muted-foreground">{m.role}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {memberName(removing ?? undefined)}?</AlertDialogTitle>
            <AlertDialogDescription>
              They're signed out and can't sign in again. Everything they made stays in the team's work. You can invite them again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsCard>
  );
}
