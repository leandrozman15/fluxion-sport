
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { 
  Plus, 
  Loader2,
  Trash2,
  UserRound,
  Mail,
  Phone,
  LayoutDashboard,
  Layers,
  Users,
  CreditCard,
  Pencil,
  ShoppingBag,
  IdCard,
  MapPin,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { collection, doc, setDoc, query, where } from "firebase/firestore";
import { useFirestore, useCollection, useDoc, useMemoFirebase, useAuth, useFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { initiateEmailSignUp } from "@/firebase/non-blocking-login";
import { SectionNav } from "@/components/layout/section-nav";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
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

export default function ClubCoachesPage() {
  const { clubId } = useParams() as { clubId: string };
  const { user: currentUser } = useFirebase();
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCoach, setEditingCoach] = useState<any>(null);
  const [newCoach, setNewCoach] = useState({ 
    name: "", 
    email: "", 
    phone: "", 
    dni: "",
    address: "",
    password: "",
    role: "coach_lvl2",
    specialty: "",
    license: "",
    photoUrl: "",
    sport: "hockey"
  });

  const clubRef = useMemoFirebase(() => doc(db, "clubs", clubId), [db, clubId]);
  const { data: club, isLoading: clubLoading } = useDoc(clubRef);

  const coachesQuery = useMemoFirebase(() => 
    query(
      collection(db, "users"), 
      where("clubId", "==", clubId),
      where("role", "in", ["coach", "coach_lvl1", "coach_lvl2", "coordinator", "club_admin"])
    ),
    [db, clubId]
  );
  const { data: coaches, isLoading: coachesLoading } = useCollection(coachesQuery);

  const clubNav = [
    { title: "Panel General", href: `/dashboard/clubs/${clubId}`, icon: LayoutDashboard },
    { title: "Categorías", href: `/dashboard/clubs/${clubId}/divisions`, icon: Layers },
    { title: "Staff Técnico", href: `/dashboard/clubs/${clubId}/coaches`, icon: UserRound },
    { title: "Tienda Club", href: `/dashboard/clubs/${clubId}/shop/admin`, icon: ShoppingBag },
    { title: "Base Jugadores", href: `/dashboard/clubs/${clubId}/players`, icon: Users },
    { title: "Finanzas", href: `/dashboard/clubs/${clubId}/finances`, icon: CreditCard },
  ];

  const handleCreateCoach = async () => {
    if (!newCoach.email || !newCoach.password || !newCoach.name || !newCoach.dni) {
      toast({ variant: "destructive", title: "Datos faltantes", description: "Nombre, Email, Clave y DNI son obligatorios." });
      return;
    }

    try {
      const normalizedEmail = newCoach.email.toLowerCase().trim();
      initiateEmailSignUp(auth, normalizedEmail, newCoach.password);
      
      const userDoc = doc(db, "users", normalizedEmail);
      
      await setDoc(userDoc, {
        ...newCoach,
        email: normalizedEmail,
        id: normalizedEmail,
        clubId,
        requiresPasswordChange: true,
        createdAt: new Date().toISOString()
      });
      
      toast({ title: "Miembro Registrado", description: `Cuenta creada para ${newCoach.name}.` });
      setNewCoach({ name: "", email: "", phone: "", dni: "", address: "", password: "", role: "coach_lvl2", specialty: "", license: "", photoUrl: "", sport: "hockey" });
      setIsCreateOpen(false);
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error al registrar" });
    }
  };

  const handleUpdateCoach = () => {
    if (!editingCoach) return;
    const coachDoc = doc(db, "users", editingCoach.id);
    updateDocumentNonBlocking(coachDoc, { 
      ...editingCoach, 
      email: editingCoach.email.toLowerCase().trim() 
    });
    setIsEditOpen(false);
    toast({ title: "Perfil Actualizado" });
  };

  const handleDeleteCoachConfirmed = (coachId: string, coachName: string) => {
    if (currentUser && (currentUser.email === coachId || currentUser.uid === coachId)) {
      toast({ 
        variant: "destructive", 
        title: "Acción no permitida", 
        description: "No puedes eliminar tu propio perfil mientras estás en sesión." 
      });
      return;
    }

    const coachDocRef = doc(db, "users", coachId);
    deleteDocumentNonBlocking(coachDocRef);
    toast({ variant: "destructive", title: "Miembro Eliminado", description: `El registro de ${coachName} ha sido removido.` });
  };

  const getRoleLabel = (role: string) => {
    switch(role) {
      case 'coach_lvl1': return 'Entrenador Nivel 1';
      case 'coach_lvl2': return 'Entrenador Nivel 2';
      case 'coach': return 'Entrenador';
      case 'coordinator': return 'Coordinador';
      case 'club_admin': return 'Administrador Club';
      default: return role;
    }
  };

  if (clubLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white" /></div>;

  return (
    <div className="flex flex-col md:flex-row gap-8 animate-in fade-in duration-500">
      <SectionNav items={clubNav} basePath={`/dashboard/clubs/${clubId}`} />
      
      <div className="flex-1 space-y-8 pb-20 px-4 md:px-0">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black font-headline text-white drop-shadow-md">Staff Institucional</h1>
            <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] mt-1">{club?.name} • Gestión de profesores y coordinadores.</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 shadow-lg h-12 px-6 font-black uppercase text-xs tracking-widest bg-white text-primary hover:bg-slate-50">
                <Plus className="h-5 w-5" /> Registrar Nuevo Miembro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-white border-none shadow-2xl rounded-[2rem]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-slate-900">Nueva Ficha de Personal</DialogTitle>
                <DialogDescription className="font-bold text-slate-500">Completa el legajo oficial del staff técnico o administrativo.</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh] pr-4">
                <div className="space-y-6 py-4">
                  <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold text-slate-700">Disciplina Asignada</Label>
                      <p className="text-[10px] text-primary font-black uppercase tracking-widest">
                        {newCoach.sport === 'rugby' ? '🏉 Rugby' : '🏑 Hockey'}
                      </p>
                    </div>
                    <Switch 
                      checked={newCoach.sport === 'rugby'} 
                      onCheckedChange={(v) => setNewCoach({...newCoach, sport: v ? 'rugby' : 'hockey'})} 
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Nombre Completo</Label>
                      <Input value={newCoach.name} onChange={e => setNewCoach({...newCoach, name: e.target.value})} placeholder="Ej. Camila Staff" className="h-12 border-2 font-bold" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-black text-xs uppercase tracking-widest text-slate-400">DNI / Documento</Label>
                      <Input value={newCoach.dni} onChange={e => setNewCoach({...newCoach, dni: e.target.value})} placeholder="Sin puntos" className="h-12 border-2 font-bold" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Rol Institucional</Label>
                    <Select value={newCoach.role} onValueChange={v => setNewCoach({...newCoach, role: v})}>
                      <SelectTrigger className="h-12 border-2 font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="coach_lvl1" className="font-bold">Entrenador Nivel 1 (Admin Categoria)</SelectItem>
                        <SelectItem value="coach_lvl2" className="font-bold">Entrenador Nivel 2 (Plantel)</SelectItem>
                        <SelectItem value="coordinator" className="font-bold">Coordinador de Rama</SelectItem>
                        <SelectItem value="club_admin" className="font-bold">Administrador del Club</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Email (Usuario)</Label>
                      <Input type="email" value={newCoach.email} onChange={e => setNewCoach({...newCoach, email: e.target.value})} placeholder="usuario@club.com" className="h-12 border-2" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Clave Temporal</Label>
                      <Input type="password" value={newCoach.password} onChange={e => setNewCoach({...newCoach, password: e.target.value})} placeholder="Min. 6 car." className="h-12 border-2" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Teléfono Personal</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input value={newCoach.phone} onChange={e => setNewCoach({...newCoach, phone: e.target.value})} placeholder="+54..." className="h-12 border-2 pl-10 font-bold" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Especialidad / Cargo</Label>
                      <Input value={newCoach.specialty} onChange={e => setNewCoach({...newCoach, specialty: e.target.value})} placeholder="Ej. Preparador Físico" className="h-12 border-2 font-bold" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Dirección Particular</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input value={newCoach.address} onChange={e => setNewCoach({...newCoach, address: e.target.value})} placeholder="Calle, Nro, Localidad" className="h-12 border-2 pl-10" />
                    </div>
                  </div>
                </div>
              </ScrollArea>
              <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-8 border-t rounded-b-[2rem]">
                <Button variant="ghost" onClick={() => setIsCreateOpen(false)} className="font-bold text-slate-500">Cancelar</Button>
                <Button onClick={handleCreateCoach} disabled={!newCoach.name || !newCoach.email || newCoach.password.length < 6 || !newCoach.dni} className="font-black uppercase text-xs tracking-widest h-12 px-10 shadow-lg shadow-primary/20">Registrar Staff</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        <div className="space-y-4">
          {coachesLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white h-10 w-10" /></div>
          ) : (
            coaches?.map((coach: any) => (
              <Card key={coach.id} className="hover:border-primary/50 transition-all overflow-hidden border-none shadow-xl bg-white group rounded-[1.5rem]">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row md:items-center">
                    <div className="flex items-center gap-5 p-6 md:w-1/3 border-b md:border-b-0 md:border-r bg-slate-50/50">
                      <Avatar className="h-16 w-16 border-4 border-white shadow-xl rounded-2xl group-hover:scale-105 transition-transform">
                        <AvatarImage src={coach.photoUrl} className="object-cover" />
                        <AvatarFallback className="bg-primary/5 text-primary font-black"><UserRound /></AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-xl text-slate-900 truncate leading-none">{coach.name}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-[9px] uppercase font-black px-2 h-5 tracking-tighter">
                            {getRoleLabel(coach.role)}
                          </Badge>
                          <Badge className="text-[9px] uppercase font-black px-2 h-5 tracking-tighter border-none bg-primary text-white">
                            {coach.sport === 'rugby' ? '🏉 RUGBY' : '🏑 HOCKEY'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 p-6 space-y-3">
                      <div className="flex items-center gap-3 text-xs font-black text-slate-400 uppercase tracking-widest">
                        <IdCard className="h-4 w-4 text-primary" /> DNI: {coach.dni || 'Sin registrar'}
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3 text-xs font-black text-slate-400 uppercase tracking-widest">
                          <Mail className="h-4 w-4 text-primary" /> {coach.email}
                        </div>
                        <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                          <Phone className="h-4 w-4 text-primary" /> {coach.phone || 'Sin teléfono'}
                        </div>
                        <div className="flex items-center gap-3 text-xs font-bold text-slate-600 truncate">
                          <MapPin className="h-4 w-4 text-primary" /> {coach.address || 'Sin dirección'}
                        </div>
                      </div>
                    </div>

                    <div className="p-6 md:border-l flex items-center justify-end gap-3 bg-slate-50/50">
                      <Button variant="ghost" size="sm" className="h-11 w-11 p-0 hover:bg-primary/5 rounded-xl border border-transparent hover:border-primary/10" onClick={() => { setEditingCoach(coach); setIsEditOpen(true); }}>
                        <Pencil className="h-5 w-5 text-slate-400 hover:text-primary" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            type="button"
                            variant="ghost" 
                            size="sm" 
                            className="h-11 w-11 p-0 text-destructive hover:bg-red-50 rounded-xl border border-transparent hover:border-red-100"
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-white border-none shadow-2xl rounded-[2rem]">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tighter">¿Confirmas la baja?</AlertDialogTitle>
                            <AlertDialogDescription className="font-bold text-slate-500">
                              Estás a punto de eliminar a <strong>{coach.name}</strong> del staff oficial. Esta acción removerá su legajo y revocará su acceso a la consola técnica.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="pt-4">
                            <AlertDialogCancel className="font-bold border-2 rounded-xl">Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteCoachConfirmed(coach.id, coach.name)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-black uppercase text-xs tracking-widest rounded-xl px-8 h-11"
                            >
                              Eliminar Staff
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md bg-white border-none shadow-2xl rounded-[2rem]">
          <DialogHeader><DialogTitle className="text-2xl font-black text-slate-900">Editar Perfil Staff</DialogTitle></DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold text-slate-700">Disciplina Principal</Label>
                <p className="text-[10px] text-slate-500 font-black uppercase">
                  {editingCoach?.sport === 'rugby' ? '🏉 Rugby' : '🏑 Hockey'}
                </p>
              </div>
              <Switch 
                checked={editingCoach?.sport === 'rugby'} 
                onCheckedChange={(v) => setEditingCoach({...editingCoach, sport: v ? 'rugby' : 'hockey'})} 
              />
            </div>
            <div className="space-y-2">
              <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Nombre Completo</Label>
              <Input value={editingCoach?.name || ""} onChange={e => setEditingCoach({...editingCoach, name: e.target.value})} className="h-12 border-2 font-bold" />
            </div>
            <div className="space-y-2">
              <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Rol Institucional</Label>
              <Select value={editingCoach?.role} onValueChange={v => setEditingCoach({...editingCoach, role: v})}>
                <SelectTrigger className="h-12 border-2 font-bold"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="coach_lvl1" className="font-bold">Entrenador Nivel 1 (Admin Categoria)</SelectItem>
                  <SelectItem value="coach_lvl2" className="font-bold">Entrenador Nivel 2 (Plantel)</SelectItem>
                  <SelectItem value="coordinator" className="font-bold">Coordinador de Rama</SelectItem>
                  <SelectItem value="club_admin" className="font-bold">Administrador del Club</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-black text-xs uppercase tracking-widest text-slate-400">DNI</Label>
                <Input value={editingCoach?.dni || ""} onChange={e => setEditingCoach({...editingCoach, dni: e.target.value})} className="h-12 border-2" />
              </div>
              <div className="space-y-2">
                <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Teléfono</Label>
                <Input value={editingCoach?.phone || ""} onChange={e => setEditingCoach({...editingCoach, phone: e.target.value})} className="h-12 border-2" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Especialidad / Cargo</Label>
              <Input value={editingCoach?.specialty || ""} onChange={e => setEditingCoach({...editingCoach, specialty: e.target.value})} className="h-12 border-2 font-bold" />
            </div>
          </div>
          <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-8 border-t rounded-b-[2rem]">
            <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="font-bold">Cancelar</Button>
            <Button onClick={handleUpdateCoach} className="font-black uppercase text-xs tracking-widest h-12 px-8 shadow-lg">Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
