
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
  X,
  Trophy,
  FileText,
  Shield,
  CalendarDays,
  Activity,
  TrendingUp,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { collection, doc, setDoc } from "firebase/firestore";
import { useFirestore, useCollection, useDoc, useMemoFirebase, useFirebase, createUserWithSecondaryApp } from "@/firebase";
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
import { useClubPageNav } from "@/hooks/use-club-page-nav";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
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

function PlayerFormFields({ values, onChange, divisions }: {
  values: Record<string, any>;
  onChange: (updated: Record<string, any>) => void;
  divisions: any[];
}) {
  const set = (field: string, val: any) => onChange({ ...values, [field]: val });
  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b pb-2">
          <UserRound className="h-5 w-5 text-primary" />
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">1. Identidad Personal</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="font-bold text-slate-700">Nombre</Label>
            <Input value={values.firstName || ""} onChange={e => set("firstName", e.target.value)} placeholder="Ej. Mateo" className="h-12 border-2" />
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-slate-700">Apellido</Label>
            <Input value={values.lastName || ""} onChange={e => set("lastName", e.target.value)} placeholder="Ej. González" className="h-12 border-2" />
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-slate-700">DNI / Documento</Label>
            <Input value={values.dni || ""} onChange={e => set("dni", e.target.value)} placeholder="Número sin puntos" className="h-12 border-2" />
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-slate-700">Fecha de Nacimiento</Label>
            <Input type="date" value={values.birthDate || ""} onChange={e => set("birthDate", e.target.value)} className="h-12 border-2" />
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
            <Select value={values.divisionId || ""} onValueChange={v => set("divisionId", v)}>
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
            <Input type="email" value={values.email || ""} onChange={e => set("email", e.target.value)} placeholder="mateo@ejemplo.com" className="h-12 border-2" />
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-slate-700">Teléfono Celular</Label>
            <Input value={values.phone || ""} onChange={e => set("phone", e.target.value)} placeholder="+54..." className="h-12 border-2" />
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-slate-700">Dirección Particular</Label>
            <Input value={values.address || ""} onChange={e => set("address", e.target.value)} placeholder="Calle, Nro, Localidad" className="h-12 border-2" />
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
            <Input type="number" value={values.weight || ""} onChange={e => set("weight", e.target.value)} className="h-12 border-2" />
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-slate-700 flex items-center gap-1"><Ruler className="h-3 w-3" /> Altura (cm)</Label>
            <Input type="number" value={values.height || ""} onChange={e => set("height", e.target.value)} className="h-12 border-2" />
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-slate-700">Grupo Sanguíneo</Label>
            <Select value={values.bloodType || ""} onValueChange={v => set("bloodType", v)}>
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
            <Input value={values.emergencyContact || ""} onChange={e => set("emergencyContact", e.target.value)} placeholder="Nombre del familiar" className="bg-white border-2" />
          </div>
          <div className="space-y-2">
            <Label className="font-black text-orange-800 uppercase text-[10px]">Teléfono Emergencia</Label>
            <Input value={values.emergencyPhone || ""} onChange={e => set("emergencyPhone", e.target.value)} placeholder="Número 24hs" className="bg-white border-2" />
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
              <span className="font-black text-slate-900">{values.sport === 'rugby' ? '🏉 RUGBY' : '🏑 HOCKEY'}</span>
              <Switch 
                checked={values.sport === 'rugby'} 
                onCheckedChange={(v) => set("sport", v ? 'rugby' : 'hockey')} 
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-slate-700">Dorsal / Camiseta</Label>
            <Input type="number" value={values.jerseyNumber || ""} onChange={e => set("jerseyNumber", e.target.value)} placeholder="N°" className="h-12 border-2" />
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-slate-700">Posición Preferida</Label>
            <Input value={values.position || ""} onChange={e => set("position", e.target.value)} placeholder="Ej. Delantera, Volante..." className="h-12 border-2" />
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-slate-700">URL Foto (Opcional)</Label>
            <Input value={values.photoUrl || ""} onChange={e => set("photoUrl", e.target.value)} placeholder="https://..." className="h-12 border-2" />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b pb-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">5. Historial Deportivo</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label className="font-bold text-slate-700 flex items-center gap-1"><Clock className="h-3 w-3" /> Fecha de ingreso al club</Label>
            <Input type="date" value={values.joinedDate || ""} onChange={e => set("joinedDate", e.target.value)} className="h-12 border-2" />
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-slate-700 flex items-center gap-1"><Trophy className="h-3 w-3" /> Partidos jugados</Label>
            <Input type="number" min="0" value={values.matchesPlayed || ""} onChange={e => set("matchesPlayed", e.target.value)} placeholder="0" className="h-12 border-2" />
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-slate-700 flex items-center gap-1"><Activity className="h-3 w-3" /> % Asistencia promedio</Label>
            <Input type="number" min="0" max="100" value={values.attendanceAvg || ""} onChange={e => set("attendanceAvg", e.target.value)} placeholder="0 – 100" className="h-12 border-2" />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="font-bold text-slate-700 flex items-center gap-1"><FileText className="h-3 w-3" /> Notas internas</Label>
          <Input value={values.notes || ""} onChange={e => set("notes", e.target.value)} placeholder="Observaciones del cuerpo técnico..." className="h-12 border-2" />
        </div>
        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100">
          <div>
            <Label className="font-black text-xs uppercase text-blue-800">Estacionamiento incluido en cuota</Label>
            <p className="text-[10px] text-blue-600 font-bold">La cuota mensual incluye el pago del estacionamiento</p>
          </div>
          <Switch checked={values.parkingIncluded ?? false} onCheckedChange={v => set("parkingIncluded", v)} />
        </div>
      </div>
    </>
  );
}

