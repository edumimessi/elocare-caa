// ─────────────────────────────────────────────
// components/profiles/CacheStatusBar.tsx
// Barra de status da pré-geração de áudio offline
// ─────────────────────────────────────────────
import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { PreGenerationStatus } from '@/types';

type Props = {
  cacheReady: boolean;
  generating: boolean;
  progress: PreGenerationStatus | null;
  onStartGeneration: () => void;
};

export function CacheStatusBar({
  cacheReady,
  generating,
  progress,
  onStartGeneration,
}: Props) {
  const colors = useColors();

  // Cache pronto e não está gerando — mostra badge verde
  if (cacheReady && !generating) {
    return (
      <View style={[styles.bar, { backgroundColor: colors.surface,
        borderBottomColor: colors.border }]}>
        <View style={[styles.dot, { backgroundColor: colors.success }]} />
        <Text style={[styles.readyText, { color: colors.success }]}>
          Voz offline pronta
        </Text>
      </View>
    );
  }

  // Gerando — mostra barra de progresso
  if (generating && progress) {
    const pct = progress.total > 0
      ? Math.round((progress.completed / progress.total) * 100)
      : 0;

    return (
      <View style={[styles.bar, { backgroundColor: colors.surface,
        borderBottomColor: colors.border }]}>
        <View style={styles.progressWrapper}>
          <View style={[styles.progressTrack,
            { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, {
              backgroundColor: colors.primary,
            } as ViewStyle, { width: `${pct}%` as ViewStyle['width'] }]} />
          </View>
          <Text style={[styles.progressLabel, { color: colors.muted }]}>
            Preparando voz... {pct}%
            {progress.failed.length > 0
              ? `  •  ${progress.failed.length} erro(s)`
              : ''}
          </Text>
        </View>
      </View>
    );
  }

  // Cache não pronto — botão de ação
  return (
    <Pressable
      onPress={onStartGeneration}
      style={({ pressed }) => [
        styles.bar,
        styles.actionBar,
        { backgroundColor: colors.surface, borderBottomColor: colors.border },
        pressed && { opacity: 0.75 },
      ]}
      accessibilityRole="button"
      accessibilityLabel="Preparar voz offline"
    >
      <View style={[styles.dot, { backgroundColor: colors.warning }]} />
      <Text style={[styles.actionText, { color: colors.primary }]}>
        Preparar voz offline para uso sem internet
      </Text>
      <Text style={[styles.arrow, { color: colors.primary }]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    minHeight: 38,
    gap: 8,
  },
  actionBar: {
    justifyContent: 'flex-start',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  readyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressWrapper: {
    flex: 1,
    gap: 4,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 11,
  },
  actionText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  arrow: {
    fontSize: 18,
    fontWeight: '600',
  },
});
