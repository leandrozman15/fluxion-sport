

"use client";

import { useState } from "react";
import { 
  Building2, 
  UserPlus, 
  ShieldCheck, 
  Loader2, 
  CheckCircle2,
  Trophy,
  Activity,
  ShieldAlert,
  Database
} from "lucide-react";
import { collection, doc, setDoc } from "firebase/firestore";
import { useFirestore, useFirebase, createUserWithSecondaryApp } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";

const DATABASE_ID = "ai-studio-0867a4e6-d6f0-4ab1-84e3-aa53097594a7";

export default function SuperAdminPage() {
  const { user } = useFirebase();
  const db = useFirestore();
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
      const normalizedEmail = form.adminEmail.toLowerCase().trim();

      // 1. Crear el Club en Firestore (no bloqueante, ID generado localmente)
      const clubId = doc(collection(db, "clubs")).id;
      setDocumentNonBlocking(doc(db, "clubs", clubId), {
        id: clubId,
        name: form.clubName,
        address: form.clubAddress,
        createdAt: new Date().toISOString()
      }, {});

      // 2. Crear acceso en Auth SIN cerrar la sesión actual (instancia secundaria)
      //    Obtenemos el UID real antes de escribir en Firestore.
      const adminUid = await createUserWithSecondaryApp(normalizedEmail, form.adminPassword);

      // 3. Crear el perfil del administrador con UID como ID de documento
      await setDoc(doc(db, "users", adminUid), {
        id: adminUid,
        uid: adminUid,
        name: form.adminName,
        email: normalizedEmail,
        phone: form.adminPhone,
        role: "club_admin",
        clubId: clubId,
        sport: form.sport,
        createdAt: new Date().toISOString()
      });

      setSuccess(true);
      toast({ 
        title: "Sistema Desplegado", 
        description: `El club ${form.clubName} ha sido creado exitosamente.` 
      });
    } catch (error: any) {
      console.error("Error en despliegue SuperAdmin:", error);
      toast({ 
        variant: "destructive", 
        title: "Error en el despliegue",
        description: error.code === 'auth/email-already-in-use' ? "Ese email ya tiene una cuenta registrada." : "Verifica los datos e intenta nuevamente."
      });
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
            <CardTitle className="text-3xl font-black text-slate-900 tracking-tight uppercase">¡Sistema Desplegado!</CardTitle>
            <CardDescription className="text-slate-500 font-bold mt-2">
              El club <strong>{form.clubName}</strong> ha sido dado de alta correctamente. El administrador ya puede acceder con sus credenciales.
            </CardDescription>
          </CardHeader>
          <CardFooter className="pt-8">
            <Button className="w-full font-black uppercase text-xs tracking-widest h-14 shadow-xl" onClick={() => setSuccess(false)}>
              Crear Otro Club
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500 pb-24 px-4 md:px-0">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2 rounded-xl text-white shadow-lg">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h1 className="text-4xl font-black font-headline text-white drop-shadow-2xl tracking-tight">Infraestructura Global</h1>
          </div>
          <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] drop-shadow-md flex items-center gap-2">
            <Database className="h-3 w-3" /> Instancia Activa: {DATABASE_ID}
          </p>
        </div>
      </header>

      <form onSubmit={handleCreateClient}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <Card className="border-none shadow-2xl bg-white overflow-hidden rounded-[2.5rem]">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-8 pt-8 px-8">
              <CardTitle className="flex items-center gap-4 text-xl font-black text-slate-900 uppercase tracking-tighter">
                <Building2 className="h-6 w-6 text-primary" /> Datos de la Institución
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8 pt-8 px-8 pb-8">
              <div className="space-y-2">
                <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Nombre Oficial del Club</Label>
                <Input required value={form.clubName} onChange={e => setForm({...form, clubName: e.target.value})} placeholder="Ej. Club Atlético Vicentinos" className="h-14 border-2 font-black text-lg focus:border-primary transition-all bg-white" />
              </div>
              <div className="space-y-2">
                <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Ubicación / Sede</Label>
                <Input value={form.clubAddress} onChange={e => setForm({...form, clubAddress: e.target.value})} placeholder="Ciudad, Provincia" className="h-14 border-2 font-bold bg-white" />
              </div>
              <div className="space-y-4 pt-4 border-t">
                <Label className="font-black text-xs uppercase tracking-widest text-primary flex items-center gap-2">
                  <Activity className="h-4 w-4" /> Deporte de Inicio
                </Label>
                <Tabs value={form.sport} onValueChange={v => setForm({...form, sport: v})} className="w-full">
                  <TabsList className="grid grid-cols-2 w-full h-14 bg-slate-100 p-1.5 rounded-2xl">
                    <TabsTrigger value="hockey" className="font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary rounded-xl">🏑 Hockey</TabsTrigger>
                    <TabsTrigger value="rugby" className="font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary rounded-xl">🏉 Rugby</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-2xl bg-white overflow-hidden rounded-[2.5rem]">
            <CardHeader className="bg-primary/5 border-b border-primary/10 pb-8 pt-8 px-8">
              <CardTitle className="flex items-center gap-4 text-xl font-black text-primary uppercase tracking-tighter">
                <UserPlus className="h-6 w-6" /> Administrador Responsable
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-8 px-8 pb-8">
              <div className="space-y-2">
                <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Nombre Completo del Admin</Label>
                <Input required value={form.adminName} onChange={e => setForm({...form, adminName: e.target.value})} placeholder="Ej. Roberto Director" className="h-14 border-2 font-black text-slate-900 bg-white" />
              </div>
              <div className="grid grid-cols-1 gap-6 pt-2">
                <div className="space-y-2">
                  <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Email de Acceso (Usuario)</Label>
                  <Input required type="email" value={form.adminEmail} onChange={e => setForm({...form, adminEmail: e.target.value})} placeholder="admin@club.com" className="h-14 border-2 font-medium bg-white" />
                </div>
                <div className="space-y-2">
                  <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Clave Temporal</Label>
                  <Input required type="password" value={form.adminPassword} onChange={e => setForm({...form, adminPassword: e.target.value})} placeholder="Min. 6 caracteres" className="h-14 border-2 font-medium bg-white" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50/50 border-t p-8">
              <Button type="submit" className="w-full h-16 text-lg font-black uppercase tracking-[0.2em] gap-4 shadow-2xl shadow-primary/30 rounded-2xl transition-all hover:scale-[1.01]" disabled={loading}>
                {loading ? <Loader2 className="animate-spin h-6 w-6" /> : <ShieldCheck className="h-7 w-7" />}
                Dar de Alta Institución
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
      
      <div className="text-center">
        <p className="text-white/20 font-black uppercase tracking-[0.5em] text-[8px]">Fluxion Sport Protocol • Prototyping Level 4</p>
      </div>
    </div>
  );
}
