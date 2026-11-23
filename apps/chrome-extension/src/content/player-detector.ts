export interface VideoRankingContext {
  fullscreenElement: Element | null;
  lastInteractionTimestamps: ReadonlyMap<HTMLVideoElement, number>;
  now: number;
  viewportWidth: number;
  viewportHeight: number;
}

export interface PlayerDetectorCallbacks {
  onVideoAdded(video: HTMLVideoElement): void;
  onVideoRemoved(video: HTMLVideoElement): void;
  onActiveCandidateChanged(video: HTMLVideoElement | null): void;
}

export interface PlayerDetectorOptions {
  root?: Document | HTMLElement;
  debounceMs?: number;
}

export function detectVideoElements(root: ParentNode = document): HTMLVideoElement[] {
  return Array.from(root.querySelectorAll('video'));
}

function isElementVisible(video: HTMLVideoElement): boolean {
  if (!video.isConnected) return false;
  if (video.hidden) return false;

  const view = video.ownerDocument.defaultView;
  if (view && typeof view.getComputedStyle === 'function') {
    const style = view.getComputedStyle(video);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
  }
  return true;
}

/**
 * Pure ranking function scoring candidate HTMLVideoElement instances so hidden
 * ads or tiny decorative thumbnails are deprioritized in favor of the main player.
 */
export function scoreVideoCandidate(
  video: HTMLVideoElement,
  context: VideoRankingContext,
): number {
  if (!video.isConnected) {
    return -10_000;
  }

  let score = 0;

  // Fullscreen priority
  if (
    context.fullscreenElement &&
    (context.fullscreenElement === video || context.fullscreenElement.contains(video))
  ) {
    score += 1000;
  }

  // Visibility check
  const visible = isElementVisible(video);
  if (!visible) {
    score -= 500;
  } else {
    score += 200;
  }

  // Rendered dimensions
  const rect = video.getBoundingClientRect();
  const width = rect.width || video.clientWidth || video.videoWidth;
  const height = rect.height || video.clientHeight || video.videoHeight;
  const area = width * height;

  if (width === 0 || height === 0) {
    score -= 300;
  } else if (width < 120 || height < 80) {
    // Likely tiny preview or ad widget
    score -= 200;
  } else {
    const areaRatio = Math.min(1, area / Math.max(1, context.viewportWidth * context.viewportHeight));
    score += Math.round(areaRatio * 200);
  }

  // Viewport intersection bonus
  if (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < context.viewportHeight &&
    rect.left < context.viewportWidth
  ) {
    score += 50;
  }

  // Active playback priority
  if (!video.paused && !video.ended) {
    score += 400;
  }

  // Recent user interaction boost (decays over 30 seconds)
  const interactedAt = context.lastInteractionTimestamps.get(video);
  if (interactedAt !== undefined) {
    const ageMs = Math.max(0, context.now - interactedAt);
    if (ageMs < 30_000) {
      score += Math.round(150 * (1 - ageMs / 30_000));
    }
  }

  return score;
}

/**
 * Dynamically detects HTMLVideoElement additions/removals using a debounced
 * MutationObserver, tracks interaction & playback events, and ranks candidates.
 */
export class PlayerDetector {
  private readonly root: Document | HTMLElement;
  private readonly debounceMs: number;
  private readonly callbacks: PlayerDetectorCallbacks;

  private readonly videos = new Set<HTMLVideoElement>();
  private readonly interactionTimestamps = new Map<HTMLVideoElement, number>();
  private readonly videoListeners = new Map<HTMLVideoElement, () => void>();

  private observer: MutationObserver | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private activeCandidate: HTMLVideoElement | null = null;
  private disposed = false;

  private readonly onFullscreenChange = (): void => {
    this.evaluateRanking();
  };

  public constructor(callbacks: PlayerDetectorCallbacks, options: PlayerDetectorOptions = {}) {
    this.root = options.root ?? document;
    this.debounceMs = options.debounceMs ?? 80;
    this.callbacks = callbacks;
  }

  private getDocument(): Document {
    return this.root.nodeType === 9
      ? (this.root as Document)
      : (this.root as HTMLElement).ownerDocument;
  }

