
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { 
  Plus, 
  Loader2,
  Trash2,
  ChevronLeft,
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
  GraduationCap,
  ShoppingBag,
  Lock,
  Eye,
  EyeOff
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
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { initiateEmailSignUp } from "@/firebase/non-blocking-login";
import { SectionNav } from "@/components/layout/section-nav";
import { useToast } from "@/hooks/use-toast";

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
    specialty: "Hockey sobre Césped",
    license: "",
    photoUrl: ""
  });

  const clubRef = useMemoFirebase(() => doc(db, "clubs", clubId), [db, clubId]);
  const { data: club, isLoading: clubLoading } = useDoc(clubRef);

  const coachesQuery = useMemoFirebase(() => 
    query(collection(db, "users"), where("clubId", "==", clubId), where("role", "==", "coach")),
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
      // 1. Crear el usuario en Firebase Auth (esto registrará al usuario y le permitirá loguearse)
      // Nota: En un entorno real de producción, el admin no debería ser deslogueado al crear otro user.
      // Para este prototipo, creamos la ficha y el acceso.
      initiateEmailSignUp(auth, newCoach.email, newCoach.password);

      const coachId = doc(collection(db, "users")).id;
      const coachDoc = doc(db, "users", coachId);
      
      await setDoc(coachDoc, {
        name: newCoach.name,
        email: newCoach.email,
        phone: newCoach.phone,
        specialty: newCoach.specialty,
        license: newCoach.license,
        photoUrl: newCoach.photoUrl,
        id: coachId,
        clubId,
        role: "coach",
        requiresPasswordChange: true, // Forzar cambio de clave en el primer login
        createdAt: new Date().toISOString()
      });
      
      toast({
        title: "Staff Registrado",
        description: `Se ha creado la cuenta para ${newCoach.name}.`,
      });

      setNewCoach({ name: "", email: "", phone: "", password: "", specialty: "Hockey sobre Césped", license: "", photoUrl: "" });
      setIsCreateOpen(false);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error al registrar",
        description: "No se pudo crear la cuenta de acceso.",
      });
    }
  };

  const handleUpdateCoach = () => {
    if (!editingCoach) return;
    const coachDoc = doc(db, "users", editingCoach.id);
    updateDocumentNonBlocking(coachDoc, {
      name: editingCoach.name,
      email: editingCoach.email,
      phone: editingCoach.phone,
      specialty: editingCoach.specialty,
      license: editingCoach.license,
      photoUrl: editingCoach.photoUrl
    });
    setIsEditOpen(false);
  };

  const handleDeleteCoach = (id: string) => {
    deleteDocumentNonBlocking(doc(db, "users", id));
  };

  if (clubLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex gap-8 animate-in fade-in duration-500">
      <SectionNav items={clubNav} basePath={`/dashboard/clubs/${clubId}`} />
      
      <div className="flex-1 space-y-8">
        <header className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold font-headline text-foreground">Staff Técnico: {club?.name}</h1>
              <p className="text-muted-foreground">Gestión de entrenadores y personal con acceso al sistema.</p>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2 shadow-lg">
                  <Plus className="h-4 w-4" /> Registrar Nuevo Staff
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Nueva Ficha de Staff</DialogTitle>
                  <DialogDescription>Añade un miembro y define su contraseña de primer ingreso.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nombre Completo</Label>
                    <Input value={newCoach.name} onChange={e => setNewCoach({...newCoach, name: e.target.value})} placeholder="Ej. Camila Entrenadora" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email (Usuario)</Label>
                      <Input type="email" value={newCoach.email} onChange={e => setNewCoach({...newCoach, email: e.target.value})} placeholder="camila@club.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>Contraseña Temporal</Label>
                      <div className="relative">
                        <Input 
                          type={showPassword ? "text" : "password"} 
                          value={newCoach.password} 
                          onChange={e => setNewCoach({...newCoach, password: e.target.value})} 
                          placeholder="Mín. 6 caracteres"
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                        </Button>
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
                      <Input value={newCoach.specialty} onChange={e => setNewCoach({...newCoach, specialty: e.target.value})} placeholder="Ej. DT Primera" />
                    </div>
                    <div className="space-y-2">
                      <Label>Licencia / Título</Label>
                      <Input value={newCoach.license} onChange={e => setNewCoach({...newCoach, license: e.target.value})} placeholder="Ej. Nivel 2 CAH" />
                    </div>
                  </div>
                </div>
                <DialogFooter className="bg-muted/30 -mx-6 -mb-6 p-6 mt-4">
                  <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreateCoach} disabled={!newCoach.name || !newCoach.email || newCoach.password.length < 6}>
                    Crear Ficha y Acceso
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coachesLoading ? (
            <div className="col-span-full flex justify-center p-12"><Loader2 className="animate-spin" /></div>
          ) : (
            coaches?.map((coach: any) => (
              <Card key={coach.id} className="hover:border-primary transition-all overflow-hidden group border-2">
                <CardHeader className="flex flex-row items-center gap-4">
                  <Avatar className="h-14 w-14 border-2 border-primary/10">
                    <AvatarImage src={coach.photoUrl} />
                    <AvatarFallback><UserRound /></AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-lg leading-tight">{coach.name}</CardTitle>
                    <CardDescription className="font-medium text-primary text-xs mt-1">{coach.specialty}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground pb-4">
                  <div className="flex items-center gap-2"><Mail className="h-3 w-3" /> {coach.email}</div>
                  <div className="flex items-center gap-2"><Phone className="h-3 w-3" /> {coach.phone || 'Sin teléfono'}</div>
                  {coach.requiresPasswordChange && (
                    <Badge variant="outline" className="mt-2 bg-orange-50 text-orange-700 border-orange-200 gap-1">
                      <Lock className="h-3 w-3" /> Pendiente Cambio Clave
                    </Badge>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between border-t bg-muted/10 pt-4">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="text-destructive h-8 w-8 p-0" onClick={() => handleDeleteCoach(coach.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setEditingCoach(coach); setIsEditOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" asChild className="font-bold">
                    <Link href="/dashboard/coach">
                      Ver Panel <ClipboardCheck className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
          {coaches?.length === 0 && !coachesLoading && (
            <div className="col-span-full text-center py-20 border-2 border-dashed rounded-xl bg-muted/20">
              <UserRound className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
              <p className="text-muted-foreground">Aún no hay staff técnico registrado en {club?.name}.</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Perfil Staff</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={editingCoach?.name || ""} onChange={e => setEditingCoach({...editingCoach, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Especialidad</Label>
              <Input value={editingCoach?.specialty || ""} onChange={e => setEditingCoach({...editingCoach, specialty: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={editingCoach?.email || ""} onChange={e => setEditingCoach({...editingCoach, email: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input value={editingCoach?.phone || ""} onChange={e => setEditingCoach({...editingCoach, phone: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateCoach}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
