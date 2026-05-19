"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface BarData {
  label: string;
  value: number;
  color?: string;
}

interface RzBarChartProps {
  data: BarData[];
  color?: string;
  height?: number;
  formatter?: (value: number) => string;
  horizontal?: boolean;
}

export function RzBarChart({
  data,
  color = "oklch(0.78 0.16 196)",
  height = 200,
  formatter,
  horizontal = false,
}: RzBarChartProps) {
  const chartData = data.map(d => ({ ...d, name: d.label }));

  if (horizontal) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: "oklch(0.52 0.02 250)", fontFamily: "var(--font-geist-mono)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => formatter ? formatter(v) : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toString()}
          />
          <YAxis
            dataKey="name"
            type="category"
            tick={{ fontSize: 10, fill: "oklch(0.52 0.02 250)", fontFamily: "var(--font-geist-mono)" }}
            axisLine={false}
            tickLine={false}
            width={80}
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
              return [formatter ? formatter(v) : v.toLocaleString(), "Streams"] as [string, string];
            }}
          />
          <Bar dataKey="value" radius={[0, 3, 3, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color ?? color} opacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: "oklch(0.52 0.02 250)", fontFamily: "var(--font-geist-mono)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "oklch(0.52 0.02 250)", fontFamily: "var(--font-geist-mono)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toString()}
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
            return [formatter ? formatter(v) : v.toLocaleString()] as [string];
          }}
        />
        <Bar dataKey="value" radius={[3, 3, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color ?? color} opacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
