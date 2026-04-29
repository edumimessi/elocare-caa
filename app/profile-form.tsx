// ─────────────────────────────────────────────
// app/(tabs)/profile-form.tsx
// Tela de criação e edição de perfil de paciente
// ─────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import {
  createProfile,
  updateProfile,
  getProfile,
  deleteProfile,
  saveProfilePhoto,
} from '@/lib/profiles-store';
import { Profile } from '@/types';

// Paleta de cores para o avatar
const AVATAR_COLORS = [
  '#2563EB', '#DC2626', '#7C3AED', '#16A34A',
  '#D97706', '#0891B2', '#DB2777', '#65A30D',
  '#9333EA', '#EA580C',
];

type FormState = {
  name: string;
  therapistName: string;
  diagnosis: string;
  birthDate: string;
  color: string;
  photoUri: string | null;
};

const EMPTY_FORM: FormState = {
  name: '',
  therapistName: '',
  diagnosis: '',
  birthDate: '',
  color: AVATAR_COLORS[0],
  photoUri: null,
};

export default function ProfileFormScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ profileId?: string }>();
  const isEditing = !!params.profileId;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [existingProfile, setExistingProfile] = useState<Profile | null>(null);

  // Carrega dados se for edição
  useEffect(() => {
    if (!params.profileId) return;
    getProfile(params.profileId).then((p) => {
      if (!p) return;
      setExistingProfile(p);
      setForm({
        name: p.name,
        therapistName: p.therapistName ?? '',
        diagnosis: p.diagnosis ?? '',
        birthDate: p.birthDate ?? '',
        color: p.color,
        photoUri: p.photoUri ?? null,
      });
    });
  }, [params.profileId]);

  const update = useCallback(
    (field: keyof FormState, value: string) =>
      setForm((prev) => ({ ...prev, [field]: value })),
    []
  );

  // Aplica máscara DD/MM/AAAA automaticamente
  const handleBirthDateChange = useCallback((raw: string) => {
    // Remove tudo que não é dígito
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    let masked = digits;
    if (digits.length > 4) {
      masked = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    } else if (digits.length > 2) {
      masked = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    update('birthDate', masked);
  }, [update]);

  // ── FOTO ────────────────────────────────────

  const handlePickPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permissão necessária',
        'Precisamos de acesso à galeria para adicionar a foto do paciente.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setForm((prev) => ({ ...prev, photoUri: result.assets[0].uri }));
    }
  }, []);

  const handleTakePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permissão necessária',
        'Precisamos de acesso à câmera para tirar a foto do paciente.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setForm((prev) => ({ ...prev, photoUri: result.assets[0].uri }));
    }
  }, []);

  const handlePhotoPress = useCallback(() => {
    Alert.alert('Foto do paciente', 'Como deseja adicionar a foto?', [
      { text: 'Câmera', onPress: handleTakePhoto },
      { text: 'Galeria', onPress: handlePickPhoto },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }, [handleTakePhoto, handlePickPhoto]);

  // ── SALVAR ───────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      Alert.alert('Nome obrigatório', 'Por favor, informe o nome do paciente.');
      return;
    }

    setSaving(true);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    try {
      if (isEditing && existingProfile) {
        // Atualiza perfil existente
        await updateProfile(existingProfile.id, {
          name: form.name.trim(),
          therapistName: form.therapistName.trim() || undefined,
          diagnosis: form.diagnosis.trim() || undefined,
          birthDate: form.birthDate.trim() || undefined,
          color: form.color,
        });

        // Salva foto nova se foi alterada
        if (
          form.photoUri &&
          form.photoUri !== existingProfile.photoUri &&
          form.photoUri.startsWith('file://')
        ) {
          await saveProfilePhoto(existingProfile.id, form.photoUri);
        }
      } else {
        // Cria novo perfil
        const profile = await createProfile({
          name: form.name.trim(),
          therapistName: form.therapistName.trim() || undefined,
          diagnosis: form.diagnosis.trim() || undefined,
          birthDate: form.birthDate.trim() || undefined,
        });

        // Aplica cor personalizada
        await updateProfile(profile.id, { color: form.color });

        // Salva foto se foi escolhida
        if (form.photoUri) {
          await saveProfilePhoto(profile.id, form.photoUri);
        }
      }

      router.back();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o perfil. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }, [form, isEditing, existingProfile, router]);

  // ── DELETAR ──────────────────────────────────

  const handleDelete = useCallback(() => {
    if (!existingProfile) return;
    Alert.alert(
      'Excluir perfil',
      `Tem certeza que deseja excluir o perfil de ${existingProfile.name}? Todos os dados de uso serão perdidos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await deleteProfile(existingProfile.id);
            router.back();
          },
        },
      ]
    );
  }, [existingProfile, router]);

  // ── RENDER ───────────────────────────────────

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Pressable onPress={() => router.back()} style={styles.cancelBtn}>
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </Pressable>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Editar Paciente' : 'Novo Paciente'}
        </Text>
        <Pressable
          onPress={handleSave}
          style={styles.saveBtn}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>

          {/* Avatar + foto */}
          <View style={styles.avatarSection}>
            <Pressable
              onPress={handlePhotoPress}
              style={({ pressed }) => [pressed && { opacity: 0.8 }]}
              accessibilityRole="button"
              accessibilityLabel="Adicionar foto do paciente"
            >
              {form.photoUri ? (
                <Image
                  source={{ uri: form.photoUri }}
                  style={[styles.avatarLarge, { borderColor: form.color }]}
                />
              ) : (
                <View style={[
                  styles.avatarLarge,
                  styles.avatarEmpty,
                  { backgroundColor: form.color + '22', borderColor: form.color },
                ]}>
                  <Text style={[styles.avatarInitialLarge, { color: form.color }]}>
                    {form.name ? form.name.charAt(0).toUpperCase() : '?'}
                  </Text>
                </View>
              )}
              <View style={[styles.photoEditBadge, { backgroundColor: form.color }]}>
                <Text style={styles.photoEditIcon}>📷</Text>
              </View>
            </Pressable>
            <Text style={[styles.photoHint, { color: colors.muted }]}>
              Toque para adicionar foto
            </Text>
          </View>

          {/* Seletor de cor */}
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>
            COR DO PERFIL
          </Text>
          <View style={styles.colorRow}>
            {AVATAR_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => update('color', c)}
                style={[
                  styles.colorDot,
                  { backgroundColor: c },
                  form.color === c && styles.colorDotSelected,
                ]}
                accessibilityRole="radio"
                accessibilityState={{ checked: form.color === c }}
              />
            ))}
          </View>

          {/* Nome — obrigatório */}
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>
            NOME DO PACIENTE *
          </Text>
          <TextInput
            style={[styles.input, {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.foreground,
            }]}
            value={form.name}
            onChangeText={(v) => update('name', v)}
            placeholder="Ex: Maria, João..."
            placeholderTextColor={colors.muted}
            autoCapitalize="words"
            returnKeyType="next"
            maxLength={40}
          />

          {/* Nome do terapeuta */}
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>
            TERAPEUTA RESPONSÁVEL
          </Text>
          <TextInput
            style={[styles.input, {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.foreground,
            }]}
            value={form.therapistName}
            onChangeText={(v) => update('therapistName', v)}
            placeholder="Ex: Dra. Ana Lima"
            placeholderTextColor={colors.muted}
            autoCapitalize="words"
            returnKeyType="next"
            maxLength={60}
          />

          {/* Diagnóstico — uso interno */}
          <View style={styles.fieldHeaderRow}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>
              DIAGNÓSTICO
            </Text>
            <Text style={[styles.fieldHint, { color: colors.muted }]}>
              uso interno
            </Text>
          </View>
          <TextInput
            style={[styles.input, {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.foreground,
            }]}
            value={form.diagnosis}
            onChangeText={(v) => update('diagnosis', v)}
            placeholder="Ex: TEA nível 2"
            placeholderTextColor={colors.muted}
            autoCapitalize="sentences"
            returnKeyType="next"
            maxLength={80}
          />

          {/* Data de nascimento */}
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>
            DATA DE NASCIMENTO
          </Text>
          <TextInput
            style={[styles.input, {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.foreground,
            }]}
            value={form.birthDate}
            onChangeText={handleBirthDateChange}
            placeholder="DD/MM/AAAA"
            placeholderTextColor={colors.muted}
            keyboardType="numeric"
            maxLength={10}
            returnKeyType="done"
          />

          {/* Aviso LGPD */}
          <View style={[styles.lgpdBox, {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          }]}>
            <Text style={[styles.lgpdText, { color: colors.muted }]}>
              🔒 Os dados deste paciente são armazenados apenas neste dispositivo
              e nunca são enviados a terceiros. Em conformidade com a LGPD
              (Lei 13.709/2018).
            </Text>
          </View>

          {/* Botão deletar — só na edição */}
          {isEditing && (
            <Pressable
              onPress={handleDelete}
              disabled={saving}
              style={({ pressed }) => [
                styles.deleteBtn,
                { borderColor: colors.error },
                pressed && { opacity: 0.7 },
                saving && { opacity: 0.4 },
              ]}
            >
              <Text style={[styles.deleteBtnText, { color: colors.error }]}>
                {saving ? 'Aguarde...' : 'Excluir perfil'}
              </Text>
            </Pressable>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  cancelBtn: { minWidth: 64 },
  cancelBtnText: { color: '#FFFFFF', fontSize: 15, opacity: 0.85 },
  saveBtn: { minWidth: 64, alignItems: 'flex-end' },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  content: {
    padding: 20,
    gap: 8,
    paddingBottom: 48,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
  },
  avatarEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialLarge: {
    fontSize: 42,
    fontWeight: '700',
  },
  photoEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoEditIcon: { fontSize: 14 },
  photoHint: { fontSize: 12 },
  fieldHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    marginTop: 12,
    marginBottom: 4,
  },
  fieldHint: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 4,
  },
  colorDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
    transform: [{ scale: 1.15 }],
  },
  lgpdBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginTop: 16,
  },
  lgpdText: {
    fontSize: 12,
    lineHeight: 18,
  },
  deleteBtn: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