  public start(): void {
    if (this.disposed) return;

    this.scanNow();

    const doc = this.getDocument();
    const targetNode =
      this.root.nodeType === 9 ? doc.documentElement ?? doc.body : (this.root as HTMLElement);

    if (targetNode && typeof MutationObserver !== 'undefined') {
      this.observer = new MutationObserver((mutations) => {
        if (this.mutationsMayAffectVideos(mutations)) {
          this.scheduleScan();
        }
      });
      this.observer.observe(targetNode, {
        childList: true,
        subtree: true,
      });
    }

    doc.addEventListener('fullscreenchange', this.onFullscreenChange);
  }

  public getVideos(): HTMLVideoElement[] {
    return Array.from(this.videos);
  }

  public getActiveCandidate(): HTMLVideoElement | null {
    return this.activeCandidate;
  }

  public scanNow(): void {
    if (this.disposed) return;

    const discovered = new Set(detectVideoElements(this.root));

    // Remove videos that are no longer in the DOM
    for (const existing of Array.from(this.videos)) {
      if (!discovered.has(existing) || !existing.isConnected) {
        this.untrackVideo(existing);
        this.callbacks.onVideoRemoved(existing);
      }
    }

    // Register newly discovered videos
    for (const video of discovered) {
      if (!this.videos.has(video)) {
        this.trackVideo(video);
        this.callbacks.onVideoAdded(video);
      }
    }

    this.evaluateRanking();
  }

  public evaluateRanking(): HTMLVideoElement | null {
    if (this.disposed) return null;

    const doc = this.getDocument();
    const view = doc.defaultView;
    const context: VideoRankingContext = {
      fullscreenElement: doc.fullscreenElement ?? null,
      lastInteractionTimestamps: this.interactionTimestamps,
      now: Date.now(),
      viewportWidth: view?.innerWidth || 1280,
      viewportHeight: view?.innerHeight || 720,
    };

    let bestVideo: HTMLVideoElement | null = null;
    let bestScore = -Infinity;

    for (const video of this.videos) {
      const score = scoreVideoCandidate(video, context);
      if (score > bestScore) {
        bestScore = score;
        bestVideo = video;
      }
    }

    if (bestVideo !== this.activeCandidate) {
      this.activeCandidate = bestVideo;
      this.callbacks.onActiveCandidateChanged(bestVideo);
    }

    return bestVideo;
  }

  private mutationsMayAffectVideos(mutations: MutationRecord[]): boolean {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (this.nodeContainsVideo(node)) return true;
      }
      for (const node of mutation.removedNodes) {
        if (this.nodeContainsVideo(node)) return true;
      }
    }
    return false;
  }

  private nodeContainsVideo(node: Node): boolean {
    if (node.nodeName === 'VIDEO') return true;
    if (node instanceof Element) {
      return node.querySelector('video') !== null;
    }
    return false;
  }

  private scheduleScan(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.scanNow();
    }, this.debounceMs);
  }

  private trackVideo(video: HTMLVideoElement): void {
    this.videos.add(video);

    const onPlayOrInteract = (): void => {
      this.interactionTimestamps.set(video, Date.now());
      this.evaluateRanking();
    };
    const onPause = (): void => {
      this.evaluateRanking();
    };

    video.addEventListener('play', onPlayOrInteract);
    video.addEventListener('pointerdown', onPlayOrInteract);
    video.addEventListener('click', onPlayOrInteract);
    video.addEventListener('pause', onPause);

    this.videoListeners.set(video, () => {
      video.removeEventListener('play', onPlayOrInteract);
      video.removeEventListener('pointerdown', onPlayOrInteract);
      video.removeEventListener('click', onPlayOrInteract);
      video.removeEventListener('pause', onPause);
    });
  }

  private untrackVideo(video: HTMLVideoElement): void {
    this.videos.delete(video);
    this.interactionTimestamps.delete(video);
    const cleanup = this.videoListeners.get(video);
    if (cleanup) {
      cleanup();
      this.videoListeners.delete(video);
    }
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    const doc = this.getDocument();
    doc.removeEventListener('fullscreenchange', this.onFullscreenChange);

    for (const video of Array.from(this.videos)) {
      this.untrackVideo(video);
    }
    this.activeCandidate = null;
  }
}
