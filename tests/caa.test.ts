import { describe, it, expect } from 'vitest';
import { CATEGORIES, CARDS, getCardsByCategory, getPhotoUri } from '../lib/caa-data';

describe('CAA Data', () => {
  it('should have 6 categories', () => {
    expect(CATEGORIES).toHaveLength(6);
  });

  it('each category should have id, label, emoji, color, bgColor', () => {
    for (const cat of CATEGORIES) {
      expect(cat.id).toBeTruthy();
      expect(cat.label).toBeTruthy();
      expect(cat.emoji).toBeTruthy();
      expect(cat.color).toBeTruthy();
      expect(cat.bgColor).toBeTruthy();
    }
  });

  it('each category should have a photo query', () => {
    for (const cat of CATEGORIES) {
      expect(cat.imageQuery).toBeTruthy();
    }
  });

  it('should have at least 9 cards per category', () => {
    for (const cat of CATEGORIES) {
      const cards = getCardsByCategory(cat.id);
      expect(cards.length).toBeGreaterThanOrEqual(9);
    }
  });

  it('all cards should have required fields', () => {
    for (const card of CARDS) {
      expect(card.id).toBeTruthy();
      expect(card.label).toBeTruthy();
      expect(card.emoji).toBeTruthy();
      expect(card.color).toBeTruthy();
      expect(card.categoryId).toBeTruthy();
    }
  });

  it('all default cards should have photo cues', () => {
    for (const card of CARDS) {
      expect(card.imageQuery).toBeTruthy();
    }
  });

  it('getCardsByCategory should return only cards of that category', () => {
    const feelingCards = getCardsByCategory('feelings');
    for (const card of feelingCards) {
      expect(card.categoryId).toBe('feelings');
    }
  });

  it('all card categoryIds should match a valid category', () => {
    const categoryIds = new Set(CATEGORIES.map((c) => c.id));
    for (const card of CARDS) {
      expect(categoryIds.has(card.categoryId)).toBe(true);
    }
  });

  it('getPhotoUri should build a photo source url', () => {
    expect(getPhotoUri('glass of water', 'water')).toContain('source.unsplash.com');
    expect(getPhotoUri('glass of water', 'water')).toContain('glass%20of%20water');
  });
});
