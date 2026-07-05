import type { MarketSignal } from "@/lib/data-sources/types";
import { compactNumber, roundToUsefulStep } from "@/lib/data-sources/utils";

export interface ResolutionRule {
  title: string;
  criteria: string;
  deadline: string;
  threshold: number;
  displayThreshold: string;
  yesCase: string;
  noCase: string;
}

function utcDeadline(now: Date, dayOffset = 0, hour = 23, minute = 59) {
  const deadline = new Date(now);
  deadline.setUTCDate(deadline.getUTCDate() + dayOffset);
  deadline.setUTCHours(hour, minute, 0, 0);
  if (deadline <= now) deadline.setUTCDate(deadline.getUTCDate() + 1);
  return deadline;
}

function weekDeadline(now: Date) {
  const deadline = new Date(now);
  const daysUntilSunday = (7 - deadline.getUTCDay()) % 7 || 7;
  deadline.setUTCDate(deadline.getUTCDate() + daysUntilSunday);
  deadline.setUTCHours(23, 59, 0, 0);
  return deadline;
}

function formatUsd(value: number) {
  return `$${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value < 10 ? 2 : 0,
  }).format(value)}`;
}

export function buildResolutionRule(
  signal: MarketSignal,
  now = new Date()
): ResolutionRule {
  if (signal.kind === "price") {
    const threshold = roundToUsefulStep(signal.currentValue);
    const deadline = utcDeadline(now);
    return {
      title: `Will ${signal.title} be above ${formatUsd(
        threshold
      )} at 23:59 UTC today?`,
      criteria: `Resolve YES if the ${signal.metric} shown by ${signal.provider} is strictly above ${formatUsd(
        threshold
      )} at 23:59 UTC on ${deadline.toISOString().slice(0, 10)}. Otherwise resolve NO.`,
      deadline: deadline.toISOString(),
      threshold,
      displayThreshold: formatUsd(threshold),
      yesCase: `Momentum or demand keeps the observed price above ${formatUsd(
        threshold
      )} at the deadline.`,
      noCase: `Selling pressure moves the observed price to ${formatUsd(
        threshold
      )} or below at the deadline.`,
    };
  }

  if (signal.kind === "tvl") {
    const threshold = roundToUsefulStep(signal.currentValue);
    const deadline = utcDeadline(now, 1);
    return {
      title: `Will ${signal.title} remain above $${compactNumber(
        threshold
      )} by tomorrow’s UTC close?`,
      criteria: `Resolve YES if ${signal.provider} reports ${signal.metric} above ${formatUsd(
        threshold
      )} at 23:59 UTC on ${deadline.toISOString().slice(0, 10)}. Otherwise resolve NO.`,
      deadline: deadline.toISOString(),
      threshold,
      displayThreshold: `$${compactNumber(threshold)}`,
      yesCase: "Net deposits and asset prices keep total value locked above the threshold.",
      noCase: "Withdrawals or market declines push total value locked to the threshold or lower.",
    };
  }

  if (signal.kind === "gas") {
    const threshold = Math.max(1, Math.round(signal.currentValue * 1.2));
    const deadline = utcDeadline(now);
    return {
      title: `Will Ethereum gas be above ${threshold} gwei at 23:55 UTC today?`,
      criteria: `Resolve YES if eth_gasPrice from the stated Ethereum RPC is strictly above ${threshold} gwei at 23:55 UTC on ${deadline
        .toISOString()
        .slice(0, 10)}. Otherwise resolve NO.`,
      deadline: utcDeadline(now, 0, 23, 55).toISOString(),
      threshold,
      displayThreshold: `${threshold} gwei`,
      yesCase: "Network demand rises enough to keep the sampled gas price above the threshold.",
      noCase: "Blockspace demand remains moderate and the sampled gas price stays at or below the threshold.",
    };
  }

  if (signal.kind === "block") {
    const deadline = utcDeadline(now);
    const minutes = Math.max(1, (deadline.getTime() - now.getTime()) / 60_000);
    const threshold = Math.floor(signal.currentValue + minutes * 2);
    return {
      title: `Will Ritual Chain reach block ${threshold.toLocaleString()} before UTC midnight?`,
      criteria: `Resolve YES if Ritual Chain block ${threshold.toLocaleString()} has a timestamp on or before ${deadline.toISOString()}. Otherwise resolve NO.`,
      deadline: deadline.toISOString(),
      threshold,
      displayThreshold: `block ${threshold.toLocaleString()}`,
      yesCase: "Ritual Chain continues producing blocks near its recent cadence.",
      noCase: "A prolonged chain halt or materially slower block production prevents the target.",
    };
  }

  if (signal.kind === "count") {
    const deadline = utcDeadline(now);
    const threshold = Math.max(signal.currentValue + 1, 2);
    return {
      title: `Will ${signal.title} record at least ${threshold} UTC-day commits?`,
      criteria: `Resolve YES if the linked GitHub commit history shows at least ${threshold} commits timestamped between 00:00 and 23:59 UTC on ${deadline
        .toISOString()
        .slice(0, 10)}. Otherwise resolve NO.`,
      deadline: deadline.toISOString(),
      threshold,
      displayThreshold: `${threshold} commits`,
      yesCase: "Maintainers merge or push enough work before the daily cutoff.",
      noCase: "Development activity finishes the UTC day below the commit threshold.",
    };
  }

  if (signal.kind === "sentiment") {
    const deadline = utcDeadline(now, 0, 22, 0);
    const threshold = Math.max(signal.currentValue + 25, 50);
    return {
      title: `Will the X Bitcoin sample exceed ${threshold} posts at the next daily check?`,
      criteria: `Resolve YES if the stored X recent-search query returns result_count above ${threshold} at 22:00 UTC on ${deadline
        .toISOString()
        .slice(0, 10)}. Otherwise resolve NO.`,
      deadline: deadline.toISOString(),
      threshold,
      displayThreshold: `${threshold} posts`,
      yesCase: "A price move or breaking story accelerates Bitcoin discussion on X.",
      noCase: "Discussion remains steady or declines before the resolution check.",
    };
  }

  const deadline = signal.category === "AI" || signal.category === "Ritual"
    ? weekDeadline(now)
    : utcDeadline(now);
  const threshold = Math.min(25, Math.max(signal.currentValue + 3, 8));
  return {
    title: `Will ${signal.title.toLowerCase()} reach ${threshold} indexed headlines before the deadline?`,
    criteria: `Resolve YES if the same GDELT query and 24-hour window returns at least ${threshold} articles at ${deadline.toISOString()}. Otherwise resolve NO.`,
    deadline: deadline.toISOString(),
    threshold,
    displayThreshold: `${threshold} headlines`,
    yesCase: "Fresh announcements or breaking coverage increase the number of indexed reports.",
    noCase: "The topic receives too little new reporting to reach the stated count.",
  };
}
