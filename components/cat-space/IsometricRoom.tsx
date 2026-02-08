"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CatAvatar } from "./CatAvatar";
import type { RoomLayoutItem } from "@/types/user";

const CUBE_SIZE = 256;
const MIN_SCALE = 0.5;
const MAX_SCALE = 2;
const PAN_LIMIT = 120;

/** Floor texture is a diamond. Use 0.95 to get very close to edges */
const FLOOR_DIAMOND_R = CUBE_SIZE / 2 * 0.95; // Increased from 0.9

/** Depth for perspective */
const DEPTH_MIN = -CUBE_SIZE;
const DEPTH_MAX = CUBE_SIZE;
const SCALE_FAR = 0.75;
const SCALE_NEAR = 1.25;

// Movement behavior constants
const WALK_DURATION_MIN = 2000;
const WALK_DURATION_MAX = 5000;
const STOP_DURATION_MIN = 500;
const STOP_DURATION_MAX = 2000;
const MOVEMENT_SPEED = 0.5;
const TARGET_REACHED_THRESHOLD = 3;
const MIN_TARGET_DISTANCE = 60;

/** Project floor (x, z) to screen offset */
function floorToScreen(
  floorX: number,
  floorZ: number
): { x: number; y: number; scale: number } {
  const x = (floorX - floorZ) * 0.4;
  const y = (floorX + floorZ) * 0.25 + CUBE_SIZE * 0.35;
  
  const depth = floorX + floorZ;
  const t = (depth - DEPTH_MIN) / (DEPTH_MAX - DEPTH_MIN);
  const scale = SCALE_FAR + t * (SCALE_NEAR - SCALE_FAR);
  
  return { x, y, scale };
}

/** Pick random point inside diamond boundary: |x| + |z| ≤ R */
function randomPointInDiamond(R: number): { x: number; z: number } {
  let x: number, z: number;
  do {
    x = (Math.random() - 0.5) * 2 * R;
    z = (Math.random() - 0.5) * 2 * R;
  } while (Math.abs(x) + Math.abs(z) > R);
  
  return { x, z };
}

/** Pick a point that's biased toward edges for better coverage */
function randomPointBiasedToEdges(R: number): { x: number; z: number } {
  // 60% chance to pick a point near/on the edge (increased from 40%)
  if (Math.random() < 0.6) {
    // Pick a random angle
    const angle = Math.random() * Math.PI * 2;
    // Pick a distance that's 75-100% of max radius (increased from 60-100%)
    const distance = R * (0.75 + Math.random() * 0.25);
    
    // Convert polar to cartesian for diamond shape
    const absX = Math.abs(Math.cos(angle));
    const absZ = Math.abs(Math.sin(angle));
    const scale = distance / (absX + absZ);
    
    return {
      x: Math.cos(angle) * scale,
      z: Math.sin(angle) * scale
    };
  } else {
    // Regular random point
    return randomPointInDiamond(R);
  }
}

/** Pick a point directly ON the border to encourage border walking */
function randomPointOnBorder(R: number): { x: number; z: number } {
  const angle = Math.random() * Math.PI * 2;
  // Use full radius to be exactly on the border
  const distance = R;
  
  const absX = Math.abs(Math.cos(angle));
  const absZ = Math.abs(Math.sin(angle));
  const scale = distance / (absX + absZ);
  
  return {
    x: Math.cos(angle) * scale,
    z: Math.sin(angle) * scale
  };
}

/** Random number between min and max */
function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

type IsometricRoomProps = {
  editMode?: boolean;
  roomLayout?: RoomLayoutItem[];
};

