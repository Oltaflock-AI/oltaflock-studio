import { usePreferencesStore } from '@/store/preferencesStore';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sun, Moon, Monitor, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SettingsCard } from './SettingsCard';

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

export function PreferencesSection() {
  const { theme, defaultMode, notificationSound, setTheme, setDefaultMode, setNotificationSound } =
    usePreferencesStore();

  return (
    <SettingsCard title="Preferences" description="Customize your studio experience">
      {/* Theme */}
      <div className="flex flex-col gap-2">
        <span id="pref-theme-label" className="text-[12.5px] font-medium">
          Theme
        </span>
        <div
          role="radiogroup"
          aria-labelledby="pref-theme-label"
          className="grid grid-cols-3 gap-1 rounded-[11px] bg-muted/60 p-1"
        >
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
            const active = theme === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setTheme(value)}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-[9px] px-3 py-2 text-xs font-medium transition-smooth',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className={cn('h-3.5 w-3.5', active && 'text-primary')} aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* Default Generation Mode */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5 min-w-0">
          <Label htmlFor="pref-default-mode" className="text-[12.5px] font-medium">
            Default generation mode
          </Label>
          <p className="text-xs text-muted-foreground">Selected when you open the studio</p>
        </div>
        <Select value={defaultMode} onValueChange={(v) => setDefaultMode(v as typeof defaultMode)}>
          <SelectTrigger id="pref-default-mode" className="w-[160px] h-9 rounded-[10px] text-xs shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="image">Text to Image</SelectItem>
            <SelectItem value="video">Text to Video</SelectItem>
            <SelectItem value="image-to-image">Image to Image</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="h-px bg-border" />

      {/* Notification Sound */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-2.5 min-w-0">
          {notificationSound ? (
            <Volume2 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" aria-hidden="true" />
          ) : (
            <VolumeX className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" aria-hidden="true" />
          )}
          <div className="flex flex-col gap-0.5 min-w-0">
            <Label htmlFor="pref-notification-sound" className="text-[12.5px] font-medium">
              Notification sounds
            </Label>
            <p className="text-xs text-muted-foreground">Play a sound when a generation completes</p>
          </div>
        </div>
        <Switch
          id="pref-notification-sound"
          checked={notificationSound}
          onCheckedChange={setNotificationSound}
        />
      </div>
    </SettingsCard>
  );
}
