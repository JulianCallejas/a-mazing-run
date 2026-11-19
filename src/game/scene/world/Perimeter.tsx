import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  MeshStandardMaterial,
  Object3D,
  type InstancedMesh,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { PerimeterProp } from '../../core/dressing';
import { getTextures } from '../../art/proceduralTextures';
import { QUALITY } from '../../art/quality';

/** Three stacked cones merged into one pine canopy geometry. */
const pineCanopy = () => {
  const tiers = [
    { radius: 0.9, height: 1.6, y: 1.5 },
    { radius: 0.7, height: 1.4, y: 2.3 },
    { radius: 0.45, height: 1.2, y: 3.0 },
  ].map(({ radius, height, y }) => new ConeGeometry(radius, height, 7).translate(0, y, 0));
  return mergeGeometries(tiers);
};

interface PerimeterProps {
  props: PerimeterProp[];
}

/** Dark pine forest and boulders around the maze: mid/far depth layers. */
const Perimeter = ({ props }: PerimeterProps) => {
  const trunkRef = useRef<InstancedMesh>(null);
  const canopyRef = useRef<InstancedMesh>(null);
  const rockRef = useRef<InstancedMesh>(null);
  const textures = getTextures();

  const trees = useMemo(() => props.filter((p) => p.kind === 'tree'), [props]);
  const rocks = useMemo(() => props.filter((p) => p.kind === 'rock'), [props]);

  const resources = useMemo(
    () => ({
      trunk: new CylinderGeometry(0.09, 0.14, 1.2, 6).translate(0, 0.6, 0),
      canopy: pineCanopy(),
      rock: new DodecahedronGeometry(1, 1),
      bark: new MeshStandardMaterial({ color: '#2a1d14', roughness: 1 }),
      needles: new MeshStandardMaterial({ color: '#16241d', roughness: 0.95, flatShading: true }),
      stone: new MeshStandardMaterial({
        map: textures.roughStone.map,
        bumpMap: textures.roughStone.bumpMap,
        color: '#7d776c',
        roughness: 1,
        flatShading: true,
      }),
    }),
    [textures],
  );

  useLayoutEffect(() => {
    const helper = new Object3D();
    const tint = new Color();
    trees.forEach((tree, i) => {
      helper.position.set(tree.x, 0, tree.z);
      helper.rotation.set(0, tree.rotation, 0);
      helper.scale.setScalar(tree.scale);
      helper.updateMatrix();
      trunkRef.current?.setMatrixAt(i, helper.matrix);
      canopyRef.current?.setMatrixAt(i, helper.matrix);
      const v = 0.75 + ((tree.rotation * 7) % 1) * 0.5;
      canopyRef.current?.setColorAt(i, tint.setRGB(v, v, v));
    });
    rocks.forEach((rock, i) => {
      helper.position.set(rock.x, rock.scale * 0.25, rock.z);
      helper.rotation.set(rock.rotation, rock.rotation * 2, 0);
      helper.scale.set(rock.scale * 1.4, rock.scale * 0.8, rock.scale);
      helper.updateMatrix();
      rockRef.current?.setMatrixAt(i, helper.matrix);
    });
    for (const mesh of [trunkRef.current, canopyRef.current, rockRef.current]) {
      if (!mesh) continue;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [trees, rocks]);

  return (
    <group name="perimeter">
      {trees.length > 0 && (
        <>
          <instancedMesh ref={trunkRef} args={[resources.trunk, resources.bark, trees.length]} castShadow={QUALITY.propShadows} />
          <instancedMesh ref={canopyRef} args={[resources.canopy, resources.needles, trees.length]} castShadow={QUALITY.propShadows} />
        </>
      )}
      {rocks.length > 0 && (
        <instancedMesh ref={rockRef} args={[resources.rock, resources.stone, rocks.length]} castShadow={QUALITY.propShadows} receiveShadow />
      )}
    </group>
  );
};

export default Perimeter;
