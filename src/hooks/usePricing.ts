import { useMemo } from 'react';
import { useGenerationStore } from '@/store/generationStore';
import { calculateCost, formatCredits, formatUsd } from '@/config/pricing';

export function usePricing() {
  const { selectedModel, controls } = useGenerationStore();
  
  const cost = useMemo(() => {
    if (!selectedModel) {
      return { credits: 0, usd: 0 };
    }
    return calculateCost(selectedModel, controls);
  }, [selectedModel, controls]);
  
  return {
    credits: cost.credits,
    usd: cost.usd,
    formattedCredits: formatCredits(cost.credits),
    formattedUsd: formatUsd(cost.usd),
    hasPrice: cost.credits > 0,
  };
}
