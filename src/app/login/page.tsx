
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Trophy, 
  Loader2, 
  ShieldCheck,
  ShieldAlert,
  Mail,
  Lock,
  User,
  ArrowRight
} from "lucide-react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
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
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isRegOpen, setIsRegOpen] = useState(false);
  const [regForm, setRegForm] = useState({
    name: "Director de Plataforma",
    email: "",
    password: ""
  });

  useEffect(() => {
    // Si ya hay una sesión, dejar que el motor de redirección del dashboard decida el destino
    if (user && !isUserLoading) {
      router.replace('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email.toLowerCase().trim(), password);
      toast({ title: "Acceso Concedido", description: "Iniciando sesión en Fluxion Sport..." });
      // El useEffect anterior manejará la redirección al detectar el cambio de estado de 'user'
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError("Email o contraseña incorrectos.");
      } else {
        setError("Error al conectar con el servidor.");
      }
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
      const cred = await createUserWithEmailAndPassword(auth, regForm.email.toLowerCase().trim(), regForm.password);
      const newUser = cred.user;
      
      // Registrar el perfil jerárquico en la base de datos oficial
      await setDoc(doc(firestore, "users", newUser.uid), {
        id: newUser.uid,
        email: regForm.email.toLowerCase().trim(),
        name: regForm.name,
        role: "admin",
        createdAt: new Date().toISOString()
      });

      toast({ title: "Super Administrador Creado", description: "Perfil de infraestructura activado." });
      setIsRegOpen(false);
      router.replace('/dashboard');
    } catch (err: any) {
      console.error("Registration error:", err);
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
      {/* Elementos de fondo decorativos */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/10 opacity-50" />
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px]" />
      
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
            <CardDescription className="font-bold text-slate-500">Ingresa con tus credenciales registradas.</CardDescription>
          </CardHeader>
          
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-5 pt-8 px-8">
              {error && (
                <Alert variant="destructive" className="bg-red-50 text-red-900 border-red-200 rounded-2xl animate-in shake-1 duration-300">
                  <AlertDescription className="font-bold text-xs uppercase tracking-tight flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" /> {error}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label className="text-slate-400 font-black uppercase text-[9px] tracking-[0.2em] ml-1">Email del Usuario</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    className="h-14 border-2 rounded-2xl font-bold text-lg focus-visible:ring-primary pl-12" 
                    placeholder="ej. roberto@club.com" 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-slate-400 font-black uppercase text-[9px] tracking-[0.2em] ml-1">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    className="h-14 border-2 rounded-2xl font-bold text-lg focus-visible:ring-primary pl-12" 
                    placeholder="••••••••" 
                  />
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col gap-4 p-8 pt-4">
              <Button type="submit" className="w-full h-16 text-lg font-black uppercase tracking-widest shadow-2xl shadow-primary/30 rounded-2xl transition-all hover:scale-[1.02] active:scale-95 group" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : (
                  <>
                    <ShieldCheck className="h-6 w-6 mr-2" /> 
                    <span>Entrar al Sistema</span>
                    <ArrowRight className="h-5 w-5 ml-2 opacity-0 group-hover:translate-x-1 group-hover:opacity-100 transition-all" />
                  </>
                )}
              </Button>
              
              <div className="relative py-4 w-full">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100" /></div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-[0.3em] font-black">
                  <span className="bg-white px-4 text-slate-300">Infraestructura</span>
                </div>
              </div>

              <Dialog open={isRegOpen} onOpenChange={setIsRegOpen}>
                <DialogTrigger asChild>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="w-full h-10 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-primary transition-all" 
                    disabled={loading}
                  >
                    ¿Necesitas registrar un nuevo Super Admin?
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white border-none shadow-2xl rounded-[2.5rem]">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Acceso Maestro</DialogTitle>
                    <DialogDescription className="font-bold text-slate-500">Crea una cuenta para el Administrador de Infraestructura Global.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-5 py-6">
                    <div className="space-y-2">
                      <Label className="text-slate-400 font-black uppercase text-[9px] tracking-widest ml-1">Nombre del Director</Label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input value={regForm.name} onChange={e => setRegForm({...regForm, name: e.target.value})} className="pl-12 h-14 border-2 font-bold" placeholder="Nombre completo" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-400 font-black uppercase text-[9px] tracking-widest ml-1">Email Principal</Label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input type="email" value={regForm.email} onChange={e => setRegForm({...regForm, email: e.target.value})} className="pl-12 h-14 border-2 font-bold" placeholder="admin@fluxionsport.com" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-400 font-black uppercase text-[9px] tracking-widest ml-1">Contraseña Maestro</Label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input type="password" value={regForm.password} onChange={e => setRegForm({...regForm, password: e.target.value})} className="pl-12 h-14 border-2 font-bold" placeholder="Mínimo 6 caracteres" />
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-8 border-t rounded-b-[2.5rem]">
                    <Button variant="ghost" onClick={() => setIsRegOpen(false)} className="font-bold">Cerrar</Button>
                    <Button onClick={handleRegisterSuperAdmin} disabled={loading} className="font-black uppercase text-xs tracking-widest h-14 px-10 shadow-xl shadow-primary/20 gap-2">
                      {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <><ShieldCheck className="h-5 w-5" /> Activar Perfil Maestro</>}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardFooter>
          </form>
        </Card>
        
        <p className="text-center text-[9px] font-black text-white/30 uppercase tracking-[0.5em]">Fluxion Sport © 2025 • Cloud Infrastructure</p>
      </div>
    </div>
  );
}
