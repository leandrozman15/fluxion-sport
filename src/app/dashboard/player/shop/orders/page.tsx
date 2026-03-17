
"use client";

import { useState, useEffect } from "react";
import { 
  ShoppingBag, 
  Loader2, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Package,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export default function PlayerOrdersPage() {
  const { firestore, user } = useFirebase();
  const [playerInfo, setPlayerInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlayerData() {
      if (!user || !firestore) return;
      try {
        const snap = await getDocs(query(collection(firestore, "all_players_index"), where("email", "==", user.email)));
        if (!snap.empty) {
          setPlayerInfo(snap.docs[0].data());
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    fetchPlayerData();
  }, [user, firestore]);

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !playerInfo) return null;
    return query(
      collection(firestore, "clubs", playerInfo.clubId, "shop_orders"),
      where("playerId", "==", playerInfo.id),
      orderBy("createdAt", "desc")
    );
  }, [firestore, playerInfo]);

  const { data: orders, isLoading: ordersLoading } = useCollection(ordersQuery);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  if (!playerInfo) return (
    <div className="text-center py-20 px-4">
      <AlertCircle className="h-16 w-16 mx-auto text-muted-foreground opacity-20 mb-4" />
      <h2 className="text-xl font-bold">Perfil no vinculado</h2>
      <p className="text-muted-foreground mt-2">No hemos encontrado pedidos asociados a {user?.email}</p>
    </div>
  );

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending': return { label: "Pendiente", icon: Clock, color: "bg-orange-100 text-orange-700" };
      case 'preparing': return { label: "En Preparación", icon: Package, color: "bg-blue-100 text-blue-700" };
      case 'ready': return { label: "Listo para Retirar", icon: CheckCircle2, color: "bg-green-100 text-green-700 animate-pulse" };
      case 'delivered': return { label: "Entregado", icon: CheckCircle2, color: "bg-slate-100 text-slate-700" };
      case 'cancelled': return { label: "Cancelado", icon: XCircle, color: "bg-red-100 text-red-700" };
      default: return { label: status, icon: AlertCircle, color: "bg-muted text-muted-foreground" };
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold font-headline text-foreground">Mis Reservas de Tienda</h1>
        <p className="text-muted-foreground">Sigue el estado de tu indumentaria oficial.</p>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {ordersLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
        ) : !orders || orders.length === 0 ? (
          <Card className="border-dashed py-20 flex flex-col items-center opacity-50">
            <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aún no has realizado ninguna reserva.</p>
          </Card>
        ) : (
          orders.map((order: any) => {
            const config = getStatusConfig(order.status);
            return (
              <Card key={order.id} className="hover:shadow-md transition-all overflow-hidden group">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row items-center">
                    <div className="w-full md:w-32 aspect-square bg-muted">
                      <img src={order.productImage} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black uppercase text-muted-foreground">Pedido #{order.id.substring(0,6)}</span>
                          <span className="text-[10px] text-muted-foreground">• {new Date(order.createdAt).toLocaleDateString()}</span>
                        </div>
                        <h3 className="text-xl font-bold">{order.productName}</h3>
                        <p className="text-sm font-medium text-primary">Talle: {order.size || "Único"} • ${order.price}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge className={cn("px-4 py-1.5 rounded-full border-none font-bold flex items-center gap-2", config.color)}>
                          <config.icon className="h-4 w-4" />
                          {config.label}
                        </Badge>
                        <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hidden md:block" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
