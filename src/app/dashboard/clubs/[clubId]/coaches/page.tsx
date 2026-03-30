
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
    photoUrl: ""
  });

  const clubRef = useMemoFirebase(() => doc(db, "clubs", clubId), [db, clubId]);
  const { data: club, isLoading: clubLoading } = useDoc(clubRef);

  const coachesQuery = useMemoFirebase(() => 
    query(collection(db, "users"), where("clubId", "==", clubId)),
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
      initiateEmailSignUp(auth, newCoach.email, newCoach.password);
      const userId = doc(collection(db, "users")).id;
      const userDoc = doc(db, "users", userId);
      
      await setDoc(userDoc, {
        name: newCoach.name,
        email: newCoach.email,
        phone: newCoach.phone,
        specialty: newCoach.specialty,
        license: newCoach.license,
        photoUrl: newCoach.photoUrl,
        id: userId,
        clubId,
        role: newCoach.role,
        requiresPasswordChange: true,
        createdAt: new Date().toISOString()
      });
      
      toast({ title: "Miembro Registrado", description: `Cuenta creada para ${newCoach.name}.` });
      setNewCoach({ name: "", email: "", phone: "", password: "", role: "coach", specialty: "", license: "", photoUrl: "" });
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
      name: editingCoach.name,
      email: editingCoach.email,
      phone: editingCoach.phone,
      role: editingCoach.role,
      specialty: editingCoach.specialty,
      license: editingCoach.license,
      photoUrl: editingCoach.photoUrl
    });
    setIsEditOpen(false);
    toast({ title: "Perfil Actualizado", description: "Los cambios se han guardado correctamente." });
  };

  const handleResetPassword = async (email: string) => {
    if (!email) return;
    try {
      await initiatePasswordReset(auth, email);
      toast({
        title: "Link de recuperación enviado",
        description: `Se ha enviado un correo a ${email} para resetear la contraseña.`,
      });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error al enviar reset" });
    }
  };

  const handleDeleteCoach = (id: string) => {
    deleteDocumentNonBlocking(doc(db, "users", id));
    toast({ variant: "destructive", title: "Miembro Eliminado" });
  };

  const getRoleLabel = (role: string) => {
    switch(role) {
      case 'player': return 'Jugador';
      case 'coach': return 'Entrenador';
      case 'coordinator': return 'Coordinador';
      case 'club_admin': return 'Administrador';
      default: return role;
    }
  };

  if (clubLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex gap-8 animate-in fade-in duration-500">
      <SectionNav items={clubNav} basePath={`/dashboard/clubs/${clubId}`} />
      
      <div className="flex-1 space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline text-foreground">Staff Institucional</h1>
            <p className="text-muted-foreground">Gestión centralizada del personal y accesos del club.</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 shadow-lg h-12 px-6">
                <Plus className="h-5 w-5" /> Registrar Nuevo Miembro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Nueva Ficha de Personal</DialogTitle>
                <DialogDescription>Añade un miembro y define su acceso inicial.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nombre Completo</Label>
                  <Input value={newCoach.name} onChange={e => setNewCoach({...newCoach, name: e.target.value})} placeholder="Ej. Camila Entrenadora" />
                </div>
                <div className="space-y-2">
                  <Label>Rol en la Institución</Label>
                  <Select value={newCoach.role} onValueChange={v => setNewCoach({...newCoach, role: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="coach">Entrenador</SelectItem>
                      <SelectItem value="coordinator">Coordinador</SelectItem>
                      <SelectItem value="club_admin">Administrador</SelectItem>
                      <SelectItem value="player">Jugador (con acceso)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email (Usuario)</Label>
                    <Input type="email" value={newCoach.email} onChange={e => setNewCoach({...newCoach, email: e.target.value})} placeholder="usuario@club.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Contraseña Temporal</Label>
                    <div className="relative">
                      <Input type={showPassword ? "text" : "password"} value={newCoach.password} onChange={e => setNewCoach({...newCoach, password: e.target.value})} placeholder="Min. 6 car." />
                      <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword(!showPassword)}><Eye className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input value={newCoach.phone} onChange={e => setNewCoach({...newCoach, phone: e.target.value})} placeholder="+54..." />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Especialidad / Cargo</Label>
                    <Input value={newCoach.specialty} onChange={e => setNewCoach({...newCoach, specialty: e.target.value})} placeholder="Ej. Hockey Damas" />
                  </div>
                  <div className="space-y-2">
                    <Label>Licencia / Título</Label>
                    <Input value={newCoach.license} onChange={e => setNewCoach({...newCoach, license: e.target.value})} placeholder="Ej. Nivel 2 CAH" />
                  </div>
                </div>
              </div>
              <DialogFooter className="bg-muted/30 -mx-6 -mb-6 p-6 mt-4">
                <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreateCoach} disabled={!newCoach.name || !newCoach.email || newCoach.password.length < 6}>Crear Ficha</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        <div className="space-y-4">
          {coachesLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
          ) : (
            coaches?.map((coach: any) => (
              <Card key={coach.id} className="hover:border-primary/50 transition-all overflow-hidden border-2 group shadow-sm">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row md:items-center">
                    {/* Perfil */}
                    <div className="flex items-center gap-4 p-4 md:w-1/4 border-b md:border-b-0 md:border-r bg-muted/5">
                      <Avatar className="h-12 w-12 border-2 border-primary/10 shadow-sm">
                        <AvatarImage src={coach.photoUrl} />
                        <AvatarFallback><UserRound /></AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-base truncate">{coach.name}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[9px] uppercase font-black px-1.5 h-4">
                            {getRoleLabel(coach.role)}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Info Técnica y Contacto */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-medium text-primary">
                          <Briefcase className="h-3 w-3" /> {coach.specialty || 'Sin cargo definido'}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-bold">
                          <Lock className="h-3 w-3 text-slate-400" /> {coach.email}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" /> {coach.phone || 'Sin teléfono'}
                        </div>
                        {coach.requiresPasswordChange && (
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-orange-600 uppercase">
                            <AlertCircle className="h-3 w-3" /> Pendiente Cambio Clave
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="p-4 md:border-l flex items-center justify-between md:justify-end gap-3 bg-muted/5">
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-9 w-9 p-0 text-muted-foreground hover:text-primary hover:bg-primary/5" 
                          onClick={() => handleResetPassword(coach.email)}
                          title="Enviar Reset de Contraseña"
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-destructive hover:bg-red-50" onClick={() => handleDeleteCoach(coach.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-primary/5" onClick={() => { setEditingCoach(coach); setIsEditOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {coach.role === 'coach' ? (
                        <Button variant="outline" size="sm" asChild className="font-bold h-9 gap-2 border-primary text-primary hover:bg-primary hover:text-white transition-all">
                          <Link href="/dashboard/coach">
                            Ver Panel <ClipboardCheck className="h-4 w-4" />
                          </Link>
                        </Button>
                      ) : coach.role === 'club_admin' ? (
                        <Badge className="bg-primary text-white gap-1 h-9 px-3"><UserCog className="h-3 w-3" /> Administrador</Badge>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          {coaches?.length === 0 && !coachesLoading && (
            <div className="text-center py-20 border-2 border-dashed rounded-2xl bg-muted/10">
              <UserRound className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
              <p className="text-muted-foreground font-medium">Aún no hay miembros registrados.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de edición completa */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Editar Perfil Institucional</DialogTitle>
            <DialogDescription>Modifica los datos de acceso, rol y especialidad del miembro.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre Completo</Label>
                  <Input value={editingCoach?.name || ""} onChange={e => setEditingCoach({...editingCoach, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Email de Acceso</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-10" value={editingCoach?.email || ""} onChange={e => setEditingCoach({...editingCoach, email: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Rol en el Club</Label>
                  <Select value={editingCoach?.role || "coach"} onValueChange={v => setEditingCoach({...editingCoach, role: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="coach">Entrenador</SelectItem>
                      <SelectItem value="coordinator">Coordinador</SelectItem>
                      <SelectItem value="club_admin">Administrador</SelectItem>
                      <SelectItem value="player">Jugador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-10" value={editingCoach?.phone || ""} onChange={e => setEditingCoach({...editingCoach, phone: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Especialidad / Cargo</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-10" value={editingCoach?.specialty || ""} onChange={e => setEditingCoach({...editingCoach, specialty: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Licencia / Título</Label>
                  <div className="relative">
                    <FileBadge className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-10" value={editingCoach?.license || ""} onChange={e => setEditingCoach({...editingCoach, license: e.target.value})} />
                  </div>
                </div>
                
                <div className="pt-4 border-t space-y-4">
                  <Label className="text-xs font-black uppercase text-muted-foreground">Seguridad de la Cuenta</Label>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-3 h-12 border-primary/20 text-primary hover:bg-primary/5"
                    onClick={() => handleResetPassword(editingCoach?.email)}
                  >
                    <KeyRound className="h-4 w-4" /> Enviar link de recuperación
                  </Button>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    El usuario recibirá un correo electrónico oficial de Firebase para restablecer su propia contraseña de forma segura.
                  </p>
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="bg-muted/30 -mx-6 -mb-6 p-6 mt-4">
            <Button variant="ghost" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateCoach} className="font-bold">Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
