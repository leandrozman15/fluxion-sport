
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { 
  Plus, 
  Loader2,
  Trash2,
  Pencil,
  ShoppingBag,
  LayoutDashboard,
  ShieldCheck,
  Layers,
  UserRound,
  Users,
  CreditCard,
  ChevronLeft,
  Package,
  Tag
} from "lucide-react";
import Link from "next/link";
import { collection, doc, setDoc } from "firebase/firestore";
import { useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { SectionNav } from "@/components/layout/section-nav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ShopAdminPage() {
  const { clubId } = useParams() as { clubId: string };
  const db = useFirestore();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({ 
    name: "", 
    description: "", 
    price: 0, 
    stock: 10,
    category: "indumentaria",
    photoUrl: "" 
  });

  const clubRef = useMemoFirebase(() => doc(db, "clubs", clubId), [db, clubId]);
  const { data: club, isLoading: clubLoading } = useDoc(clubRef);

  const productsQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "shop_products"), [db, clubId]);
  const { data: products, isLoading: productsLoading } = useCollection(productsQuery);

  const clubNav = [
    { title: "Panel General", href: `/dashboard/clubs/${clubId}`, icon: LayoutDashboard },
    { title: "Administración", href: `/dashboard/clubs/${clubId}/admin`, icon: ShieldCheck },
    { title: "Categorías", href: `/dashboard/clubs/${clubId}/divisions`, icon: Layers },
    { title: "Tienda Club", href: `/dashboard/clubs/${clubId}/shop/admin`, icon: ShoppingBag },
    { title: "Base Jugadores", href: `/dashboard/clubs/${clubId}/players`, icon: Users },
    { title: "Finanzas", href: `/dashboard/clubs/${clubId}/finances`, icon: CreditCard },
  ];

  const handleCreateProduct = () => {
    const productId = doc(collection(db, "clubs", clubId, "shop_products")).id;
    const productDoc = doc(db, "clubs", clubId, "shop_products", productId);
    
    setDoc(productDoc, {
      ...newProduct,
      id: productId,
      clubId,
      createdAt: new Date().toISOString()
    });
    
    setNewProduct({ name: "", description: "", price: 0, stock: 10, category: "indumentaria", photoUrl: "" });
    setIsCreateOpen(false);
  };

  const handleDeleteProduct = (id: string) => {
    deleteDocumentNonBlocking(doc(db, "clubs", clubId, "shop_products", id));
  };

  if (clubLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline text-foreground">Gestión de Tienda: {club?.name}</h1>
            <p className="text-muted-foreground">Administra el inventario de indumentaria y merchandising oficial.</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> Nuevo Producto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Añadir al Catálogo</DialogTitle>
                <DialogDescription>Completa los datos del nuevo artículo para la tienda.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nombre del Producto</Label>
                  <Input value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} placeholder="Ej. Camiseta Oficial 2025" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Precio ($)</Label>
                    <Input type="number" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Stock Inicial</Label>
                    <Input type="number" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: parseInt(e.target.value)})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select value={newProduct.category} onValueChange={v => setNewProduct({...newProduct, category: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indumentaria">Indumentaria</SelectItem>
                      <SelectItem value="equipamiento">Equipamiento</SelectItem>
                      <SelectItem value="accesorios">Accesorios</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>URL de Imagen</Label>
                  <Input value={newProduct.photoUrl} onChange={e => setNewProduct({...newProduct, photoUrl: e.target.value})} placeholder="https://..." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreateProduct} disabled={!newProduct.name}>Guardar Producto</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <SectionNav items={clubNav} basePath={`/dashboard/clubs/${clubId}`} />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {productsLoading ? (
          <div className="col-span-full flex justify-center p-12"><Loader2 className="animate-spin" /></div>
        ) : (
          products?.map((product: any) => (
            <Card key={product.id} className="overflow-hidden group">
              <div className="aspect-square bg-muted relative">
                <Avatar className="h-full w-full rounded-none">
                  <AvatarImage src={product.photoUrl} className="object-cover" />
                  <AvatarFallback className="rounded-none"><Package className="h-12 w-12 opacity-20" /></AvatarFallback>
                </Avatar>
                <div className="absolute top-2 right-2">
                  <Badge className="bg-background/80 backdrop-blur-sm text-foreground border-none">
                    ${product.price}
                  </Badge>
                </div>
              </div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg truncate">{product.name}</CardTitle>
                  <Badge variant="outline" className="text-[10px] uppercase">{product.category}</Badge>
                </div>
                <CardDescription className="text-xs">Stock disponible: {product.stock} unidades</CardDescription>
              </CardHeader>
              <CardFooter className="flex justify-end gap-2 border-t pt-4 bg-muted/5">
                <Button variant="ghost" size="sm" className="text-destructive h-8 w-8 p-0" onClick={() => handleDeleteProduct(product.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                  <Pencil className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
        {products?.length === 0 && !productsLoading && (
          <div className="col-span-full text-center py-20 border-2 border-dashed rounded-xl bg-muted/20">
            <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
            <p className="text-muted-foreground">La tienda aún no tiene productos. Empieza por añadir el equipo oficial.</p>
          </div>
        )}
      </div>
    </div>
  );
}
