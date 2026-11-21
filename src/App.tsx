import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import HomeScreen from './ui/screens/HomeScreen';
import MenuBackdrop from './ui/components/MenuBackdrop';
import { diagnosticsEnabled } from './game/scene/diagnostics';
import AudioBridge from './systems/AudioBridge';

// Secondary screens load on demand; the home screen and backdrop are eager.
const InstructionsScreen = lazy(() => import('./ui/screens/InstructionsScreen'));
const AboutScreen = lazy(() => import('./ui/screens/AboutScreen'));
const GameScreen = lazy(() => import('./ui/screens/GameScreen'));
const ShowcaseScreen = lazy(() => import('./ui/screens/ShowcaseScreen'));

/** Menu routes share one persistent live 3D backdrop; the game owns its own canvas. */
const MENU_ROUTES = new Set(['/', '/instructions', '/about']);

const Backdrop = () => {
  const { pathname } = useLocation();
  return MENU_ROUTES.has(pathname) ? <MenuBackdrop /> : null;
};

const RouteLoading = () => (
  <div className="min-h-dvh flex items-center justify-center" role="status">
    <p className="font-label text-xl text-parchment-300 animate-flicker">Lighting the torches…</p>
  </div>
);

const App: React.FC = () => (
  <Router>
    <AudioBridge />
    <Backdrop />
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/instructions" element={<InstructionsScreen />} />
        <Route path="/about" element={<AboutScreen />} />
        <Route path="/game" element={<GameScreen />} />
        {diagnosticsEnabled() && <Route path="/showcase" element={<ShowcaseScreen />} />}
      </Routes>
    </Suspense>
  </Router>
);

export default App;
