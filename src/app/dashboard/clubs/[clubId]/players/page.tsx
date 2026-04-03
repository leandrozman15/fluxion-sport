
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { 
  Plus, 
  Loader2,
  ChevronLeft,
  Mail,
  Phone,
  LayoutDashboard,
  Layers,
  UserRound,
  ShoppingBag,
  Users,
  Search,
  Pencil,
  CreditCard,
  UserPlus,
  Scale,
  Ruler,
  AlertCircle,
  ShieldCheck,
  Calendar,
  MapPin,
  Stethoscope,
  ChevronRight,
  Trash2,
  ChevronDown,
  X
} from "lucide-react";
import Link from "next/link";
import { collection, doc, setDoc } from "firebase/firestore";
import { useFirestore, useCollection, useDoc, useMemoFirebase, useAuth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { deleteDocumentNonBlocking, updateDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { SectionNav } from "@/components/layout/section-nav";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { initiateEmailSignUp } from "@/firebase/non-blocking-login";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export default function PlayersPage() {
  const { clubId } = useParams() as { clubId: string };
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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
    position: "",
    jerseyNumber: "",
    photoUrl: "",
    divisionId: "",
    enableLogin: false,
    password: "",
    sport: "hockey"
  };

  const [newPlayer, setNewPlayer] = useState(initialForm);

  const clubRef = useMemoFirebase(() => doc(db, "clubs", clubId), [db, clubId]);
  const { data: club } = useDoc(clubRef);

  const playersQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "players"), [db, clubId]);
  const { data: players, isLoading } = useCollection(playersQuery);

  const divisionsQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "divisions"), [db, clubId]);
  const { data: divisions } = useCollection(divisionsQuery);

  const clubNav = [
    { title: "Panel General", href: `/dashboard/clubs/${clubId}`, icon: LayoutDashboard },
    { title: "Categorías", href: `/dashboard/clubs/${clubId}/divisions`, icon: Layers },
    { title: "Staff Técnico", href: `/dashboard/clubs/${clubId}/coaches`, icon: UserRound },
    { title: "Tienda Club", href: `/dashboard/clubs/${clubId}/shop/admin`, icon: ShoppingBag },
    { title: "Base Jugadores", href: `/dashboard/clubs/${clubId}/players`, icon: Users },
    { title: "Finanzas", href: `/dashboard/clubs/${clubId}/finances`, icon: CreditCard },
  ];

  const handleCreatePlayer = async () => {
    if (!newPlayer.firstName || !newPlayer.lastName || !newPlayer.dni) {
      toast({ variant: "destructive", title: "Faltan datos", description: "Nombre, apellido y DNI son obligatorios." });
      return;
    }

    setLoading(true);
    try {
      const normalizedEmail = newPlayer.email.toLowerCase().trim();
      const playerId = normalizedEmail || doc(collection(db, "clubs", clubId, "players")).id;
      const playerDoc = doc(db, "clubs", clubId, "players", playerId);
      
      const pData = {
        ...newPlayer,
        id: playerId,
        email: normalizedEmail,
        clubId: clubId,
        role: "player",
        createdAt: new Date().toISOString()
      };

      await setDoc(playerDoc, pData);

      if (newPlayer.enableLogin && normalizedEmail && newPlayer.password) {
        await setDoc(doc(db, "all_players_index", playerId), {
          id: playerId,
          firstName: newPlayer.firstName,
          lastName: newPlayer.lastName,
          email: normalizedEmail,
          clubId: clubId,
          divisionId: newPlayer.divisionId,
          clubName: club?.name || "Club",
          sport: newPlayer.sport,
          role: "player",
          createdAt: new Date().toISOString()
        });
        
        initiateEmailSignUp(auth, normalizedEmail, newPlayer.password);
        toast({ title: "Jugador Registrado", description: "Ficha generada. Se cerrará sesión para activar el acceso del socio." });
      } else {
        toast({ title: "Jugador Registrado", description: "Ficha oficial generada con éxito." });
      }

      setNewPlayer(initialForm);
      setIsDialogOpen(false);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error al registrar" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePlayer = async () => {
    if (!editingPlayer) return;
    const playerDoc = doc(db, "clubs", clubId, "players", editingPlayer.id);
    updateDocumentNonBlocking(playerDoc, { ...editingPlayer, clubId: clubId, role: "player" });
    
    // Usamos setDocumentNonBlocking con merge para asegurar que el índice global exista
    const indexDoc = doc(db, "all_players_index", editingPlayer.id);
    setDocumentNonBlocking(indexDoc, {
      id: editingPlayer.id,
      firstName: editingPlayer.firstName,
      lastName: editingPlayer.lastName,
      email: editingPlayer.email,
      clubId: clubId,
      divisionId: editingPlayer.divisionId,
      clubName: club?.name || "Club",
      sport: editingPlayer.sport,
      role: "player"
    }, { merge: true });

    setIsEditOpen(false);
    toast({ title: "Legajo Actualizado" });
  };

  const handleDeleteConfirmed = (id: string, name: string) => {
    const playerRef = doc(db, "clubs", clubId, "players", id);
    deleteDocumentNonBlocking(playerRef);
    const indexRef = doc(db, "all_players_index", id);
    deleteDocumentNonBlocking(indexRef);
    toast({ variant: "destructive", title: "Legajo Eliminado", description: `El registro de ${name} ha sido removido.` });
  };

  const filteredPlayers = players?.filter(p => {
    const search = searchTerm.toLowerCase();
    return (
      p.firstName.toLowerCase().includes(search) || 
      p.lastName.toLowerCase().includes(search) || 
      p.dni?.includes(search)
    );
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white" /></div>;

  return (
    <div className="flex flex-col md:flex-row gap-8 animate-in fade-in duration-500">
      <SectionNav items={clubNav} basePath={`/dashboard/clubs/${clubId}`} />
      
      <div className="flex-1 space-y-8 pb-20 px-4 md:px-0">
        <header className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black font-headline text-white drop-shadow-md">Legajos Deportivos</h1>
              <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] mt-1">{club?.name} • Padrón oficial de jugadores.</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2 shadow-lg h-12 px-6 font-black uppercase text-xs tracking-widest bg-white text-primary hover:bg-slate-50">
                  <UserPlus className="h-5 w-5" /> Alta de Jugador
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl bg-white border-none shadow-2xl rounded-[2.5rem] p-0 overflow-hidden">
                <DialogHeader className="bg-primary p-8 text-primary-foreground">
                  <DialogTitle className="text-2xl font-black flex items-center gap-2">
                    <ShieldCheck className="h-7 w-7" /> Nueva Ficha Deportiva Oficial
                  </DialogTitle>
                  <DialogDescription className="text-primary-foreground/80 font-bold">
                    Completa el legajo federativo del deportista.
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh]">
                  <div className="p-8 space-y-10">
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 border-b pb-2">
                        <UserRound className="h-5 w-5 text-primary" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">1. Identidad Personal</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="font-bold text-slate-700">Nombre</Label>
                          <Input value={newPlayer.firstName} onChange={e => setNewPlayer({...newPlayer, firstName: e.target.value})} placeholder="Ej. Mateo" className="h-12 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-bold text-slate-700">Apellido</Label>
                          <Input value={newPlayer.lastName} onChange={e => setNewPlayer({...newPlayer, lastName: e.target.value})} placeholder="Ej. González" className="h-12 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-bold text-slate-700">DNI / Documento</Label>
                          <Input value={newPlayer.dni} onChange={e => setNewPlayer({...newPlayer, dni: e.target.value})} placeholder="Número sin puntos" className="h-12 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-bold text-slate-700">Fecha de Nacimiento</Label>
                          <Input type="date" value={newPlayer.birthDate} onChange={e => setNewPlayer({...newPlayer, birthDate: e.target.value})} className="h-12 border-2" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center gap-3 border-b pb-2">
                        <Mail className="h-5 w-5 text-primary" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">2. Categoría y Contacto</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="font-bold text-slate-700">Categoría / Rama</Label>
                          <Select value={newPlayer.divisionId} onValueChange={v => setNewPlayer({...newPlayer, divisionId: v})}>
                            <SelectTrigger className="h-12 border-2 font-bold"><SelectValue placeholder="Asignar Categoría..." /></SelectTrigger>
                            <SelectContent>
                              {divisions?.map(d => (
                                <SelectItem key={d.id} value={d.id} className="font-bold">{d.name} ({d.sport?.toUpperCase()})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="font-bold text-slate-700">Email Particular</Label>
                          <Input type="email" value={newPlayer.email} onChange={e => setNewPlayer({...newPlayer, email: e.target.value})} placeholder="mateo@ejemplo.com" className="h-12 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-bold text-slate-700">Teléfono Celular</Label>
                          <Input value={newPlayer.phone} onChange={e => setNewPlayer({...newPlayer, phone: e.target.value})} placeholder="+54..." className="h-12 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-bold text-slate-700">Dirección Particular</Label>
                          <Input value={newPlayer.address} onChange={e => setNewPlayer({...newPlayer, address: e.target.value})} placeholder="Calle, Nro, Localidad" className="h-12 border-2" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center gap-3 border-b pb-2">
                        <Stethoscope className="h-5 w-5 text-primary" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">3. Ficha Biométrica y Salud</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label className="font-bold text-slate-700 flex items-center gap-1"><Scale className="h-3 w-3" /> Peso (kg)</Label>
                          <Input type="number" value={newPlayer.weight} onChange={e => setNewPlayer({...newPlayer, weight: e.target.value})} className="h-12 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-bold text-slate-700 flex items-center gap-1"><Ruler className="h-3 w-3" /> Altura (cm)</Label>
                          <Input type="number" value={newPlayer.height} onChange={e => setNewPlayer({...newPlayer, height: e.target.value})} className="h-12 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-bold text-slate-700">Grupo Sanguíneo</Label>
                          <Select value={newPlayer.bloodType} onValueChange={v => setNewPlayer({...newPlayer, bloodType: v})}>
                            <SelectTrigger className="h-12 border-2"><SelectValue placeholder="Elegir..." /></SelectTrigger>
                            <SelectContent>
                              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(t => <SelectItem key={t} value={t} className="font-bold">{t}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-orange-50 p-6 rounded-2xl border border-orange-100">
                        <div className="space-y-2">
                          <Label className="font-black text-orange-800 uppercase text-[10px]">Contacto de Emergencia</Label>
                          <Input value={newPlayer.emergencyContact} onChange={e => setNewPlayer({...newPlayer, emergencyContact: e.target.value})} placeholder="Nombre del familiar" className="bg-white border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-black text-orange-800 uppercase text-[10px]">Teléfono Emergencia</Label>
                          <Input value={newPlayer.emergencyPhone} onChange={e => setNewPlayer({...newPlayer, emergencyPhone: e.target.value})} placeholder="Número 24hs" className="bg-white border-2" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center gap-3 border-b pb-2">
                        <Layers className="h-5 w-5 text-primary" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">4. Información Técnica</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="font-black text-xs uppercase text-slate-400">Disciplina Principal</Label>
                          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border">
                            <span className="font-black text-slate-900">{newPlayer.sport === 'rugby' ? '🏉 RUGBY' : '🏑 HOCKEY'}</span>
                            <Switch 
                              checked={newPlayer.sport === 'rugby'} 
                              onCheckedChange={(v) => setNewPlayer({...newPlayer, sport: v ? 'rugby' : 'hockey'})} 
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="font-bold text-slate-700">Dorsal / Camiseta</Label>
                          <Input type="number" value={newPlayer.jerseyNumber} onChange={e => setNewPlayer({...newPlayer, jerseyNumber: e.target.value})} placeholder="N°" className="h-12 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-bold text-slate-700">Posición Preferida</Label>
                          <Input value={newPlayer.position} onChange={e => setNewPlayer({...newPlayer, position: e.target.value})} placeholder="Ej. Delantera, Volante..." className="h-12 border-2" />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-bold text-slate-700">URL Foto (Opcional)</Label>
                          <Input value={newPlayer.photoUrl} onChange={e => setNewPlayer({...newPlayer, photoUrl: e.target.value})} placeholder="https://..." className="h-12 border-2" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6 bg-slate-50 -mx-8 p-8 border-y">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5" /> Acceso App Fluxion
                          </h3>
                          <p className="text-xs text-slate-500 font-bold">Habilita al socio para ver su carnet y estadísticas.</p>
                        </div>
                        <Switch checked={newPlayer.enableLogin} onCheckedChange={(v) => setNewPlayer({...newPlayer, enableLogin: v})} />
                      </div>
                      {newPlayer.enableLogin && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2">
                          <div className="space-y-2">
                            <Label className="font-bold text-slate-700">Usuario (Email)</Label>
                            <Input type="email" value={newPlayer.email} onChange={e => setNewPlayer({...newPlayer, email: e.target.value})} placeholder="Email de login" className="bg-white border-2" />
                          </div>
                          <div className="space-y-2">
                            <Label className="font-bold text-slate-700">Clave Temporal</Label>
                            <Input type="password" value={newPlayer.password} onChange={e => setNewPlayer({...newPlayer, password: e.target.value})} placeholder="Mínimo 6 caracteres" className="bg-white border-2" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>
                <DialogFooter className="bg-slate-50 p-8 border-t flex flex-col sm:flex-row gap-4">
                  <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="font-bold text-slate-500 h-14">Cancelar</Button>
                  <Button onClick={handleCreatePlayer} disabled={loading} className="flex-1 font-black uppercase text-xs tracking-widest h-14 shadow-xl shadow-primary/20 gap-2">
                    {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <><ShieldCheck className="h-5 w-5" /> Confirmar Alta Federativa</>}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
            <Input placeholder="Buscar por nombre o DNI..." className="pl-10 h-14 text-lg bg-white/10 border-white/20 text-white placeholder:text-white/30 backdrop-blur-md" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </header>

        <div className="space-y-4">
          {filteredPlayers?.map((player: any) => {
            const playerDiv = divisions?.find(d => d.id === player.divisionId);
            return (
              <Card key={player.id} className="hover:border-primary/50 transition-all overflow-hidden border-none shadow-xl bg-white group">
                <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative">
                      <Avatar className="h-16 w-14 border-2 border-slate-100 shadow-md rounded-xl">
                        <AvatarImage src={player.photoUrl} className="object-cover" />
                        <AvatarFallback className="font-black text-slate-300 bg-slate-50">{player.firstName[0]}</AvatarFallback>
                      </Avatar>
                      {player.jerseyNumber && (
                        <div className="absolute -bottom-2 -right-2 bg-slate-900 text-white text-[9px] font-black h-6 w-6 flex items-center justify-center rounded-lg border-2 border-white shadow-md">
                          #{player.jerseyNumber}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-xl text-slate-900 leading-none truncate">{player.firstName} {player.lastName}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="outline" className="text-[8px] font-black uppercase border-primary text-primary px-2 h-4">
                          {player.sport === 'rugby' ? '🏉 RUGBY' : '🏑 HOCKEY'}
                        </Badge>
                        <Badge variant="secondary" className="text-[8px] font-black uppercase px-2 h-4">
                          {playerDiv?.name || "Sin Categoría"}
                        </Badge>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">DNI: {player.dni}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    <div className="hidden lg:flex flex-col items-end mr-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Posición</span>
                      <span className="text-xs font-bold text-slate-700">{player.position || "Sin definir"}</span>
                    </div>
                    
                    <Button variant="ghost" size="sm" className="h-11 w-11 p-0 text-slate-400 hover:text-primary rounded-xl" onClick={() => { setEditingPlayer(player); setIsEditOpen(true); }}>
                      <Pencil className="h-5 w-5" />
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-11 w-11 p-0 text-slate-400 hover:text-destructive hover:bg-red-50 rounded-xl border border-transparent hover:border-red-100"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-white border-none shadow-2xl rounded-[2rem]">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-2xl font-black text-slate-900">¿Confirmas la baja definitiva?</AlertDialogTitle>
                          <AlertDialogDescription className="font-bold text-slate-500">
                            Estás a punto de eliminar el legajo de <strong>{player.firstName} {player.lastName}</strong>. Esta acción removerá su ficha médica, deportiva y su acceso a la plataforma.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="pt-4">
                          <AlertDialogCancel className="font-bold rounded-xl">Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteConfirmed(player.id, `${player.firstName} ${player.lastName}`)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-black uppercase text-xs tracking-widest rounded-xl px-8 h-11"
                          >
                            Eliminar Legajo
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <Button variant="outline" size="sm" asChild className="font-black h-11 gap-2 border-primary/20 text-primary hover:bg-primary/5 transition-all px-6 text-[10px] uppercase tracking-widest rounded-xl ml-2">
                      <Link href={`/dashboard/clubs/${clubId}/players/${player.id}/payments`}>Cta. Corriente</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filteredPlayers?.length === 0 && (
            <div className="text-center py-32 opacity-40 border-2 border-dashed rounded-[2.5rem]">
              <Users className="h-16 w-16 mx-auto mb-4 text-white" />
              <p className="text-white font-black uppercase tracking-widest text-xs">Sin coincidencias en el padrón</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-4xl bg-white border-none shadow-2xl rounded-[2.5rem] p-0 overflow-hidden">
          <DialogHeader className="bg-slate-50 p-8 border-b flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-black text-slate-900">Editar Legajo: {editingPlayer?.firstName} {editingPlayer?.lastName}</DialogTitle>
              <DialogDescription className="font-bold text-slate-500">Actualiza la información federativa del deportista.</DialogDescription>
            </div>
            <Avatar className="h-16 w-16 border-4 border-white shadow-xl rounded-2xl hidden md:flex">
              <AvatarImage src={editingPlayer?.photoUrl} className="object-cover" />
              <AvatarFallback className="bg-primary/5 text-primary font-black">P</AvatarFallback>
            </Avatar>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="p-8 space-y-10">
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b pb-2">
                  <UserRound className="h-5 w-5 text-primary" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">1. Identidad Personal</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700">Nombre</Label>
                    <Input value={editingPlayer?.firstName || ""} onChange={e => setEditingPlayer({...editingPlayer, firstName: e.target.value})} className="h-12 border-2" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700">Apellido</Label>
                    <Input value={editingPlayer?.lastName || ""} onChange={e => setEditingPlayer({...editingPlayer, lastName: e.target.value})} className="h-12 border-2" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700">DNI / Documento</Label>
                    <Input value={editingPlayer?.dni || ""} onChange={e => setEditingPlayer({...editingPlayer, dni: e.target.value})} className="h-12 border-2" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700">Fecha de Nacimiento</Label>
                    <Input type="date" value={editingPlayer?.birthDate || ""} onChange={e => setEditingPlayer({...editingPlayer, birthDate: e.target.value})} className="h-12 border-2" />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b pb-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">2. Categoría y Residencia</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700">Categoría / Rama</Label>
                    <Select value={editingPlayer?.divisionId || ""} onValueChange={v => setEditingPlayer({...editingPlayer, divisionId: v})}>
                      <SelectTrigger className="h-12 border-2 font-bold"><SelectValue placeholder="Asignar Categoría..." /></SelectTrigger>
                      <SelectContent>
                        {divisions?.map(d => (
                          <SelectItem key={d.id} value={d.id} className="font-bold">{d.name} ({d.sport?.toUpperCase()})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700">Email Particular</Label>
                    <Input type="email" value={editingPlayer?.email || ""} onChange={e => setEditingPlayer({...editingPlayer, email: e.target.value})} className="h-12 border-2" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700">Teléfono Celular</Label>
                    <Input value={editingPlayer?.phone || ""} onChange={e => setEditingPlayer({...editingPlayer, phone: e.target.value})} className="h-12 border-2" />
                  </div>
                  <div className="col-span-full space-y-2">
                    <Label className="font-bold text-slate-700">Dirección Particular</Label>
                    <Input value={editingPlayer?.address || ""} onChange={e => setEditingPlayer({...editingPlayer, address: e.target.value})} className="h-12 border-2" />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b pb-2">
                  <Stethoscope className="h-5 w-5 text-primary" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">3. Ficha Biométrica y Salud</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700 flex items-center gap-1"><Scale className="h-3 w-3" /> Peso (kg)</Label>
                    <Input type="number" value={editingPlayer?.weight || ""} onChange={e => setEditingPlayer({...editingPlayer, weight: e.target.value})} className="h-12 border-2" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700 flex items-center gap-1"><Ruler className="h-3 w-3" /> Altura (cm)</Label>
                    <Input type="number" value={editingPlayer?.height || ""} onChange={e => setEditingPlayer({...editingPlayer, height: e.target.value})} className="h-12 border-2" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700">Grupo Sanguíneo</Label>
                    <Select value={editingPlayer?.bloodType || ""} onValueChange={v => setEditingPlayer({...editingPlayer, bloodType: v})}>
                      <SelectTrigger className="h-12 border-2"><SelectValue placeholder="Elegir..." /></SelectTrigger>
                      <SelectContent>
                        {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(t => <SelectItem key={t} value={t} className="font-bold">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-orange-50 p-6 rounded-2xl border border-orange-100">
                  <div className="space-y-2">
                    <Label className="font-black text-orange-800 uppercase text-[10px]">Contacto de Emergencia</Label>
                    <Input value={editingPlayer?.emergencyContact || ""} onChange={e => setEditingPlayer({...editingPlayer, emergencyContact: e.target.value})} className="bg-white border-2" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-black text-orange-800 uppercase text-[10px]">Teléfono Emergencia</Label>
                    <Input value={editingPlayer?.emergencyPhone || ""} onChange={e => setEditingPlayer({...editingPlayer, emergencyPhone: e.target.value})} className="bg-white border-2" />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b pb-2">
                  <Layers className="h-5 w-5 text-primary" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">4. Información Técnica</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-black text-xs uppercase text-slate-400">Disciplina Principal</Label>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border">
                      <span className="font-black text-slate-900">{editingPlayer?.sport === 'rugby' ? '🏉 RUGBY' : '🏑 HOCKEY'}</span>
                      <Switch 
                        checked={editingPlayer?.sport === 'rugby'} 
                        onCheckedChange={(v) => setEditingPlayer({...editingPlayer, sport: v ? 'rugby' : 'hockey'})} 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700">Dorsal / Camiseta</Label>
                    <Input type="number" value={editingPlayer?.jerseyNumber || ""} onChange={e => setEditingPlayer({...editingPlayer, jerseyNumber: e.target.value})} className="h-12 border-2" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700">Posición Preferida</Label>
                    <Input value={editingPlayer?.position || ""} onChange={e => setEditingPlayer({...editingPlayer, position: e.target.value})} className="h-12 border-2" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-700">URL Foto</Label>
                    <Input value={editingPlayer?.photoUrl || ""} onChange={e => setEditingPlayer({...editingPlayer, photoUrl: e.target.value})} className="h-12 border-2" />
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="bg-slate-50 p-8 border-t flex flex-col sm:flex-row justify-between gap-4">
            <Button variant="ghost" onClick={() => { if(confirm(`¿Eliminar legajo de ${editingPlayer.firstName}?`)) handleDeleteConfirmed(editingPlayer.id, editingPlayer.firstName); setIsEditOpen(false); }} className="font-black uppercase text-[10px] tracking-widest text-destructive hover:bg-red-50 hover:text-destructive h-14 border-2 border-transparent hover:border-red-100 gap-2">
              <Trash2 className="h-4 w-4" /> Eliminar Legajo
            </Button>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="font-bold text-slate-500 h-14 px-8">Cancelar</Button>
              <Button onClick={handleUpdatePlayer} className="font-black uppercase text-xs tracking-widest h-14 px-12 shadow-xl shadow-primary/20">
                Guardar Cambios
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
