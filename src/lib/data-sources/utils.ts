export async function fetchJson<T>(
  url: string,
  init: RequestInit = {},
  timeoutMs = 7_000
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        accept: "application/json",
        "user-agent": "SIGGY-Prediction-Market/1.0",
        ...init.headers,
      },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`${new URL(url).hostname} returned ${response.status}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export function roundToUsefulStep(value: number) {
  if (value >= 50_000) return Math.round(value / 1_000) * 1_000;
  if (value >= 5_000) return Math.round(value / 100) * 100;
  if (value >= 500) return Math.round(value / 10) * 10;
  if (value >= 50) return Math.round(value);
  if (value >= 5) return Math.round(value * 10) / 10;
  return Math.round(value * 100) / 100;
}

export function compactNumber(value: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits,
  }).format(value);
}
