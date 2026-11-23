// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@subtitleme/shared-types';
import { createShadowSubtitleRenderer } from '@subtitleme/subtitle-renderer';

describe('Subtitle Renderer — Shadow DOM safe overlay', () => {
  it('mounts inside Shadow DOM, prevents duplicate mounts, renders both lines, and cleans up', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const renderer = createShadowSubtitleRenderer({ playerId: 'test-player' });
    renderer.mount(container);
    renderer.mount(container); // duplicate mount should be a no-op

    expect(renderer.isMounted()).toBe(true);
    expect(container.querySelectorAll('[data-subtitleme-overlay]')).toHaveLength(1);

    const host = renderer.getHostElement();
    expect(host?.shadowRoot).not.toBeNull();

    renderer.render(
      {
        primary: { id: '1', start: 0, end: 2000, text: 'Hello world' },
        secondary: { id: '2', start: 0, end: 2000, text: 'Olá mundo' },
      },
      {
        appearance: DEFAULT_SETTINGS.appearance,
        order: 'primary-top',
        visible: true,
      },
    );

    const primaryEl = host?.shadowRoot?.querySelector('[data-slot="primary"]') as HTMLElement;
    const secondaryEl = host?.shadowRoot?.querySelector('[data-slot="secondary"]') as HTMLElement;
    const boxEl = host?.shadowRoot?.querySelector('.sm-box') as HTMLElement;

    expect(primaryEl.textContent).toBe('Hello world');
    expect(secondaryEl.textContent).toBe('Olá mundo');
    expect(boxEl.classList.contains('sm-hidden')).toBe(false);
    expect(boxEl.getAttribute('data-order')).toBe('primary-top');

    // Update style & stacking order & hide secondary
    renderer.render(
      {
        primary: { id: '1', start: 0, end: 2000, text: 'Hello world' },
        secondary: { id: '2', start: 0, end: 2000, text: 'Olá mundo' },
      },
      {
        appearance: { ...DEFAULT_SETTINGS.appearance, fontSize: 32, position: 'top' },
        order: 'secondary-top',
        visible: true,
        primaryVisible: true,
        secondaryVisible: false,
      },
    );

    expect(primaryEl.style.fontSize).toBe('32px');
    expect(secondaryEl.classList.contains('sm-hidden')).toBe(true);
    expect(boxEl.getAttribute('data-order')).toBe('secondary-top');

    renderer.clear();
    expect(boxEl.classList.contains('sm-hidden')).toBe(true);

    renderer.unmount();
    expect(renderer.isMounted()).toBe(false);
    expect(container.querySelectorAll('[data-subtitleme-overlay]')).toHaveLength(0);
    container.remove();
  });

  it('renders untrusted HTML/script payloads strictly as inert textContent', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const renderer = createShadowSubtitleRenderer({ playerId: 'xss-test' });
    renderer.mount(container);

    const malicious = '<img src=x onerror=alert(1)><script>window.__xss = true</script>';
    renderer.render(
      {
        primary: { id: '1', start: 0, end: 2000, text: malicious },
        secondary: null,
      },
      {
        appearance: DEFAULT_SETTINGS.appearance,
        order: 'primary-top',
        visible: true,
      },
    );

    const primaryEl = renderer
      .getHostElement()
      ?.shadowRoot?.querySelector('[data-slot="primary"]') as HTMLElement;

    expect(primaryEl.textContent).toBe(malicious);
    expect(primaryEl.querySelectorAll('img, script')).toHaveLength(0);

    renderer.unmount();
    container.remove();
  });
});
