// ─────────────────────────────────────────────
// app/(tabs)/index.tsx — VERSÃO FINAL
// Multi-perfil + cache de áudio + telemetria integrados
// ─────────────────────────────────────────────
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import {
  CATEGORIES,
  CARDS,
  getCardsByCategory,
  CAACard,
  CAACategory,
} from '@/lib/caa-data';
import { loadSettings, Settings } from '@/lib/settings-store';

// Módulos v2
import { useProfiles }    from '@/hooks/useProfiles';
import { useAudioCache }  from '@/hooks/useAudioCache';
import { useTelemetry }   from '@/hooks/useTelemetry';
import { ProfileSwitcher } from '@/components/profiles/ProfileSwitcher';
import { CacheStatusBar }  from '@/components/profiles/CacheStatusBar';

type Screen = 'categories' | 'board';

// Cartão estendido para suportar imagens reais de cartões customizados
type DisplayCard = CAACard & { imageUri?: string };

export default function HomeScreen() {
  const colors  = useColors();
  const router  = useRouter();

  const [screen, setScreen]             = useState<Screen>('categories');
  const [selectedCategory, setCategory] = useState<CAACategory | null>(null);
  const [sentence, setSentence]         = useState<DisplayCard[]>([]);
  const [pressedId, setPressedId]       = useState<string | null>(null);
  const [settings, setSettings]         = useState<Settings | null>(null);

  // ── Módulos
  const { profiles, activeProfile, switchProfile } = useProfiles();

  const audio = useAudioCache(
    settings?.elevenLabsApiKey   ?? '',
    settings?.elevenLabsVoiceId  ?? ''
  );

  const telemetry = useTelemetry(activeProfile?.id ?? null);

  // Carrega settings uma vez
  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  // Verifica cache ao carregar settings com ElevenLabs ativo
  useEffect(() => {
    if (settings?.useElevenLabs && settings?.elevenLabsApiKey) {
      audio.checkCache();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.elevenLabsApiKey, settings?.useElevenLabs, audio.checkCache]);

  // ── CARTÕES VISÍVEIS ───────────────────────

  const hiddenIds    = new Set(activeProfile?.hiddenCardIds ?? []);
  const customCards  = activeProfile?.customCards ?? [];

  const visibleCards: DisplayCard[] = selectedCategory
    ? [
        // Cartões padrão não ocultos
        ...getCardsByCategory(selectedCategory.id)
          .filter((c) => !hiddenIds.has(c.id)),
        // Cartões personalizados desta categoria
        ...customCards
          .filter((c) => c.categoryId === selectedCategory.id)
          .map((c): DisplayCard => ({
            id:         c.id,
            label:      c.label,
            emoji:      '📷',
            color:      c.color,
            categoryId: c.categoryId,
            imageUri:   c.imageUri,
          })),
      ]
    : [];

  // ── HANDLERS ──────────────────────────────

  const handleCategoryPress = useCallback((cat: CAACategory) => {
    if (Platform.OS !== 'web')
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCategory(cat);
    setSentence([]);
    setScreen('board');
  }, []);

  const handleCardPress = useCallback(async (card: DisplayCard) => {
    if (Platform.OS !== 'web')
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setPressedId(card.id);
    setTimeout(() => setPressedId(null), 300);
    setSentence((prev) => [...prev, card]);

    // Reprodução com hierarquia: cache → API → TTS nativo
    await audio.play(
      card.id,
      card.label,
      settings?.useElevenLabs ?? false
    );

    // Telemetria
    telemetry.logClick(card.id, card.label, card.categoryId);
  }, [audio, telemetry, settings?.useElevenLabs]);

  const handleSpeakSentence = useCallback(async () => {
    if (sentence.length === 0) return;
    if (Platform.OS !== 'web')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const text = sentence.map((c) => c.label).join(' ');
    await audio.play(
      `sentence_${Date.now()}`,
      text,
      settings?.useElevenLabs ?? false
    );

    telemetry.logSentence(
      sentence.map((c) => c.id),
      sentence.map((c) => c.label)
    );
  }, [sentence, audio, telemetry, settings?.useElevenLabs]);

  const handleClearSentence = useCallback(() => {
    if (Platform.OS !== 'web')
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSentence([]);
  }, []);

  const handleBack = useCallback(() => {
    setScreen('categories');
    setCategory(null);
    setSentence([]);
  }, []);

  const handleAddProfile = useCallback(() => {
    router.push('../profile-form' as any);
  }, [router]);

  // ── RENDER ────────────────────────────────

  return (
    <ScreenContainer containerClassName="bg-background">

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        {screen === 'board' && (
          <Pressable onPress={handleBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Voltar</Text>
          </Pressable>
        )}
        <Text style={styles.headerTitle}>
          {screen === 'categories'
            ? (activeProfile ? `💬 ${activeProfile.name}` : '💬 EloCare CAA')
            : selectedCategory?.label ?? ''}
        </Text>
        {screen === 'board' && selectedCategory && (
          <Text style={styles.headerEmoji}>{selectedCategory.emoji}</Text>
        )}
      </View>

      {/* Seletor de perfil — só na tela de categorias */}
      {screen === 'categories' && (
        <ProfileSwitcher
          profiles={profiles}
          activeProfileId={activeProfile?.id ?? null}
          onSwitch={switchProfile}
          onAdd={handleAddProfile}
        />
      )}

      {/* Barra de status do cache — só quando ElevenLabs está ativo */}
      {screen === 'categories' && settings?.useElevenLabs && (
        <CacheStatusBar
          cacheReady={audio.cacheReady}
          generating={audio.generating}
          progress={audio.progress}
          onStartGeneration={() =>
            audio.startPreGeneration(activeProfile ?? null)
          }
        />
      )}

      {/* Barra de frase montada */}
      {screen === 'board' && (
        <View style={[
          styles.sentenceBar,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.sentenceScroll}
          >
            {sentence.length === 0 ? (
              <Text style={[styles.sentencePlaceholder, { color: colors.muted }]}>
                Toque nos cartões para montar uma frase...
              </Text>
            ) : (
              sentence.map((card, i) => (
                <View
                  key={`${card.id}-${i}`}
                  style={[styles.sentenceChip, { backgroundColor: card.color }]}
                >
                  <Text style={styles.sentenceChipText}>
                    {card.emoji} {card.label}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>

          {sentence.length > 0 && (
            <View style={styles.sentenceActions}>
              <Pressable
                onPress={handleSpeakSentence}
                style={({ pressed }) => [
                  styles.speakBtn,
                  { backgroundColor: colors.success },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={styles.speakBtnText}>🔊 Falar</Text>
              </Pressable>
              <Pressable
                onPress={handleClearSentence}
                style={({ pressed }) => [
                  styles.clearBtn,
                  { backgroundColor: colors.error },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={styles.clearBtnText}>✕</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {/* Grade de categorias */}
      {screen === 'categories' && (
        <FlatList
          data={CATEGORIES}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => {
            const count = getCardsByCategory(item.id)
              .filter((c) => !hiddenIds.has(c.id)).length
              + customCards.filter((c) => c.categoryId === item.id).length;

            return (
              <Pressable
                onPress={() => handleCategoryPress(item)}
                style={({ pressed }) => [
                  styles.categoryCard,
                  { backgroundColor: item.bgColor, borderColor: item.color },
                  pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Categoria ${item.label}, ${count} cartões`}
              >
                <Text style={styles.categoryEmoji}>{item.emoji}</Text>
                <Text style={[styles.categoryLabel, { color: item.color }]}>
                  {item.label}
                </Text>
                <Text style={[styles.categoryCount, { color: item.color }]}>
                  {count} cartões
                </Text>
              </Pressable>
            );
          }}
        />
      )}

      {/* Grade CAA */}
      {screen === 'board' && (
        <FlatList
          data={visibleCards}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => {
            const isPressed = pressedId === item.id;
            return (
              <Pressable
                onPress={() => handleCardPress(item)}
                style={({ pressed }) => [
                  styles.caaCard,
                  {
                    backgroundColor: isPressed ? item.color : colors.surface,
                    borderColor: item.color,
                  },
                  (pressed || isPressed) && {
                    transform: [{ scale: 0.92 }],
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                <Text style={styles.caaEmoji}>{item.emoji}</Text>
                <Text
                  style={[
                    styles.caaLabel,
                    { color: isPressed ? '#FFFFFF' : colors.foreground },
                  ]}
                  numberOfLines={2}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      )}

    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  headerEmoji: { fontSize: 24 },
  backBtn: { position: 'absolute', left: 16, zIndex: 1 },
  backBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  sentenceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    minHeight: 60,
    gap: 8,
  },
  sentenceScroll: { flex: 1 },
  sentencePlaceholder: {
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  sentenceChip: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
    alignSelf: 'center',
  },
  sentenceChipText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  sentenceActions: { flexDirection: 'row', gap: 6 },
  speakBtn: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  speakBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  clearBtn: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  clearBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  grid: { padding: 12, gap: 10 },
  categoryCard: {
    flex: 1,
    margin: 5,
    borderRadius: 20,
    borderWidth: 2,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
    gap: 6,
  },
  categoryEmoji: { fontSize: 48 },
  categoryLabel: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  categoryCount: { fontSize: 12, fontWeight: '500', opacity: 0.7 },
  caaCard: {
    flex: 1,
    margin: 5,
    borderRadius: 16,
    borderWidth: 2,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
    gap: 6,
  },
  caaEmoji: { fontSize: 42 },
  caaLabel: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
