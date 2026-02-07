"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { RoomLayoutItem } from "@/types/user";

type PlayerState = {
  points: number;
  streakCount: number;
  hasCompletedOnboarding: boolean;
  ownedItems: string[];
  roomLayout: RoomLayoutItem[];
};

const defaultState: PlayerState = {
  points: 0,
  streakCount: 0,
  hasCompletedOnboarding: false,
  ownedItems: [],
  roomLayout: [],
};

type PlayerContextValue = PlayerState & {
  setPoints: (points: number) => void;
  setHasCompletedOnboarding: (value: boolean) => void;
  setOwnedItems: (items: string[]) => void;
  setRoomLayout: (layout: RoomLayoutItem[]) => void;
  loadUserData: () => Promise<void>;
  isLoading: boolean;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PlayerState>(defaultState);
  const [isLoading, setIsLoading] = useState(true);

  const safeJson = useCallback(async (res: Response, fallback: unknown) => {
    if (!res.ok) return fallback;
    const contentType = res.headers.get("content-type");
    if (!contentType?.includes("application/json")) return fallback;
    try {
      return await res.json();
    } catch {
      return fallback;
    }
  }, []);

  const loadUserData = useCallback(async () => {
    try {
      const [stateRes, roomRes, itemsRes] = await Promise.all([
        fetch("/api/user/state"),
        fetch("/api/user/room"),
        fetch("/api/user/owned-items"),
      ]);
      if (stateRes.status === 401 || roomRes.status === 401 || itemsRes.status === 401) {
        return;
      }
      const [stateData, roomData, itemsData] = await Promise.all([
        safeJson(stateRes, null),
        safeJson(roomRes, []),
        safeJson(itemsRes, []),
      ]);
      setState((prev) => ({
        ...prev,
        points: stateData?.points ?? prev.points,
        streakCount: stateData?.streakCount ?? prev.streakCount,
        hasCompletedOnboarding: stateData?.hasCompletedOnboarding ?? prev.hasCompletedOnboarding,
        roomLayout: Array.isArray(roomData) ? roomData : prev.roomLayout,
        ownedItems: Array.isArray(itemsData) ? itemsData : prev.ownedItems,
      }));
    } finally {
      setIsLoading(false);
    }
  }, [safeJson]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const setPoints = useCallback((points: number) => {
    setState((prev) => ({ ...prev, points }));
  }, []);
  const setHasCompletedOnboarding = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, hasCompletedOnboarding: value }));
  }, []);
  const setOwnedItems = useCallback((items: string[]) => {
    setState((prev) => ({ ...prev, ownedItems: items }));
  }, []);
  const setRoomLayout = useCallback((layout: RoomLayoutItem[]) => {
    setState((prev) => ({ ...prev, roomLayout: layout }));
  }, []);

  const value: PlayerContextValue = {
    ...state,
    setPoints,
    setHasCompletedOnboarding,
    setOwnedItems,
    setRoomLayout,
    loadUserData,
    isLoading,
  };

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error("usePlayer must be used within PlayerProvider");
  }
  return ctx;
}