<script setup lang="ts">
import SiteHeader from './components/SiteHeader.vue';
import HeroSection from './components/HeroSection.vue';
import HowItWorks from './components/HowItWorks.vue';
import FeaturesGrid from './components/FeaturesGrid.vue';
import InteractiveDemo from './components/InteractiveDemo.vue';
import PrivacySection from './components/PrivacySection.vue';
import InstallSection from './components/InstallSection.vue';
import FaqSection from './components/FaqSection.vue';
import SupportSection from './components/SupportSection.vue';
import SiteFooter from './components/SiteFooter.vue';
</script>

<template>
  <a href="#conteudo-principal" class="skip-link">Pular para o conteúdo principal</a>
  <SiteHeader />
  <main id="conteudo-principal">
    <HeroSection />
    <HowItWorks />
    <FeaturesGrid />
    <InteractiveDemo />
    <PrivacySection />
    <InstallSection />
    <FaqSection />
    <SupportSection />
  </main>
  <SiteFooter />
</template>
