import type { Group } from 'three';
import { TREASURE_DEFS, type TreasureKind } from '../../core/treasures';
import { buildBronzeCoin } from './bronzeCoin';
import { buildFrostFlower } from './frostFlower';
import { buildGuardianSeal } from './guardianSeal';
import { buildKeyFragment } from './keyFragment';
import { createKit, type TreasureBuilder } from './kit';
import { buildLoreScroll } from './loreScroll';
import { buildMistWisp } from './mistWisp';
import { buildMoonShard } from './moonShard';
import { buildOilFlask } from './oilFlask';
import { buildRaindrop } from './raindrop';
import { buildRuneStone } from './runeStone';

export interface TreasureModel {
  /** Floor-level origin; place it on the cell centre. */
  root: Group;
  /** Signature light colour, for a ground halo or the pickup flash. */
  accent: string;
  /**
   * Called every frame. `t` is clock time in seconds, `glint` 0..1 reveal
   * strength (0 = fully hidden), `flare` 0..1 brief overdrive (pickup flash).
   */
  animate(t: number, glint: number, flare?: number): void;
  dispose(): void;
}

const BUILDERS: Readonly<Record<TreasureKind, TreasureBuilder>> = {
  'moon-shard': buildMoonShard,
  'bronze-coin': buildBronzeCoin,
  'rune-stone': buildRuneStone,
  'oil-flask': buildOilFlask,
  'guardian-seal': buildGuardianSeal,
  'lore-scroll': buildLoreScroll,
  'key-fragment': buildKeyFragment,
  raindrop: buildRaindrop,
  'frost-flower': buildFrostFlower,
  'mist-wisp': buildMistWisp,
};

/**
 * Builds the low-poly, procedural model of a hidden treasure (roughly
 * 0.25-0.4 units, floating just above the floor). Glow strength scales with
 * the kind's rarity; rare kinds add orbiting motes. No lights, no textures.
 */
export const buildTreasureModel = (kind: TreasureKind): TreasureModel => {
  const kit = createKit(TREASURE_DEFS[kind].rarity);
  kit.root.name = `treasure-${kind}`;
  const parts = BUILDERS[kind](kit);
  kit.finish(parts.keep);
  kit.root.traverse((object) => {
    object.castShadow = false;
  });

  return {
    root: kit.root,
    accent: parts.accent,
    animate: (t, glint, flare = 0) => {
      parts.animate(t);
      kit.applyGlint(glint, flare);
    },
    dispose: kit.dispose,
  };
};
