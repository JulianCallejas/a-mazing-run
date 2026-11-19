import {
  CanvasTexture,
  LinearMipmapLinearFilter,
  RepeatWrapping,
  SRGBColorSpace,
  NoColorSpace,
  type Texture,
} from 'three';
import { createRandom, type RandomSource } from '../core/random';

/**
 * Procedural canvas textures for the medieval dungeon look. Everything is
 * generated once (seeded, deterministic) and cached for the app lifetime.
 */

const PX_PER_UNIT = 256;

const makeCanvas = (width: number, height: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  return { canvas, ctx };
};

const toTexture = (canvas: HTMLCanvasElement, color: boolean): Texture => {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = color ? SRGBColorSpace : NoColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.anisotropy = 8;
  texture.generateMipmaps = true;
  return texture;
};

const hsl = (h: number, s: number, l: number, a = 1) => `hsla(${h}, ${s}%, ${l}%, ${a})`;

/** Sprinkles small translucent specks to break flat fills. */
const speckle = (
  ctx: CanvasRenderingContext2D,
  random: RandomSource,
  x: number,
  y: number,
  w: number,
  h: number,
  count: number,
  light: number,
  dark: number,
) => {
  for (let i = 0; i < count; i++) {
    const bright = random() < 0.5;
    ctx.fillStyle = bright ? `rgba(255,240,220,${light * random()})` : `rgba(10,8,6,${dark * random()})`;
    const size = 1 + random() * 3;
    ctx.fillRect(x + random() * w, y + random() * h, size, size);
  }
};

/** Draws a slab (block) in both the color and the height canvas, wrapping horizontally. */
const drawSlab = (
  color: CanvasRenderingContext2D,
  height: CanvasRenderingContext2D,
  random: RandomSource,
  rect: { x: number; y: number; w: number; h: number },
  palette: { hue: number; sat: number; light: number },
  canvasWidth: number,
  options: { gap: number; moss: number; crackChance: number },
) => {
  const { gap } = options;
  const hue = palette.hue + (random() - 0.5) * 10;
  const sat = palette.sat + (random() - 0.5) * 8;
  const light = palette.light + (random() - 0.5) * 12;

  for (const offset of [0, -canvasWidth, canvasWidth]) {
    const x = rect.x + offset + gap;
    const y = rect.y + gap;
    const w = rect.w - gap * 2;
    const h = rect.h - gap * 2;
    if (x + w < 0 || x > canvasWidth) continue;

    // Color: base fill, bevel light/dark edges, specks, moss, cracks.
    color.fillStyle = hsl(hue, sat, light);
    color.fillRect(x, y, w, h);
    const bevel = Math.max(3, gap * 0.9);
    color.fillStyle = hsl(hue, sat, light + 9, 0.55);
    color.fillRect(x, y, w, bevel);
    color.fillRect(x, y, bevel, h);
    color.fillStyle = hsl(hue, sat, light - 12, 0.6);
    color.fillRect(x, y + h - bevel, w, bevel);
    color.fillRect(x + w - bevel, y, bevel, h);
    speckle(color, random, x, y, w, h, Math.floor((w * h) / 90), 0.12, 0.22);

    if (random() < options.moss) {
      const mx = x + random() * w;
      const my = y + h * (0.55 + random() * 0.45);
      const radius = 8 + random() * 26;
      const gradient = color.createRadialGradient(mx, my, 0, mx, my, radius);
      gradient.addColorStop(0, 'rgba(58, 82, 34, 0.55)');
      gradient.addColorStop(1, 'rgba(58, 82, 34, 0)');
      color.fillStyle = gradient;
      color.fillRect(mx - radius, my - radius, radius * 2, radius * 2);
    }

    // Height: raised block with a soft falloff toward the mortar.
    const heightGradient = height.createLinearGradient(x, y, x, y + h);
    const top = 170 + Math.floor(random() * 50);
    heightGradient.addColorStop(0, `rgb(${top},${top},${top})`);
    heightGradient.addColorStop(1, `rgb(${top - 40},${top - 40},${top - 40})`);
    height.fillStyle = heightGradient;
    height.fillRect(x, y, w, h);
    speckle(height, random, x, y, w, h, Math.floor((w * h) / 60), 0.35, 0.45);
  }

  if (random() < options.crackChance) {
    const startX = rect.x + gap + random() * (rect.w - gap * 2);
    let cx = startX;
    let cy = rect.y + gap;
    color.strokeStyle = 'rgba(20, 16, 12, 0.7)';
    height.strokeStyle = 'rgb(40,40,40)';
    color.lineWidth = 1.5;
    height.lineWidth = 2;
    color.beginPath();
    height.beginPath();
    color.moveTo(cx, cy);
    height.moveTo(cx, cy);
    while (cy < rect.y + rect.h - gap) {
      cx += (random() - 0.5) * 14;
      cy += 6 + random() * 10;
      color.lineTo(cx, cy);
      height.lineTo(cx, cy);
    }
    color.stroke();
    height.stroke();
  }
};

