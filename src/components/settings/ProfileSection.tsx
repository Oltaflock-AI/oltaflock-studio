import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail } from 'lucide-react';
import { AvatarUpload } from './AvatarUpload';
import { SettingsCard, fieldInputClass, fieldLabelClass } from './SettingsCard';

export function ProfileSection() {
  const { user } = useAuth();
  const { profile, isLoading, updateDisplayName } = useProfile();
  const [nameInput, setNameInput] = useState('');

  useEffect(() => {
    if (profile?.display_name) {
      setNameInput(profile.display_name);
    }
  }, [profile?.display_name]);

  const isDirty = nameInput.trim() !== (profile?.display_name ?? '');

  return (
    <SettingsCard title="Profile" description="Shown across the studio">
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading profile" />
        </div>
      ) : (
        <>
          <AvatarUpload />

          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              updateDisplayName.mutate(nameInput);
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="displayName" className={fieldLabelClass}>
                Display name
              </Label>
              <Input
                id="displayName"
                placeholder="Enter your name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className={fieldInputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className={fieldLabelClass}>
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="email"
                  value={user?.email ?? ''}
                  readOnly
                  aria-readonly="true"
                  className={`${fieldInputClass} pl-9 text-muted-foreground cursor-default`}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={updateDisplayName.isPending || !isDirty}
              className="self-start h-9 rounded-[10px] px-[18px] text-[12.5px] font-semibold"
            >
              {updateDisplayName.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save changes'
              )}
            </Button>
          </form>
        </>
      )}
    </SettingsCard>
  );
}
