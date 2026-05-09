export type CAACard = {
  id: string;
  label: string;
  emoji: string;
  color: string;
  categoryId: string;
  imageQuery?: string;
};

export type CAACategory = {
  id: string;
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  imageQuery?: string;
};

export const CATEGORIES: CAACategory[] = [
  { id: 'needs', label: 'Necessidades', emoji: '🙏', color: '#2563EB', bgColor: '#DBEAFE', imageQuery: 'child drinking water' },
  { id: 'feelings', label: 'Sentimentos', emoji: '❤️', color: '#DC2626', bgColor: '#FEE2E2', imageQuery: 'child emotions portrait' },
  { id: 'actions', label: 'Ações', emoji: '⚡', color: '#7C3AED', bgColor: '#EDE9FE', imageQuery: 'child playing activity' },
  { id: 'food', label: 'Alimentos', emoji: '🍎', color: '#16A34A', bgColor: '#DCFCE7', imageQuery: 'healthy kids food' },
  { id: 'objects', label: 'Objetos', emoji: '🧸', color: '#D97706', bgColor: '#FEF3C7', imageQuery: 'children toys objects' },
  { id: 'people', label: 'Pessoas', emoji: '👨‍👩‍👧', color: '#0891B2', bgColor: '#CFFAFE', imageQuery: 'family portrait' },
];

