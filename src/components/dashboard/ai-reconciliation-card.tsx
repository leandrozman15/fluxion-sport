
"use client";

import { useState, useEffect } from "react";
import { Sparkles, Loader2, AlertCircle, CheckCircle2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { suggestFinancialReconciliation, SuggestFinancialReconciliationOutput } from "@/ai/flows/suggest-financial-reconciliation-flow";
import { useFirebase } from "@/firebase";
import { collection, query, getDocs, limit, orderBy } from "firebase/firestore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function AiReconciliationCard({ clubId }: { clubId: string }) {
  const { firestore } = useFirebase();
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestFinancialReconciliationOutput['suggestions'] | null>(null);

  const handleSuggest = async () => {
    if (!firestore || !clubId) return;
    setLoading(true);
    try {
      const q = query(collection(firestore, "clubs", clubId, "transactions"), orderBy("createdAt", "desc"), limit(20));
      const snap = await getDocs(q);
      const transactions = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          amount: data.amount,
          date: data.createdAt?.split('T')[0] || (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })(),
          description: data.concept,
          category: data.category
        };
      });

      if (transactions.length === 0) {
        setSuggestions([]);
        return;
      }

      const result = await suggestFinancialReconciliation({
        transactions,
        prioritizedCategories: ["Cuotas Sociales", "Indumentaria", "Mantenimiento", "Sueldos Staff"]
      });
      setSuggestions(result.suggestions);
    } catch (error) {
      console.error("AI Reconciliation Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-none shadow-2xl bg-white rounded-[2rem] overflow-hidden group">
      <CardHeader className="bg-slate-50 border-b border-slate-100 p-8">
        <CardTitle className="flex items-center gap-3 text-xl font-black text-slate-900 uppercase tracking-tighter">
          <div className="bg-primary/10 p-2 rounded-xl">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          Asistente Inteligente
        </CardTitle>
        <CardDescription className="font-bold text-slate-500 italic">
          IA de Fluxion analizando tus registros contables en Firestore.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-8">
        {!suggestions && !loading && (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-6">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-relaxed max-w-[200px]">
              Analiza los últimos movimientos para detectar patrones o faltantes.
            </p>
            <Button onClick={handleSuggest} className="w-full h-12 font-black uppercase text-[10px] tracking-widest shadow-xl rounded-xl">
              Ejecutar Auditoría IA
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">Procesando Libros...</p>
          </div>
        )}

        {suggestions && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            {suggestions.length === 0 ? (
              <div className="bg-green-50 border-2 border-green-100 rounded-2xl p-6 text-center">
                <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
                <p className="text-sm font-black text-green-900 uppercase">Caja Sincronizada</p>
                <p className="text-[10px] font-bold text-green-600 uppercase mt-1">No se detectaron irregularidades.</p>
              </div>
            ) : (
              suggestions.map((s, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 hover:border-primary/20 transition-all group/item">
                  <div className="bg-white p-2 rounded-xl shadow-sm self-start">
                    <AlertCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-slate-900 uppercase leading-none">{s.description}</p>
                    <p className="text-[10px] text-slate-500 font-bold mt-2 leading-relaxed italic">"{s.reason}"</p>
                  </div>
                </div>
              ))
            )}
            <Button variant="ghost" size="sm" onClick={() => setSuggestions(null)} className="w-full text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-primary">
              Limpiar Auditoría
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
