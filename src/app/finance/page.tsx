
"use client";

import { useState } from "react";
import { Plus, Search, Tag, Sparkles } from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockTransactions, Transaction } from "@/lib/mock-data";
import { categorizeTransaction } from "@/ai/flows/categorize-transaction-flow";

export default function FinancePage() {
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [searchTerm, setSearchTerm] = useState("");
  const [catLoading, setCatLoading] = useState<string | null>(null);

  const filtered = transactions.filter(t => 
    t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAiCategorize = async (id: string, description: string) => {
    setCatLoading(id);
    try {
      const res = await categorizeTransaction({ description });
      if (res.suggestedCategories.length > 0) {
        setTransactions(prev => prev.map(t => 
          t.id === id ? { ...t, category: res.suggestedCategories[0] } : t
        ));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCatLoading(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline text-foreground">Financial Tracking</h1>
          <p className="text-muted-foreground">Manage your revenue and expense transactions.</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Transaction
        </Button>
      </header>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Transactions</CardTitle>
              <CardDescription>A list of your latest business financial movements.</CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search description..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.date}</TableCell>
                  <TableCell>{t.description}</TableCell>
                  <TableCell>
                    {t.category ? (
                      <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                        <Tag className="h-3 w-3" /> {t.category}
                      </Badge>
                    ) : (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-accent hover:text-accent hover:bg-accent/10"
                        onClick={() => handleAiCategorize(t.id, t.description)}
                        disabled={catLoading === t.id}
                      >
                        {catLoading === t.id ? (
                          "Categorizing..."
                        ) : (
                          <span className="flex items-center gap-1">
                            <Sparkles className="h-3 w-3" /> AI Categorize
                          </span>
                        )}
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className={t.type === 'revenue' ? 'text-green-600 font-bold' : 'text-destructive font-bold'}>
                    {t.type === 'revenue' ? '+' : '-'}${t.amount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Edit</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
