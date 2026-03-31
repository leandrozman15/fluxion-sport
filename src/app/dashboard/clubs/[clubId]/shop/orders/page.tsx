
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
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
  UserRound
} from "lucide-react";
import { collection, doc } from "firebase/firestore";
import { useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SectionNav } from "@/components/layout/section-nav";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function ShopOrdersAdminPage() {
  const { clubId } = useParams() as { clubId: string };
  const db = useFirestore();
  const { toast } = useToast();
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
    { title: "Pedidos", href: `/dashboard/clubs/${clubId}/shop/orders`, icon: ShoppingBag },
    { title: "Base Jugadores", href: `/dashboard/clubs/${clubId}/players`, icon: Users },
    { title: "Finanzas", href: `/dashboard/clubs/${clubId}/finances`, icon: CreditCard },
  ];

  if (clubLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex gap-8 animate-in fade-in duration-500">
      <SectionNav items={clubNav} basePath={`/dashboard/clubs/${clubId}`} />
      
      <div className="flex-1 space-y-8 pb-20">
        <header>
          <h1 className="text-3xl font-black font-headline">Gestión de Pedidos</h1>
          <p className="text-muted-foreground">{club?.name} • Control de ventas y reservas.</p>
        </header>

        <Card>
          <CardHeader>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar socio..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent>
            {ordersLoading ? <Loader2 className="animate-spin mx-auto" /> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Socio</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders?.map((o: any) => (
                    <TableRow key={o.id}>
                      <TableCell className="text-xs">{new Date(o.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="font-bold">{o.playerName}</TableCell>
                      <TableCell>{o.productName}</TableCell>
                      <TableCell>${o.price}</TableCell>
                      <TableCell><Badge>{o.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => updateDocumentNonBlocking(doc(db, "clubs", clubId, "shop_orders", o.id), { status: 'delivered' })}>Marcar Entregado</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
