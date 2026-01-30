import { useGenerationStore } from '@/store/generationStore';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

export function QwenImageEditControls() {
  const { controls, setControl, pendingRating } = useGenerationStore();
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-4">
      {/* Output Format */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Output Format
        </Label>
        <Select
          value={(controls.output_format as string) || 'png'}
          onValueChange={(value) => setControl('output_format', value)}
          disabled={pendingRating}
        >
          <SelectTrigger className="w-full bg-input border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="png">PNG</SelectItem>
            <SelectItem value="jpg">JPG</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Advanced Controls */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors">
          <ChevronDown className={`h-3 w-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          Advanced Options
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          {/* Acceleration */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Acceleration
            </Label>
            <Select
              value={(controls.acceleration as string) || ''}
              onValueChange={(value) => setControl('acceleration', value || undefined)}
              disabled={pendingRating}
            >
              <SelectTrigger className="w-full bg-input border-border">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="fast">Fast</SelectItem>
                <SelectItem value="turbo">Turbo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Image Size */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Image Size
            </Label>
            <Select
              value={(controls.image_size as string) || ''}
              onValueChange={(value) => setControl('image_size', value || undefined)}
              disabled={pendingRating}
            >
              <SelectTrigger className="w-full bg-input border-border">
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="512x512">512x512</SelectItem>
                <SelectItem value="768x768">768x768</SelectItem>
                <SelectItem value="1024x1024">1024x1024</SelectItem>
                <SelectItem value="1536x1536">1536x1536</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Inference Steps */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Inference Steps
            </Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={(controls.num_inference_steps as number) || ''}
              onChange={(e) => setControl('num_inference_steps', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="Default"
              disabled={pendingRating}
              className="bg-input border-border"
            />
          </div>

          {/* Seed */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Seed
            </Label>
            <Input
              type="number"
              min={0}
              value={(controls.seed as number) || ''}
              onChange={(e) => setControl('seed', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="Random"
              disabled={pendingRating}
              className="bg-input border-border"
            />
          </div>

          {/* Guidance Scale */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Guidance Scale
            </Label>
            <Input
              type="number"
              min={1}
              max={20}
              step={0.5}
              value={(controls.guidance_scale as number) || ''}
              onChange={(e) => setControl('guidance_scale', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="Default"
              disabled={pendingRating}
              className="bg-input border-border"
            />
          </div>

          {/* Safety Checker */}
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Enable Safety Checker
            </Label>
            <Switch
              checked={(controls.enable_safety_checker as boolean) ?? true}
              onCheckedChange={(checked) => setControl('enable_safety_checker', checked)}
              disabled={pendingRating}
            />
          </div>

          {/* Sync Mode */}
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Sync Mode
            </Label>
            <Switch
              checked={(controls.sync_mode as boolean) ?? false}
              onCheckedChange={(checked) => setControl('sync_mode', checked)}
              disabled={pendingRating}
            />
          </div>

          {/* Negative Prompt */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Negative Prompt
            </Label>
            <Textarea
              value={(controls.negative_prompt as string) || ''}
              onChange={(e) => setControl('negative_prompt', e.target.value || undefined)}
              placeholder="What to avoid in the image..."
              disabled={pendingRating}
              className="bg-input border-border min-h-[60px] resize-none"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
