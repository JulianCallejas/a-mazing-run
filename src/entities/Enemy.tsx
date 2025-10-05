import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Vector3, Group } from 'three';
import { AStar } from '../systems/AStar';

interface EnemyProps {
  position: [number, number, number];
  playerPosition: { x: number, y: number };
  maze: number[][];
  speed: number;
  onCatchPlayer?: () => void;
  isPaused?: boolean;
}

const Enemy: React.FC<EnemyProps> = ({ 
  position, 
  playerPosition, 
  maze, 
  speed,
  onCatchPlayer,
  isPaused = false
}) => {
  const groupRef = useRef<Group>(null);
  const currentPosition = useRef(new Vector3(...position));
  const targetPosition = useRef(new Vector3(...position));
  const [path, setPath] = useState<Array<{x: number, y: number}>>([]);
  const pathIndex = useRef(0);
  const lastPathUpdate = useRef(0);
  const isMoving = useRef(false);
  const movementStartTime = useRef(0);

  const astar = useRef(new AStar(maze));

  useFrame(({ clock }) => {
    if (!groupRef.current || isPaused) return;

    const elapsed = clock.getElapsedTime();
    
    // Update path every second
    if (elapsed - lastPathUpdate.current > 1) {
      const newPath = astar.current.findPath(
        Math.round(currentPosition.current.x),
        Math.round(currentPosition.current.z),
        playerPosition.x,
        playerPosition.y
      );
      
      if (newPath.length > 1) {
        setPath(newPath);
        pathIndex.current = 1; // Skip current position
      }
      
      lastPathUpdate.current = elapsed;
    }

    // Move along path
    if (path.length > pathIndex.current && !isMoving.current) {
      const nextWaypoint = path[pathIndex.current];
      targetPosition.current.set(nextWaypoint.x, 0.5, nextWaypoint.y);
      isMoving.current = true;
      movementStartTime.current = elapsed;
    }

    if (isMoving.current) {
      const duration = (0.4 / speed); // Adjust movement speed
      const progress = Math.min((elapsed - movementStartTime.current) / duration, 1);
      
      currentPosition.current.lerp(targetPosition.current, progress * 0.1);
      groupRef.current.position.copy(currentPosition.current);
      
      if (progress >= 1) {
        isMoving.current = false;
        currentPosition.current.copy(targetPosition.current);
        pathIndex.current++;
        
        // Check if caught player
        const distance = currentPosition.current.distanceTo(
          new Vector3(playerPosition.x, 0.5, playerPosition.y)
        );
        
        if (distance < 0.6 && onCatchPlayer) {
          onCatchPlayer();
        }
      }
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Enemy Body */}
      <mesh castShadow>
        <boxGeometry args={[0.4, 0.8, 0.4]} />
        <meshStandardMaterial color="#8B0000" />
      </mesh>
      
      {/* Enemy Eyes (glowing red) - positioned relative to the group */}
      <mesh position={[-0.1, 0.2, 0.2]} castShadow>
        <sphereGeometry args={[0.05]} />
        <meshStandardMaterial 
          color="#FF0000" 
          emissive="#330000"
          emissiveIntensity={0.5}
        />
      </mesh>
      <mesh position={[0.1, 0.2, 0.2]} castShadow>
        <sphereGeometry args={[0.05]} />
        <meshStandardMaterial 
          color="#FF0000" 
          emissive="#330000"
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
};

export default Enemy;