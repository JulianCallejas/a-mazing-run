import React from 'react';
import { useNavigate } from 'react-router-dom';
import MedievalButton from '../components/MedievalButton';
import MedievalPanel from '../components/MedievalPanel';
import { 
  Shield, Sword, Code, Mail, GitBranch, 
  Briefcase, Globe, Heart, Star 
} from 'lucide-react';

const AboutScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-amber-900 via-amber-800 to-red-900">
      <div className="max-w-4xl w-full space-y-6">
        
        {/* Game Description */}
        <MedievalPanel title="The Legend of A-mazing Run">
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <Shield className="w-8 h-8 text-amber-600 mt-1 flex-shrink-0" />
              <div>
                <p className="font-cinzel text-amber-800 leading-relaxed mb-4">
                  A-mazing Run is an immersive 3D medieval maze adventure that combines classic 
                  labyrinth exploration with modern AI-powered enemies. Built with cutting-edge 
                  web technologies, this game offers a unique blend of strategy, speed, and skill.
                </p>
                <p className="font-cinzel text-amber-800 leading-relaxed">
                  Navigate through procedurally generated or hand-crafted mazes while being hunted 
                  by intelligent guardians that use advanced pathfinding algorithms. Every playthrough 
                  offers a new challenge with multiple difficulty levels and atmospheric effects.
                </p>
              </div>
            </div>
          </div>
        </MedievalPanel>

        {/* Developer Section */}
        <MedievalPanel title="Forged by jc-develop">
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="bg-amber-600 p-3 rounded-full">
                <Code className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-cinzel text-xl font-bold text-amber-900 mb-2">
                  Master Craftsman of Digital Realms
                </h3>
                <p className="font-cinzel text-amber-800 leading-relaxed mb-4">
                  jc-develop specializes in creating immersive web experiences using modern 
                  technologies like React, Three.js, and advanced game development techniques. 
                  With a passion for combining beautiful design with robust functionality, 
                  every project is crafted with attention to detail and user experience.
                </p>
                
                {/* Contact Links */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-cinzel font-semibold text-amber-900 flex items-center">
                      <Sword className="w-4 h-4 mr-2" />
                      Connect & Collaborate
                    </h4>
                    <div className="space-y-2">
                      <a 
                        href="mailto:contact@jc-develop.com" 
                        className="flex items-center text-amber-700 hover:text-amber-900 transition-colors"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        <span className="font-cinzel">contact@jc-develop.com</span>
                      </a>
                      <a 
                        href="https://github.com/jc-develop" 
                        className="flex items-center text-amber-700 hover:text-amber-900 transition-colors"
                      >
                        <GitBranch className="w-4 h-4 mr-2" />
                        <span className="font-cinzel">github.com/jc-develop</span>
                      </a>
                      <a 
                        href="https://linkedin.com/in/jc-develop" 
                        className="flex items-center text-amber-700 hover:text-amber-900 transition-colors"
                      >
                        <Briefcase className="w-4 h-4 mr-2" />
                        <span className="font-cinzel">LinkedIn Profile</span>
                      </a>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-cinzel font-semibold text-amber-900 flex items-center">
                      <Globe className="w-4 h-4 mr-2" />
                      Portfolio & Projects
                    </h4>
                    <div className="space-y-2">
                      <a 
                        href="https://jc-develop.com" 
                        className="flex items-center text-amber-700 hover:text-amber-900 transition-colors"
                      >
                        <Globe className="w-4 h-4 mr-2" />
                        <span className="font-cinzel">jc-develop.com</span>
                      </a>
                      <div className="flex items-center text-amber-700">
                        <Star className="w-4 h-4 mr-2" />
                        <span className="font-cinzel">Game Development</span>
                      </div>
                      <div className="flex items-center text-amber-700">
                        <Heart className="w-4 h-4 mr-2" />
                        <span className="font-cinzel">Web Applications</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </MedievalPanel>

        {/* Technical Information */}
        <MedievalPanel title="Technical Mastery">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-cinzel font-semibold text-amber-900 mb-3">Technologies Used</h4>
              <ul className="space-y-2 text-amber-800 font-cinzel">
                <li>• React 18 + TypeScript</li>
                <li>• React Three Fiber (R3F)</li>
                <li>• Three.js for 3D Graphics</li>
                <li>• A* Pathfinding Algorithm</li>
                <li>• Tailwind CSS Styling</li>
                <li>• Vite Build System</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-cinzel font-semibold text-amber-900 mb-3">Game Features</h4>
              <ul className="space-y-2 text-amber-800 font-cinzel">
                <li>• Real-time 3D Rendering</li>
                <li>• Intelligent AI Enemies</li>
                <li>• Dynamic Lighting & Effects</li>
                <li>• Responsive Design</li>
                <li>• High Score System</li>
                <li>• Medieval Theme & Audio</li>
              </ul>
            </div>
          </div>
        </MedievalPanel>

        {/* Version Info */}
        <MedievalPanel>
          <div className="text-center space-y-2">
            <p className="font-cinzel text-amber-800">
              <strong>A-mazing Run</strong> - Version 1.0.0
            </p>
            <p className="font-cinzel text-amber-700 text-sm">
              Built with passion for immersive gaming experiences
            </p>
            <div className="flex justify-center items-center space-x-1 text-amber-600">
              <Heart className="w-4 h-4" />
              <span className="font-cinzel text-sm">Crafted with care by jc-develop</span>
              <Heart className="w-4 h-4" />
            </div>
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

export default AboutScreen;