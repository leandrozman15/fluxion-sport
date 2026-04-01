
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
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
      
      // Intentamos obtener el perfil por UID primero
      const userDoc = await getDocs(query(collection(firestore, "users"), where("id", "==", currentUser.uid)));
      let data = !userDoc.empty ? userDoc.docs[0].data() : null;

      if (!data && userEmail) {
        // Fallback por email
        const staffSnap = await getDocs(query(collection(firestore, "users"), where("email", "==", userEmail)));
        if (!staffSnap.empty) data = staffSnap.docs[0].data();
      }

      if (data) {
        const role = data.role;
        const clubId = data.clubId;

        if (role === 'admin' || role === 'fed_admin') {
          router.replace('/dashboard/superadmin');
        } else if (role === 'coordinator') {
          router.replace('/dashboard/coordinator');
        } else if (role === 'coach') {
          router.replace('/dashboard/coach');
        } else if (clubId) {
          router.replace(`/dashboard/clubs/${clubId}`);
        } else {
          router.replace('/dashboard/clubs');
        }
      } else {
        // Si no es staff, buscar en Jugadores
        const playerSnap = await getDocs(query(collection(firestore, "all_players_index"), where("email", "==", userEmail)));
        if (!playerSnap.empty) {
          router.replace('/dashboard/player');
        } else {
          router.replace('/dashboard/clubs');
        }
      }

    } catch (e) {
      console.error("Error en redirección:", e);
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
      
      // Creamos/Actualizamos el perfil de Super Admin en Firestore
      await setDoc(doc(firestore, "users", user.uid), {
        id: user.uid,
        email: "admin@fluxionsport.com",
        name: "Director de Plataforma",
        role: "admin",
        createdAt: new Date().toISOString()
      }, { merge: true });

      toast({ 
        title: "Perfil de Super Admin Activo", 
        description: "Has ingresado con permisos totales de gestión." 
      });
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-4">
          <div className="bg-primary p-4 rounded-3xl inline-block shadow-2xl border-4 border-white">
            <Trophy className="h-12 w-12 text-primary-foreground" />
          </div>
          <h1 className="text-5xl font-black text-white drop-shadow-md tracking-tighter">Fluxion Sport</h1>
          <p className="text-white/60 font-bold uppercase tracking-[0.2em] text-xs">Gestión Deportiva Profesional</p>
        </div>

        <Card className="shadow-2xl border-none bg-white/95 backdrop-blur-md overflow-hidden">
          <CardHeader className="bg-slate-50 border-b pb-6">
            <CardTitle className="text-2xl font-black text-slate-900">Acceso Institucional</CardTitle>
            <CardDescription className="font-medium">Ingresa a la consola de gestión de tu club.</CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4 pt-6">
              {error && <Alert variant="destructive" className="bg-red-50 text-red-900 border-red-200"><AlertDescription className="font-bold">{error}</AlertDescription></Alert>}
              <div className="space-y-2">
                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 border-2" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Contraseña</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-12 border-2" />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 p-6 pt-2">
              <Button type="submit" className="w-full h-14 text-lg font-black shadow-xl shadow-primary/20 gap-2" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                Ingresar al Club
              </Button>
              
              <div className="relative w-full py-4">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400 font-black">Opciones de Soporte</span></div>
              </div>

              <Button 
                type="button" 
                variant="outline" 
                className="w-full h-12 text-xs font-black uppercase tracking-widest border-2 border-red-100 text-red-600 hover:bg-red-50 gap-2 transition-all" 
                onClick={handleSuperAdminAccess}
                disabled={loading}
              >
                <ShieldAlert className="h-4 w-4" />
                Acceso Super Administrador
              </Button>

              <Button type="button" variant="ghost" className="w-full text-slate-400 text-[10px] font-bold uppercase" onClick={() => router.push('/')}>
                <Zap className="h-3 w-3 mr-2" /> Volver al Inicio
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
