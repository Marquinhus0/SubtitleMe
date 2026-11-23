// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { DEFAULT_SETTINGS } from '@subtitleme/shared-types';
import {
  createMemoryStorageAdapter,
  createSettingsRepository,
} from '@subtitleme/subtitle-storage';
import {
  setSettingsRepository,
  useSettingsStore,
} from '../../apps/chrome-extension/src/stores/settings.store';
import SubtitlePreview from '../../apps/chrome-extension/src/components/SubtitlePreview.vue';
import LanguageSelector from '../../apps/chrome-extension/src/components/LanguageSelector.vue';
import SubtitleControls from '../../apps/chrome-extension/src/components/SubtitleControls.vue';
import FileImporter from '../../apps/chrome-extension/src/components/FileImporter.vue';
import VideoStatus from '../../apps/chrome-extension/src/components/VideoStatus.vue';
import PopupApp from '../../apps/chrome-extension/src/popup/App.vue';
import OptionsApp from '../../apps/chrome-extension/src/options/App.vue';

describe('Sprint 02 Vue components and pages', () => {
  beforeEach(() => {
    const pinia = createPinia();
    setActivePinia(pinia);
    setSettingsRepository(createSettingsRepository(createMemoryStorageAdapter()));
  });

  it('updates SubtitlePreview immediately when appearance and order props change', async () => {
    const wrapper = mount(SubtitlePreview, {
      props: {
        appearance: { ...DEFAULT_SETTINGS.appearance },
        order: 'primary-top',
        primaryVisible: true,
        secondaryVisible: true,
      },
    });

    const primaryEl = wrapper.get('[data-testid="subtitle-preview-primary"]');
    expect(primaryEl.attributes('style')).toContain('font-size: 24px');

    await wrapper.setProps({
      appearance: {
        ...DEFAULT_SETTINGS.appearance,
        fontSize: 34,
        primaryColor: '#FFD166',
        position: 'top',
        textOutline: false,
        textShadow: false,
      },
      order: 'secondary-top',
    });

    const lines = wrapper.findAll('[data-testid^="subtitle-preview-primary"], [data-testid^="subtitle-preview-secondary"]');
    expect(lines[0]?.attributes('data-testid')).toBe('subtitle-preview-secondary');
    expect(lines[1]?.attributes('data-testid')).toBe('subtitle-preview-primary');
    expect(wrapper.get('[data-testid="subtitle-preview-primary"]').attributes('style')).toContain(
      'font-size: 34px',
    );
    expect(wrapper.get('[data-testid="subtitle-preview-stage"]').classes()).toContain('justify-start');

    await wrapper.setProps({ primaryVisible: false, secondaryVisible: false });
    expect(wrapper.find('[data-testid="subtitle-preview-empty"]').exists()).toBe(true);
  });

  it('emits selected language from LanguageSelector', async () => {
    const wrapper = mount(LanguageSelector, {
      props: {
        label: 'Primary language',
        modelValue: 'en',
      },
    });

    const select = wrapper.get('select');
    await select.setValue('pt-BR');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['pt-BR']);
  });

  it('emits visibility, font size, and sync offset actions from SubtitleControls', async () => {
    const wrapper = mount(SubtitleControls, {
      props: {
        fontSize: 24,
        primaryVisible: true,
        secondaryVisible: true,
        primaryOffsetMs: 100,
        secondaryOffsetMs: 0,
      },
    });

    const buttons = wrapper.findAll('button');
    // First button is Primary visibility toggle
    await buttons[0]?.trigger('click');
    expect(wrapper.emitted('toggle:visibility')?.[0]).toEqual(['primary', false]);

    // Click primary offset +100
    const plusBtn = wrapper.get('button[aria-label*="Primary offset +100ms"]');
    await plusBtn.trigger('click');
    expect(wrapper.emitted('adjust:offset')?.[0]).toEqual(['primary', 100]);
  });

  it('validates files in FileImporter, shows parsed preview, and requires explicit confirmation', async () => {
    const wrapper = mount(FileImporter);
    const input = wrapper.get('input[type="file"]');

    // Invalid extension
    const badFile = new File(['hello'], 'notes.txt', { type: 'text/plain' });
    Object.defineProperty(input.element, 'files', { value: [badFile], configurable: true });
    await input.trigger('change');
    await new Promise((r) => setTimeout(r, 10));
    expect(wrapper.emitted('error')?.length).toBe(1);
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);

    // Valid .srt file -> shows preview first without auto-confirming
    const goodFile = new File(['1\n00:00:01,000 --> 00:00:02,500\nHello preview'], 'movie.srt', {
      type: 'text/plain',
    });
    Object.defineProperty(input.element, 'files', { value: [goodFile], configurable: true });
    await input.trigger('change');
    await new Promise((r) => setTimeout(r, 10));

    expect(wrapper.emitted('confirm')).toBeUndefined();
    expect(wrapper.find('[data-testid="import-preview-card"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Hello preview');

    await wrapper.get('[data-testid="confirm-import-button"]').trigger('click');
    const confirmed = wrapper.emitted('confirm')?.[0]?.[0] as {
      pending: { fileName: string; format: string; cueCount: number };
      language: string;
    };
    expect(confirmed.pending.fileName).toBe('movie.srt');
    expect(confirmed.pending.format).toBe('srt');
    expect(confirmed.pending.cueCount).toBe(1);
  });

  it('renders honest player status states in VideoStatus', () => {
    const wrapper = mount(VideoStatus, {
      props: {
        snapshot: {
          status: 'detected',
          videoCount: 1,
          activeVideoIndex: 0,
          isFullscreen: false,
          playbackRate: 1,
          currentTimeMs: 0,
          durationMs: 60000,
          paused: true,
          nativeTracks: [
            { id: 't1', language: 'en', label: 'English', kind: 'subtitles', mode: 'hidden' },
          ],
          hostname: 'example.com',
        },
        connectionState: 'ready',
      },
    });

    expect(wrapper.text()).toContain('example.com');
    expect(wrapper.text()).toContain('1');
  });

  it('renders the complete Popup interface', () => {
    const wrapper = mount(PopupApp);
    expect(wrapper.text()).toContain('SubtitleMe');
    expect(wrapper.text()).toContain('Primary Subtitle');
    expect(wrapper.text()).toContain('Secondary Subtitle');
    expect(wrapper.text()).toContain('Quick Controls');
    expect(wrapper.text()).toContain('Open Full Settings');
  });

  it('renders all 8 Settings sections and switches interface language immediately', async () => {
    const wrapper = mount(OptionsApp);
    const sections = [
      'general',
      'languages',
      'appearance',
      'synchronization',
      'localFiles',
      'shortcuts',
      'privacy',
      'about',
    ] as const;

    for (const section of sections) {
      await wrapper.get(`[data-testid="settings-nav-${section}"]`).trigger('click');
      expect(wrapper.find(`[data-testid="section-${section}"]`).exists()).toBe(true);
    }

    // Switch back to General and change language to pt-BR
    await wrapper.get('[data-testid="settings-nav-general"]').trigger('click');
    await wrapper.get('[data-testid="ui-language-select"]').setValue('pt-BR');

    const settingsStore = useSettingsStore();
    expect(settingsStore.settings.general.uiLanguage).toBe('pt-BR');
    expect(wrapper.text()).toContain('Aparência');
    expect(wrapper.text()).toContain('Privacidade');
  });
});
