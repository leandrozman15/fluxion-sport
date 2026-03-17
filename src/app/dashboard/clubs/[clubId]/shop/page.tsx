"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { 
  ShoppingBag, 
  Loader2, 
  Package, 
  Tag, 
  ChevronRight,
  Filter,
  ShoppingCart,
  Search,
  CheckCircle2
} from "lucide-react";
import { collection, doc } from "firebase/firestore";
import { useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function ClubShopPublicPage() {
  const { clubId } = useParams() as { clubId: string };
  const db = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("all");

  const clubRef = useMemoFirebase(() => doc(db, "clubs", clubId), [db, clubId]);
  const { data: club, isLoading: clubLoading } = useDoc(clubRef);

  const productsQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "shop_products"), [db, clubId]);
  const { data: products, isLoading: productsLoading } = useCollection(productsQuery);

  const filteredProducts = products?.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = category === 'all' || p.category === category;
    return matchesSearch && matchesCat;
  });

  const handleOrder = (productName: string) => {
    toast({
      title: "Interés Registrado",
      description: `Se ha notificado a la secretaría del club tu interés por: ${productName}`,
    });
  };

  if (clubLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-primary text-primary-foreground p-8 rounded-2xl shadow-xl overflow-hidden relative">
        <div className="relative z-10">
          <Badge className="bg-white/20 text-white mb-2 border-none">Tienda Oficial</Badge>
          <h1 className="text-4xl font-black font-headline tracking-tight">{club?.name} Store</h1>
          <p className="text-primary-foreground/80 mt-2 max-w-md font-medium">Consigue la indumentaria oficial y apoya a tu institución en cada partido.</p>
        </div>
        <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
          <ShoppingBag className="h-64 w-64 rotate-12" />
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar indumentaria, palos, bolsos..." 
            className="pl-10 h-11 border-none shadow-none focus-visible:ring-0"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            suppressHydrationWarning
          />
        </div>
        <div className="h-8 w-px bg-border hidden md:block" />
        <Tabs defaultValue="all" className="w-auto" onValueChange={setCategory}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="all">Todo</TabsTrigger>
            <TabsTrigger value="indumentaria">Ropa</TabsTrigger>
            <TabsTrigger value="equipamiento">Pro</TabsTrigger>
            <TabsTrigger value="accesorios">Extras</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {productsLoading ? (
          <div className="col-span-full flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>
        ) : (
          filteredProducts?.map((p: any) => (
            <Card key={p.id} className="overflow-hidden border-none shadow-md hover:shadow-2xl transition-all duration-300 group flex flex-col h-full">
              <div className="aspect-[4/5] overflow-hidden relative">
                <Avatar className="h-full w-full rounded-none">
                  <AvatarImage src={p.photoUrl} className="object-cover group-hover:scale-110 transition-transform duration-500" />
                  <AvatarFallback className="rounded-none bg-muted flex items-center justify-center">
                    <Package className="h-12 w-12 opacity-10" />
                  </AvatarFallback>
                </Avatar>
                <div className="absolute top-3 left-3">
                  <Badge className="bg-primary/90 backdrop-blur-sm text-white font-black px-3 py-1 shadow-lg">
                    ${p.price}
                  </Badge>
                </div>
                {p.stock < 5 && p.stock > 0 && (
                  <div className="absolute top-3 right-3">
                    <Badge variant="destructive" className="animate-pulse">Últimas {p.stock}!</Badge>
                  </div>
                )}
              </div>
              <CardHeader className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Tag className="h-3 w-3 text-primary" />
                  <span className="text-[10px] font-black uppercase text-primary tracking-widest">{p.category}</span>
                </div>
                <CardTitle className="text-xl group-hover:text-primary transition-colors">{p.name}</CardTitle>
                <CardDescription className="line-clamp-2 mt-1 text-xs">
                  {p.description || "Artículo oficial disponible para entrega inmediata en secretaría."}
                </CardDescription>
              </CardHeader>
              <CardFooter className="pt-0 p-6">
                <Button 
                  className="w-full h-11 font-bold gap-2 bg-foreground hover:bg-primary transition-all shadow-lg hover:shadow-primary/20"
                  onClick={() => handleOrder(p.name)}
                  disabled={p.stock === 0}
                  suppressHydrationWarning
                >
                  {p.stock === 0 ? "Sin Stock" : (
                    <>
                      <ShoppingCart className="h-4 w-4" /> 
                      Reservar Artículo
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
        
        {filteredProducts?.length === 0 && !productsLoading && (
          <div className="col-span-full text-center py-32 bg-muted/20 rounded-3xl border-2 border-dashed">
            <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground opacity-10 mb-4" />
            <h3 className="text-xl font-bold text-muted-foreground">No encontramos lo que buscas</h3>
            <p className="text-muted-foreground mt-2 max-w-xs mx-auto text-sm">Intenta con otros filtros o contacta a la tienda del club para pedidos especiales.</p>
          </div>
        )}
      </div>

      <div className="bg-muted/30 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-dashed">
        <div className="flex items-center gap-4">
          <div className="bg-background p-4 rounded-full shadow-inner">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
          <div>
            <h4 className="font-bold text-lg">Retiro en Sede</h4>
            <p className="text-muted-foreground text-sm">Todos los pedidos se retiran por secretaría del club de Lunes a Viernes de 17:00 a 21:00hs.</p>
          </div>
        </div>
        <Button variant="outline" className="h-12 px-8 font-bold border-2" suppressHydrationWarning>Ver mis Reservas</Button>
      </div>
    </div>
  );
}
