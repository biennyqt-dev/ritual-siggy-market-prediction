"use client";

import {
  AreaSeries,
  ColorType,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef } from "react";
import type { PricePoint } from "@/lib/types";

export function MarketChart({
  data,
  status,
  theme,
}: {
  data: PricePoint[];
  status: "loading" | "live" | "delayed";
  theme: "light" | "dark";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      height: 330,
      layout: {
        background: {
          type: ColorType.Solid,
          color: theme === "dark" ? "#0d1712" : "#ffffff",
        },
        textColor: theme === "dark" ? "#9fb4a7" : "#6d766f",
        fontFamily: "var(--font-mono)",
      },
      grid: {
        vertLines: { color: theme === "dark" ? "#1c3026" : "#edf2ed" },
        horzLines: { color: theme === "dark" ? "#1c3026" : "#edf2ed" },
      },
      rightPriceScale: {
        borderColor: theme === "dark" ? "#294137" : "#dce6de",
      },
      timeScale: {
        borderColor: theme === "dark" ? "#294137" : "#dce6de",
        timeVisible: true,
      },
      crosshair: {
        vertLine: { color: "#1f9d62", labelBackgroundColor: "#12653f" },
        horzLine: { color: "#1f9d62", labelBackgroundColor: "#12653f" },
      },
    });
    const series = chart.addSeries(AreaSeries, {
      lineColor: "#168958",
      topColor: "rgba(23, 176, 105, 0.34)",
      bottomColor: "rgba(23, 176, 105, 0.01)",
      lineWidth: 3,
      priceFormat: {
        type: "custom",
        formatter: (value: number) => `${value.toFixed(1)}%`,
      },
    });

    chartRef.current = chart;
    seriesRef.current = series;
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [theme]);

  useEffect(() => {
    seriesRef.current?.setData(
      data.map((point) => ({
        time: point.time as UTCTimestamp,
        value: point.value,
      }))
    );
    if (data.length) chartRef.current?.timeScale().fitContent();
  }, [data]);

  return (
    <div className="chart-stage">
      <div
        ref={containerRef}
        className="chart-canvas"
        role="img"
        aria-label="Live market probability history"
        data-testid="market-chart"
      />
      {data.length < 2 ? (
        <div className="chart-live-state" role="status">
          <strong>
            {status === "loading"
              ? "Loading live CLOB history"
              : status === "delayed"
                ? "CLOB history is delayed"
                : "Waiting for more live price history"}
          </strong>
          <span>No generated chart points are displayed.</span>
        </div>
      ) : null}
    </div>
  );
}