export interface SurfaceTextures {
  map: Texture;
  bumpMap: Texture;
  roughnessMap?: Texture;
}

/** Course heights (units) shared by every wall variant so rows line up between cells. */
const WALL_COURSES = [0.3, 0.26, 0.3, 0.27, 0.31, 0.27, 0.29];

const createWallTexture = (variant: number): SurfaceTextures => {
  const width = PX_PER_UNIT * 2; // 1 unit wide at 512 px
  const height = PX_PER_UNIT * 4; // 2 units tall at 1024 px
  const scale = width; // px per unit
  const random = createRandom(1000 + variant * 77);
  const color = makeCanvas(width, height);
  const bump = makeCanvas(width, height);

  color.ctx.fillStyle = '#26211c';
  color.ctx.fillRect(0, 0, width, height);
  bump.ctx.fillStyle = '#202020';
  bump.ctx.fillRect(0, 0, width, height);
  speckle(color.ctx, random, 0, 0, width, height, 6000, 0.08, 0.3);

  let y = 0;
  const totalCourses = WALL_COURSES.reduce((a, b) => a + b, 0);
  for (const course of WALL_COURSES) {
    const h = (course / totalCourses) * height;
    let x = -random() * scale * 0.4;
    while (x < width) {
      const w = scale * (0.32 + random() * 0.36);
      drawSlab(
        color.ctx,
        bump.ctx,
        random,
        { x, y, w, h },
        { hue: 30 + variant * 5, sat: 7, light: 43 },
        width,
        { gap: 7, moss: y > height * 0.7 ? 0.35 : 0.06, crackChance: 0.12 },
      );
      x += w;
    }
    y += h;
  }

  // Damp, darker base and soot near the top: grounds walls and frames corridors.
  const damp = color.ctx.createLinearGradient(0, height * 0.62, 0, height);
  damp.addColorStop(0, 'rgba(8, 10, 6, 0)');
  damp.addColorStop(1, 'rgba(8, 10, 6, 0.55)');
  color.ctx.fillStyle = damp;
  color.ctx.fillRect(0, height * 0.62, width, height * 0.38);
  const soot = color.ctx.createLinearGradient(0, 0, 0, height * 0.2);
  soot.addColorStop(0, 'rgba(10, 8, 6, 0.35)');
  soot.addColorStop(1, 'rgba(10, 8, 6, 0)');
  color.ctx.fillStyle = soot;
  color.ctx.fillRect(0, 0, width, height * 0.2);

  return { map: toTexture(color.canvas, true), bumpMap: toTexture(bump.canvas, false) };
};

const createFloorTexture = (): SurfaceTextures => {
  const size = PX_PER_UNIT * 4; // covers 4 x 4 units at 256 px/unit
  const random = createRandom(4242);
  const color = makeCanvas(size, size);
  const bump = makeCanvas(size, size);
  const rough = makeCanvas(size, size);

  color.ctx.fillStyle = '#1d1a15';
  color.ctx.fillRect(0, 0, size, size);
  bump.ctx.fillStyle = '#181818';
  bump.ctx.fillRect(0, 0, size, size);
  rough.ctx.fillStyle = '#ffffff';
  rough.ctx.fillRect(0, 0, size, size);
  speckle(color.ctx, random, 0, 0, size, size, 9000, 0.06, 0.35);

  const rows = [0.55, 0.45, 0.6, 0.5, 0.4, 0.55, 0.45, 0.5];
  const total = rows.reduce((a, b) => a + b, 0);
  let y = 0;
  for (const row of rows) {
    const h = (row / total) * size;
    let x = -random() * PX_PER_UNIT * 0.5;
    while (x < size) {
      const w = PX_PER_UNIT * (0.45 + random() * 0.55);
      drawSlab(
        color.ctx,
        bump.ctx,
        random,
        { x, y, w, h },
        { hue: 32, sat: 8, light: 34 },
        size,
        { gap: 6, moss: 0.25, crackChance: 0.18 },
      );
      // Worn, slightly polished slabs read as old and walked on.
      const r = 150 + Math.floor(random() * 80);
      rough.ctx.fillStyle = `rgb(${r},${r},${r})`;
      for (const offset of [0, -size, size]) rough.ctx.fillRect(x + offset + 6, y + 6, w - 12, h - 12);
      x += w;
    }
    y += h;
  }

  return {
    map: toTexture(color.canvas, true),
    bumpMap: toTexture(bump.canvas, false),
    roughnessMap: toTexture(rough.canvas, false),
  };
};

