/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GITHUB_SPONSORS_URL?: string;
  readonly VITE_KOFI_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
