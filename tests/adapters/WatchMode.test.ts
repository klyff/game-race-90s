import { describe, expect, it } from 'vitest';
import { watchCarFromSearch } from '../../src/adapters/progress/WatchMode.ts';

describe('watchCarFromSearch', () => {
  it('reads ?car=', () => {
    expect(watchCarFromSearch('?watch=1&car=nogo-99')).toBe('nogo-99');
  });

  it('reads ?watchPinCar= as an alias', () => {
    expect(watchCarFromSearch('?watch=1&watchPinCar=nogo-98')).toBe('nogo-98');
  });
});
