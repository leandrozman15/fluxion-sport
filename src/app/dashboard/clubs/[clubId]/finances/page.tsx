
"use client";

import { useState } from "react";
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
  Plus,
  ShoppingBag,
  Search,
  CheckCircle2,
  DollarSign
} from "lucide-react";
import Link from "next/link";
import { useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, setDoc, query, orderBy } from "firebase/firestore";
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

  const [newPayment, setNewPayment] = useState({ 
    playerId: "",
    month: new Date().getMonth() + 1, 
    year: new Date().getFullYear(), 
    amount: 5000,
    status: "paid",
    paymentMethod: "Efectivo"
  });

  const clubRef = useMemoFirebase(() => doc(db, "clubs", clubId), [db, clubId]);
  const { data: club, isLoading: clubLoading } = useDoc(clubRef);

  const playersQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "players"), [db, clubId]);
  const { data: players } = useCollection(playersQuery);

  const clubNav = [
    { title: "Panel General", href: `/dashboard/clubs/${clubId}`, icon: LayoutDashboard },
    { title: "Administración", href: `/dashboard/clubs/${clubId}/admin`, icon: ShieldCheck },
    { title: "Categorías", href: `/dashboard/clubs/${clubId}/divisions`, icon: Layers },
    { title: "Staff Técnico", href: `/dashboard/clubs/${clubId}/coaches`, icon: UserRound },
    { title: "Tienda Club", href: `/dashboard/clubs/${clubId}/shop/admin`, icon: ShoppingBag },
    { title: "Base Jugadores", href: `/dashboard/clubs/${clubId}/players`, icon: Users },
    { title: "Finanzas", href: `/dashboard/clubs/${clubId}/finances`, icon: CreditCard },
  ];

  const handleRegisterPayment = async () => {
    if (!newPayment.playerId || !newPayment.amount) {
      toast({ variant: "destructive", title: "Datos incompletos", description: "Selecciona un jugador y el monto." });
      return;
    }

    setLoading(true);
    try {
      const paymentId = doc(collection(db, "clubs", clubId, "players", newPayment.playerId, "payments")).id;
      const paymentDoc = doc(db, "clubs", clubId, "players", newPayment.playerId, "payments", paymentId);
      
      const player = players?.find(p => p.id === newPayment.playerId);

      await setDoc(paymentDoc, {
        ...newPayment,
        id: paymentId,
        playerName: `${player?.firstName} ${player?.lastName}`,
        paymentDate: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      toast({ 
        title: "Cobro Registrado", 
        description: `Se registró el pago de ${player?.firstName} por $${newPayment.amount}.` 
      });
      
      setIsDialogOpen(false);
      setNewPayment({ ...newPayment, playerId: "" });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error al registrar" });
    } finally {
      setLoading(false);
    }
  };

  if (clubLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white" /></div>;

  return (
    <div className="flex gap-8 animate-in fade-in duration-500">
      <SectionNav items={clubNav} basePath={`/dashboard/clubs/${clubId}`} />
      
      <div className="flex-1 space-y-8 pb-20">
        <header className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-black font-headline text-white drop-shadow-md">Tesorería Institucional</h1>
              <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] mt-1">{club?.name} • Control de ingresos y gastos operativos.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 h-12 font-black uppercase text-[10px] tracking-widest px-6 shadow-xl">
                <Download className="h-4 w-4 mr-2" /> Exportar Balance
              </Button>
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
                          {players?.map(p => (
                            <SelectItem key={p.id} value={p.id} className="font-bold">{p.firstName} {p.lastName} (DNI: {p.dni})</SelectItem>
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
                        <Input type="number" value={newPayment.year} onChange={e => setNewPayment({...newPayment, year: parseInt(e.target.value)})} className="h-12 border-2 font-bold" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Monto Cobrado ($)</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input type="number" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: parseInt(e.target.value)})} className="h-12 border-2 font-bold pl-10" />
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
                    <Button onClick={handleRegisterPayment} disabled={loading} className="font-black uppercase text-xs tracking-widest h-12 px-10 shadow-lg shadow-primary/20">
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
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ingresos del Mes</CardTitle>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-green-700">$142.500</div>
              <p className="text-[10px] text-green-600 font-bold uppercase mt-1">+12% vs mes anterior</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-none shadow-xl border-l-8 border-l-red-500">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Egresos (Gasto Fijo)</CardTitle>
              <TrendingDown className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-red-700">$98.200</div>
              <p className="text-[10px] text-red-600 font-bold uppercase mt-1">Salarios y Mantenimiento</p>
            </CardContent>
          </Card>
          <Card className="bg-primary text-primary-foreground border-none shadow-xl shadow-primary/30 relative overflow-hidden">
            <CardHeader className="pb-2 flex flex-row items-center justify-between relative z-10">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-80">Superávit Operativo</CardTitle>
              <CircleDollarSign className="h-5 w-5 opacity-70" />
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-black">$44.300</div>
              <p className="text-[10px] opacity-70 font-bold uppercase mt-1">Disponible en fondo social</p>
            </CardContent>
            <CircleDollarSign className="absolute right-[-20px] bottom-[-20px] h-32 w-32 opacity-10 rotate-12" />
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 border-none shadow-2xl overflow-hidden bg-white/95 backdrop-blur-md">
            <CardHeader className="bg-slate-50 border-b pb-6">
              <CardTitle className="text-xl font-black flex items-center gap-3 text-slate-900">
                <CreditCard className="h-6 w-6 text-primary" /> Historial de Movimientos
              </CardTitle>
              <CardDescription className="font-medium text-slate-500">Registro cronológico de la caja social.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-none bg-slate-100/50">
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400 pl-8">Fecha</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Concepto / Socio</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Categoría</TableHead>
                    <TableHead className="text-right font-black uppercase text-[10px] tracking-widest text-slate-400 pr-8">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { date: "20/05", desc: "Mara Campos (Cuota Mayo)", cat: "Ingreso", amt: 12000, type: "in" },
                    { date: "18/05", desc: "Pago Luz Predio", cat: "Mantenimiento", amt: 15400, type: "out" },
                    { date: "15/05", desc: "Sueldos Staff Técnico", cat: "Recursos Humanos", amt: 45000, type: "out" },
                    { date: "12/05", desc: "Venta Tienda (Camiseta)", cat: "Ingreso", amt: 8500, type: "in" },
                  ].map((m, i) => (
                    <TableRow key={i} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <TableCell className="text-xs font-bold text-slate-400 pl-8">{m.date}</TableCell>
                      <TableCell className="font-black text-slate-900">{m.desc}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[9px] font-black uppercase border-none">{m.cat}</Badge></TableCell>
                      <TableCell className={`text-right font-black text-base pr-8 ${m.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                        {m.type === 'in' ? '+' : '-'}${m.amt.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="bg-slate-50 border-t py-4 justify-center">
              <Button variant="link" className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-primary">Cargar más movimientos</Button>
            </CardFooter>
          </Card>

          <Card className="bg-white border-none shadow-2xl h-fit">
            <CardHeader className="border-b pb-6">
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Efectividad de Cobranza</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {[
                { label: "Primera División", perc: 95, color: "bg-green-500" },
                { label: "Juveniles (Sub 17)", perc: 78, color: "bg-primary" },
                { label: "Infantiles (Sub 12)", perc: 62, color: "bg-orange-500" },
                { label: "Mamis Hockey", perc: 88, color: "bg-green-500" },
              ].map((d, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-[11px] font-black uppercase tracking-tight">
                    <span className="text-slate-900">{d.label}</span>
                    <span className="text-slate-400">{d.perc}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden shadow-inner">
                    <div className={cn(d.color, "h-full transition-all duration-1000 shadow-lg")} style={{ width: `${d.perc}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
            <CardFooter className="bg-slate-50/50 border-t pt-6">
              <Button variant="outline" size="sm" className="w-full text-[10px] font-black uppercase tracking-widest border-2 hover:bg-white">
                Ver detalle de morosidad
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
