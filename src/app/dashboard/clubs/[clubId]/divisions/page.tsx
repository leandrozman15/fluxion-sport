
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { 
  Plus, 
  Loader2,
  Trash2,
  ChevronLeft,
  ArrowRight,
  Pencil,
  Layers,
  LayoutDashboard,
  ShieldCheck,
  UserRound,
  Users,
  CreditCard
} from "lucide-react";
import Link from "next/link";
import { collection, doc, setDoc } from "firebase/firestore";
import { useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { SectionNav } from "@/components/layout/section-nav";

export default function ClubDivisionsListPage() {
  const { clubId } = useParams() as { clubId: string };
  const db = useFirestore();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingDiv, setEditingDiv] = useState<any>(null);
  const [newDiv, setNewDiv] = useState({ name: "", description: "" });

  const clubRef = useMemoFirebase(() => doc(db, "clubs", clubId), [db, clubId]);
  const { data: club, isLoading: clubLoading } = useDoc(clubRef);

  const divisionsQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "divisions"), [db, clubId]);
  const { data: divisions, isLoading: divsLoading } = useCollection(divisionsQuery);

  const clubNav = [
    { title: "Panel General", href: `/dashboard/clubs/${clubId}`, icon: LayoutDashboard },
    { title: "Administración", href: `/dashboard/clubs/${clubId}/admin`, icon: ShieldCheck },
    { title: "Categorías", href: `/dashboard/clubs/${clubId}/divisions`, icon: Layers },
    { title: "Staff Técnico", href: `/dashboard/clubs/${clubId}/coaches`, icon: UserRound },
    { title: "Base Jugadores", href: `/dashboard/clubs/${clubId}/players`, icon: Users },
    { title: "Finanzas", href: `/dashboard/clubs/${clubId}/finances`, icon: CreditCard },
  ];

  const handleCreateDiv = () => {
    const divId = doc(collection(db, "clubs", clubId, "divisions")).id;
    const divDoc = doc(db, "clubs", clubId, "divisions", divId);
    
    setDoc(divDoc, {
      ...newDiv,
      id: divId,
      clubId,
      createdAt: new Date().toISOString()
    });
    
    setNewDiv({ name: "", description: "" });
    setIsCreateOpen(false);
  };

  const handleUpdateDiv = () => {
    if (!editingDiv) return;
    const divDoc = doc(db, "clubs", clubId, "divisions", editingDiv.id);
    updateDocumentNonBlocking(divDoc, {
      name: editingDiv.name,
      description: editingDiv.description
    });
    setIsEditOpen(false);
  };

  const handleDeleteDiv = (id: string) => {
    deleteDocumentNonBlocking(doc(db, "clubs", clubId, "divisions", id));
  };

  if (clubLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline text-foreground">Categorías: {club?.name}</h1>
            <p className="text-muted-foreground">Ramas deportivas y niveles competitivos del club.</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> Nueva Categoría
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Categoría</DialogTitle>
                <DialogDescription>Añade una rama (ej. Damas, Caballeros, Mami Hockey).</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nombre de la Categoría</Label>
                  <Input value={newDiv.name} onChange={e => setNewDiv({...newDiv, name: e.target.value})} placeholder="Ej. Damas" />
                </div>
                <div className="space-y-2">
                  <Label>Descripción Corta</Label>
                  <Input value={newDiv.description} onChange={e => setNewDiv({...newDiv, description: e.target.value})} placeholder="Ej. Rama femenina competitiva" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreateDiv} disabled={!newDiv.name}>Crear</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <SectionNav items={clubNav} basePath={`/dashboard/clubs/${clubId}`} />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {divsLoading ? (
          <div className="col-span-full flex justify-center p-12"><Loader2 className="animate-spin" /></div>
        ) : (
          divisions?.map((division: any) => (
            <Card key={division.id} className="hover:border-primary transition-all border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  {division.name}
                  <Layers className="h-4 w-4 text-primary" />
                </CardTitle>
                <CardDescription>{division.description || "Gestión de subcategorías y equipos."}</CardDescription>
              </CardHeader>
              <CardFooter className="flex justify-between border-t pt-4">
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteDiv(division.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setEditingDiv(division); setIsEditOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/dashboard/clubs/${clubId}/divisions/${division.id}`}>
                    Ver Subcategorías <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
        {divisions?.length === 0 && !divsLoading && (
          <div className="col-span-full text-center py-12 border-2 border-dashed rounded-xl">
            <p className="text-muted-foreground">Aún no hay categorías registradas en {club?.name}.</p>
          </div>
        )}
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Categoría</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={editingDiv?.name || ""} onChange={e => setEditingDiv({...editingDiv, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input value={editingDiv?.description || ""} onChange={e => setEditingDiv({...editingDiv, description: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateDiv}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
