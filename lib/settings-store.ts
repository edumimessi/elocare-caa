import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const KEYS = {
  ELEVENLABS_API_KEY: 'elocare_elevenlabs_api_key',
  ELEVENLABS_VOICE_ID: 'elocare_elevenlabs_voice_id',
  THERAPIST_PIN: 'elocare_therapist_pin',
  PATIENT_NAME: 'elocare_patient_name',
  USE_ELEVENLABS: 'elocare_use_elevenlabs',
};

export const SECURE_SETTING_KEYS = [
  KEYS.ELEVENLABS_API_KEY,
  KEYS.THERAPIST_PIN,
] as const;

export type Settings = {
  elevenLabsApiKey: string;
  elevenLabsVoiceId: string;
  therapistPin: string;
  patientName: string;
  useElevenLabs: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  elevenLabsApiKey: '',
  elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM',
  therapistPin: '1234',
  patientName: 'Meu Paciente',
  useElevenLabs: false,
};

async function loadSensitiveValue(key: string): Promise<string | null> {
  try {
    const secureValue = await SecureStore.getItemAsync(key);
    if (secureValue !== null) return secureValue;
  } catch {
    // SecureStore may be unavailable on some runtimes; fall back below.
  }

  return AsyncStorage.getItem(key);
}

async function saveSensitiveValue(key: string, value: string): Promise<void> {
  try {
    if (value) {
      await SecureStore.setItemAsync(key, value);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
    await AsyncStorage.removeItem(key);
  } catch {
    if (value) {
      await AsyncStorage.setItem(key, value);
    } else {
      await AsyncStorage.removeItem(key);
    }
  }
}

export async function loadSettings(): Promise<Settings> {
  try {
    const [apiKey, voiceId, pin, name, useEl] = await Promise.all([
      loadSensitiveValue(KEYS.ELEVENLABS_API_KEY),
      AsyncStorage.getItem(KEYS.ELEVENLABS_VOICE_ID),
      loadSensitiveValue(KEYS.THERAPIST_PIN),
      AsyncStorage.getItem(KEYS.PATIENT_NAME),
      AsyncStorage.getItem(KEYS.USE_ELEVENLABS),
    ]);

    return {
      elevenLabsApiKey: apiKey ?? DEFAULT_SETTINGS.elevenLabsApiKey,
      elevenLabsVoiceId: voiceId ?? DEFAULT_SETTINGS.elevenLabsVoiceId,
      therapistPin: pin ?? DEFAULT_SETTINGS.therapistPin,
      patientName: name ?? DEFAULT_SETTINGS.patientName,
      useElevenLabs: useEl === 'true',
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  const updates: [string, string][] = [];
  const secureUpdates: Promise<void>[] = [];

  if (settings.elevenLabsApiKey !== undefined) {
    secureUpdates.push(saveSensitiveValue(KEYS.ELEVENLABS_API_KEY, settings.elevenLabsApiKey));
  }
  if (settings.elevenLabsVoiceId !== undefined) {
    updates.push([KEYS.ELEVENLABS_VOICE_ID, settings.elevenLabsVoiceId]);
  }
  if (settings.therapistPin !== undefined) {
    secureUpdates.push(saveSensitiveValue(KEYS.THERAPIST_PIN, settings.therapistPin));
  }
  if (settings.patientName !== undefined) {
    updates.push([KEYS.PATIENT_NAME, settings.patientName]);
  }
  if (settings.useElevenLabs !== undefined) {
    updates.push([KEYS.USE_ELEVENLABS, String(settings.useElevenLabs)]);
  }

  await Promise.all([
    updates.length > 0 ? AsyncStorage.multiSet(updates) : Promise.resolve(),
    ...secureUpdates,
  ]);
}
