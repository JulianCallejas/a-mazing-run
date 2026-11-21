import { useCallback, useState, useSyncExternalStore } from 'react';
import { getInstallMode, isIosDevice, type InstallMode } from './installMode';
import { getInstallStore } from './installStore';

const HINT_KEY = 'amazing-run:ios-install-hint-dismissed';

const readDismissed = (): boolean => {
  try {
    return localStorage.getItem(HINT_KEY) === '1';
  } catch {
    return false;
  }
};

export interface InstallPrompt {
  mode: InstallMode;
  install: () => Promise<void>;
  dismissHint: () => void;
}

export const useInstallPrompt = (): InstallPrompt => {
  const store = getInstallStore();
  const { deferred, standalone } = useSyncExternalStore(store.subscribe, store.getState);
  const [hintDismissed, setHintDismissed] = useState(readDismissed);
  const [ios] = useState(() => isIosDevice(navigator.userAgent, navigator.platform, navigator.maxTouchPoints));

  const install = useCallback(async () => {
    // The event is single-use whatever the player chooses, so the store hands it out once.
    const event = store.consume();
    if (!event) return;
    await event.prompt();
    await event.userChoice;
  }, [store]);

  const dismissHint = useCallback(() => {
    setHintDismissed(true);
    try {
      localStorage.setItem(HINT_KEY, '1');
    } catch {
      /* storage blocked: the hint simply reappears next visit */
    }
  }, []);

  return {
    mode: getInstallMode({ hasDeferredPrompt: deferred !== null, standalone, ios, hintDismissed }),
    install,
    dismissHint,
  };
};
