
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
  Package,
  Tag,
  AlertTriangle,
  Eye,
  EyeOff,
  Search,
  MoreVertical,
  Save,
  ImagePlus
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function ShopAdminPage() {
  const { clubId } = useParams() as { clubId: string };
  const db = useFirestore();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingProduct, setEditingPlayer] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [newProduct, setNewProduct] = useState({ 
    name: "", 
    description: "", 
    price: 0, 
    stock: 10,
    category: "indumentaria",
    photoUrl: "",
    status: "active"
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
    if (!newProduct.name || newProduct.price <= 0) return;
    const productId = doc(collection(db, "clubs", clubId, "shop_products")).id;
    const productDoc = doc(db, "clubs", clubId, "shop_products", productId);
    
    setDoc(productDoc, {
      ...newProduct,
      id: productId,
      clubId,
      createdAt: new Date().toISOString()
    });
    
    setNewProduct({ name: "", description: "", price: 0, stock: 10, category: "indumentaria", photoUrl: "", status: "active" });
    setIsCreateOpen(false);
    toast({ title: "Producto Creado", description: "La publicación ya está disponible en la tienda." });
  };

  const handleUpdateProduct = () => {
    if (!editingProduct) return;
    const productDoc = doc(db, "clubs", clubId, "shop_products", editingProduct.id);
    updateDocumentNonBlocking(productDoc, {
      name: editingProduct.name,
      description: editingProduct.description,
      price: editingProduct.price,
      stock: editingProduct.stock,
      category: editingProduct.category,
      photoUrl: editingProduct.photoUrl,
      status: editingProduct.status
    });
    setIsEditOpen(false);
    toast({ title: "Cambios Guardados", description: "La publicación ha sido actualizada." });
  };

  const toggleStatus = (product: any) => {
    const newStatus = product.status === 'active' ? 'paused' : 'active';
    const productDoc = doc(db, "clubs", clubId, "shop_products", product.id);
    updateDocumentNonBlocking(productDoc, { status: newStatus });
    toast({ title: newStatus === 'active' ? "Publicación Activada" : "Publicación Pausada" });
  };

  const handleDeleteProduct = (id: string) => {
    deleteDocumentNonBlocking(doc(db, "clubs", clubId, "shop_products", id));
    toast({ variant: "destructive", title: "Producto Eliminado" });
  };

  const filteredProducts = products?.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (clubLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline text-foreground">Administración de Tienda: {club?.name}</h1>
            <p className="text-muted-foreground">Gestiona el catálogo, precios, stock y publicaciones oficiales.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/dashboard/clubs/${clubId}/shop`} className="gap-2">
                <Eye className="h-4 w-4" /> Ver Tienda Pública
              </Link>
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2 shadow-lg">
                  <Plus className="h-4 w-4" /> Nueva Publicación
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Añadir Producto al Catálogo</DialogTitle>
                  <DialogDescription>Completa los detalles de la nueva prenda o accesorio oficial.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nombre del Producto</Label>
                      <Input value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} placeholder="Ej. Camiseta Titular 2025" />
                    </div>
                    <div className="space-y-2">
                      <Label>Categoría</Label>
                      <Select value={newProduct.category} onValueChange={v => setNewProduct({...newProduct, category: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="indumentaria">Indumentaria</SelectItem>
                          <SelectItem value="equipamiento">Equipamiento</SelectItem>
                          <SelectItem value="accesorios">Accesorios/Merchandising</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Precio ($)</Label>
                        <Input type="number" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Stock</Label>
                        <Input type="number" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: parseInt(e.target.value)})} />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Descripción</Label>
                      <Textarea value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} placeholder="Detalles de talles, materiales..." className="h-[110px]" />
                    </div>
                    <div className="space-y-2">
                      <Label>URL de Imagen</Label>
                      <Input value={newProduct.photoUrl} onChange={e => setNewProduct({...newProduct, photoUrl: e.target.value})} placeholder="https://..." />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreateProduct} disabled={!newProduct.name || newProduct.price <= 0}>Publicar Producto</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <SectionNav items={clubNav} basePath={`/dashboard/clubs/${clubId}`} />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Filtros y Búsqueda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar publicación..." 
                className="pl-8" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="pt-4 border-t space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Total Productos</span>
                <span className="font-bold">{products?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Bajo Stock</span>
                <Badge variant="destructive" className="h-5">{products?.filter(p => p.stock < 5).length || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-3 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {productsLoading ? (
              <div className="col-span-full flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>
            ) : (
              filteredProducts?.map((product: any) => (
                <Card key={product.id} className={`overflow-hidden group border-2 transition-all ${product.status === 'paused' ? 'opacity-60 grayscale' : 'hover:border-primary/50'}`}>
                  <div className="aspect-square bg-muted relative">
                    <Avatar className="h-full w-full rounded-none">
                      <AvatarImage src={product.photoUrl} className="object-cover" />
                      <AvatarFallback className="rounded-none bg-muted flex items-center justify-center">
                        <Package className="h-12 w-12 opacity-10" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute top-2 left-2 flex gap-1">
                      {product.stock < 5 && (
                        <Badge variant="destructive" className="flex items-center gap-1 animate-pulse">
                          <AlertTriangle className="h-3 w-3" /> Stock Crítico
                        </Badge>
                      )}
                      {product.status === 'paused' && (
                        <Badge variant="secondary" className="gap-1"><EyeOff className="h-3 w-3" /> Pausado</Badge>
                      )}
                    </div>
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-background/90 text-foreground font-black border-none shadow-md">
                        ${product.price}
                      </Badge>
                    </div>
                  </div>
                  <CardHeader className="p-4">
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="text-base truncate">{product.name}</CardTitle>
                      <Badge variant="outline" className="text-[9px] uppercase h-5">{product.category}</Badge>
                    </div>
                    <CardDescription className="text-xs mt-1">Stock: <strong>{product.stock}</strong> unidades</CardDescription>
                  </CardHeader>
                  <CardFooter className="p-4 pt-0 flex justify-between items-center gap-2">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => toggleStatus(product)}>
                        {product.status === 'active' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setEditingPlayer(product); setIsEditOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteProduct(product.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
            
            {filteredProducts?.length === 0 && !productsLoading && (
              <div className="col-span-full text-center py-32 bg-muted/20 rounded-3xl border-2 border-dashed">
                <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                <h3 className="text-lg font-bold text-muted-foreground">No hay productos que coincidan</h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">Ajusta tu búsqueda o crea una nueva publicación para empezar a vender.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar Publicación</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre del Producto</Label>
                <Input value={editingProduct?.name || ""} onChange={e => setEditingPlayer({...editingProduct, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={editingProduct?.category || ""} onValueChange={v => setEditingPlayer({...editingProduct, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indumentaria">Indumentaria</SelectItem>
                    <SelectItem value="equipamiento">Equipamiento</SelectItem>
                    <SelectItem value="accesorios">Accesorios</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Precio ($)</Label>
                  <Input type="number" value={editingProduct?.price || 0} onChange={e => setEditingPlayer({...editingProduct, price: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label>Stock</Label>
                  <Input type="number" value={editingProduct?.stock || 0} onChange={e => setEditingPlayer({...editingProduct, stock: parseInt(e.target.value)})} />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea value={editingProduct?.description || ""} onChange={e => setEditingPlayer({...editingProduct, description: e.target.value})} className="h-[110px]" />
              </div>
              <div className="space-y-2">
                <Label>URL Imagen</Label>
                <Input value={editingProduct?.photoUrl || ""} onChange={e => setEditingPlayer({...editingProduct, photoUrl: e.target.value})} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateProduct} className="gap-2">
              <Save className="h-4 w-4" /> Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
