
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  ShoppingBag, 
  Loader2, 
  Package, 
  Tag, 
  Search, 
  CheckCircle2,
  ShoppingCart,
  ChevronLeft
} from "lucide-react";
import { collection, doc, setDoc, query, where, getDocs } from "firebase/firestore";
import { useFirestore, useCollection, useDoc, useMemoFirebase, useFirebase } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function ClubShopPublicPage() {
  const { clubId } = useParams() as { clubId: string };
  const { user } = useFirebase();
  const db = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [isOrdering, setIsOrdering] = useState(false);
  const [playerInfo, setPlayerInfo] = useState<any>(null);

  useEffect(() => {
    async function findMe() {
      if (!user || !db) return;
      const q = query(collection(db, "clubs", clubId, "players"), where("email", "==", user.email));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setPlayerInfo(snap.docs[0].data());
      }
    }
    findMe();
  }, [user, db, clubId]);

  const clubRef = useMemoFirebase(() => doc(db, "clubs", clubId), [db, clubId]);
  const { data: club, isLoading: clubLoading } = useDoc(clubRef);

  const productsQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "shop_products"), [db, clubId]);
  const { data: products, isLoading: productsLoading } = useCollection(productsQuery);

  const filteredProducts = products?.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = category === 'all' || p.category === category;
    const isActive = p.status !== 'paused';
    return matchesSearch && matchesCat && isActive;
  });

  const handleOrder = async () => {
    if (!selectedProduct || !user) return;
    setIsOrdering(true);
    try {
      const orderId = doc(collection(db, "clubs", clubId, "shop_orders")).id;
      const orderDoc = doc(db, "clubs", clubId, "shop_orders", orderId);

      await setDoc(orderDoc, {
        id: orderId,
        clubId,
        playerId: playerInfo?.id || user.uid,
        playerName: playerInfo ? `${playerInfo.firstName} ${playerInfo.lastName}` : (user.displayName || user.email),
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        productImage: selectedProduct.images?.[0] || "",
        size: selectedSize,
        price: selectedProduct.price,
        status: "pending",
        createdAt: new Date().toISOString()
      });

      toast({
        title: "Reserva Registrada",
        description: `Se ha notificado al club tu interés por: ${selectedProduct.name}`,
      });
      setSelectedProduct(null);
      setSelectedSize("");
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error al reservar" });
    } finally {
      setIsOrdering(false);
    }
  };

  if (clubLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Link href="/dashboard/player" className="ambient-link group w-fit">
        <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Volver al dashboard
      </Link>
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
                  <AvatarImage src={p.images?.[0] || p.photoUrl} className="object-cover group-hover:scale-110 transition-transform duration-500" />
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
                  onClick={() => setSelectedProduct(p)}
                  disabled={p.stock <= 0}
                  suppressHydrationWarning
                >
                  {p.stock <= 0 ? "Sin Stock" : (
                    <>
                      <ShoppingCart className="h-4 w-4" /> 
                      Ver Detalles
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          {selectedProduct && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
              <div className="space-y-4">
                <div className="aspect-square rounded-2xl overflow-hidden border bg-muted">
                  <img src={selectedProduct.images?.[0] || selectedProduct.photoUrl} className="w-full h-full object-cover" />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {selectedProduct.images?.slice(1).map((img: string, idx: number) => (
                    <div key={idx} className="h-20 w-20 rounded-lg border overflow-hidden flex-shrink-0">
                      <img src={img} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col">
                <DialogHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black uppercase">{selectedProduct.category}</Badge>
                    <Badge variant="outline" className="text-[10px] font-bold">Stock: {selectedProduct.stock}</Badge>
                  </div>
                  <DialogTitle className="text-3xl font-black">{selectedProduct.name}</DialogTitle>
                  <div className="text-3xl font-black text-primary mt-2">${selectedProduct.price}</div>
                </DialogHeader>

                <ScrollArea className="flex-1 mt-6 pr-4">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">Descripción</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {selectedProduct.description || "Este es un producto oficial del club diseñado con materiales de alta calidad."}
                      </p>
                    </div>

                    {selectedProduct.sizes?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">Selecciona tu Talle</h4>
                        <RadioGroup value={selectedSize} onValueChange={setSelectedSize} className="grid grid-cols-3 gap-3">
                          {selectedProduct.sizes.map((s: any, idx: number) => (
                            <div key={idx}>
                              <RadioGroupItem 
                                value={s.label} 
                                id={`size-${idx}`} 
                                className="peer sr-only" 
                                disabled={s.stock <= 0}
                              />
                              <Label
                                htmlFor={`size-${idx}`}
                                className={`flex flex-col items-center justify-center rounded-xl border-2 p-3 bg-card hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all cursor-pointer ${s.stock <= 0 ? "opacity-30 grayscale cursor-not-allowed" : ""}`}
                              >
                                <span className="text-lg font-black">{s.label}</span>
                                <span className="text-[10px] font-bold text-muted-foreground">{s.stock > 0 ? `${s.stock} disp.` : "Agotado"}</span>
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <DialogFooter className="mt-8 border-t pt-6">
                  <Button 
                    className="w-full h-14 text-lg font-black gap-3 shadow-xl shadow-primary/20"
                    onClick={handleOrder}
                    disabled={isOrdering || (selectedProduct.sizes?.length > 0 && !selectedSize)}
                  >
                    {isOrdering ? <Loader2 className="animate-spin" /> : <ShoppingCart className="h-6 w-6" />}
                    Reservar ahora
                  </Button>
                </DialogFooter>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
        <Button variant="outline" className="h-12 px-8 font-bold border-2" asChild>
          <Link href="/dashboard/player/shop/orders">Ver mis Reservas</Link>
        </Button>
      </div>
    </div>
  );
}
