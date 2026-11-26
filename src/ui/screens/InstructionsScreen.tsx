import React from 'react';
import type { ReactNode } from 'react';
import { Download, Footprints, Map, Trophy } from 'lucide-react';
import ScreenShell from '../components/ScreenShell';
import GuardianHelmIcon from '../components/GuardianHelmIcon';
import { DIFFICULTY_ORDER, WEATHER_ORDER, difficultyInfo, weatherInfo } from '../options';

const Section = ({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) => (
  <section className="py-5 first:pt-0 last:pb-0 border-b border-gold-500/15 last:border-b-0">
    <h2 className="flex items-center gap-2.5 font-label text-xl text-gold-300">
      {icon}
      {title}
    </h2>
    <div className="mt-3 text-parchment-300 leading-relaxed">{children}</div>
  </section>
);

const Keys = ({ keys }: { keys: string[] }) => (
  <span className="inline-flex gap-1">
    {keys.map((key) => (
      <kbd key={key} className="keycap">
        {key}
      </kbd>
    ))}
  </span>
);

const CONTROL_ROWS: Array<{ keys: string[]; chase: string; map: string }> = [
  { keys: ['W', '↑'], chase: 'Walk forward', map: 'Move north' },
  { keys: ['S', '↓'], chase: 'Walk back (turn around)', map: 'Move south' },
  { keys: ['A', '←'], chase: 'Turn 90° left', map: 'Move west' },
  { keys: ['D', '→'], chase: 'Turn 90° right', map: 'Move east' },
  { keys: ['C'], chase: 'Switch to map view', map: 'Back to chase view' },
  { keys: ['Esc', 'P'], chase: 'Pause', map: 'Pause' },
];

const InstructionsScreen: React.FC = () => (
  <ScreenShell title="How to Play" subtitle="Find the golden gate. Do not let them catch you.">
    <Section title="Your quest" icon={<Footprints className="w-5 h-5" aria-hidden="true" />}>
      <p>
        You wake on a rune circle deep inside a cursed castle labyrinth. Somewhere in the dark stands a golden
        gate — its light rises above the walls. Reach it before the guardians reach you. The clock starts with
        your first step; hold a direction to keep running and press the next turn early: it is remembered.
      </p>
    </Section>

    <Section title="Controls" icon={<Map className="w-5 h-5" aria-hidden="true" />}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm sm:text-base">
          <thead className="font-label text-parchment-500">
            <tr>
              <th className="py-1.5 pr-4 font-normal">Keys</th>
              <th className="py-1.5 pr-4 font-normal">Chase view</th>
              <th className="py-1.5 font-normal">Map view</th>
            </tr>
          </thead>
          <tbody>
            {CONTROL_ROWS.map((row) => (
              <tr key={row.chase} className="border-t border-gold-500/10">
                <td className="py-2 pr-4 whitespace-nowrap">
                  <Keys keys={row.keys} />
                </td>
                <td className="py-2 pr-4">{row.chase}</td>
                <td className="py-2">{row.map}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm">Mouse wheel zooms the chase camera. The minimap reveals only the halls you have walked.</p>
    </Section>

    <Section title="The guardians" icon={<GuardianHelmIcon className="w-5 h-5" />}>
      <p>
        Cursed knights wake after a short grace period and hunt you along the shortest path. Their visors burn
        brighter and a red ring glows beneath them as they close in — and the edges of your sight redden.
      </p>
      <ul className="mt-3 grid sm:grid-cols-2 gap-2">
        {DIFFICULTY_ORDER.map((key) => {
          const info = difficultyInfo(key);
          return (
            <li key={key} className="flex items-center justify-between gap-3 px-3 py-2 bg-iron-800/60">
              <span className="font-label text-parchment-100">{info.label}</span>
              <span className="numeric text-sm">
                {info.guardians} × <GuardianHelmIcon className="inline w-4 h-4 -mt-0.5" /> · {info.speedPercent}% ·{' '}
                {info.size}×{info.size}
              </span>
            </li>
          );
        })}
      </ul>
    </Section>

    <Section title="Glory" icon={<Trophy className="w-5 h-5" aria-hidden="true" />}>
      <p className="numeric">
        Score = 1000 × trial multiplier × weather multiplier ÷ seconds. Harder trials multiply your score (Easy
        ×1, Medium ×1.5, Hard ×2.8, Very Hard ×3.6) and braving the weather multiplies it again:
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {WEATHER_ORDER.map((key) => {
          const info = weatherInfo(key);
          const Icon = info.icon;
          return (
            <li key={key} className="flex items-center gap-2 px-3 py-1.5 bg-iron-800/60">
              <Icon className="w-4 h-4 text-frost-300" aria-hidden="true" />
              <span className="font-label">{info.label}</span>
              <span className="numeric text-sm text-gold-300">×{info.multiplier}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3">The ten best escapes are kept in the Hall of Fame on this device.</p>
    </Section>

    <Section title="Install the app" icon={<Download className="w-5 h-5" aria-hidden="true" />}>
      <p>Play full screen and offline by installing A-mazing Run on your device.</p>
      <ul className="mt-3 space-y-1.5 list-disc pl-5">
        <li>
          <strong>Chrome, Edge, Android:</strong> use the download button at the top of the menu, or the install icon in
          the address bar.
        </li>
        <li>
          <strong>iPhone / iPad (Safari):</strong> tap Share, then Add to Home Screen.
        </li>
        <li>
          <strong>Safari on Mac:</strong> choose File, then Add to Dock.
        </li>
        <li>
          <strong>Firefox on desktop:</strong> installing is not supported; the game still works in the browser.
        </li>
      </ul>
    </Section>
  </ScreenShell>
);

export default InstructionsScreen;
