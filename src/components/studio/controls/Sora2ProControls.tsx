import { useGenerationStore } from '@/store/generationStore';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { X, Plus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';

export function Sora2ProControls() {
  const { 
    controls, 
    setControl, 
    pendingRating,
    characterIds,
    addCharacterId,
    removeCharacterId
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
            <SelectItem value="portrait">Portrait</SelectItem>
            <SelectItem value="landscape">Landscape</SelectItem>
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
            <SelectItem value="10">10 seconds</SelectItem>
            <SelectItem value="15">15 seconds</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quality */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Quality <span className="text-destructive">*</span>
        </Label>
        <Select
          value={(controls.quality as string) || ''}
          onValueChange={(value) => setControl('quality', value)}
          disabled={pendingRating}
        >
          <SelectTrigger className="w-full bg-input border-border">
            <SelectValue placeholder="Select quality" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Remove Watermark */}
      <div className="flex items-center justify-between">
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
          Character IDs (optional, max 5)
        </Label>
        
        {characterIds.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {characterIds.map((id, index) => (
              <div 
                key={index}
                className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded text-xs"
              >
                <span className="font-mono">{id}</span>
                <button
                  onClick={() => removeCharacterId(index)}
                  className="hover:text-destructive"
                  disabled={pendingRating}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {characterIds.length < 5 && (
          <div className="flex gap-2">
            <Input
              placeholder="Enter character ID"
              value={newCharId}
              onChange={(e) => setNewCharId(e.target.value)}
              disabled={pendingRating}
              className="bg-input border-border text-xs"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCharacter();
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddCharacter}
              disabled={pendingRating || !newCharId.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
