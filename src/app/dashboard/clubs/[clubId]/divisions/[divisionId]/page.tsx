
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
  Milestone
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

export default function SubcategoriesPage() {
  const { clubId, divisionId } = useParams() as { clubId: string, divisionId: string };
  const db = useFirestore();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<any>(null);
  const [newSub, setNewSub] = useState({ name: "", ageRange: "" });

  const divRef = useMemoFirebase(() => doc(db, "clubs", clubId, "divisions", divisionId), [db, clubId, divisionId]);
  const { data: division, isLoading: divLoading } = useDoc(divRef);

  const subsQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "divisions", divisionId, "subcategories"), [db, clubId, divisionId]);
  const { data: subcategories, isLoading: subsLoading } = useCollection(subsQuery);

  const handleCreateSub = () => {
    const subId = doc(collection(db, "clubs", clubId, "divisions", divisionId, "subcategories")).id;
    const subDoc = doc(db, "clubs", clubId, "divisions", divisionId, "subcategories", subId);
    
    setDoc(subDoc, {
      ...newSub,
      id: subId,
      divisionId,
      createdAt: new Date().toISOString()
    });
    
    setNewSub({ name: "", ageRange: "" });
    setIsCreateOpen(false);
  };

  const handleUpdateSub = () => {
    if (!editingSub) return;
    const subDoc = doc(db, "clubs", clubId, "divisions", divisionId, "subcategories", editingSub.id);
    updateDocumentNonBlocking(subDoc, {
      name: editingSub.name,
      ageRange: editingSub.ageRange
    });
    setIsEditOpen(false);
  };

  const handleDeleteSub = (id: string) => {
    deleteDocumentNonBlocking(doc(db, "clubs", clubId, "divisions", divisionId, "subcategories", id));
  };

  if (divLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4">
        <Link href={`/dashboard/clubs/${clubId}/divisions`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors w-fit">
          <ChevronLeft className="h-4 w-4" /> Volver a categorías
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline text-foreground">Subniveles: {division?.name}</h1>
            <p className="text-muted-foreground">Categorías específicas por edad (ej. 9na, 8va, Sub 15).</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> Nueva Subcategoría
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Subcategoría</DialogTitle>
                <DialogDescription>Añade un nivel específico a esta categoría.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nombre (Ej. 9na o Sub 15)</Label>
                  <Input value={newSub.name} onChange={e => setNewSub({...newSub, name: e.target.value})} placeholder="Ej. 9na" />
                </div>
                <div className="space-y-2">
                  <Label>Rango de Edad (Opcional)</Label>
                  <Input value={newSub.ageRange} onChange={e => setNewSub({...newSub, ageRange: e.target.value})} placeholder="Ej. 10-11 años" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreateSub} disabled={!newSub.name}>Crear</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subsLoading ? (
          <div className="col-span-full flex justify-center p-12"><Loader2 className="animate-spin" /></div>
        ) : (
          subcategories?.map((sub: any) => (
            <Card key={sub.id} className="hover:border-primary transition-all">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  {sub.name}
                  <Milestone className="h-4 w-4 text-primary" />
                </CardTitle>
                <CardDescription>{sub.ageRange || "Sin rango definido"}</CardDescription>
              </CardHeader>
              <CardFooter className="flex justify-between border-t pt-4">
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteSub(sub.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setEditingSub(sub); setIsEditOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/dashboard/clubs/${clubId}/divisions/${divisionId}/subcategories/${sub.id}`}>
                    Equipos <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
        {subcategories?.length === 0 && !subsLoading && (
          <div className="col-span-full text-center py-12 border-2 border-dashed rounded-xl">
            <p className="text-muted-foreground">Aún no hay subcategorías registradas en {division?.name}.</p>
          </div>
        )}
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Subcategoría</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={editingSub?.name || ""} onChange={e => setEditingSub({...editingSub, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Rango de Edad</Label>
              <Input value={editingSub?.ageRange || ""} onChange={e => setEditingSub({...editingSub, ageRange: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateSub}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
