
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
  X,
  Search,
  Hash,
  Stethoscope
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
import { cn } from "@/lib/utils";

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
  const [searchTerm, setSearchTerm] = useState("");
  
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

  const filteredPlayers = players?.filter(p => {
    const search = searchTerm.toLowerCase();
    return (
      p.firstName.toLowerCase().includes(search) || 
      p.lastName.toLowerCase().includes(search) || 
      p.dni?.includes(search) ||
      p.position?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="flex gap-8 animate-in fade-in duration-500">
      <SectionNav items={clubNav} basePath={`/dashboard/clubs/${clubId}`} />
      
      <div className="flex-1 space-y-8 pb-20">
        <header className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold font-headline text-foreground">Legajos Deportivos</h1>
              <p className="text-muted-foreground">{club?.name} • Padrón oficial de jugadores.</p>
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

          {/* Buscador */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nombre, DNI o posición..." 
              className="pl-10 h-12 text-lg shadow-sm border-2 focus-visible:ring-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </header>

        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-4">
            {filteredPlayers?.map((player: any) => (
              <Card key={player.id} className="hover:border-primary/50 transition-all overflow-hidden border-2 group shadow-sm">
                <CardContent className="p-0">
                  <div className="flex flex-col lg:flex-row lg:items-center">
                    {/* Perfil e Identidad */}
                    <div className="flex items-center gap-4 p-4 lg:w-1/4 border-b lg:border-b-0 lg:border-r bg-muted/5">
                      <Avatar className="h-14 w-14 border-2 border-primary/10 shadow-sm">
                        <AvatarImage src={player.photoUrl} />
                        <AvatarFallback><User /></AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-base truncate">{player.firstName} {player.lastName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">DNI: {player.dni || 'S/D'}</span>
                          <Badge variant="outline" className="text-[9px] border-red-200 text-red-600 font-black h-4">{player.bloodType || 'S/G'}</Badge>
                        </div>
                      </div>
                    </div>

                    {/* Información Técnica y Responsables */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
                      {/* Tutores */}
                      <div className="space-y-2">
                        <p className="text-[9px] font-black uppercase text-muted-foreground flex items-center gap-1.5 tracking-widest">
                          <Users2 className="h-3 w-3" /> Responsables ({player.tutors?.length || 0})
                        </p>
                        <div className="space-y-1">
                          {player.tutors?.slice(0, 2).map((t: Tutor, i: number) => (
                            <div key={i} className="flex justify-between text-[11px] leading-tight">
                              <span className="font-bold truncate max-w-[120px]">{t.name}</span>
                              <span className="text-muted-foreground font-mono">{t.phone}</span>
                            </div>
                          ))}
                          {(!player.tutors || player.tutors.length === 0) && <p className="text-[10px] text-muted-foreground italic">Sin responsables.</p>}
                          {player.tutors?.length > 2 && <p className="text-[9px] text-primary font-bold">+ Ver más responsables</p>}
                        </div>
                      </div>

                      {/* Info Técnica / Salud */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Ficha Técnica</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-tight">{player.position || 'JUGADOR'}</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1">
                            <span className="flex items-center gap-1"><Scale className="h-3 w-3" /> {player.weight || '-'}kg</span>
                            <span className="flex items-center gap-1"><Ruler className="h-3 w-3" /> {player.height || '-'}cm</span>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Estado</p>
                          <div className="flex items-center gap-2">
                            {player.parkingActive ? (
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none text-[8px] gap-1"><Car className="h-2 w-2" /> PARKING</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[8px] opacity-30">SIN PARKING</Badge>
                            )}
                            {player.enableLogin && <Badge className="bg-blue-100 text-blue-700 border-none text-[8px]"><Lock className="h-2 w-2 mr-1" /> DIGITAL</Badge>}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="p-4 lg:border-l flex items-center justify-between lg:justify-end gap-3 bg-muted/5">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-destructive hover:bg-red-50" onClick={() => handleDeletePlayer(player.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-primary/5" onClick={() => { setEditingPlayer(player); setIsEditOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <Button variant="outline" size="sm" asChild className="font-bold h-9 gap-2 border-primary text-primary hover:bg-primary hover:text-white transition-all shadow-sm">
                        <Link href={`/dashboard/clubs/${clubId}/players/${player.id}/payments`}>
                          PAGOS <CreditCard className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {filteredPlayers?.length === 0 && !isLoading && (
          <div className="text-center py-20 border-2 border-dashed rounded-2xl bg-muted/10">
            <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
            <p className="text-muted-foreground font-medium">No se encontraron jugadores que coincidan con la búsqueda.</p>
          </div>
        )}
      </div>

      {/* Modal de edición */}
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