export const CARDS: CAACard[] = [
  // Necessidades
  { id: 'water', label: 'Água', emoji: '💧', color: '#2563EB', categoryId: 'needs', imageQuery: 'glass of water' },
  { id: 'food_need', label: 'Comida', emoji: '🍽️', color: '#2563EB', categoryId: 'needs', imageQuery: 'child eating meal' },
  { id: 'bathroom', label: 'Banheiro', emoji: '🚽', color: '#2563EB', categoryId: 'needs', imageQuery: 'bathroom sink toilet' },
  { id: 'sleep', label: 'Dormir', emoji: '😴', color: '#2563EB', categoryId: 'needs', imageQuery: 'child sleeping bed' },
  { id: 'help', label: 'Ajuda', emoji: '🆘', color: '#2563EB', categoryId: 'needs', imageQuery: 'helping hands child' },
  { id: 'pain', label: 'Dor', emoji: '🤕', color: '#2563EB', categoryId: 'needs', imageQuery: 'child holding stomach pain' },
  { id: 'medicine', label: 'Remédio', emoji: '💊', color: '#2563EB', categoryId: 'needs', imageQuery: 'medicine spoon bottle' },
  { id: 'hug', label: 'Abraço', emoji: '🤗', color: '#2563EB', categoryId: 'needs', imageQuery: 'parent child hug' },
  { id: 'rest', label: 'Descanso', emoji: '🛋️', color: '#2563EB', categoryId: 'needs', imageQuery: 'child resting sofa' },

  // Sentimentos
  { id: 'happy', label: 'Feliz', emoji: '😊', color: '#DC2626', categoryId: 'feelings', imageQuery: 'happy child smiling' },
  { id: 'sad', label: 'Triste', emoji: '😢', color: '#DC2626', categoryId: 'feelings', imageQuery: 'sad child face' },
  { id: 'angry', label: 'Bravo', emoji: '😠', color: '#DC2626', categoryId: 'feelings', imageQuery: 'angry child expression' },
  { id: 'scared', label: 'Com Medo', emoji: '😨', color: '#DC2626', categoryId: 'feelings', imageQuery: 'scared child expression' },
  { id: 'tired', label: 'Cansado', emoji: '😪', color: '#DC2626', categoryId: 'feelings', imageQuery: 'tired child' },
  { id: 'excited', label: 'Animado', emoji: '🤩', color: '#DC2626', categoryId: 'feelings', imageQuery: 'excited child smiling' },
  { id: 'calm', label: 'Calmo', emoji: '😌', color: '#DC2626', categoryId: 'feelings', imageQuery: 'calm child relaxed' },
  { id: 'sick', label: 'Doente', emoji: '🤒', color: '#DC2626', categoryId: 'feelings', imageQuery: 'sick child thermometer' },
  { id: 'love', label: 'Amor', emoji: '🥰', color: '#DC2626', categoryId: 'feelings', imageQuery: 'child heart love' },

  // Ações
  { id: 'want', label: 'Quero', emoji: '👉', color: '#7C3AED', categoryId: 'actions', imageQuery: 'child pointing hand' },
  { id: 'no', label: 'Não', emoji: '🚫', color: '#7C3AED', categoryId: 'actions', imageQuery: 'stop hand gesture' },
  { id: 'yes', label: 'Sim', emoji: '✅', color: '#7C3AED', categoryId: 'actions', imageQuery: 'thumbs up hand' },
  { id: 'go', label: 'Ir', emoji: '🚶', color: '#7C3AED', categoryId: 'actions', imageQuery: 'child walking' },
  { id: 'stop', label: 'Parar', emoji: '✋', color: '#7C3AED', categoryId: 'actions', imageQuery: 'stop hand' },
  { id: 'play', label: 'Brincar', emoji: '🎮', color: '#7C3AED', categoryId: 'actions', imageQuery: 'child playing toys' },
  { id: 'watch', label: 'Assistir', emoji: '📺', color: '#7C3AED', categoryId: 'actions', imageQuery: 'child watching television' },
  { id: 'listen', label: 'Ouvir', emoji: '🎵', color: '#7C3AED', categoryId: 'actions', imageQuery: 'child listening headphones' },
  { id: 'more', label: 'Mais', emoji: '➕', color: '#7C3AED', categoryId: 'actions', imageQuery: 'more hand gesture' },

  // Alimentos
  { id: 'apple', label: 'Maçã', emoji: '🍎', color: '#16A34A', categoryId: 'food', imageQuery: 'red apple fruit' },
  { id: 'bread', label: 'Pão', emoji: '🍞', color: '#16A34A', categoryId: 'food', imageQuery: 'bread loaf' },
  { id: 'milk', label: 'Leite', emoji: '🥛', color: '#16A34A', categoryId: 'food', imageQuery: 'glass of milk' },
  { id: 'rice', label: 'Arroz', emoji: '🍚', color: '#16A34A', categoryId: 'food', imageQuery: 'bowl of rice' },
  { id: 'juice', label: 'Suco', emoji: '🧃', color: '#16A34A', categoryId: 'food', imageQuery: 'orange juice glass' },
  { id: 'cookie', label: 'Biscoito', emoji: '🍪', color: '#16A34A', categoryId: 'food', imageQuery: 'cookies' },
  { id: 'banana', label: 'Banana', emoji: '🍌', color: '#16A34A', categoryId: 'food', imageQuery: 'banana fruit' },
  { id: 'chicken', label: 'Frango', emoji: '🍗', color: '#16A34A', categoryId: 'food', imageQuery: 'chicken food plate' },
  { id: 'yogurt', label: 'Iogurte', emoji: '🥣', color: '#16A34A', categoryId: 'food', imageQuery: 'yogurt bowl' },

  // Objetos
  { id: 'toy', label: 'Brinquedo', emoji: '🧸', color: '#D97706', categoryId: 'objects', imageQuery: 'children toy' },
  { id: 'tablet', label: 'Tablet', emoji: '📱', color: '#D97706', categoryId: 'objects', imageQuery: 'tablet device' },
  { id: 'book', label: 'Livro', emoji: '📚', color: '#D97706', categoryId: 'objects', imageQuery: 'child book' },
  { id: 'ball', label: 'Bola', emoji: '⚽', color: '#D97706', categoryId: 'objects', imageQuery: 'ball toy' },
  { id: 'blanket', label: 'Cobertor', emoji: '🛏️', color: '#D97706', categoryId: 'objects', imageQuery: 'blanket bed' },
  { id: 'headphone', label: 'Fone', emoji: '🎧', color: '#D97706', categoryId: 'objects', imageQuery: 'headphones' },
  { id: 'car', label: 'Carrinho', emoji: '🚗', color: '#D97706', categoryId: 'objects', imageQuery: 'toy car' },
  { id: 'pencil', label: 'Lápis', emoji: '✏️', color: '#D97706', categoryId: 'objects', imageQuery: 'pencil' },
  { id: 'backpack', label: 'Mochila', emoji: '🎒', color: '#D97706', categoryId: 'objects', imageQuery: 'school backpack' },

  // Pessoas
  { id: 'mom', label: 'Mamãe', emoji: '👩', color: '#0891B2', categoryId: 'people', imageQuery: 'mother portrait' },
  { id: 'dad', label: 'Papai', emoji: '👨', color: '#0891B2', categoryId: 'people', imageQuery: 'father portrait' },
  { id: 'grandma', label: 'Vovó', emoji: '👵', color: '#0891B2', categoryId: 'people', imageQuery: 'grandmother portrait' },
  { id: 'grandpa', label: 'Vovô', emoji: '👴', color: '#0891B2', categoryId: 'people', imageQuery: 'grandfather portrait' },
  { id: 'doctor', label: 'Médico', emoji: '👨‍⚕️', color: '#0891B2', categoryId: 'people', imageQuery: 'doctor portrait' },
  { id: 'teacher', label: 'Professor', emoji: '👩‍🏫', color: '#0891B2', categoryId: 'people', imageQuery: 'teacher classroom' },
  { id: 'friend', label: 'Amigo', emoji: '🧑', color: '#0891B2', categoryId: 'people', imageQuery: 'child friend smiling' },
  { id: 'therapist', label: 'Terapeuta', emoji: '🧑‍⚕️', color: '#0891B2', categoryId: 'people', imageQuery: 'therapist child session' },
  { id: 'sibling', label: 'Irmão/Irmã', emoji: '👧', color: '#0891B2', categoryId: 'people', imageQuery: 'siblings children' },
];

export function getCardsByCategory(categoryId: string): CAACard[] {
  return CARDS.filter((c) => c.categoryId === categoryId);
}

export function getPhotoUri(query: string, signature: string): string {
  const encodedQuery = encodeURIComponent(query);
  const encodedSignature = encodeURIComponent(signature);
  return `https://source.unsplash.com/featured/480x480/?${encodedQuery}&sig=${encodedSignature}`;
}
