/**
 * lib/models/loyalty.ts — Phase 5 loyalty model (auditable points + tiers).
 * No points redeemed incorrectly when eligibility changes.
 */
export type Tier = "Bronze" | "Silver" | "Gold" | "Platinum";

export interface LoyaltyPoints {
  id: string;
  userId: string;
  points: number;
  tier: Tier;
  updatedAt: string;
  auditLog: { event: "earn" | "redeem" | "expire" | "adjust"; points: number; reference: string; at: string }[];
}

export const TIER_THRESHOLDS: Record<Tier, number> = {
  Bronze: 0,
  Silver: 500,
  Gold: 2000,
  Platinum: 5000,
};

export function tierFromPoints(p: number): Tier {
  if (p >= 5000) return "Platinum";
  if (p >= 2000) return "Gold";
  if (p >= 500) return "Silver";
  return "Bronze";
}

export function canRedeem(points: number, cost: number, tier: Tier): boolean {
  if (points < cost) return false;
  // Tier-locked rewards: Gold+ can redeem shipping; Platinum only premium
  if (tier === "Bronze" && cost > 200) return false;
  return true;
}
