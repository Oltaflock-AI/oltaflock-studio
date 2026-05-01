import { useGenerationStore } from '@/store/generationStore';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function Kling30Controls() {
  const { controls, setControl, pendingRating } = useGenerationStore();

  return (
    <div className="space-y-4">
      {/* Aspect Ratio */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Aspect Ratio <span className="text-destructive">*</span>
        </Label>
        <Select
          value={(controls.aspectRatio as string) || ''}
          onValueChange={(value) => setControl('aspectRatio', value)}
          disabled={pendingRating}
        >
          <SelectTrigger className="w-full bg-input border-border">
            <SelectValue placeholder="Select aspect ratio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1:1">1:1</SelectItem>
            <SelectItem value="16:9">16:9</SelectItem>
            <SelectItem value="9:16">9:16</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Mode (std / pro / 4K) */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Quality Mode <span className="text-destructive">*</span>
        </Label>
        <Select
          value={(controls.variant as string) || 'std'}
          onValueChange={(value) => setControl('variant', value)}
          disabled={pendingRating}
        >
          <SelectTrigger className="w-full bg-input border-border">
            <SelectValue placeholder="Select mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="std">Standard (720p)</SelectItem>
            <SelectItem value="pro">Pro (1080p)</SelectItem>
            <SelectItem value="4K">4K (2160p)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Duration <span className="text-destructive">*</span>
        </Label>
        <Select
          value={String(controls.duration || '5')}
          onValueChange={(value) => setControl('duration', parseInt(value))}
          disabled={pendingRating}
        >
          <SelectTrigger className="w-full bg-input border-border">
            <SelectValue placeholder="Select duration" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3 seconds</SelectItem>
            <SelectItem value="5">5 seconds</SelectItem>
            <SelectItem value="10">10 seconds</SelectItem>
            <SelectItem value="15">15 seconds</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sound */}
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Sound
        </Label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {controls.sound ? 'Enabled' : 'Disabled'}
          </span>
          <Switch
            checked={(controls.sound as boolean) || false}
            onCheckedChange={(checked) => setControl('sound', checked)}
            disabled={pendingRating}
          />
        </div>
      </div>
    </div>
  );
}
