"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CatAvatar } from "./CatAvatar";
import type { RoomLayoutItem } from "@/types/user";

const CUBE_SIZE = 256;
const MIN_SCALE = 0.5;
const MAX_SCALE = 2;
const PAN_LIMIT = 120;

/** Cat walkable area = red overlay = full floor face. Same bounds everywhere. */
const FLOOR_HALF = CUBE_SIZE / 2; // ±this in floor x,z = red overlay extent

/** Floor placement grid: every cell is a hitbox for one item */
const FLOOR_GRID_COLS = 8;
const FLOOR_GRID_ROWS = 8;

/** Wall placement grid: each wall has a grid of anchor cells (same hitbox idea as floor) */
const WALL_GRID_COLS = 4;
const WALL_GRID_ROWS = 4;

/** Floor cell center in floor space (x, z) for a given grid (col, row) */
function floorCellCenter(col: number, row: number): { x: number; z: number } {
  const step = (2 * FLOOR_HALF) / FLOOR_GRID_COLS;
  return {
    x: -FLOOR_HALF + (col + 0.5) * step,
    z: -FLOOR_HALF + (row + 0.5) * step,
  };
}

/** All wall anchor IDs for left wall then right wall (for placement/API) */
export const WALL_ANCHOR_IDS: string[] = [
  ...Array.from({ length: WALL_GRID_ROWS * WALL_GRID_COLS }, (_, i) => {
    const row = Math.floor(i / WALL_GRID_COLS);
    const col = i % WALL_GRID_COLS;
    return `wall-left-${row}-${col}`;
  }),
  ...Array.from({ length: WALL_GRID_ROWS * WALL_GRID_COLS }, (_, i) => {
    const row = Math.floor(i / WALL_GRID_COLS);
    const col = i % WALL_GRID_COLS;
    return `wall-right-${row}-${col}`;
  }),
];

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
const TARGET_REACHED_THRESHOLD = 0.8; // stop when almost at target so cat reaches border
const MIN_TARGET_DISTANCE = 40;
/** Speed below this → show static cat; at or above → walking.gif */
const WALK_SPEED_THRESHOLD = 0.2;

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

/** Clamp (x, z) to the red walkable overlay: |x| ≤ H, |z| ≤ H */
function clampToFloorSquare(
  x: number,
  z: number,
  H: number
): { x: number; z: number } {
  return {
    x: Math.max(-H, Math.min(H, x)),
    z: Math.max(-H, Math.min(H, z)),
  };
}

/** Pick random point inside floor square */
function randomPointInSquare(H: number): { x: number; z: number } {
  return {
    x: (Math.random() * 2 - 1) * H,
    z: (Math.random() * 2 - 1) * H,
  };
}

/** Pick a point biased toward edges of the square for better coverage */
function randomPointBiasedToEdges(H: number): { x: number; z: number } {
  if (Math.random() < 0.6) {
    const edge = Math.floor(Math.random() * 4);
    const t = Math.random();
    switch (edge) {
      case 0: return { x: H * (2 * t - 1), z: H };
      case 1: return { x: H, z: H * (2 * t - 1) };
      case 2: return { x: H * (2 * t - 1), z: -H };
      default: return { x: -H, z: H * (2 * t - 1) };
    }
  }
  return randomPointInSquare(H);
}

