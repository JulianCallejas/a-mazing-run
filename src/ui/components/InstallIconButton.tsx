import React from 'react';
import { Download } from 'lucide-react';
import { useInstallPrompt } from '../../pwa/useInstallPrompt';

/** Header icon button; rendered only while the browser says the app can be installed. */
const InstallIconButton: React.FC = () => {
  const { mode, install } = useInstallPrompt();
  if (mode !== 'prompt') return null;

  return (
    <button
      type="button"
      className="btn btn-icon shrink-0"
      onClick={() => void install()}
      aria-label="Install app"
      title="Install app"
    >
      <Download className="w-5 h-5" aria-hidden="true" />
    </button>
  );
};

export default InstallIconButton;
