import { useMemo } from 'react';
import type { GameEngine } from '../core/engine';
import { dressMaze } from '../core/dressing';
import type { VisualEffect } from '../core/scoring';
import type { CameraMode } from '../core/controls';
import { ATMOSPHERES, MOON_DIRECTION } from '../art/atmosphere';
import MazeArchitecture from './world/MazeArchitecture';
import Torches from './world/Torches';
import ExitGate from './world/ExitGate';
import SkyAndHorizon from './world/SkyAndHorizon';
import Weather from './world/Weather';
import Lighting from './world/Lighting';
import PostFX from './world/PostFX';
import Perimeter from './world/Perimeter';

interface MazeWorldProps {
  engine: GameEngine;
  effect: VisualEffect;
  cameraMode: CameraMode;
}

/** The medieval maze world: architecture, props, lights, sky, weather and post. */
const MazeWorld = ({ engine, effect, cameraMode }: MazeWorldProps) => {
  const { maze } = engine;
  const atmosphere = ATMOSPHERES[effect];
  const dressing = useMemo(() => dressMaze(maze), [maze]);
  const center: [number, number] = [(maze.width - 1) / 2, (maze.height - 1) / 2];

  return (
    <>
      <color attach="background" args={[atmosphere.sky.zenith]} />
      <fog attach="fog" args={[atmosphere.fog.color, atmosphere.fog.near, atmosphere.fog.far]} />
      <Lighting maze={maze} atmosphere={atmosphere} cameraMode={cameraMode} />
      <SkyAndHorizon
        center={center}
        mazeSize={Math.max(maze.width, maze.height)}
        atmosphere={atmosphere}
        moonDirection={MOON_DIRECTION}
      />
      <MazeArchitecture maze={maze} dressing={dressing} atmosphere={atmosphere} />
      <Perimeter props={dressing.perimeter} />
      <Torches torches={dressing.torches} engine={engine} atmosphere={atmosphere} />
      <ExitGate gate={dressing.exitGate} />
      <Weather kind={atmosphere.weather} engine={engine} />
      <PostFX />
    </>
  );
};

export default MazeWorld;
