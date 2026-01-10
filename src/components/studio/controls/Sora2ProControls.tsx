import { useState } from 'react';
import { useGenerationStore } from '@/store/generationStore';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function Sora2ProControls() {
  const { 
    controls, 
    setControl, 
    pendingRating,
    characterIds,
    addCharacterId,
    removeCharacterId,
  } = useGenerationStore();
  
  const [newCharId, setNewCharId] = useState('');

  const handleAddCharacter = () => {
    if (newCharId.trim() && characterIds.length < 5) {
      addCharacterId(newCharId.trim());
      setNewCharId('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Aspect Ratio */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Aspect Ratio
        </Label>
        <Select
          value={(controls.aspectRatio as string) || 'landscape'}
          onValueChange={(value) => setControl('aspectRatio', value)}
          disabled={pendingRating}
        >
          <SelectTrigger className="w-full bg-input border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="portrait">Portrait</SelectItem>
            <SelectItem value="landscape">Landscape</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Duration
        </Label>
        <Select
          value={String(controls.duration || 10)}
          onValueChange={(value) => setControl('duration', parseInt(value))}
          disabled={pendingRating}
        >
          <SelectTrigger className="w-full bg-input border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 seconds</SelectItem>
            <SelectItem value="15">15 seconds</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quality / Size */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Quality / Size
        </Label>
        <Select
          value={(controls.quality as string) || 'standard'}
          onValueChange={(value) => setControl('quality', value)}
          disabled={pendingRating}
        >
          <SelectTrigger className="w-full bg-input border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Remove Watermark */}
      <div className="flex items-center justify-between py-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Remove Watermark
        </Label>
        <Switch
          checked={(controls.removeWatermark as boolean) || false}
          onCheckedChange={(checked) => setControl('removeWatermark', checked)}
          disabled={pendingRating}
        />
      </div>

      {/* Character IDs */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Character IDs <span className="text-muted-foreground">(optional, max 5)</span>
        </Label>
        
        <div className="flex gap-2">
          <Input
            value={newCharId}
            onChange={(e) => setNewCharId(e.target.value)}
            placeholder="Enter character ID"
            className="bg-input border-border font-mono text-sm"
            disabled={pendingRating || characterIds.length >= 5}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCharacter()}
          />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={handleAddCharacter}
            disabled={pendingRating || characterIds.length >= 5 || !newCharId.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {characterIds.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {characterIds.map((id, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className="font-mono text-xs flex items-center gap-1"
              >
                {id}
                <button
                  onClick={() => removeCharacterId(index)}
                  className="hover:text-destructive"
                  disabled={pendingRating}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
