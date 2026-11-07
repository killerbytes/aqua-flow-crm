"use client";

import { useState } from "react";

export interface SalesDay {
  /** YYYY-MM-DD in Philippine time */
  date: string;
  sales: number;
  orderCount: number;
}

const WIDTH = 560;
const HEIGHT = 200;
const PAD = { top: 22, right: 8, bottom: 26, left: 44 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;
const MAX_BAR_W = 24;
const RADIUS = 4;

const peso = (amount: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    amount,
  );

const dayLabel = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

/** A round axis maximum just above the data, so the bars use the height. */
const niceMax = (value: number) => {
  if (value <= 0) return 1000;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(
    (m) => m * power >= value,
  )!;
  return step * power;
};

const tickLabel = (value: number, axisMax: number) =>
  axisMax >= 10000
    ? `${(value / 1000).toLocaleString("en-PH", { maximumFractionDigits: 1 })}K`
    : value.toLocaleString("en-PH");

/** Column with a 4px rounded top and a square base on the baseline. */
const columnPath = (x: number, y: number, w: number, h: number) => {
  const r = Math.min(RADIUS, h, w / 2);
  const base = y + h;
  return `M${x},${base} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${base} Z`;
};

export function SalesTrendChart({ days }: { days: SalesDay[] }) {
  const [active, setActive] = useState<number | null>(null);

  const axisMax = niceMax(Math.max(...days.map((d) => d.sales)));
  const ticks = [0, axisMax / 2, axisMax];
  const slot = PLOT_W / days.length;
  const barW = Math.min(MAX_BAR_W, slot - 2);
  const y = (value: number) => PAD.top + PLOT_H - (value / axisMax) * PLOT_H;
  const peak = days.reduce(
    (best, d, i) => (d.sales > days[best].sales ? i : best),
    0,
  );
  const total = days.reduce((sum, d) => sum + d.sales, 0);

  const activeDay = active === null ? null : days[active];
  const tooltipLeft =
    active === null ? 0 : ((PAD.left + slot * active + slot / 2) / WIDTH) * 100;

  return (
    <div className="space-y-2">
      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full h-auto"
          role="img"
          aria-label={`Delivered sales for the last ${days.length} days, ${peso(total)} in total`}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={WIDTH - PAD.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke="var(--border)"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 6}
                y={y(tick)}
                dy="0.32em"
                textAnchor="end"
                className="fill-muted-foreground text-[11px] tabular-nums"
              >
                {tickLabel(tick, axisMax)}
              </text>
            </g>
          ))}

          {days.map((day, i) => {
            const x = PAD.left + slot * i + (slot - barW) / 2;
            const h = (day.sales / axisMax) * PLOT_H;
            const isActive = active === i;
            return (
              <g
                key={day.date}
                tabIndex={0}
                role="button"
                aria-label={`${dayLabel(day.date)}: ${peso(day.sales)} from ${day.orderCount} orders`}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className="outline-none"
              >
                {/* The whole column slot is the hover target, not just the bar. */}
                <rect
                  x={PAD.left + slot * i}
                  y={PAD.top}
                  width={slot}
                  height={PLOT_H}
                  fill="currentColor"
                  fillOpacity={0}
                />
                {h > 0 && (
                  <path
                    d={columnPath(x, y(day.sales), barW, h)}
                    fill="var(--chart-1)"
                    opacity={active === null || isActive ? 1 : 0.55}
                  />
                )}
                {isActive && (
                  <rect
                    x={x - 2}
                    y={PAD.top}
                    width={barW + 4}
                    height={PLOT_H}
                    fill="none"
                    stroke="var(--foreground)"
                    strokeOpacity={0.25}
                    rx={RADIUS}
                  />
                )}
              </g>
            );
          })}

          {days[peak].sales > 0 && active === null && (
            <text
              x={PAD.left + slot * peak + slot / 2}
              y={y(days[peak].sales) - 6}
              textAnchor="middle"
              className="fill-foreground text-[11px] font-medium"
            >
              {peso(days[peak].sales)}
            </text>
          )}

          {[0, days.length - 1].map((i) => (
            <text
              key={i}
              x={PAD.left + slot * i + slot / 2}
              y={HEIGHT - 8}
              textAnchor={i === 0 ? "start" : "end"}
              className="fill-muted-foreground text-[11px]"
            >
              {i === days.length - 1 ? "Today" : dayLabel(days[i].date)}
            </text>
          ))}
        </svg>

        {activeDay && (
          <div
            className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-sm whitespace-nowrap"
            style={{ left: `${tooltipLeft}%` }}
          >
            <div className="font-medium">{dayLabel(activeDay.date)}</div>
            <div>{peso(activeDay.sales)}</div>
            <div className="text-muted-foreground">
              {activeDay.orderCount} delivered order
              {activeDay.orderCount === 1 ? "" : "s"}
            </div>
          </div>
        )}
      </div>

      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer select-none">Show as table</summary>
        <table className="mt-2 w-full">
          <thead>
            <tr className="text-left">
              <th className="py-1 font-medium">Day</th>
              <th className="py-1 font-medium text-right">Orders</th>
              <th className="py-1 font-medium text-right">Sales</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {days.map((day) => (
              <tr key={day.date}>
                <td className="py-0.5">{dayLabel(day.date)}</td>
                <td className="py-0.5 text-right">{day.orderCount}</td>
                <td className="py-0.5 text-right">{peso(day.sales)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
