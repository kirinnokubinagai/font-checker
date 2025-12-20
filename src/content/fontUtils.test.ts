import { describe, expect, it, vi } from 'vitest';
import { getRenderedFont } from './fontUtils';

describe('getRenderedFont', () => {
  it('should return the first font if no canvas context is available', () => {
    // Mocking document.createElement('canvas') to return null or something that fails getContext
    const spy = vi.spyOn(document, 'createElement');
    spy.mockReturnValue({
        getContext: () => null
    } as any);

    const mockElement = {
        innerText: 'test',
    } as HTMLElement;
    
    // Mock window.getComputedStyle
    vi.stubGlobal('getComputedStyle', () => ({
        fontFamily: 'Arial, sans-serif'
    }));

    const result = getRenderedFont(mockElement);
    expect(result).toBe('Arial');
    spy.mockRestore();
  });

  it('should return "Unknown" if no font family is found', () => {
    vi.stubGlobal('getComputedStyle', () => ({
        fontFamily: ''
    }));
    const mockElement = { innerText: 'test' } as HTMLElement;
    expect(getRenderedFont(mockElement)).toBe('Unknown');
  });
});
