import {
  DEFAULT_SETTINGS,
  sanitizeSettings,
  type ActiveCueSnapshot,
  type AvailableTrackSummary,
  type ExtensionMessage,
  type ExtensionMessageResponse,
  type NativeTrackSummary,
  type PlayerStatusSnapshot,
  type SubtitleMeSettings,
  type SubtitleTrack,
} from '@subtitleme/shared-types';
import {
  PlayerSessionRegistry,
  createTrackManager,
  type DisposableSession,
  type TrackManager,
} from '@subtitleme/subtitle-core';
import { createMediaSyncController, type SyncController } from '@subtitleme/subtitle-sync';
import { Html5VideoAdapter, type PlayerAdapter } from './player-adapter';
import { PlayerDetector } from './player-detector';
import { NativeSubtitleObserver } from './subtitle-observer';
import { OverlayManager } from './overlay-manager';

export interface PlayerSession extends DisposableSession {
  readonly playerId: string;
  readonly video: HTMLVideoElement;
  readonly trackManager: TrackManager;
  readonly syncController: SyncController;
  readonly overlayManager: OverlayManager;
  readonly nativeObserver: NativeSubtitleObserver;
  readonly manualSelections: { primary: boolean; secondary: boolean };
  nativeSummaries: NativeTrackSummary[];
  lastSnapshot: ActiveCueSnapshot;
  renderCurrent(): void;
}

export interface PlayerLifecycleOptions {
  root?: Document | HTMLElement;
  adapter?: PlayerAdapter;
  initialSettings?: SubtitleMeSettings;
  debounceMs?: number;
}

const EMPTY_SNAPSHOT: ActiveCueSnapshot = { primary: null, secondary: null };

/**
 * Coordinates isolated per-video sessions across PlayerDetector,
 * PlayerSessionRegistry, NativeSubtitleObserver, TrackManager,
 * MediaSyncController, and OverlayManager.
 */
export class PlayerLifecycleManager {
  private readonly adapter: PlayerAdapter;
  private readonly registry = new PlayerSessionRegistry<PlayerSession>();
  private readonly videoToPlayerId = new WeakMap<HTMLVideoElement, string>();
  private readonly detector: PlayerDetector;

  private settings: SubtitleMeSettings;
  private localTracks: SubtitleTrack[] = [];
  private localPrimaryId: string | null = null;
  private localSecondaryId: string | null = null;
  private nextPlayerSeq = 1;
  private disposed = false;

  public constructor(options: PlayerLifecycleOptions = {}) {
    this.adapter = options.adapter ?? new Html5VideoAdapter();
    this.settings = sanitizeSettings(options.initialSettings ?? DEFAULT_SETTINGS);

    this.detector = new PlayerDetector(
      {
        onVideoAdded: (video) => this.registerVideo(video),
        onVideoRemoved: (video) => this.unregisterVideo(video),
        onActiveCandidateChanged: (video) => {
          if (!video) return;
          const id = this.videoToPlayerId.get(video);
          if (id) {
            this.registry.setActive(id);
          }
        },
      },
      {
        ...(options.root !== undefined ? { root: options.root } : {}),
        ...(options.debounceMs !== undefined ? { debounceMs: options.debounceMs } : {}),
      },
    );
  }

  public start(): void {
    if (this.disposed) return;
    this.detector.start();
  }

  public refresh(): void {
    if (this.disposed) return;
    this.detector.scanNow();
    for (const session of this.registry.list()) {
      session.nativeObserver.refresh();
      session.overlayManager.reconcileMountContainer();
      session.syncController.forceSync();
    }
  }

  public applySettings(nextSettings: SubtitleMeSettings): void {
    const prevPrimaryLang = this.settings.general.defaultPrimaryLanguage;
    const prevSecondaryLang = this.settings.general.defaultSecondaryLanguage;
    this.settings = sanitizeSettings(nextSettings);
    const languagesChanged =
      prevPrimaryLang !== this.settings.general.defaultPrimaryLanguage ||
      prevSecondaryLang !== this.settings.general.defaultSecondaryLanguage;

    for (const session of this.registry.list()) {
      if (languagesChanged) {
        this.autoSelectNativeTracksForSession(session, true);
      }
      this.applySettingsToSession(session);
    }
  }

