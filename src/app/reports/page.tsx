
"use client";

import { 
  Bar, 
  BarChart, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  Cell
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const reportData = [
  { name: "Services", amount: 12000, color: "hsl(var(--chart-1))" },
  { name: "Software", amount: 4500, color: "hsl(var(--chart-2))" },
  { name: "Rent", amount: 6000, color: "hsl(var(--chart-3))" },
  { name: "Marketing", amount: 3200, color: "hsl(var(--chart-4))" },
  { name: "Salaries", amount: 15000, color: "hsl(var(--chart-5))" },
];

export default function ReportsPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline text-foreground">Financial Reports</h1>
          <p className="text-muted-foreground">Analyze your business performance over time.</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="q2">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="q1">Q1 2024</SelectItem>
              <SelectItem value="q2">Q2 2024 (Current)</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>Major expense distribution for the selected period.</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                  {reportData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Efficiency Ratio</CardTitle>
              <CardDescription>Income generated vs operational costs.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="relative h-32 w-32 flex items-center justify-center rounded-full border-8 border-accent">
                  <span className="text-3xl font-bold">1.4x</span>
                </div>
                <p className="text-sm text-muted-foreground max-w-[200px]">
                  You are generating $1.40 for every $1.00 spent on operations.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Growth Potential</CardTitle>
              <CardDescription>Predicted revenue based on current lead trends.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>Projected Q3</span>
                  <span className="font-bold text-green-600">+$12,500</span>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div className="bg-accent h-full w-3/4"></div>
                </div>
                <p className="text-xs text-muted-foreground">Based on current consulting project pipeline.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
