"use client";

import { useCallback, useRef, useState } from "react";
import { CatAvatar } from "./CatAvatar";
import type { RoomLayoutItem } from "@/types/user";

const CUBE_SIZE = 256;
const MIN_SCALE = 0.5;
const MAX_SCALE = 2;
const PAN_LIMIT = 120;

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
            {/* Floor - positioned at bottom edge of walls */}
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
            {/* Left wall */}
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
            {/* Back wall */}
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
        <CatAvatar />
      </div>
    </div>
  );
}