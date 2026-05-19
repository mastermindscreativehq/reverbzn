"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TrendPoint } from "@/lib/types";

interface RzAreaChartProps {
  data: TrendPoint[];
  color?: string;
  label?: string;
  height?: number;
  formatter?: (value: number) => string;
}

export function RzAreaChart({
  data,
  color = "oklch(0.78 0.16 196)",
  label = "Value",
  height = 200,
  formatter,
}: RzAreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "oklch(0.52 0.02 250)", fontFamily: "var(--font-geist-mono)" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: "oklch(0.52 0.02 250)", fontFamily: "var(--font-geist-mono)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => formatter ? formatter(v) : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toString()}
          width={40}
        />
        <Tooltip
          contentStyle={{
            background: "oklch(0.115 0.012 260)",
            border: "1px solid oklch(1 0 0 / 10%)",
            borderRadius: "8px",
            fontSize: "12px",
            fontFamily: "var(--font-geist-mono)",
            color: "oklch(0.94 0.008 250)",
          }}
          formatter={(value) => {
            const v = Number(value ?? 0);
            return [formatter ? formatter(v) : v.toLocaleString(), label] as [string, string];
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#grad-${label})`}
          dot={false}
          activeDot={{ r: 4, fill: color, stroke: "oklch(0.115 0.012 260)", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
