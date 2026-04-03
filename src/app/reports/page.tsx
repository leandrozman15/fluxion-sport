
"use client";

import { useState, useEffect } from "react";
import { 
  Bar, 
  BarChart, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, Loader2, TrendingUp, CircleDollarSign, FileText, ChevronLeft } from "lucide-react";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, getDocs, doc, getDoc } from "firebase/firestore";
import Link from "next/link";

export default function ReportsPage() {
  const { firestore, user } = useFirebase();
  const [club, setClub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reportStats, setReportStats] = useState({
    totalIn: 0,
    totalOut: 0,
    efficiency: 0,
    categories: [] as any[]
  });

  useEffect(() => {
    async function fetchReportData() {
      if (!user || !firestore) return;
      try {
        const email = user.email?.toLowerCase().trim() || "";
        const userSnap = await getDoc(doc(firestore, "users", user.uid));
        const userData = userSnap.exists() ? userSnap.data() : null;
        
        if (userData?.clubId) {
          const cSnap = await getDoc(doc(firestore, "clubs", userData.clubId));
          if (cSnap.exists()) setClub({ ...cSnap.data(), id: cSnap.id });

          const transSnap = await getDocs(collection(firestore, "clubs", userData.clubId, "transactions"));
          let tin = 0, tout = 0;
          const catsMap: Record<string, number> = {};

          transSnap.forEach(d => {
            const data = d.data();
            if (data.type === 'in') tin += data.amount;
            else tout += data.amount;

            const cat = data.category || "Otros";
            catsMap[cat] = (catsMap[cat] || 0) + data.amount;
          });

          setReportStats({
            totalIn: tin,
            totalOut: tout,
            efficiency: tout > 0 ? Number((tin / tout).toFixed(2)) : tin > 0 ? 10 : 0,
            categories: Object.entries(catsMap).map(([name, amount], i) => ({
              name,
              amount,
              color: `hsl(var(--chart-${(i % 5) + 1}))`
            }))
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchReportData();
  }, [user, firestore]);

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-white h-12 w-12" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/dashboard" className="ambient-link group w-fit mb-4">
            <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Volver al panel
          </Link>
          <h1 className="text-4xl font-black font-headline text-white drop-shadow-md">Informes de Gestión</h1>
          <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] mt-1">{club?.name || 'Fluxion'} • Análisis de rendimiento institucional.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white hover:text-primary font-black uppercase text-[10px] tracking-widest h-12 px-6">
            <Download className="h-4 w-4 mr-2" /> Exportar PDF
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader className="bg-slate-50 border-b py-6 px-8">
            <CardTitle className="text-xl font-black text-slate-900 uppercase">Distribución de Gastos</CardTitle>
            <CardDescription className="font-bold text-slate-500">Principales egresos del periodo.</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px] pt-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportStats.categories} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} className="font-bold text-[10px] uppercase text-slate-400" />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', fontWeight: 'bold'}}
                />
                <Bar dataKey="amount" radius={[0, 8, 8, 0]}>
                  {reportStats.categories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-8">
          <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-primary text-primary-foreground">
              <CardTitle className="text-xl font-black uppercase tracking-tight">Ratio de Eficiencia</CardTitle>
              <CardDescription className="text-primary-foreground/80 font-medium">Ingresos generados vs costos operativos.</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="flex flex-col items-center justify-center text-center space-y-6">
                <div className="relative h-40 w-40 flex items-center justify-center rounded-full border-[12px] border-accent shadow-2xl shadow-accent/20">
                  <span className="text-5xl font-black text-slate-900">{reportStats.efficiency}x</span>
                </div>
                <p className="text-sm text-slate-500 max-w-[250px] font-bold leading-relaxed">
                  {reportStats.efficiency > 1 
                    ? `Estás generando $${reportStats.efficiency} por cada $1.00 invertido en la operación.` 
                    : "El ratio de ingresos está por debajo del punto de equilibrio operativo."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden border-l-8 border-l-accent">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Resumen Financiero Total</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-8 pt-4">
              <div className="flex justify-between items-center border-b pb-4">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Ingresos</span>
                <span className="text-3xl font-black text-green-600">${reportStats.totalIn.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Egresos</span>
                <span className="text-3xl font-black text-red-600">${reportStats.totalOut.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
