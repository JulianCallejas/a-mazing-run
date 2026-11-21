import { useCallback, useEffect, useState } from 'react';
import { getInstallMode, isIosDevice, type InstallMode } from './installMode';

/** Chromium-only event; not in lib.dom. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const HINT_KEY = 'amazing-run:ios-install-hint-dismissed';

const readDismissed = (): boolean => {
  try {
    return localStorage.getItem(HINT_KEY) === '1';
  } catch {
    return false;
  }
};

const isStandalone = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export interface InstallPrompt {
  mode: InstallMode;
  install: () => Promise<void>;
  dismissHint: () => void;
}

export const useInstallPrompt = (): InstallPrompt => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(isStandalone);
  const [hintDismissed, setHintDismissed] = useState(readDismissed);
  const [ios] = useState(() => isIosDevice(navigator.userAgent, navigator.platform, navigator.maxTouchPoints));

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setStandalone(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    // The event can only be used once, whatever the player chose.
    setDeferred(null);
  }, [deferred]);

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
