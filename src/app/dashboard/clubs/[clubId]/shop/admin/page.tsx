
"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import { 
  Plus, 
  Loader2,
  Trash2,
  Pencil,
  ShoppingBag,
  LayoutDashboard,
  Layers,
  UserRound,
  Users,
  CreditCard,
  Package,
  Eye,
  Search,
  ImagePlus,
  X,
  PlusCircle,
  Tag
} from "lucide-react";
import Link from "next/link";
import { collection, doc, setDoc } from "firebase/firestore";
import { useFirestore, useCollection, useDoc, useMemoFirebase, useFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { SectionNav } from "@/components/layout/section-nav";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { uploadFileAndGetUrl } from "@/lib/storage-utils";

interface ProductSize {
  label: string;
  stock: number;
}

export default function ShopAdminPage() {
  const { clubId } = useParams() as { clubId: string };
  const { firestore, storage } = useFirebase();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [uploading, setUploading] = useState(false);

  const INITIAL_PRODUCT = { 
    name: "", 
    description: "", 
    price: 0, 
    category: "indumentaria",
    images: [] as string[],
    sizes: [{ label: "Único", stock: 10 }] as ProductSize[],
    status: "active"
  };

  const [newProduct, setNewProduct] = useState(INITIAL_PRODUCT);

  const clubRef = useMemoFirebase(() => doc(firestore, "clubs", clubId), [firestore, clubId]);
  const { data: club, isLoading: clubLoading } = useDoc(clubRef);

  const productsQuery = useMemoFirebase(() => collection(firestore, "clubs", clubId, "shop_products"), [firestore, clubId]);
  const { data: products, isLoading: productsLoading } = useCollection(productsQuery);

  const ordersQuery = useMemoFirebase(() => collection(firestore, "clubs", clubId, "shop_orders"), [firestore, clubId]);
  const { data: orders } = useCollection(ordersQuery);

  const clubNav = [
    { title: "Panel General", href: `/dashboard/clubs/${clubId}`, icon: LayoutDashboard },
    { title: "Categorías", href: `/dashboard/clubs/${clubId}/divisions`, icon: Layers },
    { title: "Staff Técnico", href: `/dashboard/clubs/${clubId}/coaches`, icon: UserRound },
    { title: "Tienda Club", href: `/dashboard/clubs/${clubId}/shop/admin`, icon: ShoppingBag },
    { title: "Base Jugadores", href: `/dashboard/clubs/${clubId}/players`, icon: Users },
    { title: "Finanzas", href: `/dashboard/clubs/${clubId}/finances`, icon: CreditCard },
  ];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const path = `clubs/${clubId}/shop/item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        return await uploadFileAndGetUrl(storage, path, file);
      });

      const urls = await Promise.all(uploadPromises);

      if (isEdit) {
        setEditingProduct((prev: any) => ({ ...prev, images: [...(prev.images || []), ...urls] }));
      } else {
        setNewProduct(prev => ({ ...prev, images: [...prev.images, ...urls] }));
      }
      toast({ title: "Imágenes cargadas en Storage" });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Error al subir imágenes" });
    } finally {
      setUploading(false);
    }
  };

  const handleAddSize = (isEdit = false) => {
    const defaultSize = { label: "", stock: 0 };
    if (isEdit) setEditingProduct((prev: any) => ({ ...prev, sizes: [...(prev.sizes || []), defaultSize] }));
    else setNewProduct(prev => ({ ...prev, sizes: [...prev.sizes, defaultSize] }));
  };

  const handleUpdateSize = (index: number, field: keyof ProductSize, value: any, isEdit = false) => {
    if (isEdit) {
      const newSizes = [...editingProduct.sizes];
      newSizes[index] = { ...newSizes[index], [field]: value };
      setEditingProduct({ ...editingProduct, sizes: newSizes });
    } else {
      const newSizes = [...newProduct.sizes];
      newSizes[index] = { ...newSizes[index], [field]: value };
      setNewProduct({ ...newProduct, sizes: newSizes });
    }
  };

  const handleCreateProduct = async () => {
    if (!newProduct.name || !newProduct.price) return;
    const productId = doc(collection(firestore, "clubs", clubId, "shop_products")).id;
    const productDoc = doc(firestore, "clubs", clubId, "shop_products", productId);
    
    await setDoc(productDoc, { 
      ...newProduct, 
      id: productId, 
      clubId, 
      createdAt: new Date().toISOString() 
    });
    
    setNewProduct(INITIAL_PRODUCT);
    setIsCreateOpen(false);
    toast({ title: "Producto Publicado" });
  };

  const handleSaveEdit = () => {
    if (!editingProduct) return;
    updateDocumentNonBlocking(doc(firestore, "clubs", clubId, "shop_products", editingProduct.id), { ...editingProduct });
    setIsEditOpen(false);
    toast({ title: "Catálogo Actualizado" });
  };

  const filteredProducts = products?.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;

  if (clubLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white" /></div>;

  return (
    <div className="flex flex-col md:flex-row gap-8 animate-in fade-in duration-500">
      <SectionNav items={clubNav} basePath={`/dashboard/clubs/${clubId}`} />
      
      <div className="flex-1 space-y-8 pb-24 px-4 md:px-0">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black font-headline text-white drop-shadow-md">Gestión de Tienda</h1>
            <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] mt-1">{club?.name} • Control de catálogo cloud.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white hover:text-primary h-12 font-black uppercase text-[10px] tracking-widest px-6 shadow-xl relative backdrop-blur-md">
              <Link href={`/dashboard/clubs/${clubId}/shop/orders`}>
                <ShoppingBag className="h-4 w-4 mr-2" /> Ver Reservas
                {pendingOrders > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white h-6 w-6 rounded-full flex items-center justify-center text-[10px] shadow-lg border-2 border-white animate-bounce">
                    {pendingOrders}
                  </span>
                )}
              </Link>
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-white text-primary hover:bg-slate-50 border-none h-12 font-black uppercase text-[10px] tracking-widest px-8 shadow-2xl">
                  <Plus className="h-5 w-5 mr-2" /> Nueva Publicación
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl bg-white border-none shadow-2xl rounded-[2.5rem]">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black text-slate-900">Nueva Ficha en Storage</DialogTitle>
                  <DialogDescription className="font-bold text-slate-500">Define las características, stock y fotos oficiales.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] pr-4">
                  <div className="space-y-8 py-6">
                    <div className="space-y-3">
                      <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Galería de Imágenes (Nube)</Label>
                      <div className="grid grid-cols-4 gap-4">
                        {newProduct.images.map((img, i) => (
                          <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border-2 shadow-sm group">
                            <img src={img} className="w-full h-full object-cover" />
                            <button 
                              onClick={() => setNewProduct(prev => ({ ...prev, images: prev.images.filter((_, idx) => idx !== i) }))}
                              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center hover:border-primary transition-all text-slate-400 hover:text-primary"
                        >
                          {uploading ? <Loader2 className="animate-spin h-6 w-6" /> : <ImagePlus className="h-6 w-6 mb-1" />}
                          <span className="text-[8px] font-black uppercase">{uploading ? "Subiendo" : "Subir"}</span>
                        </button>
                      </div>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={(e) => handleImageUpload(e)} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="font-bold">Nombre del Producto</Label>
                        <Input value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} placeholder="Ej. Camiseta Titular 2025" className="h-12 border-2" />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold">Categoría</Label>
                        <Select value={newProduct.category} onValueChange={v => setNewProduct({...newProduct, category: v})}>
                          <SelectTrigger className="h-12 border-2"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="indumentaria">Indumentaria</SelectItem>
                            <SelectItem value="equipamiento">Equipamiento Pro</SelectItem>
                            <SelectItem value="accesorios">Accesorios</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="font-bold">Precio Oficial ($)</Label>
                      <Input type="number" value={newProduct.price || ""} onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})} className="h-12 border-2 font-black text-lg text-primary" />
                    </div>

                    <div className="space-y-2">
                      <Label className="font-bold">Descripción Corta</Label>
                      <Textarea value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} placeholder="Detalles técnicos..." className="border-2" />
                    </div>

                    <div className="space-y-4 bg-slate-50 p-6 rounded-[2rem] border">
                      <div className="flex justify-between items-center">
                        <Label className="font-black text-xs uppercase tracking-widest text-primary">Variantes y Disponibilidad</Label>
                        <Button variant="ghost" size="sm" onClick={() => handleAddSize(false)} className="text-primary font-black text-[10px] uppercase">
                          <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Agregar Talle
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {newProduct.sizes.map((s, i) => (
                          <div key={i} className="flex gap-4 items-end animate-in slide-in-from-left-2">
                            <div className="flex-1 space-y-1.5">
                              <Label className="text-[10px] uppercase text-slate-400">Talle</Label>
                              <Input value={s.label} onChange={e => handleUpdateSize(i, 'label', e.target.value, false)} className="h-10 bg-white" />
                            </div>
                            <div className="w-32 space-y-1.5">
                              <Label className="text-[10px] uppercase text-slate-400">Stock</Label>
                              <Input type="number" value={s.stock} onChange={e => handleUpdateSize(i, 'stock', parseInt(e.target.value), false)} className="h-10 bg-white" />
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setNewProduct(prev => ({ ...prev, sizes: prev.sizes.filter((_, idx) => idx !== i) }))} className="text-slate-300 hover:text-destructive h-10 w-10"><X className="h-4 w-4" /></Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
                <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-8 border-t rounded-b-[2.5rem]">
                  <Button variant="ghost" onClick={() => setIsCreateOpen(false)} className="font-bold text-slate-500">Cancelar</Button>
                  <Button onClick={handleCreateProduct} disabled={!newProduct.name || !newProduct.price || uploading} className="font-black uppercase text-xs tracking-widest h-14 px-12 shadow-xl shadow-primary/20">Publicar en Tienda</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
          <Input 
            placeholder="Buscar por nombre o categoría..." 
            className="pl-10 h-14 text-lg bg-white/10 border-white/20 text-white placeholder:text-white/30 backdrop-blur-md" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {productsLoading ? (
            <div className="col-span-full flex justify-center py-20"><Loader2 className="animate-spin text-white h-12 w-12" /></div>
          ) : (
            filteredProducts?.map((p: any) => {
              const totalStock = p.sizes?.reduce((acc: number, s: any) => acc + (s.stock || 0), 0) || 0;
              return (
                <Card key={p.id} className="group overflow-hidden border-none shadow-2xl bg-white/95 backdrop-blur-md rounded-[2rem] transition-all hover:-translate-y-1">
                  <div className="aspect-square relative overflow-hidden bg-slate-50">
                    <img src={p.images?.[0] || p.photoUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-primary text-white font-black px-3 py-1 shadow-lg border-none">${p.price}</Badge>
                    </div>
                    {totalStock <= 0 && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                        <Badge variant="destructive" className="font-black uppercase tracking-widest px-4 py-2 text-xs animate-pulse">Sin Stock</Badge>
                      </div>
                    )}
                  </div>
                  <CardHeader className="p-6">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Tag className="h-3 w-3 text-primary" />
                      <span className="text-[9px] font-black uppercase text-primary tracking-widest">{p.category}</span>
                    </div>
                    <CardTitle className="text-xl font-black text-slate-900 line-clamp-1">{p.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Package className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Stock Total: {totalStock}</span>
                    </div>
                  </CardHeader>
                  <CardFooter className="bg-slate-50/50 border-t p-4 flex justify-end gap-2">
                    <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-slate-400 hover:text-primary rounded-xl" onClick={() => { setEditingProduct(p); setIsEditOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-slate-400 hover:text-destructive rounded-xl" onClick={() => { if(confirm("¿Eliminar este producto?")) deleteDocumentNonBlocking(doc(firestore, "clubs", clubId, "shop_products", p.id)) }}><Trash2 className="h-4 w-4" /></Button>
                  </CardFooter>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-3xl bg-white border-none shadow-2xl rounded-[2.5rem]">
          <DialogHeader><DialogTitle className="text-2xl font-black text-slate-900">Editar Producto</DialogTitle></DialogHeader>
          {editingProduct && (
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-8 py-6">
                <div className="space-y-3">
                  <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Galería en la Nube</Label>
                  <div className="grid grid-cols-4 gap-4">
                    {editingProduct.images?.map((img: string, i: number) => (
                      <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border-2 group">
                        <img src={img} className="w-full h-full object-cover" />
                        <button 
                          onClick={() => setEditingProduct({ ...editingProduct, images: editingProduct.images.filter((_: any, idx: number) => idx !== i) })}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400 hover:text-primary" disabled={uploading}>
                      {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus className="h-6 w-6" />}
                    </button>
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={(e) => handleImageUpload(e, true)} />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-bold">Nombre</Label>
                    <Input value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="h-12 border-2" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Precio</Label>
                    <Input type="number" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})} className="h-12 border-2 font-black text-primary" />
                  </div>
                </div>

                <div className="space-y-4 bg-slate-50 p-6 rounded-[2rem] border">
                  <div className="flex justify-between items-center">
                    <Label className="font-black text-xs uppercase tracking-widest text-primary">Variantes</Label>
                    <Button variant="ghost" size="sm" onClick={() => handleAddSize(true)} className="text-primary font-black text-[10px] uppercase">
                      <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Agregar Talle
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {editingProduct.sizes?.map((s: any, i: number) => (
                      <div key={i} className="flex gap-4 items-end">
                        <div className="flex-1"><Input value={s.label} onChange={e => handleUpdateSize(i, 'label', e.target.value, true)} className="h-10 bg-white" /></div>
                        <div className="w-32"><Input type="number" value={s.stock} onChange={e => handleUpdateSize(i, 'stock', parseInt(e.target.value), true)} className="h-10 bg-white" /></div>
                        <Button variant="ghost" size="icon" onClick={() => setEditingProduct({ ...editingProduct, sizes: editingProduct.sizes.filter((_: any, idx: number) => idx !== i) })} className="text-slate-300 hover:text-destructive"><X className="h-4 w-4" /></Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
          <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-8 border-t rounded-b-[2.5rem]">
            <Button variant="ghost" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} className="font-black uppercase text-xs tracking-widest h-14 px-12 shadow-xl" disabled={uploading}>Actualizar en Nube</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
