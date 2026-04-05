
"use client";

import { useState, useEffect } from "react";
import { 
  CreditCard, 
  Loader2, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  LayoutDashboard,
  ShieldCheck,
  Star,
  Table as TableIcon,
  ShoppingBag,
  Trophy
} from "lucide-react";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SectionNav } from "@/components/layout/section-nav";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export default function PlayerPaymentsView() {
  const { firestore, user } = useFirebase();
  const [playerInfo, setPlayerInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlayerData() {
      if (!user || !firestore) return;
      try {
        const email = user.email?.toLowerCase().trim() || "";
        const playerSnap = await getDocs(query(collection(firestore, "all_players_index"), where("email", "==", email)));
        if (!playerSnap.empty) {
          const pData = playerSnap.docs[0].data();
          setPlayerInfo(pData);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    fetchPlayerData();
  }, [user, firestore]);

  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore || !playerInfo) return null;
    // Simplificamos la consulta eliminando orderBy para evitar necesidad de índices compuestos en prototipo
    return collection(firestore, "clubs", playerInfo.clubId, "players", playerInfo.id, "payments");
  }, [firestore, playerInfo]);

  const { data: rawPayments, isLoading: paymentsLoading } = useCollection(paymentsQuery);

  // Ordenamos en memoria para evitar errores de índice en Firestore
  const payments = rawPayments?.sort((a: any, b: any) => {
    if (b.year !== a.year) return b.year - a.year;
    return b.month - a.month;
  });

  const playerNav = [
    { title: "Inicio Hub", href: "/dashboard/player", icon: LayoutDashboard },
    { title: "Mi Carnet", href: "/dashboard/player/id-card", icon: ShieldCheck },
    { title: "Estadísticas", href: "/dashboard/player/stats", icon: Star },
    { title: "Tablas/Fixture", href: "/dashboard/standings-fixture", icon: Trophy },
    { title: "Pagos", href: "/dashboard/player/payments", icon: CreditCard },
    { title: "Tienda Club", href: playerInfo ? `/dashboard/clubs/${playerInfo.clubId}/shop` : "/dashboard/player", icon: ShoppingBag },
  ];

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-white h-12 w-12" /></div>;

  if (!playerInfo) return (
    <div className="flex flex-col md:flex-row gap-8 min-h-screen">
      <SectionNav items={playerNav} basePath="/dashboard/player" />
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
        <AlertCircle className="h-16 w-16 text-white opacity-20 mb-4" />
        <h2 className="text-2xl font-black text-white">Perfil no vinculado</h2>
        <p className="text-white/60 max-w-sm">No hemos encontrado un jugador asociado a {user?.email}</p>
      </div>
    </div>
  );



  return (
    <div className="flex flex-col md:flex-row gap-8 animate-in fade-in duration-500">
      <SectionNav items={playerNav} basePath="/dashboard/player" />
      
      <div className="flex-1 space-y-8 pb-24">
        <header>
          <h1 className="text-4xl font-black font-headline text-white drop-shadow-md">Mis Mensualidades</h1>
          <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] mt-1">Estado de cuenta y control de pagos institucionales.</p>
        </header>

        <Card className="border-none shadow-2xl overflow-hidden bg-white/95 backdrop-blur-md rounded-[2rem]">
          <CardHeader className="bg-slate-50 border-b border-slate-100 py-6 px-8">
            <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tighter">Historial de Movimientos</CardTitle>
            <CardDescription className="font-medium text-slate-500">Registro detallado de tus cuotas sociales.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {paymentsLoading ? (
              <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-none bg-slate-50/50">
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400 pl-8">Periodo</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Monto</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Estado</TableHead>
                    <TableHead className="text-right font-black uppercase text-[10px] tracking-widest text-slate-400 pr-8">Referencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments?.map((p: any) => (
                    <TableRow key={p.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors h-16">
                      <TableCell className="font-black text-slate-900 pl-8 uppercase text-xs">
                        {MONTHS[p.month - 1]} {p.year}
                      </TableCell>
                      <TableCell className="font-black text-slate-700">${(p.amount || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        {p.status === 'paid' ? (
                          <Badge className="bg-green-100 text-green-700 border-none font-black text-[9px] uppercase px-3 py-1">Pagado</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-none font-black text-[9px] uppercase px-3 py-1">Pendiente</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-8 text-[10px] font-bold text-slate-400 uppercase">
                        {p.paymentDate ? `Abonado el ${new Date(p.paymentDate).toLocaleDateString()}` : "Sin procesar"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!payments || payments.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-32 text-slate-300 font-black uppercase tracking-widest text-xs italic">
                        No hay registros de pago en tu cuenta corriente.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
