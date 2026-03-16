
"use client";

import { useParams } from "next/navigation";
import { 
  CreditCard, 
  ChevronLeft, 
  Loader2, 
  LayoutDashboard, 
  ShieldCheck, 
  Layers, 
  UserRound, 
  Users,
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
  Download,
  Plus
} from "lucide-react";
import Link from "next/link";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { SectionNav } from "@/components/layout/section-nav";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function ClubFinancesPage() {
  const { clubId } = useParams() as { clubId: string };
  const db = useFirestore();

  const clubRef = useMemoFirebase(() => doc(db, "clubs", clubId), [db, clubId]);
  const { data: club, isLoading: clubLoading } = useDoc(clubRef);

  const clubNav = [
    { title: "Panel General", href: `/dashboard/clubs/${clubId}`, icon: LayoutDashboard },
    { title: "Administración", href: `/dashboard/clubs/${clubId}/admin`, icon: ShieldCheck },
    { title: "Divisiones", href: `/dashboard/clubs/${clubId}/divisions`, icon: Layers },
    { title: "Staff Técnico", href: `/dashboard/clubs/${clubId}/coaches`, icon: UserRound },
    { title: "Base Jugadores", href: `/dashboard/clubs/${clubId}/players`, icon: Users },
    { title: "Finanzas", href: `/dashboard/clubs/${clubId}/finances`, icon: CreditCard },
  ];

  if (clubLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold font-headline text-foreground">Tesorería: {club?.name}</h1>
            <p className="text-muted-foreground">Control de ingresos por cuotas y gastos operativos.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2"><Download className="h-4 w-4" /> Exportar Balance</Button>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nuevo Movimiento</Button>
          </div>
        </div>
        <SectionNav items={clubNav} basePath={`/dashboard/clubs/${clubId}`} />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-green-50/50">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-green-800">Ingresos del Mes</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-green-700">$142.500</div>
            <p className="text-[10px] text-green-600 font-bold uppercase mt-1">+12% vs mes anterior</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50/50">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-red-800">Egresos (Gasto Fijo)</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-red-700">$98.200</div>
            <p className="text-[10px] text-red-600 font-bold uppercase mt-1">Salarios y Mantenimiento</p>
          </CardContent>
        </Card>
        <Card className="bg-primary text-primary-foreground border-none shadow-lg">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium opacity-90">Superávit Operativo</CardTitle>
            <CircleDollarSign className="h-4 w-4 opacity-70" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">$44.300</div>
            <p className="text-[10px] opacity-70 font-bold uppercase mt-1">Disponible en fondo</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Últimos Movimientos</CardTitle>
            <CardDescription>Registro de caja diaria.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { date: "20/05", desc: "Cuotas 7ma Div", cat: "Ingreso", amt: 12000, type: "in" },
                  { date: "18/05", desc: "Pago Luz Predio", cat: "Mantenimiento", amt: 15400, type: "out" },
                  { date: "15/05", desc: "Sueldos Staff", cat: "Recursos Humanos", amt: 45000, type: "out" },
                  { date: "12/05", desc: "Venta Indumentaria", cat: "Ingreso", amt: 8500, type: "in" },
                ].map((m, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-muted-foreground">{m.date}</TableCell>
                    <TableCell className="font-medium">{m.desc}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[9px]">{m.cat}</Badge></TableCell>
                    <TableCell className={`text-right font-bold ${m.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                      {m.type === 'in' ? '+' : '-'}${m.amt}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-widest">Cobranza por División</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Primera Damas", perc: 95, color: "bg-green-500" },
              { label: "Quinta División", perc: 78, color: "bg-primary" },
              { label: "Séptima División", perc: 62, color: "bg-orange-500" },
              { label: "Mamis Hockey", perc: 88, color: "bg-green-500" },
            ].map((d, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span>{d.label}</span>
                  <span>{d.perc}%</span>
                </div>
                <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                  <div className={`${d.color} h-full`} style={{ width: `${d.perc}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter className="border-t pt-4">
            <Button variant="outline" size="sm" className="w-full text-xs">Ver detalle de morosos</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
