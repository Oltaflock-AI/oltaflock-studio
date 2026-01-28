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

export function GPT4oControls() {
  const { controls, setControl, pendingRating } = useGenerationStore();

  return (
    <div className="space-y-4">
      {/* Size */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Size <span className="text-destructive">*</span>
        </Label>
        <Select
          value={(controls.size as string) || ''}
          onValueChange={(value) => setControl('size', value)}
          disabled={pendingRating}
        >
          <SelectTrigger className="w-full bg-input border-border">
            <SelectValue placeholder="Select size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1:1">1:1</SelectItem>
            <SelectItem value="3:2">3:2</SelectItem>
            <SelectItem value="2:3">2:3</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Prompt Enhancement */}
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Prompt Enhancement
        </Label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {controls.isEnhance ? 'On' : 'Off'}
          </span>
          <Switch
            checked={(controls.isEnhance as boolean) || false}
            onCheckedChange={(checked) => setControl('isEnhance', checked)}
            disabled={pendingRating}
          />
        </div>
      </div>
    </div>
  );
}
