export type InstallMode = 'prompt' | 'ios-hint' | 'none';

export interface InstallContext {
  /** A `beforeinstallprompt` event was captured and can still be triggered. */
  hasDeferredPrompt: boolean;
  /** Already running as an installed app. */
  standalone: boolean;
  /** iOS/iPadOS Safari, which never fires `beforeinstallprompt`. */
  ios: boolean;
  /** The player closed the iOS hint before. */
  hintDismissed: boolean;
}

/** Decides which install affordance (if any) the home screen should show. */
export const getInstallMode = (ctx: InstallContext): InstallMode => {
  if (ctx.standalone) return 'none';
  if (ctx.hasDeferredPrompt) return 'prompt';
  if (ctx.ios && !ctx.hintDismissed) return 'ios-hint';
  return 'none';
};

/** iPadOS 13+ reports a desktop UA, so touch support on a Mac platform identifies it. */
export const isIosDevice = (userAgent: string, platform: string, maxTouchPoints: number): boolean =>
  /iphone|ipad|ipod/i.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1);
