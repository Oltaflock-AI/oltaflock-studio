import { usePreferencesStore } from '@/store/preferencesStore';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sun, Moon, Monitor, Volume2, VolumeX } from 'lucide-react';

export function PreferencesSection() {
  const { theme, defaultMode, notificationSound, setTheme, setDefaultMode, setNotificationSound } =
    usePreferencesStore();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Preferences</h2>
        <p className="text-sm text-muted-foreground mt-1">Customize your studio experience</p>
      </div>

      {/* Theme */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Theme</Label>
        <p className="text-xs text-muted-foreground">Choose your preferred color scheme</p>
        <div className="flex gap-2">
          {([
            { value: 'light', label: 'Light', icon: Sun },
            { value: 'dark', label: 'Dark', icon: Moon },
            { value: 'system', label: 'System', icon: Monitor },
          ] as const).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                theme === value
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Default Generation Mode */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Default Generation Mode</Label>
        <p className="text-xs text-muted-foreground">Mode selected when you open the studio</p>
        <Select value={defaultMode} onValueChange={(v) => setDefaultMode(v as typeof defaultMode)}>
          <SelectTrigger className="max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="image">Text to Image</SelectItem>
            <SelectItem value="video">Text to Video</SelectItem>
            <SelectItem value="image-to-image">Image to Image</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notification Sound */}
      <div className="flex items-center justify-between max-w-sm">
        <div className="space-y-1">
          <Label className="text-sm font-medium">Notification Sounds</Label>
          <p className="text-xs text-muted-foreground">Play sound when generation completes</p>
        </div>
        <div className="flex items-center gap-2">
          {notificationSound ? (
            <Volume2 className="h-4 w-4 text-muted-foreground" />
          ) : (
            <VolumeX className="h-4 w-4 text-muted-foreground" />
          )}
          <Switch
            checked={notificationSound}
            onCheckedChange={setNotificationSound}
          />
        </div>
      </div>
    </div>
  );
}
