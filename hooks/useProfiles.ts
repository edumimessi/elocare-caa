// hooks/useProfiles.ts
// Hook para gerenciamento de perfis na UI
// ─────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import {
  getAllProfiles,
  getActiveProfile,
  setActiveProfile,
  createProfile,
  updateProfile,
  deleteProfile,
} from '@/lib/profiles-store';
import { Profile } from '@/types';

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActive] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const [all, active] = await Promise.all([
      getAllProfiles(),
      getActiveProfile(),
    ]);
    setProfiles(all);
    setActive(active);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const switchProfile = useCallback(
    async (id: string) => {
      await setActiveProfile(id);
      await reload();
    },
    [reload]
  );

  const addProfile = useCallback(
    async (data: Parameters<typeof createProfile>[0]) => {
      const profile = await createProfile(data);
      await reload();
      return profile;
    },
    [reload]
  );

  const editProfile = useCallback(
    async (id: string, updates: Parameters<typeof updateProfile>[1]) => {
      await updateProfile(id, updates ?? {});
      await reload();
    },
    [reload]
  );

  const removeProfile = useCallback(
    async (id: string) => {
      await deleteProfile(id);
      await reload();
    },
    [reload]
  );

  return {
    profiles,
    activeProfile,
    loading,
    switchProfile,
    addProfile,
    editProfile,
    removeProfile,
    reload,
  };
}

// ─────────────────────────────────────────────
