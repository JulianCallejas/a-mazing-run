import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Vector3 } from 'three';

interface PlayerProps {
  position: [number, number, number];
  onPositionChange?: (position: { x: number, y: number }) => void;
  onDirectionChange?: (direction: { x: number, z: number }) => void;
}

const Player: React.FC<PlayerProps> = ({ position, onPositionChange, onDirectionChange }) => {
  const meshRef = useRef<Mesh>(null);
  const targetPosition = useRef(new Vector3(...position));
  const currentPosition = useRef(new Vector3(...position));
  const previousPosition = useRef(new Vector3(...position));
  const isMoving = useRef(false);
  const movementStartTime = useRef(0);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;

    const elapsed = clock.getElapsedTime();
    
    if (isMoving.current) {
      const duration = 0.4; // Movement duration in seconds
      const progress = Math.min((elapsed - movementStartTime.current) / duration, 1);
      
      // Smooth interpolation
      const easeInOut = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      
      currentPosition.current.lerpVectors(
        previousPosition.current, 
        targetPosition.current, 
        easeInOut
      );
      
      meshRef.current.position.copy(currentPosition.current);
      
      if (progress >= 1) {
        isMoving.current = false;
        meshRef.current.position.copy(targetPosition.current);
        currentPosition.current.copy(targetPosition.current);
        
        // Calculate movement direction for camera
        const direction = {
          x: targetPosition.current.x - previousPosition.current.x,
          z: targetPosition.current.z - previousPosition.current.z
        };
        
        if (onDirectionChange && (direction.x !== 0 || direction.z !== 0)) {
          onDirectionChange(direction);
        }
      }
    }
  });

  const moveToPosition = (newPosition: [number, number, number]) => {
    if (isMoving.current) return;
    
    previousPosition.current.copy(currentPosition.current);
    targetPosition.current.set(...newPosition);
    isMoving.current = true;
    movementStartTime.current = performance.now() / 1000;
    
    if (onPositionChange) {
      onPositionChange({ x: newPosition[0], y: newPosition[2] });
    }
  };

  useEffect(() => {
    if (!isMoving.current) {
      moveToPosition(position);
    }
  }, [position]);

  return (
    <group>
      {/* Player Body */}
      <mesh ref={meshRef} position={position} castShadow>
        <capsuleGeometry args={[0.3, 0.8]} />
        <meshStandardMaterial color="#4A90E2" />
      </mesh>
      
      {/* Player Head */}
      <mesh position={[position[0], position[1] + 0.6, position[2]]} castShadow>
        <sphereGeometry args={[0.2]} />
        <meshStandardMaterial color="#FFE4B5" />
      </mesh>
      
      {/* Player Eyes */}
      <mesh position={[position[0] - 0.1, position[1] + 0.65, position[2] + 0.15]} castShadow>
        <sphereGeometry args={[0.03]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
      <mesh position={[position[0] + 0.1, position[1] + 0.65, position[2] + 0.15]} castShadow>
        <sphereGeometry args={[0.03]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
    </group>
  );
};

export default Player;