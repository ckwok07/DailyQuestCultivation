"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CatAvatar } from "./CatAvatar";
import { usePlayer } from "@/context/PlayerContext";
import type { RoomLayoutItem } from "@/types/user";

/** Furniture items that can be placed in the room (id must match shop) */
const COUCH_ICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 32"><rect x="4" y="12" width="56" height="14" rx="2" fill="%236b5344" stroke="%234a3728" stroke-width="1"/><rect x="4" y="8" width="8" height="6" fill="%236b5344" stroke="%234a3728" stroke-width="1"/><rect x="52" y="8" width="8" height="6" fill="%236b5344" stroke="%234a3728" stroke-width="1"/></svg>'
  );

const FURNITURE_PLACEABLE: { id: string; name: string; icon: string; wallOnly?: boolean }[] = [
  { id: "cat-portrait", name: "Cat portrait", icon: "/resources/cat-static.png" },
  { id: "couch", name: "Couch", icon: COUCH_ICON },
  { id: "poster", name: "Poster", icon: "/resources/poster.png", wallOnly: true },
];

function getFurnitureById(id: string): { id: string; name: string; icon: string; wallOnly?: boolean } | undefined {
  return FURNITURE_PLACEABLE.find((f) => f.id === id);
}

function canPlaceItemOnLayer(itemId: string, layer: "floor" | "wall"): boolean {
  const meta = getFurnitureById(itemId);
  if (!meta) return false;
  if (meta.wallOnly && layer === "floor") return false;
  return true;
}

/** Parse wallAnchorId e.g. "wall-left-1-2" -> { wall: 'left', row: 1, col: 2 } */
function parseWallAnchorId(
  wallAnchorId: string
): { wall: "left" | "right"; row: number; col: number } | null {
  const match = wallAnchorId.match(/^wall-(left|right)-(\d+)-(\d+)$/);
  if (!match) return null;
  return {
    wall: match[1] as "left" | "right",
    row: parseInt(match[2], 10),
    col: parseInt(match[3], 10),
  };
}

const CUBE_SIZE = 256;
/** Z depth for floor and both walls so they share the same plane and align. */
const FLOOR_WALL_Z = CUBE_SIZE / 2;
const MIN_SCALE = 0.5;
const MAX_SCALE = 2;
const PAN_LIMIT = 120;

/** Cat walkable area = red overlay = full floor face. Same bounds everywhere. */
const FLOOR_HALF = CUBE_SIZE / 2 * 1.4;

/** Floor placement grid: every cell is a hitbox for one item */
const FLOOR_GRID_COLS = 8;
const FLOOR_GRID_ROWS = 8;

/** Wall placement grid: each wall has a grid of anchor cells (same hitbox idea as floor) */
const WALL_GRID_COLS = 4;
const WALL_GRID_ROWS = 4;

