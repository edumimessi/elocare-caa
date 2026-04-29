// ─────────────────────────────────────────────
// app/consent.tsx
// Tela de Consentimento LGPD — Art. 11 + Art. 14
// Exibida no primeiro uso antes de criar perfis
// ─────────────────────────────────────────────
import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { grantConsent } from '@/lib/lgpd';

export default function ConsentScreen() {
  const colors = useColors();
  const router = useRouter();
  const [responsibleName, setResponsibleName] = useState('');
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleAccept() {
    if (!checked) {
      Alert.alert('Atenção', 'Você precisa marcar a caixa de concordância para continuar.');
      return;
    }
    if (!responsibleName.trim()) {
      Alert.alert('Atenção', 'Por favor, informe o nome do responsável legal.');
      return;
    }
    setLoading(true);
    await grantConsent(responsibleName.trim());
    setLoading(false);
    router.replace('/(tabs)');
  }

  return (
    <ScreenContainer className="px-5 py-4">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Termos de Uso e Privacidade
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            EloCare CAA — Versão 1.0
          </Text>
        </View>

        {/* Aviso legal */}
        <View style={[styles.alertBox, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
          <Text style={[styles.alertText, { color: '#92400E' }]}>
            Este aplicativo coleta e armazena dados de saúde de crianças. Conforme a Lei Geral de
            Proteção de Dados (LGPD — Lei 13.709/2018), o consentimento do responsável legal é
            obrigatório antes do uso.
          </Text>
        </View>

        {/* Seções da política */}
        <Section
          title="1. Quais dados coletamos"
          colors={colors}
          text="Coletamos: nome e foto do perfil do paciente, registros de comunicação (cartões tocados e frases formadas), horários de uso e dados de progresso clínico. Não coletamos dados de localização, contatos ou qualquer outra informação do dispositivo."
        />

        <Section
          title="2. Para que usamos os dados"
          colors={colors}
          text="Os dados são usados exclusivamente para: gerar relatórios de progresso para o terapeuta responsável, personalizar a experiência de comunicação do paciente e melhorar o funcionamento do aplicativo. Os dados nunca são vendidos ou compartilhados com terceiros."
        />

        <Section
          title="3. Onde os dados ficam armazenados"
          colors={colors}
          text="Todos os dados ficam armazenados localmente no dispositivo. Nenhuma informação é enviada para servidores externos, exceto o texto dos cartões que é enviado à API do ElevenLabs para geração de áudio (sem identificação do paciente)."
        />

        <Section
          title="4. Por quanto tempo guardamos os dados"
          colors={colors}
          text="Dados de telemetria (registros de uso) são automaticamente apagados após 90 dias. Perfis e cartões personalizados ficam armazenados até que o responsável solicite a exclusão."
        />

        <Section
          title="5. Seus direitos (Art. 18 da LGPD)"
          colors={colors}
          text="Você tem direito a: acessar todos os dados coletados, corrigir dados incorretos, apagar todos os dados a qualquer momento (Configurações → Apagar todos os dados), exportar seus dados em formato legível e revogar este consentimento."
        />

        <Section
          title="6. Proteção de dados de crianças (Art. 14)"
          colors={colors}
          text="Por se tratar de dados de crianças e adolescentes, o consentimento deve ser fornecido pelo responsável legal. O aplicativo não deve ser utilizado sem a supervisão e autorização de um adulto responsável."
        />

        {/* Campo do responsável */}
        <View style={styles.inputSection}>
          <Text style={[styles.inputLabel, { color: colors.foreground }]}>
            Nome do responsável legal *
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              },
            ]}
            placeholder="Ex: Ana Lima (mãe)"
            placeholderTextColor={colors.muted}
            value={responsibleName}
            onChangeText={setResponsibleName}
            returnKeyType="done"
          />
        </View>

        {/* Checkbox de concordância */}
        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => setChecked((v) => !v)}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.checkbox,
              {
                borderColor: checked ? '#2563EB' : colors.border,
                backgroundColor: checked ? '#2563EB' : 'transparent',
              },
            ]}
          >
            {checked && <Text style={styles.checkMark}>✓</Text>}
          </View>
          <Text style={[styles.checkLabel, { color: colors.foreground }]}>
            Li e concordo com os Termos de Uso e a Política de Privacidade do EloCare CAA. Declaro
            ser o responsável legal pelo paciente que utilizará este aplicativo.
          </Text>
        </TouchableOpacity>

        {/* Botão de aceite */}
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: checked ? '#2563EB' : colors.border,
              opacity: loading ? 0.7 : 1,
            },
          ]}
          onPress={handleAccept}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Aguarde...' : 'Aceitar e Continuar'}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.footer, { color: colors.muted }]}>
          Ao aceitar, um registro de consentimento com data, hora e nome do responsável será
          armazenado localmente no dispositivo conforme exigido pela LGPD.
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

function Section({
  title,
  text,
  colors,
}: {
  title: string;
  text: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.sectionText, { color: colors.muted }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 13 },
  alertBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  alertText: { fontSize: 13, lineHeight: 20 },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 6 },
  sectionText: { fontSize: 13, lineHeight: 20 },
  inputSection: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 24,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  checkLabel: { flex: 1, fontSize: 13, lineHeight: 20 },
  button: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer: { fontSize: 11, lineHeight: 17, textAlign: 'center' },
});
