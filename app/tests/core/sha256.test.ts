import { createHash, randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { sha256Hex } from '../../src/core/sha256';

describe('sha256Hex', () => {
  it('matches the published test vectors', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('matches node:crypto on random strings, including the padding boundaries (55, 56, 63, 64, 119, 120 bytes)', () => {
    const lengths = [0, 1, 54, 55, 56, 57, 63, 64, 65, 119, 120, 127, 128, 1000];
    for (const len of lengths) {
      for (let k = 0; k < 5; k++) {
        const text = randomBytes(len).toString('latin1');
        const expected = createHash('sha256').update(text, 'utf8').digest('hex');
        expect(sha256Hex(text), `length ${len}`).toBe(expected);
      }
    }
  });

  it('hashes multi-byte UTF-8 the same way node does', () => {
    const text = 'Café — 12 gal @ $3.809 ✓ 🚐';
    expect(sha256Hex(text)).toBe(createHash('sha256').update(text, 'utf8').digest('hex'));
  });

  it('matches node:crypto on many random strings', () => {
    for (let i = 0; i < 300; i++) {
      const text = randomBytes(Math.floor(Math.random() * 300)).toString('utf8');
      expect(sha256Hex(text)).toBe(createHash('sha256').update(text, 'utf8').digest('hex'));
    }
  });
});
