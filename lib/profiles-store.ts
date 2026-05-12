// ─────────────────────────────────────────────
// lib/profiles-store.ts
// Gerenciamento de múltiplos perfis de pacientes
// ─────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Profile, CustomCard } from '@/types';

const KEYS = {
  PROFILES_INDEX: 'elocare_profiles_index',   // string[] de ids
  ACTIVE_PROFILE: 'elocare_active_profile_id',
  PROFILE_PREFIX: 'elocare_profile_',         // + id
};

const PROFILE_COLORS = [
  '#2563EB', '#DC2626', '#7C3AED', '#16A34A',
  '#D97706', '#0891B2', '#DB2777', '#65A30D',
];

// ── CRUD BÁSICO ─────────────────────────────

export async function createProfile(data: {
  name: string;
  photoUri?: string;
  therapistName?: string;
  diagnosis?: string;
  birthDate?: string;
}): Promise<Profile> {
  const index = await getProfileIndex();
  const colorIndex = index.length % PROFILE_COLORS.length;

  const profile: Profile = {
    id: generateId(),
    name: data.name,
    photoUri: data.photoUri,
    color: PROFILE_COLORS[colorIndex],
    therapistName: data.therapistName,
    diagnosis: data.diagnosis,
    birthDate: data.birthDate,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    customCards: [],
    hiddenCardIds: [],
  };

  // Salva o perfil
  await AsyncStorage.setItem(
    KEYS.PROFILE_PREFIX + profile.id,
    JSON.stringify(profile)
  );

  // Atualiza o índice
  await AsyncStorage.setItem(
    KEYS.PROFILES_INDEX,
    JSON.stringify([...index, profile.id])
  );

  // Se for o primeiro perfil, torna ativo automaticamente
  if (index.length === 0) {
    await setActiveProfile(profile.id);
  }

  return profile;
}

export async function getProfile(id: string): Promise<Profile | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.PROFILE_PREFIX + id);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function getAllProfiles(): Promise<Profile[]> {
  const index = await getProfileIndex();
  const profiles = await Promise.all(index.map(getProfile));
  return profiles.filter(Boolean) as Profile[];
}

export async function updateProfile(
  id: string,
  updates: Partial<Omit<Profile, 'id' | 'createdAt'>>
): Promise<Profile | null> {
  const profile = await getProfile(id);
  if (!profile) return null;

  const updated: Profile = {
    ...profile,
    ...updates,
    id,
    createdAt: profile.createdAt,
    updatedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(
    KEYS.PROFILE_PREFIX + id,
    JSON.stringify(updated)
  );

  return updated;
}

export async function deleteProfile(id: string): Promise<void> {
  // Remove foto local se existir
  const profile = await getProfile(id);
  if (profile?.photoUri && profile.photoUri.startsWith('file://')) {
    await FileSystem.deleteAsync(profile.photoUri, { idempotent: true });
  }

  // Remove cartões customizados e seus áudios
  if (profile?.customCards) {
    for (const card of profile.customCards) {
      if (card.imageUri?.startsWith('file://')) {
        await FileSystem.deleteAsync(card.imageUri, { idempotent: true });
      }
      if (card.audioUri?.startsWith('file://')) {
        await FileSystem.deleteAsync(card.audioUri, { idempotent: true });
      }
    }
  }
  if (profile?.cardImageOverrides) {
    for (const uri of Object.values(profile.cardImageOverrides)) {
      if (uri?.startsWith('file://')) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }
    }
  }

  // Remove do storage
  await AsyncStorage.removeItem(KEYS.PROFILE_PREFIX + id);

  // Atualiza índice
  const index = await getProfileIndex();
  const newIndex = index.filter((pid) => pid !== id);
  await AsyncStorage.setItem(KEYS.PROFILES_INDEX, JSON.stringify(newIndex));

  // Se era o perfil ativo, muda para o próximo
  const activeId = await getActiveProfileId();
  if (activeId === id) {
    await setActiveProfile(newIndex[0] ?? null);
  }
}

// ── PERFIL ATIVO ────────────────────────────

export async function getActiveProfileId(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.ACTIVE_PROFILE);
}

export async function getActiveProfile(): Promise<Profile | null> {
  const id = await getActiveProfileId();
  if (!id) return null;
  return getProfile(id);
}

export async function setActiveProfile(id: string | null): Promise<void> {
  if (id) {
    await AsyncStorage.setItem(KEYS.ACTIVE_PROFILE, id);
  } else {
    await AsyncStorage.removeItem(KEYS.ACTIVE_PROFILE);
  }
}

