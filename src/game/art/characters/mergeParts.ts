import { Group, Mesh, type BufferGeometry, type Material, type Object3D } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Cuts character draw calls without losing articulation: inside every
 * pivot group, direct mesh children that share a material are baked into a
 * single mesh (their local transforms are applied to the geometry). Pivots
 * stay separate objects, so joint animation is unaffected. Meshes listed in
 * `keep` (animated individually) are left untouched.
 */
export const mergeStaticParts = (root: Object3D, keep: ReadonlySet<Object3D> = new Set()): void => {
  const groups: Group[] = [];
  root.traverse((object) => {
    if (object instanceof Group) groups.push(object);
  });

  for (const group of groups) {
    const buckets = new Map<Material, Mesh[]>();
    for (const child of group.children) {
      if (!(child instanceof Mesh) || keep.has(child) || child.children.length > 0) continue;
      const material = child.material as Material;
      const list = buckets.get(material) ?? [];
      list.push(child);
      buckets.set(material, list);
    }

    for (const [material, meshes] of buckets) {
      if (meshes.length < 2) continue;
      const geometries: BufferGeometry[] = meshes.map((mesh) => {
        mesh.updateMatrix();
        const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
        // Keep only the attributes every primitive shares, so the merge never fails.
        for (const name of Object.keys(geometry.attributes)) {
          if (!['position', 'normal', 'uv'].includes(name)) geometry.deleteAttribute(name);
        }
        geometry.applyMatrix4(mesh.matrix);
        return geometry;
      });
      const merged = mergeGeometries(geometries, false);
      geometries.forEach((g) => g.dispose());
      if (!merged) continue;

      const mesh = new Mesh(merged, material);
      mesh.name = `${group.name || 'group'}-merged`;
      mesh.castShadow = meshes.some((m) => m.castShadow);
      mesh.receiveShadow = meshes.some((m) => m.receiveShadow);
      for (const old of meshes) {
        group.remove(old);
        old.geometry.dispose();
      }
      group.add(mesh);
    }
  }
};
