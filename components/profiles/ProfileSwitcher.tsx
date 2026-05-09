// ─────────────────────────────────────────────
// components/profiles/ProfileSwitcher.tsx
// Chips horizontais para trocar de paciente
// ─────────────────────────────────────────────
import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Image,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { Profile } from '@/types';

type Props = {
  profiles: Profile[];
  activeProfileId: string | null;
  onSwitch: (id: string) => void;
  onAdd?: () => void;
  onEdit?: (id: string) => void;
};

export function ProfileSwitcher({
  profiles,
  activeProfileId,
  onSwitch,
  onAdd,
  onEdit,
}: Props) {
  const colors = useColors();

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {profiles.map((profile) => {
          const isActive = profile.id === activeProfileId;
          return (
            <Pressable
              key={profile.id}
              onPress={() => onSwitch(profile.id)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: isActive ? profile.color : colors.surface,
                  borderColor: profile.color,
                },
                pressed && { opacity: 0.8 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Selecionar paciente ${profile.name}`}
              accessibilityState={{ selected: isActive }}
            >
              {profile.photoUri ? (
                <Image
                  source={{ uri: profile.photoUri }}
                  style={styles.avatar}
                />
              ) : (
                <View style={[
                  styles.avatarPlaceholder,
                  {
                    backgroundColor: isActive
                      ? 'rgba(255,255,255,0.25)'
                      : profile.color + '22',
                  },
                ]}>
                  <Text style={[
                    styles.avatarInitial,
                    { color: isActive ? '#FFFFFF' : profile.color },
                  ]}>
                    {profile.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text
                style={[
                  styles.chipLabel,
                  { color: isActive ? '#FFFFFF' : profile.color },
                ]}
                numberOfLines={1}
              >
                {profile.name}
              </Text>
            </Pressable>
          );
        })}

        {/* Botão adicionar perfil */}
        {activeProfileId && onEdit && (
          <Pressable
            onPress={() => onEdit(activeProfileId)}
            style={({ pressed }) => [
              styles.chip,
              styles.editChip,
              { borderColor: colors.primary },
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Editar paciente ativo"
          >
            <Text style={[styles.chipLabel, { color: colors.primary }]}>
              Editar
            </Text>
          </Pressable>
        )}

        {onAdd && (
          <Pressable
            onPress={onAdd}
            style={({ pressed }) => [
              styles.chip,
              styles.addChip,
              { borderColor: colors.border },
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Adicionar novo paciente"
          >
            <Text style={[styles.addIcon, { color: colors.muted }]}>+</Text>
            <Text style={[styles.chipLabel, { color: colors.muted }]}>
              Novo
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 0.5,
    paddingVertical: 8,
  },
  scroll: {
    paddingHorizontal: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  addChip: {
    backgroundColor: 'transparent',
  },
  editChip: {
    backgroundColor: 'transparent',
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  avatarPlaceholder: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 13,
    fontWeight: '700',
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 90,
  },
  addIcon: {
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 20,
  },
});
