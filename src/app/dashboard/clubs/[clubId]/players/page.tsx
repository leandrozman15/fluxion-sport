
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
  Users
} from "lucide-react";
import Link from "next/link";
import { collection, doc, setDoc } from "firebase/firestore";
import { useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
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

export default function PlayersPage() {
  const { clubId } = useParams() as { clubId: string };
  const db = useFirestore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<any>(null);
  const [newPlayer, setNewPlayer] = useState({ 
    firstName: "", 
    lastName: "", 
    birthDate: "", 
    phone: "", 
    email: "", 
    photoUrl: "",
    position: "",
    jerseyNumber: 1,
    parkingActive: false
  });

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

  const handleCreatePlayer = () => {
    const playerId = doc(collection(db, "clubs", clubId, "players")).id;
    const playerDoc = doc(db, "clubs", clubId, "players", playerId);
    
    setDoc(playerDoc, {
      ...newPlayer,
      id: playerId,
      clubId,
      createdAt: new Date().toISOString()
    });
    
    setNewPlayer({ 
      firstName: "", 
      lastName: "", 
      birthDate: "", 
      phone: "", 
      email: "", 
      photoUrl: "",
      position: "",
      jerseyNumber: 1,
      parkingActive: false
    });
    setIsDialogOpen(false);
  };

  const handleUpdatePlayer = () => {
    if (!editingPlayer) return;
    const playerDoc = doc(db, "clubs", clubId, "players", editingPlayer.id);
    updateDocumentNonBlocking(playerDoc, {
      firstName: editingPlayer.firstName,
      lastName: editingPlayer.lastName,
      birthDate: editingPlayer.birthDate,
      phone: editingPlayer.phone,
      email: editingPlayer.email,
      photoUrl: editingPlayer.photoUrl,
      position: editingPlayer.position,
      jerseyNumber: editingPlayer.jerseyNumber,
      parkingActive: editingPlayer.parkingActive || false
    });
    setIsEditOpen(false);
  };

  const handleDeletePlayer = (id: string) => {
    deleteDocumentNonBlocking(doc(db, "clubs", clubId, "players", id));
  };

  return (
    <div className="flex gap-8 animate-in fade-in duration-500">
      <SectionNav items={clubNav} basePath={`/dashboard/clubs/${clubId}`} />
      
      <div className="flex-1 space-y-8">
        <header className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold font-headline text-foreground">Base de Jugadores: {club?.name}</h1>
              <p className="text-muted-foreground">Gestiona el padrón general de deportistas del club.</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Registrar Jugador
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Ficha de Jugador</DialogTitle>
                  <DialogDescription>Añade un nuevo jugador a la base de datos central.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input value={newPlayer.firstName} onChange={e => setNewPlayer({...newPlayer, firstName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Apellido</Label>
                    <Input value={newPlayer.lastName} onChange={e => setNewPlayer({...newPlayer, lastName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={newPlayer.email} onChange={e => setNewPlayer({...newPlayer, email: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Posición</Label>
                    <Input value={newPlayer.position} onChange={e => setNewPlayer({...newPlayer, position: e.target.value})} placeholder="Ej. Delantero" />
                  </div>
                  <div className="col-span-2 p-4 bg-muted/30 rounded-xl border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Car className="h-5 w-5 text-primary" />
                      <div>
                        <Label className="font-bold">Plan Estacionamiento</Label>
                        <p className="text-[10px] text-muted-foreground">Habilitar acceso vehicular al predio</p>
                      </div>
                    </div>
                    <Switch 
                      checked={newPlayer.parkingActive} 
                      onCheckedChange={(v) => setNewPlayer({...newPlayer, parkingActive: v})} 
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreatePlayer} disabled={!newPlayer.firstName || !newPlayer.lastName}>Guardar Jugador</Button>
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
              <Card key={player.id} className="hover:border-primary/50 transition-colors group relative overflow-hidden">
                {player.parkingActive && (
                  <div className="absolute top-0 right-0 bg-green-500 text-white p-1 rounded-bl-lg">
                    <Car className="h-3 w-3" />
                  </div>
                )}
                <CardHeader className="flex flex-row items-center gap-4">
                  <Avatar className="h-14 w-14 border-2 border-primary/20">
                    <AvatarImage src={player.photoUrl} />
                    <AvatarFallback><User /></AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{player.firstName} {player.lastName}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Badge variant="secondary">#{player.jerseyNumber || 'S/N'} {player.position}</Badge>
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {player.email}</div>
                  {player.parkingActive && (
                    <div className="flex items-center gap-2 text-green-600 font-bold text-[10px] uppercase">
                      <Car className="h-3 w-3" /> Parking Activo
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between border-t pt-4">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeletePlayer(player.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setEditingPlayer(player); setIsEditOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/clubs/${clubId}/players/${player.id}/payments`}>
                      <CreditCard className="h-4 w-4 mr-1" /> Pagos
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal de edición */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Editar Socio</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={editingPlayer?.firstName || ""} onChange={e => setEditingPlayer({...editingPlayer, firstName: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Apellido</Label>
              <Input value={editingPlayer?.lastName || ""} onChange={e => setEditingPlayer({...editingPlayer, lastName: e.target.value})} />
            </div>
            <div className="col-span-2 p-4 bg-muted/30 rounded-xl border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Car className="h-5 w-5 text-primary" />
                <div>
                  <Label className="font-bold">Plan Estacionamiento</Label>
                  <p className="text-[10px] text-muted-foreground">Habilitar acceso vehicular al predio</p>
                </div>
              </div>
              <Switch 
                checked={editingPlayer?.parkingActive || false} 
                onCheckedChange={(v) => setEditingPlayer({...editingPlayer, parkingActive: v})} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdatePlayer}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