function formatTimeInClub(dateStr?: string): string {
  if (!dateStr) return "–";
  const joined = new Date(dateStr);
  if (isNaN(joined.getTime())) return "–";
  const now = new Date();
  const months = (now.getFullYear() - joined.getFullYear()) * 12 + (now.getMonth() - joined.getMonth());
  if (months < 1) return "Reciente";
  if (months < 12) return `${months} mes${months > 1 ? 'es' : ''}`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (rem === 0) return `${years} año${years > 1 ? 's' : ''}`;
  return `${years}a ${rem}m`;
}

export default function PlayersPage() {
  const { clubId } = useParams() as { clubId: string };
  const db = useFirestore();
  const { user: currentUser } = useFirebase();
  const { toast } = useToast();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<any>(null);
  const [editAlsoStaff, setEditAlsoStaff] = useState(false);
  const [editStaffRole, setEditStaffRole] = useState("coach_lvl2");
  const [editStaffSpecialty, setEditStaffSpecialty] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const clubRef = useMemoFirebase(() => doc(db, "clubs", clubId), [db, clubId]);
  const { data: club } = useDoc(clubRef);

  const currentUserRef = useMemoFirebase(() => currentUser ? doc(db, "users", currentUser.uid) : null, [db, currentUser]);
  const { data: currentUserProfile } = useDoc(currentUserRef);

  const playersQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "players"), [db, clubId]);
  const { data: players, isLoading } = useCollection(playersQuery);

  const divisionsQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "divisions"), [db, clubId]);
  const { data: divisions } = useCollection(divisionsQuery);

  const activeNav = useClubPageNav(clubId);



  const handleUpdatePlayer = async () => {
    if (!editingPlayer) return;
    const roles = editAlsoStaff ? [editStaffRole, "player"].filter((v, i, a) => a.indexOf(v) === i) : ["player"];
    const playerDoc = doc(db, "clubs", clubId, "players", editingPlayer.id);
    const { password: _pw, enableLogin: _el, ...editDataClean } = editingPlayer;
    updateDocumentNonBlocking(playerDoc, { ...editDataClean, clubId: clubId, role: "player", roles: roles });
    
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
      role: "player",
      roles: roles,
    }, { merge: true });

    // Si también es staff, crear/actualizar documento en users
    if (editAlsoStaff) {
      const fullName = `${editingPlayer.firstName || ''} ${editingPlayer.lastName || ''}`.trim();
      setDocumentNonBlocking(doc(db, "users", editingPlayer.id), {
        firstName: editingPlayer.firstName || "",
        lastName: editingPlayer.lastName || "",
        name: fullName,
        email: (editingPlayer.email || "").toLowerCase().trim(),
        phone: editingPlayer.phone || "",
        dni: editingPlayer.dni || "",
        birthDate: editingPlayer.birthDate || "",
        photoUrl: editingPlayer.photoUrl || "",
        sport: editingPlayer.sport || "hockey",
        role: editStaffRole,
        roles: roles,
        specialty: editStaffSpecialty,
        id: editingPlayer.id,
        uid: editingPlayer.id,
        clubId: clubId,
      }, { merge: true });
    }

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
      <SectionNav items={activeNav} basePath={`/dashboard/clubs/${clubId}`} />
      
      <div className="flex-1 space-y-8 pb-20 px-4 md:px-0">
        <header className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black font-headline text-white drop-shadow-md">Legajos Deportivos</h1>
              <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] mt-1">{club?.name} • Padrón oficial de jugadores.</p>
            </div>
            <Button asChild className="flex items-center gap-2 shadow-lg h-12 px-6 font-black uppercase text-xs tracking-widest bg-white text-primary hover:bg-slate-50">
              <Link href={`/dashboard/clubs/${clubId}/players/new`}>
                <UserPlus className="h-5 w-5" /> Alta de Jugador
              </Link>
            </Button>
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
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[8px] font-black uppercase border-primary text-primary px-2 h-4">
                          {player.sport === 'rugby' ? '🏉 RUGBY' : '🏑 HOCKEY'}
                        </Badge>
                        <Badge variant="secondary" className="text-[8px] font-black uppercase px-2 h-4">
                          {playerDiv?.name || "Sin Categoría"}
                        </Badge>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">DNI: {player.dni}</span>
                      </div>
                      {/* Stats chips */}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          <Clock className="h-3 w-3 text-primary" />
                          {formatTimeInClub(player.joinedDate || player.createdAt)} en el club
                        </span>
                        {player.matchesPlayed ? (
                          <span className="flex items-center gap-1 text-[9px] font-black text-amber-500 uppercase tracking-widest">
                            <Trophy className="h-3 w-3" />
                            {player.matchesPlayed} partidos
                          </span>
                        ) : null}
                        {player.attendanceAvg ? (
                          <span className="flex items-center gap-1 text-[9px] font-black text-green-500 uppercase tracking-widest">
                            <Activity className="h-3 w-3" />
                            {player.attendanceAvg}% asistencia
                          </span>
                        ) : null}
                        {player.notes ? (
                          <span className="flex items-center gap-1 text-[9px] font-black text-slate-300 uppercase tracking-widest max-w-[160px] truncate">
                            <FileText className="h-3 w-3 shrink-0" />
                            {player.notes}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    <div className="hidden lg:flex flex-col items-end mr-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Posición</span>
                      <span className="text-xs font-bold text-slate-700">{player.position || "Sin definir"}</span>
                    </div>
                    
                    <Button variant="ghost" size="sm" className="h-11 w-11 p-0 text-slate-400 hover:text-primary rounded-xl" onClick={() => { setEditingPlayer(player); const hasStaff = player.roles?.some((r: string) => r !== "player") || false; setEditAlsoStaff(hasStaff); setEditStaffRole(player.roles?.find((r: string) => r !== "player") || "coach_lvl2"); setEditStaffSpecialty(""); setIsEditOpen(true); }}>
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
        <DialogContent className="max-w-4xl bg-white border-none shadow-2xl rounded-[2.5rem] p-0 overflow-hidden max-h-[92dvh] flex flex-col">
          <DialogHeader className="bg-slate-50 p-8 border-b flex flex-row items-center justify-between shrink-0">
            <div>
              <DialogTitle className="text-2xl font-black text-slate-900">Editar Legajo: {editingPlayer?.firstName} {editingPlayer?.lastName}</DialogTitle>
              <DialogDescription className="font-bold text-slate-500">Actualiza la información federativa del deportista.</DialogDescription>
            </div>
            <Avatar className="h-16 w-16 border-4 border-white shadow-xl rounded-2xl hidden md:flex">
              <AvatarImage src={editingPlayer?.photoUrl} className="object-cover" />
              <AvatarFallback className="bg-primary/5 text-primary font-black">P</AvatarFallback>
            </Avatar>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-8 space-y-10">
              <PlayerFormFields values={editingPlayer || {}} onChange={(v) => setEditingPlayer(v)} divisions={divisions || []} />

              {/* Multi-Rol: También es Staff */}
              <div className="space-y-6 bg-orange-50 p-6 rounded-2xl border border-orange-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-orange-800 flex items-center gap-2">
                      <Layers className="h-4 w-4" /> También es Staff Técnico
                    </h3>
                    <p className="text-[10px] text-orange-600 font-bold">Esta persona también tiene un rol en el cuerpo técnico o administrativo.</p>
                  </div>
                  <Switch checked={editAlsoStaff} onCheckedChange={v => setEditAlsoStaff(v)} />
                </div>
                {editAlsoStaff && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                    <div className="space-y-2">
                      <Label className="font-bold text-orange-800 text-xs">Rol en el Club</Label>
                      <Select value={editStaffRole} onValueChange={v => setEditStaffRole(v)}>
                        <SelectTrigger className="h-10 border-2 bg-white font-bold text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="coach_lvl1" className="font-bold">Entrenador Nivel 1 (Jefe de Rama)</SelectItem>
                          <SelectItem value="coach_lvl2" className="font-bold">Entrenador Nivel 2 (Plantel)</SelectItem>
                          <SelectItem value="coordinator" className="font-bold">Coordinador de Rama</SelectItem>
                          <SelectItem value="club_admin" className="font-bold">Administrador del Club</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-orange-800 text-xs">Especialidad / Cargo</Label>
                      <Input value={editStaffSpecialty} onChange={e => setEditStaffSpecialty(e.target.value)} placeholder="Ej. Preparador Físico, DT…" className="h-10 border-2 bg-white font-bold text-xs" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="bg-slate-50 p-8 border-t flex flex-col sm:flex-row justify-between gap-4 shrink-0">
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
