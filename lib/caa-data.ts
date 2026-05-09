export type CAACard = {
  id: string;
  label: string;
  emoji: string;
  color: string;
  categoryId: string;
};

export type CAACategory = {
  id: string;
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
};

export const CATEGORIES: CAACategory[] = [
  { id: 'needs', label: 'Necessidades', emoji: '🙏', color: '#2563EB', bgColor: '#DBEAFE' },
  { id: 'feelings', label: 'Sentimentos', emoji: '❤️', color: '#DC2626', bgColor: '#FEE2E2' },
  { id: 'actions', label: 'Ações', emoji: '⚡', color: '#7C3AED', bgColor: '#EDE9FE' },
  { id: 'food', label: 'Alimentos', emoji: '🍎', color: '#16A34A', bgColor: '#DCFCE7' },
  { id: 'objects', label: 'Objetos', emoji: '🧸', color: '#D97706', bgColor: '#FEF3C7' },
  { id: 'people', label: 'Pessoas', emoji: '👨‍👩‍👧', color: '#0891B2', bgColor: '#CFFAFE' },
];

export const CARDS: CAACard[] = [
  // Necessidades
  { id: 'water', label: 'Água', emoji: '💧', color: '#2563EB', categoryId: 'needs' },
  { id: 'food_need', label: 'Comida', emoji: '🍽️', color: '#2563EB', categoryId: 'needs' },
  { id: 'bathroom', label: 'Banheiro', emoji: '🚽', color: '#2563EB', categoryId: 'needs' },
  { id: 'sleep', label: 'Dormir', emoji: '😴', color: '#2563EB', categoryId: 'needs' },
  { id: 'help', label: 'Ajuda', emoji: '🆘', color: '#2563EB', categoryId: 'needs' },
  { id: 'pain', label: 'Dor', emoji: '🤕', color: '#2563EB', categoryId: 'needs' },
  { id: 'medicine', label: 'Remédio', emoji: '💊', color: '#2563EB', categoryId: 'needs' },
  { id: 'hug', label: 'Abraço', emoji: '🤗', color: '#2563EB', categoryId: 'needs' },
  { id: 'rest', label: 'Descanso', emoji: '🛋️', color: '#2563EB', categoryId: 'needs' },

  // Sentimentos
  { id: 'happy', label: 'Feliz', emoji: '😊', color: '#DC2626', categoryId: 'feelings' },
  { id: 'sad', label: 'Triste', emoji: '😢', color: '#DC2626', categoryId: 'feelings' },
  { id: 'angry', label: 'Bravo', emoji: '😠', color: '#DC2626', categoryId: 'feelings' },
  { id: 'scared', label: 'Com Medo', emoji: '😨', color: '#DC2626', categoryId: 'feelings' },
  { id: 'tired', label: 'Cansado', emoji: '😪', color: '#DC2626', categoryId: 'feelings' },
  { id: 'excited', label: 'Animado', emoji: '🤩', color: '#DC2626', categoryId: 'feelings' },
  { id: 'calm', label: 'Calmo', emoji: '😌', color: '#DC2626', categoryId: 'feelings' },
  { id: 'sick', label: 'Doente', emoji: '🤒', color: '#DC2626', categoryId: 'feelings' },
  { id: 'love', label: 'Amor', emoji: '🥰', color: '#DC2626', categoryId: 'feelings' },

  // Ações
  { id: 'want', label: 'Quero', emoji: '👉', color: '#7C3AED', categoryId: 'actions' },
  { id: 'no', label: 'Não', emoji: '🚫', color: '#7C3AED', categoryId: 'actions' },
  { id: 'yes', label: 'Sim', emoji: '✅', color: '#7C3AED', categoryId: 'actions' },
  { id: 'go', label: 'Ir', emoji: '🚶', color: '#7C3AED', categoryId: 'actions' },
  { id: 'stop', label: 'Parar', emoji: '✋', color: '#7C3AED', categoryId: 'actions' },
  { id: 'play', label: 'Brincar', emoji: '🎮', color: '#7C3AED', categoryId: 'actions' },
  { id: 'watch', label: 'Assistir', emoji: '📺', color: '#7C3AED', categoryId: 'actions' },
  { id: 'listen', label: 'Ouvir', emoji: '🎵', color: '#7C3AED', categoryId: 'actions' },
  { id: 'more', label: 'Mais', emoji: '➕', color: '#7C3AED', categoryId: 'actions' },

  // Alimentos
  { id: 'apple', label: 'Maçã', emoji: '🍎', color: '#16A34A', categoryId: 'food' },
  { id: 'bread', label: 'Pão', emoji: '🍞', color: '#16A34A', categoryId: 'food' },
  { id: 'milk', label: 'Leite', emoji: '🥛', color: '#16A34A', categoryId: 'food' },
  { id: 'rice', label: 'Arroz', emoji: '🍚', color: '#16A34A', categoryId: 'food' },
  { id: 'juice', label: 'Suco', emoji: '🧃', color: '#16A34A', categoryId: 'food' },
  { id: 'cookie', label: 'Biscoito', emoji: '🍪', color: '#16A34A', categoryId: 'food' },
  { id: 'banana', label: 'Banana', emoji: '🍌', color: '#16A34A', categoryId: 'food' },
  { id: 'chicken', label: 'Frango', emoji: '🍗', color: '#16A34A', categoryId: 'food' },
  { id: 'yogurt', label: 'Iogurte', emoji: '🥣', color: '#16A34A', categoryId: 'food' },

  // Objetos
  { id: 'toy', label: 'Brinquedo', emoji: '🧸', color: '#D97706', categoryId: 'objects' },
  { id: 'tablet', label: 'Tablet', emoji: '📱', color: '#D97706', categoryId: 'objects' },
  { id: 'book', label: 'Livro', emoji: '📚', color: '#D97706', categoryId: 'objects' },
  { id: 'ball', label: 'Bola', emoji: '⚽', color: '#D97706', categoryId: 'objects' },
  { id: 'blanket', label: 'Cobertor', emoji: '🛏️', color: '#D97706', categoryId: 'objects' },
  { id: 'headphone', label: 'Fone', emoji: '🎧', color: '#D97706', categoryId: 'objects' },
  { id: 'car', label: 'Carrinho', emoji: '🚗', color: '#D97706', categoryId: 'objects' },
  { id: 'pencil', label: 'Lápis', emoji: '✏️', color: '#D97706', categoryId: 'objects' },
  { id: 'backpack', label: 'Mochila', emoji: '🎒', color: '#D97706', categoryId: 'objects' },

  // Pessoas
  { id: 'mom', label: 'Mamãe', emoji: '👩', color: '#0891B2', categoryId: 'people' },
  { id: 'dad', label: 'Papai', emoji: '👨', color: '#0891B2', categoryId: 'people' },
  { id: 'grandma', label: 'Vovó', emoji: '👵', color: '#0891B2', categoryId: 'people' },
  { id: 'grandpa', label: 'Vovô', emoji: '👴', color: '#0891B2', categoryId: 'people' },
  { id: 'doctor', label: 'Médico', emoji: '👨‍⚕️', color: '#0891B2', categoryId: 'people' },
  { id: 'teacher', label: 'Professor', emoji: '👩‍🏫', color: '#0891B2', categoryId: 'people' },
  { id: 'friend', label: 'Amigo', emoji: '🧑', color: '#0891B2', categoryId: 'people' },
  { id: 'therapist', label: 'Terapeuta', emoji: '🧑‍⚕️', color: '#0891B2', categoryId: 'people' },
  { id: 'sibling', label: 'Irmão/Irmã', emoji: '👧', color: '#0891B2', categoryId: 'people' },
];

export function getCardsByCategory(categoryId: string): CAACard[] {
  return CARDS.filter((c) => c.categoryId === categoryId);
}
