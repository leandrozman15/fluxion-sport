
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
  ShieldCheck,
  Layers,
  UserRound,
  Users,
  CreditCard,
  Package,
  AlertTriangle,
  Eye,
  EyeOff,
  Search,
  Save,
  ImagePlus,
  X,
  PlusCircle,
  Hash
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProductSize {
  label: string;
  stock: number;
}

export default function ShopAdminPage() {
  const { clubId } = useParams() as { clubId: string };
  const db = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [newProduct, setNewProduct] = useState({ 
    name: "", 
    description: "", 
    price: 0, 
    category: "indumentaria",
    images: [] as string[],
    sizes: [] as ProductSize[],
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const files = e.target.files;
    if (!files) return;

    const currentImages = isEdit ? editingProduct.images : newProduct.images;
    if (currentImages.length + files.length > 5) {
      toast({ variant: "destructive", title: "Máximo 5 imágenes", description: "No puedes subir más de 5 fotos por producto." });
      return;
    }

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (isEdit) {
          setEditingProduct((prev: any) => ({ ...prev, images: [...prev.images, base64] }));
        } else {
          setNewProduct(prev => ({ ...prev, images: [...prev.images, base64] }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number, isEdit = false) => {
    if (isEdit) {
      setEditingProduct((prev: any) => ({
        ...prev,
        images: prev.images.filter((_: any, i: number) => i !== index)
      }));
    } else {
      setNewProduct(prev => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index)
      }));
    }
  };

  const addSize = (isEdit = false) => {
    const newSize = { label: "", stock: 0 };
    if (isEdit) {
      setEditingProduct((prev: any) => ({ ...prev, sizes: [...prev.sizes, newSize] }));
    } else {
      setNewProduct(prev => ({ ...prev, sizes: [...prev.sizes, newSize] }));
    }
  };

  const updateSize = (index: number, field: keyof ProductSize, value: string | number, isEdit = false) => {
    if (isEdit) {
      const updated = [...editingProduct.sizes];
      updated[index] = { ...updated[index], [field]: value };
      setEditingProduct({ ...editingProduct, sizes: updated });
    } else {
      const updated = [...newProduct.sizes];
      updated[index] = { ...updated[index], [field]: value };
      setNewProduct({ ...newProduct, sizes: updated });
    }
  };

  const removeSize = (index: number, isEdit = false) => {
    if (isEdit) {
      setEditingProduct((prev: any) => ({
        ...prev,
        sizes: prev.sizes.filter((_: any, i: number) => i !== index)
      }));
    } else {
      setNewProduct(prev => ({
        ...prev,
        sizes: prev.sizes.filter((_, i) => i !== index)
      }));
    }
  };

  const handleCreateProduct = () => {
    if (!newProduct.name || newProduct.price <= 0) return;
    const productId = doc(collection(db, "clubs", clubId, "shop_products")).id;
    const productDoc = doc(db, "clubs", clubId, "shop_products", productId);
    
    // Calcular stock total
    const totalStock = newProduct.sizes.reduce((acc, s) => acc + s.stock, 0);

    setDoc(productDoc, {
      ...newProduct,
      id: productId,
      clubId,
      stock: totalStock,
      createdAt: new Date().toISOString()
    });
    
    setNewProduct({ name: "", description: "", price: 0, category: "indumentaria", images: [], sizes: [], status: "active" });
    setIsCreateOpen(false);
    toast({ title: "Producto Creado", description: "La publicación ya está disponible en la tienda." });
  };

  const handleUpdateProduct = () => {
    if (!editingProduct) return;
    const productDoc = doc(db, "clubs", clubId, "shop_products", editingProduct.id);
    const totalStock = editingProduct.sizes.reduce((acc: number, s: any) => acc + s.stock, 0);

    updateDocumentNonBlocking(productDoc, {
      name: editingProduct.name,
      description: editingProduct.description,
      price: editingProduct.price,
      stock: totalStock,
      sizes: editingProduct.sizes,
      images: editingProduct.images,
      category: editingProduct.category,
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
            <p className="text-muted-foreground">Gestiona el catálogo, talles, stock y fotos oficiales.</p>
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
              <DialogContent className="max-w-3xl max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>Añadir Producto al Catálogo</DialogTitle>
                  <DialogDescription>Carga fotos desde tu dispositivo y gestiona el stock por talle.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] pr-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <Label className="text-xs font-black uppercase tracking-widest text-primary">Fotos del Producto (Max 5)</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {newProduct.images.map((img, idx) => (
                            <div key={idx} className="relative aspect-square rounded-lg border overflow-hidden group">
                              <img src={img} className="w-full h-full object-cover" />
                              <button 
                                onClick={() => removeImage(idx)}
                                className="absolute top-1 right-1 bg-destructive text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                          {newProduct.images.length < 5 && (
                            <button 
                              onClick={() => fileInputRef.current?.click()}
                              className="aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors"
                            >
                              <ImagePlus className="h-6 w-6 mb-1" />
                              <span className="text-[10px] font-bold">Subir</span>
                            </button>
                          )}
                        </div>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          accept="image/*" 
                          multiple 
                          onChange={(e) => handleImageUpload(e)} 
                        />
                      </div>

                      <div className="space-y-4">
                        <Label className="text-xs font-black uppercase tracking-widest text-primary">Información General</Label>
                        <div className="space-y-2">
                          <Label>Nombre del Producto</Label>
                          <Input value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} placeholder="Ej. Camiseta Titular 2025" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
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
                            <Label>Precio ($)</Label>
                            <Input 
                              type="number" 
                              value={isNaN(newProduct.price) ? "" : newProduct.price} 
                              onChange={e => {
                                const val = e.target.value === '' ? NaN : parseFloat(e.target.value);
                                setNewProduct({...newProduct, price: val});
                              }} 
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Descripción</Label>
                          <Textarea value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="h-24" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <Label className="text-xs font-black uppercase tracking-widest text-primary">Disponibilidad por Talle</Label>
                          <Button variant="ghost" size="sm" onClick={() => addSize()} className="h-7 text-[10px] gap-1">
                            <PlusCircle className="h-3 w-3" /> Agregar Talle
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          {newProduct.sizes.map((s, idx) => (
                            <div key={idx} className="flex gap-2 items-end bg-muted/30 p-2 rounded-lg border">
                              <div className="flex-1 space-y-1">
                                <Label className="text-[10px] font-bold">Talle (Ej. M, 38, 14)</Label>
                                <Input 
                                  value={s.label} 
                                  onChange={e => updateSize(idx, 'label', e.target.value)} 
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div className="w-24 space-y-1">
                                <Label className="text-[10px] font-bold">Stock</Label>
                                <Input 
                                  type="number" 
                                  value={isNaN(s.stock) ? "" : s.stock} 
                                  onChange={e => {
                                    const val = e.target.value === '' ? NaN : parseInt(e.target.value);
                                    updateSize(idx, 'stock', val);
                                  }} 
                                  className="h-8 text-xs"
                                />
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => removeSize(idx)} className="h-8 w-8 p-0 text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          {newProduct.sizes.length === 0 && (
                            <div className="text-center py-8 border-2 border-dashed rounded-xl opacity-50">
                              <p className="text-[10px] font-medium italic">Sin talles. Si no hay talles, el stock se asume único.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
                <DialogFooter className="border-t pt-4">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreateProduct} disabled={!newProduct.name || isNaN(newProduct.price) || newProduct.price <= 0}>Publicar Producto</Button>
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
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar..." 
                className="pl-8" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="pt-4 border-t space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Publicados</span>
                <span className="font-bold">{products?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Fuera de stock</span>
                <Badge variant="destructive" className="h-4 text-[9px]">{products?.filter(p => p.stock === 0).length || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {productsLoading ? (
              <div className="col-span-full flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>
            ) : (
              filteredProducts?.map((product: any) => (
                <Card key={product.id} className={`overflow-hidden border-2 transition-all ${product.status === 'paused' ? 'opacity-60 grayscale' : 'hover:border-primary/50 shadow-sm'}`}>
                  <div className="aspect-square bg-muted relative">
                    <Avatar className="h-full w-full rounded-none">
                      <AvatarImage src={product.images?.[0] || product.photoUrl} className="object-cover" />
                      <AvatarFallback className="rounded-none bg-muted flex items-center justify-center">
                        <Package className="h-12 w-12 opacity-10" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-background/90 text-foreground font-black shadow-md border-none">
                        ${product.price}
                      </Badge>
                    </div>
                    {product.stock <= 0 && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Badge variant="destructive" className="text-xs font-black px-4 py-1">SIN STOCK</Badge>
                      </div>
                    )}
                  </div>
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="text-sm truncate font-bold">{product.name}</CardTitle>
                      <Badge variant="outline" className="text-[8px] uppercase">{product.category}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {product.sizes?.map((s: any, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-[8px] h-4 px-1.5">{s.label}: {s.stock}</Badge>
                      ))}
                    </div>
                  </CardHeader>
                  <CardFooter className="p-4 pt-2 flex justify-between items-center">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => toggleStatus(product)}>
                        {product.status === 'active' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setEditingProduct(product); setIsEditOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => handleDeleteProduct(product.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Editar Publicación</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-xs font-black uppercase tracking-widest text-primary">Fotos del Producto</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {editingProduct?.images?.map((img: string, idx: number) => (
                      <div key={idx} className="relative aspect-square rounded-lg border overflow-hidden group">
                        <img src={img} className="w-full h-full object-cover" />
                        <button onClick={() => removeImage(idx, true)} className="absolute top-1 right-1 bg-destructive text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {(editingProduct?.images?.length || 0) < 5 && (
                      <button onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors">
                        <ImagePlus className="h-6 w-6 mb-1" />
                        <span className="text-[10px] font-bold">Subir</span>
                      </button>
                    )}
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={(e) => handleImageUpload(e, true)} />
                </div>

                <div className="space-y-4">
                  <Label>Información Básica</Label>
                  <Input value={editingProduct?.name || ""} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} />
                  <div className="grid grid-cols-2 gap-4">
                    <Select value={editingProduct?.category || ""} onValueChange={v => setEditingProduct({...editingProduct, category: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="indumentaria">Indumentaria</SelectItem>
                        <SelectItem value="equipamiento">Equipamiento</SelectItem>
                        <SelectItem value="accesorios">Accesorios</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input 
                      type="number" 
                      value={isNaN(editingProduct?.price) ? "" : editingProduct?.price} 
                      onChange={e => {
                        const val = e.target.value === '' ? NaN : parseFloat(e.target.value);
                        setEditingProduct({...editingProduct, price: val});
                      }} 
                    />
                  </div>
                  <Textarea value={editingProduct?.description || ""} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} className="h-24" />
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-black uppercase tracking-widest text-primary">Talles y Stock</Label>
                    <Button variant="ghost" size="sm" onClick={() => addSize(true)} className="h-7 text-[10px] gap-1">
                      <PlusCircle className="h-3 w-3" /> Agregar Talle
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {editingProduct?.sizes?.map((s: any, idx: number) => (
                      <div key={idx} className="flex gap-2 items-end bg-muted/30 p-2 rounded-lg border">
                        <Input value={s.label} onChange={e => updateSize(idx, 'label', e.target.value, true)} className="h-8 text-xs" />
                        <Input 
                          type="number" 
                          value={isNaN(s.stock) ? "" : s.stock} 
                          onChange={e => {
                            const val = e.target.value === '' ? NaN : parseInt(e.target.value);
                            updateSize(idx, 'stock', val, true);
                          }} 
                          className="h-8 text-xs w-24" 
                        />
                        <Button variant="ghost" size="sm" onClick={() => removeSize(idx, true)} className="h-8 w-8 p-0 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateProduct} className="gap-2" disabled={isNaN(editingProduct?.price)}>
              <Save className="h-4 w-4" /> Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
