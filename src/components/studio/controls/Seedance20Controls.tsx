import { useGenerationStore } from '@/store/generationStore';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function Seedance20Controls() {
  const { controls, setControl, pendingRating, mode } = useGenerationStore();
  const isI2V = mode === 'image-to-video';

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
        <Input
          type="number"
          min={4}
          max={15}
          value={(controls.duration as number) || 5}
          onChange={(e) => setControl('duration', parseInt(e.target.value) || 5)}
          disabled={pendingRating}
        />
        <p className="text-[10px] text-muted-foreground/60">4-15 seconds</p>
      </div>

      {/* Toggles */}
      <div className="space-y-3 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Generate Audio
            </Label>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              Adds AI-generated sound (extra cost)
            </p>
          </div>
          <Switch
            checked={controls.generate_audio !== false}
            onCheckedChange={(checked) => setControl('generate_audio', checked)}
            disabled={pendingRating}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Web Search
            </Label>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              Online search for up-to-date references
            </p>
          </div>
          <Switch
            checked={(controls.web_search as boolean) || false}
            onCheckedChange={(checked) => setControl('web_search', checked)}
            disabled={pendingRating}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              NSFW Checker
            </Label>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              Enable content safety filter
            </p>
          </div>
          <Switch
            checked={(controls.nsfw_checker as boolean) || false}
            onCheckedChange={(checked) => setControl('nsfw_checker', checked)}
            disabled={pendingRating}
          />
        </div>
      </div>

      {/* I2V-only: last frame + reference URLs */}
      {isI2V && (
        <div className="space-y-3 border-t border-border pt-4">
          <p className="text-[10px] text-muted-foreground/60 italic">
            First frame uses your uploaded image (above). Optionally specify last frame and other refs:
          </p>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Last Frame URL (optional)
            </Label>
            <Input
              value={(controls.last_frame_url as string) || ''}
              onChange={(e) => setControl('last_frame_url', e.target.value)}
              placeholder="https://… (image URL or asset://id)"
              className="text-xs"
              disabled={pendingRating}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Reference Video URLs
            </Label>
            <Textarea
              value={(controls.reference_video_urls as string[] || []).join('\n')}
              onChange={(e) => {
                const urls = e.target.value.split('\n').map(u => u.trim()).filter(Boolean).slice(0, 3);
                setControl('reference_video_urls', urls);
              }}
              placeholder="One URL per line, max 3 (mp4/mov, ≤15s each)"
              className="text-[10px] min-h-[50px] font-mono"
              disabled={pendingRating}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Reference Audio URLs
            </Label>
            <Textarea
              value={(controls.reference_audio_urls as string[] || []).join('\n')}
              onChange={(e) => {
                const urls = e.target.value.split('\n').map(u => u.trim()).filter(Boolean).slice(0, 3);
                setControl('reference_audio_urls', urls);
              }}
              placeholder="One URL per line, max 3 (wav/mp3, ≤15s each)"
              className="text-[10px] min-h-[50px] font-mono"
              disabled={pendingRating}
            />
          </div>
        </div>
      )}
    </div>
  );
}
