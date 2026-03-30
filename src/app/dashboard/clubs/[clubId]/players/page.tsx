
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { 
  Plus, 
  User, 
  Loader2,
  Trash2,
  ChevronLeft,
  Mail,
  Phone,
  Calendar,
  Contact2,
  CreditCard,
  Pencil,
  Car,
  LayoutDashboard,
  ShieldCheck,
  Layers,
  UserRound,
  ShoppingBag,
  Users,
  Dna,
  Scale,
  Ruler,
  AlertCircle,
  Home,
  Users2,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  PlusCircle,
  X
} from "lucide-react";
import Link from "next/link";
import { collection, doc, setDoc } from "firebase/firestore";
import { useFirestore, useCollection, useDoc, useMemoFirebase, useAuth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { SectionNav } from "@/components/layout/section-nav";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { initiateEmailSignUp } from "@/firebase/non-blocking-login";

interface Tutor {
  name: string;
  kinship: string;
  phone: string;
}

export default function PlayersPage() {
  const { clubId } = useParams() as { clubId: string };
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<any>(null);
  
  const initialForm = { 
    firstName: "", 
    lastName: "", 
    email: "", 
    phone: "", 
    dni: "",
    birthDate: "",
    weight: "",
    height: "",
    address: "",
    bloodType: "",
    emergencyContact: "",
    emergencyPhone: "",
    tutors: [{ name: "", kinship: "", phone: "" }] as Tutor[],
    position: "",
    jerseyNumber: 1,
    photoUrl: "",
    parkingActive: false,
    enableLogin: false,
    password: ""
  };

  const [newPlayer, setNewPlayer] = useState(initialForm);

  const clubRef = useMemoFirebase(() => doc(db, "clubs", clubId), [db, clubId]);
  const { data: club } = useDoc(clubRef);

  const playersQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "players"), [db, clubId]);
  const { data: players, isLoading } = useCollection(playersQuery);

  const clubNav = [
    { title: "Panel General", href: `/dashboard/clubs/${clubId}`, icon: LayoutDashboard },
    { title: "Administración", href: `/dashboard/clubs/${clubId}/admin`, icon: ShieldCheck },
    { title: "Categorías", href: `/dashboard/clubs/${clubId}/divisions`, icon: Layers },
    { title: "Staff Técnico", href: `/dashboard/clubs/${clubId}/coaches`, icon: UserRound },
    { title: "Tienda Club", href: `/dashboard/clubs/${clubId}/shop/admin`, icon: ShoppingBag },
    { title: "Base Jugadores", href: `/dashboard/clubs/${clubId}/players`, icon: Users },
    { title: "Finanzas", href: `/dashboard/clubs/${clubId}/finances`, icon: CreditCard },
  ];

  const addTutor = (isEdit = false) => {
    const emptyTutor = { name: "", kinship: "", phone: "" };
    if (isEdit) {
      setEditingPlayer({ ...editingPlayer, tutors: [...(editingPlayer.tutors || []), emptyTutor] });
    } else {
      setNewPlayer({ ...newPlayer, tutors: [...newPlayer.tutors, emptyTutor] });
    }
  };

  const removeTutor = (index: number, isEdit = false) => {
    if (isEdit) {
      setEditingPlayer({ ...editingPlayer, tutors: editingPlayer.tutors.filter((_: any, i: number) => i !== index) });
    } else {
      setNewPlayer({ ...newPlayer, tutors: newPlayer.tutors.filter((_, i) => i !== index) });
    }
  };

  const updateTutor = (index: number, field: keyof Tutor, value: string, isEdit = false) => {
    if (isEdit) {
      const updated = [...(editingPlayer.tutors || [])];
      updated[index] = { ...updated[index], [field]: value };
      setEditingPlayer({ ...editingPlayer, tutors: updated });
    } else {
      const updated = [...newPlayer.tutors];
      updated[index] = { ...updated[index], [field]: value };
      setNewPlayer({ ...newPlayer, tutors: updated });
    }
  };

  const handleCreatePlayer = async () => {
    if (!newPlayer.firstName || !newPlayer.lastName || !newPlayer.dni) return;

    try {
      const playerId = doc(collection(db, "clubs", clubId, "players")).id;
      const playerDoc = doc(db, "clubs", clubId, "players", playerId);
      
      if (newPlayer.enableLogin && newPlayer.email && newPlayer.password) {
        initiateEmailSignUp(auth, newPlayer.email, newPlayer.password);
        const userDoc = doc(db, "users", playerId);
        await setDoc(userDoc, {
          id: playerId,
          name: `${newPlayer.firstName} ${newPlayer.lastName}`,
          email: newPlayer.email,
          role: "player",
          clubId,
          requiresPasswordChange: true,
          createdAt: new Date().toISOString()
        });

        await setDoc(doc(db, "all_players_index", playerId), {
          id: playerId,
          firstName: newPlayer.firstName,
          lastName: newPlayer.lastName,
          email: newPlayer.email,
          clubId,
          clubName: club?.name || ""
        });
      }

      await setDoc(playerDoc, {
        ...newPlayer,
        id: playerId,
        clubId,
        createdAt: new Date().toISOString()
      });
      
      toast({ title: "Jugador Registrado", description: `${newPlayer.firstName} ha sido dado de alta correctamente.` });
      setNewPlayer(initialForm);
      setIsDialogOpen(false);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error al registrar" });
    }
  };

  const handleUpdatePlayer = async () => {
    if (!editingPlayer) return;
    const playerDoc = doc(db, "clubs", clubId, "players", editingPlayer.id);
    
    if (editingPlayer.enableLogin && !editingPlayer.hasAccessCreated && editingPlayer.email && editingPlayer.password) {
      try {
        initiateEmailSignUp(auth, editingPlayer.email, editingPlayer.password);
        const userDoc = doc(db, "users", editingPlayer.id);
        await setDoc(userDoc, {
          id: editingPlayer.id,
          name: `${editingPlayer.firstName} ${editingPlayer.lastName}`,
          email: editingPlayer.email,
          role: "player",
          clubId,
          requiresPasswordChange: true,
          createdAt: new Date().toISOString()
        });
        editingPlayer.hasAccessCreated = true;
      } catch (e) { console.error(e); }
    }

    updateDocumentNonBlocking(playerDoc, { ...editingPlayer });
    setIsEditOpen(false);
    toast({ title: "Legajo Actualizado" });
  };

  const handleDeletePlayer = (id: string) => {
    deleteDocumentNonBlocking(doc(db, "clubs", clubId, "players", id));
    toast({ variant: "destructive", title: "Jugador Eliminado" });
  };

  return (
    <div className="flex gap-8 animate-in fade-in duration-500">
      <SectionNav items={clubNav} basePath={`/dashboard/clubs/${clubId}`} />
      
      <div className="flex-1 space-y-8">
        <header className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold font-headline text-foreground">Legajos de Jugadores: {club?.name}</h1>
              <p className="text-muted-foreground">Padrón biométrico, médico y responsables.</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2 shadow-lg h-12 px-6">
                  <UserPlus className="h-5 w-5" /> Alta de Jugador
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[95vh]">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black">Nueva Ficha Deportiva</DialogTitle>
                  <DialogDescription>Completa el legajo oficial y define los tutores responsables.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] pr-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <Label className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                          <User className="h-3 w-3" /> Identidad y Contacto
                        </Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Nombre</Label>
                            <Input value={newPlayer.firstName} onChange={e => setNewPlayer({...newPlayer, firstName: e.target.value})} placeholder="Nombre" />
                          </div>
                          <div className="space-y-2">
                            <Label>Apellido</Label>
                            <Input value={newPlayer.lastName} onChange={e => setNewPlayer({...newPlayer, lastName: e.target.value})} placeholder="Apellido" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>DNI</Label>
                            <Input value={newPlayer.dni} onChange={e => setNewPlayer({...newPlayer, dni: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                            <Label>Fecha Nac.</Label>
                            <Input type="date" value={newPlayer.birthDate} onChange={e => setNewPlayer({...newPlayer, birthDate: e.target.value})} />
                          </div>
                        </div>
                        <Input value={newPlayer.email} onChange={e => setNewPlayer({...newPlayer, email: e.target.value})} placeholder="Email Oficial" />
                        <Input value={newPlayer.address} onChange={e => setNewPlayer({...newPlayer, address: e.target.value})} placeholder="Dirección Particular" />
                      </div>

                      {/* Sección Responsables Multi-Tutor */}
                      <div className="space-y-4 border-t pt-6">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-black uppercase tracking-[0.2em] text-orange-600 flex items-center gap-2">
                            <Users2 className="h-3 w-3" /> Tutores / Responsables
                          </Label>
                          <Button variant="ghost" size="sm" onClick={() => addTutor()} className="h-7 text-[10px] gap-1 bg-orange-50 text-orange-700">
                            <PlusCircle className="h-3 w-3" /> Agregar Tutor
                          </Button>
                        </div>
                        
                        <div className="space-y-4">
                          {newPlayer.tutors.map((tutor, idx) => (
                            <div key={idx} className="p-4 bg-muted/30 rounded-xl border relative space-y-3">
                              {newPlayer.tutors.length > 1 && (
                                <Button variant="ghost" size="icon" onClick={() => removeTutor(idx)} className="absolute top-2 right-2 h-6 w-6 text-destructive">
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                              <div className="space-y-2">
                                <Label className="text-[10px] font-bold">Nombre Completo</Label>
                                <Input value={tutor.name} onChange={e => updateTutor(idx, 'name', e.target.value)} placeholder="Ej. Juan Pérez" />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold">Parentesco</Label>
                                  <Input value={tutor.kinship} onChange={e => updateTutor(idx, 'kinship', e.target.value)} placeholder="Ej. Padre" />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold">Teléfono</Label>
                                  <Input value={tutor.phone} onChange={e => updateTutor(idx, 'phone', e.target.value)} placeholder="+54..." />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-4">
                        <Label className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                          <AlertCircle className="h-3 w-3" /> Ficha Médica y Técnica
                        </Label>
                        <div className="grid grid-cols-2 gap-4">
                          <Select value={newPlayer.bloodType} onValueChange={v => setNewPlayer({...newPlayer, bloodType: v})}>
                            <SelectTrigger><SelectValue placeholder="Sangre" /></SelectTrigger>
                            <SelectContent>
                              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Input value={newPlayer.position} onChange={e => setNewPlayer({...newPlayer, position: e.target.value})} placeholder="Posición" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <Input type="number" value={newPlayer.weight} onChange={e => setNewPlayer({...newPlayer, weight: e.target.value})} placeholder="Peso (kg)" />
                          <Input type="number" value={newPlayer.height} onChange={e => setNewPlayer({...newPlayer, height: e.target.value})} placeholder="Altura (cm)" />
                        </div>
                      </div>

                      <div className="space-y-4 border-t pt-6 bg-muted/20 p-4 rounded-xl">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                            <Lock className="h-3 w-3" /> Acceso al Sistema
                          </Label>
                          <Switch checked={newPlayer.enableLogin} onCheckedChange={(v) => setNewPlayer({...newPlayer, enableLogin: v})} />
                        </div>
                        {newPlayer.enableLogin && (
                          <div className="space-y-2 animate-in fade-in duration-300">
                            <Label>Contraseña Temporal</Label>
                            <Input type={showPassword ? "text" : "password"} value={newPlayer.password} onChange={e => setNewPlayer({...newPlayer, password: e.target.value})} />
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-primary/5 rounded-xl border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Car className="h-5 w-5 text-primary" />
                          <Label className="font-bold">Acceso Vehicular</Label>
                        </div>
                        <Switch checked={newPlayer.parkingActive} onCheckedChange={(v) => setNewPlayer({...newPlayer, parkingActive: v})} />
                      </div>
                    </div>
                  </div>
                </ScrollArea>
                <DialogFooter className="border-t pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreatePlayer} disabled={!newPlayer.firstName || !newPlayer.lastName} className="font-bold">Confirmar Alta</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {players?.map((player: any) => (
              <Card key={player.id} className="hover:border-primary/50 transition-all flex flex-col shadow-sm">
                <CardHeader className="flex flex-row items-center gap-4 pb-4">
                  <Avatar className="h-16 w-16 border-2 border-primary/10">
                    <AvatarImage src={player.photoUrl} />
                    <AvatarFallback><User /></AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{player.firstName} {player.lastName}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[9px] font-black uppercase">{player.position || 'JUGADOR'}</Badge>
                      <Badge variant="outline" className="text-[9px] border-red-200 text-red-600 font-black">{player.bloodType || 'S/G'}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-[11px] flex-1">
                  <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                    <p className="text-[9px] font-black uppercase text-muted-foreground flex items-center gap-1"><Users2 className="h-3 w-3" /> Responsables ({player.tutors?.length || 0})</p>
                    {player.tutors?.map((t: Tutor, i: number) => (
                      <div key={i} className="flex flex-col border-b last:border-0 pb-1 last:pb-0">
                        <span className="font-bold text-foreground">{t.name}</span>
                        <div className="flex justify-between text-muted-foreground">
                          <span>{t.kinship}</span>
                          <span className="font-mono">{t.phone}</span>
                        </div>
                      </div>
                    ))}
                    {(!player.tutors || player.tutors.length === 0) && <p className="text-muted-foreground italic">Sin responsables registrados.</p>}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground"><Home className="h-3.5 w-3.5 shrink-0" /> {player.address || 'Sin dirección'}</div>
                </CardContent>
                <CardFooter className="flex justify-between border-t pt-4 bg-muted/5">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="text-destructive h-8 w-8 p-0" onClick={() => handleDeletePlayer(player.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setEditingPlayer(player); setIsEditOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" asChild className="h-8 text-[10px] font-bold border-primary text-primary">
                    <Link href={`/dashboard/clubs/${clubId}/players/${player.id}/payments`}>PAGOS</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal de edición con multi-tutor */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh]">
          <DialogHeader><DialogTitle className="text-2xl font-black">Editar Legajo</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[75vh] pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-xs font-black uppercase text-primary">Identidad</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <Input value={editingPlayer?.firstName || ""} onChange={e => setEditingPlayer({...editingPlayer, firstName: e.target.value})} placeholder="Nombre" />
                    <Input value={editingPlayer?.lastName || ""} onChange={e => setEditingPlayer({...editingPlayer, lastName: e.target.value})} placeholder="Apellido" />
                  </div>
                  <Input value={editingPlayer?.dni || ""} onChange={e => setEditingPlayer({...editingPlayer, dni: e.target.value})} placeholder="DNI" />
                  <Input type="date" value={editingPlayer?.birthDate || ""} onChange={e => setEditingPlayer({...editingPlayer, birthDate: e.target.value})} />
                  <Input value={editingPlayer?.address || ""} onChange={e => setEditingPlayer({...editingPlayer, address: e.target.value})} placeholder="Dirección" />
                </div>

                <div className="space-y-4 border-t pt-6">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-black uppercase text-orange-600">Responsables</Label>
                    <Button variant="ghost" size="sm" onClick={() => addTutor(true)} className="h-7 text-[10px] gap-1">
                      <PlusCircle className="h-3 w-3" /> Agregar
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {editingPlayer?.tutors?.map((tutor: Tutor, idx: number) => (
                      <div key={idx} className="p-4 bg-muted/30 rounded-xl border relative space-y-3">
                        <Button variant="ghost" size="icon" onClick={() => removeTutor(idx, true)} className="absolute top-2 right-2 h-6 w-6 text-destructive">
                          <X className="h-4 w-4" />
                        </Button>
                        <Input value={tutor.name} onChange={e => updateTutor(idx, 'name', e.target.value, true)} placeholder="Nombre" />
                        <div className="grid grid-cols-2 gap-3">
                          <Input value={tutor.kinship} onChange={e => updateTutor(idx, 'kinship', e.target.value, true)} placeholder="Parentesco" />
                          <Input value={tutor.phone} onChange={e => updateTutor(idx, 'phone', e.target.value, true)} placeholder="Teléfono" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-xs font-black uppercase text-primary">Ficha Técnica</Label>
                  <Select value={editingPlayer?.bloodType || ""} onValueChange={v => setEditingPlayer({...editingPlayer, bloodType: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input value={editingPlayer?.position || ""} onChange={e => setEditingPlayer({...editingPlayer, position: e.target.value})} placeholder="Posición" />
                  <div className="grid grid-cols-2 gap-4">
                    <Input type="number" value={editingPlayer?.weight || ""} onChange={e => setEditingPlayer({...editingPlayer, weight: e.target.value})} placeholder="Peso" />
                    <Input type="number" value={editingPlayer?.height || ""} onChange={e => setEditingPlayer({...editingPlayer, height: e.target.value})} placeholder="Altura" />
                  </div>
                </div>

                {!editingPlayer?.hasAccessCreated && (
                  <div className="space-y-4 border-t pt-6 bg-muted/20 p-4 rounded-xl">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-black uppercase text-primary">Acceso Digital</Label>
                      <Switch checked={editingPlayer?.enableLogin || false} onCheckedChange={(v) => setEditingPlayer({...editingPlayer, enableLogin: v})} />
                    </div>
                    {editingPlayer?.enableLogin && (
                      <Input type="password" value={editingPlayer?.password || ""} onChange={e => setEditingPlayer({...editingPlayer, password: e.target.value})} placeholder="Contraseña temporal" />
                    )}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdatePlayer} className="font-bold">Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
