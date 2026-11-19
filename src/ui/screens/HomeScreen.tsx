import React from 'react';
import { useNavigate } from 'react-router-dom';
import useGameStore from '../../store/useGameStore';
import { GAME_CONFIG } from '../../utils/constants';
import { highScores } from '../../game/core/highScores';
import MedievalButton from '../components/MedievalButton';
import MedievalPanel from '../components/MedievalPanel';
import { Sword, Crown, Settings } from 'lucide-react';

const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  
  // Use direct selectors to avoid potential infinite loops
  const difficulty = useGameStore(state => state.difficulty);
  const visualEffect = useGameStore(state => state.visualEffect);
  const startGame = useGameStore(state => state.startGame);
  const setDifficulty = useGameStore(state => state.setDifficulty);
  const setVisualEffect = useGameStore(state => state.setVisualEffect);
  
  const topScores = highScores.getTopScores().slice(0, 3);

  const handleStartGame = (): void => {
    startGame();
    // Use setTimeout to avoid potential race conditions
    setTimeout(() => navigate('/game'), 0);
  };

  const handleDifficultyChange = (newDifficulty: keyof typeof GAME_CONFIG.DIFFICULTY): void => {
    setDifficulty(newDifficulty);
  };

  const handleVisualEffectChange = (effect: keyof typeof GAME_CONFIG.VISUAL_EFFECTS): void => {
    setVisualEffect(effect);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-amber-900 via-amber-800 to-red-900">
      {/* Main Title */}
      <div className="text-center mb-8">
        <h1 className="font-cinzel-decorative text-6xl md:text-8xl font-bold text-amber-100 mb-2 drop-shadow-2xl">
          A-mazing Run
        </h1>
        <p className="font-cinzel text-xl md:text-2xl text-amber-200 italic">
          Escape the Medieval Labyrinth
        </p>
        <div className="flex justify-center mt-4">
          <Crown className="w-12 h-12 text-amber-400 mx-2" />
          <Sword className="w-12 h-12 text-amber-400 mx-2" />
          <Crown className="w-12 h-12 text-amber-400 mx-2" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-6xl w-full">
        {/* Configuration Panel */}
        <MedievalPanel title="Game Configuration" className="h-fit">
          <div className="space-y-6">
            {/* Difficulty Selection */}
            <div>
              <label className="block font-cinzel text-lg font-semibold text-amber-900 mb-3">
                <Settings className="inline w-5 h-5 mr-2" />
                Difficulty Level
              </label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(GAME_CONFIG.DIFFICULTY).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => handleDifficultyChange(key as keyof typeof GAME_CONFIG.DIFFICULTY)}
                    className={`
                      p-3 rounded-lg border-2 font-cinzel text-sm transition-all duration-200
                      ${difficulty === key
                        ? 'bg-amber-600 border-amber-800 text-white shadow-lg'
                        : 'bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200'
                      }
                    `}
                  >
                    {config.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Effects */}
            <div>
              <label className="block font-cinzel text-lg font-semibold text-amber-900 mb-3">
                Visual Effects
              </label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(GAME_CONFIG.VISUAL_EFFECTS).map(([key, effect]) => (
                  <button
                    key={key}
                    onClick={() => handleVisualEffectChange(key as keyof typeof GAME_CONFIG.VISUAL_EFFECTS)}
                    className={`
                      p-3 rounded-lg border-2 font-cinzel text-sm transition-all duration-200
                      ${visualEffect === key
                        ? 'bg-purple-600 border-purple-800 text-white shadow-lg'
                        : 'bg-purple-100 border-purple-300 text-purple-900 hover:bg-purple-200'
                      }
                    `}
                  >
                    {effect.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Start Game Button */}
            <MedievalButton 
              onClick={handleStartGame}
              variant="primary"
              size="lg"
              className="w-full"
            >
              <Sword className="inline w-6 h-6 mr-2" />
              Begin Quest
            </MedievalButton>
          </div>
        </MedievalPanel>

        {/* High Scores & Navigation */}
        <div className="space-y-6">
          {/* High Scores */}
          <MedievalPanel title="Hall of Fame" className="h-fit">
            {topScores.length > 0 ? (
              <div className="space-y-3">
                {topScores.map((score, index) => (
                  <div key={score.id} className="flex items-center justify-between p-3 bg-amber-200 border border-amber-400 rounded-lg">
                    <div className="flex items-center">
                      <Crown className={`w-5 h-5 mr-2 ${index === 0 ? 'text-yellow-600' : index === 1 ? 'text-gray-500' : 'text-amber-600'}`} />
                      <span className="font-cinzel font-semibold text-amber-900">
                        #{index + 1}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-cinzel font-bold text-amber-900">{score.score} pts</div>
                      <div className="font-cinzel text-sm text-amber-700">
                        {GAME_CONFIG.DIFFICULTY[score.difficulty].name}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-amber-700 font-cinzel italic">
                No scores yet. Be the first hero!
              </div>
            )}
          </MedievalPanel>

          {/* Navigation Buttons */}
          <div className="space-y-4">
            <MedievalButton 
              onClick={() => navigate('/instructions')}
              variant="secondary"
              size="md"
              className="w-full"
            >
              How to Play
            </MedievalButton>
            
            <MedievalButton 
              onClick={() => navigate('/about')}
              variant="secondary"
              size="md"
              className="w-full"
            >
              About the Game
            </MedievalButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;