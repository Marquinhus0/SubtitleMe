import type {
  ActiveCueSnapshot,
  SubtitleAppearanceSettings,
  SubtitleOrder,
} from '@subtitleme/shared-types';

export interface RenderOptions {
  appearance: SubtitleAppearanceSettings;
  order: SubtitleOrder;
  visible: boolean;
  primaryVisible?: boolean;
  secondaryVisible?: boolean;
}

export interface SubtitleOverlayRenderer {
  mount(container: HTMLElement): void;
  render(snapshot: ActiveCueSnapshot, options: RenderOptions): void;
  clear(): void;
  unmount(): void;
  isMounted(): boolean;
  getHostElement(): HTMLElement | null;
}

export interface ShadowRendererOptions {
  shadowMode?: ShadowRootMode;
  playerId?: string;
}

const OVERLAY_BASE_CSS = `
:host {
  position: absolute;
  inset: 0;
  z-index: 2147483640;
  pointer-events: none;
  overflow: hidden;
  display: block;
}

.sm-stage {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding: 5% 6%;
  box-sizing: border-box;
  pointer-events: none;
}

.sm-stage[data-position="top"] {
  justify-content: flex-start;
}

.sm-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25em;
  max-width: min(92%, 960px);
  padding: 0.35em 0.7em;
  border-radius: 6px;
  text-align: center;
  pointer-events: none;
  box-sizing: border-box;
}

.sm-box[data-order="secondary-top"] {
  flex-direction: column-reverse;
}

.sm-line {
  margin: 0;
  padding: 0;
  white-space: pre-line;
  word-break: break-word;
  font-weight: 500;
}

.sm-hidden {
  display: none !important;
}
`;

function computeTextShadow(appearance: SubtitleAppearanceSettings): string {
  const layers: string[] = [];
  if (appearance.textOutline) {
    layers.push(
      '-1px -1px 0 rgba(0, 0, 0, 0.94)',
      '1px -1px 0 rgba(0, 0, 0, 0.94)',
      '-1px 1px 0 rgba(0, 0, 0, 0.94)',
      '1px 1px 0 rgba(0, 0, 0, 0.94)',
    );
  }
  if (appearance.textShadow) {
    layers.push('0 2px 8px rgba(0, 0, 0, 0.85)');
  }
  return layers.length > 0 ? layers.join(', ') : 'none';
}

function buildStyleSignature(options: RenderOptions): string {
  const a = options.appearance;
  return [
    options.visible,
    options.primaryVisible ?? true,
    options.secondaryVisible ?? true,
    options.order,
    a.fontFamily,
    a.fontSize,
    a.primaryColor,
    a.secondaryColor,
    a.backgroundOpacity,
    a.textOutline,
    a.textShadow,
    a.position,
    a.lineSpacing,
  ].join('|');
}

/**
 * Shadow DOM dual-subtitle overlay renderer.
 * - Isolates extension styling from host page CSS via Shadow DOM.
 * - Renders strictly via `textContent` (never `innerHTML`) for XSS safety.
 * - Reuses DOM nodes and caches text/style signatures to avoid unnecessary updates.
 */