/** Generic rough stone noise for caps, arches, rubble and outer ground. */
const createRoughStoneTexture = (): SurfaceTextures => {
  const size = 256;
  const random = createRandom(9001);
  const color = makeCanvas(size, size);
  const bump = makeCanvas(size, size);
  color.ctx.fillStyle = '#5b544b';
  color.ctx.fillRect(0, 0, size, size);
  bump.ctx.fillStyle = '#808080';
  bump.ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 260; i++) {
    const x = random() * size;
    const y = random() * size;
    const r = 4 + random() * 18;
    const light = random() < 0.5;
    for (const ox of [0, -size, size]) {
      for (const oy of [0, -size, size]) {
        const g = color.ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
        g.addColorStop(0, light ? 'rgba(150,140,125,0.25)' : 'rgba(20,16,12,0.3)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        color.ctx.fillStyle = g;
        color.ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
        const b = bump.ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
        b.addColorStop(0, light ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)');
        b.addColorStop(1, 'rgba(0,0,0,0)');
        bump.ctx.fillStyle = b;
        bump.ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
      }
    }
  }
  speckle(color.ctx, random, 0, 0, size, size, 2500, 0.15, 0.3);
  return { map: toTexture(color.canvas, true), bumpMap: toTexture(bump.canvas, false) };
};

/** Soft radial glow used by flames, motes and the exit light. */
const createGlowTexture = (): Texture => {
  const size = 128;
  const { canvas, ctx } = makeCanvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
};

/** Carved rune circle marking the starting cell. */
const createSigilTexture = (): Texture => {
  const size = 512;
  const random = createRandom(31337);
  const { canvas, ctx } = makeCanvas(size, size);
  const c = size / 2;
  ctx.strokeStyle = 'rgba(255, 214, 150, 0.95)';
  ctx.lineCap = 'round';
  for (const [radius, width] of [
    [230, 10],
    [200, 4],
    [120, 6],
  ] as const) {
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(c, c, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Runes between the two outer rings.
  ctx.lineWidth = 5;
  const runes = 16;
  for (let i = 0; i < runes; i++) {
    const a = (i / runes) * Math.PI * 2;
    ctx.save();
    ctx.translate(c + Math.cos(a) * 215, c + Math.sin(a) * 215);
    ctx.rotate(a + Math.PI / 2);
    ctx.beginPath();
    const strokes = 2 + Math.floor(random() * 3);
    for (let s = 0; s < strokes; s++) {
      ctx.moveTo((random() - 0.5) * 16, (random() - 0.5) * 18);
      ctx.lineTo((random() - 0.5) * 16, (random() - 0.5) * 18);
    }
    ctx.stroke();
    ctx.restore();
  }
  // Inner star.
  ctx.lineWidth = 6;
  ctx.beginPath();
  for (let i = 0; i <= 5; i++) {
    const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
    const x = c + Math.cos(a) * 118;
    const y = c + Math.sin(a) * 118;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
};

let cache: {
  walls: SurfaceTextures[];
  floor: SurfaceTextures;
  roughStone: SurfaceTextures;
  glow: Texture;
  sigil: Texture;
} | null = null;

export const WALL_VARIANTS = 3;

/** Lazily builds (once) and returns the shared texture set. Browser only. */
export const getTextures = () => {
  if (!cache) {
    cache = {
      walls: Array.from({ length: WALL_VARIANTS }, (_, i) => createWallTexture(i)),
      floor: createFloorTexture(),
      roughStone: createRoughStoneTexture(),
      glow: createGlowTexture(),
      sigil: createSigilTexture(),
    };
  }
  return cache;
};
