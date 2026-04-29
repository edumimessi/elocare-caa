import React, { useState, useCallback } from 'react';
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
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { CATEGORIES, CARDS, getCardsByCategory, CAACard, CAACategory } from '@/lib/caa-data';
import { speakWithElevenLabs, speakWithSystemTTS } from '@/lib/voice-service';
import { loadSettings } from '@/lib/settings-store';

type Screen = 'categories' | 'board';

export default function HomeScreen() {
  const colors = useColors();
  const [screen, setScreen] = useState<Screen>('categories');
  const [selectedCategory, setSelectedCategory] = useState<CAACategory | null>(null);
  const [sentence, setSentence] = useState<CAACard[]>([]);
  const [pressedId, setPressedId] = useState<string | null>(null);

  const handleCategoryPress = useCallback((cat: CAACategory) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(cat);
    setSentence([]);
    setScreen('board');
  }, []);

  const handleCardPress = useCallback(async (card: CAACard) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPressedId(card.id);
    setTimeout(() => setPressedId(null), 300);
    setSentence((prev) => [...prev, card]);

    // Speak the card label
    const settings = await loadSettings();
    if (settings.useElevenLabs && settings.elevenLabsApiKey) {
      speakWithElevenLabs(card.label, settings.elevenLabsApiKey, settings.elevenLabsVoiceId);
    } else {
      speakWithSystemTTS(card.label);
    }
  }, []);

  const handleSpeakSentence = useCallback(async () => {
    if (sentence.length === 0) return;
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const text = sentence.map((c) => c.label).join(' ');
    const settings = await loadSettings();
    if (settings.useElevenLabs && settings.elevenLabsApiKey) {
      speakWithElevenLabs(text, settings.elevenLabsApiKey, settings.elevenLabsVoiceId);
    } else {
      speakWithSystemTTS(text);
    }
  }, [sentence]);

  const handleClearSentence = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSentence([]);
  }, []);

  const handleBack = useCallback(() => {
    setScreen('categories');
    setSelectedCategory(null);
    setSentence([]);
  }, []);

  const cards = selectedCategory ? getCardsByCategory(selectedCategory.id) : [];

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        {screen === 'board' && (
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.backBtnText}>← Voltar</Text>
          </Pressable>
        )}
        <Text style={styles.headerTitle}>
          {screen === 'categories' ? '💬 EloCare CAA' : selectedCategory?.label ?? ''}
        </Text>
        {screen === 'board' && (
          <Text style={styles.headerEmoji}>{selectedCategory?.emoji}</Text>
        )}
      </View>

      {/* Sentence Bar */}
      {screen === 'board' && (
        <View style={[styles.sentenceBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sentenceScroll}>
            {sentence.length === 0 ? (
              <Text style={[styles.sentencePlaceholder, { color: colors.muted }]}>
                Toque nos cartões para montar uma frase...
              </Text>
            ) : (
              sentence.map((card, i) => (
                <View key={`${card.id}-${i}`} style={[styles.sentenceChip, { backgroundColor: colors.primary }]}>
                  <Text style={styles.sentenceChipText}>{card.emoji} {card.label}</Text>
                </View>
              ))
            )}
          </ScrollView>
          <View style={styles.sentenceActions}>
            {sentence.length > 0 && (
              <>
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
              </>
            )}
          </View>
        </View>
      )}

      {/* Categories Grid */}
      {screen === 'categories' && (
        <FlatList
          data={CATEGORIES}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleCategoryPress(item)}
              style={({ pressed }) => [
                styles.categoryCard,
                { backgroundColor: item.bgColor, borderColor: item.color },
                pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 },
              ]}
            >
              <Text style={styles.categoryEmoji}>{item.emoji}</Text>
              <Text style={[styles.categoryLabel, { color: item.color }]}>{item.label}</Text>
              <Text style={[styles.categoryCount, { color: item.color }]}>
                {getCardsByCategory(item.id).length} cartões
              </Text>
            </Pressable>
          )}
        />
      )}

      {/* CAA Board Grid */}
      {screen === 'board' && (
        <FlatList
          data={cards}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleCardPress(item)}
              style={({ pressed }) => [
                styles.caaCard,
                {
                  backgroundColor: pressedId === item.id ? item.color : colors.surface,
                  borderColor: item.color,
                },
                (pressed || pressedId === item.id) && { transform: [{ scale: 0.93 }] },
              ]}
            >
              <Text style={styles.caaEmoji}>{item.emoji}</Text>
              <Text
                style={[
                  styles.caaLabel,
                  { color: pressedId === item.id ? '#FFFFFF' : colors.foreground },
                ]}
                numberOfLines={2}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
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
  headerEmoji: {
    fontSize: 24,
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sentenceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    minHeight: 60,
    gap: 8,
  },
  sentenceScroll: {
    flex: 1,
  },
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
  sentenceChipText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  sentenceActions: {
    flexDirection: 'row',
    gap: 6,
  },
  speakBtn: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  speakBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  clearBtn: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clearBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  grid: {
    padding: 12,
    gap: 10,
  },
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
  categoryEmoji: {
    fontSize: 48,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  categoryCount: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.7,
  },
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
  caaEmoji: {
    fontSize: 42,
  },
  caaLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
