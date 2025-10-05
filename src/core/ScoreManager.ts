import { calculateScore } from '../utils/helpers';
import { GAME_CONFIG } from '../utils/constants';

export interface ScoreEntry {
  id: string;
  score: number;
  time: number;
  difficulty: keyof typeof GAME_CONFIG.DIFFICULTY;
  visualEffect: keyof typeof GAME_CONFIG.VISUAL_EFFECTS;
  date: string;
  playerName?: string;
}

export class ScoreManager {
  private static readonly STORAGE_KEY = 'amazing-run-scores';
  private static readonly MAX_SCORES = 10;

  public static saveScore(
    time: number,
    difficulty: keyof typeof GAME_CONFIG.DIFFICULTY,
    visualEffect: keyof typeof GAME_CONFIG.VISUAL_EFFECTS,
    playerName?: string
  ): ScoreEntry {
    const score = calculateScore(
      time, 
      difficulty, 
      GAME_CONFIG.VISUAL_EFFECTS[visualEffect].value
    );

    const entry: ScoreEntry = {
      id: `${Date.now()}-${Math.random()}`,
      score,
      time,
      difficulty,
      visualEffect,
      date: new Date().toISOString(),
      playerName
    };

    const scores = this.getTopScores();
    scores.push(entry);
    scores.sort((a, b) => b.score - a.score);
    
    const topScores = scores.slice(0, this.MAX_SCORES);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(topScores));

    return entry;
  }

  public static getTopScores(): ScoreEntry[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load scores:', error);
      return [];
    }
  }

  public static getTopScore(): ScoreEntry | null {
    const scores = this.getTopScores();
    return scores.length > 0 ? scores[0] : null;
  }

  public static clearScores(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  public static isHighScore(score: number): boolean {
    const scores = this.getTopScores();
    return scores.length < this.MAX_SCORES || score > scores[scores.length - 1].score;
  }
}