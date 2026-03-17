
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { 
  ShoppingBag, 
  Loader2, 
  Search, 
  CheckCircle2, 
  Clock, 
  Package, 
  XCircle,
  LayoutDashboard,
  ShieldCheck,
  Layers,
  Users,
  CreditCard,
  User,
  ExternalLink,
  MoreVertical,
  Filter
} from "lucide-react";
import { collection, doc } from "firebase/firestore";
import { useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SectionNav } from "@/components/layout/section-nav";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ShopOrdersAdminPage() {
  const { clubId } = useParams() as { clubId: string };
  const db = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const clubRef = useMemoFirebase(() => doc(db, "clubs", clubId), [db, clubId]);
  const { data: club, isLoading: clubLoading } = useDoc(clubRef);

  const ordersQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "shop_orders"), [db, clubId]);
  const { data: orders, isLoading: ordersLoading } = useCollection(ordersQuery);

  const clubNav = [
    { title: "Panel General", href: `/dashboard/clubs/${clubId}`, icon: LayoutDashboard },
    { title: "Administración", href: `/dashboard/clubs/${clubId}/admin`, icon: ShieldCheck },
    { title: "Categorías", href: `/dashboard/clubs/${clubId}/divisions`, icon: Layers },
    { title: "Tienda Club", href: `/dashboard/clubs/${clubId}/shop/admin`, icon: ShoppingBag },
    { title: "Pedidos y Ventas", href: `/dashboard/clubs/${clubId}/shop/orders`, icon: ShoppingBag },
    { title: "Base Jugadores", href: `/dashboard/clubs/${clubId}/players`, icon: Users },
    { title: "Finanzas", href: `/dashboard/clubs/${clubId}/finances`, icon: CreditCard },
  ];

  const updateOrderStatus = (orderId: string, newStatus: string) => {
    const orderDoc = doc(db, "clubs", clubId, "shop_orders", orderId);
    updateDocumentNonBlocking(orderDoc, { status: newStatus });
    toast({ title: "Estado Actualizado", description: `El pedido ahora está en: ${newStatus}` });
  };

  const filteredOrders = orders?.filter(o => {
    const matchesSearch = o.playerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         o.productName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (clubLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  const totalSales = orders?.filter(o => o.status === 'delivered').reduce((acc, o) => acc + o.price, 0) || 0;
  const pendingOrders = orders?.filter(o => o.status === 'pending' || o.status === 'preparing').length || 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline text-foreground">Pedidos y Ventas: {club?.name}</h1>
          <p className="text-muted-foreground">Control de reservas de indumentaria y facturación de la tienda.</p>
        </div>
        <SectionNav items={clubNav} basePath={`/dashboard/clubs/${clubId}`} />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/10">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Ventas Entregadas</CardTitle>
            <CreditCard className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary">${totalSales.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Ingresos acumulados por retiro</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-100">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase text-orange-800">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-orange-700">{pendingOrders}</div>
            <p className="text-[10px] text-orange-600 mt-1">Pedidos esperando acción</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-100">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase text-green-800">Listos para Retirar</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-green-700">{orders?.filter(o => o.status === 'ready').length || 0}</div>
            <p className="text-[10px] text-green-600 mt-1">Socios notificados</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Registro de Pedidos</CardTitle>
              <CardDescription>Listado cronológico de reservas de socios.</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar socio o producto..." 
                  className="pl-8" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="preparing">Preparando</SelectItem>
                  <SelectItem value="ready">Listo</SelectItem>
                  <SelectItem value="delivered">Entregado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Socio / Jugador</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Talle</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders?.map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback><User className="h-3 w-3" /></AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-bold">{order.playerName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{order.productName}</TableCell>
                    <TableCell><Badge variant="outline">{order.size || "-"}</Badge></TableCell>
                    <TableCell className="font-bold">${order.price}</TableCell>
                    <TableCell>
                      <Badge className={cn(
                        "uppercase text-[9px] font-black",
                        order.status === 'pending' ? "bg-orange-100 text-orange-700" :
                        order.status === 'preparing' ? "bg-blue-100 text-blue-700" :
                        order.status === 'ready' ? "bg-green-500 text-white" :
                        order.status === 'delivered' ? "bg-slate-100 text-slate-700" : "bg-muted"
                      )}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Cambiar Estado</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'preparing')}>En Preparación</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'ready')}>Listo para Retiro</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'delivered')}>Entregado / Pagado</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'cancelled')} className="text-destructive">Cancelar Reserva</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {(!filteredOrders || filteredOrders.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-20 text-muted-foreground italic">
                      No se encontraron pedidos con los filtros aplicados.
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
