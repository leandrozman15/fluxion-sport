"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2,
  ArrowLeft,
  UserRound,
  Layers,
  ShieldCheck,
  Stethoscope,
  Phone,
  UserPlus,
} from "lucide-react";
import { collection, doc, setDoc } from "firebase/firestore";
import { useFirestore, useDoc, useCollection, useMemoFirebase, useFirebase, createUserWithSecondaryApp } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function NewStaffPage() {
  const { clubId } = useParams() as { clubId: string };
  const router = useRouter();
  const db = useFirestore();
  const { user: currentUser } = useFirebase();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const initialForm = {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dni: "",
    birthDate: "",
    address: "",
    password: "",
    role: "coach_lvl2",
    specialty: "",
    license: "",
    photoUrl: "",
    bloodType: "",
    emergencyContact: "",
    emergencyPhone: "",
    sport: "hockey",
    parkingIncluded: false,
  };

  const [form, setForm] = useState(initialForm);
  const set = (field: string, val: any) => setForm(prev => ({ ...prev, [field]: val }));

  const [alsoPlayer, setAlsoPlayer] = useState(false);
  const [playerDivisionId, setPlayerDivisionId] = useState("");
  const [playerPosition, setPlayerPosition] = useState("");
  const [playerJerseyNumber, setPlayerJerseyNumber] = useState("");

  const clubRef = useMemoFirebase(() => doc(db, "clubs", clubId), [db, clubId]);
  const { data: club } = useDoc(clubRef);

  const divisionsQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "divisions"), [db, clubId]);
  const { data: divisions } = useCollection(divisionsQuery);

  const handleCreate = async () => {
    if (!form.email || !form.password || !form.firstName || !form.lastName || !form.dni) {
      toast({ variant: "destructive", title: "Datos faltantes", description: "Nombre, Apellido, Email, Clave y DNI son obligatorios." });
      return;
    }

    setLoading(true);
    try {
      const normalizedEmail = form.email.toLowerCase().trim();

      const newUid = await createUserWithSecondaryApp(normalizedEmail, form.password);

      const fullName = `${form.firstName} ${form.lastName}`.trim();
      const { password: _pw, ...dataWithoutPassword } = form;
      const roles = alsoPlayer ? [form.role, "player"] : [form.role];
      await setDoc(doc(db, "users", newUid), {
        ...dataWithoutPassword,
        name: fullName,
        email: normalizedEmail,
        id: newUid,
        uid: newUid,
        clubId: clubId,
        roles: roles,
        requiresPasswordChange: true,
        createdAt: new Date().toISOString(),
      });

      // Si también es jugador/a, crear documentos de jugador
      if (alsoPlayer) {
        const playerData = {
          firstName: form.firstName,
          lastName: form.lastName,
          email: normalizedEmail,
          phone: form.phone,
          dni: form.dni,
          birthDate: form.birthDate,
          address: form.address,
          photoUrl: form.photoUrl,
          bloodType: form.bloodType,
          emergencyContact: form.emergencyContact,
          emergencyPhone: form.emergencyPhone,
          sport: form.sport,
          parkingIncluded: form.parkingIncluded,
          divisionId: playerDivisionId,
          position: playerPosition,
          jerseyNumber: playerJerseyNumber,
          id: newUid,
          clubId: clubId,
          role: "player",
          roles: roles,
          createdAt: new Date().toISOString(),
        };
        await setDoc(doc(db, "clubs", clubId, "players", newUid), playerData);
        await setDoc(doc(db, "all_players_index", newUid), {
          id: newUid,
          firstName: form.firstName,
          lastName: form.lastName,
          email: normalizedEmail,
          clubId: clubId,
          divisionId: playerDivisionId,
          clubName: club?.name || "Club",
          sport: form.sport,
          role: "player",
          roles: roles,
          createdAt: new Date().toISOString(),
        });
      }

      toast({
        title: "Miembro Registrado",
        description: `Cuenta creada para ${form.firstName} ${form.lastName}. Ya puede ingresar a la plataforma.`,
      });

      router.push(`/dashboard/clubs/${clubId}/coaches`);
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error al registrar",
        description: error.code === "auth/email-already-in-use" ? "Ese email ya tiene una cuenta registrada." : "Verifica los datos e intenta nuevamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center animate-in fade-in duration-500 px-2 md:px-4 py-4 md:py-8">
      {/* Header */}
      <div className="w-full max-w-4xl mx-auto mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push(`/dashboard/clubs/${clubId}/coaches`)}
          className="text-white hover:bg-white/10 font-black uppercase text-[10px] tracking-widest gap-2 h-10 rounded-xl"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al Staff
        </Button>
      </div>

      <Card className="w-full max-w-4xl bg-white border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
        {/* Title band */}
        <div className="bg-primary p-8 text-primary-foreground">
          <h1 className="text-2xl font-black flex items-center gap-2">
            <UserPlus className="h-7 w-7" /> Nueva Ficha de Personal
          </h1>
          <p className="text-primary-foreground/80 font-bold mt-1">
            Completa el legajo oficial del staff técnico o administrativo. {club?.name && `• ${club.name}`}
          </p>
        </div>

        <CardContent className="p-8 space-y-10">
          {/* 1. Identidad Personal */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b pb-2">
              <UserRound className="h-5 w-5 text-primary" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">1. Identidad Personal</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Nombre</Label>
                <Input value={form.firstName} onChange={e => set("firstName", e.target.value)} placeholder="Ej. Camila" className="h-12 border-2" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Apellido</Label>
                <Input value={form.lastName} onChange={e => set("lastName", e.target.value)} placeholder="Ej. Rodríguez" className="h-12 border-2" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">DNI / Documento</Label>
                <Input value={form.dni} onChange={e => set("dni", e.target.value)} placeholder="Sin puntos" className="h-12 border-2 font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Fecha de Nacimiento</Label>
                <Input type="date" value={form.birthDate} onChange={e => set("birthDate", e.target.value)} className="h-12 border-2" />
              </div>
              <div className="col-span-full space-y-2">
                <Label className="font-bold text-slate-700">URL Foto de Perfil (Opcional)</Label>
                <Input value={form.photoUrl} onChange={e => set("photoUrl", e.target.value)} placeholder="https://..." className="h-12 border-2" />
              </div>
            </div>
          </div>

          {/* 2. Rol Institucional */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b pb-2">
              <Layers className="h-5 w-5 text-primary" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">2. Rol Institucional</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold text-slate-700">Disciplina</Label>
                  <p className="text-[10px] text-primary font-black uppercase tracking-widest">{form.sport === "rugby" ? "🏉 Rugby" : "🏑 Hockey"}</p>
                </div>
                <Switch checked={form.sport === "rugby"} onCheckedChange={v => set("sport", v ? "rugby" : "hockey")} />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Rol en el Club</Label>
                <Select value={form.role} onValueChange={v => set("role", v)}>
                  <SelectTrigger className="h-12 border-2 font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coach_lvl1" className="font-bold">Entrenador Nivel 1 (Jefe de Rama)</SelectItem>
                    <SelectItem value="coach_lvl2" className="font-bold">Entrenador Nivel 2 (Plantel)</SelectItem>
                    <SelectItem value="coordinator" className="font-bold">Coordinador de Rama</SelectItem>
                    <SelectItem value="club_admin" className="font-bold">Administrador del Club</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Especialidad / Cargo</Label>
                <Input value={form.specialty} onChange={e => set("specialty", e.target.value)} placeholder="Ej. Preparador Físico, DT…" className="h-12 border-2 font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">N° Licencia / Matrícula</Label>
                <Input value={form.license} onChange={e => set("license", e.target.value)} placeholder="Ej. FHR-00412" className="h-12 border-2" />
              </div>
            </div>
          </div>

          {/* 3. Acceso App */}
          <div className="space-y-6 bg-slate-50 -mx-8 p-8 border-y">
            <div className="flex items-center gap-3 border-b pb-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-primary">3. Acceso App Fluxion</h3>
                <p className="text-[10px] text-slate-500 font-bold mt-0.5">Credenciales para ingresar a la plataforma.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Email (Usuario de Acceso)</Label>
                <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="usuario@club.com" className="h-12 border-2 bg-white" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Clave Temporal</Label>
                <Input type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="Mínimo 6 caracteres" className="h-12 border-2 bg-white" />
              </div>
            </div>
          </div>

          {/* 4. Contacto */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b pb-2">
              <Phone className="h-5 w-5 text-primary" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">4. Datos de Contacto</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Teléfono Personal</Label>
                <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+54 9 11..." className="h-12 border-2" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Dirección Particular</Label>
                <Input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Calle, Nro, Localidad" className="h-12 border-2" />
              </div>
            </div>
          </div>

          {/* 5. Salud */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b pb-2">
              <Stethoscope className="h-5 w-5 text-primary" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">5. Datos de Salud</h3>
            </div>
            <div className="space-y-2 mb-6">
              <Label className="font-bold text-slate-700">Grupo Sanguíneo</Label>
              <Select value={form.bloodType} onValueChange={v => set("bloodType", v)}>
                <SelectTrigger className="h-12 border-2"><SelectValue placeholder="Elegir tipo..." /></SelectTrigger>
                <SelectContent>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(t => <SelectItem key={t} value={t} className="font-bold">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-orange-50 p-6 rounded-2xl border border-orange-100">
              <div className="space-y-2">
                <Label className="font-black text-orange-800 uppercase text-[10px]">Contacto de Emergencia</Label>
                <Input value={form.emergencyContact} onChange={e => set("emergencyContact", e.target.value)} placeholder="Nombre del familiar" className="bg-white border-2" />
              </div>
              <div className="space-y-2">
                <Label className="font-black text-orange-800 uppercase text-[10px]">Teléfono Emergencia</Label>
                <Input value={form.emergencyPhone} onChange={e => set("emergencyPhone", e.target.value)} placeholder="Número 24hs" className="bg-white border-2" />
              </div>
            </div>
          </div>

          {/* Parking */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div>
              <Label className="font-black text-xs uppercase text-blue-800">Estacionamiento incluido en cuota</Label>
              <p className="text-[10px] text-blue-600 font-bold">La cuota mensual incluye el pago del estacionamiento</p>
            </div>
            <Switch checked={form.parkingIncluded} onCheckedChange={v => set("parkingIncluded", v)} />
          </div>

          {/* Multi-Rol: También es Jugador/a */}
          <div className="space-y-6 bg-green-50 -mx-8 p-8 border-y border-green-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-green-800 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" /> También es Jugador/a
                </h3>
                <p className="text-xs text-green-600 font-bold">Esta persona también juega en una categoría del club.</p>
              </div>
              <Switch checked={alsoPlayer} onCheckedChange={v => setAlsoPlayer(v)} />
            </div>
            {alsoPlayer && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-2">
                <div className="space-y-2">
                  <Label className="font-bold text-green-800">Categoría / Rama</Label>
                  <Select value={playerDivisionId} onValueChange={v => setPlayerDivisionId(v)}>
                    <SelectTrigger className="h-12 border-2 bg-white font-bold"><SelectValue placeholder="Asignar Categoría..." /></SelectTrigger>
                    <SelectContent>
                      {divisions?.map((d: any) => (
                        <SelectItem key={d.id} value={d.id} className="font-bold">{d.name} ({d.sport?.toUpperCase()})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-green-800">Posición</Label>
                  <Input value={playerPosition} onChange={e => setPlayerPosition(e.target.value)} placeholder="Ej. Delantera..." className="h-12 border-2 bg-white" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-green-800">Dorsal / Camiseta</Label>
                  <Input type="number" value={playerJerseyNumber} onChange={e => setPlayerJerseyNumber(e.target.value)} placeholder="N°" className="h-12 border-2 bg-white" />
                </div>
              </div>
            )}
          </div>
        </CardContent>

        {/* Footer */}
        <div className="bg-slate-50 p-8 border-t flex flex-col sm:flex-row gap-4">
          <Button variant="ghost" onClick={() => router.push(`/dashboard/clubs/${clubId}/coaches`)} className="font-bold text-slate-500 h-14">
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={loading || !form.firstName || !form.lastName || !form.email || form.password.length < 6 || !form.dni}
            className="flex-1 font-black uppercase text-xs tracking-widest h-14 shadow-xl shadow-primary/20 gap-2"
          >
            {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <><ShieldCheck className="h-5 w-5" /> Dar de Alta al Staff</>}
          </Button>
        </div>
      </Card>
    </div>
  );
}
