
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Trophy, 
  UserPlus, 
  Loader2, 
  CheckCircle2, 
  ShieldCheck,
  ChevronRight,
  Scale,
  Ruler,
  AlertCircle
} from "lucide-react";
import { doc, collection, setDoc } from "firebase/firestore";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PublicPlayerRegistration() {
  const { clubId } = useParams() as { clubId: string };
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [form, setForm] = useState({ 
    firstName: "", 
    lastName: "", 
    dni: "",
    birthDate: "", 
    phone: "", 
    email: "", 
    address: "",
    weight: "",
    height: "",
    bloodType: "",
    emergencyContact: "",
    emergencyPhone: "",
    position: "",
    photoUrl: "",
    jerseyNumber: 1
  });

  const clubRef = useMemoFirebase(() => doc(db, "clubs", clubId), [db, clubId]);
  const { data: club, isLoading: clubLoading } = useDoc(clubRef);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = form.email.toLowerCase().trim();
    if (!form.firstName || !form.lastName || !normalizedEmail || !form.dni) return;

    setLoading(true);
    try {
      const playerId = doc(collection(db, "clubs", clubId, "players")).id;
      const playerDoc = doc(db, "clubs", clubId, "players", playerId);
      
      const playerData = {
        ...form,
        email: normalizedEmail,
        id: playerId,
        clubId,
        role: "player",
        status: "pending_approval",
        createdAt: new Date().toISOString()
      };

      // 1. Guardar en el club
      await setDoc(playerDoc, playerData);

      // 2. REGISTRAR EN ÍNDICE GLOBAL (Crítico para que pueda entrar a la App)
      await setDoc(doc(db, "all_players_index", playerId), {
        id: playerId,
        firstName: form.firstName,
        lastName: form.lastName,
        email: normalizedEmail,
        clubId: clubId,
        clubName: club?.name || "Club",
        role: "player",
        photoUrl: form.photoUrl,
        createdAt: new Date().toISOString()
      });

      setSubmitted(true);
      toast({
        title: "¡Inscripción Enviada!",
        description: "Tu solicitud ha sido registrada correctamente.",
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo procesar tu inscripción.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (clubLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  if (submitted) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center shadow-2xl">
          <CardHeader>
            <div className="bg-green-100 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-black">¡Registro Completado!</CardTitle>
            <CardDescription className="px-4">
              Gracias por inscribirte en <strong>{club?.name}</strong>. El club revisará tu legajo deportivo y se pondrá en contacto contigo pronto.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full h-12 font-bold" variant="outline" onClick={() => router.push('/')}>Volver al inicio</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="text-center space-y-4">
          <Avatar className="h-24 w-24 mx-auto border-4 border-white shadow-xl">
            <AvatarImage src={club?.logoUrl} />
            <AvatarFallback><Trophy className="h-10 w-10 text-primary" /></AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-4xl font-black font-headline tracking-tight">Inscripción: {club?.name}</h1>
            <p className="text-muted-foreground font-medium mt-2">Legajo oficial de deportista federado.</p>
          </div>
        </header>

        <Card className="shadow-2xl border-none">
          <form onSubmit={handleSubmit}>
            <CardHeader className="bg-primary text-primary-foreground rounded-t-xl">
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-6 w-6" /> Ficha Médica y Deportiva
              </CardTitle>
              <CardDescription className="text-primary-foreground/80 font-medium">Completa todos los datos para la validación federativa.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 p-8">
              {/* Identidad */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-primary border-b pb-2">1. Identidad Personal</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input required value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} placeholder="Ej. Mateo" />
                  </div>
                  <div className="space-y-2">
                    <Label>Apellido</Label>
                    <Input required value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} placeholder="Ej. González" />
                  </div>
                  <div className="space-y-2">
                    <Label>DNI / Documento</Label>
                    <Input required value={form.dni} onChange={e => setForm({...form, dni: e.target.value})} placeholder="Número sin puntos" />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de Nacimiento</Label>
                    <Input required type="date" value={form.birthDate} onChange={e => setForm({...form, birthDate: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* Contacto */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-primary border-b pb-2">2. Contacto y Residencia</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="mateo@ejemplo.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono Celular</Label>
                    <Input required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+54..." />
                  </div>
                  <div className="col-span-full space-y-2">
                    <Label>Dirección Particular</Label>
                    <Input required value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Calle, Nro, Piso, Localidad" />
                  </div>
                </div>
              </div>

              {/* Biometría y Salud */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-primary border-b pb-2">3. Ficha Biométrica y Salud</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><Scale className="h-3 w-3" /> Peso (kg)</Label>
                    <Input required type="number" value={form.weight} onChange={e => setForm({...form, weight: e.target.value})} placeholder="Ej. 70" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><Ruler className="h-3 w-3" /> Altura (cm)</Label>
                    <Input required type="number" value={form.height} onChange={e => setForm({...form, height: e.target.value})} placeholder="Ej. 175" />
                  </div>
                  <div className="space-y-2">
                    <Label>Grupo Sanguíneo</Label>
                    <Select value={form.bloodType} onValueChange={v => setForm({...form, bloodType: v})}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-orange-50 p-4 rounded-xl border border-orange-100">
                  <div className="space-y-2">
                    <Label className="text-orange-800 font-bold">Contacto de Emergencia</Label>
                    <Input required value={form.emergencyContact} onChange={e => setForm({...form, emergencyContact: e.target.value})} placeholder="Nombre del familiar" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-orange-800 font-bold">Teléfono de Emergencia</Label>
                    <Input required value={form.emergencyPhone} onChange={e => setForm({...form, emergencyPhone: e.target.value})} placeholder="Número 24hs" />
                  </div>
                </div>
              </div>

              {/* Técnica */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-primary border-b pb-2">4. Información Técnica</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Posición Preferida</Label>
                    <Input value={form.position} onChange={e => setForm({...form, position: e.target.value})} placeholder="Ej. Portero, Volante..." />
                  </div>
                  <div className="space-y-2">
                    <Label>URL de Foto (Opcional)</Label>
                    <Input value={form.photoUrl} onChange={e => setForm({...form, photoUrl: e.target.value})} placeholder="https://..." />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 bg-muted/30 p-8 rounded-b-xl border-t">
              <Button type="submit" className="w-full h-14 text-xl font-black gap-2 shadow-xl shadow-primary/20" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : <ChevronRight className="h-6 w-6" />}
                Enviar Inscripción Oficial
              </Button>
              <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center font-medium">
                <ShieldCheck className="h-4 w-4 text-green-600" /> Los datos serán validados por la secretaría de {club?.name}
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
