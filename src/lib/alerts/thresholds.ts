export interface Thresholds {
  crosswind: { amber: number; red: number };
  tempDewpointSpread: { amber: number; red: number };
  ceiling: { amber: number; red: number };
  visibility: { amber: number; red: number };
  gustFactor: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  crosswind: { amber: 10, red: 15 },
  tempDewpointSpread: { amber: 3, red: 2 },
  ceiling: { amber: 2000, red: 1000 },
  visibility: { amber: 5, red: 3 },
  gustFactor: 10,
};
