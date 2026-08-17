import type { MarketItem } from '../types';
import { INITIAL_EVENTS } from '../data/initialEvents';

const STORAGE_KEY_VOTES = 'foresight_japan_user_votes';

export async function fetchAllMarkets(): Promise<MarketItem[]> {
  try {
    const response = await fetch(
      'https://gamma-api.polymarket.com/events?limit=20&active=true&closed=false&order=volume24hr&ascending=false'
    );
    
    if (!response.ok) {
      throw new Error(`API response not ok: ${response.status}`);
    }

    const remoteEvents = await response.json();
    
    const mergedList: MarketItem[] = INITIAL_EVENTS.map(initial => {
      const remote = remoteEvents.find((e: any) => 
        e.slug === initial.slug || (e.title && e.title.toLowerCase().includes(initial.slug.slice(0, 10)))
      );
      
      if (remote && remote.markets && remote.markets[0]) {
        const m = remote.markets[0];
        let probYes = initial.worldProbYes;
        if (m.outcomePrices) {
          try {
            const parsed = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices;
            if (Array.isArray(parsed) && parsed[0] !== undefined) {
              probYes = Math.round(parseFloat(parsed[0]) * 100);
            }
          } catch {}
        }

        return {
          ...initial,
          worldProbYes: probYes,
          worldProbNo: 100 - probYes,
          volume24hUsd: remote.volume24hr || initial.volume24hUsd,
          totalVolumeUsd: remote.volume || initial.totalVolumeUsd,
        };
      }
      return initial;
    });

    return mergedList;
  } catch (error) {
    console.warn('Using enriched fallback dataset due to API/CORS:', error);
    return INITIAL_EVENTS;
  }
}

export function getSavedUserVotes(): Record<string, 'YES' | 'NO'> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VOTES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveUserVote(marketId: string, choice: 'YES' | 'NO'): void {
  try {
    const current = getSavedUserVotes();
    current[marketId] = choice;
    localStorage.setItem(STORAGE_KEY_VOTES, JSON.stringify(current));
  } catch (e) {
    console.error('Failed to save vote', e);
  }
}
