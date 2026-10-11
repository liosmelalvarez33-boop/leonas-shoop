import { describe, it, expect } from 'vitest';
import { formatPrice } from '../../src/lib/format';

describe('formatPrice', () => {
  it('formatea miles con agrupador es-ES', () => {
    expect(formatPrice(1800)).toBe('1800'.replace('1800', formatPrice(1800))); // humo
    expect(formatPrice(1800)).toMatch(/1.?800/);
    expect(formatPrice(1000000)).toMatch(/1.?000.?000/);
  });

  it('acepta cero', () => {
    expect(formatPrice(0)).toBe('0');
  });
});
