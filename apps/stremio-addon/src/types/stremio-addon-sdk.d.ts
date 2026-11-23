declare module 'stremio-addon-sdk' {
  import type {
    StremioAddonInterface,
    StremioManifest,
    StremioRouterMiddleware,
    StremioSubtitlesRequest,
    StremioSubtitlesResponse,
  } from './stremio';

  export class addonBuilder {
    constructor(manifest: StremioManifest);
    defineSubtitlesHandler(
      handler: (args: StremioSubtitlesRequest) => Promise<StremioSubtitlesResponse>,
    ): void;
    getInterface(): StremioAddonInterface;
  }

  export function getRouter(addonInterface: StremioAddonInterface): StremioRouterMiddleware;

  interface StremioAddonSdkModule {
    addonBuilder: typeof addonBuilder;
    getRouter: typeof getRouter;
  }

  const stremioSdk: StremioAddonSdkModule;
  export default stremioSdk;
}
