
"use client";

import { useState, useEffect } from "react";
import { 
  CreditCard, 
  Loader2, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

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
        const clubsSnap = await getDocs(collection(firestore, "clubs"));
        for (const clubDoc of clubsSnap.docs) {
          const pSnap = await getDocs(query(
            collection(firestore, "clubs", clubDoc.id, "players"), 
            where("email", "==", user.email || "")
          ));
          if (!pSnap.empty) {
            setPlayerInfo({ ...pSnap.docs[0].data(), clubId: clubDoc.id });
            break;
          }
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    fetchPlayerData();
  }, [user, firestore]);

  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore || !playerInfo) return null;
    return query(
      collection(firestore, "clubs", playerInfo.clubId, "players", playerInfo.id, "payments"),
      orderBy("year", "desc"),
      orderBy("month", "desc")
    );
  }, [firestore, playerInfo]);

  const { data: payments, isLoading: paymentsLoading } = useCollection(paymentsQuery);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  if (!playerInfo) return (
    <div className="text-center py-20 px-4">
      <AlertCircle className="h-16 w-16 mx-auto text-muted-foreground opacity-20 mb-4" />
      <h2 className="text-xl font-bold">Perfil no vinculado</h2>
      <p className="text-muted-foreground mt-2">No hemos encontrado un jugador asociado a {user?.email}</p>
    </div>
  );

  const totalDebt = payments?.filter(p => p.status !== 'paid').reduce((acc, p) => acc + p.amount, 0) || 0;
  const totalPaid = payments?.filter(p => p.status === 'paid').reduce((acc, p) => acc + p.amount, 0) || 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold font-headline text-foreground">Mis Mensualidades</h1>
        <p className="text-muted-foreground">Estado de cuenta y control de pagos.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" /> Deuda Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">${totalDebt}</div>
            <p className="text-xs text-muted-foreground">Meses pendientes o vencidos</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" /> Total Pagado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${totalPaid}</div>
            <p className="text-xs text-muted-foreground">Suma de cuotas abonadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Estado de Cuenta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
             <div className="flex justify-between text-xs font-bold mb-1">
               <span>Progreso Anual</span>
               <span>{totalDebt === 0 && totalPaid > 0 ? "100%" : "Al día"}</span>
             </div>
             <Progress value={totalDebt === 0 ? 100 : (totalPaid / (totalPaid + totalDebt)) * 100} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historial Reciente</CardTitle>
        </CardHeader>
        <CardContent>
          {paymentsLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mes</TableHead>
                  <TableHead>Año</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Referencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments?.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-bold">{MONTHS[p.month - 1]}</TableCell>
                    <TableCell>{p.year}</TableCell>
                    <TableCell>${p.amount}</TableCell>
                    <TableCell>
                      {p.status === 'paid' ? (
                        <Badge className="bg-green-100 text-green-700">Pagado</Badge>
                      ) : p.status === 'overdue' ? (
                        <Badge variant="destructive">Vencido</Badge>
                      ) : (
                        <Badge variant="secondary">Pendiente</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.paymentDate ? `Pagado el ${new Date(p.paymentDate).toLocaleDateString()}` : "Sin fecha"}
                    </TableCell>
                  </TableRow>
                ))}
                {(!payments || payments.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      No tienes registros de pago todavía.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
