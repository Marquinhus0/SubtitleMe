export interface DisposableSession {
  readonly playerId: string;
  dispose(): void;
}

/**
 * Manages isolated per-player sessions so multiple HTML5 video elements on the
 * same page never share track state, synchronization loops, or overlays.
 *
 * Active-player selection policy:
 * - First registered player becomes active automatically when none is active.
 * - Explicit `setActive(playerId)` promotes a player (e.g. on play/focus/fullscreen).
 * - Removing the active player promotes the next remaining session (or `null` if empty).
 */
export class PlayerSessionRegistry<TSession extends DisposableSession> {
  private readonly sessions = new Map<string, TSession>();
  private activePlayerId: string | null = null;

  public register(session: TSession): void {
    const existing = this.sessions.get(session.playerId);
    if (existing && existing !== session) {
      existing.dispose();
    }
    this.sessions.set(session.playerId, session);
    if (this.activePlayerId === null) {
      this.activePlayerId = session.playerId;
    }
  }

  public get(playerId: string): TSession | undefined {
    return this.sessions.get(playerId);
  }

  public has(playerId: string): boolean {
    return this.sessions.has(playerId);
  }

  public list(): TSession[] {
    return Array.from(this.sessions.values());
  }

  public size(): number {
    return this.sessions.size;
  }

  public setActive(playerId: string): boolean {
    if (!this.sessions.has(playerId)) return false;
    this.activePlayerId = playerId;
    return true;
  }

  public getActive(): TSession | null {
    if (this.activePlayerId === null) return null;
    return this.sessions.get(this.activePlayerId) ?? null;
  }

  public remove(playerId: string): boolean {
    const session = this.sessions.get(playerId);
    if (!session) return false;
    session.dispose();
    this.sessions.delete(playerId);
    if (this.activePlayerId === playerId) {
      const next = this.sessions.keys().next();
      this.activePlayerId = next.done ? null : next.value;
    }
    return true;
  }

  public disposeAll(): void {
    for (const session of this.sessions.values()) {
      session.dispose();
    }
    this.sessions.clear();
    this.activePlayerId = null;
  }
}
