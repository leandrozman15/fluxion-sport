
"use client";

import { useState } from "react";
import { 
  Plus, 
  Globe, 
  Search, 
  Loader2, 
  Trash2, 
  Pencil, 
  ArrowRight,
  MapPin,
  Trophy
} from "lucide-react";
import Link from "next/link";
import { collection, doc, setDoc } from "firebase/firestore";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Textarea } from "@/components/ui/textarea";

export default function FederationsPage() {
  const { firestore, user, auth } = useFirebase();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingFed, setEditingFed] = useState<any>(null);
  const [newFed, setNewFed] = useState({ name: "", sport: "", country: "", logoUrl: "", description: "" });

  const fedsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "federations");
  }, [firestore]);

  const { data: federations, isLoading } = useCollection(fedsQuery);

  const handleCreateFed = () => {
    if (!firestore || !user) return;
    const fedId = doc(collection(firestore, "federations")).id;
    const fedDoc = doc(firestore, "federations", fedId);
    
    setDoc(fedDoc, {
      ...newFed,
      id: fedId,
      ownerId: user.uid,
      createdAt: new Date().toISOString()
    });
    
    setNewFed({ name: "", sport: "", country: "", logoUrl: "", description: "" });
    setIsCreateOpen(false);
  };

  const handleUpdateFed = () => {
    if (!firestore || !editingFed) return;
    const fedDoc = doc(firestore, "federations", editingFed.id);
    updateDocumentNonBlocking(fedDoc, {
      name: editingFed.name,
      sport: editingFed.sport,
      country: editingFed.country,
      logoUrl: editingFed.logoUrl,
      description: editingFed.description
    });
    setIsEditOpen(false);
  };

  const handleDeleteFed = (id: string) => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, "federations", id));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline text-foreground">Federaciones Deportivas</h1>
          <p className="text-muted-foreground">Entidades de máximo nivel por deporte y nación.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Registrar Federación
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva Federación</DialogTitle>
              <DialogDescription>Crea la entidad rectora de un deporte.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={newFed.name} onChange={e => setNewFed({...newFed, name: e.target.value})} placeholder="Ej. FIFA, FIBA, RFEF..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Deporte</Label>
                  <Input value={newFed.sport} onChange={e => setNewFed({...newFed, sport: e.target.value})} placeholder="Fútbol" />
                </div>
                <div className="space-y-2">
                  <Label>País</Label>
                  <Input value={newFed.country} onChange={e => setNewFed({...newFed, country: e.target.value})} placeholder="España" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>URL Logo</Label>
                <Input value={newFed.logoUrl} onChange={e => setNewFed({...newFed, logoUrl: e.target.value})} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea value={newFed.description} onChange={e => setNewFed({...newFed, description: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateFed} disabled={!newFed.name || !newFed.sport}>Crear</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {federations?.map((fed: any) => (
            <Card key={fed.id} className="group hover:border-primary transition-all">
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-12 w-12 border">
                  <AvatarImage src={fed.logoUrl} alt={fed.name} />
                  <AvatarFallback><Globe /></AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{fed.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1 font-bold text-primary">
                    {fed.sport} • {fed.country}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="h-20">
                <p className="text-sm text-muted-foreground line-clamp-3">{fed.description || "Sin descripción."}</p>
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-4">
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteFed(fed.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setEditingFed(fed); setIsEditOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/dashboard/federations/${fed.id}`} className="flex items-center gap-2">
                    Asociaciones <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
          {federations?.length === 0 && (
            <div className="col-span-full text-center py-20 border-2 border-dashed rounded-xl">
              <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
              <p className="text-muted-foreground">No hay federaciones registradas.</p>
            </div>
          )}
        </div>
      )}

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Federación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={editingFed?.name || ""} onChange={e => setEditingFed({...editingFed, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Deporte</Label>
                <Input value={editingFed?.sport || ""} onChange={e => setEditingFed({...editingFed, sport: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>País</Label>
                <Input value={editingFed?.country || ""} onChange={e => setEditingFed({...editingFed, country: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>URL Logo</Label>
              <Input value={editingFed?.logoUrl || ""} onChange={e => setEditingFed({...editingFed, logoUrl: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea value={editingFed?.description || ""} onChange={e => setEditingFed({...editingFed, description: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateFed}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
