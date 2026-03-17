
"use client";

import { useState } from "react";
import { 
  Plus, 
  ShieldCheck, 
  MapPin, 
  Phone, 
  ArrowRight,
  Loader2,
  Trash2,
  Pencil,
  Globe,
  Building
} from "lucide-react";
import Link from "next/link";
import { collection, doc, setDoc, getDocs } from "firebase/firestore";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { initiateAnonymousSignIn } from "@/firebase/non-blocking-login";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function InstitutionsPage() {
  const { firestore, auth, user, isUserLoading } = useFirebase();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingClub, setEditingClub] = useState<any>(null);
  const [newClub, setNewClub] = useState({ name: "", address: "", phone: "", logoUrl: "", associationId: "" });

  const clubsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, "clubs");
  }, [firestore, user]);

  const { data: clubs, isLoading } = useCollection(clubsQuery);

  const [associations, setAssociations] = useState<any[]>([]);
  const [assocsLoading, setAssocsLoading] = useState(false);

  const fetchAssocs = async () => {
    if (!firestore) return;
    setAssocsLoading(true);
    try {
      const fedsSnap = await getDocs(collection(firestore, "federations"));
      const allAssocs: any[] = [];
      for (const fedDoc of fedsSnap.docs) {
        const assocsSnap = await getDocs(collection(firestore, "federations", fedDoc.id, "associations"));
        assocsSnap.forEach(doc => allAssocs.push({ ...doc.data(), id: doc.id, fedName: fedDoc.data().name }));
      }
      setAssociations(allAssocs);
    } catch (e) {
      console.error(e);
    } finally {
      setAssocsLoading(false);
    }
  };

  const handleCreateClub = () => {
    if (!firestore || !user) {
      initiateAnonymousSignIn(auth);
      return;
    }
    const clubId = doc(collection(firestore, "clubs")).id;
    const clubDoc = doc(firestore, "clubs", clubId);
    
    setDoc(clubDoc, {
      ...newClub,
      id: clubId,
      ownerId: user.uid,
      createdAt: new Date().toISOString()
    });
    
    setNewClub({ name: "", address: "", phone: "", logoUrl: "", associationId: "" });
    setIsDialogOpen(false);
  };

  const handleUpdateClub = () => {
    if (!firestore || !editingClub) return;
    const clubDoc = doc(firestore, "clubs", editingClub.id);
    updateDocumentNonBlocking(clubDoc, {
      name: editingClub.name,
      address: editingClub.address,
      phone: editingClub.phone,
      logoUrl: editingClub.logoUrl,
      associationId: editingClub.associationId
    });
    setIsEditOpen(false);
  };

  const handleDeleteClub = (id: string) => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, "clubs", id));
  };

  if (isUserLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[60vh]">
        <div className="bg-primary/10 p-4 rounded-full mb-4">
          <ShieldCheck className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-2xl font-bold font-headline text-foreground">Instituciones Deportivas</h2>
        <p className="text-muted-foreground mb-6 max-w-sm">Inicia sesión para gestionar el padrón de clubes e instituciones.</p>
        <Button size="lg" onClick={() => initiateAnonymousSignIn(auth)}>Empezar ahora</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline text-foreground">Instituciones</h1>
          <p className="text-muted-foreground">Clubes y entidades vinculadas al sistema nacional.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(open) fetchAssocs(); }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Registrar Institución
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva Institución</DialogTitle>
              <DialogDescription>Completa los datos y vincula el club a su asociación regional.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nombre del Club</Label>
                <Input value={newClub.name} onChange={e => setNewClub({...newClub, name: e.target.value})} placeholder="Ej. Lomas Athletic Club" />
              </div>
              <div className="space-y-2">
                <Label>Asociación Regional</Label>
                <Select value={newClub.associationId} onValueChange={v => setNewClub({...newClub, associationId: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder={assocsLoading ? "Cargando..." : "Seleccionar Asociación"} />
                  </SelectTrigger>
                  <SelectContent>
                    {associations.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name} ({a.fedName})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input value={newClub.address} onChange={e => setNewClub({...newClub, address: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>URL Logo</Label>
                <Input value={newClub.logoUrl} onChange={e => setNewClub({...newClub, logoUrl: e.target.value})} placeholder="https://..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateClub} disabled={!newClub.name || !newClub.associationId}>Registrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clubs?.map((club: any) => (
            <Card key={club.id} className="group hover:border-primary transition-all overflow-hidden border-l-4 border-l-primary">
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-14 w-14 border-2 border-primary/10">
                  <AvatarImage src={club.logoUrl} alt={club.name} />
                  <AvatarFallback><Building /></AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{club.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1 font-medium text-primary">
                    <Globe className="h-3 w-3" /> {associations.find(a => a.id === club.associationId)?.name || 'Asociación vinculada'}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {club.address || "Sede oficial"}</div>
                <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {club.phone || "Sin contacto"}</div>
              </CardContent>
              <CardFooter className="flex justify-between border-t bg-muted/10 pt-4">
                <div className="flex gap-1">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Confirmas la eliminación?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción eliminará a <strong>{club.name}</strong> del sistema. No se podrán recuperar los datos asociados.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteClub(club.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Eliminar Permanentemente
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  
                  <Button variant="ghost" size="sm" onClick={() => { setEditingClub(club); setIsEditOpen(true); fetchAssocs(); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <Button asChild size="sm">
                  <Link href={`/dashboard/clubs/${club.id}`} className="flex items-center gap-2">
                    Gestionar <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
          {clubs?.length === 0 && (
            <div className="col-span-full text-center py-20 border-2 border-dashed rounded-xl bg-muted/20">
              <Building className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
              <p className="text-muted-foreground">No hay instituciones registradas todavía.</p>
            </div>
          )}
        </div>
      )}

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Institución</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={editingClub?.name || ""} onChange={e => setEditingClub({...editingClub, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Asociación Regional</Label>
              <Select value={editingClub?.associationId || ""} onValueChange={v => setEditingClub({...editingClub, associationId: v})}>
                <SelectTrigger><SelectValue placeholder="Cambiar Asociación" /></SelectTrigger>
                <SelectContent>
                  {associations.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input value={editingClub?.address || ""} onChange={e => setEditingClub({...editingClub, address: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input value={editingClub?.phone || ""} onChange={e => setEditingClub({...editingClub, phone: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateClub}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
