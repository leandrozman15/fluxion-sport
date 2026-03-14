
"use client";

import { TrendingUp, TrendingDown, CircleDollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Transaction } from "@/lib/mock-data";

export function StatsCards({ transactions }: { transactions: Transaction[] }) {
  const revenue = transactions
    .filter((t) => t.type === "revenue")
    .reduce((acc, t) => acc + t.amount, 0);
  const expenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((acc, t) => acc + t.amount, 0);
  const profit = revenue - expenses;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <TrendingUp className="h-4 w-4 text-accent" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-headline">${revenue.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">+12.5% from last month</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          <TrendingDown className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-headline">${expenses.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">-4% from last month</p>
        </CardContent>
      </Card>
      <Card className="bg-primary text-primary-foreground">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
          <CircleDollarSign className="h-4 w-4 opacity-70" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-headline">${profit.toLocaleString()}</div>
          <p className="text-xs opacity-70">+18% growth overall</p>
        </CardContent>
      </Card>
    </div>
  );
}
