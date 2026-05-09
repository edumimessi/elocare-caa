import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import * as Speech from 'expo-speech';

let audioInitialized = false;

async function initAudio() {
  if (!audioInitialized) {
    await setAudioModeAsync({ playsInSilentMode: true });
    audioInitialized = true;
  }
}

// ElevenLabs API integration
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

// Default voice ID (Rachel - natural, warm female voice)
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

export async function speakWithElevenLabs(
  text: string,
  apiKey: string,
  voiceId: string = DEFAULT_VOICE_ID
): Promise<void> {
  try {
    await initAudio();

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
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);
    const fileUri = `${FileSystem.cacheDirectory}caa_audio_${Date.now()}.mp3`;

    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const player = createAudioPlayer({ uri: fileUri });
    player.play();

    // Clean up after playback ends (poll for completion)
    const cleanup = setInterval(() => {
      if (!player.playing) {
        clearInterval(cleanup);
        player.remove();
        FileSystem.deleteAsync(fileUri, { idempotent: true });
      }
    }, 500);
  } catch (error) {
    console.error('ElevenLabs TTS error:', error);
    // Fallback to system speech
    await speakWithSystemTTS(text);
  }
}

export async function speakWithSystemTTS(text: string): Promise<void> {
  try {
    Speech.speak(text, {
      language: 'pt-BR',
      pitch: 1.1,
      rate: 0.85,
    });
  } catch (error) {
    console.error('System TTS error:', error);
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
