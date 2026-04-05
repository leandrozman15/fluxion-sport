"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2,
  ArrowLeft,
  Mail,
  UserRound,
  ShieldCheck,
  Stethoscope,
  Layers,
  Scale,
  Ruler,
  Clock,
  Trophy,
  Activity,
  FileText,
  TrendingUp,
} from "lucide-react";
import { collection, doc, setDoc } from "firebase/firestore";
import { useFirestore, useCollection, useDoc, useMemoFirebase, useFirebase, createUserWithSecondaryApp } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function NewPlayerPage() {
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
    sport: "hockey",
    joinedDate: "",
    matchesPlayed: "",
    attendanceAvg: "",
    notes: "",
    parkingIncluded: false,
  };

  const [form, setForm] = useState(initialForm);
  const set = (field: string, val: any) => setForm(prev => ({ ...prev, [field]: val }));

  const [alsoStaff, setAlsoStaff] = useState(false);
  const [staffRole, setStaffRole] = useState("coach_lvl2");
  const [staffSpecialty, setStaffSpecialty] = useState("");

  const clubRef = useMemoFirebase(() => doc(db, "clubs", clubId), [db, clubId]);
  const { data: club } = useDoc(clubRef);

  const divisionsQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "divisions"), [db, clubId]);
  const { data: divisions } = useCollection(divisionsQuery);

  // Si se activa "también es staff", forzar login habilitado
  useEffect(() => {
    if (alsoStaff && !form.enableLogin) {
      set("enableLogin", true);
    }
  }, [alsoStaff]);

  const handleCreate = async () => {
    if (!form.firstName || !form.lastName || !form.dni) {
      toast({ variant: "destructive", title: "Faltan datos", description: "Nombre, apellido y DNI son obligatorios." });
      return;
    }
    if (alsoStaff && (!form.email || !form.password || form.password.length < 6)) {
      toast({ variant: "destructive", title: "Faltan datos", description: "Para rol de staff se necesita email y clave (min 6 caracteres)." });
      return;
    }

    setLoading(true);
    try {
      const normalizedEmail = form.email.toLowerCase().trim();
      let playerId: string;

      if ((form.enableLogin || alsoStaff) && normalizedEmail && form.password) {
        playerId = await createUserWithSecondaryApp(normalizedEmail, form.password);
      } else {
        playerId = doc(collection(db, "clubs", clubId, "players")).id;
      }

      const roles = alsoStaff ? [staffRole, "player"] : ["player"];

      const playerDoc = doc(db, "clubs", clubId, "players", playerId);
      const { password: _pw, enableLogin: _el, ...playerDataClean } = form;
      const pData = {
        ...playerDataClean,
        id: playerId,
        email: normalizedEmail,
        clubId: clubId,
        role: "player",
        roles: roles,
        createdAt: new Date().toISOString(),
      };

      await setDoc(playerDoc, pData);

      if ((form.enableLogin || alsoStaff) && normalizedEmail) {
        await setDoc(doc(db, "all_players_index", playerId), {
          id: playerId,
          firstName: form.firstName,
          lastName: form.lastName,
          email: normalizedEmail,
          clubId: clubId,
          divisionId: form.divisionId,
          clubName: club?.name || "Club",
          sport: form.sport,
          role: "player",
          roles: roles,
          createdAt: new Date().toISOString(),
        });
      }

      // Si también es staff, crear documento en users
      if (alsoStaff) {
        const fullName = `${form.firstName} ${form.lastName}`.trim();
        await setDoc(doc(db, "users", playerId), {
          firstName: form.firstName,
          lastName: form.lastName,
          name: fullName,
          email: normalizedEmail,
          phone: form.phone,
          dni: form.dni,
          birthDate: form.birthDate,
          address: form.address,
          photoUrl: form.photoUrl || "",
          bloodType: form.bloodType,
          emergencyContact: form.emergencyContact,
          emergencyPhone: form.emergencyPhone,
          sport: form.sport,
          parkingIncluded: form.parkingIncluded,
          role: staffRole,
          roles: roles,
          specialty: staffSpecialty,
          id: playerId,
          uid: playerId,
          clubId: clubId,
          requiresPasswordChange: true,
          createdAt: new Date().toISOString(),
        });
        toast({ title: "Jugador + Staff Registrado", description: "Ficha deportiva y rol de staff creados correctamente." });
      } else if (form.enableLogin && normalizedEmail) {
        toast({ title: "Jugador Registrado", description: "Ficha y acceso al app generados correctamente." });
      } else {
        toast({ title: "Jugador Registrado", description: "Ficha oficial generada con éxito." });
      }

      router.push(`/dashboard/clubs/${clubId}/players`);
    } catch (e: any) {
      console.error(e);
      const msg =
        e.code === "auth/email-already-in-use"
          ? "Ese email ya tiene una cuenta. Edite el legajo existente."
          : "No se pudo completar el alta. Verifique los datos.";
      toast({ variant: "destructive", title: "Error al registrar", description: msg });
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
          onClick={() => router.push(`/dashboard/clubs/${clubId}/players`)}
          className="text-white hover:bg-white/10 font-black uppercase text-[10px] tracking-widest gap-2 h-10 rounded-xl"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al Padrón
        </Button>
      </div>

      <Card className="w-full max-w-4xl bg-white border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
        {/* Title band */}
        <div className="bg-primary p-8 text-primary-foreground">
          <h1 className="text-2xl font-black flex items-center gap-2">
            <ShieldCheck className="h-7 w-7" /> Nueva Ficha Deportiva Oficial
          </h1>
          <p className="text-primary-foreground/80 font-bold mt-1">
            Completa el legajo federativo del deportista. {club?.name && `• ${club.name}`}
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
                <Input value={form.firstName} onChange={e => set("firstName", e.target.value)} placeholder="Ej. Mateo" className="h-12 border-2" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Apellido</Label>
                <Input value={form.lastName} onChange={e => set("lastName", e.target.value)} placeholder="Ej. González" className="h-12 border-2" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">DNI / Documento</Label>
                <Input value={form.dni} onChange={e => set("dni", e.target.value)} placeholder="Número sin puntos" className="h-12 border-2" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Fecha de Nacimiento</Label>
                <Input type="date" value={form.birthDate} onChange={e => set("birthDate", e.target.value)} className="h-12 border-2" />
              </div>
            </div>
          </div>

          {/* 2. Categoría y Contacto */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b pb-2">
              <Mail className="h-5 w-5 text-primary" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">2. Categoría y Contacto</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Categoría / Rama</Label>
                <Select value={form.divisionId} onValueChange={v => set("divisionId", v)}>
                  <SelectTrigger className="h-12 border-2 font-bold"><SelectValue placeholder="Asignar Categoría..." /></SelectTrigger>
                  <SelectContent>
                    {divisions?.map((d: any) => (
                      <SelectItem key={d.id} value={d.id} className="font-bold">{d.name} ({d.sport?.toUpperCase()})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Email Particular</Label>
                <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="mateo@ejemplo.com" className="h-12 border-2" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Teléfono Celular</Label>
                <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+54..." className="h-12 border-2" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Dirección Particular</Label>
                <Input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Calle, Nro, Localidad" className="h-12 border-2" />
              </div>
            </div>
          </div>

          {/* 3. Ficha Biométrica y Salud */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b pb-2">
              <Stethoscope className="h-5 w-5 text-primary" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">3. Ficha Biométrica y Salud</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="font-bold text-slate-700 flex items-center gap-1"><Scale className="h-3 w-3" /> Peso (kg)</Label>
                <Input type="number" value={form.weight} onChange={e => set("weight", e.target.value)} className="h-12 border-2" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700 flex items-center gap-1"><Ruler className="h-3 w-3" /> Altura (cm)</Label>
                <Input type="number" value={form.height} onChange={e => set("height", e.target.value)} className="h-12 border-2" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Grupo Sanguíneo</Label>
                <Select value={form.bloodType} onValueChange={v => set("bloodType", v)}>
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
                <Input value={form.emergencyContact} onChange={e => set("emergencyContact", e.target.value)} placeholder="Nombre del familiar" className="bg-white border-2" />
              </div>
              <div className="space-y-2">
                <Label className="font-black text-orange-800 uppercase text-[10px]">Teléfono Emergencia</Label>
                <Input value={form.emergencyPhone} onChange={e => set("emergencyPhone", e.target.value)} placeholder="Número 24hs" className="bg-white border-2" />
              </div>
            </div>
          </div>

          {/* 4. Información Técnica */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b pb-2">
              <Layers className="h-5 w-5 text-primary" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">4. Información Técnica</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="font-black text-xs uppercase text-slate-400">Disciplina Principal</Label>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border">
                  <span className="font-black text-slate-900">{form.sport === "rugby" ? "🏉 RUGBY" : "🏑 HOCKEY"}</span>
                  <Switch checked={form.sport === "rugby"} onCheckedChange={v => set("sport", v ? "rugby" : "hockey")} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Dorsal / Camiseta</Label>
                <Input type="number" value={form.jerseyNumber} onChange={e => set("jerseyNumber", e.target.value)} placeholder="N°" className="h-12 border-2" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Posición Preferida</Label>
                <Input value={form.position} onChange={e => set("position", e.target.value)} placeholder="Ej. Delantera, Volante..." className="h-12 border-2" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">URL Foto (Opcional)</Label>
                <Input value={form.photoUrl} onChange={e => set("photoUrl", e.target.value)} placeholder="https://..." className="h-12 border-2" />
              </div>
            </div>
          </div>

          {/* 5. Historial Deportivo */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b pb-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">5. Historial Deportivo</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="font-bold text-slate-700 flex items-center gap-1"><Clock className="h-3 w-3" /> Fecha de ingreso al club</Label>
                <Input type="date" value={form.joinedDate} onChange={e => set("joinedDate", e.target.value)} className="h-12 border-2" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700 flex items-center gap-1"><Trophy className="h-3 w-3" /> Partidos jugados</Label>
                <Input type="number" min="0" value={form.matchesPlayed} onChange={e => set("matchesPlayed", e.target.value)} placeholder="0" className="h-12 border-2" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700 flex items-center gap-1"><Activity className="h-3 w-3" /> % Asistencia promedio</Label>
                <Input type="number" min="0" max="100" value={form.attendanceAvg} onChange={e => set("attendanceAvg", e.target.value)} placeholder="0 – 100" className="h-12 border-2" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-slate-700 flex items-center gap-1"><FileText className="h-3 w-3" /> Notas internas</Label>
              <Input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Observaciones del cuerpo técnico..." className="h-12 border-2" />
            </div>
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div>
                <Label className="font-black text-xs uppercase text-blue-800">Estacionamiento incluido en cuota</Label>
                <p className="text-[10px] text-blue-600 font-bold">La cuota mensual incluye el pago del estacionamiento</p>
              </div>
              <Switch checked={form.parkingIncluded} onCheckedChange={v => set("parkingIncluded", v)} />
            </div>
          </div>

          {/* Multi-Rol: También es Staff */}
          <div className="space-y-6 bg-orange-50 -mx-8 p-8 border-y border-orange-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-orange-800 flex items-center gap-2">
                  <Layers className="h-5 w-5" /> También es Staff Técnico
                </h3>
                <p className="text-xs text-orange-600 font-bold">Esta persona también tiene un rol dentro del cuerpo técnico o administrativo.</p>
              </div>
              <Switch checked={alsoStaff} onCheckedChange={v => setAlsoStaff(v)} />
            </div>
            {alsoStaff && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2">
                <div className="space-y-2">
                  <Label className="font-bold text-orange-800">Rol en el Club</Label>
                  <Select value={staffRole} onValueChange={v => setStaffRole(v)}>
                    <SelectTrigger className="h-12 border-2 bg-white font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="coach_lvl1" className="font-bold">Entrenador Nivel 1 (Jefe de Rama)</SelectItem>
                      <SelectItem value="coach_lvl2" className="font-bold">Entrenador Nivel 2 (Plantel)</SelectItem>
                      <SelectItem value="coordinator" className="font-bold">Coordinador de Rama</SelectItem>
                      <SelectItem value="club_admin" className="font-bold">Administrador del Club</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-orange-800">Especialidad / Cargo</Label>
                  <Input value={staffSpecialty} onChange={e => setStaffSpecialty(e.target.value)} placeholder="Ej. Preparador Físico, DT…" className="h-12 border-2 bg-white font-bold" />
                </div>
              </div>
            )}
          </div>

          {/* Acceso App */}
          <div className="space-y-6 bg-slate-50 -mx-8 p-8 border-y">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" /> Acceso App Fluxion
                </h3>
                <p className="text-xs text-slate-500 font-bold">Habilita al socio para ver su carnet y estadísticas.</p>
              </div>
              <Switch checked={form.enableLogin || alsoStaff} onCheckedChange={v => { if (!alsoStaff) set("enableLogin", v); }} />
            </div>
            {(form.enableLogin || alsoStaff) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Usuario (Email)</Label>
                  <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="Email de login" className="bg-white border-2" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Clave Temporal</Label>
                  <Input type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="Mínimo 6 caracteres" className="bg-white border-2" />
                </div>
              </div>
            )}
          </div>
        </CardContent>

        {/* Footer */}
        <div className="bg-slate-50 p-8 border-t flex flex-col sm:flex-row gap-4">
          <Button variant="ghost" onClick={() => router.push(`/dashboard/clubs/${clubId}/players`)} className="font-bold text-slate-500 h-14">
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={loading} className="flex-1 font-black uppercase text-xs tracking-widest h-14 shadow-xl shadow-primary/20 gap-2">
            {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <><ShieldCheck className="h-5 w-5" /> Confirmar Alta Federativa</>}
          </Button>
        </div>
      </Card>
    </div>
  );
}
