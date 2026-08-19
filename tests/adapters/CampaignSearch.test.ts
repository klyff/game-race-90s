import { describe, expect, it } from 'vitest';
import { campaignTrackFromSearch } from '../../src/adapters/progress/CampaignSearch.ts';

describe('CampaignSearch', () => {
  it('reads world and pista from the query string', () => {
    expect(campaignTrackFromSearch('?world=3&pista=2')).toBe('bogmire-deep-2');
    expect(campaignTrackFromSearch('?mundo=3&circuit=2')).toBe('bogmire-deep-2');
    expect(campaignTrackFromSearch('?planet=1&tracknum=1')).toBe('thunder-basin');
  });

  it('returns undefined when campaign numbers are missing or invalid', () => {
    expect(campaignTrackFromSearch('?world=3')).toBeUndefined();
    expect(campaignTrackFromSearch('?pista=2')).toBeUndefined();
    expect(campaignTrackFromSearch('?world=99&pista=1')).toBeUndefined();
  });
});
