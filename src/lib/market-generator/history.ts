import type { PricePoint } from "@/lib/types";

function hashText(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function confidenceHistory(
  marketId: string,
  probability: number,
  now = new Date()
): PricePoint[] {
  const seed = hashText(marketId);
  const points = 25;
  return Array.from({ length: points }, (_, index) => {
    const time = Math.floor(now.getTime() / 1000) - (points - 1 - index) * 3600;
    const distance = points - 1 - index;
    const wave = Math.sin((seed % 29 + index) * 0.63) * Math.min(8, distance * 0.25);
    const drift = ((seed % 11) - 5) * (distance / points) * 0.45;
    return {
      time,
      value: Math.max(5, Math.min(95, probability - wave - drift)),
    };
  });
}
