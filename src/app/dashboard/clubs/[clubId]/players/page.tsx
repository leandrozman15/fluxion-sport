
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
  Stethoscope,
  KeyRound,
  Trophy
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
import { initiateEmailSignUp, initiatePasswordReset } from "@/firebase/non-blocking-login";
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
    password: "",
    sport: "hockey"
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
          sport: newPlayer.sport,
          requiresPasswordChange: true,
          createdAt: new Date().toISOString()
        });

        await setDoc(doc(db, "all_players_index", playerId), {
          id: playerId,
          firstName: newPlayer.firstName,
          lastName: newPlayer.lastName,
          email: newPlayer.email,
          clubId,
          clubName: club?.name || "",
          sport: newPlayer.sport
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
    
    updateDocumentNonBlocking(playerDoc, { ...editingPlayer });
    setIsEditOpen(false);
    toast({ title: "Legajo Actualizado" });
  };

  const filteredPlayers = players?.filter(p => {
    const search = searchTerm.toLowerCase();
    return (
      p.firstName.toLowerCase().includes(search) || 
      p.lastName.toLowerCase().includes(search) || 
      p.dni?.includes(search)
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
                  <DialogDescription>Completa el legajo y selecciona la disciplina oficial.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] pr-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-bold">Disciplina</Label>
                          <p className="text-[10px] text-primary font-black uppercase tracking-widest">
                            {newPlayer.sport === 'rugby' ? '🏉 Rugby' : '🏑 Hockey'}
                          </p>
                        </div>
                        <Switch 
                          checked={newPlayer.sport === 'rugby'} 
                          onCheckedChange={(v) => setNewPlayer({...newPlayer, sport: v ? 'rugby' : 'hockey'})} 
                        />
                      </div>

                      <div className="space-y-4">
                        <Label className="text-xs font-black uppercase tracking-[0.2em] text-primary">Identidad</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <Input value={newPlayer.firstName} onChange={e => setNewPlayer({...newPlayer, firstName: e.target.value})} placeholder="Nombre" />
                          <Input value={newPlayer.lastName} onChange={e => setNewPlayer({...newPlayer, lastName: e.target.value})} placeholder="Apellido" />
                        </div>
                        <Input value={newPlayer.dni} onChange={e => setNewPlayer({...newPlayer, dni: e.target.value})} placeholder="DNI" />
                        <Input type="date" value={newPlayer.birthDate} onChange={e => setNewPlayer({...newPlayer, birthDate: e.target.value})} />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-4">
                        <Label className="text-xs font-black uppercase tracking-[0.2em] text-primary">Ficha Técnica</Label>
                        <Input value={newPlayer.position} onChange={e => setNewPlayer({...newPlayer, position: e.target.value})} placeholder="Posición" />
                        <div className="grid grid-cols-2 gap-4">
                          <Input type="number" value={newPlayer.weight} onChange={e => setNewPlayer({...newPlayer, weight: e.target.value})} placeholder="Peso (kg)" />
                          <Input type="number" value={newPlayer.height} onChange={e => setNewPlayer({...newPlayer, height: e.target.value})} placeholder="Altura (cm)" />
                        </div>
                      </div>

                      <div className="space-y-4 border-t pt-6 bg-muted/20 p-4 rounded-xl">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-black uppercase text-primary">Acceso Digital</Label>
                          <Switch checked={newPlayer.enableLogin} onCheckedChange={(v) => setNewPlayer({...newPlayer, enableLogin: v})} />
                        </div>
                        {newPlayer.enableLogin && (
                          <Input type="password" value={newPlayer.password} onChange={e => setNewPlayer({...newPlayer, password: e.target.value})} placeholder="Contraseña temporal" />
                        )}
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

          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nombre o DNI..." 
              className="pl-10 h-12 text-lg shadow-sm border-2 bg-card"
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
              <Card key={player.id} className="hover:border-primary/50 transition-all overflow-hidden border-2 group shadow-sm bg-card">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 border shadow-sm">
                      <AvatarImage src={player.photoUrl} />
                      <AvatarFallback><User /></AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-base">{player.firstName} {player.lastName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[9px] font-black uppercase border-primary text-primary">
                          {player.sport === 'rugby' ? '🏉 RUGBY' : '🏑 HOCKEY'}
                        </Badge>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">DNI: {player.dni || 'S/D'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-primary/5" onClick={() => { setEditingPlayer(player); setIsEditOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" asChild className="font-bold h-9 gap-2 border-primary text-primary hover:bg-primary hover:text-white transition-all">
                      <Link href={`/dashboard/clubs/${clubId}/players/${player.id}/payments`}>PAGOS</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal de edición */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="text-2xl font-black">Editar Legajo</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-xl border">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Disciplina</Label>
                  <p className="text-[10px] text-muted-foreground font-black uppercase">
                    {editingPlayer?.sport === 'rugby' ? '🏉 Rugby' : '🏑 Hockey'}
                  </p>
                </div>
                <Switch 
                  checked={editingPlayer?.sport === 'rugby'} 
                  onCheckedChange={(v) => setEditingPlayer({...editingPlayer, sport: v ? 'rugby' : 'hockey'})} 
                />
              </div>
              <Input value={editingPlayer?.firstName || ""} onChange={e => setEditingPlayer({...editingPlayer, firstName: e.target.value})} placeholder="Nombre" />
              <Input value={editingPlayer?.lastName || ""} onChange={e => setEditingPlayer({...editingPlayer, lastName: e.target.value})} placeholder="Apellido" />
            </div>
            <div className="space-y-4">
              <Input value={editingPlayer?.dni || ""} onChange={e => setEditingPlayer({...editingPlayer, dni: e.target.value})} placeholder="DNI" />
              <Input value={editingPlayer?.position || ""} onChange={e => setEditingPlayer({...editingPlayer, position: e.target.value})} placeholder="Posición" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdatePlayer} className="font-bold">Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
