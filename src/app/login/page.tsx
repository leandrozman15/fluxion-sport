
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
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
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
      handleRedirect(user);
    }
  }, [user, isUserLoading]);

  const handleRedirect = async (currentUser: any) => {
    try {
      const userEmail = currentUser.email?.toLowerCase().trim() || "";
      let role = null;
      let clubId = null;

      // Buscar perfil por UID o Email
      const uidSnap = await getDoc(doc(firestore, "users", currentUser.uid));
      if (uidSnap.exists()) {
        role = uidSnap.data().role;
        clubId = uidSnap.data().clubId;
      } else {
        const staffSnap = await getDocs(query(collection(firestore, "users"), where("email", "==", userEmail)));
        if (!staffSnap.empty) {
          role = staffSnap.docs[0].data().role;
          clubId = staffSnap.docs[0].data().clubId;
        } else {
          const playerSnap = await getDocs(query(collection(firestore, "all_players_index"), where("email", "==", userEmail)));
          if (!playerSnap.empty) {
            role = 'player';
            clubId = playerSnap.docs[0].data().clubId;
          }
        }
      }

      if (role === 'coach') router.replace('/dashboard/coach');
      else if (role === 'admin' || role === 'fed_admin') router.replace('/dashboard');
      else if (role === 'coordinator' || role === 'club_admin') router.replace(clubId ? `/dashboard/clubs/${clubId}` : '/dashboard/clubs');
      else if (role === 'player') router.replace('/dashboard/player');
      else router.replace('/dashboard');

    } catch (e) {
      router.replace('/dashboard');
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

  const handleDeveloperAccess = () => {
    initiateAnonymousSignIn(auth);
    toast({ title: "Acceso Developer" });
  };

  if (isUserLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-4">
          <div className="bg-primary p-4 rounded-3xl inline-block shadow-2xl border-4 border-white">
            <Trophy className="h-12 w-12 text-primary-foreground" />
          </div>
          <h1 className="text-5xl font-black text-white drop-shadow-md">Fluxion Sport</h1>
        </div>

        <Card className="shadow-2xl border-none">
          <CardHeader>
            <CardTitle className="text-2xl font-black">Acceso Oficial</CardTitle>
            <CardDescription>Ingresa para gestionar tu institución o equipo.</CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              <div className="space-y-2">
                <Label>Email Institucional</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Contraseña</Label>
                <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full h-14 text-lg font-black" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                Ingresar
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={handleDeveloperAccess}>
                <Zap className="h-4 w-4 text-accent fill-current" />
                Modo Desarrollador
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
