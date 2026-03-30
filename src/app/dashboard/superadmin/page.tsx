
"use client";

import { useState } from "react";
import { 
  Plus, 
  Building2, 
  UserPlus, 
  ShieldCheck, 
  Loader2, 
  CheckCircle2,
  Lock,
  Globe,
  ArrowRight
} from "lucide-react";
import { collection, doc, setDoc } from "firebase/firestore";
import { useFirestore, useAuth } from "@/firebase";
import { initiateEmailSignUp } from "@/firebase/non-blocking-login";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SuperAdminPage() {
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    clubName: "",
    clubAddress: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    sport: "hockey"
  });

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clubName || !form.adminEmail || !form.adminPassword) return;

    setLoading(true);
    try {
      // 1. Crear el Club
      const clubId = doc(collection(db, "clubs")).id;
      const clubDoc = doc(db, "clubs", clubId);
      
      await setDoc(clubDoc, {
        id: clubId,
        name: form.clubName,
        address: form.clubAddress,
        createdAt: new Date().toISOString()
      });

      // 2. Crear el Usuario Administrador (Cliente)
      const userId = doc(collection(db, "users")).id;
      const userDoc = doc(db, "users", userId);
      
      // Registro en Firebase Auth
      initiateEmailSignUp(auth, form.adminEmail, form.adminPassword);

      // Registro en Firestore
      await setDoc(userDoc, {
        id: userId,
        name: form.adminName,
        email: form.adminEmail.toLowerCase().trim(),
        role: "club_admin",
        clubId: clubId,
        sport: form.sport,
        createdAt: new Date().toISOString()
      });

      setSuccess(true);
      toast({ title: "Cliente Creado", description: `El club ${form.clubName} ha sido desplegado correctamente.` });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error en el despliegue" });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <Card className="max-w-md w-full text-center shadow-2xl animate-in zoom-in duration-300">
          <CardHeader>
            <div className="bg-green-100 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-black">¡Despliegue Exitoso!</CardTitle>
            <CardDescription>
              El club <strong>{form.clubName}</strong> ya puede acceder con las credenciales creadas.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full font-bold" onClick={() => { setSuccess(false); setForm({ clubName: "", clubAddress: "", adminName: "", adminEmail: "", adminPassword: "", sport: "hockey" }); }}>
              Crear otro cliente
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-4xl font-black font-headline text-white drop-shadow-md">Panel de Control Global</h1>
        <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] mt-1">Super Administrador • Alta de nuevos clientes y clubes.</p>
      </header>

      <form onSubmit={handleCreateClient}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Sección Club */}
          <Card className="border-none shadow-xl">
            <CardHeader className="bg-slate-900 text-white rounded-t-xl">
              <CardTitle className="flex items-center gap-2 text-lg uppercase tracking-tight">
                <Building2 className="h-5 w-5 text-primary" /> Datos del Club
              </CardTitle>
              <CardDescription className="text-white/60">Configuración inicial de la institución.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Nombre de la Institución</Label>
                <Input required value={form.clubName} onChange={e => setForm({...form, clubName: e.target.value})} placeholder="Ej. Lomas Athletic Club" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Ubicación / Sede</Label>
                <Input value={form.clubAddress} onChange={e => setForm({...form, clubAddress: e.target.value})} placeholder="Ej. Lomas de Zamora, Buenos Aires" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Deporte Principal</Label>
                <Tabs value={form.sport} onValueChange={v => setForm({...form, sport: v})} className="w-full">
                  <TabsList className="grid grid-cols-2 w-full">
                    <TabsTrigger value="hockey">🏑 Hockey</TabsTrigger>
                    <TabsTrigger value="rugby">🏉 Rugby</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardContent>
          </Card>

          {/* Sección Admin Cliente */}
          <Card className="border-none shadow-xl">
            <CardHeader className="bg-primary text-primary-foreground rounded-t-xl">
              <CardTitle className="flex items-center gap-2 text-lg uppercase tracking-tight">
                <UserPlus className="h-5 w-5" /> Director del Club
              </CardTitle>
              <CardDescription className="text-primary-foreground/80">Credenciales del primer administrador cliente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Nombre del Responsable</Label>
                <Input required value={form.adminName} onChange={e => setForm({...form, adminName: e.target.value})} placeholder="Ej. Juan Director" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Email de Acceso</Label>
                <Input required type="email" value={form.adminEmail} onChange={e => setForm({...form, adminEmail: e.target.value})} placeholder="admin@club.com" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Contraseña Temporal</Label>
                <Input required type="password" value={form.adminPassword} onChange={e => setForm({...form, adminPassword: e.target.value})} placeholder="Min. 6 caracteres" />
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t p-6">
              <Button type="submit" className="w-full h-12 text-lg font-black uppercase tracking-widest gap-2 shadow-xl shadow-primary/20" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                Desplegar Club
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>

      <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-full">
            <Globe className="h-6 w-6" />
          </div>
          <div>
            <p className="font-black uppercase tracking-widest text-xs">Estatus de Plataforma</p>
            <p className="text-sm opacity-80">Al desplegar, se genera automáticamente la base de datos de jugadores, finanzas y tienda para el nuevo cliente.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
