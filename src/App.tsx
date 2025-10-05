import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GameProvider } from './core/GameContext';
import HomeScreen from './ui/screens/HomeScreen';
import InstructionsScreen from './ui/screens/InstructionsScreen';
import AboutScreen from './ui/screens/AboutScreen';
import GameScreen from './ui/screens/GameScreen';

function App() {
  return (
    <GameProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-amber-900 via-amber-800 to-amber-900">
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/instructions" element={<InstructionsScreen />} />
            <Route path="/about" element={<AboutScreen />} />
            <Route path="/game" element={<GameScreen />} />
          </Routes>
        </div>
      </Router>
    </GameProvider>
  );
}

export default App;