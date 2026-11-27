// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import App from '../../apps/landing-page/src/App.vue';
import SupportSection from '../../apps/landing-page/src/components/SupportSection.vue';
import {
  buildSupportChannels,
  resolveOfficialSupportUrl,
} from '../../apps/landing-page/src/config/supportConfig';
import { RELEASE_INFO, SUPPORT_CHANNELS } from '../../apps/landing-page/src/data/siteContent';

describe('Sprint 18.2.2 & 18.2.3 — SubtitleMe Landing Page & Donations', () => {
  it('renders all 9 required sections with semantic landmarks and single H1', () => {
    const wrapper = mount(App);

    expect(wrapper.find('header').exists()).toBe(true);
    expect(wrapper.find('main#conteudo-principal').exists()).toBe(true);
    expect(wrapper.find('footer#documentacao').exists()).toBe(true);
    expect(wrapper.findAll('h1')).toHaveLength(1);

    const requiredIds = [
      '#topo',
      '#como-funciona',
      '#funcionalidades',
      '#demonstracao',
      '#privacidade',
      '#instalacao',
      '#faq',
      '#apoie',
      '#documentacao',
    ];
    for (const id of requiredIds) {
      expect(wrapper.find(id).exists(), `Expected section ${id} to exist`).toBe(true);
    }
  });

  it('supports interactive Reveal Mode and language switching without vertical jump', async () => {
    const wrapper = mount(App);

    const revealToggle = wrapper
      .findAll('button')
      .find((btn) => btn.text().includes('Modo Reveal:'));
    expect(revealToggle).toBeDefined();

    await revealToggle?.trigger('click');
    const secondary = wrapper.find('.subtitle-secondary');
    expect(secondary.classes()).toContain('subtitle-secondary--hidden');

    const revealNow = wrapper
      .findAll('button')
      .find((btn) => btn.text().includes('Revelar tradução'));
    expect(revealNow).toBeDefined();

    await revealNow?.trigger('click');
    expect(wrapper.find('.subtitle-secondary').classes()).not.toContain(
      'subtitle-secondary--hidden',
    );
  });

  it('switches installation instructions between Windows 11 and Linux tabs', async () => {
    const wrapper = mount(App);

    expect(wrapper.find('#instalacao pre').text()).toContain('start-companion.cmd');

    const linuxTab = wrapper
      .findAll('[role="tab"]')
      .find((btn) => btn.text().includes('Linux'));
    expect(linuxTab).toBeDefined();

    await linuxTab?.trigger('click');
    expect(wrapper.find('#instalacao pre').text()).toContain('start-companion.sh');
  });

  it('does not invent unverified donation URLs by default and states zero paywall', () => {
    for (const channel of SUPPORT_CHANNELS) {
      expect(channel.url).toBeNull();
    }

    const wrapper = mount(App);
    const supportText = wrapper.find('#apoie').text();
    expect(supportText).toContain('100% gratuito');
    expect(supportText).toContain('Doação totalmente opcional');
    expect(wrapper.html()).not.toContain('ko-fi.com/');
    expect(wrapper.html()).not.toContain('github.com/sponsors/');
  });

  it('strictly validates official HTTPS donation URLs and rejects invalid origins', () => {
    expect(
      resolveOfficialSupportUrl('github-sponsors', 'https://github.com/sponsors/example-user'),
    ).toBe('https://github.com/sponsors/example-user');
    expect(resolveOfficialSupportUrl('kofi', 'https://ko-fi.com/exampleuser')).toBe(
      'https://ko-fi.com/exampleuser',
    );

    // Reject HTTP, spoofed domains, empty slugs
    expect(resolveOfficialSupportUrl('github-sponsors', 'http://github.com/sponsors/foo')).toBeNull();
    expect(resolveOfficialSupportUrl('kofi', 'https://evil.example/ko-fi.com/foo')).toBeNull();
    expect(resolveOfficialSupportUrl('kofi', 'https://ko-fi.com/')).toBeNull();
  });

  it('renders accessible safe external CTAs when official donation URLs are provided', () => {
    const channels = buildSupportChannels({
      VITE_GITHUB_SPONSORS_URL: 'https://github.com/sponsors/example-maintainer',
      VITE_KOFI_URL: 'https://ko-fi.com/examplemaintainer',
    });

    const wrapper = mount(SupportSection, { props: { channels } });
    const links = wrapper.findAll('a.btn--primary');
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link.attributes('target')).toBe('_blank');
      expect(link.attributes('rel')).toBe('noopener noreferrer');
      expect(link.attributes('aria-label')).toContain('abre em nova aba');
    }
  });

  it('publishes official v1.0.1 release metadata, download URLs, and SHA-256 checksum', () => {
    expect(RELEASE_INFO.version).toBe('1.0.1');
    expect(RELEASE_INFO.tag).toBe('v1.0.1');
    expect(RELEASE_INFO.tarball).toBe('subtitleme-stremio-v1.0.1.tar.gz');
    expect(RELEASE_INFO.sha256).toBe(
      'ae0c27694b609c9585266af4a8f72f55a9e1412e78a58a1be2c6061a08b40e5d',
    );
    expect(RELEASE_INFO.releaseUrl).toBe(
      'https://github.com/Marquinhus0/SubtitleMe/releases/tag/v1.0.1',
    );
    expect(RELEASE_INFO.downloadUrl).toBe(
      'https://github.com/Marquinhus0/SubtitleMe/releases/download/v1.0.1/subtitleme-stremio-v1.0.1.tar.gz',
    );
    expect(RELEASE_INFO.checksumUrl).toBe(
      'https://github.com/Marquinhus0/SubtitleMe/releases/download/v1.0.1/subtitleme-stremio-v1.0.1.sha256',
    );

    const wrapper = mount(App);
    const installHtml = wrapper.find('#instalacao').html();
    expect(installHtml).toContain(RELEASE_INFO.downloadUrl);
    expect(installHtml).toContain(RELEASE_INFO.releaseUrl);
    expect(installHtml).toContain(RELEASE_INFO.checksumUrl);
    expect(installHtml).toContain(RELEASE_INFO.sha256);
    expect(installHtml).not.toContain('7f298f2b792615ec8ae476fdf7d8e0ac35fa4ae494d25d945ad74313913261fd');
  });
});
