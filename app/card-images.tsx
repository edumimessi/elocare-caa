import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  AlertButton,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useProfiles } from '@/hooks/useProfiles';
import { CARDS, CATEGORIES, CAACard } from '@/lib/caa-data';
import {
  removeCardImageOverride,
  saveCardImageOverride,
} from '@/lib/profiles-store';

type PhotoSource = 'camera' | 'gallery';

export default function CardImagesScreen() {
  const colors = useColors();
  const router = useRouter();
  const { activeProfile, reload } = useProfiles();
  const [savingCardId, setSavingCardId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const groupedCards = useMemo(
    () =>
      CATEGORIES.map((category) => ({
        category,
        cards: CARDS.filter((card) => card.categoryId === category.id),
      })),
    []
  );

  const pickPhoto = useCallback(
    async (card: CAACard, source: PhotoSource) => {
      if (!activeProfile) return;

      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permission.status !== 'granted') {
        Alert.alert(
          'Permissao necessaria',
          source === 'camera'
            ? 'Ative a permissao de camera para trocar a foto do cartao.'
            : 'Ative a permissao da galeria para trocar a foto do cartao.'
        );
        return;
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.82,
      };

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);

      if (result.canceled || !result.assets[0]) return;

      try {
        setSavingCardId(card.id);
        await saveCardImageOverride(activeProfile.id, card.id, result.assets[0].uri);
        await reload();
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch {
        Alert.alert('Erro', 'Nao foi possivel salvar a foto do cartao.');
      } finally {
        setSavingCardId(null);
      }
    },
    [activeProfile, reload]
  );

  const removePhoto = useCallback(
    async (card: CAACard) => {
      if (!activeProfile) return;

      try {
        setSavingCardId(card.id);
        await removeCardImageOverride(activeProfile.id, card.id);
        await reload();
      } catch {
        Alert.alert('Erro', 'Nao foi possivel remover a foto do cartao.');
      } finally {
        setSavingCardId(null);
      }
    },
    [activeProfile, reload]
  );

  const openPhotoActions = useCallback(
    (card: CAACard) => {
      const hasPhoto = !!activeProfile?.cardImageOverrides?.[card.id];
      const actions: AlertButton[] = [
        { text: 'Camera', onPress: () => pickPhoto(card, 'camera') },
        { text: 'Galeria', onPress: () => pickPhoto(card, 'gallery') },
      ];

      if (hasPhoto) {
        actions.push({ text: 'Remover foto', onPress: () => removePhoto(card) });
      }

      actions.push({ text: 'Cancelar', style: 'cancel' as const });
      Alert.alert('Foto do cartao', `Alterar foto de "${card.label}"`, actions);
    },
    [activeProfile?.cardImageOverrides, pickPhoto, removePhoto]
  );

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>Voltar</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Editar fotos dos cartoes</Text>
        <View style={styles.headerSpacer} />
      </View>

      {!activeProfile ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Crie ou selecione um paciente primeiro.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.infoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.infoTitle, { color: colors.foreground }]}>
              Paciente: {activeProfile.name}
            </Text>
            <Text style={[styles.infoText, { color: colors.muted }]}>
              Toque em um cartao para trocar por uma foto real da camera ou galeria.
            </Text>
          </View>

          {groupedCards.map(({ category, cards }) => (
            <View key={category.id} style={styles.categoryBlock}>
              <Text style={[styles.categoryTitle, { color: category.color }]}>
                {category.label}
              </Text>

              {cards.map((card) => {
                const imageUri = activeProfile.cardImageOverrides?.[card.id];
                const saving = savingCardId === card.id;

                return (
                  <Pressable
                    key={card.id}
                    onPress={() => openPhotoActions(card)}
                    style={({ pressed }) => [
                      styles.cardRow,
                      {
                        backgroundColor: colors.surface,
                        borderColor: imageUri ? card.color : colors.border,
                      },
                      pressed && { opacity: 0.82 },
                    ]}
                  >
                    {imageUri ? (
                      <Image source={{ uri: imageUri }} style={styles.cardImage} />
                    ) : (
                      <View style={[styles.cardEmojiBox, { backgroundColor: card.color + '18' }]}>
                        <Text style={styles.cardEmoji}>{card.emoji}</Text>
                      </View>
                    )}

                    <View style={styles.cardInfo}>
                      <Text style={[styles.cardLabel, { color: colors.foreground }]}>
                        {card.label}
                      </Text>
                      <Text style={[styles.cardStatus, { color: colors.muted }]}>
                        {saving ? 'Salvando...' : imageUri ? 'Foto personalizada' : 'Usando emoji'}
                      </Text>
                    </View>

                    <Text style={[styles.cardAction, { color: card.color }]}>
                      Trocar foto
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  backButton: {
    minWidth: 62,
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  headerTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 62,
  },
  content: {
    padding: 14,
    paddingBottom: 44,
    gap: 18,
  },
  infoBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
  categoryBlock: {
    gap: 8,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '900',
    marginLeft: 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 10,
    gap: 12,
  },
  cardImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  cardEmojiBox: {
    width: 64,
    height: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEmoji: {
    fontSize: 34,
  },
  cardInfo: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '800',
  },
  cardStatus: {
    fontSize: 12,
    marginTop: 3,
  },
  cardAction: {
    fontSize: 13,
    fontWeight: '900',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
});
