export type RoomLayoutItem = {
  itemId: string;
  position: { x: number; y: number } | { wallAnchorId: string };
  rotation: 0 | 90 | 180 | 270;
  layer: "floor" | "wall";
};

export type UserState = {
  points: number;
  streakCount: number;
  hasCompletedOnboarding: boolean;
  ownedItems: string[];
  roomLayout: RoomLayoutItem[];
};