  public syncLocalTracks(
    tracks: SubtitleTrack[],
    primaryTrackId: string | null,
    secondaryTrackId: string | null,
  ): void {
    this.localTracks = tracks.map((t) => ({ ...t, cues: [...t.cues] }));
    this.localPrimaryId = primaryTrackId;
    this.localSecondaryId = secondaryTrackId;

    for (const session of this.registry.list()) {
      this.applyLocalTracksToSession(session);
    }
  }

  public getActiveSession(): PlayerSession | null {
    return this.registry.getActive();
  }

  public getSessionById(playerId: string): PlayerSession | undefined {
    return this.registry.get(playerId);
  }

  public listSessions(): PlayerSession[] {
    return this.registry.list();
  }

  public registerVideo(video: HTMLVideoElement): PlayerSession | null {
    if (this.disposed || !this.adapter.matches(video)) return null;

    const existingId = this.videoToPlayerId.get(video);
    if (existingId) {
      return this.registry.get(existingId) ?? null;
    }

    const playerId = `player-${this.nextPlayerSeq++}`;
    const trackManager = createTrackManager(playerId);
    const overlayManager = new OverlayManager(playerId);
    const syncController = createMediaSyncController(video, trackManager);

    const renderSessionSnapshot = (session: PlayerSession, snapshot: ActiveCueSnapshot): void => {
      session.lastSnapshot = snapshot;
      session.overlayManager.render(snapshot, {
        appearance: this.settings.appearance,
        order: session.trackManager.getOrder(),
        visible: this.settings.general.enabled,
        primaryVisible: this.settings.general.primaryEnabled,
        secondaryVisible: this.settings.general.secondaryEnabled,
      });
    };

    const onSourceChange = (): void => {
      session.nativeObserver.refresh();
      session.syncController.forceSync();
    };

    const nativeObserver = new NativeSubtitleObserver(
      video,
      this.adapter,
      playerId,
      (update) => {
        session.nativeSummaries = update.summaries;
        this.applyNativeTracksToSession(session, update.tracks);
      },
      { suppressNativeShowing: this.settings.general.enabled },
    );

    const session: PlayerSession = {
      playerId,
      video,
      trackManager,
      syncController,
      overlayManager,
      nativeObserver,
      manualSelections: { primary: false, secondary: false },
      nativeSummaries: [],
      lastSnapshot: EMPTY_SNAPSHOT,
      renderCurrent: () => {
        renderSessionSnapshot(session, session.lastSnapshot);
      },
      dispose: () => {
        video.removeEventListener('emptied', onSourceChange);
        video.removeEventListener('loadedmetadata', onSourceChange);
        nativeObserver.dispose();
        syncController.dispose();
        overlayManager.dispose();
        trackManager.clear();
      },
    };

    video.addEventListener('emptied', onSourceChange);
    video.addEventListener('loadedmetadata', onSourceChange);

    syncController.subscribe((snapshot) => {
      renderSessionSnapshot(session, snapshot);
    });

    this.videoToPlayerId.set(video, playerId);
    this.registry.register(session);

    overlayManager.attachToVideo(video, this.adapter);
    this.applySettingsToSession(session);
    this.applyLocalTracksToSession(session);
    nativeObserver.start();
    syncController.start();

    return session;
  }

  public unregisterVideo(video: HTMLVideoElement): boolean {
    const playerId = this.videoToPlayerId.get(video);
    if (!playerId) return false;
    this.videoToPlayerId.delete(video);
    return this.registry.remove(playerId);
  }

