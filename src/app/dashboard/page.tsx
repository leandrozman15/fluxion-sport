
"use client";

import { StatsCards } from "@/components/dashboard/stats-cards";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { AiReconciliationCard } from "@/components/dashboard/ai-reconciliation-card";
import { mockTransactions } from "@/lib/mock-data";

export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold font-headline text-foreground">Business Overview</h1>
        <p className="text-muted-foreground">Welcome back, let's see how VantageBiz is performing today.</p>
      </header>

      <StatsCards transactions={mockTransactions} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <PerformanceChart />
        <AiReconciliationCard />
      </div>
    </div>
  );
}