// ── CARTÕES CUSTOMIZADOS ────────────────────

export async function addCustomCard(
  profileId: string,
  card: Omit<CustomCard, 'id' | 'createdAt'>
): Promise<CustomCard | null> {
  const profile = await getProfile(profileId);
  if (!profile) return null;

  const newCard: CustomCard = {
    ...card,
    id: `custom_${generateId()}`,
    createdAt: new Date().toISOString(),
  };

  await updateProfile(profileId, {
    customCards: [...(profile.customCards ?? []), newCard],
  });

  return newCard;
}

export async function removeCustomCard(
  profileId: string,
  cardId: string
): Promise<void> {
  const profile = await getProfile(profileId);
  if (!profile) return;

  const card = profile.customCards?.find((c) => c.id === cardId);
  if (card?.imageUri?.startsWith('file://')) {
    await FileSystem.deleteAsync(card.imageUri, { idempotent: true });
  }
  if (card?.audioUri?.startsWith('file://')) {
    await FileSystem.deleteAsync(card.audioUri, { idempotent: true });
  }

  await updateProfile(profileId, {
    customCards: profile.customCards?.filter((c) => c.id !== cardId) ?? [],
  });
}

export async function saveCustomCardImage(
  profileId: string,
  cardId: string,
  sourceUri: string
): Promise<string> {
  const profile = await getProfile(profileId);
  if (!profile) throw new Error('Profile not found');

  const dir = `${FileSystem.documentDirectory}profiles/${profileId}/cards/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

  const dest = `${dir}${cardId}.jpg`;
  const existing = await FileSystem.getInfoAsync(dest);
  if (existing.exists) {
    await FileSystem.deleteAsync(dest, { idempotent: true });
  }

  await FileSystem.copyAsync({ from: sourceUri, to: dest });

  await updateProfile(profileId, {
    customCards: (profile.customCards ?? []).map((card) =>
      card.id === cardId ? { ...card, imageUri: dest } : card
    ),
  });

  return dest;
}

export async function saveCardImageOverride(
  profileId: string,
  cardId: string,
  sourceUri: string
): Promise<string> {
  const profile = await getProfile(profileId);
  if (!profile) throw new Error('Profile not found');

  const dir = `${FileSystem.documentDirectory}profiles/${profileId}/standard-cards/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

  const dest = `${dir}${cardId}.jpg`;
  const existing = await FileSystem.getInfoAsync(dest);
  if (existing.exists) {
    await FileSystem.deleteAsync(dest, { idempotent: true });
  }

  await FileSystem.copyAsync({ from: sourceUri, to: dest });

  await updateProfile(profileId, {
    cardImageOverrides: {
      ...(profile.cardImageOverrides ?? {}),
      [cardId]: dest,
    },
  });

  return dest;
}

export async function removeCardImageOverride(
  profileId: string,
  cardId: string
): Promise<void> {
  const profile = await getProfile(profileId);
  if (!profile) return;

  const current = profile.cardImageOverrides ?? {};
  const uri = current[cardId];
  if (uri?.startsWith('file://')) {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }

  const next = { ...current };
  delete next[cardId];
  await updateProfile(profileId, { cardImageOverrides: next });
}

export async function toggleCardVisibility(
  profileId: string,
  cardId: string,
  hidden: boolean
): Promise<void> {
  const profile = await getProfile(profileId);
  if (!profile) return;

  const current = profile.hiddenCardIds ?? [];
  const updated = hidden
    ? [...current, cardId]
    : current.filter((id) => id !== cardId);

  await updateProfile(profileId, { hiddenCardIds: updated });
}

// ── FOTO DO PERFIL ──────────────────────────

export async function saveProfilePhoto(
  profileId: string,
  sourceUri: string
): Promise<string> {
  const dir = `${FileSystem.documentDirectory}profiles/${profileId}/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

  const dest = `${dir}avatar.jpg`;
  // Remove foto antiga para evitar arquivos órfãos
  const existing = await FileSystem.getInfoAsync(dest);
  if (existing.exists) {
    await FileSystem.deleteAsync(dest, { idempotent: true });
  }
  await FileSystem.copyAsync({ from: sourceUri, to: dest });

  await updateProfile(profileId, { photoUri: dest });
  return dest;
}

// ── HELPERS ─────────────────────────────────

async function getProfileIndex(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.PROFILES_INDEX);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
