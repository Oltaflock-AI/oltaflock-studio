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

export function Seedance20Controls() {
  const { controls, setControl, pendingRating } = useGenerationStore();

  return (
    <div className="space-y-4">
      {/* Aspect Ratio */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Aspect Ratio <span className="text-destructive">*</span>
        </Label>
        <Select
          value={(controls.aspectRatio as string) || '16:9'}
          onValueChange={(value) => setControl('aspectRatio', value)}
          disabled={pendingRating}
        >
          <SelectTrigger className="w-full bg-input border-border">
            <SelectValue placeholder="Select aspect ratio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="16:9">16:9</SelectItem>
            <SelectItem value="9:16">9:16</SelectItem>
            <SelectItem value="1:1">1:1</SelectItem>
            <SelectItem value="4:3">4:3</SelectItem>
            <SelectItem value="3:4">3:4</SelectItem>
            <SelectItem value="21:9">21:9</SelectItem>
            <SelectItem value="adaptive">Adaptive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Resolution */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Resolution <span className="text-destructive">*</span>
        </Label>
        <Select
          value={(controls.resolution as string) || '720p'}
          onValueChange={(value) => setControl('resolution', value)}
          disabled={pendingRating}
        >
          <SelectTrigger className="w-full bg-input border-border">
            <SelectValue placeholder="Select resolution" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="480p">480p</SelectItem>
            <SelectItem value="720p">720p</SelectItem>
            <SelectItem value="1080p">1080p</SelectItem>
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
            <SelectItem value="4">4 seconds</SelectItem>
            <SelectItem value="5">5 seconds</SelectItem>
            <SelectItem value="10">10 seconds</SelectItem>
            <SelectItem value="15">15 seconds</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Generate Audio */}
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Generate Audio
        </Label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {controls.generateAudio !== false ? 'Enabled' : 'Disabled'}
          </span>
          <Switch
            checked={controls.generateAudio !== false}
            onCheckedChange={(checked) => setControl('generateAudio', checked)}
            disabled={pendingRating}
          />
        </div>
      </div>
    </div>
  );
}