export function IsometricRoom({ editMode, roomLayout = [] }: IsometricRoomProps) {
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  
  const [catFloorX, setCatFloorX] = useState<number>(0);
  const [catFloorZ, setCatFloorZ] = useState<number>(0);
  const [isWalking, setIsWalking] = useState(true);
  
  const targetRef = useRef({ x: 0, z: 0 });
  const hasTargetRef = useRef(false);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const behaviorTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const behaviorModeRef = useRef<'always-walk' | 'walk-stop'>('always-walk');

  // Pick a new target that's different from current position
  const pickNewTarget = useCallback((currentX: number, currentZ: number) => {
    let attempts = 0;
    let target;
    
    // 30% chance to pick a point exactly on the border
    const pickBorderPoint = Math.random() < 0.3;
    
    // Keep trying until we get a target that's reasonably far from current position
    do {
      target = pickBorderPoint 
        ? randomPointOnBorder(FLOOR_DIAMOND_R)
        : randomPointBiasedToEdges(FLOOR_DIAMOND_R);
        
      const dx = target.x - currentX;
      const dz = target.z - currentZ;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      // Ensure new target is far enough for good coverage
      if (distance > MIN_TARGET_DISTANCE) {
        break;
      }
      attempts++;
    } while (attempts < 20);
    
    return target || randomPointBiasedToEdges(FLOOR_DIAMOND_R);
  }, []);

  // Schedule next behavior change (walk or stop)
  const scheduleNextBehavior = useCallback(() => {
    if (behaviorTimeoutRef.current) {
      clearTimeout(behaviorTimeoutRef.current);
    }

    // Randomly decide behavior mode at the start (bias toward walking so walking.gif shows)
    if (!behaviorModeRef.current || Math.random() < 0.3) {
      behaviorModeRef.current = Math.random() < 0.7 ? 'always-walk' : 'walk-stop';
    }
    
    if (behaviorModeRef.current === 'always-walk') {
      setIsWalking(true);
      const duration = randomBetween(WALK_DURATION_MIN * 2, WALK_DURATION_MAX * 2);
      behaviorTimeoutRef.current = setTimeout(() => {
        scheduleNextBehavior();
      }, duration);
    } else {
      setIsWalking((current) => {
        const nextState = !current;
        const duration = nextState 
          ? randomBetween(WALK_DURATION_MIN, WALK_DURATION_MAX)
          : randomBetween(STOP_DURATION_MIN, STOP_DURATION_MAX);
        
        behaviorTimeoutRef.current = setTimeout(() => {
          scheduleNextBehavior();
        }, duration);
        
        return nextState;
      });
    }
  }, []);

  // Animation loop - smooth movement
  useEffect(() => {
    const animate = () => {
      if (isWalking) {
        setCatFloorX((currentX = 0) => {
          setCatFloorZ((currentZ = 0) => {
            // Pick new target if we don't have one or reached current target
            if (!hasTargetRef.current) {
              const newTarget = pickNewTarget(currentX, currentZ);
              targetRef.current = newTarget;
              hasTargetRef.current = true;
            }
  
            const dx = targetRef.current.x - currentX;
            const dz = targetRef.current.z - currentZ;
            const distance = Math.sqrt(dx * dx + dz * dz);
  
            // If reached target, mark as no target
            if (distance < TARGET_REACHED_THRESHOLD) {
              hasTargetRef.current = false;
              return currentZ;
            }
  
            // Move towards target
            const moveZ = (dz / distance) * MOVEMENT_SPEED;
            
            // Ensure we don't overshoot
            if (distance < MOVEMENT_SPEED) {
              return targetRef.current.z;
            }
            
            return currentZ + moveZ;
          });
  
          const dx = targetRef.current.x - currentX;
          const dz = targetRef.current.z - catFloorZ;
          const distance = Math.sqrt(dx * dx + dz * dz);
  
          if (distance < TARGET_REACHED_THRESHOLD) {
            return currentX;
          }
  
          const moveX = (dx / distance) * MOVEMENT_SPEED;
          
          if (distance < MOVEMENT_SPEED) {
            return targetRef.current.x;
          }
  
          return currentX + moveX;
        });
      }
  
      animationFrameRef.current = requestAnimationFrame(animate);
    };
  
    animationFrameRef.current = requestAnimationFrame(animate);
  
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isWalking, pickNewTarget]);

  // Initialize position and behavior
  useEffect(() => {
    const initial = randomPointBiasedToEdges(FLOOR_DIAMOND_R);
    setCatFloorX(initial.x);
    setCatFloorZ(initial.z);
    hasTargetRef.current = false;
    
    scheduleNextBehavior();

    return () => {
      if (behaviorTimeoutRef.current) {
        clearTimeout(behaviorTimeoutRef.current);
      }
    };
  }, [scheduleNextBehavior]);

  const clamp = (v: number, min: number, max: number) =>
    Math.max(min, Math.min(max, v));

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale((s) => clamp(s + delta, MIN_SCALE, MAX_SCALE));
    },
    []
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      setOffsetX((x) => clamp(x + dx, -PAN_LIMIT, PAN_LIMIT));
      setOffsetY((y) => clamp(y + dy, -PAN_LIMIT, PAN_LIMIT));
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => setIsDragging(false), []);
  const handleMouseLeave = useCallback(() => setIsDragging(false), []);

  return (
    <div
      className={`cat-space-area${editMode ? " edit-mode" : ""}`}
      style={{
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        position: "relative",
        userSelect: "none",
        cursor: isDragging ? "grabbing" : "grab",
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
          transformOrigin: "center center",
          transition: isDragging ? "none" : "transform 0.05s ease-out",
        }}
      >
        <div
          style={{
            width: CUBE_SIZE,
            height: CUBE_SIZE,
            position: "relative",
            perspective: 600,
            perspectiveOrigin: "50% 50%",
          }}
        >
          <div
            style={{
              width: CUBE_SIZE,
              height: CUBE_SIZE,
              position: "relative",
              transformStyle: "preserve-3d",
              transform: "rotateX(-35deg) rotateY(45deg)",
            }}
          >
            <div
              style={{
                position: "absolute",
                width: CUBE_SIZE,
                height: CUBE_SIZE,
                backgroundImage: "url(/resources/floor.png)",
                backgroundSize: "cover",
                transform: `rotateX(90deg) translateZ(-${CUBE_SIZE / 2}px)`,
                transformOrigin: "center center",
              }}
              aria-hidden
            />
            <div
              style={{
                position: "absolute",
                width: CUBE_SIZE,
                height: CUBE_SIZE,
                backgroundImage: "url(/resources/wall-left.png)",
                backgroundSize: "cover",
                transform: `rotateY(90deg) translateZ(${CUBE_SIZE / 2}px)`,
                transformOrigin: "center center",
              }}
              aria-hidden
            />
            <div
              style={{
                position: "absolute",
                width: CUBE_SIZE,
                height: CUBE_SIZE,
                backgroundImage: "url(/resources/wall-right.png)",
                backgroundSize: "cover",
                transform: `rotateY(0deg) translateZ(-${CUBE_SIZE / 2}px)`,
                transformOrigin: "center center",
              }}
              aria-hidden
            />
          </div>
        </div>
        {(() => {
          const { x, y, scale } = floorToScreen(catFloorX, catFloorZ);
          return (
            <CatAvatar
              screenX={x}
              screenY={y}
              scale={scale}
              isWalking={isWalking}
            />
          );
        })()}
      </div>
    </div>
  );
}