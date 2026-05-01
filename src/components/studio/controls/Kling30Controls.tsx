import { useGenerationStore } from '@/store/generationStore';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { MediaUpload } from '@/components/studio/MediaUpload';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Multi-shot type: array of { prompt, duration } — max 5 shots
interface MultiShot {
  prompt: string;
  duration: number;
}

// Kling element: name + description + 2-4 image URLs — max 3 elements
interface KlingElement {
  name: string;
  description: string;
  element_input_urls: string[];
}

export function Kling30Controls() {
  const { controls, setControl, pendingRating, mode } = useGenerationStore();
  const isI2V = mode === 'image-to-video';

  const multiShotsEnabled = (controls.multi_shots as boolean) || false;
  const multiPrompt: MultiShot[] = (controls.multi_prompt as MultiShot[]) || [];
  const klingElements: KlingElement[] = (controls.kling_elements as KlingElement[]) || [];

  const updateShot = (i: number, patch: Partial<MultiShot>) => {
    const next = [...multiPrompt];
    next[i] = { ...next[i], ...patch };
    setControl('multi_prompt', next);
  };
  const addShot = () => {
    if (multiPrompt.length >= 5) return;
    setControl('multi_prompt', [...multiPrompt, { prompt: '', duration: 3 }]);
  };
  const removeShot = (i: number) => {
    setControl('multi_prompt', multiPrompt.filter((_, idx) => idx !== i));
  };

  const updateElement = (i: number, patch: Partial<KlingElement>) => {
    const next = [...klingElements];
    next[i] = { ...next[i], ...patch };
    setControl('kling_elements', next);
  };
  const addElement = () => {
    if (klingElements.length >= 3) return;
    setControl('kling_elements', [
      ...klingElements,
      { name: '', description: '', element_input_urls: [] },
    ]);
  };
  const removeElement = (i: number) => {
    setControl('kling_elements', klingElements.filter((_, idx) => idx !== i));
  };
  const updateElementUrls = (i: number, urls: string[]) => {
    updateElement(i, { element_input_urls: urls.slice(0, 4) });
  };

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
          </SelectContent>
        </Select>
      </div>

      {/* Quality Mode */}
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
          Total Duration (sec) <span className="text-destructive">*</span>
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
            {[3, 5, 7, 10, 12, 15].map((d) => (
              <SelectItem key={d} value={String(d)}>{d} seconds</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sound */}
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Sound Effects
        </Label>
        <Switch
          checked={(controls.sound as boolean) || false}
          onCheckedChange={(checked) => setControl('sound', checked)}
          disabled={pendingRating}
        />
      </div>

      {/* End Frame (i2v, single-shot only) */}
      {isI2V && !multiShotsEnabled && (
        <div className="space-y-2 border-t border-border pt-4">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            End Frame (optional)
          </Label>
          <p className="text-[10px] text-muted-foreground/60">
            Single-shot only. Multi-shot uses start frame only.
          </p>
          <MediaUpload
            kind="image"
            maxFiles={1}
            value={(controls.last_frame_url as string) ? [controls.last_frame_url as string] : []}
            onChange={(urls) => setControl('last_frame_url', urls[0] || '')}
            disabled={pendingRating}
          />
        </div>
      )}

      {/* Multi-shot toggle */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        <div>
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Multi-shot Mode
          </Label>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
            Sequence up to 5 separate shots
          </p>
        </div>
        <Switch
          checked={multiShotsEnabled}
          onCheckedChange={(checked) => setControl('multi_shots', checked)}
          disabled={pendingRating}
        />
      </div>

      {/* Multi-shot list editor */}
      {multiShotsEnabled && (
        <div className="space-y-3 pl-2 border-l-2 border-primary/30">
          {multiPrompt.map((shot, i) => (
            <div key={i} className="space-y-2 p-3 bg-muted/20 rounded-lg">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Shot {i + 1}</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removeShot(i)}
                  disabled={pendingRating}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <Textarea
                value={shot.prompt}
                onChange={(e) => updateShot(i, { prompt: e.target.value })}
                placeholder="Shot prompt (max 500 chars)"
                maxLength={500}
                className="text-xs min-h-[60px]"
                disabled={pendingRating}
              />
              <div className="flex items-center gap-2">
                <Label className="text-[10px] text-muted-foreground shrink-0">Duration:</Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={shot.duration}
                  onChange={(e) => updateShot(i, { duration: parseInt(e.target.value) || 1 })}
                  className="h-7 text-xs"
                  disabled={pendingRating}
                />
                <span className="text-[10px] text-muted-foreground">sec</span>
              </div>
            </div>
          ))}
          {multiPrompt.length < 5 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addShot}
              disabled={pendingRating}
              className="w-full h-8 text-xs gap-1.5"
            >
              <Plus className="h-3 w-3" />
              Add Shot ({multiPrompt.length}/5)
            </Button>
          )}
        </div>
      )}

      {/* Element references */}
      <div className="space-y-3 border-t border-border pt-4">
        <div>
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Element References (optional)
          </Label>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
            Reusable named entities (max 3). Reference in prompt as @name
          </p>
        </div>

        {klingElements.map((el, i) => (
          <div key={i} className="space-y-2 p-3 bg-muted/20 rounded-lg">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Element {i + 1}</Label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => removeElement(i)}
                disabled={pendingRating}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <Input
              value={el.name}
              onChange={(e) => updateElement(i, { name: e.target.value })}
              placeholder="@name (e.g., red_car)"
              className="h-7 text-xs"
              disabled={pendingRating}
            />
            <Textarea
              value={el.description}
              onChange={(e) => updateElement(i, { description: e.target.value })}
              placeholder="Description"
              className="text-xs min-h-[40px]"
              disabled={pendingRating}
            />
            <MediaUpload
              kind="image"
              maxFiles={4}
              value={el.element_input_urls}
              onChange={(urls) => updateElementUrls(i, urls)}
              disabled={pendingRating}
              helperText={`${el.element_input_urls.length}/4 images (need 2-4)`}
            />
          </div>
        ))}

        {klingElements.length < 3 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addElement}
            disabled={pendingRating}
            className="w-full h-8 text-xs gap-1.5"
          >
            <Plus className="h-3 w-3" />
            Add Element ({klingElements.length}/3)
          </Button>
        )}
      </div>
    </div>
  );
}
