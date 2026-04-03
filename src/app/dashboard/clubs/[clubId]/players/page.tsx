
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
  UserPlus
} from "lucide-react";
import Link from "next/link";
import { collection, doc, setDoc } from "firebase/firestore";
import { useFirestore, useCollection, useDoc, useMemoFirebase, useAuth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { SectionNav } from "@/components/layout/section-nav";
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
    { title: "Categorías", href: `/dashboard/clubs/${clubId}/divisions`, icon: Layers },
    { title: "Staff Técnico", href: `/dashboard/clubs/${clubId}/coaches`, icon: UserRound },
    { title: "Tienda Club", href: `/dashboard/clubs/${clubId}/shop/admin`, icon: ShoppingBag },
    { title: "Base Jugadores", href: `/dashboard/clubs/${clubId}/players`, icon: Users },
    { title: "Finanzas", href: `/dashboard/clubs/${clubId}/finances`, icon: CreditCard },
  ];

  const handleCreatePlayer = async () => {
    if (!newPlayer.firstName || !newPlayer.lastName || !newPlayer.dni) return;

    try {
      // Estandarizar ID por email para evitar desincronización con el UID que será igual al email en registros iniciales
      const normalizedEmail = newPlayer.email.toLowerCase().trim();
      const playerId = normalizedEmail || doc(collection(db, "clubs", clubId, "players")).id;
      const playerDoc = doc(db, "clubs", clubId, "players", playerId);
      
      const pData = {
        ...newPlayer,
        id: playerId,
        email: normalizedEmail,
        clubId,
        role: "player",
        createdAt: new Date().toISOString()
      };

      if (newPlayer.enableLogin && normalizedEmail && newPlayer.password) {
        initiateEmailSignUp(auth, normalizedEmail, newPlayer.password);
        await setDoc(doc(db, "all_players_index", playerId), {
          id: playerId,
          firstName: newPlayer.firstName,
          lastName: newPlayer.lastName,
          email: normalizedEmail,
          clubId,
          clubName: club?.name || "Club",
          sport: newPlayer.sport,
          role: "player",
          createdAt: new Date().toISOString()
        });
      }

      await setDoc(playerDoc, pData);
      toast({ title: "Jugador Registrado" });
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
    updateDocumentNonBlocking(playerDoc, { ...editingPlayer, role: "player" });
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

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white" /></div>;

  return (
    <div className="flex flex-col md:flex-row gap-8 animate-in fade-in duration-500">
      <SectionNav items={clubNav} basePath={`/dashboard/clubs/${clubId}`} />
      
      <div className="flex-1 space-y-8 pb-20 px-4 md:px-0">
        <header className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold font-headline text-white drop-shadow-md">Legajos Deportivos</h1>
              <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] mt-1">{club?.name} • Padrón oficial de jugadores.</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2 shadow-lg h-12 px-6 font-black uppercase text-xs tracking-widest bg-white text-primary hover:bg-slate-50">
                  <UserPlus className="h-5 w-5" /> Alta de Jugador
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[95vh] bg-white border-none shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black">Nueva Ficha Deportiva</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] pr-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-bold text-slate-700">Disciplina</Label>
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
                        <Input value={newPlayer.firstName} onChange={e => setNewPlayer({...newPlayer, firstName: e.target.value})} placeholder="Nombre" className="h-12 border-2 font-bold" />
                        <Input value={newPlayer.lastName} onChange={e => setNewPlayer({...newPlayer, lastName: e.target.value})} placeholder="Apellido" className="h-12 border-2 font-bold" />
                        <Input value={newPlayer.dni} onChange={e => setNewPlayer({...newPlayer, dni: e.target.value})} placeholder="DNI" className="h-12 border-2 font-bold" />
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-4 border-t pt-6 bg-slate-50 p-4 rounded-xl">
                        <Label className="text-xs font-black uppercase text-primary">Acceso Digital (Usuario)</Label>
                        <div className="flex items-center gap-2">
                          <Switch checked={newPlayer.enableLogin} onCheckedChange={(v) => setNewPlayer({...newPlayer, enableLogin: v})} />
                          <span className="text-[10px] font-black text-slate-400">ACTIVAR APP SOCIO</span>
                        </div>
                        {newPlayer.enableLogin && (
                          <div className="space-y-3">
                            <Input type="email" value={newPlayer.email} onChange={e => setNewPlayer({...newPlayer, email: e.target.value})} placeholder="Email institucional" className="h-10 border-2" />
                            <Input type="password" value={newPlayer.password} onChange={e => setNewPlayer({...newPlayer, password: e.target.value})} placeholder="Clave temporal" className="h-10 border-2" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
                <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-6 mt-4 border-t">
                  <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="font-bold text-slate-500">Cancelar</Button>
                  <Button onClick={handleCreatePlayer} disabled={!newPlayer.firstName || !newPlayer.lastName} className="font-black uppercase text-xs tracking-widest h-12 px-8">Confirmar Alta</Button>
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
          {filteredPlayers?.map((player: any) => (
            <Card key={player.id} className="hover:border-primary/50 transition-all overflow-hidden border-none shadow-xl bg-white group">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 border-2 border-slate-100 shadow-md rounded-xl">
                    <AvatarImage src={player.photoUrl} className="object-cover" />
                    <AvatarFallback className="font-black text-slate-300 bg-slate-50">{player.firstName[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-black text-lg text-slate-900 leading-none">{player.firstName} {player.lastName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[8px] font-black uppercase border-primary text-primary px-2 h-4">
                        {player.sport === 'rugby' ? '🏉 RUGBY' : '🏑 HOCKEY'}
                      </Badge>
                      <span className="text-[9px] font-bold text-slate-400">DNI: {player.dni}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-slate-400 hover:text-primary rounded-xl" onClick={() => { setEditingPlayer(player); setIsEditOpen(true); }}><Pencil className="h-5 w-5" /></Button>
                  <Button variant="outline" size="sm" asChild className="font-black h-10 gap-2 border-primary/20 text-primary hover:bg-primary/5 transition-all px-5 text-[10px] uppercase tracking-widest rounded-xl">
                    <Link href={`/dashboard/clubs/${clubId}/players/${player.id}/payments`}>Cta. Corriente</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl bg-white border-none shadow-2xl">
          <DialogHeader><DialogTitle className="text-2xl font-black text-slate-900">Editar Legajo</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <Input value={editingPlayer?.firstName || ""} onChange={e => setEditingPlayer({...editingPlayer, firstName: e.target.value})} placeholder="Nombre" className="h-12 border-2 font-bold" />
              <Input value={editingPlayer?.lastName || ""} onChange={e => setEditingPlayer({...editingPlayer, lastName: e.target.value})} placeholder="Apellido" className="h-12 border-2 font-bold" />
            </div>
            <div className="space-y-4">
              <Input value={editingPlayer?.dni || ""} onChange={e => setEditingPlayer({...editingPlayer, dni: e.target.value})} placeholder="DNI" className="h-12 border-2 font-bold" />
              <Input value={editingPlayer?.email || ""} onChange={e => setEditingPlayer({...editingPlayer, email: e.target.value})} placeholder="Email" className="h-12 border-2" />
            </div>
          </div>
          <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-6 mt-4 border-t">
            <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="font-bold">Cancelar</Button>
            <Button onClick={handleUpdatePlayer} className="font-black uppercase text-xs tracking-widest h-12 px-8">Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
