
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
  Globe
} from "lucide-react";
import Link from "next/link";
import { collection, doc, setDoc, query, getDocs } from "firebase/firestore";
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

export default function ClubsPage() {
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

  // Para poder vincular clubes a asociaciones
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
        assocsSnap.forEach(doc => allAssocs.push({ ...doc.data(), fedName: fedDoc.data().name }));
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
        <h2 className="text-2xl font-bold font-headline">Bienvenido a SportsManager</h2>
        <p className="text-muted-foreground mb-6 max-w-sm">Inicia sesión de forma anónima para comenzar a gestionar tus clubes y equipos deportivos.</p>
        <Button size="lg" onClick={() => initiateAnonymousSignIn(auth)}>Empezar ahora</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline text-foreground">Mis Clubes</h1>
          <p className="text-muted-foreground">Administra la estructura raíz de tus organizaciones deportivas.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(open) fetchAssocs(); }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Registrar Club
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo Club Deportivo</DialogTitle>
              <DialogDescription>Completa los datos para crear el contenedor principal del club.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nombre del Club</Label>
                <Input value={newClub.name} onChange={e => setNewClub({...newClub, name: e.target.value})} placeholder="Ej. Real Madrid C.F." />
              </div>
              <div className="space-y-2">
                <Label>Ligar a Asociación / Liga</Label>
                <Select value={newClub.associationId} onValueChange={v => setNewClub({...newClub, associationId: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder={assocsLoading ? "Cargando..." : "Seleccionar Liga (Opcional)"} />
                  </SelectTrigger>
                  <SelectContent>
                    {associations.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name} ({a.fedName})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dirección Física</Label>
                <Input value={newClub.address} onChange={e => setNewClub({...newClub, address: e.target.value})} placeholder="Calle Falsa 123" />
              </div>
              <div className="space-y-2">
                <Label>Teléfono de Contacto</Label>
                <Input value={newClub.phone} onChange={e => setNewClub({...newClub, phone: e.target.value})} placeholder="+34 600 000 000" />
              </div>
              <div className="space-y-2">
                <Label>URL del Logo</Label>
                <Input value={newClub.logoUrl} onChange={e => setNewClub({...newClub, logoUrl: e.target.value})} placeholder="https://..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateClub} disabled={!newClub.name}>Crear Club</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clubs?.map((club: any) => (
            <Card key={club.id} className="group hover:border-primary transition-all">
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-12 w-12 border">
                  <AvatarImage src={club.logoUrl} alt={club.name} />
                  <AvatarFallback><ShieldCheck /></AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{club.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {club.address}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" /> {club.phone}
                </div>
                {club.associationId && (
                  <div className="flex items-center gap-2 text-accent font-bold">
                    <Globe className="h-3 w-3" /> Federado
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-4">
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteClub(club.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
            <div className="col-span-full text-center py-20 border-2 border-dashed rounded-xl">
              <p className="text-muted-foreground">No tienes clubes registrados aún.</p>
            </div>
          )}
        </div>
      )}

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Club</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={editingClub?.name || ""} onChange={e => setEditingClub({...editingClub, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Asociación / Liga</Label>
              <Select value={editingClub?.associationId || ""} onValueChange={v => setEditingClub({...editingClub, associationId: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar Liga" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguna (Independiente)</SelectItem>
                  {associations.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name} ({a.fedName})</SelectItem>
                  ))}
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
            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input value={editingClub?.logoUrl || ""} onChange={e => setEditingClub({...editingClub, logoUrl: e.target.value})} />
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
