"use client";

import { useMemo } from "react";

type Point = {
  date: string;
  clicks: number;
  conversions: number;
  approved: number;
};

export function TimeSeriesChart({
  data,
  height = 200,
}: {
  data: Point[];
  height?: number;
}) {
  const max = useMemo(() => {
    const m = Math.max(
      1,
      ...data.flatMap((d) => [d.clicks, d.conversions, d.approved]),
    );
    // Round up to a nice number.
    const pow = Math.pow(10, Math.floor(Math.log10(m)));
    const rounded = Math.ceil(m / pow) * pow;
    return rounded;
  }, [data]);

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  if (data.length === 0) {
    return (
      <p className="text-sm text-text-muted">No activity in this window.</p>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 text-xs text-text-muted">
        <Legend color="bg-brand-500" label="Clicks" />
        <Legend color="bg-amber-500" label="Conversions" />
        <Legend color="bg-emerald-500" label="Approved" />
      </div>

      <div
        className="relative mt-4 w-full"
        style={{ height: `${height}px` }}
      >
        {/* Y-axis grid lines */}
        {gridLines.map((ratio) => (
          <div
            key={ratio}
            className="absolute inset-x-0 border-t border-dashed border-border/60"
            style={{ bottom: `${ratio * 100}%` }}
          >
            <span className="absolute -top-2 right-0 -translate-y-1/2 bg-surface-1 px-1 text-[10px] text-text-subtle">
              {Math.round(max * ratio)}
            </span>
          </div>
        ))}

        {/* Bars */}
        <div className="absolute inset-0 flex items-end gap-[2px]">
          {data.map((point) => (
            <div
              key={point.date}
              className="group flex h-full flex-1 items-end gap-[1px]"
              title={`${point.date}\n${point.clicks} clicks\n${point.conversions} conversions\n${point.approved} approved`}
            >
              <div
                className="flex-1 rounded-t-sm bg-brand-500/70 transition group-hover:bg-brand-400"
                style={{
                  height: `${(point.clicks / max) * 100}%`,
                  minHeight: point.clicks > 0 ? 2 : 0,
                }}
              />
              <div
                className="flex-1 rounded-t-sm bg-amber-500/70 transition group-hover:bg-amber-400"
                style={{
                  height: `${(point.conversions / max) * 100}%`,
                  minHeight: point.conversions > 0 ? 2 : 0,
                }}
              />
              <div
                className="flex-1 rounded-t-sm bg-emerald-500/70 transition group-hover:bg-emerald-400"
                style={{
                  height: `${(point.approved / max) * 100}%`,
                  minHeight: point.approved > 0 ? 2 : 0,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* X-axis labels — first / middle / last */}
      <div className="mt-2 flex justify-between text-[10px] text-text-subtle">
        <span>{data[0]?.date}</span>
        {data.length > 4 && (
          <span>{data[Math.floor(data.length / 2)]?.date}</span>
        )}
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-sm ${color}`} />
      {label}
    </span>
  );
}