  public getPlayerStatusSnapshot(targetPlayerId?: string): PlayerStatusSnapshot {
    const sessions = this.registry.list();
    const active = targetPlayerId
      ? this.registry.get(targetPlayerId) ?? null
      : this.registry.getActive();
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';

    if (!active) {
      return {
        status: 'no-video',
        videoCount: sessions.length,
        activeVideoIndex: -1,
        activePlayerId: null,
        extensionEnabled: this.settings.general.enabled,
        isFullscreen:
          typeof document !== 'undefined' ? Boolean(document.fullscreenElement) : false,
        playbackRate: 1,
        currentTimeMs: 0,
        durationMs: 0,
        paused: true,
        nativeTracks: [],
        localTrackCount: this.localTracks.length,
        selectedPrimaryTrackId: null,
        selectedSecondaryTrackId: null,
        hostname,
      };
    }

    const activeIndex = sessions.findIndex((s) => s.playerId === active.playerId);
    const localCount = active.trackManager
      .listTracks()
      .filter((t) => t.source === 'local').length;
    const hasAccessibleTracks = active.nativeSummaries.length > 0 || localCount > 0;
    const doc = active.video.ownerDocument;
    const fsEl = doc.fullscreenElement;
    const isFullscreen = Boolean(
      fsEl && (fsEl === active.video || fsEl.contains(active.video)),
    );

    return {
      status: hasAccessibleTracks ? 'detected' : 'tracks-unavailable',
      videoCount: sessions.length,
      activeVideoIndex: activeIndex,
      activePlayerId: active.playerId,
      extensionEnabled: this.settings.general.enabled,
      isFullscreen,
      playbackRate: active.video.playbackRate || 1,
      currentTimeMs: Number.isFinite(active.video.currentTime)
        ? Math.round(active.video.currentTime * 1000)
        : 0,
      durationMs: Number.isFinite(active.video.duration)
        ? Math.round(active.video.duration * 1000)
        : 0,
      paused: active.video.paused,
      nativeTracks: active.nativeSummaries,
      localTrackCount: localCount,
      selectedPrimaryTrackId: active.trackManager.getSelectedTrack('primary')?.id ?? null,
      selectedSecondaryTrackId: active.trackManager.getSelectedTrack('secondary')?.id ?? null,
      hostname,
    };
  }

  public getAvailableTracks(targetPlayerId?: string): AvailableTrackSummary[] {
    const session = targetPlayerId
      ? this.registry.get(targetPlayerId) ?? null
      : this.registry.getActive();
    if (!session) return [];

    return session.trackManager.listTracks().map((track) => ({
      id: track.id,
      language: track.language,
      label: track.label,
      source: track.source,
      cueCount: track.cues.length,
      enabled: track.enabled,
      offset: track.offset,
    }));
  }

