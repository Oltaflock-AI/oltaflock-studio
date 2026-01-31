
# Fix "Regenerate with Same Settings" Button

## Problem Identified

The "Regenerate with Same Settings" button is broken because:

1. **Uses current form state instead of stored generation data**: The current `handleRegenerate` function simply calls `handleGenerate()`, which reads from the live form state (`rawPrompt`, `selectedModel`, `controls`), NOT from the selected completed generation's stored data.

2. **`canGenerate` fails**: If the user has cleared the form or switched modes after a generation completed, `canGenerate` will be `false` because the current form doesn't have the required fields.

3. **Model/mode mismatch**: The selected generation might be from a different mode than the current UI mode.

## Solution

Create a dedicated `handleRegenerateFromJob` function that:
1. Reads the `model_params`, `user_prompt`, `model`, and `type` from the **selected completed generation** in the database
2. Creates a new generation with a fresh `request_id` but the same parameters
3. Sends the same webhook payload that the original generation used

## Implementation

**File: `src/components/studio/GenerateButton.tsx`**

Changes:
1. Add a new function `handleRegenerateFromJob` that extracts data from the selected generation
2. Build the webhook payload from the stored `model_params` and `user_prompt`
3. Reverse-lookup the model ID from the display name to get the API name
4. Handle the correct webhook URL based on generation type

```typescript
const handleRegenerateFromJob = async () => {
  if (!selectedGeneration || isSubmitting) return;
  
  setIsSubmitting(true);
  
  try {
    // Extract original settings from the completed generation
    const originalPrompt = selectedGeneration.user_prompt;
    const originalModelParams = selectedGeneration.model_params || {};
    const originalType = selectedGeneration.type; // 'image' or 'video'
    const originalModelName = selectedGeneration.model;
    
    // Find the model config by display name
    const originalModelConfig = ALL_MODELS.find(m => m.displayName === originalModelName);
    if (!originalModelConfig) {
      toast.error('Could not find model configuration');
      setIsSubmitting(false);
      return;
    }
    
    // Get API model name
    const apiModelName = MODEL_API_NAMES[originalModelConfig.id];
    
    // Generate new request_id
    const requestId = generateJobId();
    
    // Determine if this was an image-to-image generation
    const isImageToImage = originalModelParams?.image_urls && 
      Array.isArray(originalModelParams.image_urls) && 
      originalModelParams.image_urls.length > 0;
    
    // Create new generation in database
    const dbGeneration = await createGeneration({
      request_id: requestId,
      type: originalType as 'image' | 'video',
      model: originalModelName,
      user_prompt: originalPrompt,
      final_prompt: null,
      status: 'queued',
      output_url: null,
      error_message: null,
      model_params: originalModelParams,
    });
    
    setSelectedJobId(dbGeneration.id);
    addActiveGeneration(dbGeneration.id);
    setCurrentOutput(null);
    setPendingRating(false);
    
    toast.success('Regeneration started');
    setIsSubmitting(false);
    
    // Process generation with original settings
    processRegenerationFromJob(
      dbGeneration.id, 
      requestId, 
      originalPrompt,
      originalModelParams,
      apiModelName,
      isImageToImage
    );
    
  } catch (error) {
    console.error('Failed to regenerate:', error);
    toast.error('Regeneration failed');
    setIsSubmitting(false);
  }
};

// Separate function for processing regeneration
const processRegenerationFromJob = async (
  generationId: string,
  requestId: string,
  prompt: string,
  modelParams: Record<string, unknown>,
  apiModelName: string,
  isImageToImage: boolean
) => {
  try {
    await updateGeneration({
      id: generationId,
      updates: { status: 'running', progress: 25 },
    });
    
    const webhookUrl = isImageToImage ? IMAGE_TO_IMAGE_WEBHOOK_URL : WEBHOOK_URL;
    
    let webhookPayload: Record<string, unknown>;
    
    if (isImageToImage) {
      const imageUrls = modelParams.image_urls || [];
      const controls = { ...modelParams };
      delete controls.image_urls;
      
      webhookPayload = {
        request_id: requestId,
        timestamp: new Date().toISOString(),
        generation_type: 'IMAGE_2_IMAGE',
        model: apiModelName,
        raw_prompt: prompt,
        controls,
        image_urls: imageUrls,
      };
    } else {
      // Determine generation type from model config
      const modelConfig = ALL_MODELS.find(m => MODEL_API_NAMES[m.id] === apiModelName);
      const genType = modelConfig?.generationTypes[0] || 'text-to-image';
      
      webhookPayload = {
        request_id: requestId,
        timestamp: new Date().toISOString(),
        model: `${apiModelName}-${genType}`,
        generation_type: genType === 'text-to-image' ? 'TEXT_2_IMAGE' : 'TEXT_2_VIDEO',
        raw_prompt: prompt,
        controls: modelParams,
      };
    }
    
    // ... rest of webhook handling (same as processGeneration)
  } catch (error) {
    // ... error handling
  }
};
```

2. Update the button's onClick handler:
```tsx
{hasCompletedOutput && !pendingRating && !isSubmitting && (
  <Button
    variant="outline"
    onClick={handleRegenerateFromJob}  // Changed from handleRegenerate
    disabled={isSubmitting}
    className="w-full h-9 text-xs"
  >
    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
    Regenerate with Same Settings
  </Button>
)}
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/studio/GenerateButton.tsx` | Add `handleRegenerateFromJob` function, update button onClick |

## Testing Checklist

After implementation:
- [ ] Generate an image with specific settings
- [ ] Click "Regenerate with Same Settings" - should create new request with same prompt/model/controls
- [ ] Switch to a different mode, then click Regenerate on completed job - should still work
- [ ] Clear the prompt input, click Regenerate - should still work (uses stored data)
- [ ] Regenerate an Image-to-Image job - should include the original image URLs
