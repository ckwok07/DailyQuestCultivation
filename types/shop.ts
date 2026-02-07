export type PlacementRule = "floor" | "wall";

export type ShopItem = {
  itemId: string;
  name: string;
  category: string;
  price: number;
  placementRules: PlacementRule;
  rarity?: string;
};
