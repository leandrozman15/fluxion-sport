
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
  Home
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function PlayersPage() {
  const { clubId } = useParams() as { clubId: string };
  const db = useFirestore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
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
    position: "",
    jerseyNumber: 1,
    photoUrl: "",
    parkingActive: false
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

  const handleCreatePlayer = () => {
    const playerId = doc(collection(db, "clubs", clubId, "players")).id;
    const playerDoc = doc(db, "clubs", clubId, "players", playerId);
    
    setDoc(playerDoc, {
      ...newPlayer,
      id: playerId,
      clubId,
      createdAt: new Date().toISOString()
    });
    
    setNewPlayer(initialForm);
    setIsDialogOpen(false);
  };

  const handleUpdatePlayer = () => {
    if (!editingPlayer) return;
    const playerDoc = doc(db, "clubs", clubId, "players", editingPlayer.id);
    updateDocumentNonBlocking(playerDoc, { ...editingPlayer });
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
              <h1 className="text-3xl font-bold font-headline text-foreground">Legajos de Jugadores: {club?.name}</h1>
              <p className="text-muted-foreground">Padrón biométrico y médico centralizado.</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2 shadow-lg">
                  <Plus className="h-4 w-4" /> Alta de Jugador
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>Nueva Ficha Deportiva</DialogTitle>
                  <DialogDescription>Completa todos los campos para el legajo oficial.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[65vh] pr-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    {/* Sección Identidad */}
                    <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Identidad y Contacto</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nombre</Label>
                          <Input value={newPlayer.firstName} onChange={e => setNewPlayer({...newPlayer, firstName: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Apellido</Label>
                          <Input value={newPlayer.lastName} onChange={e => setNewPlayer({...newPlayer, lastName: e.target.value})} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>DNI / Pasaporte</Label>
                        <Input value={newPlayer.dni} onChange={e => setNewPlayer({...newPlayer, dni: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Email Oficial</Label>
                        <Input type="email" value={newPlayer.email} onChange={e => setNewPlayer({...newPlayer, email: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Teléfono</Label>
                        <Input value={newPlayer.phone} onChange={e => setNewPlayer({...newPlayer, phone: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Dirección Particular</Label>
                        <Input value={newPlayer.address} onChange={e => setNewPlayer({...newPlayer, address: e.target.value})} placeholder="Calle, Nro, Localidad" />
                      </div>
                    </div>

                    {/* Sección Deportiva y Médica */}
                    <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Ficha Médica y Técnica</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Fecha Nac.</Label>
                          <Input type="date" value={newPlayer.birthDate} onChange={e => setNewPlayer({...newPlayer, birthDate: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Grupo Sanguíneo</Label>
                          <Select value={newPlayer.bloodType} onValueChange={v => setNewPlayer({...newPlayer, bloodType: v})}>
                            <SelectTrigger><SelectValue placeholder="---" /></SelectTrigger>
                            <SelectContent>
                              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(t => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1"><Scale className="h-3 w-3" /> Peso (kg)</Label>
                          <Input type="number" value={newPlayer.weight} onChange={e => setNewPlayer({...newPlayer, weight: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1"><Ruler className="h-3 w-3" /> Altura (cm)</Label>
                          <Input type="number" value={newPlayer.height} onChange={e => setNewPlayer({...newPlayer, height: e.target.value})} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Posición en Campo</Label>
                        <Input value={newPlayer.position} onChange={e => setNewPlayer({...newPlayer, position: e.target.value})} />
                      </div>
                      <div className="space-y-4 border-t pt-4">
                        <Label className="text-[10px] font-black uppercase text-orange-600">Emergencias</Label>
                        <div className="space-y-2">
                          <Label>Contacto Responsable</Label>
                          <Input value={newPlayer.emergencyContact} onChange={e => setNewPlayer({...newPlayer, emergencyContact: e.target.value})} placeholder="Nombre y Apellido" />
                        </div>
                        <div className="space-y-2">
                          <Label>Teléfono de Urgencia</Label>
                          <Input value={newPlayer.emergencyPhone} onChange={e => setNewPlayer({...newPlayer, emergencyPhone: e.target.value})} />
                        </div>
                      </div>
                    </div>

                    <div className="col-span-2 p-4 bg-primary/5 rounded-xl border flex items-center justify-between mt-2">
                      <div className="flex items-center gap-3">
                        <Car className="h-5 w-5 text-primary" />
                        <div>
                          <Label className="font-bold">Acceso Vehicular</Label>
                          <p className="text-[10px] text-muted-foreground">Habilitar estacionamiento en el predio</p>
                        </div>
                      </div>
                      <Switch 
                        checked={newPlayer.parkingActive} 
                        onCheckedChange={(v) => setNewPlayer({...newPlayer, parkingActive: v})} 
                      />
                    </div>
                  </div>
                </ScrollArea>
                <DialogFooter className="border-t pt-4 mt-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreatePlayer} disabled={!newPlayer.firstName || !newPlayer.lastName || !newPlayer.dni}>Confirmar Alta</Button>
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
              <Card key={player.id} className="hover:border-primary/50 transition-all group relative overflow-hidden flex flex-col">
                <CardHeader className="flex flex-row items-center gap-4 pb-4">
                  <Avatar className="h-16 w-16 border-2 border-primary/10 shadow-sm">
                    <AvatarImage src={player.photoUrl} className="object-cover" />
                    <AvatarFallback><User /></AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{player.firstName} {player.lastName}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[9px] font-black uppercase">#{player.jerseyNumber || '-'} {player.position || 'SIN POSICIÓN'}</Badge>
                      {player.bloodType && <Badge variant="outline" className="text-[9px] border-red-200 text-red-600">{player.bloodType}</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-[11px] flex-1">
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground border-b pb-2">
                    <div className="flex items-center gap-2"><Dna className="h-3.5 w-3.5" /> DNI: {player.dni || '-'}</div>
                    <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> {player.birthDate || '-'}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground border-b pb-2">
                    <div className="flex items-center gap-2"><Scale className="h-3.5 w-3.5" /> {player.weight ? `${player.weight} kg` : '-'}</div>
                    <div className="flex items-center gap-2"><Ruler className="h-3.5 w-3.5" /> {player.height ? `${player.height} cm` : '-'}</div>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground"><Home className="h-3.5 w-3.5 shrink-0" /> {player.address || 'Sin dirección'}</div>
                  <div className="p-2 bg-orange-50 rounded-lg flex items-center justify-between border border-orange-100">
                    <div className="flex items-center gap-2 text-orange-700 font-bold"><AlertCircle className="h-3.5 w-3.5" /> SOS: {player.emergencyContact || 'N/A'}</div>
                    <span className="text-orange-600">{player.emergencyPhone || '-'}</span>
                  </div>
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
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild className="h-8 text-[10px] font-bold">
                      <Link href={`/dashboard/clubs/${clubId}/players/${player.id}/payments`}>
                        <CreditCard className="h-3.5 w-3.5 mr-1" /> CUOTAS
                      </Link>
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal de edición */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Editar Legajo Deportivo</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase text-primary">Identidad</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Input value={editingPlayer?.firstName || ""} onChange={e => setEditingPlayer({...editingPlayer, firstName: e.target.value})} placeholder="Nombre" />
                  <Input value={editingPlayer?.lastName || ""} onChange={e => setEditingPlayer({...editingPlayer, lastName: e.target.value})} placeholder="Apellido" />
                </div>
                <Input value={editingPlayer?.dni || ""} onChange={e => setEditingPlayer({...editingPlayer, dni: e.target.value})} placeholder="DNI" />
                <Input value={editingPlayer?.email || ""} onChange={e => setEditingPlayer({...editingPlayer, email: e.target.value})} placeholder="Email" />
                <Input value={editingPlayer?.address || ""} onChange={e => setEditingPlayer({...editingPlayer, address: e.target.value})} placeholder="Dirección" />
              </div>
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase text-primary">Ficha Técnica</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Input type="date" value={editingPlayer?.birthDate || ""} onChange={e => setEditingPlayer({...editingPlayer, birthDate: e.target.value})} />
                  <Select value={editingPlayer?.bloodType || ""} onValueChange={v => setEditingPlayer({...editingPlayer, bloodType: v})}>
                    <SelectTrigger><SelectValue placeholder="Sangre" /></SelectTrigger>
                    <SelectContent>
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input type="number" value={editingPlayer?.weight || ""} onChange={e => setEditingPlayer({...editingPlayer, weight: e.target.value})} placeholder="Peso (kg)" />
                  <Input type="number" value={editingPlayer?.height || ""} onChange={e => setEditingPlayer({...editingPlayer, height: e.target.value})} placeholder="Altura (cm)" />
                </div>
                <Input value={editingPlayer?.position || ""} onChange={e => setEditingPlayer({...editingPlayer, position: e.target.value})} placeholder="Posición" />
              </div>
              <div className="col-span-2 p-4 bg-muted/30 rounded-xl border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Car className="h-5 w-5 text-primary" />
                  <Label className="font-bold">Plan Estacionamiento</Label>
                </div>
                <Switch 
                  checked={editingPlayer?.parkingActive || false} 
                  onCheckedChange={(v) => setEditingPlayer({...editingPlayer, parkingActive: v})} 
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdatePlayer}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
