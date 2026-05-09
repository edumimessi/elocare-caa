import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, Settings } from '@/lib/settings-store';
import { speakWithElevenLabs, speakWithSystemTTS } from '@/lib/voice-service';
import { deleteAllData, exportUserData, getConsent } from '@/lib/lgpd';
import * as Sharing from 'expo-sharing';

type Mode = 'locked' | 'pin' | 'unlocked';

function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

export default function SettingsScreen() {
  const colors = useColors();
  const [mode, setMode] = useState<Mode>('locked');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  const handlePinSubmit = useCallback(() => {
    if (pinInput === settings.therapistPin) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMode('unlocked');
      setPinError(false);
      setPinInput('');
    } else {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setPinError(true);
      setPinInput('');
    }
  }, [pinInput, settings.therapistPin]);

  const handleSave = useCallback(async () => {
    if (!isValidPin(settings.therapistPin)) {
      Alert.alert('PIN invalido', 'Use um PIN numerico com 4 a 6 digitos.');
      return;
    }

    await saveSettings(settings);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [settings]);

  const handleTestVoice = useCallback(async () => {
    const text = `Ola, ${settings.patientName}! Bem-vindo ao EloCare.`;
    if (settings.useElevenLabs && settings.elevenLabsApiKey) {
      speakWithElevenLabs(text, settings.elevenLabsApiKey, settings.elevenLabsVoiceId);
    } else {
      speakWithSystemTTS(text);
    }
  }, [settings]);

  const handleLock = useCallback(() => {
    setMode('locked');
  }, []);

  const handleDeleteAllData = useCallback(() => {
    Alert.alert(
      'Apagar todos os dados',
      'Esta acao e irreversivel. Todos os perfis, historico de comunicacao, cache de voz e configuracoes serao apagados permanentemente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar tudo',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteAllData();
            if (result.success) {
              setSettings(DEFAULT_SETTINGS);
              setMode('locked');
              Alert.alert('Dados apagados', 'Todos os dados foram removidos com sucesso.');
            } else {
              Alert.alert('Erro', result.error ?? 'Falha ao apagar dados.');
            }
          },
        },
      ]
    );
  }, []);

  if (mode === 'locked') {
    return (
      <ScreenContainer containerClassName="bg-background">
        <View style={[styles.header, { backgroundColor: colors.primary }]}> 
          <Text style={styles.headerTitle}>Configuracoes</Text>
        </View>
        <View style={styles.lockedContainer}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={[styles.lockTitle, { color: colors.foreground }]}>Area do Terapeuta</Text>
          <Text style={[styles.lockSubtitle, { color: colors.muted }]}> 
            Esta area e protegida para evitar alteracoes acidentais.
          </Text>
          <Pressable
            onPress={() => setMode('pin')}
            style={({ pressed }) => [
              styles.unlockBtn,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.unlockBtnText}>Acessar com PIN</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  if (mode === 'pin') {
    return (
      <ScreenContainer containerClassName="bg-background">
        <View style={[styles.header, { backgroundColor: colors.primary }]}> 
          <Pressable onPress={() => setMode('locked')} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Voltar</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Digite o PIN</Text>
        </View>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.pinContainer}
        >
          <Text style={styles.pinIcon}>🔑</Text>
          <Text style={[styles.pinTitle, { color: colors.foreground }]}>PIN de Acesso</Text>
          <Text style={[styles.pinSubtitle, { color: colors.muted }]}>Informe o PIN configurado pelo terapeuta.</Text>
          <TextInput
            style={[
              styles.pinInput,
              {
                backgroundColor: colors.surface,
                borderColor: pinError ? colors.error : colors.border,
                color: colors.foreground,
              },
            ]}
            value={pinInput}
            onChangeText={(t) => {
              setPinInput(t);
              setPinError(false);
            }}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            placeholder="••••"
            placeholderTextColor={colors.muted}
            returnKeyType="done"
            onSubmitEditing={handlePinSubmit}
            autoFocus
          />
          {pinError && <Text style={[styles.pinError, { color: colors.error }]}>PIN incorreto. Tente novamente.</Text>}
          <Pressable
            onPress={handlePinSubmit}
            style={({ pressed }) => [
              styles.pinSubmitBtn,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.pinSubmitBtnText}>Confirmar</Text>
          </Pressable>
        </KeyboardAvoidingView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={[styles.header, { backgroundColor: colors.primary }]}> 
        <Text style={styles.headerTitle}>Configuracoes</Text>
        <Pressable onPress={handleLock} style={styles.lockBtn}>
          <Text style={styles.lockBtnText}>🔒</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Perfil do Paciente</Text>
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Nome do Paciente</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            value={settings.patientName}
            onChangeText={(v) => setSettings((s) => ({ ...s, patientName: v }))}
            placeholder="Nome do paciente"
            placeholderTextColor={colors.muted}
            returnKeyType="done"
          />
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Seguranca</Text>
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>PIN de Acesso (4-6 digitos)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            value={settings.therapistPin}
            onChangeText={(v) => setSettings((s) => ({ ...s, therapistPin: v.replace(/\D/g, '') }))}
            keyboardType="number-pad"
            maxLength={6}
            secureTextEntry
            placeholder="••••"
            placeholderTextColor={colors.muted}
            returnKeyType="done"
          />
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Configuracoes de Voz</Text>

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={[styles.switchLabel, { color: colors.foreground }]}>Usar ElevenLabs (Voz Natural)</Text>
              <Text style={[styles.switchDesc, { color: colors.muted }]}>Requer chave de API do ElevenLabs</Text>
            </View>
            <Switch
              value={settings.useElevenLabs}
              onValueChange={(v) => setSettings((s) => ({ ...s, useElevenLabs: v }))}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {settings.useElevenLabs && (
            <>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Chave de API do ElevenLabs</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                value={settings.elevenLabsApiKey}
                onChangeText={(v) => setSettings((s) => ({ ...s, elevenLabsApiKey: v }))}
                placeholder="sk_xxxxxxxxxxxxxxxx"
                placeholderTextColor={colors.muted}
                secureTextEntry
                autoCapitalize="none"
                returnKeyType="done"
              />

              <Text style={[styles.fieldLabel, { color: colors.muted }]}>ID da Voz (Voice ID)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                value={settings.elevenLabsVoiceId}
                onChangeText={(v) => setSettings((s) => ({ ...s, elevenLabsVoiceId: v }))}
                placeholder="21m00Tcm4TlvDq8ikWAM"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                returnKeyType="done"
              />
              <Text style={[styles.hint, { color: colors.muted }]}>Voz padrao: Rachel. Encontre outros IDs em elevenlabs.io.</Text>
            </>
          )}

          <Pressable
            onPress={handleTestVoice}
            style={({ pressed }) => [
              styles.testBtn,
              { backgroundColor: colors.warning },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.testBtnText}>Testar Voz</Text>
          </Pressable>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Privacidade e LGPD</Text>
          <Pressable
            onPress={async () => {
              const consent = await getConsent();
              Alert.alert(
                'Consentimento',
                consent?.accepted
                  ? `Consentimento registrado em ${new Date(consent.timestamp).toLocaleDateString('pt-BR')} por ${consent.responsibleName ?? 'nao informado'}.`
                  : 'Nenhum consentimento registrado.'
              );
            }}
            style={({ pressed }) => [styles.lgpdBtn, { borderColor: colors.border }, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.lgpdBtnText, { color: colors.foreground }]}>Ver registro de consentimento</Text>
          </Pressable>
          <Pressable
            onPress={async () => {
              const result = await exportUserData();
              if ('error' in result) {
                Alert.alert('Erro', result.error);
                return;
              }
              const canShare = await Sharing.isAvailableAsync();
              if (canShare) {
                await Sharing.shareAsync(result.fileUri, { mimeType: 'application/json', dialogTitle: 'Exportar dados EloCare' });
              } else {
                Alert.alert('Exportado', `Arquivo salvo em:\n${result.fileUri}`);
              }
            }}
            style={({ pressed }) => [styles.lgpdBtn, { borderColor: colors.border }, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.lgpdBtnText, { color: colors.foreground }]}>Exportar meus dados</Text>
          </Pressable>
          <Pressable
            onPress={handleDeleteAllData}
            style={({ pressed }) => [styles.lgpdBtn, { borderColor: '#EF4444' }, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.lgpdBtnText, { color: '#EF4444' }]}>Apagar todos os dados</Text>
          </Pressable>
          <Text style={[styles.lgpdInfo, { color: colors.muted }]}> 
            Dados de telemetria sao automaticamente apagados apos 90 dias. Conforme a LGPD (Lei 13.709/2018).
          </Text>
        </View>

        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: saved ? colors.success : colors.primary },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.saveBtnText}>{saved ? 'Salvo com sucesso!' : 'Salvar Configuracoes'}</Text>
        </Pressable>

        <Text style={[styles.version, { color: colors.muted }]}>EloCare CAA v1.0.0</Text>
      </ScrollView>
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  backBtn: {
    position: 'absolute',
    left: 16,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  lockBtn: {
    position: 'absolute',
    right: 16,
  },
  lockBtnText: {
    fontSize: 22,
  },
  lockedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  lockIcon: {
    fontSize: 72,
  },
  lockTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  lockSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  unlockBtn: {
    borderRadius: 30,
    paddingHorizontal: 32,
    paddingVertical: 16,
    marginTop: 8,
  },
  unlockBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  pinContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  pinIcon: {
    fontSize: 64,
  },
  pinTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  pinSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  pinInput: {
    width: 160,
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    marginTop: 8,
  },
  pinError: {
    fontSize: 14,
    fontWeight: '500',
  },
  pinSubmitBtn: {
    borderRadius: 30,
    paddingHorizontal: 40,
    paddingVertical: 14,
    marginTop: 8,
  },
  pinSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  section: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: -4,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    fontSize: 15,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  switchInfo: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  switchDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: -4,
  },
  testBtn: {
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  testBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  saveBtn: {
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 8,
  },
  lgpdBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  lgpdBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  lgpdInfo: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
});
