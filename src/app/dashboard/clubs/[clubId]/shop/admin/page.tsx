
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
  EyeOff,
  Search,
  ImagePlus,
  X,
  PlusCircle
} from "lucide-react";
import Link from "next/link";
import { collection, doc, setDoc } from "firebase/firestore";
import { useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
    { title: "Categorías", href: `/dashboard/clubs/${clubId}/divisions`, icon: Layers },
    { title: "Staff Técnico", href: `/dashboard/clubs/${clubId}/coaches`, icon: UserRound },
    { title: "Tienda Club", href: `/dashboard/clubs/${clubId}/shop/admin`, icon: ShoppingBag },
    { title: "Base Jugadores", href: `/dashboard/clubs/${clubId}/players`, icon: Users },
    { title: "Finanzas", href: `/dashboard/clubs/${clubId}/finances`, icon: CreditCard },
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (isEdit) setEditingProduct((prev: any) => ({ ...prev, images: [...prev.images, base64] }));
        else setNewProduct(prev => ({ ...prev, images: [...prev.images, base64] }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCreateProduct = () => {
    const productId = doc(collection(db, "clubs", clubId, "shop_products")).id;
    const productDoc = doc(db, "clubs", clubId, "shop_products", productId);
    setDoc(productDoc, { ...newProduct, id: productId, clubId, createdAt: new Date().toISOString() });
    setNewProduct({ name: "", description: "", price: 0, category: "indumentaria", images: [], sizes: [], status: "active" });
    setIsCreateOpen(false);
    toast({ title: "Producto Publicado" });
  };

  if (clubLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex gap-8 animate-in fade-in duration-500">
      <SectionNav items={clubNav} basePath={`/dashboard/clubs/${clubId}`} />
      
      <div className="flex-1 space-y-8 pb-20">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black font-headline">Administración de Tienda</h1>
            <p className="text-muted-foreground">{club?.name} • Gestión de catálogo oficial.</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Nueva Publicación</Button></DialogTrigger>
            <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Nuevo Producto</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <Input value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} placeholder="Nombre" />
                <Input type="number" value={newProduct.price || ""} onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})} placeholder="Precio" />
                <Textarea value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} placeholder="Descripción" />
              </div>
              <DialogFooter><Button onClick={handleCreateProduct}>Publicar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {productsLoading ? <Loader2 className="animate-spin mx-auto" /> : products?.map((p: any) => (
            <Card key={p.id} className="overflow-hidden">
              <div className="aspect-square bg-muted">
                <img src={p.images?.[0]} className="w-full h-full object-cover" />
              </div>
              <CardHeader className="p-4"><CardTitle className="text-sm font-bold">{p.name}</CardTitle></CardHeader>
              <CardFooter className="p-4 pt-0 flex justify-between">
                <Badge>${p.price}</Badge>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteDocumentNonBlocking(doc(db, "clubs", clubId, "shop_products", p.id))}><Trash2 className="h-4 w-4" /></Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
