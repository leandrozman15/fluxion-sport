
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ShoppingBag, 
  Loader2, 
  Search, 
  CheckCircle2, 
  Clock, 
  LayoutDashboard,
  Layers,
  Users,
  CreditCard,
  User,
  MoreVertical,
  UserRound,
  ChevronLeft,
  Package,
  Calendar,
  Truck,
  XCircle,
  AlertCircle
} from "lucide-react";
import { collection, doc } from "firebase/firestore";
import { useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SectionNav } from "@/components/layout/section-nav";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function ShopOrdersAdminPage() {
  const { clubId } = useParams() as { clubId: string };
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");

  const clubRef = useMemoFirebase(() => doc(db, "clubs", clubId), [db, clubId]);
  const { data: club, isLoading: clubLoading } = useDoc(clubRef);

  const ordersQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "shop_orders"), [db, clubId]);
  const { data: orders, isLoading: ordersLoading } = useCollection(ordersQuery);

  const clubNav = [
    { title: "Panel General", href: `/dashboard/clubs/${clubId}`, icon: LayoutDashboard },
    { title: "Categorías", href: `/dashboard/clubs/${clubId}/divisions`, icon: Layers },
    { title: "Staff Técnico", href: `/dashboard/clubs/${clubId}/coaches`, icon: UserRound },
    { title: "Tienda Club", href: `/dashboard/clubs/${clubId}/shop/admin`, icon: ShoppingBag },
    { title: "Base Jugadores", href: `/dashboard/clubs/${clubId}/players`, icon: Users },
    { title: "Finanzas", href: `/dashboard/clubs/${clubId}/finances`, icon: CreditCard },
  ];

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending': return { label: "Pendiente", color: "bg-orange-100 text-orange-700", icon: Clock };
      case 'preparing': return { label: "Preparando", color: "bg-blue-100 text-blue-700", icon: Package };
      case 'ready': return { label: "Listo", color: "bg-green-100 text-green-700", icon: CheckCircle2 };
      case 'delivered': return { label: "Entregado", color: "bg-slate-100 text-slate-500", icon: Truck };
      case 'cancelled': return { label: "Cancelado", color: "bg-red-100 text-red-700", icon: XCircle };
      default: return { label: status, color: "bg-muted text-muted-foreground", icon: AlertCircle };
    }
  };

  const handleUpdateStatus = (orderId: string, newStatus: string) => {
    updateDocumentNonBlocking(doc(db, "clubs", clubId, "shop_orders", orderId), { status: newStatus });
    toast({ title: "Estado Actualizado", description: `El pedido ahora está: ${newStatus}` });
  };

  const filteredOrders = orders?.filter(o => 
    o.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.productName.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (clubLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white" /></div>;

  return (
    <div className="flex flex-col md:flex-row gap-8 animate-in fade-in duration-500">
      <SectionNav items={clubNav} basePath={`/dashboard/clubs/${clubId}`} />
      
      <div className="flex-1 space-y-8 pb-24 px-4 md:px-0">
        <header className="flex flex-col gap-4">
          <Link href={`/dashboard/clubs/${clubId}/shop/admin`} className="ambient-link group w-fit">
            <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Volver al catálogo
          </Link>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-black font-headline text-white drop-shadow-md">Pedidos y Reservas</h1>
              <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] mt-1">{club?.name} • Seguimiento de ventas oficiales.</p>
            </div>
          </div>
        </header>

        <Card className="border-none shadow-2xl overflow-hidden bg-white/95 backdrop-blur-md rounded-[2.5rem]">
          <CardHeader className="bg-slate-50 border-b border-slate-100 py-6 px-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="text-xl font-black text-slate-900 uppercase">Monitor de Ventas</CardTitle>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Buscar socio o producto..." 
                  className="pl-10 h-11 border-2 rounded-xl bg-white" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {ordersLoading ? (
              <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-primary h-10 w-10" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-none bg-slate-50/50 h-14">
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400 pl-8">Fecha</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Socio</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Artículo</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Monto</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400 text-center">Estado</TableHead>
                    <TableHead className="text-right pr-8 font-black uppercase text-[10px] tracking-widest text-slate-400">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders?.map((o: any) => {
                    const status = getStatusConfig(o.status);
                    return (
                      <TableRow key={o.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors group h-20">
                        <TableCell className="text-[10px] font-black text-slate-400 pl-8 uppercase">
                          {new Date(o.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border-2 border-slate-100 shadow-sm rounded-xl">
                              <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-black">S</AvatarFallback>
                            </Avatar>
                            <span className="font-black text-slate-900 text-sm uppercase leading-none">{o.playerName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-700 text-sm">{o.productName}</span>
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Talle: {o.size || "Único"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-black text-slate-900 text-base">${o.price?.toLocaleString()}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={cn("font-black text-[9px] uppercase px-3 py-1 border-none", status.color)}>
                            <status.icon className="h-3 w-3 mr-1.5" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-slate-400 hover:text-primary rounded-xl">
                                <MoreVertical className="h-5 w-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 p-2 rounded-2xl border-none shadow-2xl">
                              <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400 px-2 py-1.5">Cambiar Estado</DropdownMenuLabel>
                              <DropdownMenuItem className="font-bold text-sm focus:bg-blue-50 focus:text-blue-700 rounded-xl" onClick={() => handleUpdateStatus(o.id, 'preparing')}>Preparando</DropdownMenuItem>
                              <DropdownMenuItem className="font-bold text-sm focus:bg-green-50 focus:text-green-700 rounded-xl" onClick={() => handleUpdateStatus(o.id, 'ready')}>Listo para Retiro</DropdownMenuItem>
                              <DropdownMenuItem className="font-bold text-sm focus:bg-slate-100 rounded-xl" onClick={() => handleUpdateStatus(o.id, 'delivered')}>Entregado</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="font-bold text-sm text-destructive focus:bg-red-50 focus:text-destructive rounded-xl" onClick={() => handleUpdateStatus(o.id, 'cancelled')}>Cancelar Pedido</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(!filteredOrders || filteredOrders.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-32 text-slate-300 font-black uppercase tracking-widest text-sm italic">
                        No hay reservas registradas en este club.
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