const FLOOR_CELL_SIZE = CUBE_SIZE / FLOOR_GRID_COLS;
const WALL_CELL_SIZE = CUBE_SIZE / WALL_GRID_COLS;
/** Size of placed furniture on floor (slightly smaller than cell) */
const FLOOR_ITEM_SIZE = Math.floor(FLOOR_CELL_SIZE * 0.85);
/** Size of placed furniture on walls */
const WALL_ITEM_SIZE = Math.floor(WALL_CELL_SIZE * 0.85);

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
const TARGET_REACHED_THRESHOLD = 0.8;
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
  const { ownedItems, setRoomLayout } = usePlayer();
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(null);
  /** Index into roomLayout of the placed item selected for move/remove (edit mode) */
  const [selectedPlacedIndex, setSelectedPlacedIndex] = useState<number | null>(null);

  const [dragOverCell, setDragOverCell] = useState<{ wall: string; row: number; col: number } | null>(null);

  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  /** Cursor position for furniture ghost preview (edit mode, when placing) */
  const [previewCursor, setPreviewCursor] = useState<{ x: number; y: number } | null>(null);

  const getOwnedCount = useCallback((itemId: string) => ownedItems.filter((id) => id === itemId).length, [ownedItems]);
  const getPlacedCount = useCallback((itemId: string) => roomLayout.filter((i) => i.itemId === itemId).length, [roomLayout]);
  const canPlaceMore = useCallback((itemId: string) => getPlacedCount(itemId) < getOwnedCount(itemId), [getPlacedCount, getOwnedCount]);

  const ownedFurniture = FURNITURE_PLACEABLE.filter((f) => getOwnedCount(f.id) > 0);

  const saveRoomLayout = useCallback(
    async (layout: RoomLayoutItem[]) => {
      const res = await fetch("/api/user/room", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(layout),
      });
      if (res.ok) {
        const data = await res.json();
        setRoomLayout(data);
      }
    },
    [setRoomLayout]
  );

  const isPositionOccupied = useCallback(
    (position: RoomLayoutItem["position"], layer: "floor" | "wall", excludeLayoutIndex: number | null) => {
      return roomLayout.some((item, i) => {
        if (i === excludeLayoutIndex) return false;
        if (item.layer !== layer) return false;
        if (layer === "floor" && "x" in position && "x" in item.position)
          return item.position.x === position.x && item.position.y === position.y;
        if (layer === "wall" && "wallAnchorId" in position && "wallAnchorId" in item.position)
          return item.position.wallAnchorId === position.wallAnchorId;
        return false;
      });
    },
    [roomLayout]
  );

  const placeItem = useCallback(
    (itemId: string, position: RoomLayoutItem["position"], layer: "floor" | "wall") => {
      if (selectedPlacedIndex !== null) {
        const item = roomLayout[selectedPlacedIndex];
        if (!item) return;
        if (isPositionOccupied(position, layer, selectedPlacedIndex)) return;
        const newLayout = roomLayout.map((it, i) =>
          i === selectedPlacedIndex ? { ...it, position, layer } : it
        );
        saveRoomLayout(newLayout);
        setSelectedPlacedIndex(null);
        return;
      }
      if (!canPlaceMore(itemId)) return;
      if (isPositionOccupied(position, layer, null)) return;
      const newLayout: RoomLayoutItem[] = [
        ...roomLayout,
        { itemId, position, rotation: 0, layer },
      ];
      saveRoomLayout(newLayout);
    },
    [roomLayout, saveRoomLayout, selectedPlacedIndex, canPlaceMore, isPositionOccupied]
  );

  const removePlacedItem = useCallback(
    (layoutIndex: number) => {
      const newLayout = roomLayout.filter((_, i) => i !== layoutIndex);
      saveRoomLayout(newLayout);
      setSelectedPlacedIndex(null);
    },
    [roomLayout, saveRoomLayout]
  );
  
  const [catFloor, setCatFloor] = useState<{ x: number; z: number }>({ x: 0, z: 0 });
  const [isWalking, setIsWalking] = useState(true);
  const [catSpeed, setCatSpeed] = useState(0);
  
  const targetRef = useRef({ x: 0, z: 0 });
  const hasTargetRef = useRef(false);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const behaviorTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const behaviorModeRef = useRef<'always-walk' | 'walk-stop'>('always-walk');

  const pickNewTarget = useCallback((currentX: number, currentZ: number) => {
    let attempts = 0;
    let target;
    
    const pickBorderPoint = Math.random() < 0.6;
    
    do {
      target = pickBorderPoint 
        ? randomPointOnBorder(FLOOR_HALF)
        : randomPointBiasedToEdges(FLOOR_HALF);
        
      const dx = target.x - currentX;
      const dz = target.z - currentZ;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance > MIN_TARGET_DISTANCE) {
        break;
      }
      attempts++;
    } while (attempts < 20);
    
    return target || randomPointBiasedToEdges(FLOOR_HALF);
  }, []);

  const scheduleNextBehavior = useCallback(() => {
    if (behaviorTimeoutRef.current) {
      clearTimeout(behaviorTimeoutRef.current);
    }

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

          return clampToFloorSquare(nextX, nextZ, FLOOR_HALF);
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
      if (editMode) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale((s) => clamp(s + delta, MIN_SCALE, MAX_SCALE));
    },
    [editMode]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (editMode) return;
      setIsDragging(true);
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    },
    [editMode]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (editMode && selectedFurnitureId && selectedPlacedIndex === null) {
        setPreviewCursor({ x: e.clientX, y: e.clientY });
      }
      if (!isDragging) return;
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      setOffsetX((x) => clamp(x + dx, -PAN_LIMIT, PAN_LIMIT));
      setOffsetY((y) => clamp(y + dy, -PAN_LIMIT, PAN_LIMIT));
    },
    [isDragging, editMode, selectedFurnitureId, selectedPlacedIndex]
  );

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    setPreviewCursor(null);
  }, []);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (!editMode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedFurnitureId(null);
        setSelectedPlacedIndex(null);
        setPreviewCursor(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [editMode]);

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
        cursor: editMode ? "default" : isDragging ? "grabbing" : "grab",
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseEnter={(e) => {
        if (editMode && selectedFurnitureId && selectedPlacedIndex === null) {
          setPreviewCursor({ x: e.clientX, y: e.clientY });
        }
      }}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Ghost preview */}
      {editMode && selectedFurnitureId && selectedPlacedIndex === null && previewCursor && (() => {
        const meta = getFurnitureById(selectedFurnitureId);
        if (!meta) return null;
        return (
          <div
            aria-hidden
            style={{
              position: "fixed",
              left: previewCursor.x,
              top: previewCursor.y,
              transform: "translate(-50%, -50%)",
              width: 56,
              height: 56,
              pointerEvents: "none",
              zIndex: 15,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={meta.icon}
              alt=""
              style={{
                width: 48,
                height: 48,
                objectFit: "contain",
                opacity: 0.5,
              }}
            />
          </div>
        );
      })()}
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
            {/* Floor */}
            <div
              style={{
                position: "absolute",
                width: CUBE_SIZE,
                height: CUBE_SIZE,
                backgroundImage: "url(/resources/floor.png)",
                backgroundSize: "cover",
                transform: `rotateX(90deg) translateZ(-${FLOOR_WALL_Z}px)`,
                transformOrigin: "center center",
              }}
              aria-hidden
            />
            
            {/* Floor grid cells and items */}
            <div
              style={{
                position: "absolute",
                width: CUBE_SIZE,
                height: CUBE_SIZE,
                transform: `rotateX(90deg) translateZ(-${FLOOR_WALL_Z}px)`,
                transformOrigin: "center center",
                pointerEvents: editMode ? "auto" : "none",
                display: "grid",
                gridTemplateColumns: `repeat(${FLOOR_GRID_COLS}, 1fr)`,
                gridTemplateRows: `repeat(${FLOOR_GRID_ROWS}, 1fr)`,
              }}
              aria-hidden
            >
              {Array.from({ length: FLOOR_GRID_ROWS * FLOOR_GRID_COLS }, (_, i) => {
                const row = Math.floor(i / FLOOR_GRID_COLS);
                const col = i % FLOOR_GRID_COLS;
                const placedItem = roomLayout.find(
                  (item) => item.layer === "floor" && "x" in item.position && item.position.x === col && item.position.y === row
                );
                const layoutIndex = placedItem ? roomLayout.indexOf(placedItem) : null;
                const meta = placedItem ? getFurnitureById(placedItem.itemId) : null;
                const isSelected = editMode && layoutIndex !== null && selectedPlacedIndex === layoutIndex;

                return (
                  <div
                    key={`floor-${row}-${col}`}
                    style={{
                      position: "relative",
                      border: editMode ? "1px solid rgba(255,255,255,0.25)" : "none",
                      boxSizing: "border-box",
                      cursor: editMode ? "pointer" : "default",
                    }}
                    onClick={editMode ? (e) => {
                      e.stopPropagation();
                      if (layoutIndex !== null) {
                        setSelectedPlacedIndex(layoutIndex);
                        setSelectedFurnitureId(null);
                      } else if (selectedPlacedIndex !== null) {
                        const item = roomLayout[selectedPlacedIndex];
                        if (item && canPlaceItemOnLayer(item.itemId, "floor")) placeItem(item.itemId, { x: col, y: row }, "floor");
                      } else if (selectedFurnitureId && canPlaceMore(selectedFurnitureId) && canPlaceItemOnLayer(selectedFurnitureId, "floor")) {
                        placeItem(selectedFurnitureId, { x: col, y: row }, "floor");
                      }
                    } : undefined}
                  >
                    {meta && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          outline: isSelected ? "2px solid white" : "none",
                          outlineOffset: 2,
                        }}
                      >
                        <img
                          src={meta.icon}
                          alt={meta.name}
                          style={{
                            width: `${FLOOR_ITEM_SIZE}px`,
                            height: `${FLOOR_ITEM_SIZE}px`,
                            objectFit: "contain",
                            transform: `rotate(${placedItem?.rotation || 0}deg)`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Left wall */}
            <div
              style={{
                position: "absolute",
                width: CUBE_SIZE,
                height: CUBE_SIZE,
                backgroundImage: "url(/resources/wall-right.png)",
                backgroundSize: "cover",
                transform: `rotateY(-90deg) translateZ(-${FLOOR_WALL_Z}px) scaleX(-1)`,
                transformOrigin: "center center",
              }}
              aria-hidden
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  transform: "translateZ(2px)",
                  transformStyle: "preserve-3d",
                  pointerEvents: editMode ? "auto" : "none",
                  display: "grid",
                  gridTemplateColumns: `repeat(${WALL_GRID_COLS}, 1fr)`,
                  gridTemplateRows: `repeat(${WALL_GRID_ROWS}, 1fr)`,
                }}
                aria-hidden
              >
                {Array.from({ length: WALL_GRID_ROWS * WALL_GRID_COLS }, (_, i) => {
                  const row = Math.floor(i / WALL_GRID_COLS);
                  const col = i % WALL_GRID_COLS;
                  const wallAnchorId = `wall-left-${row}-${col}`;
                  const placedItem = roomLayout.find(
                    (item) => item.layer === "wall" && "wallAnchorId" in item.position && item.position.wallAnchorId === wallAnchorId
                  );
                  const layoutIndex = placedItem ? roomLayout.indexOf(placedItem) : null;
                  const meta = placedItem ? getFurnitureById(placedItem.itemId) : null;
                  const isSelected = editMode && layoutIndex !== null && selectedPlacedIndex === layoutIndex;
                  const isHovered = dragOverCell?.wall === "left" && dragOverCell?.row === row && dragOverCell?.col === col;

                  return (
                    <div
                      key={i}
                      style={{
                        position: "relative",
                        border: editMode ? "1px solid rgba(255,255,255,0.4)" : "none",
                        boxSizing: "border-box",
                        background: isHovered ? "rgba(255,255,255,0.3)" : editMode ? "rgba(0,0,0,0.05)" : "transparent",
                        cursor: editMode ? "pointer" : "default",
                      }}
                      onClick={editMode ? (e) => {
                        e.stopPropagation();
                        if (layoutIndex !== null) {
                          setSelectedPlacedIndex(layoutIndex);
                          setSelectedFurnitureId(null);
                        } else if (selectedPlacedIndex !== null) {
                          const item = roomLayout[selectedPlacedIndex];
                          if (item) placeItem(item.itemId, { wallAnchorId }, "wall");
                        } else if (selectedFurnitureId && canPlaceMore(selectedFurnitureId)) {
                          placeItem(selectedFurnitureId, { wallAnchorId }, "wall");
                        }
                      } : undefined}
                      onDragOver={editMode ? (e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "copy";
                        setDragOverCell({ wall: "left", row, col });
                      } : undefined}
                      onDragLeave={editMode ? () => setDragOverCell(null) : undefined}
                      onDrop={editMode ? (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const furnitureId = e.dataTransfer.getData("furnitureId");
                        if (furnitureId && canPlaceMore(furnitureId)) {
                          placeItem(furnitureId, { wallAnchorId }, "wall");
                          setSelectedFurnitureId(null);
                          setDragOverCell(null);
                        }
                      } : undefined}
                    >
                      {meta && (
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            outline: isSelected ? "2px solid white" : "none",
                            outlineOffset: 2,
                          }}
                        >
                          <img
                            src={meta.icon}
                            alt={meta.name}
                            style={{
                              width: `${WALL_ITEM_SIZE}px`,
                              height: `${WALL_ITEM_SIZE}px`,
                              objectFit: "contain",
                              transform: `rotate(${placedItem?.rotation || 0}deg)`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right wall */}
            <div
              style={{
                position: "absolute",
                width: CUBE_SIZE,
                height: CUBE_SIZE,
                backgroundImage: "url(/resources/wall-right.png)",
                backgroundSize: "cover",
                transform: `rotateY(0deg) translateZ(-${FLOOR_WALL_Z}px)`,
                transformOrigin: "center center",
              }}
              aria-hidden
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  transform: "translateZ(2px)",
                  transformStyle: "preserve-3d",
                  pointerEvents: editMode ? "auto" : "none",
                  display: "grid",
                  gridTemplateColumns: `repeat(${WALL_GRID_COLS}, 1fr)`,
                  gridTemplateRows: `repeat(${WALL_GRID_ROWS}, 1fr)`,
                }}
                aria-hidden
              >
                {Array.from({ length: WALL_GRID_ROWS * WALL_GRID_COLS }, (_, i) => {
                  const row = Math.floor(i / WALL_GRID_COLS);
                  const col = i % WALL_GRID_COLS;
                  const wallAnchorId = `wall-right-${row}-${col}`;
                  const placedItem = roomLayout.find(
                    (item) => item.layer === "wall" && "wallAnchorId" in item.position && item.position.wallAnchorId === wallAnchorId
                  );
                  const layoutIndex = placedItem ? roomLayout.indexOf(placedItem) : null;
                  const meta = placedItem ? getFurnitureById(placedItem.itemId) : null;
                  const isSelected = editMode && layoutIndex !== null && selectedPlacedIndex === layoutIndex;
                  const isHovered = dragOverCell?.wall === "right" && dragOverCell?.row === row && dragOverCell?.col === col;

                  return (
                    <div
                      key={i}
                      style={{
                        position: "relative",
                        border: editMode ? "1px solid rgba(255,255,255,0.4)" : "none",
                        boxSizing: "border-box",
                        background: isHovered ? "rgba(255,255,255,0.3)" : editMode ? "rgba(0,0,0,0.05)" : "transparent",
                        cursor: editMode ? "pointer" : "default",
                      }}
                      onClick={editMode ? (e) => {
                        e.stopPropagation();
                        if (layoutIndex !== null) {
                          setSelectedPlacedIndex(layoutIndex);
                          setSelectedFurnitureId(null);
                        } else if (selectedPlacedIndex !== null) {
                          const item = roomLayout[selectedPlacedIndex];
                          if (item) placeItem(item.itemId, { wallAnchorId }, "wall");
                        } else if (selectedFurnitureId && canPlaceMore(selectedFurnitureId)) {
                          placeItem(selectedFurnitureId, { wallAnchorId }, "wall");
                        }
                      } : undefined}
                      onDragOver={editMode ? (e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "copy";
                        setDragOverCell({ wall: "right", row, col });
                      } : undefined}
                      onDragLeave={editMode ? () => setDragOverCell(null) : undefined}
                      onDrop={editMode ? (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const furnitureId = e.dataTransfer.getData("furnitureId");
                        if (furnitureId && canPlaceMore(furnitureId)) {
                          placeItem(furnitureId, { wallAnchorId }, "wall");
                          setSelectedFurnitureId(null);
                          setDragOverCell(null);
                        }
                      } : undefined}
                    >
                      {meta && (
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            outline: isSelected ? "2px solid white" : "none",
                            outlineOffset: 2,
                          }}
                        >
                          <img
                            src={meta.icon}
                            alt={meta.name}
                            style={{
                              width: `${WALL_ITEM_SIZE}px`,
                              height: `${WALL_ITEM_SIZE}px`,
                              objectFit: "contain",
                              transform: `rotate(${placedItem?.rotation || 0}deg)`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        
        {/* Cat */}
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

      {/* Footer */}
      {editMode && (ownedFurniture.length > 0 || selectedPlacedIndex !== null) && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "0.5rem 0.75rem",
            background: "rgba(45, 45, 45, 0.92)",
            borderRadius: "var(--radius-sm)  var(--radius-sm) 0 0",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            flexWrap: "wrap",
            boxShadow: "0 -2px 8px rgba(0,0,0,0.15)",
            zIndex: 10,
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseMove={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
        >
          <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.9)", marginRight: "0.25rem", flexShrink: 0 }}>
            Place:
          </span>
          {ownedFurniture.map((item) => (
            <button
              key={item.id}
              type="button"
              draggable={canPlaceMore(item.id)}
              onDragStart={(e) => {
                if (!canPlaceMore(item.id)) return;
                e.dataTransfer.setData("furnitureId", item.id);
                e.dataTransfer.effectAllowed = "copy";
                setSelectedFurnitureId(item.id);
                setSelectedPlacedIndex(null);
                const dragImg = new Image();
                dragImg.src = item.icon;
                e.dataTransfer.setDragImage(dragImg, 12, 12);
              }}
              onDragEnd={() => setDragOverCell(null)}
              onClick={() => {
                setSelectedFurnitureId((id) => (id === item.id ? null : id));
                setSelectedPlacedIndex(null);
                if (selectedFurnitureId === item.id) setPreviewCursor(null);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.35rem 0.6rem",
                borderRadius: 6,
                border: selectedFurnitureId === item.id ? "2px solid white" : "1px solid rgba(255,255,255,0.4)",
                background: selectedFurnitureId === item.id ? "rgba(255,255,255,0.2)" : !canPlaceMore(item.id) ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.08)",
                color: !canPlaceMore(item.id) ? "rgba(255,255,255,0.5)" : "white",
                fontSize: "0.8125rem",
                cursor: canPlaceMore(item.id) ? "grab" : "not-allowed",
              }}
              disabled={!canPlaceMore(item.id)}
            >
              <img
                src={item.icon}
                alt=""
                style={{ 
                  width: 24, 
                  height: 24, 
                  objectFit: "cover", 
                  borderRadius: 4, 
                  pointerEvents: "none",
                  userSelect: "none",
                  WebkitUserDrag: "none",
                }}
              />
              <span style={{ userSelect: "none" }}>{item.name}</span>
              <span style={{ fontSize: "0.7rem", opacity: 0.9, userSelect: "none" }}>({getPlacedCount(item.id)}/{getOwnedCount(item.id)})</span>
            </button>
          ))}
          {selectedPlacedIndex !== null && (
            <>
              <button
                type="button"
                onClick={() => removePlacedItem(selectedPlacedIndex)}
                style={{
                  marginLeft: "0.5rem",
                  padding: "0.35rem 0.6rem",
                  borderRadius: 6,
                  border: "1px solid rgba(255,100,100,0.6)",
                  background: "rgba(255,80,80,0.25)",
                  color: "white",
                  fontSize: "0.8125rem",
                  cursor: "pointer",
                }}
              >
                Remove
              </button>
              <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.75)" }}>
                Click empty spot to move
              </span>
            </>
          )}
          {selectedFurnitureId && selectedPlacedIndex === null && (
            <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.75)", marginLeft: "auto" }}>
              Click or drag to place
            </span>
          )}
        </div>
      )}
    </div>
  );
}