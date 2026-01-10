import { useGenerationStore } from '@/store/generationStore';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function Seedance10Controls() {
  const { controls, setControl, pendingRating } = useGenerationStore();

  return (
    <div className="space-y-4">
      {/* Variant */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Variant <span className="text-destructive">*</span>
        </Label>
        <Select
          value={(controls.variant as string) || ''}
          onValueChange={(value) => setControl('variant', value)}
          disabled={pendingRating}
        >
          <SelectTrigger className="w-full bg-input border-border">
            <SelectValue placeholder="Select variant" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lite">V1 Lite</SelectItem>
            <SelectItem value="pro">V1 Pro</SelectItem>
            <SelectItem value="pro-fast">V1 Pro Fast</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
            <SelectItem value="16:9">16:9</SelectItem>
            <SelectItem value="9:16">9:16</SelectItem>
            <SelectItem value="1:1">1:1</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Resolution */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Resolution <span className="text-destructive">*</span>
        </Label>
        <Select
          value={(controls.resolution as string) || ''}
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
          value={String(controls.duration || '')}
          onValueChange={(value) => setControl('duration', parseInt(value))}
          disabled={pendingRating}
        >
          <SelectTrigger className="w-full bg-input border-border">
            <SelectValue placeholder="Select duration" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5 seconds</SelectItem>
            <SelectItem value="10">10 seconds</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Camera Fixed */}
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Camera Fixed
        </Label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {controls.cameraFixed ? 'On' : 'Off'}
          </span>
          <Switch
            checked={(controls.cameraFixed as boolean) || false}
            onCheckedChange={(checked) => setControl('cameraFixed', checked)}
            disabled={pendingRating}
          />
        </div>
      </div>

      {/* Seed */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Seed
        </Label>
        <Input
          type="number"
          placeholder="-1 for random"
          value={(controls.seed as number) ?? -1}
          onChange={(e) => setControl('seed', e.target.value ? parseInt(e.target.value) : -1)}
          disabled={pendingRating}
          className="bg-input border-border"
        />
        <p className="text-xs text-muted-foreground">Use -1 for random seed</p>
      </div>
    </div>
  );
}
