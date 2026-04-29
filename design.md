# Design: App CAA — Comunicação Aumentativa e Alternativa

## Visão Geral
App mobile para crianças não-verbais com TEA. Interface ultra-simples, colorida, com alvos grandes e feedback sonoro via ElevenLabs. O design prioriza a criança como usuário primário, mas o terapeuta/responsável como configurador.

## Paleta de Cores
- **Primária:** Azul royal `#2563EB` — confiança, saúde, tecnologia
- **Secundária:** Âmbar `#F59E0B` — energia, atenção, acolhimento
- **Sucesso:** Verde `#22C55E` — reforço positivo
- **Background:** Branco `#FFFFFF` (modo claro) / Cinza escuro `#111827` (modo escuro)
- **Cards:** Azul muito claro `#EFF6FF` (claro) / Cinza `#1F2937` (escuro)

## Tipografia
- Fonte principal: System font (SF Pro no iOS, Roboto no Android)
- Tamanho mínimo de texto: 16px (acessibilidade)
- Ícones grandes: 60-80px nos cards de comunicação

## Telas do App

### 1. Splash / Onboarding
- Logo animado
- Seleção de perfil (Criança / Terapeuta / Responsável)

### 2. Home — Seleção de Prancha
- Grid de categorias (Necessidades, Sentimentos, Ações, Alimentos, Objetos, Pessoas)
- Cards grandes com ícone + texto
- Botão de frase em construção no topo

### 3. Prancha de Comunicação
- Grid 3x3 ou 4x4 de cards
- Cada card: imagem grande + texto abaixo
- Toque → voz natural (ElevenLabs) + animação de seleção
- Barra de frase no topo (acumula palavras selecionadas)
- Botão "Falar Frase" para vocalizar a frase completa
- Botão "Limpar" para resetar

### 4. Configurações (Modo Terapeuta)
- PIN de acesso para entrar no modo configuração
- Gerenciar categorias e cards
- Configurar voz (ElevenLabs)
- Gerenciar perfis de pacientes

### 5. Perfil do Paciente
- Nome, foto, configurações de voz
- Histórico de comunicações do dia

## Fluxo Principal
1. Criança abre o app → vê categorias coloridas
2. Toca em "Sentimentos" → vê grid com Feliz, Triste, Com Fome, etc.
3. Toca em "Com Fome" → ouve voz natural "Com Fome"
4. Pode acumular palavras → "Eu" + "Quero" + "Água" → toca "Falar" → ouve frase completa
5. Terapeuta acessa modo configuração via PIN para personalizar

## Princípios de UX
- Alvos mínimos de 80x80px (acessibilidade para crianças)
- Feedback visual imediato (escala + cor) ao tocar
- Feedback sonoro em todo toque (haptic + voz)
- Zero texto desnecessário na interface da criança
- Modo "Tela Cheia" para evitar saída acidental do app
