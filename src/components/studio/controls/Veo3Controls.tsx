import { useGenerationStore } from '@/store/generationStore';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function Veo3Controls() {
  const { controls, setControl, pendingRating } = useGenerationStore();

  return (
    <div className="space-y-4">
      {/* Variant */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Variant
        </Label>
        <Select
          value={(controls.variant as string) || 'fast'}
          onValueChange={(value) => setControl('variant', value)}
          disabled={pendingRating}
        >
          <SelectTrigger className="w-full bg-input border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fast">Veo 3 Fast</SelectItem>
            <SelectItem value="quality">Veo 3 Quality</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Aspect Ratio */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Aspect Ratio
        </Label>
        <Select
          value={(controls.aspectRatio as string) || 'auto'}
          onValueChange={(value) => setControl('aspectRatio', value)}
          disabled={pendingRating}
        >
          <SelectTrigger className="w-full bg-input border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto</SelectItem>
            <SelectItem value="16:9">16:9</SelectItem>
            <SelectItem value="9:16">9:16</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Seed */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Seed <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          type="number"
          value={(controls.seed as number) || ''}
          onChange={(e) => setControl('seed', e.target.value ? parseInt(e.target.value) : undefined)}
          placeholder="Random"
          className="bg-input border-border font-mono"
          disabled={pendingRating}
        />
      </div>
    </div>
  );
}
