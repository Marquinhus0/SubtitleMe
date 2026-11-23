import type { ActiveCueSnapshot } from '@subtitleme/shared-types';
import {
  createShadowSubtitleRenderer,
  type RenderOptions,
  type SubtitleOverlayRenderer,
} from '@subtitleme/subtitle-renderer';
import type { PlayerAdapter } from './player-adapter';

/**
 * Manages the Shadow DOM subtitle overlay attached to an HTMLVideoElement,
 * including fullscreen subtree re-parenting and clean restoration on exit.
 */
export class OverlayManager {
  private readonly renderer: SubtitleOverlayRenderer;
  private video: HTMLVideoElement | null = null;
  private adapter: PlayerAdapter | null = null;
  private currentContainer: HTMLElement | null = null;
  private modifiedContainerPosition: { el: HTMLElement; previousInlinePosition: string } | null =
    null;
  private lastSnapshot: ActiveCueSnapshot | null = null;
  private lastRenderOptions: RenderOptions | null = null;

  private readonly onFullscreenChange = (): void => {
    this.reconcileMountContainer();
  };

  public constructor(playerId = 'default') {
    this.renderer = createShadowSubtitleRenderer({ playerId });
  }

  /**
   * Attaches the overlay to a video player via its PlayerAdapter and observes
   * fullscreen transitions so the overlay stays visible inside fullscreen subtrees.
   */
  public attachToVideo(video: HTMLVideoElement, adapter: PlayerAdapter): void {
    this.video = video;
    this.adapter = adapter;
    const doc = video.ownerDocument;
    doc.addEventListener('fullscreenchange', this.onFullscreenChange);
    this.reconcileMountContainer();
  }

  /**
   * Direct container mount helper preserved for standalone / test usage.
   */
  public mount(container: HTMLElement): void {
    this.mountIntoContainer(container);
  }

  public render(snapshot: ActiveCueSnapshot, options: RenderOptions): void {
    this.lastSnapshot = snapshot;
    this.lastRenderOptions = options;
    this.renderer.render(snapshot, options);
  }

  public clear(): void {
    this.lastSnapshot = null;
    this.renderer.clear();
  }

  public isMounted(): boolean {
    return this.renderer.isMounted();
  }

  public getMountedContainer(): HTMLElement | null {
    return this.currentContainer;
  }

  public getHostElement(): HTMLElement | null {
    return this.renderer.getHostElement();
  }

  /**
   * Resolves the correct mount container for normal and fullscreen states:
   * - If `fullscreenElement` is a container/wrapper enclosing `video`, mount
   *   directly inside `fullscreenElement` so the overlay is visible in fullscreen.
   * - If `fullscreenElement === video`, HTMLVideoElement cannot host child DOM
   *   overlays; keep mounted on the normal container without throwing.
   * - On fullscreen exit, restore the overlay to the normal player container.
   */
  public reconcileMountContainer(): void {
    if (!this.video || !this.adapter) return;
    const doc = this.video.ownerDocument;
    const fsEl = doc.fullscreenElement;

    let targetContainer: HTMLElement;
    if (fsEl instanceof HTMLElement && fsEl !== this.video && fsEl.contains(this.video)) {
      targetContainer = fsEl;
    } else {
      targetContainer = this.adapter.getOverlayContainer(this.video);
    }

    if (targetContainer !== this.currentContainer || !this.renderer.isMounted()) {
      try {
        this.mountIntoContainer(targetContainer);
      } catch {
        // Fallback to document.body if host container rejects Shadow DOM attachment
        if (doc.body && targetContainer !== doc.body) {
          try {
            this.mountIntoContainer(doc.body);
          } catch {
            return;
          }
        } else {
          return;
        }
      }
      if (this.lastSnapshot && this.lastRenderOptions) {
        this.renderer.render(this.lastSnapshot, this.lastRenderOptions);
      }
    }
  }

  private mountIntoContainer(container: HTMLElement): void {
    this.restoreModifiedPosition();

    // Ensure positioning context so absolute overlay aligns with the player container
    const view = container.ownerDocument.defaultView;
    if (view && typeof view.getComputedStyle === 'function') {
      const computed = view.getComputedStyle(container);
      if (computed.position === 'static') {
        this.modifiedContainerPosition = {
          el: container,
          previousInlinePosition: container.style.position,
        };
        container.style.position = 'relative';
      }
    }

    this.renderer.mount(container);
    this.currentContainer = container;
  }

  private restoreModifiedPosition(): void {
    if (this.modifiedContainerPosition) {
      this.modifiedContainerPosition.el.style.position =
        this.modifiedContainerPosition.previousInlinePosition;
      this.modifiedContainerPosition = null;
    }
  }

  public dispose(): void {
    if (this.video) {
      this.video.ownerDocument.removeEventListener('fullscreenchange', this.onFullscreenChange);
    }
    this.renderer.unmount();
    this.restoreModifiedPosition();
    this.video = null;
    this.adapter = null;
    this.currentContainer = null;
    this.lastSnapshot = null;
    this.lastRenderOptions = null;
  }
}
