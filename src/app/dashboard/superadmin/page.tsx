
"use client";

import { useState } from "react";
import { 
  Building2, 
  UserPlus, 
  ShieldCheck, 
  Loader2, 
  CheckCircle2,
  User,
  Phone,
  Mail,
  Lock,
  Trophy
} from "lucide-react";
import { collection, doc, setDoc } from "firebase/firestore";
import { useFirestore, useAuth } from "@/firebase";
import { initiateEmailSignUp } from "@/firebase/non-blocking-login";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LiveMatchesCard } from "@/components/dashboard/live-matches-card";

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
      const clubId = doc(collection(db, "clubs")).id;
      const clubDoc = doc(db, "clubs", clubId);
      
      await setDoc(clubDoc, {
        id: clubId,
        name: form.clubName,
        address: form.clubAddress,
        createdAt: new Date().toISOString()
      });

      const userId = doc(collection(db, "users")).id;
      const userDoc = doc(db, "users", userId);
      
      initiateEmailSignUp(auth, form.adminEmail, form.adminPassword);

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
        <Card className="max-w-md w-full text-center shadow-2xl animate-in zoom-in duration-300 bg-white border-none rounded-[2.5rem]">
          <CardHeader>
            <div className="bg-green-100 h-24 w-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <CardTitle className="text-3xl font-black text-slate-900 tracking-tight">¡Despliegue Exitoso!</CardTitle>
            <CardDescription className="text-slate-500 font-bold mt-2">
              El club <strong>{form.clubName}</strong> ya puede acceder con las credenciales creadas.
            </CardDescription>
          </CardHeader>
          <CardFooter className="pt-8">
            <Button className="w-full font-black uppercase text-xs tracking-widest h-14 shadow-xl" onClick={() => { setSuccess(false); setForm({ clubName: "", clubAddress: "", adminName: "", adminEmail: "", adminPassword: "", adminPhone: "", sport: "hockey" }); }}>
              Crear otro cliente
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500 pb-24 px-4 md:px-0">
      <header className="space-y-2">
        <h1 className="text-4xl font-black font-headline text-white drop-shadow-2xl tracking-tight">Consola de Control Global</h1>
        <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] drop-shadow-md">Fluxion Sport • Administración de infraestructura y clientes.</p>
      </header>

      <LiveMatchesCard />

      <form onSubmit={handleCreateClient}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <Card className="border-none shadow-2xl bg-white overflow-hidden rounded-[2.5rem]">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-8 pt-8 px-8">
              <CardTitle className="flex items-center gap-4 text-xl font-black text-slate-900 tracking-tight">
                <div className="bg-primary/10 p-3 rounded-2xl">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                Nueva Institución
              </CardTitle>
              <CardDescription className="font-bold text-slate-500">Configuración base de la sede deportiva.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 pt-8 px-8 pb-8">
              <div className="space-y-2">
                <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Nombre del Club</Label>
                <Input required value={form.clubName} onChange={e => setForm({...form, clubName: e.target.value})} placeholder="Ej. Lomas Athletic Club" className="h-14 border-2 font-black text-lg focus:border-primary transition-all bg-white" />
              </div>
              <div className="space-y-2">
                <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Ubicación / Ciudad</Label>
                <Input value={form.clubAddress} onChange={e => setForm({...form, clubAddress: e.target.value})} placeholder="Ej. Lomas de Zamora, Buenos Aires" className="h-14 border-2 font-bold bg-white" />
              </div>
              <div className="space-y-4 pt-4 border-t">
                <Label className="font-black text-xs uppercase tracking-widest text-primary flex items-center gap-2">
                  <Trophy className="h-4 w-4" /> Disciplina de Lanzamiento
                </Label>
                <Tabs value={form.sport} onValueChange={v => setForm({...form, sport: v})} className="w-full">
                  <TabsList className="grid grid-cols-2 w-full h-14 bg-slate-100 p-1.5 rounded-2xl">
                    <TabsTrigger value="hockey" className="font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg rounded-xl">🏑 Hockey</TabsTrigger>
                    <TabsTrigger value="rugby" className="font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg rounded-xl">🏉 Rugby</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-2xl bg-white overflow-hidden rounded-[2.5rem]">
            <CardHeader className="bg-primary/5 border-b border-primary/10 pb-8 pt-8 px-8">
              <CardTitle className="flex items-center gap-4 text-xl font-black text-primary tracking-tight">
                <div className="bg-white p-3 rounded-2xl shadow-sm">
                  <UserPlus className="h-6 w-6 text-primary" />
                </div>
                Director Responsable
              </CardTitle>
              <CardDescription className="text-primary/60 font-bold">Credenciales del primer administrador institucional.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-8 px-8 pb-8">
              <div className="space-y-2">
                <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Nombre Completo</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                  <Input required value={form.adminName} onChange={e => setForm({...form, adminName: e.target.value})} placeholder="Ej. Juan Director" className="h-14 border-2 pl-12 font-black text-slate-900 bg-white" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Teléfono de Contacto</Label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                  <Input value={form.adminPhone} onChange={e => setForm({...form, adminPhone: e.target.value})} placeholder="+54 11..." className="h-14 border-2 pl-12 font-bold bg-white" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Email de Acceso</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                    <Input required type="email" value={form.adminEmail} onChange={e => setForm({...form, adminEmail: e.target.value})} placeholder="admin@club.com" className="h-14 border-2 pl-12 font-medium bg-white" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Clave Temporal</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                    <Input required type="password" value={form.adminPassword} onChange={e => setForm({...form, adminPassword: e.target.value})} placeholder="Min. 6 car." className="h-14 border-2 pl-12 font-medium bg-white" />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50/50 border-t p-8">
              <Button type="submit" className="w-full h-16 text-lg font-black uppercase tracking-[0.2em] gap-4 shadow-2xl shadow-primary/30 rounded-2xl" disabled={loading}>
                {loading ? <Loader2 className="animate-spin h-6 w-6" /> : <ShieldCheck className="h-7 w-7" />}
                Desplegar Sistema Institucional
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  );
}