  /**
   * Handles validated runtime commands from Popup or Service Worker and
   * returns structured ExtensionMessageResponse objects.
   */
  public handleMessage(message: ExtensionMessage): ExtensionMessageResponse {
    const reqId = message.requestId;
    const baseOk = reqId !== undefined ? { ok: true as const, requestId: reqId } : { ok: true as const };

    if (message.type === 'PING') {
      return { ...baseOk, type: 'PONG' };
    }

    if (message.type === 'GET_ACTIVE_PLAYER') {
      return {
        ...baseOk,
        type: 'ACTIVE_PLAYER',
        payload: {
          playerId: this.registry.getActive()?.playerId ?? null,
          videoCount: this.registry.size(),
        },
      };
    }

    if (message.type === 'REFRESH_PLAYER') {
      this.refresh();
      return {
        ...baseOk,
        type: 'PLAYER_STATUS',
        payload: this.getPlayerStatusSnapshot(message.playerId),
      };
    }

    if (message.type === 'GET_PLAYER_STATUS') {
      return {
        ...baseOk,
        type: 'PLAYER_STATUS',
        payload: this.getPlayerStatusSnapshot(message.playerId),
      };
    }

    if (message.type === 'GET_AVAILABLE_TRACKS') {
      return {
        ...baseOk,
        type: 'AVAILABLE_TRACKS',
        payload: this.getAvailableTracks(message.playerId),
      };
    }

    if (message.type === 'SETTINGS_UPDATED') {
      this.applySettings(message.payload);
      return { ...baseOk, type: 'ACK' };
    }

    if (message.type === 'SET_EXTENSION_ENABLED') {
      this.applySettings({
        ...this.settings,
        general: { ...this.settings.general, enabled: message.payload.enabled },
      });
      return { ...baseOk, type: 'ACK' };
    }

    if (message.type === 'TOGGLE_PRIMARY') {
      this.applySettings({
        ...this.settings,
        general: { ...this.settings.general, primaryEnabled: message.payload.enabled },
      });
      return { ...baseOk, type: 'ACK' };
    }

    if (message.type === 'TOGGLE_SECONDARY') {
      this.applySettings({
        ...this.settings,
        general: { ...this.settings.general, secondaryEnabled: message.payload.enabled },
      });
      return { ...baseOk, type: 'ACK' };
    }

    if (message.type === 'SET_SUBTITLE_ORDER') {
      this.applySettings({
        ...this.settings,
        general: { ...this.settings.general, subtitleOrder: message.payload.order },
      });
      return { ...baseOk, type: 'ACK' };
    }

    if (message.type === 'SET_TRACK_OFFSET' || message.type === 'UPDATE_TRACK_OFFSET') {
      const { slot, offsetMs } = message.payload;
      const syncPatch =
        slot === 'primary' ? { primaryOffsetMs: offsetMs } : { secondaryOffsetMs: offsetMs };
      this.applySettings({
        ...this.settings,
        sync: { ...this.settings.sync, ...syncPatch },
      });
      return { ...baseOk, type: 'ACK' };
    }

    if (message.type === 'SYNC_LOCAL_TRACKS') {
      this.syncLocalTracks(
        message.payload.tracks,
        message.payload.primaryTrackId,
        message.payload.secondaryTrackId,
      );
      return { ...baseOk, type: 'ACK' };
    }

    const session = message.playerId
      ? this.registry.get(message.playerId) ?? null
      : this.registry.getActive();

    if (message.playerId && !session) {
      return {
        ok: false,
        ...(reqId !== undefined ? { requestId: reqId } : {}),
        error: `Player session "${message.playerId}" no longer exists.`,
        errorCode: 'STALE_PLAYER_ID',
      };
    }

    if (!session) {
      return { ...baseOk, type: 'ACK' };
    }

    if (message.type === 'SET_PRIMARY_TRACK') {
      session.manualSelections.primary = message.payload.trackId !== null;
      session.trackManager.selectTrack('primary', message.payload.trackId);
      session.syncController.forceSync();
      return { ...baseOk, type: 'ACK' };
    }

    if (message.type === 'SET_SECONDARY_TRACK') {
      session.manualSelections.secondary = message.payload.trackId !== null;
      session.trackManager.selectTrack('secondary', message.payload.trackId);
      session.syncController.forceSync();
      return { ...baseOk, type: 'ACK' };
    }

    if (message.type === 'SELECT_TRACK') {
      session.manualSelections[message.payload.slot] = message.payload.trackId !== null;
      session.trackManager.selectTrack(message.payload.slot, message.payload.trackId);
      session.syncController.forceSync();
      return { ...baseOk, type: 'ACK' };
    }

    if (message.type === 'IMPORT_LOCAL_TRACK') {
      session.trackManager.registerTrack(message.payload.track);
      session.trackManager.selectTrack(message.payload.slot, message.payload.track.id);
      session.syncController.forceSync();
      return { ...baseOk, type: 'ACK' };
    }

    if (message.type === 'REMOVE_LOCAL_TRACK') {
      session.trackManager.removeTrack(message.payload.trackId);
      session.syncController.forceSync();
      return { ...baseOk, type: 'ACK' };
    }

    return {
      ok: false,
      ...(reqId !== undefined ? { requestId: reqId } : {}),
      error: 'Unsupported command.',
      errorCode: 'INVALID_MESSAGE',
    };
  }

  private applySettingsToSession(session: PlayerSession): void {
    session.nativeObserver.setSuppressionEnabled(this.settings.general.enabled);
    session.trackManager.setOrder(this.settings.general.subtitleOrder);
    session.trackManager.setTrackOffset('primary', this.settings.sync.primaryOffsetMs);
    session.trackManager.setTrackOffset('secondary', this.settings.sync.secondaryOffsetMs);
    session.trackManager.setTrackEnabled('primary', this.settings.general.primaryEnabled);
    session.trackManager.setTrackEnabled('secondary', this.settings.general.secondaryEnabled);
    session.syncController.forceSync();
    session.renderCurrent();
  }

  private findBestNativeMatch(
    nativeTracks: readonly SubtitleTrack[],
    preferredLanguage: string,
    excludeId?: string,
  ): SubtitleTrack | undefined {
    const normalized = preferredLanguage.trim().toLowerCase();
    const base = normalized.slice(0, 2);
    const eligible = nativeTracks.filter((t) => t.id !== excludeId);

    const exact = eligible.find((t) => t.language.trim().toLowerCase() === normalized);
    if (exact) return exact;

    if (base.length > 0) {
      const prefix = eligible.find((t) => t.language.trim().toLowerCase().startsWith(base));
      if (prefix) return prefix;
    }
    return undefined;
  }

