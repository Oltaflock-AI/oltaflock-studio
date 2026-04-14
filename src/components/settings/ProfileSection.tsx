import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Mail } from 'lucide-react';
import { AvatarUpload } from './AvatarUpload';

export function ProfileSection() {
  const { user } = useAuth();
  const { profile, isLoading, displayName, updateDisplayName } = useProfile();
  const [nameInput, setNameInput] = useState('');

  useEffect(() => {
    if (profile?.display_name) {
      setNameInput(profile.display_name);
    }
  }, [profile?.display_name]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Profile</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage your personal information</p>
      </div>

      {/* Avatar Upload */}
      <AvatarUpload />

      {/* Display Name */}
      <div className="space-y-3">
        <Label htmlFor="displayName" className="text-sm font-medium">
          Display Name
        </Label>
        <p className="text-xs text-muted-foreground">This name will be shown across the studio</p>
        <div className="flex gap-3">
          <Input
            id="displayName"
            placeholder="Enter your name"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            className="max-w-sm"
          />
          <Button
            onClick={() => updateDisplayName.mutate(nameInput)}
            disabled={updateDisplayName.isPending}
          >
            {updateDisplayName.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Email (read-only) */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Email Address</Label>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2 max-w-sm">
          <Mail className="h-4 w-4" />
          {user?.email}
        </div>
      </div>
    </div>
  );
}
