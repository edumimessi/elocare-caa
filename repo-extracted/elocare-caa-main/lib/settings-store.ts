import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  ELEVENLABS_API_KEY: 'elocare_elevenlabs_api_key',
  ELEVENLABS_VOICE_ID: 'elocare_elevenlabs_voice_id',
  THERAPIST_PIN: 'elocare_therapist_pin',
  PATIENT_NAME: 'elocare_patient_name',
  USE_ELEVENLABS: 'elocare_use_elevenlabs',
};

export type Settings = {
  elevenLabsApiKey: string;
  elevenLabsVoiceId: string;
  therapistPin: string;
  patientName: string;
  useElevenLabs: boolean;
};

const DEFAULT_SETTINGS: Settings = {
  elevenLabsApiKey: '',
  elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM',
  therapistPin: '1234',
  patientName: 'Meu Paciente',
  useElevenLabs: false,
};

export async function loadSettings(): Promise<Settings> {
  try {
    const [apiKey, voiceId, pin, name, useEl] = await Promise.all([
      AsyncStorage.getItem(KEYS.ELEVENLABS_API_KEY),
      AsyncStorage.getItem(KEYS.ELEVENLABS_VOICE_ID),
      AsyncStorage.getItem(KEYS.THERAPIST_PIN),
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

  if (settings.elevenLabsApiKey !== undefined)
    updates.push([KEYS.ELEVENLABS_API_KEY, settings.elevenLabsApiKey]);
  if (settings.elevenLabsVoiceId !== undefined)
    updates.push([KEYS.ELEVENLABS_VOICE_ID, settings.elevenLabsVoiceId]);
  if (settings.therapistPin !== undefined)
    updates.push([KEYS.THERAPIST_PIN, settings.therapistPin]);
  if (settings.patientName !== undefined)
    updates.push([KEYS.PATIENT_NAME, settings.patientName]);
  if (settings.useElevenLabs !== undefined)
    updates.push([KEYS.USE_ELEVENLABS, String(settings.useElevenLabs)]);

  await AsyncStorage.multiSet(updates);
}
