import { useCallback, useRef, useEffect } from 'react';

// Simple notification sound as base64 - a pleasant "ding" tone
const NOTIFICATION_SOUND_URL = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleB0NVKLizq9oJAo+nNvXpmIcCUOi4M+zcCQMQp/d2KliHQpCoN/RsnElDEKe3tipYhwKQp7f0bJxJAxBnt7ZqWIcC0Gd39KycCQMQZ3e2aliHApBnd/RsnAkDEGd3tmqYhwKQZ3f0bJwJAxBnd7ZqmIcCkGd39GycCQMQZ3e2apiHApBnd/RsnAkDEGd3tmqYhwKQZ3f0bJwJQ1Bnd7ZqmIcCkGd39GycCUNQZ3e2apiHApBnd/RsnAlDUGd3tmqYhwKQZ3f0bJwJQ1Bnd7ZqmIcCkGd39GycCUNQZ3e2apiHApBnd/RsnAlDUGd3tmqYhwKQZ3f0bFwJQ1Bnt7ZqmEcCkGe39GxcCUNQZ7e2aphHApBnt/RsXAlDUGe3tmqYRwKQZ7f0bFwJQ1Bnt7ZqmEcCkGe39GxcCUNQZ7e2aphHApBnt/RsXAlDUGe3tmqYRwKQZ7f0bFwJQ1Bnt7ZqmEcC0Ge39GxcCUNQZ7e2aphHAtBnt/RsXAlDUGe3tmqYRwLQZ7f0bFwJQ1Bnt7ZqmEcC0Ge39GxcCUNQZ7e2aphHAtBnt/RsXAlDUGe3tmqYRwLQZ7f0bFwJQ1Bnt7ZqmEcC0Ke39CxcCUNQp7e2aphHAtCnt/QsXAlDUKe3tmqYRwLQp7f0LFwJQ1Cnt7ZqmEcC0Ke39CxcCUNQp7e2aphHAtCnt/QsXAlDUKe3tmqYRwLQp7f0LFwJQ1Cnt7ZqmEcC0Ke39CxcCUNQp7e2aphHAtCnt/QsXAlDUKe3tmqYRwLQp7f0LFwJQ1Cnt7ZqmEcC0Ke39CxcCUNQp7e2aphHAtCnt/QsXAlDUKe3tmqYRwLQp7f0LFwJQ1Cnt7ZqmEcC0Ke39CxcCUNQp7e2aphHAtCnt/QsXAlDUKe3tmqYRwLQp7f0LFwJQ1Cnt7ZqmEcC0Ke39CxcCUNQp7e2aphHAtCnt/QsXAlDUKe3tmqYRwLQp7f0LFwJQ1Cnt7ZqmEcC0Ke39CxcCUNQp7e2aphHAtCnt/QsXAlDUKe3tmqYRwLQp7f0LFwJQ1Cnt7ZqmEcC0Ke39CxcCUNQp7e2aphHAtCnt/QsXAlDUKe3tmqYRwLQp7f0LFwJQ1Cnt7ZqmEcC0Ke39CxcCUNQp7e2aphHA==';

export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasPlayedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Pre-load the audio element
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.volume = 0.5;
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playNotification = useCallback((generationId?: string) => {
    // If a generation ID is provided, only play once per generation
    if (generationId) {
      if (hasPlayedRef.current.has(generationId)) {
        return;
      }
      hasPlayedRef.current.add(generationId);
      
      // Clean up old entries after a while
      if (hasPlayedRef.current.size > 50) {
        const entries = Array.from(hasPlayedRef.current);
        entries.slice(0, 25).forEach(id => hasPlayedRef.current.delete(id));
      }
    }

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        // Ignore autoplay errors (user hasn't interacted with page)
        console.log('Could not play notification sound:', err.message);
      });
    }
  }, []);

  return { playNotification };
}
