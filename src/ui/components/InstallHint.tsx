import React from 'react';
import { Share, X } from 'lucide-react';
import { useInstallPrompt } from '../../pwa/useInstallPrompt';

/** iOS never fires an install event, so Safari users get a manual how-to instead. */
const InstallHint: React.FC = () => {
  const { mode, dismissHint } = useInstallPrompt();
  if (mode !== 'ios-hint') return null;

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
};

export default InstallHint;
