"use client";

import { CatAvatar } from "./CatAvatar";
import type { RoomLayoutItem } from "@/types/user";

const CUBE_SIZE = 256;

type IsometricRoomProps = {
  editMode?: boolean;
  roomLayout?: RoomLayoutItem[];
};

export function IsometricRoom({ editMode, roomLayout = [] }: IsometricRoomProps) {
    return (
      <div
        className={`cat-space-area${editMode ? " edit-mode" : ""}`}
        style={{
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          minHeight: 320,
          position: "relative",
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
    );
  }