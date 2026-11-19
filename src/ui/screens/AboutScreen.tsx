import React from 'react';
import { Briefcase, GitBranch, Globe, Mail } from 'lucide-react';
import ScreenShell from '../components/ScreenShell';

const LINKS = [
  { href: 'mailto:contact@jc-develop.com', label: 'contact@jc-develop.com', icon: Mail },
  { href: 'https://github.com/jc-develop', label: 'github.com/jc-develop', icon: GitBranch },
  { href: 'https://linkedin.com/in/jc-develop', label: 'LinkedIn profile', icon: Briefcase },
  { href: 'https://jc-develop.com', label: 'jc-develop.com', icon: Globe },
];

const CRAFT = [
  'React 19 + TypeScript',
  'React Three Fiber + Three.js',
  'Fixed-step engine, A* guardians',
  'Procedural textures, models and weather',
  'Tailwind CSS',
  'Vite + Vitest',
];

const AboutScreen: React.FC = () => (
  <ScreenShell title="Lore & Credits" subtitle="A-mazing Run · version 2.0">
    <div className="grid gap-8 md:grid-cols-[1.3fr_1fr]">
      <section>
        <h2 className="font-label text-xl text-gold-300">The legend</h2>
        <p className="mt-3 text-parchment-300 leading-relaxed">
          They say the castle rearranges its halls every night, and that the knights who once guarded it never
          left. Wanderers who fall asleep on the rune circle wake inside the labyrinth with nothing but a lantern —
          and a single way out through the golden gate.
        </p>
        <p className="mt-3 text-parchment-300 leading-relaxed">
          Every run is a new maze, generated on the spot, and the guardians always know the shortest way to you.
        </p>

        <h2 className="mt-7 font-label text-xl text-gold-300">Forged with</h2>
        <ul className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-parchment-300">
          {CRAFT.map((item) => (
            <li key={item} className="flex items-baseline gap-2">
              <span className="text-gold-500" aria-hidden="true">
                ◆
              </span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-label text-xl text-gold-300">Crafted by jc-develop</h2>
        <p className="mt-3 text-parchment-300 leading-relaxed">
          Immersive web experiences built with modern web technology and game development techniques.
        </p>
        <ul className="mt-4 space-y-2">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <a
                href={href}
                target={href.startsWith('http') ? '_blank' : undefined}
                rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="flex items-center gap-3 px-3 py-2 bg-iron-800/60 text-parchment-300 hover:text-gold-300 transition-colors"
              >
                <Icon className="w-4 h-4 text-gold-500" aria-hidden="true" />
                {label}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  </ScreenShell>
);

export default AboutScreen;
