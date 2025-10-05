import React from 'react';
import { useNavigate } from 'react-router-dom';
import MedievalButton from '../components/MedievalButton';
import MedievalPanel from '../components/MedievalPanel';
import { 
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, 
  Camera, Target, Zap, Crown, Skull 
} from 'lucide-react';

const InstructionsScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-amber-900 via-amber-800 to-red-900">
      <div className="max-w-4xl w-full">
        <MedievalPanel title="Quest Instructions" className="mb-6">
          <div className="space-y-8">
            {/* Game Objective */}
            <section>
              <h3 className="font-cinzel text-xl font-bold text-amber-900 mb-4 flex items-center">
                <Target className="w-6 h-6 mr-2" />
                Your Noble Quest
              </h3>
              <p className="font-cinzel text-amber-800 leading-relaxed">
                Navigate through the treacherous medieval labyrinth to reach the exit before the 
                cursed guardians catch you. Speed and cunning are your allies in this deadly maze!
              </p>
            </section>

            {/* Controls */}
            <section>
              <h3 className="font-cinzel text-xl font-bold text-amber-900 mb-4">
                Master the Controls
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-amber-200 p-4 rounded-lg border border-amber-400">
                  <h4 className="font-cinzel font-semibold text-amber-900 mb-3">Movement</h4>
                  <div className="space-y-2">
                    <div className="flex items-center text-amber-800">
                      <div className="flex space-x-1 mr-3">
                        <ArrowUp className="w-4 h-4" />
                        <ArrowDown className="w-4 h-4" />
                        <ArrowLeft className="w-4 h-4" />
                        <ArrowRight className="w-4 h-4" />
                      </div>
                      <span className="font-cinzel">Arrow Keys</span>
                    </div>
                    <div className="flex items-center text-amber-800">
                      <span className="font-mono bg-amber-300 px-2 py-1 rounded mr-3 text-sm">WASD</span>
                      <span className="font-cinzel">Alternative Movement</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-amber-200 p-4 rounded-lg border border-amber-400">
                  <h4 className="font-cinzel font-semibold text-amber-900 mb-3">Camera</h4>
                  <div className="flex items-center text-amber-800">
                    <Camera className="w-4 h-4 mr-3" />
                    <span className="font-mono bg-amber-300 px-2 py-1 rounded mr-3 text-sm">C</span>
                    <span className="font-cinzel">Toggle Camera View</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Difficulty & Scoring */}
            <section>
              <h3 className="font-cinzel text-xl font-bold text-amber-900 mb-4 flex items-center">
                <Crown className="w-6 h-6 mr-2" />
                Challenges & Rewards
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-green-100 border border-green-400 p-4 rounded-lg">
                  <h4 className="font-cinzel font-semibold text-green-900 mb-3">Difficulty Levels</h4>
                  <ul className="space-y-2 text-green-800 font-cinzel text-sm">
                    <li><strong>Easy:</strong> 1 slow guardian (80% speed)</li>
                    <li><strong>Medium:</strong> 1 guardian (90% speed)</li>
                    <li><strong>Hard:</strong> 2 guardians (100% speed)</li>
                    <li><strong>Very Hard:</strong> 2 fast guardians (110% speed)</li>
                  </ul>
                </div>
                
                <div className="bg-blue-100 border border-blue-400 p-4 rounded-lg">
                  <h4 className="font-cinzel font-semibold text-blue-900 mb-3">Scoring System</h4>
                  <p className="text-blue-800 font-cinzel text-sm mb-2">
                    Score = (Difficulty × 1000 / Time) + Visual Effects Bonus
                  </p>
                  <ul className="space-y-1 text-blue-800 font-cinzel text-sm">
                    <li>• Faster completion = Higher score</li>
                    <li>• Harder difficulty = Score multiplier</li>
                    <li>• Visual effects add bonus points</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Enemy Behavior */}
            <section>
              <h3 className="font-cinzel text-xl font-bold text-amber-900 mb-4 flex items-center">
                <Skull className="w-6 h-6 mr-2" />
                Beware the Guardians
              </h3>
              <div className="bg-red-100 border border-red-400 p-4 rounded-lg">
                <p className="font-cinzel text-red-800 leading-relaxed">
                  The maze guardians use advanced pathfinding magic (A* algorithm) to hunt you down. 
                  They will always find the shortest path to your location, adapting their strategy 
                  as you move. Stay alert and plan your route carefully!
                </p>
              </div>
            </section>

            {/* Visual Effects */}
            <section>
              <h3 className="font-cinzel text-xl font-bold text-amber-900 mb-4 flex items-center">
                <Zap className="w-6 h-6 mr-2" />
                Mystical Atmosphere
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { name: 'Fog', desc: 'Mysterious mist (+179 pts)', color: 'gray' },
                  { name: 'Snow', desc: 'Frozen labyrinth (+163 pts)', color: 'blue' },
                  { name: 'Rain', desc: 'Stormy weather (+147 pts)', color: 'indigo' },
                  { name: 'Clear', desc: 'Perfect visibility (+0 pts)', color: 'green' }
                ].map((effect) => (
                  <div key={effect.name} className={`bg-${effect.color}-100 border border-${effect.color}-400 p-3 rounded-lg text-center`}>
                    <h5 className={`font-cinzel font-semibold text-${effect.color}-900`}>{effect.name}</h5>
                    <p className={`text-${effect.color}-700 font-cinzel text-xs mt-1`}>{effect.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </MedievalPanel>

        {/* Back Button */}
        <div className="text-center">
          <MedievalButton 
            onClick={() => navigate('/')}
            variant="secondary"
            size="lg"
          >
            Return to Castle
          </MedievalButton>
        </div>
      </div>
    </div>
  );
};

export default InstructionsScreen;