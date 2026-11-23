import { describe, expect, it } from 'vitest';
import type { SubtitleCue, SubtitleTrack } from '@subtitleme/shared-types';
import {
  PlayerSessionRegistry,
  buildCueIndex,
  createSubtitleMerger,
  createTrackManager,
  findActiveCues,
  mergeSubtitleTracks,
} from '@subtitleme/subtitle-core';
import { parseSubtitle } from '@subtitleme/subtitle-parser';

function makeTrack(
  id: string,
  language: string,
  cues: SubtitleCue[],
  offset = 0,
  enabled = true,
): SubtitleTrack {
  return {
    id,
    language,
    label: language,
    source: 'local',
    cues,
    offset,
    enabled,
  };
}

describe('Subtitle Core — CueIndex binary search', () => {
  const sampleCues: SubtitleCue[] = [
    { id: '1', start: 1000, end: 3000, text: 'First' },
    { id: '2', start: 3000, end: 5000, text: 'Adjacent' },
    { id: '3', start: 7000, end: 9000, text: 'Last' },
  ];
  const index = buildCueIndex(sampleCues);

  it('handles before first, first, middle, adjacent boundary, empty gap, last, and after last', () => {
    expect(findActiveCues(index, 0)).toEqual([]);
    expect(findActiveCues(index, 999)).toEqual([]);
    expect(findActiveCues(index, 1000).map((c) => c.id)).toEqual(['1']);
    expect(findActiveCues(index, 2999).map((c) => c.id)).toEqual(['1']);
    // Half-open [start, end): at 3000, cue 1 ended and cue 2 starts
    expect(findActiveCues(index, 3000).map((c) => c.id)).toEqual(['2']);
    expect(findActiveCues(index, 5000)).toEqual([]);
    expect(findActiveCues(index, 6000)).toEqual([]);
    expect(findActiveCues(index, 8999).map((c) => c.id)).toEqual(['3']);
    expect(findActiveCues(index, 9000)).toEqual([]);
    expect(findActiveCues(index, 20000)).toEqual([]);
  });

  it('returns all active cues for overlapping and nested intervals in chronological order', () => {
    const overlapping = buildCueIndex([
      { id: 'long', start: 1000, end: 10000, text: 'Background' },
      { id: 'short-a', start: 2000, end: 3000, text: 'Line A' },
      { id: 'short-b', start: 4000, end: 5000, text: 'Line B' },
    ]);

    expect(findActiveCues(overlapping, 2500).map((c) => c.id)).toEqual(['long', 'short-a']);
    // Even after short-b ended, long is still found via prefix-max pruning
    expect(findActiveCues(overlapping, 6500).map((c) => c.id)).toEqual(['long']);
  });

  it('handles empty tracks and performs fast O(log n) lookups on 10,000 cues', () => {
    expect(findActiveCues(buildCueIndex([]), 1000)).toEqual([]);

    const largeCues: SubtitleCue[] = [];
    for (let i = 0; i < 10_000; i += 1) {
      largeCues.push({
        id: String(i + 1),
        start: i * 2000,
        end: i * 2000 + 1500,
        text: `Cue ${i + 1}`,
      });
    }
    const largeIndex = buildCueIndex(largeCues);

    const start = performance.now();
    for (let q = 0; q < 2000; q += 1) {
      const target = q * 9500 + 500;
      const found = findActiveCues(largeIndex, target);
      if (target < 20_000_000) {
        expect(found.length).toBeLessThanOrEqual(1);
      }
    }
    const elapsedMs = performance.now() - start;
    expect(elapsedMs).toBeLessThan(200);
  });
});

