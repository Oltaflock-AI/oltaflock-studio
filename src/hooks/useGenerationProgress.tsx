import { useState, useEffect, useRef } from 'react';
import { useGenerations, type GenerationStatus } from './useGenerations';

/**
 * Hook that provides simulated progress (0-100) for a generation.
 * 
 * Progress stages:
 * - 0%: Generation not found/initial
 * - 10%: Status is 'queued'
 * - 25%: Status changed to 'running'
 * - 25-85%: Time-based simulation while running (increments every 1.5s)
 * - 100%: Status is 'done' and output_url exists
 * 
 * Rules:
 * - Never decreases progress
 * - Caps at 85% until confirmed done
 * - Freezes on error
 */
export function useGenerationProgress(generationId: string | null): number {
  const { generations } = useGenerations();
  const generation = generationId 
    ? generations.find(g => g.id === generationId) 
    : null;
  
  const [simulatedProgress, setSimulatedProgress] = useState(0);
  const lastGenerationIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Reset progress when switching to a different generation
    if (generationId !== lastGenerationIdRef.current) {
      lastGenerationIdRef.current = generationId;
      
      if (!generation) {
        setSimulatedProgress(0);
        return;
      }
      
      // Set initial progress based on current status
      if (generation.status === 'done') {
        setSimulatedProgress(100);
        return;
      }
      if (generation.status === 'error') {
        setSimulatedProgress(prev => Math.max(prev, 10));
        return;
      }
      if (generation.status === 'running') {
        setSimulatedProgress(25);
      } else if (generation.status === 'queued') {
        setSimulatedProgress(10);
      } else {
        setSimulatedProgress(0);
      }
    }
  }, [generationId, generation]);

  useEffect(() => {
    if (!generation) return;

    const status = generation.status as GenerationStatus;

    // If done, jump to 100%
    if (status === 'done' && generation.output_url) {
      setSimulatedProgress(100);
      return;
    }

    // If error, freeze at current progress
    if (status === 'error') {
      return;
    }

    // Update base progress based on status
    if (status === 'queued') {
      setSimulatedProgress(prev => Math.max(prev, 10));
    } else if (status === 'running') {
      setSimulatedProgress(prev => Math.max(prev, 25));
    }

    // Simulate progress while running
    if (status === 'running') {
      const interval = setInterval(() => {
        setSimulatedProgress(prev => {
          if (prev >= 85) return prev; // Cap at 85% until confirmed done
          // Add 2-5% each tick with some randomness for realism
          const increment = Math.random() * 3 + 2;
          return Math.min(prev + increment, 85);
        });
      }, 1500);

      return () => clearInterval(interval);
    }
  }, [generation?.status, generation?.output_url]);

  return Math.min(Math.round(simulatedProgress), 100);
}

/**
 * Hook that tracks progress for multiple generations at once.
 * Returns a Map of generationId -> progress percentage.
 */
export function useMultipleGenerationProgress(generationIds: string[]): Map<string, number> {
  const { generations } = useGenerations();
  const [progressMap, setProgressMap] = useState<Map<string, number>>(new Map());
  const intervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    const intervals = intervalsRef.current;

    setProgressMap(prev => {
      const newProgressMap = new Map(prev);

      generationIds.forEach(id => {
        const generation = generations.find(g => g.id === id);
        if (!generation) return;

        const currentProgress = prev.get(id) || 0;
        const status = generation.status as GenerationStatus;

        // Handle completed states
        if (status === 'done' && generation.output_url) {
          newProgressMap.set(id, 100);
          const existingInterval = intervals.get(id);
          if (existingInterval) {
            clearInterval(existingInterval);
            intervals.delete(id);
          }
          return;
        }

        if (status === 'error') {
          const existingInterval = intervals.get(id);
          if (existingInterval) {
            clearInterval(existingInterval);
            intervals.delete(id);
          }
          return;
        }

        // Set base progress
        if (status === 'queued' && currentProgress < 10) {
          newProgressMap.set(id, 10);
        } else if (status === 'running' && currentProgress < 25) {
          newProgressMap.set(id, 25);
        }

        // Start simulation interval if running and no interval exists
        if (status === 'running' && !intervals.has(id)) {
          const interval = setInterval(() => {
            setProgressMap(p => {
              const current = p.get(id) || 25;
              if (current >= 85) return p;
              const newMap = new Map(p);
              newMap.set(id, Math.min(current + Math.random() * 3 + 2, 85));
              return newMap;
            });
          }, 1500);
          intervals.set(id, interval);
        }
      });

      return newProgressMap;
    });

    // Cleanup intervals for IDs no longer in the list
    return () => {
      intervals.forEach((interval, id) => {
        if (!generationIds.includes(id)) {
          clearInterval(interval);
          intervals.delete(id);
        }
      });
    };
  }, [generationIds, generations]);

  // Cleanup all intervals on unmount
  useEffect(() => {
    const intervals = intervalsRef.current;
    return () => {
      intervals.forEach(interval => clearInterval(interval));
      intervals.clear();
    };
  }, []);

  return progressMap;
}
