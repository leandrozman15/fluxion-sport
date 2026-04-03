"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Trophy, 
  Loader2, 
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  Mail,
  Lock,
  User
} from "lucide-react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, collection, query, where, getDocs, getDoc, setDoc } from "firebase/firestore";
import { useFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function LoginPage() {
  const { auth, firestore, user, isUserLoading } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  
  // Login State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Registration State
  const [isRegOpen, setIsRegOpen] = useState(false);
  const [regForm, setRegForm] = useState({
    name: "Director de Plataforma",
    email: "",
    password: ""
  });

  useEffect(() => {
    if (user && !isUserLoading) {
      handleRedirect(user);
    }
  }, [user, isUserLoading]);

  const handleRedirect = async (currentUser: any) => {
    try {
      const userEmail = currentUser.email?.toLowerCase().trim() || "";
      
      // 1. Verificar por UID (más seguro y rápido)
      const userRef = doc(firestore, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);
      
      let data = null;
      if (userSnap.exists()) {
        data = userSnap.data();
      } else {
        // Fallback por email si es un registro antiguo
        const staffSnap = await getDocs(query(collection(firestore, "users"), where("email", "==", userEmail)));
        if (!staffSnap.empty) data = staffSnap.docs[0].data();
      }
      
      if (data) {
        const role = data.role;
        if (role === 'admin' || role === 'fed_admin') return router.replace('/dashboard/superadmin');
        if (role === 'coordinator') return router.replace('/dashboard/coordinator');
        if (['coach', 'coach_lvl1', 'coach_lvl2'].includes(role)) return router.replace('/dashboard/coach');
        if (data.clubId) return router.replace(`/dashboard/clubs/${data.clubId}`);
      }

      // 2. Buscar en JUGADORES
      const playerSnap = await getDocs(query(collection(firestore, "all_players_index"), where("email", "==", userEmail)));
      if (!playerSnap.empty) return router.replace('/dashboard/player');

      // 3. Fallback a selección de clubes
      router.replace('/dashboard/clubs');
    } catch (e) {
      console.error("Error en redirección de login:", e);
      router.replace('/dashboard/clubs');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Acceso Concedido" });
    } catch (err: any) {
      setError("Credenciales inválidas.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSuperAdmin = async () => {
    if (!regForm.email || !regForm.password || regForm.password.length < 6) {
      toast({ variant: "destructive", title: "Datos inválidos", description: "Email y contraseña (mín. 6 car.) requeridos." });
      return;
    }

    setLoading(true);
    try {
      // 1. Crear usuario en Firebase Auth
      const cred = await createUserWithEmailAndPassword(auth, regForm.email, regForm.password);
      const newUser = cred.user;
      
      // 2. Crear perfil en Firestore
      await setDoc(doc(firestore, "users", newUser.uid), {
        id: newUser.uid,
        email: regForm.email.toLowerCase().trim(),
        name: regForm.name,
        role: "admin",
        createdAt: new Date().toISOString()
      });

      toast({ title: "Super Administrador Creado", description: "Iniciando consola de infraestructura..." });
      setIsRegOpen(false);
      router.replace('/dashboard/superadmin');
    } catch (err: any) {
      console.error(err);
      toast({ 
        variant: "destructive", 
        title: "Error al registrar", 
        description: err.code === 'auth/email-already-in-use' ? "El email ya está registrado." : "No se pudo crear la cuenta." 
      });
    } finally {
      setLoading(false);
    }
  };

  if (isUserLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950">
      <Loader2 className="h-12 w-12 animate-spin text-white opacity-20" />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/10 opacity-50" />
      
      <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-700 relative z-10">
        <div className="text-center space-y-4">
          <div className="bg-white p-5 rounded-[2.5rem] inline-block shadow-2xl border-4 border-primary/10">
            <Trophy className="h-14 w-14 text-primary" />
          </div>
          <div className="space-y-1">
            <h1 className="text-5xl font-black text-white tracking-tighter drop-shadow-2xl">Fluxion Sport</h1>
            <p className="text-primary-foreground font-black uppercase tracking-[0.4em] text-[10px] opacity-70">SISTEMA NACIONAL DE GESTIÓN</p>
          </div>
        </div>

        <Card className="shadow-[0_30px_100px_rgba(0,0,0,0.5)] border-none bg-white/95 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-8 pt-8 px-8">
            <CardTitle className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Acceso Institucional</CardTitle>
            <CardDescription className="font-bold text-slate-500">Ingresa a la consola oficial de tu club o asociación.</CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-5 pt-8 px-8">
              {error && (
                <Alert variant="destructive" className="bg-red-50 text-red-900 border-red-200 rounded-2xl">
                  <AlertDescription className="font-bold text-xs uppercase tracking-tight">{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label className="text-slate-400 font-black uppercase text-[9px] tracking-[0.2em] ml-1">Email Registrado</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-14 border-2 rounded-2xl font-bold text-lg focus-visible:ring-primary" placeholder="usuario@club.com" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400 font-black uppercase text-[9px] tracking-[0.2em] ml-1">Contraseña</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-14 border-2 rounded-2xl font-bold text-lg focus-visible:ring-primary" placeholder="••••••••" />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 p-8 pt-4">
              <Button type="submit" className="w-full h-16 text-lg font-black uppercase tracking-widest shadow-2xl shadow-primary/30 rounded-2xl transition-all hover:scale-[1.02] active:scale-95" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : <><ShieldCheck className="h-6 w-6 mr-2" /> Entrar al Sistema</>}
              </Button>
              
              <div className="relative py-4 w-full">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100" /></div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-[0.3em] font-black"><span className="bg-white px-4 text-slate-300">Desarrollo</span></div>
              </div>

              <Dialog open={isRegOpen} onOpenChange={setIsRegOpen}>
                <DialogTrigger asChild>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full h-14 text-[10px] font-black uppercase tracking-[0.2em] border-2 border-red-50 text-red-500 hover:bg-red-50 hover:border-red-100 gap-3 rounded-2xl transition-all" 
                    disabled={loading}
                  >
                    <ShieldAlert className="h-5 w-5" />
                    Registrar Super Administrador
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white border-none shadow-2xl rounded-[2.5rem]">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Primer Registro Maestro</DialogTitle>
                    <DialogDescription className="font-bold text-slate-500">Crea la cuenta del Administrador de Infraestructura Global.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-5 py-6">
                    <div className="space-y-2">
                      <Label className="text-slate-400 font-black uppercase text-[9px] tracking-widest ml-1">Nombre Completo</Label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input value={regForm.name} onChange={e => setRegForm({...regForm, name: e.target.value})} className="pl-12 h-14 border-2 font-bold" placeholder="Nombre del Director" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-400 font-black uppercase text-[9px] tracking-widest ml-1">Email Maestro</Label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input type="email" value={regForm.email} onChange={e => setRegForm({...regForm, email: e.target.value})} className="pl-12 h-14 border-2 font-bold" placeholder="admin@fluxionsport.com" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-400 font-black uppercase text-[9px] tracking-widest ml-1">Contraseña de Seguridad</Label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input type="password" value={regForm.password} onChange={e => setRegForm({...regForm, password: e.target.value})} className="pl-12 h-14 border-2 font-bold" placeholder="Min. 6 caracteres" />
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-8 border-t rounded-b-[2.5rem]">
                    <Button variant="ghost" onClick={() => setIsRegOpen(false)} className="font-bold">Cancelar</Button>
                    <Button onClick={handleRegisterSuperAdmin} disabled={loading} className="font-black uppercase text-xs tracking-widest h-14 px-10 shadow-xl shadow-primary/20 gap-2">
                      {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <><ShieldCheck className="h-5 w-5" /> Activar Perfil</>}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardFooter>
          </form>
        </Card>
        
        <p className="text-center text-[9px] font-black text-white/30 uppercase tracking-[0.5em]">Fluxion Sport © 2025 • Infraestructura Cloud</p>
      </div>
    </div>
  );
}
