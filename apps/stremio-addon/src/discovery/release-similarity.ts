const SOURCE_BUCKETS: ReadonlyArray<readonly string[]> = [
  ['bluray', 'bdrip', 'brrip', 'bdremux', 'uhd.bluray'],
  ['webrip', 'web-dl', 'webdl', 'web'],
  ['hdtv', 'pdtv', 'dsr'],
  ['dvdrip', 'dvd'],
  ['hdrip', 'hc', 'hdcam', 'cam', 'ts'],
];

const STREAMING_SERVICES = ['amzn', 'nf', 'dsnp', 'atvp', 'hmax', 'max', 'pcok', 'hulu', 'cr'];
const EDITION_TAGS = ['extended', 'unrated', 'directors', 'director', 'remastered', 'imax', 'proper', 'repack'];
const RESOLUTIONS = ['2160p', '4k', '1080p', '720p', '480p'];

function tokenizeRelease(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  const cleaned = raw
    .toLowerCase()
    .replace(/\.(srt|vtt|ass|ssa|sub|mkv|mp4|avi)$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  if (!cleaned) return new Set();
  return new Set(cleaned.split(/\s+/).filter((t) => t.length >= 2));
}

function extractReleaseGroup(raw: string | undefined): string | null {
  if (!raw) return null;
  const stripped = raw.replace(/\.(srt|vtt|ass|ssa|sub|mkv|mp4|avi)$/i, '');
  const m = /-([a-zA-Z0-9]{2,14})(?:\[.*\])?$/.exec(stripped);
  return m?.[1] ? m[1].toLowerCase() : null;
}

function findSourceBucket(tokens: Set<string>, rawLower: string): number {
  if (rawLower.includes('web-dl') || rawLower.includes('webdl') || rawLower.includes('webrip')) {
    return 1;
  }
  for (let i = 0; i < SOURCE_BUCKETS.length; i += 1) {
    const bucket = SOURCE_BUCKETS[i];
    if (bucket && bucket.some((tag) => tokens.has(tag))) {
      return i;
    }
  }
  return -1;
}

/**
 * Computes a release-alignment score (`-30` to `+80`) between the playing video filename
 * and a candidate subtitle release/filename so WEBRip never accidentally pairs with an
 * unaligned BluRay or Extended cut when a matching release is available.
 */
export function computeReleaseSimilarity(
  videoFilename: string | undefined,
  candidateRelease: string | undefined,
): number {
  if (!videoFilename || !candidateRelease) {
    return 0;
  }

  const vLower = videoFilename.toLowerCase();
  const cLower = candidateRelease.toLowerCase();
  const vTokens = tokenizeRelease(videoFilename);
  const cTokens = tokenizeRelease(candidateRelease);
  if (vTokens.size === 0 || cTokens.size === 0) {
    return 0;
  }

  let score = 0;

  // 1. Source type match (BluRay vs WEB-DL/WEBRip vs HDTV — biggest timing difference!)
  const vBucket = findSourceBucket(vTokens, vLower);
  const cBucket = findSourceBucket(cTokens, cLower);
  if (vBucket !== -1 && cBucket !== -1) {
    if (vBucket === cBucket) {
      score += 30;
    } else {
      score -= 20;
    }
  }

  // 2. Edition match / mismatch (Extended / Director's Cut vs Theatrical!)
  for (const ed of EDITION_TAGS) {
    const vHas = vTokens.has(ed);
    const cHas = cTokens.has(ed);
    if (vHas && cHas) score += 25;
    else if (vHas !== cHas) score -= 25;
  }

  // 3. Streaming network match (AMZN vs NF have different intro bumpers!)
  for (const svc of STREAMING_SERVICES) {
    if (vTokens.has(svc) && cTokens.has(svc)) {
      score += 18;
    }
  }

  // 4. Exact release group match (-NTb, -FLUX, -YTS, -RARBG, etc.)
  const vGroup = extractReleaseGroup(videoFilename);
  const cGroup = extractReleaseGroup(candidateRelease);
  if (vGroup && cGroup && vGroup === cGroup) {
    score += 25;
  }

  // 5. Resolution + general token overlap
  for (const res of RESOLUTIONS) {
    if (vTokens.has(res) && cTokens.has(res)) {
      score += 5;
    }
  }

  let shared = 0;
  for (const tok of vTokens) {
    if (cTokens.has(tok)) shared += 1;
  }
  score += Math.min(shared * 2, 14);

  return Math.max(-30, Math.min(80, score));
}
