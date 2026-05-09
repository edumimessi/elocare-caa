// ─────────────────────────────────────────────
// lib/audio-cache.ts
// Pré-geração e cache offline de áudio ElevenLabs
// ─────────────────────────────────────────────
import * as FileSystem from 'expo-file-system/legacy';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';
import { AudioCacheEntry, AudioCacheManifest, PreGenerationStatus, Profile } from '@/types';
import { CARDS } from '@/lib/caa-data';

const CACHE_DIR = `${FileSystem.documentDirectory}audio_cache/`;
const MANIFEST_PATH = `${FileSystem.documentDirectory}audio_manifest.json`;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

let audioInitialized = false;

// ── INICIALIZAÇÃO ────────────────────────────

async function ensureCacheDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

async function initAudio(): Promise<void> {
  if (!audioInitialized) {
    await setAudioModeAsync({ playsInSilentMode: true });
    audioInitialized = true;
  }
}

// ── MANIFESTO ────────────────────────────────

export async function loadManifest(): Promise<AudioCacheManifest> {
  try {
    const info = await FileSystem.getInfoAsync(MANIFEST_PATH);
    if (!info.exists) return {};
    const raw = await FileSystem.readAsStringAsync(MANIFEST_PATH);
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function saveManifest(manifest: AudioCacheManifest): Promise<void> {
  await FileSystem.writeAsStringAsync(
    MANIFEST_PATH,
    JSON.stringify(manifest),
    { encoding: FileSystem.EncodingType.UTF8 }
  );
}

// Chave de cache: cardId + voiceId (permite múltiplas vozes)
function cacheKey(cardId: string, voiceId: string): string {
  return `${cardId}__${voiceId}`;
}

// ── GERAÇÃO DE UM ÚNICO ÁUDIO ────────────────

export async function generateAudio(
  text: string,
  cardId: string,
  apiKey: string,
  voiceId: string
): Promise<string | null> {
  try {
    await ensureCacheDir();

    const response = await fetch(`${ELEVENLABS_API_URL}/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.55,
          similarity_boost: 0.80,
          style: 0.2,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      console.warn(`ElevenLabs error for "${text}": ${response.status}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);

    const key = cacheKey(cardId, voiceId);
    const fileUri = `${CACHE_DIR}${key}.mp3`;

    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Atualiza manifesto
    const manifest = await loadManifest();
    const info = await FileSystem.getInfoAsync(fileUri);
    manifest[key] = {
      cardId,
      voiceId,
      fileUri,
      generatedAt: new Date().toISOString(),
      sizeBytes: (info as any).size ?? 0,
    };
    await saveManifest(manifest);

    return fileUri;
  } catch (err) {
    console.error(`generateAudio failed for ${cardId}:`, err);
    return null;
  }
}

// ── PRÉ-GERAÇÃO EM LOTE ──────────────────────
// Gera todos os 54 cartões padrão + cartões customizados do perfil
// Chama onProgress a cada cartão concluído para atualizar UI

export async function preGenerateAllAudio(
  apiKey: string,
  voiceId: string,
  profile: Profile | null,
  onProgress: (status: PreGenerationStatus) => void
): Promise<PreGenerationStatus> {
  const manifest = await loadManifest();

  // Monta lista: cartões padrão + customizados do perfil
  const standardCards = CARDS.map((c) => ({ id: c.id, label: c.label }));
  const customCards = (profile?.customCards ?? []).map((c) => ({
    id: c.id,
    label: c.label,
  }));
  const allCards = [...standardCards, ...customCards];

  // Filtra só os que ainda não foram gerados com essa voz
  const pending = allCards.filter(
    (c) => !manifest[cacheKey(c.id, voiceId)]
  );

  const status: PreGenerationStatus = {
    total: pending.length,
    completed: 0,
    failed: [],
    isRunning: true,
  };

  onProgress({ ...status });

  // Processa em batches de 3 para não sobrecarregar a API
  const BATCH_SIZE = 3;
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (card) => {
        const uri = await generateAudio(card.label, card.id, apiKey, voiceId);
        if (uri) {
          status.completed++;
        } else {
          status.failed.push(card.id);
        }
        onProgress({ ...status });
      })
    );

    // Pequena pausa entre batches para respeitar rate limit
    if (i + BATCH_SIZE < pending.length) {
      await sleep(300);
    }
  }

  status.isRunning = false;
  status.lastRun = new Date().toISOString();
  onProgress({ ...status });

  return status;
}

// ── REPRODUÇÃO INTELIGENTE ───────────────────
// Hierarquia: cache local → API em tempo real → TTS nativo

export async function playCard(
  cardId: string,
  label: string,
  apiKey: string,
  voiceId: string,
  useElevenLabs: boolean
): Promise<void> {
  await initAudio();

  if (useElevenLabs && apiKey) {
    // 1. Tenta cache local
    const manifest = await loadManifest();
    const cached = manifest[cacheKey(cardId, voiceId)];

    if (cached) {
      const info = await FileSystem.getInfoAsync(cached.fileUri);
      if (info.exists) {
        await playLocalFile(cached.fileUri);
        return;
      }
    }

    // 2. Gera em tempo real e salva no cache
    const uri = await generateAudio(label, cardId, apiKey, voiceId);
    if (uri) {
      await playLocalFile(uri);
      return;
    }
  }

  // 3. Fallback: TTS nativo
  await playSystemTTS(label);
}

async function playLocalFile(fileUri: string): Promise<void> {
  try {
    const player = createAudioPlayer({ uri: fileUri });
    // Cleanup via listener de status - mais confiavel que setInterval em background
    player.addListener('playbackStatusUpdate', (status: any) => {
      if (status.didJustFinish) {
        player.remove();
      }
    });
    player.play();
  } catch (err) {
    console.error('playLocalFile error:', err);
  }
}

export async function playSystemTTS(text: string): Promise<void> {
  Speech.speak(text, {
    language: 'pt-BR',
    pitch: 1.05,
    rate: 0.85,
  });
}

// ── GERENCIAMENTO DO CACHE ───────────────────

export async function getCacheStats(): Promise<{
  totalFiles: number;
  totalSizeMB: number;
  oldestEntry?: string;
}> {
  const manifest = await loadManifest();
  const entries = Object.values(manifest);

  const totalSizeBytes = entries.reduce((sum, e) => sum + (e.sizeBytes ?? 0), 0);
  const dates = entries.map((e) => e.generatedAt).sort();

  return {
    totalFiles: entries.length,
    totalSizeMB: Math.round((totalSizeBytes / 1024 / 1024) * 100) / 100,
    oldestEntry: dates[0],
  };
}

export async function clearAudioCache(voiceId?: string): Promise<void> {
  const manifest = await loadManifest();

  for (const [key, entry] of Object.entries(manifest)) {
    if (!voiceId || entry.voiceId === voiceId) {
      await FileSystem.deleteAsync(entry.fileUri, { idempotent: true });
      delete manifest[key];
    }
  }

  await saveManifest(manifest);
}

export async function isCacheReady(voiceId: string): Promise<boolean> {
  const manifest = await loadManifest();
  const cachedCount = Object.values(manifest).filter(
    (e) => e.voiceId === voiceId
  ).length;
  // Considera pronto se pelo menos 80% dos cartões padrão estão em cache
  return cachedCount >= CARDS.length * 0.8;
}

// ── HELPERS ─────────────────────────────────

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, i + chunkSize)
    );
  }
  return btoa(binary);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
