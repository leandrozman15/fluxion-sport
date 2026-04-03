
"use client";

import { useState } from "react";
import { 
  Building2, 
  UserPlus, 
  ShieldCheck, 
  Loader2, 
  CheckCircle2,
  Trophy,
  Megaphone
} from "lucide-react";
import { collection, doc, setDoc } from "firebase/firestore";
import { useFirestore, useAuth, useFirebase } from "@/firebase";
import { initiateEmailSignUp } from "@/firebase/non-blocking-login";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LiveMatchesCard } from "@/components/dashboard/live-matches-card";
import { SpecialEventsFeed } from "@/components/dashboard/special-events-feed";
import { CreateSpecialEventDialog } from "@/components/dashboard/create-special-event-dialog";

export default function SuperAdminPage() {
  const { user } = useFirebase();
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

      const userId = form.adminEmail.toLowerCase().trim();
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
      toast({ title: "Cliente Creado", description: `El club ${form.clubName} ha sido desplegado.` });
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
            <CardTitle className="text-3xl font-black text-slate-900 tracking-tight uppercase">¡Sistema Desplegado!</CardTitle>
            <CardDescription className="text-slate-500 font-bold mt-2">
              El club <strong>{form.clubName}</strong> ya puede acceder con sus credenciales.
            </CardDescription>
          </CardHeader>
          <CardFooter className="pt-8">
            <Button className="w-full font-black uppercase text-xs tracking-widest h-14 shadow-xl" onClick={() => { setSuccess(false); setForm({ clubName: "", clubAddress: "", adminName: "", adminEmail: "", adminPassword: "", adminPhone: "", sport: "hockey" }); }}>
              Registrar Nueva Institución
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
          <h1 className="text-4xl font-black font-headline text-white drop-shadow-2xl tracking-tight">Infraestructura Global</h1>
          <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] drop-shadow-md">Alta de Clientes e Instituciones • Fluxion Sport</p>
        </div>
      </header>

      <LiveMatchesCard />

      <form onSubmit={handleCreateClient}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <Card className="border-none shadow-2xl bg-white overflow-hidden rounded-[2.5rem]">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-8 pt-8 px-8">
              <CardTitle className="flex items-center gap-4 text-xl font-black text-slate-900 uppercase tracking-tighter">
                <Building2 className="h-6 w-6 text-primary" /> Datos del Club
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8 pt-8 px-8 pb-8">
              <div className="space-y-2">
                <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Nombre Oficial</Label>
                <Input required value={form.clubName} onChange={e => setForm({...form, clubName: e.target.value})} placeholder="Ej. Club Atlético Vicentinos" className="h-14 border-2 font-black text-lg focus:border-primary transition-all bg-white" />
              </div>
              <div className="space-y-2">
                <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Ubicación</Label>
                <Input value={form.clubAddress} onChange={e => setForm({...form, clubAddress: e.target.value})} placeholder="Ciudad, Provincia" className="h-14 border-2 font-bold bg-white" />
              </div>
              <div className="space-y-4 pt-4 border-t">
                <Label className="font-black text-xs uppercase tracking-widest text-primary flex items-center gap-2">
                  <Trophy className="h-4 w-4" /> Deporte Base
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
                <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Nombre Completo</Label>
                <Input required value={form.adminName} onChange={e => setForm({...form, adminName: e.target.value})} placeholder="Ej. Roberto Director" className="h-14 border-2 font-black text-slate-900 bg-white" />
              </div>
              <div className="grid grid-cols-1 gap-6 pt-2">
                <div className="space-y-2">
                  <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Email de Acceso</Label>
                  <Input required type="email" value={form.adminEmail} onChange={e => setForm({...form, adminEmail: e.target.value})} placeholder="admin@club.com" className="h-14 border-2 font-medium bg-white" />
                </div>
                <div className="space-y-2">
                  <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Clave Temporal</Label>
                  <Input required type="password" value={form.adminPassword} onChange={e => setForm({...form, adminPassword: e.target.value})} placeholder="Min. 6 car." className="h-14 border-2 font-medium bg-white" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50/50 border-t p-8">
              <Button type="submit" className="w-full h-16 text-lg font-black uppercase tracking-[0.2em] gap-4 shadow-2xl shadow-primary/30 rounded-2xl" disabled={loading}>
                {loading ? <Loader2 className="animate-spin h-6 w-6" /> : <ShieldCheck className="h-7 w-7" />}
                Dar de Alta Institución
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  );
}
