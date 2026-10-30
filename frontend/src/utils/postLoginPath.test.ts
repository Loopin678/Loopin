import { describe, expect, it } from 'vitest';
import { getPostLoginPath, HOME_PATH } from './postLoginPath';

describe('getPostLoginPath', () => {
  it('returns to the page the user was opening', () => {
    expect(getPostLoginPath({ from: '/projects/42?tab=chat' })).toBe('/projects/42?tab=chat');
  });

  it.each([
    [undefined],
    [null],
    [{}],
    [{ from: 42 }],
    [{ from: 'https://evil.example' }],
    [{ from: '//evil.example/path' }],
    [{ from: 'projects' }],
  ])('falls back to Home for unsafe or missing targets (%j)', (state) => {
    expect(getPostLoginPath(state)).toBe(HOME_PATH);
  });
});
