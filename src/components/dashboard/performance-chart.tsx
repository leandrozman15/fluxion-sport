
"use client";

import { Bar, BarChart, CartesianGrid, XAxis, ResponsiveContainer, YAxis, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Loader2, TrendingUp } from "lucide-react";

const chartConfig = {
  revenue: {
    label: "Ingresos",
    color: "hsl(var(--primary))",
  },
  expenses: {
    label: "Gastos",
    color: "hsl(var(--destructive))",
  },
} satisfies ChartConfig;

export function PerformanceChart({ data = [], isLoading = false }: { data?: any[], isLoading?: boolean }) {
  if (isLoading) return (
    <Card className="col-span-1 md:col-span-2">
      <CardContent className="h-[300px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
      </CardContent>
    </Card>
  );

  return (
    <Card className="col-span-1 md:col-span-2 border-none shadow-2xl bg-white rounded-[2rem] overflow-hidden">
      <CardHeader className="bg-slate-50 border-b border-slate-100">
        <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" /> Rendimiento Financiero
        </CardTitle>
        <CardDescription className="font-bold text-slate-500 italic">Comparativa mensual de flujos de caja.</CardDescription>
      </CardHeader>
      <CardContent className="pt-8">
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.length > 0 ? data : [{ month: "Sin Datos", revenue: 0, expenses: 0 }]}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="month"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                className="font-black text-[10px] uppercase tracking-widest text-slate-400"
              />
              <YAxis hide />
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
