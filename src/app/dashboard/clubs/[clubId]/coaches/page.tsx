
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
  ShieldCheck,
  Layers,
  Users,
  CreditCard,
  Pencil,
  ClipboardCheck,
  ShoppingBag,
  Lock,
  Eye,
  EyeOff,
  UserCog,
  Briefcase,
  KeyRound,
  AlertCircle,
  FileBadge
} from "lucide-react";
import Link from "next/link";
import { collection, doc, setDoc, query, where } from "firebase/firestore";
import { useFirestore, useCollection, useDoc, useMemoFirebase, useAuth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { initiateEmailSignUp, initiatePasswordReset } from "@/firebase/non-blocking-login";
import { SectionNav } from "@/components/layout/section-nav";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";

export default function ClubCoachesPage() {
  const { clubId } = useParams() as { clubId: string };
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingCoach, setEditingCoach] = useState<any>(null);
  const [newCoach, setNewCoach] = useState({ 
    name: "", 
    email: "", 
    phone: "", 
    password: "",
    role: "coach",
    specialty: "",
    license: "",
    photoUrl: "",
    sport: "hockey"
  });

  const clubRef = useMemoFirebase(() => doc(db, "clubs", clubId), [db, clubId]);
  const { data: club, isLoading: clubLoading } = useDoc(clubRef);

  // Filtramos la colección global de usuarios para mostrar solo el staff de este club (Coaches/Coordinadores)
  const coachesQuery = useMemoFirebase(() => 
    query(
      collection(db, "users"), 
      where("clubId", "==", clubId),
      where("role", "in", ["coach", "coordinator", "club_admin"])
    ),
    [db, clubId]
  );
  const { data: coaches, isLoading: coachesLoading } = useCollection(coachesQuery);

  const clubNav = [
    { title: "Panel General", href: `/dashboard/clubs/${clubId}`, icon: LayoutDashboard },
    { title: "Administración", href: `/dashboard/clubs/${clubId}/admin`, icon: ShieldCheck },
    { title: "Categorías", href: `/dashboard/clubs/${clubId}/divisions`, icon: Layers },
    { title: "Staff Técnico", href: `/dashboard/clubs/${clubId}/coaches`, icon: UserRound },
    { title: "Tienda Club", href: `/dashboard/clubs/${clubId}/shop/admin`, icon: ShoppingBag },
    { title: "Base Jugadores", href: `/dashboard/clubs/${clubId}/players`, icon: Users },
    { title: "Finanzas", href: `/dashboard/clubs/${clubId}/finances`, icon: CreditCard },
  ];

  const handleCreateCoach = async () => {
    if (!newCoach.email || !newCoach.password || !newCoach.name) return;

    try {
      const normalizedEmail = newCoach.email.toLowerCase().trim();
      initiateEmailSignUp(auth, normalizedEmail, newCoach.password);
      
      const userId = doc(collection(db, "users")).id;
      const userDoc = doc(db, "users", userId);
      
      await setDoc(userDoc, {
        ...newCoach,
        email: normalizedEmail,
        id: userId,
        clubId,
        requiresPasswordChange: true,
        createdAt: new Date().toISOString()
      });
      
      toast({ title: "Miembro Registrado", description: `Cuenta creada para ${newCoach.name}.` });
      setNewCoach({ name: "", email: "", phone: "", password: "", role: "coach", specialty: "", license: "", photoUrl: "", sport: "hockey" });
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

  const handleDeleteCoach = (id: string) => {
    if(confirm("¿Eliminar este miembro del staff? Perderá acceso al panel.")) {
      deleteDocumentNonBlocking(doc(db, "users", id));
      toast({ variant: "destructive", title: "Miembro Eliminado" });
    }
  };

  const getRoleLabel = (role: string) => {
    switch(role) {
      case 'coach': return 'Entrenador';
      case 'coordinator': return 'Coordinador';
      case 'club_admin': return 'Administrador Club';
      default: return role;
    }
  };

  if (clubLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white" /></div>;

  return (
    <div className="flex gap-8 animate-in fade-in duration-500">
      <SectionNav items={clubNav} basePath={`/dashboard/clubs/${clubId}`} />
      
      <div className="flex-1 space-y-8 pb-20">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black font-headline text-white drop-shadow-md">Staff Institucional</h1>
            <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] mt-1">{club?.name} • Gestión de profesores y coordinadores.</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 shadow-lg h-12 px-6 font-black uppercase text-xs tracking-widest">
                <Plus className="h-5 w-5" /> Registrar Nuevo Miembro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-white">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-slate-900">Nueva Ficha de Personal</DialogTitle>
                <DialogDescription>Añade un miembro y define su disciplina y acceso oficial.</DialogDescription>
              </DialogHeader>
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

                <div className="space-y-2">
                  <Label className="text-slate-700 font-bold">Nombre Completo</Label>
                  <Input value={newCoach.name} onChange={e => setNewCoach({...newCoach, name: e.target.value})} placeholder="Ej. Camila Entrenadora" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 font-bold">Rol Institucional</Label>
                  <Select value={newCoach.role} onValueChange={v => setNewCoach({...newCoach, role: v})}>
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="coach">Entrenador</SelectItem>
                      <SelectItem value="coordinator">Coordinador de Rama</SelectItem>
                      <SelectItem value="club_admin">Administrador del Club</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-bold">Email (Usuario)</Label>
                    <Input type="email" value={newCoach.email} onChange={e => setNewCoach({...newCoach, email: e.target.value})} placeholder="usuario@club.com" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-bold">Clave Temporal</Label>
                    <Input type="password" value={newCoach.password} onChange={e => setNewCoach({...newCoach, password: e.target.value})} placeholder="Min. 6 car." />
                  </div>
                </div>
              </div>
              <DialogFooter className="bg-muted/30 -mx-6 -mb-6 p-6 mt-4">
                <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreateCoach} disabled={!newCoach.name || !newCoach.email || newCoach.password.length < 6} className="font-bold">Crear Ficha</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        <div className="space-y-4">
          {coachesLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white" /></div>
          ) : (
            coaches?.map((coach: any) => (
              <Card key={coach.id} className="hover:border-primary/50 transition-all overflow-hidden border-2 shadow-sm bg-card">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row md:items-center">
                    <div className="flex items-center gap-4 p-4 md:w-1/3 border-b md:border-b-0 md:border-r bg-slate-50/50">
                      <Avatar className="h-12 w-12 border-2 border-primary/10 shadow-sm">
                        <AvatarImage src={coach.photoUrl} />
                        <AvatarFallback><UserRound /></AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-slate-900 truncate">{coach.name}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[9px] uppercase font-black px-1.5 h-4">
                            {getRoleLabel(coach.role)}
                          </Badge>
                          <Badge variant="outline" className="text-[9px] uppercase font-black px-1.5 h-4 border-primary text-primary">
                            {coach.sport === 'rugby' ? '🏉 RUGBY' : '🏑 HOCKEY'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-primary">
                          <Briefcase className="h-3 w-3" /> {coach.specialty || 'Sin especialidad'}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase">
                          <Mail className="h-3 w-3" /> {coach.email}
                        </div>
                      </div>
                      <div className="space-y-1 flex flex-col justify-center">
                        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                          <Phone className="h-3 w-3" /> {coach.phone || 'Sin teléfono'}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 md:border-l flex items-center justify-end gap-2 bg-slate-50/50">
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-primary/5" onClick={() => { setEditingCoach(coach); setIsEditOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-destructive hover:bg-red-50" onClick={() => handleDeleteCoach(coach.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          {coaches?.length === 0 && !coachesLoading && (
            <div className="text-center py-20 border-2 border-dashed rounded-3xl bg-white/5 backdrop-blur-sm opacity-50">
              <UserRound className="h-12 w-12 mx-auto text-white mb-4" />
              <p className="text-white font-black uppercase tracking-widest text-sm">Aún no hay miembros de staff registrados.</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader><DialogTitle className="text-2xl font-black text-slate-900">Editar Perfil Staff</DialogTitle></DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-xl border">
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
              <Label className="text-slate-700 font-bold">Nombre Completo</Label>
              <Input value={editingCoach?.name || ""} onChange={e => setEditingCoach({...editingCoach, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 font-bold">Email</Label>
              <Input value={editingCoach?.email || ""} onChange={e => setEditingCoach({...editingCoach, email: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 font-bold">Especialidad / Cargo</Label>
              <Input value={editingCoach?.specialty || ""} onChange={e => setEditingCoach({...editingCoach, specialty: e.target.value})} />
            </div>
          </div>
          <DialogFooter className="bg-muted/30 -mx-6 -mb-6 p-6 mt-4">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateCoach} className="font-bold">Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
