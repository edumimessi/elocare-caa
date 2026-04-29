// hooks/useAudioCache.ts
// Hook para pré-geração e reprodução de áudio
// ─────────────────────────────────────────────
import { useState, useCallback, useRef } from 'react';
import {
  preGenerateAllAudio,
  playCard,
  isCacheReady,
  getCacheStats,
  clearAudioCache,
} from '@/lib/audio-cache';
import { PreGenerationStatus } from '@/types';
import { Profile } from '@/types';

export function useAudioCache(apiKey: string, voiceId: string) {
  const [cacheReady, setCacheReady] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<PreGenerationStatus | null>(null);
  const abortRef = useRef(false);

  const checkCache = useCallback(async () => {
    const ready = await isCacheReady(voiceId);
    setCacheReady(ready);
    return ready;
  }, [voiceId]);

  const startPreGeneration = useCallback(
    async (profile: Profile | null) => {
      if (!apiKey || !voiceId) return;
      setGenerating(true);
      abortRef.current = false;

      await preGenerateAllAudio(apiKey, voiceId, profile, (status) => {
        setProgress({ ...status });
        if (!status.isRunning) {
          setGenerating(false);
          checkCache();
        }
      });
    },
    [apiKey, voiceId, checkCache]
  );

  const play = useCallback(
    async (cardId: string, label: string, useElevenLabs: boolean) => {
      await playCard(cardId, label, apiKey, voiceId, useElevenLabs);
    },
    [apiKey, voiceId]
  );

  const getStats = useCallback(() => getCacheStats(), []);
  const clearCache = useCallback(
    (forVoice?: string) => clearAudioCache(forVoice),
    []
  );

  return {
    cacheReady,
    generating,
    progress,
    checkCache,
    startPreGeneration,
    play,
    getStats,
    clearCache,
  };
}

// ─────────────────────────────────────────────
