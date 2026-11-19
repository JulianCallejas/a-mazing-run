import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import HomeScreen from './ui/screens/HomeScreen';
import InstructionsScreen from './ui/screens/InstructionsScreen';
import AboutScreen from './ui/screens/AboutScreen';
import GameScreen from './ui/screens/GameScreen';
import ShowcaseScreen from './ui/screens/ShowcaseScreen';
import MenuBackdrop from './ui/components/MenuBackdrop';
import { diagnosticsEnabled } from './game/scene/diagnostics';
import AudioBridge from './systems/AudioBridge';

/** Menu routes share one persistent live 3D backdrop; the game owns its own canvas. */
const MENU_ROUTES = new Set(['/', '/instructions', '/about']);

const Backdrop = () => {
  const { pathname } = useLocation();
  return MENU_ROUTES.has(pathname) ? <MenuBackdrop /> : null;
};

const App: React.FC = () => (
  <Router>
    <AudioBridge />
    <Backdrop />
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/instructions" element={<InstructionsScreen />} />
      <Route path="/about" element={<AboutScreen />} />
      <Route path="/game" element={<GameScreen />} />
      {diagnosticsEnabled() && <Route path="/showcase" element={<ShowcaseScreen />} />}
    </Routes>
  </Router>
);

export default App;