export function createShadowSubtitleRenderer(
  rendererOptions: ShadowRendererOptions = {},
): SubtitleOverlayRenderer {
  const shadowMode: ShadowRootMode = rendererOptions.shadowMode ?? 'open';
  const playerId = rendererOptions.playerId ?? 'default';

  let containerEl: HTMLElement | null = null;
  let hostEl: HTMLElement | null = null;
  let stageEl: HTMLElement | null = null;
  let boxEl: HTMLElement | null = null;
  let primaryEl: HTMLParagraphElement | null = null;
  let secondaryEl: HTMLParagraphElement | null = null;
  let resizeObserver: ResizeObserver | null = null;

  let lastPrimaryText = '';
  let lastSecondaryText = '';
  let lastStyleSignature = '';
  let lastBoxHidden = true;
  let scaleFactor = 1;

  const updateContainerMetrics = (): void => {
    if (!containerEl || !stageEl) return;
    const width = containerEl.clientWidth;
    if (width > 0) {
      // Gently adapt scale for very compact embedded players while keeping 1.0x on standard viewports
      scaleFactor = width < 480 ? Math.max(0.7, width / 480) : 1;
      stageEl.style.padding = width < 480 ? '4% 4%' : '5% 6%';
    }
  };

  const onFullscreenChange = (): void => {
    updateContainerMetrics();
  };

  function cleanupObservers(): void {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    }
  }

  return {
    mount(container: HTMLElement): void {
      // Prevent duplicate mount onto the same container
      if (hostEl && containerEl === container && hostEl.parentElement === container) {
        return;
      }

      // Clean up any previous mount cleanly
      if (hostEl) {
        this.unmount();
      }

      const doc = container.ownerDocument;
      const host = doc.createElement('div');
      host.setAttribute('data-subtitleme-overlay', playerId);
      host.setAttribute('aria-live', 'off');

      const shadow = host.attachShadow({ mode: shadowMode });

      const styleEl = doc.createElement('style');
      styleEl.textContent = OVERLAY_BASE_CSS;

      const stage = doc.createElement('div');
      stage.className = 'sm-stage';
      stage.setAttribute('data-position', 'bottom');

      const box = doc.createElement('div');
      box.className = 'sm-box sm-hidden';
      box.setAttribute('data-order', 'primary-top');

      const primary = doc.createElement('p');
      primary.className = 'sm-line sm-hidden';
      primary.setAttribute('data-slot', 'primary');

      const secondary = doc.createElement('p');
      secondary.className = 'sm-line sm-hidden';
      secondary.setAttribute('data-slot', 'secondary');

      box.appendChild(primary);
      box.appendChild(secondary);
      stage.appendChild(box);
      shadow.appendChild(styleEl);
      shadow.appendChild(stage);

      container.appendChild(host);

      containerEl = container;
      hostEl = host;
      stageEl = stage;
      boxEl = box;
      primaryEl = primary;
      secondaryEl = secondary;
      lastPrimaryText = '';
      lastSecondaryText = '';
      lastStyleSignature = '';
      lastBoxHidden = true;

      updateContainerMetrics();

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
          updateContainerMetrics();
        });
        resizeObserver.observe(container);
      }

      if (typeof document !== 'undefined') {
        document.addEventListener('fullscreenchange', onFullscreenChange);
      }
    },

    render(snapshot: ActiveCueSnapshot, options: RenderOptions): void {
      if (!stageEl || !boxEl || !primaryEl || !secondaryEl) {
        return;
      }

      const primaryVisible = options.visible && (options.primaryVisible ?? true);
      const secondaryVisible = options.visible && (options.secondaryVisible ?? true);

      const nextPrimaryText = primaryVisible && snapshot.primary ? snapshot.primary.text : '';
      const nextSecondaryText =
        secondaryVisible && snapshot.secondary ? snapshot.secondary.text : '';

      const styleSignature = `${buildStyleSignature(options)}|${scaleFactor.toFixed(2)}`;
      if (styleSignature !== lastStyleSignature) {
        lastStyleSignature = styleSignature;
        const { appearance } = options;
        const textShadow = computeTextShadow(appearance);
        const primarySizePx = Math.round(appearance.fontSize * scaleFactor);
        const secondarySizePx = Math.round(appearance.fontSize * 0.9 * scaleFactor);

        stageEl.setAttribute('data-position', appearance.position);
        boxEl.setAttribute('data-order', options.order);
        boxEl.style.backgroundColor = `rgba(11, 13, 18, ${appearance.backgroundOpacity})`;
        boxEl.style.fontFamily = appearance.fontFamily;
        boxEl.style.lineHeight = String(appearance.lineSpacing);

        primaryEl.style.color = appearance.primaryColor;
        primaryEl.style.fontSize = `${primarySizePx}px`;
        primaryEl.style.textShadow = textShadow;

        secondaryEl.style.color = appearance.secondaryColor;
        secondaryEl.style.fontSize = `${secondarySizePx}px`;
        secondaryEl.style.textShadow = textShadow;
      }

      if (nextPrimaryText !== lastPrimaryText) {
        lastPrimaryText = nextPrimaryText;
        primaryEl.textContent = nextPrimaryText;
        primaryEl.classList.toggle('sm-hidden', nextPrimaryText.length === 0);
      }

      if (nextSecondaryText !== lastSecondaryText) {
        lastSecondaryText = nextSecondaryText;
        secondaryEl.textContent = nextSecondaryText;
        secondaryEl.classList.toggle('sm-hidden', nextSecondaryText.length === 0);
      }

      const shouldHideBox = nextPrimaryText.length === 0 && nextSecondaryText.length === 0;
      if (shouldHideBox !== lastBoxHidden) {
        lastBoxHidden = shouldHideBox;
        boxEl.classList.toggle('sm-hidden', shouldHideBox);
      }
    },

    clear(): void {
      if (!boxEl || !primaryEl || !secondaryEl) return;
      if (lastPrimaryText !== '') {
        lastPrimaryText = '';
        primaryEl.textContent = '';
        primaryEl.classList.add('sm-hidden');
      }
      if (lastSecondaryText !== '') {
        lastSecondaryText = '';
        secondaryEl.textContent = '';
        secondaryEl.classList.add('sm-hidden');
      }
      if (!lastBoxHidden) {
        lastBoxHidden = true;
        boxEl.classList.add('sm-hidden');
      }
    },

    unmount(): void {
      cleanupObservers();
      if (hostEl && hostEl.parentElement) {
        hostEl.parentElement.removeChild(hostEl);
      }
      containerEl = null;
      hostEl = null;
      stageEl = null;
      boxEl = null;
      primaryEl = null;
      secondaryEl = null;
      lastPrimaryText = '';
      lastSecondaryText = '';
      lastStyleSignature = '';
      lastBoxHidden = true;
    },

    isMounted(): boolean {
      return hostEl !== null && hostEl.parentElement !== null;
    },

    getHostElement(): HTMLElement | null {
      return hostEl;
    },
  };
}
