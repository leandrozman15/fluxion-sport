
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { 
  ChevronLeft, 
  Loader2, 
  Plus, 
  CreditCard, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Clock, 
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, setDoc, query, orderBy } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export default function PlayerPaymentsPage() {
  const { clubId, playerId } = useParams() as { clubId: string, playerId: string };
  const db = useFirestore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPayment, setNewPayment] = useState({ 
    month: new Date().getMonth() + 1, 
    year: new Date().getFullYear(), 
    amount: 50,
    status: "paid",
    paymentMethod: "Efectivo"
  });

  const playerRef = useMemoFirebase(() => doc(db, "clubs", clubId, "players", playerId), [db, clubId, playerId]);
  const { data: player, isLoading: playerLoading } = useDoc(playerRef);

  const paymentsQuery = useMemoFirebase(() => 
    query(collection(db, "clubs", clubId, "players", playerId, "payments"), orderBy("year", "desc"), orderBy("month", "desc")),
    [db, clubId, playerId]
  );
  const { data: payments, isLoading: paymentsLoading } = useCollection(paymentsQuery);

  const handleRegisterPayment = () => {
    const paymentId = doc(collection(db, "clubs", clubId, "players", playerId, "payments")).id;
    const paymentDoc = doc(db, "clubs", clubId, "players", playerId, "payments", paymentId);
    
    setDoc(paymentDoc, {
      ...newPayment,
      id: paymentId,
      playerId,
      paymentDate: newPayment.status === 'paid' ? new Date().toISOString() : null,
      createdAt: new Date().toISOString()
    });
    
    setIsDialogOpen(false);
  };

  const handleUpdateStatus = (paymentId: string, newStatus: string) => {
    const paymentDoc = doc(db, "clubs", clubId, "players", playerId, "payments", paymentId);
    setDoc(paymentDoc, { 
      status: newStatus,
      paymentDate: newStatus === 'paid' ? new Date().toISOString() : null
    }, { merge: true });
  };

  if (playerLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <Badge className="bg-green-100 text-green-700 hover:bg-green-200">Pagado</Badge>;
      case 'pending': return <Badge variant="secondary">Pendiente</Badge>;
      case 'overdue': return <Badge variant="destructive">Vencido</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4">
        <Link href={`/dashboard/clubs/${clubId}/players`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors w-fit">
          <ChevronLeft className="h-4 w-4" /> Volver a jugadores
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline text-foreground">Pagos: {player?.firstName} {player?.lastName}</h1>
            <p className="text-muted-foreground">Historial de cuotas y mensualidades del deportista.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> Registrar Cobro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo Pago</DialogTitle>
                <DialogDescription>Registra el cobro de una cuota mensual.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mes</Label>
                    <Select value={String(newPayment.month)} onValueChange={v => setNewPayment({...newPayment, month: parseInt(v)})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Año</Label>
                    <Input type="number" value={newPayment.year} onChange={e => setNewPayment({...newPayment, year: parseInt(e.target.value)})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Monto</Label>
                  <Input type="number" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: parseInt(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label>Método de Pago</Label>
                  <Input value={newPayment.paymentMethod} onChange={e => setNewPayment({...newPayment, paymentMethod: e.target.value})} placeholder="Ej. Efectivo, Transferencia" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleRegisterPayment}>Guardar Pago</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" /> Historial de Pagos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paymentsLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Pago</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments?.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{MONTHS[p.month - 1]} {p.year}</TableCell>
                      <TableCell>${p.amount}</TableCell>
                      <TableCell>{getStatusBadge(p.status)}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.status !== 'paid' && (
                          <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(p.id, 'paid')}>
                            Marcar Pagado
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {payments?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No hay registros de pago para este jugador.
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
