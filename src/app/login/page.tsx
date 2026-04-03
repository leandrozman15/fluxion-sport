
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Trophy, 
  Loader2, 
  ShieldCheck,
  Zap,
  ShieldAlert
} from "lucide-react";
import { signInWithEmailAndPassword, signInAnonymously } from "firebase/auth";
import { doc, collection, query, where, getDocs } from "firebase/firestore";
import { useFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";

export default function LoginPage() {
  const { auth, firestore, user, isUserLoading } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && !isUserLoading) {
      handleRedirect(user);
    }
  }, [user, isUserLoading]);

  const handleRedirect = async (currentUser: any) => {
    try {
      const userEmail = currentUser.email?.toLowerCase().trim() || "";
      
      const staffSnap = await getDocs(query(collection(firestore, "users"), where("email", "==", userEmail)));
      
      if (!staffSnap.empty) {
        const data = staffSnap.docs[0].data();
        const role = data.role;
        const clubId = data.clubId;

        if (role === 'admin' || role === 'fed_admin') {
          router.replace('/dashboard/superadmin');
        } else if (role === 'coordinator') {
          router.replace('/dashboard/coordinator');
        } else if (['coach', 'coach_lvl1', 'coach_lvl2'].includes(role)) {
          router.replace('/dashboard/coach');
        } else if (role === 'club_admin' || clubId) {
          router.replace(clubId ? `/dashboard/clubs/${clubId}` : '/dashboard/clubs');
        } else {
          router.replace('/dashboard/clubs');
        }
      } else {
        const playerSnap = await getDocs(query(collection(firestore, "all_players_index"), where("email", "==", userEmail)));
        if (!playerSnap.empty) {
          router.replace('/dashboard/player');
        } else {
          router.replace('/dashboard/clubs');
        }
      }
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

  const handleSuperAdminAccess = async () => {
    setLoading(true);
    try {
      const cred = await signInAnonymously(auth);
      const user = cred.user;
      
      // Creamos el primer usuario (Super Admin) de forma no bloqueante
      // Esto garantiza que el perfil exista en la base de datos específica
      setDocumentNonBlocking(doc(firestore, "users", user.uid), {
        id: user.uid,
        email: "admin@fluxionsport.com",
        name: "Director de Plataforma",
        role: "admin",
        createdAt: new Date().toISOString()
      }, { merge: true });

      toast({ title: "Perfil de Super Admin Activo" });
      
      // Redirección inmediata aprovechando el cache local
      router.replace('/dashboard/superadmin');
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Error al activar super admin" });
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
      {/* Fondo decorativo */}
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

              <Button 
                type="button" 
                variant="outline" 
                className="w-full h-14 text-[10px] font-black uppercase tracking-[0.2em] border-2 border-red-50 text-red-500 hover:bg-red-50 hover:border-red-100 gap-3 rounded-2xl transition-all" 
                onClick={handleSuperAdminAccess}
                disabled={loading}
              >
                <ShieldAlert className="h-5 w-5" />
                Crear Super Administrador
              </Button>
            </CardFooter>
          </form>
        </Card>
        
        <p className="text-center text-[9px] font-black text-white/30 uppercase tracking-[0.5em]">Fluxion Sport © 2025 • Infraestructura Cloud</p>
      </div>
    </div>
  );
}
