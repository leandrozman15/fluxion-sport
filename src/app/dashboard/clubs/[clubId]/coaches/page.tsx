
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
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Stethoscope,
  Calendar,
  UserPlus,
  Trophy,
  FileText,
  Shield,
  CalendarDays
} from "lucide-react";
import { collection, doc, setDoc, query, where } from "firebase/firestore";
import { useFirestore, useCollection, useDoc, useMemoFirebase, useFirebase, createUserWithSecondaryApp } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { SectionNav } from "@/components/layout/section-nav";
import { useClubPageNav } from "@/hooks/use-club-page-nav";
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
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingCoach, setEditingCoach] = useState<any>(null);
  
  const initialCoachForm = {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dni: "",
    birthDate: "",
    address: "",
    password: "",
    role: "coach_lvl2",
    specialty: "",
    license: "",
    photoUrl: "",
    bloodType: "",
    emergencyContact: "",
    emergencyPhone: "",
    sport: "hockey",
    parkingIncluded: false,
  };
  const [newCoach, setNewCoach] = useState(initialCoachForm);

  const clubRef = useMemoFirebase(() => doc(db, "clubs", clubId), [db, clubId]);
  const { data: club, isLoading: clubLoading } = useDoc(clubRef);

  const currentUserRef = useMemoFirebase(() => currentUser ? doc(db, "users", currentUser.uid) : null, [db, currentUser]);
  const { data: currentUserProfile } = useDoc(currentUserRef);

  const coachesQuery = useMemoFirebase(() => 
    query(
      collection(db, "users"), 
      where("clubId", "==", clubId),
      where("role", "in", ["coach", "coach_lvl1", "coach_lvl2", "coordinator", "club_admin"])
    ),
    [db, clubId]
  );
  const { data: coaches, isLoading: coachesLoading } = useCollection(coachesQuery);

  const activeNav = useClubPageNav(clubId);

  const handleCreateCoach = async () => {
    if (!newCoach.email || !newCoach.password || !newCoach.firstName || !newCoach.lastName || !newCoach.dni) {
      toast({ variant: "destructive", title: "Datos faltantes", description: "Nombre, Apellido, Email, Clave y DNI son obligatorios." });
      return;
    }

    setLoading(true);
    try {
      const normalizedEmail = newCoach.email.toLowerCase().trim();

      // 1. Crear usuario en Auth SIN cerrar la sesión del admin actual (instancia secundaria)
      const newUid = await createUserWithSecondaryApp(normalizedEmail, newCoach.password);

      // 2. Guardar perfil en Firestore con UID como ID de documento
      const fullName = `${newCoach.firstName} ${newCoach.lastName}`.trim();
      const { password: _pw, ...coachDataWithoutPassword } = newCoach;
      await setDoc(doc(db, "users", newUid), {
        ...coachDataWithoutPassword,
        name: fullName,
        email: normalizedEmail,
        id: newUid,
        uid: newUid,
        clubId: clubId,
        requiresPasswordChange: true,
        createdAt: new Date().toISOString()
      });
      
      toast({ 
        title: "Miembro Registrado", 
        description: `Cuenta creada para ${newCoach.firstName} ${newCoach.lastName}. Ya puede ingresar a la plataforma.` 
      });
      
      setNewCoach(initialCoachForm);
      setIsCreateOpen(false);
    } catch (error: any) {
      console.error(error);
      toast({ 
        variant: "destructive", 
        title: "Error al registrar", 
        description: error.code === 'auth/email-already-in-use' ? "Ese email ya tiene una cuenta registrada." : "Verifica los datos e intenta nuevamente." 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCoach = () => {
    if (!editingCoach) return;
    const coachDoc = doc(db, "users", editingCoach.id);
    const updatedName = `${editingCoach.firstName || ''} ${editingCoach.lastName || ''}`.trim() || editingCoach.name || '';
    const { password: _pw, ...editDataWithoutPassword } = editingCoach;
    updateDocumentNonBlocking(coachDoc, { 
      ...editDataWithoutPassword,
      name: updatedName,
      clubId: clubId,
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
      <SectionNav items={activeNav} basePath={`/dashboard/clubs/${clubId}`} />
      
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
            <DialogContent className="max-w-4xl bg-white border-none shadow-2xl rounded-[2.5rem] p-0 overflow-hidden max-h-[92dvh] flex flex-col">
              <DialogHeader className="bg-primary p-8 text-primary-foreground shrink-0">
                <DialogTitle className="text-2xl font-black flex items-center gap-2">
                  <UserPlus className="h-7 w-7" /> Nueva Ficha de Personal
                </DialogTitle>
                <DialogDescription className="text-primary-foreground/80 font-bold">
                  Completa el legajo oficial del staff técnico o administrativo.
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-8 space-y-10">

                  {/* 1. Identidad Personal */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b pb-2">
                      <UserRound className="h-5 w-5 text-primary" />
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">1. Identidad Personal</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="font-bold text-slate-700">Nombre</Label>
                        <Input value={newCoach.firstName} onChange={e => setNewCoach({...newCoach, firstName: e.target.value})} placeholder="Ej. Camila" className="h-12 border-2" />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold text-slate-700">Apellido</Label>
                        <Input value={newCoach.lastName} onChange={e => setNewCoach({...newCoach, lastName: e.target.value})} placeholder="Ej. Rodríguez" className="h-12 border-2" />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold text-slate-700">DNI / Documento</Label>
                        <Input value={newCoach.dni} onChange={e => setNewCoach({...newCoach, dni: e.target.value})} placeholder="Sin puntos" className="h-12 border-2 font-bold" />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold text-slate-700">Fecha de Nacimiento</Label>
                        <Input type="date" value={newCoach.birthDate} onChange={e => setNewCoach({...newCoach, birthDate: e.target.value})} className="h-12 border-2" />
                      </div>
                      <div className="col-span-full space-y-2">
                        <Label className="font-bold text-slate-700">URL Foto de Perfil (Opcional)</Label>
                        <Input value={newCoach.photoUrl} onChange={e => setNewCoach({...newCoach, photoUrl: e.target.value})} placeholder="https://..." className="h-12 border-2" />
                      </div>
                    </div>
                  </div>

                  {/* 2. Rol Institucional */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b pb-2">
                      <Layers className="h-5 w-5 text-primary" />
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">2. Rol Institucional</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-bold text-slate-700">Disciplina</Label>
                          <p className="text-[10px] text-primary font-black uppercase tracking-widest">{newCoach.sport === 'rugby' ? '🏉 Rugby' : '🏑 Hockey'}</p>
                        </div>
                        <Switch checked={newCoach.sport === 'rugby'} onCheckedChange={(v) => setNewCoach({...newCoach, sport: v ? 'rugby' : 'hockey'})} />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold text-slate-700">Rol en el Club</Label>
                        <Select value={newCoach.role} onValueChange={v => setNewCoach({...newCoach, role: v})}>
                          <SelectTrigger className="h-12 border-2 font-bold"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="coach_lvl1" className="font-bold">Entrenador Nivel 1 (Jefe de Rama)</SelectItem>
                            <SelectItem value="coach_lvl2" className="font-bold">Entrenador Nivel 2 (Plantel)</SelectItem>
                            <SelectItem value="coordinator" className="font-bold">Coordinador de Rama</SelectItem>
                            <SelectItem value="club_admin" className="font-bold">Administrador del Club</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold text-slate-700">Especialidad / Cargo</Label>
                        <Input value={newCoach.specialty} onChange={e => setNewCoach({...newCoach, specialty: e.target.value})} placeholder="Ej. Preparador Físico, DT…" className="h-12 border-2 font-bold" />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold text-slate-700">N° Licencia / Matrícula</Label>
                        <Input value={newCoach.license} onChange={e => setNewCoach({...newCoach, license: e.target.value})} placeholder="Ej. FHR-00412" className="h-12 border-2" />
                      </div>
                    </div>
                  </div>

                  {/* 3. Acceso App */}
                  <div className="space-y-6 bg-slate-50 -mx-8 p-8 border-y">
                    <div className="flex items-center gap-3 border-b pb-2">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-primary">3. Acceso App Fluxion</h3>
                        <p className="text-[10px] text-slate-500 font-bold mt-0.5">Credenciales para ingresar a la plataforma.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="font-bold text-slate-700">Email (Usuario de Acceso)</Label>
                        <Input type="email" value={newCoach.email} onChange={e => setNewCoach({...newCoach, email: e.target.value})} placeholder="usuario@club.com" className="h-12 border-2 bg-white" />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold text-slate-700">Clave Temporal</Label>
                        <Input type="password" value={newCoach.password} onChange={e => setNewCoach({...newCoach, password: e.target.value})} placeholder="Mínimo 6 caracteres" className="h-12 border-2 bg-white" />
                      </div>
                    </div>
                  </div>

                  {/* 4. Contacto */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b pb-2">
                      <Phone className="h-5 w-5 text-primary" />
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">4. Datos de Contacto</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="font-bold text-slate-700">Teléfono Personal</Label>
                        <Input value={newCoach.phone} onChange={e => setNewCoach({...newCoach, phone: e.target.value})} placeholder="+54 9 11..." className="h-12 border-2" />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold text-slate-700">Dirección Particular</Label>
                        <Input value={newCoach.address} onChange={e => setNewCoach({...newCoach, address: e.target.value})} placeholder="Calle, Nro, Localidad" className="h-12 border-2" />
                      </div>
                    </div>
                  </div>

                  {/* 5. Salud */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b pb-2">
                      <Stethoscope className="h-5 w-5 text-primary" />
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">5. Datos de Salud</h3>
                    </div>
                    <div className="space-y-2 mb-6">
                      <Label className="font-bold text-slate-700">Grupo Sanguíneo</Label>
                      <Select value={newCoach.bloodType} onValueChange={v => setNewCoach({...newCoach, bloodType: v})}>
                        <SelectTrigger className="h-12 border-2"><SelectValue placeholder="Elegir tipo..." /></SelectTrigger>
                        <SelectContent>
                          {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(t => <SelectItem key={t} value={t} className="font-bold">{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-orange-50 p-6 rounded-2xl border border-orange-100">
                      <div className="space-y-2">
                        <Label className="font-black text-orange-800 uppercase text-[10px]">Contacto de Emergencia</Label>
                        <Input value={newCoach.emergencyContact} onChange={e => setNewCoach({...newCoach, emergencyContact: e.target.value})} placeholder="Nombre del familiar" className="bg-white border-2" />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-black text-orange-800 uppercase text-[10px]">Teléfono Emergencia</Label>
                        <Input value={newCoach.emergencyPhone} onChange={e => setNewCoach({...newCoach, emergencyPhone: e.target.value})} placeholder="Número 24hs" className="bg-white border-2" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <div>
                      <Label className="font-black text-xs uppercase text-blue-800">Estacionamiento incluido en cuota</Label>
                      <p className="text-[10px] text-blue-600 font-bold">La cuota mensual incluye el pago del estacionamiento</p>
                    </div>
                    <Switch checked={newCoach.parkingIncluded} onCheckedChange={v => setNewCoach({...newCoach, parkingIncluded: v})} />
                  </div>
                </div>
              </ScrollArea>
              <DialogFooter className="bg-slate-50 p-8 border-t flex flex-col sm:flex-row gap-4 shrink-0">
                <Button variant="ghost" onClick={() => setIsCreateOpen(false)} className="font-bold text-slate-500 h-14">Cancelar</Button>
                <Button onClick={handleCreateCoach} disabled={loading || !newCoach.firstName || !newCoach.lastName || !newCoach.email || newCoach.password.length < 6 || !newCoach.dni} className="flex-1 font-black uppercase text-xs tracking-widest h-14 shadow-xl shadow-primary/20 gap-2">
                  {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <><ShieldCheck className="h-5 w-5" /> Dar de Alta al Staff</>}
                </Button>
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
                        <p className="font-black text-xl text-slate-900 truncate leading-none">
                          {coach.firstName ? `${coach.firstName} ${coach.lastName || ''}`.trim() : coach.name}
                        </p>
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
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3 text-xs font-black text-slate-400 uppercase tracking-widest">
                          <IdCard className="h-4 w-4 text-primary" /> DNI: {coach.dni || 'Sin registrar'}
                        </div>
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
                      <Button variant="ghost" size="sm" className="h-11 w-11 p-0 hover:bg-primary/5 rounded-xl border border-transparent hover:border-primary/10" onClick={() => { const c = { ...coach }; if (!c.firstName && c.name) { const parts = c.name.trim().split(' '); c.firstName = parts[0] || ''; c.lastName = parts.slice(1).join(' ') || ''; } setEditingCoach(c); setIsEditOpen(true); }}>
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
        <DialogContent className="max-w-4xl bg-white border-none shadow-2xl rounded-[2.5rem] p-0 overflow-hidden max-h-[92dvh] flex flex-col">
          <DialogHeader className="bg-slate-50 p-8 border-b flex flex-row items-center justify-between shrink-0">
            <div>
              <DialogTitle className="text-2xl font-black text-slate-900">
                Editar Perfil: {editingCoach?.firstName || editingCoach?.name} {editingCoach?.lastName || ""}
              </DialogTitle>
              <p className="text-sm font-bold text-slate-500 mt-1">{getRoleLabel(editingCoach?.role)}</p>
            </div>
            <Avatar className="h-16 w-16 border-4 border-white shadow-xl rounded-2xl hidden md:flex">
              <AvatarImage src={editingCoach?.photoUrl} className="object-cover" />
              <AvatarFallback className="bg-primary/5 text-primary font-black"><UserRound /></AvatarFallback>
            </Avatar>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-8 space-y-10">

              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b pb-2">
                  <UserRound className="h-5 w-5 text-primary" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">1. Identidad Personal</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700">Nombre</Label>
                    <Input value={editingCoach?.firstName || ""} onChange={e => setEditingCoach({...editingCoach, firstName: e.target.value})} className="h-12 border-2" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700">Apellido</Label>
                    <Input value={editingCoach?.lastName || ""} onChange={e => setEditingCoach({...editingCoach, lastName: e.target.value})} className="h-12 border-2" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700">DNI / Documento</Label>
                    <Input value={editingCoach?.dni || ""} onChange={e => setEditingCoach({...editingCoach, dni: e.target.value})} className="h-12 border-2" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700">Fecha de Nacimiento</Label>
                    <Input type="date" value={editingCoach?.birthDate || ""} onChange={e => setEditingCoach({...editingCoach, birthDate: e.target.value})} className="h-12 border-2" />
                  </div>
                  <div className="col-span-full space-y-2">
                    <Label className="font-bold text-slate-700">URL Foto de Perfil</Label>
                    <Input value={editingCoach?.photoUrl || ""} onChange={e => setEditingCoach({...editingCoach, photoUrl: e.target.value})} className="h-12 border-2" />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b pb-2">
                  <Layers className="h-5 w-5 text-primary" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">2. Rol Institucional</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold text-slate-700">Disciplina</Label>
                      <p className="text-[10px] text-slate-500 font-black uppercase">{editingCoach?.sport === 'rugby' ? '🏉 Rugby' : '🏑 Hockey'}</p>
                    </div>
                    <Switch checked={editingCoach?.sport === 'rugby'} onCheckedChange={(v) => setEditingCoach({...editingCoach, sport: v ? 'rugby' : 'hockey'})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700">Rol en el Club</Label>
                    <Select value={editingCoach?.role} onValueChange={v => setEditingCoach({...editingCoach, role: v})}>
                      <SelectTrigger className="h-12 border-2 font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="coach_lvl1" className="font-bold">Entrenador Nivel 1 (Jefe de Rama)</SelectItem>
                        <SelectItem value="coach_lvl2" className="font-bold">Entrenador Nivel 2 (Plantel)</SelectItem>
                        <SelectItem value="coordinator" className="font-bold">Coordinador de Rama</SelectItem>
                        <SelectItem value="club_admin" className="font-bold">Administrador del Club</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700">Especialidad / Cargo</Label>
                    <Input value={editingCoach?.specialty || ""} onChange={e => setEditingCoach({...editingCoach, specialty: e.target.value})} className="h-12 border-2 font-bold" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700">N° Licencia / Matrícula</Label>
                    <Input value={editingCoach?.license || ""} onChange={e => setEditingCoach({...editingCoach, license: e.target.value})} className="h-12 border-2" />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b pb-2">
                  <Phone className="h-5 w-5 text-primary" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">3. Datos de Contacto</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700">Teléfono Personal</Label>
                    <Input value={editingCoach?.phone || ""} onChange={e => setEditingCoach({...editingCoach, phone: e.target.value})} className="h-12 border-2" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700">Dirección Particular</Label>
                    <Input value={editingCoach?.address || ""} onChange={e => setEditingCoach({...editingCoach, address: e.target.value})} className="h-12 border-2" />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b pb-2">
                  <Stethoscope className="h-5 w-5 text-primary" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">4. Datos de Salud</h3>
                </div>
                <div className="space-y-2 mb-6">
                  <Label className="font-bold text-slate-700">Grupo Sanguíneo</Label>
                  <Select value={editingCoach?.bloodType || ""} onValueChange={v => setEditingCoach({...editingCoach, bloodType: v})}>
                    <SelectTrigger className="h-12 border-2"><SelectValue placeholder="Elegir tipo..." /></SelectTrigger>
                    <SelectContent>
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(t => <SelectItem key={t} value={t} className="font-bold">{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-orange-50 p-6 rounded-2xl border border-orange-100">
                  <div className="space-y-2">
                    <Label className="font-black text-orange-800 uppercase text-[10px]">Contacto de Emergencia</Label>
                    <Input value={editingCoach?.emergencyContact || ""} onChange={e => setEditingCoach({...editingCoach, emergencyContact: e.target.value})} className="bg-white border-2" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-black text-orange-800 uppercase text-[10px]">Teléfono Emergencia</Label>
                    <Input value={editingCoach?.emergencyPhone || ""} onChange={e => setEditingCoach({...editingCoach, emergencyPhone: e.target.value})} className="bg-white border-2" />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100 mx-6 mb-4">
                <div>
                  <Label className="font-black text-xs uppercase text-blue-800">Estacionamiento incluido en cuota</Label>
                  <p className="text-[10px] text-blue-600 font-bold">La cuota mensual incluye el pago del estacionamiento</p>
                </div>
                <Switch checked={editingCoach?.parkingIncluded ?? false} onCheckedChange={v => setEditingCoach({...editingCoach, parkingIncluded: v})} />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="bg-slate-50 p-8 border-t flex flex-col sm:flex-row gap-4 shrink-0">
            <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="font-bold text-slate-500 h-14 px-8">Cancelar</Button>
            <Button onClick={handleUpdateCoach} className="flex-1 font-black uppercase text-xs tracking-widest h-14 shadow-xl shadow-primary/20">
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
