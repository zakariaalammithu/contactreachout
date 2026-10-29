import { describe, it, expect } from 'vitest';
import { normalizeHexColor } from '../src/lib/services/text-color.ts';

describe('normalizeHexColor', () => {
  it('accepts 6-digit hex with or without a leading #', () => {
    expect(normalizeHexColor('#FF0000')).toBe('#ff0000');
    expect(normalizeHexColor('FF0000')).toBe('#ff0000');
    expect(normalizeHexColor('#0e6de4')).toBe('#0e6de4');
  });

  it('expands 3-digit hex to 6 digits', () => {
    expect(normalizeHexColor('#F00')).toBe('#ff0000');
    expect(normalizeHexColor('0e6')).toBe('#00ee66');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeHexColor('  #FF0000  ')).toBe('#ff0000');
  });

  it('rejects named colors, wrong lengths and non-hex characters', () => {
    expect(normalizeHexColor('red')).toBeNull();
    expect(normalizeHexColor('#GGGGGG')).toBeNull();
    expect(normalizeHexColor('#12345')).toBeNull();
    expect(normalizeHexColor('#1234567')).toBeNull();
    expect(normalizeHexColor('')).toBeNull();
  });
});