describe('Subtitle Core — TrackManager', () => {
  it('registers, selects, updates, reorders, offsets, and removes tracks safely', () => {
    const manager = createTrackManager('player-1');
    const enTrack = makeTrack('en-1', 'en', [{ id: '1', start: 1000, end: 3000, text: 'Hello!' }]);
    const ptTrack = makeTrack('pt-1', 'pt-BR', [{ id: '1', start: 1000, end: 3000, text: 'Olá!' }]);

    manager.registerTrack(enTrack);
    manager.registerTrack(ptTrack);

    expect(manager.selectTrack('primary', 'missing-id')).toBe(false);
    expect(manager.selectTrack('primary', 'en-1')).toBe(true);
    expect(manager.selectTrack('secondary', 'pt-1')).toBe(true);

    // Independent timing offset: +500 ms delays secondary track to 1500..3500
    expect(manager.setTrackOffset('secondary', 500)).toBe(true);

    const at1200 = manager.getActiveCuesAt(1200);
    expect(at1200.primary?.text).toBe('Hello!');
    expect(at1200.secondary).toBeNull();

    const at2000 = manager.getActiveCuesAt(2000);
    expect(at2000.primary?.text).toBe('Hello!');
    expect(at2000.secondary?.text).toBe('Olá!');

    const at3200 = manager.getActiveCuesAt(3200);
    expect(at3200.primary).toBeNull();
    expect(at3200.secondary?.text).toBe('Olá!');

    // Disable secondary track
    manager.setTrackEnabled('secondary', false);
    expect(manager.getActiveCuesAt(2000).secondary).toBeNull();

    // Order management
    manager.setOrder('secondary-top');
    expect(manager.getOrder()).toBe('secondary-top');

    // Removing a selected track clears its slot
    expect(manager.removeTrack('en-1')).toBe(true);
    expect(manager.getSelectedTrack('primary')).toBeNull();
  });
});

describe('Subtitle Core — SubtitleMerger (Future Stremio Support)', () => {
  it('segments two overlapping independently timed tracks accurately', () => {
    const trackA = makeTrack('a', 'en', [{ id: '1', start: 1000, end: 4000, text: 'Hello!' }]);
    const trackB = makeTrack('b', 'pt-BR', [{ id: '1', start: 2000, end: 5000, text: 'Olá!' }]);

    const merged = mergeSubtitleTracks(trackA, trackB);
    expect(merged).toEqual([
      { id: '1', start: 1000, end: 2000, text: 'Hello!' },
      { id: '2', start: 2000, end: 4000, text: 'Hello!\nOlá!' },
      { id: '3', start: 4000, end: 5000, text: 'Olá!' },
    ]);
  });

  it('applies independent offsets, respects order, deduplicates identical text, and serializes valid VTT/SRT', () => {
    const trackA = makeTrack(
      'a',
      'en',
      [
        { id: '1', start: 1000, end: 3000, text: 'Line A\nSecond line' },
        { id: '2', start: 6000, end: 8000, text: 'Same text' },
      ],
      500, // shifted to 1500..3500 and 6500..8500
    );
    const trackB = makeTrack(
      'b',
      'pt-BR',
      [
        { id: '1', start: 1500, end: 3500, text: 'Linha B — São Paulo' },
        { id: '2', start: 6500, end: 8500, text: 'Same text' },
      ],
      0,
    );

    const merger = createSubtitleMerger();
    const merged = merger.merge(trackA, trackB, { order: 'secondary-top' });
    expect(merged).toEqual([
      { id: '1', start: 1500, end: 3500, text: 'Linha B — São Paulo\nLine A\nSecond line' },
      { id: '2', start: 6500, end: 8500, text: 'Same text' },
    ]);

    const vttString = merger.mergeToString(trackA, trackB, {
      outputFormat: 'vtt',
      order: 'secondary-top',
    });
    const reparsedVtt = parseSubtitle(vttString, 'vtt');
    expect(reparsedVtt.status).toBe('success');
    expect(reparsedVtt.cues).toHaveLength(2);
    expect(reparsedVtt.cues[0]?.text).toBe('Linha B — São Paulo\nLine A\nSecond line');

    const srtString = merger.mergeToString(trackA, trackB, { outputFormat: 'srt' });
    const reparsedSrt = parseSubtitle(srtString, 'srt');
    expect(reparsedSrt.status).toBe('success');
    expect(reparsedSrt.cues).toHaveLength(2);
  });
});

describe('Subtitle Core — PlayerSessionRegistry', () => {
  it('isolates multiple players and manages active player promotion & disposal', () => {
    const disposed: string[] = [];
    const registry = new PlayerSessionRegistry<{ playerId: string; dispose(): void }>();

    registry.register({ playerId: 'video-1', dispose: () => disposed.push('video-1') });
    registry.register({ playerId: 'video-2', dispose: () => disposed.push('video-2') });

    expect(registry.getActive()?.playerId).toBe('video-1');
    expect(registry.setActive('video-2')).toBe(true);
    expect(registry.getActive()?.playerId).toBe('video-2');

    expect(registry.remove('video-2')).toBe(true);
    expect(disposed).toEqual(['video-2']);
    expect(registry.getActive()?.playerId).toBe('video-1');

    registry.disposeAll();
    expect(disposed).toEqual(['video-2', 'video-1']);
    expect(registry.size()).toBe(0);
    expect(registry.getActive()).toBeNull();
  });
});
