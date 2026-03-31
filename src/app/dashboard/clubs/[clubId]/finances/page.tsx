
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  CreditCard, 
  Loader2, 
  LayoutDashboard, 
  Layers, 
  UserRound, 
  Users,
  TrendingUp, 
  TrendingDown, 
  CircleDollarSign,
  Download,
  Plus,
  ShoppingBag,
  CheckCircle2,
  DollarSign,
  ArrowRightLeft
} from "lucide-react";
import Link from "next/link";
import { useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, setDoc, query, orderBy, limit } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { SectionNav } from "@/components/layout/section-nav";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export default function ClubFinancesPage() {
  const { clubId } = useParams() as { clubId: string };
  const db = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const [newPayment, setNewPayment] = useState({ 
    playerId: "",
    month: new Date().getMonth() + 1, 
    year: new Date().getFullYear(), 
    amount: 0,
    status: "paid",
    paymentMethod: "Efectivo"
  });

  const clubRef = useMemoFirebase(() => doc(db, "clubs", clubId), [db, clubId]);
  const { data: club, isLoading: clubLoading } = useDoc(clubRef);

  const playersQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "players"), [db, clubId]);
  const { data: players } = useCollection(playersQuery);

  const transactionsQuery = useMemoFirebase(() => 
    query(collection(db, "clubs", clubId, "transactions"), orderBy("createdAt", "desc"), limit(20)),
    [db, clubId]
  );
  const { data: transactions, isLoading: transLoading } = useCollection(transactionsQuery);

  const divisionsQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "divisions"), [db, clubId]);
  const { data: divisions } = useCollection(divisionsQuery);

  const clubNav = [
    { title: "Panel General", href: `/dashboard/clubs/${clubId}`, icon: LayoutDashboard },
    { title: "Categorías", href: `/dashboard/clubs/${clubId}/divisions`, icon: Layers },
    { title: "Staff Técnico", href: `/dashboard/clubs/${clubId}/coaches`, icon: UserRound },
    { title: "Tienda Club", href: `/dashboard/clubs/${clubId}/shop/admin`, icon: ShoppingBag },
    { title: "Base Jugadores", href: `/dashboard/clubs/${clubId}/players`, icon: Users },
    { title: "Finanzas", href: `/dashboard/clubs/${clubId}/finances`, icon: CreditCard },
  ];

  const handleRegisterPayment = async () => {
    if (!newPayment.playerId || !newPayment.amount || newPayment.amount <= 0) {
      toast({ variant: "destructive", title: "Datos incompletos", description: "Selecciona un jugador y el monto correcto." });
      return;
    }

    setLoading(true);
    try {
      const player = players?.find(p => p.id === newPayment.playerId);
      const now = new Date().toISOString();
      const transactionId = doc(collection(db, "clubs", clubId, "transactions")).id;

      const playerPaymentId = doc(collection(db, "clubs", clubId, "players", newPayment.playerId, "payments")).id;
      await setDoc(doc(db, "clubs", clubId, "players", newPayment.playerId, "payments", playerPaymentId), {
        ...newPayment,
        id: playerPaymentId,
        playerName: `${player?.firstName} ${player?.lastName}`,
        paymentDate: now,
        createdAt: now
      });

      await setDoc(doc(db, "clubs", clubId, "transactions", transactionId), {
        id: transactionId,
        type: "in",
        concept: `${player?.firstName} ${player?.lastName} - Cuota ${MONTHS[newPayment.month - 1]}`,
        category: "Cuotas Sociales",
        amount: newPayment.amount,
        method: newPayment.paymentMethod,
        playerId: newPayment.playerId,
        createdAt: now
      });

      toast({ 
        title: "Cobro Registrado", 
        description: `Se registró el pago de ${player?.firstName} por $${newPayment.amount.toLocaleString()}.` 
      });
      
      setIsDialogOpen(false);
      setNewPayment({ ...newPayment, playerId: "", amount: 0 });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error al registrar" });
    } finally {
      setLoading(false);
    }
  };

  const monthlyIn = transactions?.filter(t => t.type === 'in').reduce((acc, t) => acc + (t.amount || 0), 0) || 0;
  const monthlyOut = transactions?.filter(t => t.type === 'out').reduce((acc, t) => acc + (t.amount || 0), 0) || 0;
  const surplus = monthlyIn - monthlyOut;

  if (clubLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white" /></div>;

  return (
    <div className="flex flex-col md:flex-row gap-8 animate-in fade-in duration-500">
      <SectionNav items={clubNav} basePath={`/dashboard/clubs/${clubId}`} />
      
      <div className="flex-1 space-y-8 pb-20">
        <header className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-black font-headline text-white drop-shadow-md">Tesorería Institucional</h1>
              <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] mt-1">{club?.name} • Control de ingresos y gastos operativos.</p>
            </div>
            <div className="flex gap-2">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-white text-primary hover:bg-slate-50 h-12 font-black uppercase text-[10px] tracking-widest px-8 shadow-2xl">
                    <Plus className="h-5 w-5 mr-2" /> Nuevo Movimiento
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md bg-white border-none shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-slate-900">Registrar Cobro de Cuota</DialogTitle>
                    <DialogDescription className="font-bold text-slate-500">Selecciona el jugador y los detalles del pago recibido.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-6">
                    <div className="space-y-2">
                      <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Buscar Jugador / Socio</Label>
                      <Select value={newPayment.playerId} onValueChange={v => setNewPayment({...newPayment, playerId: v})}>
                        <SelectTrigger className="h-12 border-2 font-bold"><SelectValue placeholder="Seleccionar socio..." /></SelectTrigger>
                        <SelectContent>
                          {players?.sort((a,b) => a.lastName.localeCompare(b.lastName)).map(p => (
                            <SelectItem key={p.id} value={p.id} className="font-bold">{p.lastName}, {p.firstName} (DNI: {p.dni})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Mes</Label>
                        <Select value={String(newPayment.month)} onValueChange={v => setNewPayment({...newPayment, month: parseInt(v)})}>
                          <SelectTrigger className="h-12 border-2 font-bold"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)} className="font-bold">{m}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Año</Label>
                        <Input 
                          type="number" 
                          value={isNaN(newPayment.year) ? "" : newPayment.year} 
                          onChange={e => {
                            const val = e.target.value === '' ? NaN : parseInt(e.target.value);
                            setNewPayment({...newPayment, year: val});
                          }} 
                          className="h-12 border-2 font-bold" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Monto Cobrado ($)</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input 
                            type="number" 
                            value={isNaN(newPayment.amount) ? "" : newPayment.amount} 
                            onChange={e => {
                              const val = e.target.value === '' ? NaN : parseInt(e.target.value);
                              setNewPayment({...newPayment, amount: val});
                            }} 
                            className="h-12 border-2 font-bold pl-10" 
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Método</Label>
                        <Select value={newPayment.paymentMethod} onValueChange={v => setNewPayment({...newPayment, paymentMethod: v})}>
                          <SelectTrigger className="h-12 border-2 font-bold"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Efectivo" className="font-bold">Efectivo</SelectItem>
                            <SelectItem value="Transferencia" className="font-bold">Transferencia</SelectItem>
                            <SelectItem value="Tarjeta" className="font-bold">Tarjeta</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-8 border-t">
                    <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="font-bold text-slate-500">Cancelar</Button>
                    <Button onClick={handleRegisterPayment} disabled={loading || isNaN(newPayment.amount)} className="font-black uppercase text-xs tracking-widest h-12 px-10 shadow-lg shadow-primary/20">
                      {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                      Confirmar Cobro
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white border-none shadow-xl border-l-8 border-l-green-500">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ingresos Totales</CardTitle>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-green-700">
                ${hasMounted ? monthlyIn.toLocaleString() : '...'}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-none shadow-xl border-l-8 border-l-red-500">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gastos Registrados</CardTitle>
              <TrendingDown className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-red-700">
                ${hasMounted ? monthlyOut.toLocaleString() : '...'}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-primary text-primary-foreground border-none shadow-xl shadow-primary/30 relative overflow-hidden">
            <CardHeader className="pb-2 flex flex-row items-center justify-between relative z-10">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-80">Saldo en Caja</CardTitle>
              <CircleDollarSign className="h-5 w-5 opacity-70" />
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-black">
                ${hasMounted ? surplus.toLocaleString() : '...'}
              </div>
            </CardContent>
            <CircleDollarSign className="absolute right-[-20px] bottom-[-20px] h-32 w-32 opacity-10 rotate-12" />
          </Card>
        </div>

        <Card className="border-none shadow-2xl overflow-hidden bg-white/95 backdrop-blur-md">
          <CardHeader className="bg-slate-50 border-b pb-6">
            <CardTitle className="text-xl font-black flex items-center gap-3 text-slate-900">
              <ArrowRightLeft className="h-6 w-6 text-primary" /> Libro de Movimientos
            </CardTitle>
            <CardDescription className="font-medium text-slate-500">Últimas transacciones registradas.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-none bg-slate-100/50">
                  <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400 pl-8">Fecha</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Concepto</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Categoría</TableHead>
                  <TableHead className="text-right font-black uppercase text-[10px] tracking-widest text-slate-400 pr-8">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-10"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary" /></TableCell></TableRow>
                ) : transactions?.map((t: any) => (
                  <TableRow key={t.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <TableCell className="text-xs font-bold text-slate-400 pl-8">
                      {new Date(t.createdAt).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}
                    </TableCell>
                    <TableCell className="font-black text-slate-900">{t.concept}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[9px] font-black uppercase border-none">{t.category}</Badge></TableCell>
                    <TableCell className={cn(
                      "text-right font-black text-base pr-8",
                      t.type === 'in' ? 'text-green-600' : 'text-red-600'
                    )}>
                      {t.type === 'in' ? '+' : '-'}${hasMounted ? t.amount.toLocaleString() : t.amount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
