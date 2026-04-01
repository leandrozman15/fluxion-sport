
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
  ArrowRight,
  Phone,
  Mail,
  User
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
import { ScrollArea } from "@/components/ui/scroll-area";

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
    adminPhone: "",
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
        phone: form.adminPhone,
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
            <Button className="w-full font-bold" onClick={() => { setSuccess(false); setForm({ clubName: "", clubAddress: "", adminName: "", adminEmail: "", adminPassword: "", adminPhone: "", sport: "hockey" }); }}>
              Crear otro cliente
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <header>
        <h1 className="text-4xl font-black font-headline text-white drop-shadow-md">Despliegue de Instituciones</h1>
        <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] mt-1">Super Administrador • Alta de nuevos clubes y directores.</p>
      </header>

      <form onSubmit={handleCreateClient}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Sección Club */}
          <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-md overflow-hidden">
            <CardHeader className="bg-slate-900 text-white pb-6">
              <CardTitle className="flex items-center gap-3 text-lg uppercase tracking-widest font-black">
                <Building2 className="h-6 w-6 text-primary" /> Institución
              </CardTitle>
              <CardDescription className="text-white/60 font-bold italic">Configuración de la sede deportiva.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-8">
              <div className="space-y-2">
                <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Nombre del Club</Label>
                <Input required value={form.clubName} onChange={e => setForm({...form, clubName: e.target.value})} placeholder="Ej. Lomas Athletic Club" className="h-12 border-2 font-black text-lg" />
              </div>
              <div className="space-y-2">
                <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Ubicación / Sede</Label>
                <Input value={form.clubAddress} onChange={e => setForm({...form, clubAddress: e.target.value})} placeholder="Ej. Lomas de Zamora, Buenos Aires" className="h-12 border-2" />
              </div>
              <div className="space-y-4 pt-4">
                <Label className="font-black text-xs uppercase tracking-widest text-primary">Disciplina de Lanzamiento</Label>
                <Tabs value={form.sport} onValueChange={v => setForm({...form, sport: v})} className="w-full">
                  <TabsList className="grid grid-cols-2 w-full h-12 bg-slate-100 p-1">
                    <TabsTrigger value="hockey" className="font-bold uppercase text-[10px]">🏑 Hockey</TabsTrigger>
                    <TabsTrigger value="rugby" className="font-bold uppercase text-[10px]">🏉 Rugby</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardContent>
          </Card>

          {/* Sección Admin Cliente */}
          <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-md overflow-hidden">
            <CardHeader className="bg-primary text-primary-foreground pb-6">
              <CardTitle className="flex items-center gap-3 text-lg uppercase tracking-widest font-black">
                <UserPlus className="h-6 w-6" /> Director Responsable
              </CardTitle>
              <CardDescription className="text-primary-foreground/80 font-bold italic">Credenciales y contacto del primer administrador.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-8">
              <div className="space-y-2">
                <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Nombre Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input required value={form.adminName} onChange={e => setForm({...form, adminName: e.target.value})} placeholder="Ej. Juan Director" className="h-12 border-2 pl-10 font-bold" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Teléfono de Contacto</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input value={form.adminPhone} onChange={e => setForm({...form, adminPhone: e.target.value})} placeholder="+54 11..." className="h-12 border-2 pl-10 font-bold" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Email de Acceso</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input required type="email" value={form.adminEmail} onChange={e => setForm({...form, adminEmail: e.target.value})} placeholder="admin@club.com" className="h-12 border-2 pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Contraseña Temp.</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input required type="password" value={form.adminPassword} onChange={e => setForm({...form, adminPassword: e.target.value})} placeholder="Min. 6 car." className="h-12 border-2 pl-10" />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 border-t p-8">
              <Button type="submit" className="w-full h-14 text-lg font-black uppercase tracking-widest gap-3 shadow-xl shadow-primary/20" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck className="h-6 w-6" />}
                Desplegar Institución
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>

      <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white rounded-[2rem]">
        <CardContent className="p-8 flex items-center gap-6">
          <div className="bg-white/20 p-4 rounded-2xl">
            <Globe className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="font-black uppercase tracking-[0.2em] text-xs text-primary mb-1">Estatus de Plataforma</p>
            <p className="text-sm opacity-90 font-medium leading-relaxed">Al desplegar, se genera automáticamente el entorno seguro para el club. El director recibirá acceso a la base de datos de jugadores, tesorería y tienda oficial.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
