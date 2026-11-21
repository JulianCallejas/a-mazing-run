import React from 'react';
import { useLocation } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Offers a reload when a new version is ready. It is hidden during a run so an
 * update never interrupts the game; it appears once the player is back on a menu.
 */
const UpdateToast: React.FC = () => {
  const { pathname } = useLocation();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError: (error) => console.error('Service worker registration failed', error),
  });

  if (!needRefresh || pathname === '/game') return null;

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 mx-auto max-w-md panel p-4 flex items-center gap-3"
    >
      <p className="flex-1 text-sm text-parchment-100">A new version is available.</p>
      <button type="button" className="btn btn-primary px-3 py-2" onClick={() => void updateServiceWorker(true)}>
        <RefreshCw className="w-4 h-4" aria-hidden="true" />
        Reload
      </button>
      <button type="button" className="btn btn-ghost px-3 py-2" onClick={() => setNeedRefresh(false)}>
        Later
      </button>
    </div>
  );
};

export default UpdateToast;
