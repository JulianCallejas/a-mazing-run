import React from 'react';
import { Download, Share, X } from 'lucide-react';
import { useInstallPrompt } from '../../pwa/useInstallPrompt';

/** Home-screen install affordance: native prompt where supported, a hint on iOS, nothing otherwise. */
const InstallButton: React.FC = () => {
  const { mode, install, dismissHint } = useInstallPrompt();

  if (mode === 'prompt') {
    return (
      <button type="button" className="btn btn-ghost w-full py-2.5 mt-2.5" onClick={() => void install()}>
        <Download className="w-4 h-4" aria-hidden="true" />
        Install the app
      </button>
    );
  }

  if (mode === 'ios-hint') {
    return (
      <div
        className="mt-2.5 flex items-start gap-3 px-3 py-2.5 bg-iron-800/70 shadow-[inset_0_0_0_1px_rgb(212_175_55/0.12)] text-sm text-parchment-300"
        role="note"
      >
        <Share className="w-4 h-4 mt-0.5 shrink-0 text-gold-400" aria-hidden="true" />
        <p className="flex-1">
          To install: tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.
        </p>
        <button type="button" className="shrink-0 text-parchment-500" onClick={dismissHint} aria-label="Dismiss install hint">
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return null;
};

export default InstallButton;
