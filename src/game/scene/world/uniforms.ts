import type { Material, ShaderMaterial } from 'three';

/**
 * Sets a shader uniform through an object ref. Frame callbacks mutate the
 * rendered object (a ref), never memoized render values.
 */
export const setUniform = (
  target: { material: Material | Material[] } | null | undefined,
  name: string,
  value: unknown,
): void => {
  const material = target?.material as ShaderMaterial | undefined;
  const uniform = material?.uniforms?.[name];
  if (uniform) uniform.value = value;
};
