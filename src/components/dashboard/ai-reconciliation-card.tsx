
"use client";

import { useState } from "react";
import { Sparkles, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { suggestFinancialReconciliation, SuggestFinancialReconciliationOutput } from "@/ai/flows/suggest-financial-reconciliation-flow";
import { mockTransactions } from "@/lib/mock-data";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function AiReconciliationCard() {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestFinancialReconciliationOutput['suggestions'] | null>(null);

  const handleSuggest = async () => {
    setLoading(true);
    try {
      // Pass a subset of transactions for analysis
      const result = await suggestFinancialReconciliation({
        transactions: mockTransactions.map(t => ({
          id: t.id,
          amount: t.amount,
          date: t.date,
          description: t.description,
          category: t.category
        })),
        prioritizedCategories: ["Consulting Fees", "Office Supplies", "Rent", "Utilities"]
      });
      setSuggestions(result.suggestions);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          Smart Financial Assistant
        </CardTitle>
        <CardDescription>
          AI-driven insights to keep your records accurate.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!suggestions && !loading && (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Run the smart assistant to identify uncategorized expenses or unusual spending patterns.
            </p>
            <Button onClick={handleSuggest} className="w-full">
              Analyze Transactions
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center p-8 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Analyzing records...</p>
          </div>
        )}

        {suggestions && (
          <div className="space-y-3">
            {suggestions.length === 0 ? (
              <Alert variant="default" className="border-accent">
                <CheckCircle2 className="h-4 w-4 text-accent" />
                <AlertTitle>All caught up!</AlertTitle>
                <AlertDescription>Your financial records look clean and organized.</AlertDescription>
              </Alert>
            ) : (
              suggestions.map((s, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-lg bg-secondary/30 border border-secondary">
                  <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold">{s.description}</p>
                    <p className="text-xs text-muted-foreground">{s.reason}</p>
                  </div>
                </div>
              ))
            )}
            <Button variant="outline" size="sm" onClick={() => setSuggestions(null)} className="w-full">
              Clear Analysis
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
