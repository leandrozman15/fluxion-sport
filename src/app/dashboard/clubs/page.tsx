
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Plus, 
  MapPin, 
  ArrowRight,
  Loader2,
  Trash2,
  Building,
} from "lucide-react";
import Link from "next/link";
import { collection, doc, setDoc } from "firebase/firestore";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { deleteDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
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
  const { firestore, user, isUserLoading } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newClub, setNewClub] = useState({ name: "", address: "", phone: "", logoUrl: "" });

  const clubsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, "clubs");
  }, [firestore, user]);

  const { data: clubs, isLoading } = useCollection(clubsQuery);

  const handleCreateClub = async () => {
    if (!firestore || !user) return;
    
    setLoading(true);
    try {
      const clubId = doc(collection(firestore, "clubs")).id;
      const clubDoc = doc(firestore, "clubs", clubId);
      
      // 1. Crear el Club (Iniciamos la escritura)
      setDocumentNonBlocking(clubDoc, {
        ...newClub,
        id: clubId,
        ownerId: user.uid,
        createdAt: new Date().toISOString()
      }, {});

      // 2. Vincular perfil de usuario al nuevo club inmediatamente POR UID
      // Usamos la utilidad no bloqueante para mayor rapidez
      setDocumentNonBlocking(doc(firestore, "users", user.uid), {
        id: user.uid,
        email: user.email?.toLowerCase().trim(),
        clubId: clubId,
        role: "club_admin",
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      setNewClub({ name: "", address: "", phone: "", logoUrl: "" });
      setIsDialogOpen(false);
      
      toast({ title: "Institución Creada", description: "Tu perfil ha sido vinculado correctamente." });
      
      // 3. Salto directo al dashboard forzando recarga de contexto para limpiar IDs antiguos
      window.location.href = `/dashboard/clubs/${clubId}`;
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error al registrar" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClub = (id: string) => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, "clubs", id));
    toast({ variant: "destructive", title: "Club Eliminado" });
  };

  if (isUserLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black font-headline text-white drop-shadow-md">Padrón de Clubes</h1>
          <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] mt-1">Gestión de instituciones vinculadas al sistema Fluxion.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2 h-12 px-6 font-black uppercase text-xs tracking-widest shadow-2xl bg-white text-primary hover:bg-slate-50">
              <Plus className="h-5 w-5" /> Registrar Nuevo Club
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-slate-900">Nueva Institución</DialogTitle>
              <DialogDescription className="font-bold text-slate-500">Registra el club para comenzar con la gestión de socios.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Nombre Oficial</Label>
                <Input value={newClub.name} onChange={e => setNewClub({...newClub, name: e.target.value})} placeholder="Ej. Club Atlético Vicentinos" className="h-12 border-2 font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Sede Central (Dirección)</Label>
                <Input value={newClub.address} onChange={e => setNewClub({...newClub, address: e.target.value})} placeholder="Calle, Ciudad" className="h-12 border-2" />
              </div>
            </div>
            <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-8 border-t rounded-b-lg">
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)} disabled={loading} className="font-bold text-slate-500">Cancelar</Button>
              <Button onClick={handleCreateClub} disabled={!newClub.name || loading} className="font-black uppercase text-xs tracking-widest h-12 px-10 shadow-lg shadow-primary/20">
                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "Dar de Alta"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white h-10 w-10" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clubs?.map((club: any) => (
            <Card key={club.id} className="group hover:border-primary/50 transition-all overflow-hidden border-none shadow-xl bg-white rounded-[1.5rem]">
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-14 w-14 border-2 border-slate-50 shadow-md rounded-xl bg-white">
                  <AvatarImage src={club.logoUrl} alt={club.name} className="object-contain p-1" />
                  <AvatarFallback className="bg-primary/5 text-primary"><Building /></AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-xl font-black truncate text-slate-900 leading-none">{club.name}</CardTitle>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-primary" /> {club.address || "Sede oficial"}
                  </p>
                </div>
              </CardHeader>
              <CardFooter className="flex justify-between border-t bg-slate-50/50 p-4">
                <div className="flex gap-1">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-slate-300 hover:text-destructive hover:bg-red-50 rounded-lg">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-white border-none shadow-2xl rounded-[2rem]">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black text-slate-900 uppercase">¿Eliminar Institución?</AlertDialogTitle>
                        <AlertDialogDescription className="font-bold text-slate-500">
                          Estás a punto de borrar a <strong>{club.name}</strong>. Esta acción romperá los vínculos de todos los usuarios asociados.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="pt-4">
                        <AlertDialogCancel className="font-bold border-2">Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteClub(club.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-black uppercase text-xs tracking-widest h-11 px-8 rounded-xl">
                          Confirmar Baja
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <Button asChild size="sm" className="font-black uppercase text-[10px] tracking-widest h-9 px-5 gap-2 shadow-lg shadow-primary/10 rounded-xl">
                  <Link href={`/dashboard/clubs/${club.id}`}>
                    Entrar al Club <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
          {(!clubs || clubs.length === 0) && (
            <div className="col-span-full flex flex-col items-center justify-center py-32 space-y-6 text-center border-2 border-dashed border-white/20 rounded-[3rem] bg-white/5 backdrop-blur-sm">
              <Building className="h-20 w-20 text-white opacity-20 mb-2" />
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white tracking-tight">Sistema Vacío</h3>
                <p className="text-white/60 font-bold max-w-sm uppercase tracking-widest text-[10px]">No se detectaron clubes vigentes.</p>
              </div>
              <Button onClick={() => setIsDialogOpen(true)} className="h-14 px-10 font-black uppercase text-xs tracking-[0.2em] shadow-2xl bg-white text-primary hover:bg-slate-50 rounded-2xl">
                Configurar Club
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
