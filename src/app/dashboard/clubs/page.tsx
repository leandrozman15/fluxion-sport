
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { collection, doc, setDoc, getDocs, updateDoc } from "firebase/firestore";
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
import { useToast } from "@/hooks/use-toast";
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
  const router = useRouter();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingClub, setEditingClub] = useState<any>(null);
  const [loading, setLoading] = useState(false);
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

  const handleCreateClub = async () => {
    if (!firestore || !user) {
      initiateAnonymousSignIn(auth);
      return;
    }
    setLoading(true);
    try {
      const clubId = doc(collection(firestore, "clubs")).id;
      const clubDoc = doc(firestore, "clubs", clubId);
      
      // 1. Crear el Club
      await setDoc(clubDoc, {
        ...newClub,
        id: clubId,
        ownerId: user.uid,
        createdAt: new Date().toISOString()
      });

      // 2. Vincular el perfil del usuario actual al nuevo club (IMPORTANTE para corregir el cache)
      await setDoc(doc(firestore, "users", user.uid), {
        clubId: clubId,
        role: "club_admin"
      }, { merge: true });
      
      setNewClub({ name: "", address: "", phone: "", logoUrl: "", associationId: "" });
      setIsDialogOpen(false);
      toast({ title: "Club Registrado", description: "Has sido vinculado como administrador de esta institución." });
      
      // 3. Redirigir inmediatamente al dashboard del nuevo club
      router.push(`/dashboard/clubs/${clubId}`);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error al registrar" });
    } finally {
      setLoading(false);
    }
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

  if (isUserLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white" /></div>;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[60vh]">
        <div className="bg-primary/20 p-6 rounded-full mb-6 border border-primary/30 backdrop-blur-sm">
          <ShieldCheck className="h-16 w-16 text-primary" />
        </div>
        <h2 className="text-4xl font-black text-white tracking-tighter mb-4">Instituciones Deportivas</h2>
        <p className="text-slate-200 mb-8 max-w-sm font-medium">Inicia sesión para gestionar el padrón de clubes e instituciones.</p>
        <Button size="lg" onClick={() => initiateAnonymousSignIn(auth)} className="h-14 px-10 text-lg font-black uppercase tracking-widest shadow-xl shadow-primary/20">Empezar ahora</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black font-headline text-white drop-shadow-md">Instituciones</h1>
          <p className="text-slate-200 font-bold uppercase tracking-widest text-xs mt-1">Clubes y entidades vinculadas al sistema nacional.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(open) fetchAssocs(); }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2 h-12 px-6 font-black uppercase text-xs tracking-widest shadow-lg">
              <Plus className="h-5 w-5" /> Registrar Institución
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-slate-900">Nueva Institución</DialogTitle>
              <DialogDescription className="text-slate-500">Completa los datos y vincula el club a su asociación regional.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-slate-700 font-bold">Nombre del Club</Label>
                <Input value={newClub.name} onChange={e => setNewClub({...newClub, name: e.target.value})} placeholder="Ej. Lomas Athletic Club" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 font-bold">Asociación Regional</Label>
                <Select value={newClub.associationId} onValueChange={v => setNewClub({...newClub, associationId: v})}>
                  <SelectTrigger className="bg-white">
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
                <Label className="text-slate-700 font-bold">Dirección</Label>
                <Input value={newClub.address} onChange={e => setNewClub({...newClub, address: e.target.value})} placeholder="Calle y Ciudad" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 font-bold">URL Logo</Label>
                <Input value={newClub.logoUrl} onChange={e => setNewClub({...newClub, logoUrl: e.target.value})} placeholder="https://..." />
              </div>
            </div>
            <DialogFooter className="bg-muted/30 -mx-6 -mb-6 p-6">
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)} disabled={loading}>Cancelar</Button>
              <Button onClick={handleCreateClub} disabled={!newClub.name || !newClub.associationId || loading} className="font-bold">
                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "Registrar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clubs?.map((club: any) => (
            <Card key={club.id} className="group hover:border-primary transition-all overflow-hidden border-l-4 border-l-primary bg-card">
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-14 w-14 border-2 border-primary/10 shadow-sm">
                  <AvatarImage src={club.logoUrl} alt={club.name} className="object-contain" />
                  <AvatarFallback className="bg-muted"><Building className="text-slate-400" /></AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg font-black truncate text-slate-900">{club.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1 font-bold text-primary text-[10px] uppercase tracking-tight">
                    <Globe className="h-3 w-3" /> {associations.find(a => a.id === club.associationId)?.name || 'Asociación vinculada'}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400" /> {club.address || "Sede oficial"}</div>
                <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" /> {club.phone || "Sin contacto"}</div>
              </CardContent>
              <CardFooter className="flex justify-between border-t bg-slate-50/50 pt-4">
                <div className="flex gap-1">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-white">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-slate-900">¿Confirmas la eliminación?</AlertDialogTitle>
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
                  
                  <Button variant="ghost" size="sm" onClick={() => { setEditingClub(club); setIsEditOpen(true); fetchAssocs(); }} className="text-slate-500 hover:text-primary">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <Button asChild size="sm" className="font-bold gap-2">
                  <Link href={`/dashboard/clubs/${club.id}`}>
                    Gestionar <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
          {clubs?.length === 0 && (
            <div className="col-span-full text-center py-24 border-2 border-dashed rounded-3xl bg-white/5 backdrop-blur-sm">
              <Building className="h-16 w-16 mx-auto text-white opacity-20 mb-4" />
              <p className="text-white/60 font-bold uppercase tracking-widest text-sm">No hay instituciones registradas todavía.</p>
            </div>
          )}
        </div>
      )}

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-white">
          <DialogHeader><DialogTitle className="text-slate-900 font-black">Editar Institución</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-700 font-bold">Nombre</Label>
              <Input value={editingClub?.name || ""} onChange={e => setEditingClub({...editingClub, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 font-bold">Asociación Regional</Label>
              <Select value={editingClub?.associationId || ""} onValueChange={v => setEditingClub({...editingClub, associationId: v})}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="Cambiar Asociación" /></SelectTrigger>
                <SelectContent>
                  {associations.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 font-bold">Dirección</Label>
              <Input value={editingClub?.address || ""} onChange={e => setEditingClub({...editingClub, address: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 font-bold">Teléfono</Label>
              <Input value={editingClub?.phone || ""} onChange={e => setEditingClub({...editingClub, phone: e.target.value})} />
            </div>
          </div>
          <DialogFooter className="bg-muted/30 -mx-6 -mb-6 p-6">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateClub} className="font-bold">Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
