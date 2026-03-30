"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Trophy, 
  Users, 
  Calendar as CalendarIcon, 
  Activity,
  Database,
  Loader2,
  ShieldCheck,
  Globe,
  Building2,
  Flag,
  UserRoundSearch,
  Sparkles,
  ArrowRight,
  Zap
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useFirebase, initiateAnonymousSignIn } from "@/firebase";
import { doc, setDoc, collection, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { 
  demoFederations, 
  demoAssociations, 
  demoClubs, 
  demoPlayers 
} from "@/lib/mock-data";

export default function DashboardPage() {
  const { firestore, user, auth, isUserLoading } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const [seeding, setSeeding] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkRoleAndRedirect() {
      if (!user) {
        setIsAuthorized(false);
        return;
      }
      try {
        const userDoc = await getDoc(doc(firestore, "users", user.uid));
        if (userDoc.exists()) {
          const role = userDoc.data().role;
          if (role === 'coach') {
            router.replace('/dashboard/coach');
            return;
          }
          if (role === 'player') {
            router.replace('/dashboard/player');
            return;
          }
          if (role === 'coordinator') {
            router.replace('/dashboard/coordinator');
            return;
          }
          setIsAuthorized(true);
        } else {
          setIsAuthorized(true);
        }
      } catch (e) {
        setIsAuthorized(true);
      }
    }
    if (!isUserLoading) checkRoleAndRedirect();
  }, [user, isUserLoading, firestore, router]);

  const handleSeedData = async () => {
    if (!firestore || !user) {
      initiateAnonymousSignIn(auth);
      return;
    }

    setSeeding(true);
    try {
      await setDoc(doc(firestore, "users", user.uid), {
        id: user.uid,
        name: user.displayName || "SuperAdmin Fluxion Sport",
        email: user.email || "admin@fluxionsport.app",
        role: "admin",
        createdAt: new Date().toISOString()
      }, { merge: true });

      for (const fed of demoFederations) {
        await setDoc(doc(firestore, "federations", fed.id), { ...fed, ownerId: user.uid, createdAt: new Date().toISOString() });
      }
      
      for (const assoc of demoAssociations) {
        await setDoc(doc(firestore, "federations", assoc.federationId, "associations", assoc.id), { ...assoc, createdAt: new Date().toISOString() });
      }

      for (const club of demoClubs) {
        await setDoc(doc(firestore, "clubs", club.id), { ...club, ownerId: user.uid, createdAt: new Date().toISOString() });
        const divId = "div-inferiores-" + club.id;
        await setDoc(doc(firestore, "clubs", club.id, "divisions", divId), { id: divId, clubId: club.id, name: "Divisiones Inferiores", createdAt: new Date().toISOString() });
        
        const teamId = "team-a-" + club.id;
        await setDoc(doc(firestore, "clubs", club.id, "divisions", divId, "teams", teamId), { 
          id: teamId, 
          name: club.name + " A", 
          coachName: "Camila Entrenadora", 
          season: "2025", 
          createdAt: new Date().toISOString() 
        });

        if (club.id === "club-lomas") {
          for (const player of demoPlayers) {
            const pId = doc(collection(firestore, "clubs", club.id, "players")).id;
            const pData = { ...player, id: pId, clubId: club.id, clubName: club.name, createdAt: new Date().toISOString() };
            await setDoc(doc(firestore, "clubs", club.id, "players", pId), pData);
            
            await setDoc(doc(firestore, "all_players_index", pId), {
              id: pId, 
              firstName: player.firstName, 
              lastName: player.lastName, 
              photoUrl: player.photoUrl, 
              clubName: club.name, 
              clubId: club.id,
              email: player.email
            });
          }
        }
      }

      toast({ title: "¡Ecosistema Creado!", description: "Ahora tienes perfil de SuperAdmin y acceso a todas las funciones." });
      window.location.reload(); 
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error al cargar datos" });
    } finally {
      setSeeding(false);
    }
  };

  if (isUserLoading || isAuthorized === null) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>;

  return (
    <div className="space-y-10 max-w-7xl mx-auto py-2 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-white drop-shadow-md flex items-center gap-3">
            Fluxion Sport <Sparkles className="h-6 w-6 text-accent" />
          </h1>
          <p className="text-white/80 font-bold text-lg">Consola de Administración Central y Desarrollo.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant={seeding ? "secondary" : "default"} 
            size="lg" 
            onClick={handleSeedData} 
            disabled={seeding} 
            className="font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 gap-2 h-14 px-8 bg-primary hover:bg-primary/90 text-white"
          >
            {seeding ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5 fill-current text-accent" />}
            Poblar Ecosistema Completo
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: "Nivel Nacional", desc: "CAH / Reglamentos", icon: Database, href: "/dashboard/cah", color: "bg-blue-500" },
          { title: "Regiones", desc: "Federaciones & Ligas", icon: Globe, href: "/dashboard/federations", color: "bg-accent" },
          { title: "Clubes", desc: "Gestión Institucional", icon: Building2, href: "/dashboard/clubs", color: "bg-primary" },
          { title: "Base Nacional", desc: "Padrón de Jugadores", icon: UserRoundSearch, href: "/dashboard/player/search", color: "bg-slate-600" },
        ].map((item, i) => (
          <Link key={i} href={item.href} className="group">
            <Card className="border-none shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full bg-white/95">
              <CardHeader>
                <div className={`${item.color} w-12 h-12 rounded-xl flex items-center justify-center text-white mb-2 shadow-inner group-hover:scale-110 transition-transform`}>
                  <item.icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl font-black text-slate-900">{item.title}</CardTitle>
                <CardDescription className="font-medium text-slate-500">{item.desc}</CardDescription>
              </CardHeader>
              <CardFooter className="pt-0">
                <div className="text-primary text-xs font-black uppercase tracking-widest flex items-center gap-1 group-hover:gap-2 transition-all">
                  Acceder <ArrowRight className="h-3 w-3" />
                </div>
              </CardFooter>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-sm bg-white/95">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl font-black text-slate-900">
              <Activity className="h-6 w-6 text-primary" /> Monitoreo del Sistema
            </CardTitle>
            <CardDescription className="font-medium">Resumen de actividad en tiempo real a través de todos los niveles.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Validación de Carnet", desc: "Federación Buenos Aires validó 45 nuevos jugadores", icon: ShieldCheck, time: "Hace 10m" },
              { label: "Designación Arbitral", desc: "18 árbitros asignados para la Fecha 5 del Metropolitano", icon: Flag, time: "Hace 1h" },
              { label: "Resultado Oficial", desc: "Lomas 2-1 Mitre (Validado por CAH)", icon: Trophy, time: "Hace 2h" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-muted/30 border border-transparent hover:border-primary/10 transition-all">
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-black uppercase tracking-tight text-slate-900">{item.label}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase">{item.time}</span>
                  </div>
                  <p className="text-sm text-slate-500 font-medium">{item.desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-primary text-primary-foreground border-none shadow-xl shadow-primary/20 relative overflow-hidden">
            <CardHeader className="relative z-10">
              <CardTitle className="text-lg font-black uppercase tracking-tight">Resumen de Acceso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm opacity-90 leading-relaxed relative z-10 font-medium">
              <p>Tu perfil actual tiene privilegios de SuperAdmin:</p>
              <ul className="space-y-3">
                <li className="flex gap-2 items-center"><Badge className="bg-white/20 hover:bg-white/30 border-none font-bold">✓</Badge> Visibilidad de Pizarra Táctica.</li>
                <li className="flex gap-2 items-center"><Badge className="bg-white/20 hover:bg-white/30 border-none font-bold">✓</Badge> Gestión de Clubes y Tiendas.</li>
                <li className="flex gap-2 items-center"><Badge className="bg-white/20 hover:bg-white/30 border-none font-bold">✓</Badge> Acceso a Carnets de Jugadores.</li>
              </ul>
            </CardContent>
            <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
              <Building2 className="h-40 w-40 rotate-12" />
            </div>
          </Card>

          <Card className="border-accent/30 border-2 bg-accent/5">
            <CardHeader>
              <CardTitle className="text-xs font-black uppercase tracking-widest text-accent-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Consola de Control
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-white/80 font-bold italic leading-relaxed">
                Usa el menú lateral para saltar entre las vistas de Entrenador, Coordinador o Jugador sin cambiar de cuenta.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}