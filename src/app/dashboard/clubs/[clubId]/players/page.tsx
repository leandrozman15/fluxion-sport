
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
  Pencil
} from "lucide-react";
import Link from "next/link";
import { collection, doc, setDoc } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Badge } from "@/components/ui/badge";

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
    jerseyNumber: 1
  });

  const playersQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "players"), [db, clubId]);
  const { data: players, isLoading } = useCollection(playersQuery);

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
      jerseyNumber: 1 
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
      jerseyNumber: editingPlayer.jerseyNumber
    });
    setIsEditOpen(false);
  };

  const handleDeletePlayer = (id: string) => {
    deleteDocumentNonBlocking(doc(db, "clubs", clubId, "players", id));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4">
        <Link href={`/dashboard/clubs/${clubId}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors w-fit">
          <ChevronLeft className="h-4 w-4" /> Volver al club
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-headline text-foreground">Base de Jugadores</h1>
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
                  <Label>Fecha de Nacimiento</Label>
                  <Input type="date" value={newPlayer.birthDate} onChange={e => setNewPlayer({...newPlayer, birthDate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Posición</Label>
                  <Input value={newPlayer.position} onChange={e => setNewPlayer({...newPlayer, position: e.target.value})} placeholder="Ej. Delantero" />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input value={newPlayer.phone} onChange={e => setNewPlayer({...newPlayer, phone: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={newPlayer.email} onChange={e => setNewPlayer({...newPlayer, email: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Dorsal Preferido</Label>
                  <Input type="number" value={newPlayer.jerseyNumber} onChange={e => setNewPlayer({...newPlayer, jerseyNumber: parseInt(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label>Foto URL</Label>
                  <Input value={newPlayer.photoUrl} onChange={e => setNewPlayer({...newPlayer, photoUrl: e.target.value})} placeholder="https://..." />
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
        <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {players?.map((player: any) => (
            <Card key={player.id} className="hover:border-primary/50 transition-colors">
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-14 w-14 border-2 border-primary/20">
                  <AvatarImage src={player.photoUrl} />
                  <AvatarFallback><User /></AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{player.firstName} {player.lastName}</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <Badge variant="secondary">#{player.jerseyNumber} {player.position}</Badge>
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {player.phone}</div>
                <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {player.email}</div>
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /> {player.birthDate}</div>
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
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/clubs/${clubId}/players/${player.id}/payments`}>
                      <CreditCard className="h-4 w-4 mr-1" /> Pagos
                    </Link>
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
          {players?.length === 0 && (
            <div className="col-span-full text-center py-20 border-2 border-dashed rounded-xl">
              <Contact2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay jugadores registrados. Empieza por añadir uno.</p>
            </div>
          )}
        </div>
      )}

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Jugador</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={editingPlayer?.firstName || ""} onChange={e => setEditingPlayer({...editingPlayer, firstName: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Apellido</Label>
              <Input value={editingPlayer?.lastName || ""} onChange={e => setEditingPlayer({...editingPlayer, lastName: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Fecha de Nacimiento</Label>
              <Input type="date" value={editingPlayer?.birthDate || ""} onChange={e => setEditingPlayer({...editingPlayer, birthDate: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Posición</Label>
              <Input value={editingPlayer?.position || ""} onChange={e => setEditingPlayer({...editingPlayer, position: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input value={editingPlayer?.phone || ""} onChange={e => setEditingPlayer({...editingPlayer, phone: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={editingPlayer?.email || ""} onChange={e => setEditingPlayer({...editingPlayer, email: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Dorsal</Label>
              <Input type="number" value={editingPlayer?.jerseyNumber || 1} onChange={e => setEditingPlayer({...editingPlayer, jerseyNumber: parseInt(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <Label>Foto URL</Label>
              <Input value={editingPlayer?.photoUrl || ""} onChange={e => setEditingPlayer({...editingPlayer, photoUrl: e.target.value})} />
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
