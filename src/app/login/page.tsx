
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Trophy, 
  Loader2, 
  Mail, 
  Lock, 
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  Zap
} from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useFirebase, initiateAnonymousSignIn } from "@/firebase";
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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && !isUserLoading) {
      handleRedirectByRole(user.uid);
    }
  }, [user, isUserLoading]);

  const handleRedirectByRole = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(firestore, "users", uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const role = data.role;
        const clubId = data.clubId;

        switch (role) {
          case 'admin':
          case 'fed_admin':
            router.replace('/dashboard');
            break;
          case 'coordinator':
          case 'club_admin':
            router.replace(clubId ? `/dashboard/clubs/${clubId}` : '/dashboard/clubs');
            break;
          case 'coach':
            router.replace('/dashboard/coach');
            break;
          case 'player':
            router.replace('/dashboard/player');
            break;
          default:
            router.replace('/dashboard/player');
        }
      } else {
        router.replace('/dashboard');
      }
    } catch (e) {
      console.error(e);
      router.replace('/dashboard');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Bienvenido",
        description: "Acceso concedido correctamente.",
      });
    } catch (err: any) {
      console.error(err);
      setError("Credenciales inválidas. Por favor, revisa tus datos.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeveloperAccess = () => {
    initiateAnonymousSignIn(auth);
    toast({
      title: "Modo Desarrollador",
      description: "Iniciando sesión temporal para configuración de ecosistema.",
    });
  };

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-4">
          <div className="bg-primary p-4 rounded-3xl inline-block shadow-2xl shadow-primary/40 mb-2 border-4 border-white">
            <Trophy className="h-12 w-12 text-primary-foreground" />
          </div>
          <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm">
            <h1 className="text-5xl font-black tracking-tighter text-slate-900 drop-shadow-sm">Fluxion Sport</h1>
            <p className="text-primary font-black uppercase tracking-[0.3em] text-xs mt-2">Plataforma de Gestión Deportiva</p>
          </div>
        </div>

        <Card className="shadow-2xl border-none bg-white/95 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-black text-slate-800">Acceso Oficial</CardTitle>
            <CardDescription className="text-slate-500 font-medium">Ingresa tus credenciales para administrar tu institución.</CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive" className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="font-bold">{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email" className="font-bold text-slate-700">Email Institucional</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    id="email"
                    type="email" 
                    placeholder="usuario@club.com" 
                    className="pl-10 h-12"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="font-bold text-slate-700">Contraseña</Label>
                  <Button variant="link" size="sm" className="px-0 h-auto text-xs text-primary font-black uppercase tracking-tighter">
                    Recuperar Clave
                  </Button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    id="password"
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    className="pl-10 pr-10 h-12"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-slate-400"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full h-14 text-lg font-black gap-2 shadow-xl shadow-primary/30" disabled={loading}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                Ingresar al Sistema
              </Button>
              
              <div className="relative w-full py-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200" /></div>
                <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest text-slate-400"><span className="bg-white px-4">Acceso Rápido</span></div>
              </div>

              <Button 
                type="button" 
                variant="outline" 
                className="w-full h-12 border-2 border-accent/20 font-black uppercase text-[10px] tracking-widest gap-2 hover:bg-accent/10 hover:text-accent-foreground transition-all"
                onClick={handleDeveloperAccess}
              >
                <Zap className="h-4 w-4 text-accent fill-current" />
                Modo Desarrollador (SuperAdmin)
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-[10px] text-white font-black uppercase tracking-[0.4em] drop-shadow-md">
          Fluxion Sport Engine © 2026
        </p>
      </div>
    </div>
  );
}