  private autoSelectNativeTracksForSession(
    session: PlayerSession,
    forceReevaluate: boolean,
  ): void {
    const nativeTracks = session.trackManager
      .listTracks()
      .filter((track) => track.source === 'player');
    if (nativeTracks.length === 0) return;

    const currentPrimary = session.trackManager.getSelectedTrack('primary');
    const canAutoPrimary =
      !session.manualSelections.primary &&
      currentPrimary?.source !== 'local' &&
      (forceReevaluate || !currentPrimary);

    const currentSecondary = session.trackManager.getSelectedTrack('secondary');
    const canAutoSecondary =
      !session.manualSelections.secondary &&
      currentSecondary?.source !== 'local' &&
      (forceReevaluate || !currentSecondary);

    // Clear auto-selected native slots before re-evaluating so swapping languages cannot collide
    if (forceReevaluate) {
      if (canAutoPrimary) session.trackManager.selectTrack('primary', null);
      if (canAutoSecondary) session.trackManager.selectTrack('secondary', null);
    }

    if (canAutoPrimary) {
      const secondaryId = session.trackManager.getSelectedTrack('secondary')?.id;
      const match =
        this.findBestNativeMatch(
          nativeTracks,
          this.settings.general.defaultPrimaryLanguage,
          secondaryId,
        ) ?? nativeTracks.find((t) => t.id !== secondaryId);
      if (match) {
        session.trackManager.selectTrack('primary', match.id);
      }
    }

    if (canAutoSecondary) {
      const primaryId = session.trackManager.getSelectedTrack('primary')?.id;
      const match = this.findBestNativeMatch(
        nativeTracks,
        this.settings.general.defaultSecondaryLanguage,
        primaryId,
      );
      if (match) {
        session.trackManager.selectTrack('secondary', match.id);
      }
    }
  }

  private applyNativeTracksToSession(session: PlayerSession, nativeTracks: SubtitleTrack[]): void {
    const incomingIds = new Set(nativeTracks.map((t) => t.id));

    for (const track of nativeTracks) {
      if (session.trackManager.getTrack(track.id)) {
        session.trackManager.updateTrack(track.id, {
          language: track.language,
          label: track.label,
          cues: track.cues,
        });
      } else {
        session.trackManager.registerTrack(track);
      }
    }

    for (const existing of session.trackManager.listTracks()) {
      if (existing.source === 'player' && !incomingIds.has(existing.id)) {
        if (session.trackManager.getSelectedTrack('primary')?.id === existing.id) {
          session.manualSelections.primary = false;
        }
        if (session.trackManager.getSelectedTrack('secondary')?.id === existing.id) {
          session.manualSelections.secondary = false;
        }
        session.trackManager.removeTrack(existing.id);
      }
    }

    this.autoSelectNativeTracksForSession(session, false);
    this.applySettingsToSession(session);
  }

  private applyLocalTracksToSession(session: PlayerSession): void {
    const incomingRuntimeIds = new Set<string>();

    for (const track of this.localTracks) {
      const runtimeId = `runtime:${session.playerId}:local:${track.id}`;
      incomingRuntimeIds.add(runtimeId);

      const isPrimary = this.localPrimaryId === track.id;
      const isSecondary = this.localSecondaryId === track.id;
      const offset = isPrimary
        ? this.settings.sync.primaryOffsetMs
        : isSecondary
          ? this.settings.sync.secondaryOffsetMs
          : 0;

      const runtimeTrack: SubtitleTrack = {
        ...track,
        id: runtimeId,
        source: 'local',
        offset,
        enabled: true,
      };

      if (session.trackManager.getTrack(runtimeId)) {
        session.trackManager.updateTrack(runtimeId, {
          language: runtimeTrack.language,
          label: runtimeTrack.label,
          cues: runtimeTrack.cues,
          offset,
        });
      } else {
        session.trackManager.registerTrack(runtimeTrack);
      }
    }

    // Remove stale local tracks
    for (const existing of session.trackManager.listTracks()) {
      if (existing.source === 'local' && !incomingRuntimeIds.has(existing.id)) {
        session.trackManager.removeTrack(existing.id);
      }
    }

    if (this.localPrimaryId) {
      const targetId = `runtime:${session.playerId}:local:${this.localPrimaryId}`;
      if (incomingRuntimeIds.has(targetId)) {
        session.trackManager.selectTrack('primary', targetId);
      }
    }
    if (this.localSecondaryId) {
      const targetId = `runtime:${session.playerId}:local:${this.localSecondaryId}`;
      if (incomingRuntimeIds.has(targetId)) {
        session.trackManager.selectTrack('secondary', targetId);
      }
    }

    this.applySettingsToSession(session);
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.detector.dispose();
    this.registry.disposeAll();
  }
}
