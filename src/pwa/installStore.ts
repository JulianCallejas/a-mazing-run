/** Chromium-only event; not in lib.dom. */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface InstallState {
  /** A captured `beforeinstallprompt` that can still be triggered once. */
  deferred: BeforeInstallPromptEvent | null;
  /** Already running as an installed app. */
  standalone: boolean;
}

/**
 * Holds the install event for the whole app. The browser fires
 * `beforeinstallprompt` once per page load, so it must be captured at startup,
 * not by whichever screen happens to be mounted at that moment.
 */
export const createInstallStore = (target: EventTarget, readStandalone: () => boolean) => {
  let state: InstallState = { deferred: null, standalone: readStandalone() };
  const listeners = new Set<() => void>();

  const set = (next: InstallState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };

  target.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    set({ ...state, deferred: event as BeforeInstallPromptEvent });
  });
  target.addEventListener('appinstalled', () => set({ deferred: null, standalone: true }));

  return {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** Hands the event out exactly once; it cannot be reused after `prompt()`. */
    consume: (): BeforeInstallPromptEvent | null => {
      const { deferred } = state;
      if (deferred) set({ ...state, deferred: null });
      return deferred;
    },
  };
};

export type InstallStore = ReturnType<typeof createInstallStore>;

const detectStandalone = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

let singleton: InstallStore | null = null;

/** App-wide store. Call once at startup (`main.tsx`) so the event is never missed. */
export const getInstallStore = (): InstallStore => {
  singleton ??= createInstallStore(window, detectStandalone);
  return singleton;
};
