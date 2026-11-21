import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, DoorOpen, ScrollText, Swords, Volume2, VolumeX } from 'lucide-react';
import useGameStore from '../../store/useGameStore';
import { highScores } from '../../game/core/highScores';
import { formatTime } from '../../game/core/scoring';
import { DIFFICULTY_ORDER, WEATHER_ORDER, difficultyInfo, weatherInfo } from '../options';
import GuardianHelmIcon from '../components/GuardianHelmIcon';
import InstallHint from '../components/InstallHint';
import InstallIconButton from '../components/InstallIconButton';

const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const difficulty = useGameStore((s) => s.difficulty);
  const visualEffect = useGameStore((s) => s.visualEffect);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const setDifficulty = useGameStore((s) => s.setDifficulty);
  const setVisualEffect = useGameStore((s) => s.setVisualEffect);
  const toggleSound = useGameStore((s) => s.toggleSound);
  const [scores] = useState(() => highScores.getTopScores().slice(0, 5));

  const selected = difficultyInfo(difficulty);

  return (
    <div className="min-h-dvh px-5 py-7 sm:px-10 lg:px-14 lg:py-9 flex flex-col">
      <header className="flex items-start justify-between gap-6 animate-rise">
        <div>
          <h1 className="title-gilded text-6xl sm:text-7xl lg:text-8xl leading-[0.9]">A-mazing Run</h1>
          <p className="mt-3 font-label text-lg sm:text-xl text-parchment-300 tracking-wide">
            Escape the cursed labyrinth before its guardians wake.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <InstallIconButton />
          <button
            type="button"
            className="btn btn-icon shrink-0"
            onClick={toggleSound}
            aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'}
            title={soundEnabled ? 'Mute sound' : 'Unmute sound'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <main className="mt-6 lg:mt-8 grid gap-8 lg:grid-cols-[minmax(0,30rem)_1fr_minmax(0,21rem)] items-start flex-1">
        <section className="panel p-6 sm:p-7 animate-rise [animation-delay:80ms]" aria-label="Prepare your escape">
          <h2 className="font-label text-sm tracking-[0.2em] text-gold-400">Choose your trial</h2>
          <div role="radiogroup" aria-label="Difficulty" className="mt-3 grid grid-cols-2 gap-2.5">
            {DIFFICULTY_ORDER.map((key) => {
              const info = difficultyInfo(key);
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={difficulty === key}
                  aria-label={info.label}
                  className="choice px-3.5 py-3"
                  onClick={() => setDifficulty(key)}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-label text-base sm:text-lg leading-tight">{info.label}</span>
                    <span className="flex gap-0.5">
                      {[0, 1].map((i) => (
                        <GuardianHelmIcon key={i} className="w-4 h-4" muted={i >= info.guardians} />
                      ))}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs text-parchment-500 numeric">
                    {info.size}×{info.size} · guardians {info.speedPercent}% speed
                  </span>
                </button>
              );
            })}
          </div>

          <h2 className="mt-5 font-label text-sm tracking-[0.2em] text-gold-400">Choose the weather</h2>
          <div role="radiogroup" aria-label="Weather" className="mt-3 grid grid-cols-2 gap-2.5">
            {WEATHER_ORDER.map((key) => {
              const info = weatherInfo(key);
              const Icon = info.icon;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={visualEffect === key}
                  aria-label={info.label}
                  className="choice px-3.5 py-3 flex items-center gap-3"
                  onClick={() => setVisualEffect(key)}
                >
                  <Icon className="w-5 h-5 text-frost-300 shrink-0" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="font-label text-sm sm:text-base block leading-tight">{info.label}</span>
                    <span className="text-xs text-parchment-500 numeric">
                      {info.bonus > 0 ? `+${info.bonus} pts` : 'no bonus'}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="btn btn-primary w-full mt-6 py-3.5 text-xl"
            onClick={() => navigate('/game')}
          >
            <Swords className="w-5 h-5" aria-hidden="true" />
            Begin the Escape
          </button>
          <p className="mt-3 text-center text-xs text-parchment-500 numeric">
            Score ×{selected.multiplier} on {selected.label} · faster escapes score higher
          </p>

          <nav className="mt-4 grid grid-cols-2 gap-2.5" aria-label="More">
            <button type="button" className="btn btn-ghost py-2.5" onClick={() => navigate('/instructions')}>
              <ScrollText className="w-4 h-4" aria-hidden="true" />
              How to Play
            </button>
            <button type="button" className="btn btn-ghost py-2.5" onClick={() => navigate('/about')}>
              <DoorOpen className="w-4 h-4" aria-hidden="true" />
              Lore & Credits
            </button>
          </nav>
          <InstallHint />
        </section>

        <div className="hidden lg:block" />

        <section className="panel p-6 animate-rise [animation-delay:160ms]" aria-labelledby="hall-of-fame">
          <div className="rule-ornament" aria-hidden="true">
            <Crown className="w-5 h-5" />
          </div>
          <h2 id="hall-of-fame" className="mt-1 text-center font-display text-3xl text-gold-300">
            Hall of Fame
          </h2>
          {scores.length === 0 ? (
            <p className="mt-5 text-center text-parchment-500 italic">
              No one has escaped yet. Be the first legend.
            </p>
          ) : (
            <ol className="mt-4 space-y-2">
              {scores.map((entry, index) => {
                const weather = weatherInfo(entry.visualEffect);
                const WeatherIcon = weather.icon;
                return (
                  <li
                    key={entry.id}
                    className="grid grid-cols-[1.75rem_1fr_auto] items-center gap-3 px-3 py-2 bg-iron-800/70 shadow-[inset_0_0_0_1px_rgb(212_175_55/0.12)]"
                  >
                    <span
                      className={`font-display text-2xl text-center ${
                        index === 0 ? 'text-gold-400' : index === 1 ? 'text-parchment-300' : 'text-ember-400/80'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block numeric text-lg text-parchment-100">{entry.score} pts</span>
                      <span className="flex items-center gap-1.5 text-xs text-parchment-500">
                        <span className="truncate">{difficultyInfo(entry.difficulty).label}</span>
                        <WeatherIcon className="w-3 h-3 shrink-0" aria-label={weather.label} />
                      </span>
                    </span>
                    <span className="numeric text-sm text-parchment-300">{formatTime(entry.time)}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </main>
    </div>
  );
};

export default HomeScreen;