/** Pick a point on the border of the square */
function randomPointOnBorder(H: number): { x: number; z: number } {
  const edge = Math.floor(Math.random() * 4);
  const t = Math.random();
  switch (edge) {
    case 0: return { x: H * (2 * t - 1), z: H };
    case 1: return { x: H, z: H * (2 * t - 1) };
    case 2: return { x: H * (2 * t - 1), z: -H };
    default: return { x: -H, z: H * (2 * t - 1) };
  }
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
  
  const [catFloor, setCatFloor] = useState<{ x: number; z: number }>({ x: 0, z: 0 });
  const [isWalking, setIsWalking] = useState(true);
  const [catSpeed, setCatSpeed] = useState(0);
  
  const targetRef = useRef({ x: 0, z: 0 });
  const hasTargetRef = useRef(false);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const behaviorTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const behaviorModeRef = useRef<'always-walk' | 'walk-stop'>('always-walk');

  // Pick a new target that's different from current position
  const pickNewTarget = useCallback((currentX: number, currentZ: number) => {
    let attempts = 0;
    let target;
    
    // Often pick a point on the border so the cat walks all the way to the edge
    const pickBorderPoint = Math.random() < 0.6;
    
    // Keep trying until we get a target that's reasonably far from current position
    do {
      target = pickBorderPoint 
        ? randomPointOnBorder(FLOOR_HALF)
        : randomPointBiasedToEdges(FLOOR_HALF);
        
      const dx = target.x - currentX;
      const dz = target.z - currentZ;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      // Ensure new target is far enough for good coverage
      if (distance > MIN_TARGET_DISTANCE) {
        break;
      }
      attempts++;
    } while (attempts < 20);
    
    return target || randomPointBiasedToEdges(FLOOR_HALF);
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
        // ~83% idle, ~17% walking in walk-stop mode (adds ~10% overall idle chance)
        const nextState = Math.random() < 0.17;
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

  // Animation loop - smooth movement (position clamped to diamond so cat stays on visible floor)
  useEffect(() => {
    const animate = () => {
      if (isWalking) {
        setCatFloor((prev) => {
          const currentX = prev.x;
          const currentZ = prev.z;

          if (!hasTargetRef.current) {
            const newTarget = pickNewTarget(currentX, currentZ);
            targetRef.current = newTarget;
            hasTargetRef.current = true;
          }

          const dx = targetRef.current.x - currentX;
          const dz = targetRef.current.z - currentZ;
          const distance = Math.sqrt(dx * dx + dz * dz);

          if (distance < TARGET_REACHED_THRESHOLD) {
            hasTargetRef.current = false;
            setCatSpeed(0);
            return prev;
          }

          const moveX = (dx / distance) * MOVEMENT_SPEED;
          const moveZ = (dz / distance) * MOVEMENT_SPEED;

          let nextX: number;
          let nextZ: number;
          if (distance < MOVEMENT_SPEED) {
            setCatSpeed(0);
            nextX = targetRef.current.x;
            nextZ = targetRef.current.z;
          } else {
            setCatSpeed(MOVEMENT_SPEED);
            nextX = currentX + moveX;
            nextZ = currentZ + moveZ;
          }

          return clampToFloorSquare(nextX, nextZ, FLOOR_HALF); // same as red overlay
        });
      } else {
        setCatSpeed(0);
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
    const initial = randomPointBiasedToEdges(FLOOR_HALF);
    setCatFloor(initial);
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
            {/* Floor grid: every cell is a hitbox for placement (edit mode) */}
            {editMode && (
              <div
                style={{
                  position: "absolute",
                  width: CUBE_SIZE,
                  height: CUBE_SIZE,
                  transform: `rotateX(90deg) translateZ(-${CUBE_SIZE / 2}px)`,
                  transformOrigin: "center center",
                  display: "grid",
                  gridTemplateColumns: `repeat(${FLOOR_GRID_COLS}, 1fr)`,
                  gridTemplateRows: `repeat(${FLOOR_GRID_ROWS}, 1fr)`,
                  pointerEvents: "auto",
                }}
                aria-hidden
              >
                {Array.from({ length: FLOOR_GRID_ROWS * FLOOR_GRID_COLS }, (_, i) => {
                  const row = Math.floor(i / FLOOR_GRID_COLS);
                  const col = i % FLOOR_GRID_COLS;
                  return (
                    <div
                      key={`floor-${row}-${col}`}
                      data-floor-cell-id={`floor-${row}-${col}`}
                      data-floor-col={col}
                      data-floor-row={row}
                      style={{
                        border: "1px solid rgba(255,255,255,0.35)",
                        boxSizing: "border-box",
                        cursor: "pointer",
                      }}
                    />
                  );
                })}
              </div>
            )}
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
            >
              {/* Wall-left grid: every cell is a hitbox for placement (edit mode) */}
              {editMode && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "grid",
                    gridTemplateColumns: `repeat(${WALL_GRID_COLS}, 1fr)`,
                    gridTemplateRows: `repeat(${WALL_GRID_ROWS}, 1fr)`,
                    pointerEvents: "auto",
                  }}
                  aria-hidden
                >
                  {Array.from({ length: WALL_GRID_ROWS * WALL_GRID_COLS }, (_, i) => {
                    const row = Math.floor(i / WALL_GRID_COLS);
                    const col = i % WALL_GRID_COLS;
                    const anchorId = `wall-left-${row}-${col}`;
                    return (
                      <div
                        key={anchorId}
                        data-wall-anchor-id={anchorId}
                        style={{
                          border: "1px solid rgba(255,255,255,0.4)",
                          boxSizing: "border-box",
                          cursor: "pointer",
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
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
            >
              {/* Wall-right grid: every cell is a hitbox for placement (edit mode) */}
              {editMode && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "grid",
                    gridTemplateColumns: `repeat(${WALL_GRID_COLS}, 1fr)`,
                    gridTemplateRows: `repeat(${WALL_GRID_ROWS}, 1fr)`,
                    pointerEvents: "auto",
                  }}
                  aria-hidden
                >
                  {Array.from({ length: WALL_GRID_ROWS * WALL_GRID_COLS }, (_, i) => {
                    const row = Math.floor(i / WALL_GRID_COLS);
                    const col = i % WALL_GRID_COLS;
                    const anchorId = `wall-right-${row}-${col}`;
                    return (
                      <div
                        key={anchorId}
                        data-wall-anchor-id={anchorId}
                        style={{
                          border: "1px solid rgba(255,255,255,0.4)",
                          boxSizing: "border-box",
                          cursor: "pointer",
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        {(() => {
          const { x, y, scale } = floorToScreen(catFloor.x, catFloor.z);
          const useWalkingSprite = catSpeed >= WALK_SPEED_THRESHOLD;
          return (
            <CatAvatar
              screenX={x}
              screenY={y}
              scale={scale}
              isWalking={useWalkingSprite}
            />
          );
        })()}
      </div>
    </div>
  );
}