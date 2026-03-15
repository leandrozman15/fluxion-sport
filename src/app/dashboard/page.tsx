
"use client";

import { useState, useEffect } from "react";
import { 
  Trophy, 
  Users, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  Activity,
  ArrowUpRight,
  Zap,
  Database,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Globe,
  Building2,
  Flag,
  UserRoundSearch
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useFirebase } from "@/firebase";
import { doc, setDoc, collection, getDocs, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { initiateAnonymousSignIn } from "@/firebase/non-blocking-login";
import { 
  demoFederations, 
  demoAssociations, 
  demoClubs, 
  demoPlayers, 
  demoTournaments, 
  demoStandings,
  demoMatches
} from "@/lib/mock-data";

export default function DashboardPage() {
  const { firestore, user, auth, isUserLoading } = useFirebase();
  const { toast } = useToast();
  const [seeding, setSeeding] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRole() {
      if (!user || !firestore) return;
      const userDoc = await getDoc(doc(firestore, "users", user.uid));
      if (userDoc.exists()) {
        setUserRole(userDoc.data().role);
      }
    }
    fetchRole();
  }, [user, firestore]);

  const handleSeedData = async () => {
    if (!firestore) return;
    if (!user) {
      initiateAnonymousSignIn(auth);
      return;
    }

    setSeeding(true);
    try {
      // 1. Cargar Usuario Admin (Tú)
      await setDoc(doc(firestore, "users", user.uid), {
        id: user.uid,
        name: user.displayName || "Administrador Demo",
        email: user.email || "demo@ejemplo.com",
        role: "admin",
        createdAt: new Date().toISOString()
      }, { merge: true });

      // 2. Cargar Federación
      for (const fed of demoFederations) {
        await setDoc(doc(firestore, "federations", fed.id), { ...fed, ownerId: user.uid, createdAt: new Date().toISOString() });
      }
      
      // 3. Cargar Asociación
      for (const assoc of demoAssociations) {
        await setDoc(doc(firestore, "federations", assoc.federationId, "associations", assoc.id), { ...assoc, createdAt: new Date().toISOString() });
      }

      // 4. Cargar Clubes
      for (const club of demoClubs) {
        await setDoc(doc(firestore, "clubs", club.id), { ...club, ownerId: user.uid, createdAt: new Date().toISOString() });
        const divId = "div-inferiores-" + club.id;
        await setDoc(doc(firestore, "clubs", club.id, "divisions", divId), { id: divId, clubId: club.id, name: "Divisiones Inferiores", createdAt: new Date().toISOString() });
        const subId = "sub-7ma-" + club.id;
        await setDoc(doc(firestore, "clubs", club.id, "divisions", divId, "subcategories", subId), { id: subId, divisionId: divId, name: "7ma División", ageRange: "13-14 años", createdAt: new Date().toISOString() });
        const teamId = "team-a-" + club.id;
        await setDoc(doc(firestore, "clubs", club.id, "divisions", divId, "subcategories", subId, "teams", teamId), { id: teamId, name: club.name + " A", coachName: "Coach " + club.name, season: "2025", createdAt: new Date().toISOString() });

        // 5. Cargar Jugadores e índice global
        if (club.id === "club-vic") {
          let isFirst = true;
          for (const player of demoPlayers) {
            const pId = doc(collection(firestore, "clubs", club.id, "players")).id;
            const pEmail = isFirst ? (user.email || "demo-player@example.com") : player.email;
            const pData = { ...player, id: pId, clubId: club.id, email: pEmail, clubName: club.name, createdAt: new Date().toISOString() };
            await setDoc(doc(firestore, "clubs", club.id, "players", pId), pData);
            
            // Índice global para la "Puerta Jugadores"
            await setDoc(doc(firestore, "all_players_index", pId), {
              id: pId, firstName: player.firstName, lastName: player.lastName, photoUrl: player.photoUrl, clubName: club.name, clubId: club.id
            });

            isFirst = false;
          }
        }
      }

      toast({ title: "¡Ecosistema Poblado!", description: "Se han cargado las 4 capas del sistema. Explora el Sidebar." });
      window.location.reload(); // Recargar para actualizar sidebar
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error al cargar datos" });
    } finally {
      setSeeding(false);
    }
  };

  if (isUserLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline text-foreground">SportsManager Platform</h1>
          <p className="text-muted-foreground">Sistema Integral de Gestión Federativa y de Clubes.</p>
        </div>
        <div className="flex gap-2">
          {!user ? (
            <Button onClick={() => initiateAnonymousSignIn(auth)} className="gap-2">
              <ShieldCheck className="h-4 w-4" /> Iniciar Sesión para Probar
            </Button>
          ) : (
            <Button variant="outline" onClick={handleSeedData} disabled={seeding} className="border-primary text-primary hover:bg-primary/5">
              {seeding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Database className="h-4 w-4 mr-2" />}
              Poblar Ecosistema Nacional
            </Button>
          )}
        </div>
      </header>

      {/* Vista de las 4 Puertas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/dashboard/cah" className="group">
          <Card className="hover:border-primary transition-all cursor-pointer h-full bg-primary/5">
            <CardHeader className="pb-2">
              <Database className="h-8 w-8 text-primary mb-2 group-hover:scale-110 transition-transform" />
              <CardTitle className="text-lg">CAH / Sistema</CardTitle>
              <CardDescription>Control nacional y reglamentación.</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/dashboard/federations" className="group">
          <Card className="hover:border-primary transition-all cursor-pointer h-full bg-accent/5">
            <CardHeader className="pb-2">
              <Globe className="h-8 w-8 text-accent mb-2 group-hover:scale-110 transition-transform" />
              <CardTitle className="text-lg">Federaciones</CardTitle>
              <CardDescription>Gestión regional y asociaciones.</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/dashboard/clubs" className="group">
          <Card className="hover:border-primary transition-all cursor-pointer h-full">
            <CardHeader className="pb-2">
              <Building2 className="h-8 w-8 text-primary mb-2 group-hover:scale-110 transition-transform" />
              <CardTitle className="text-lg">Instituciones</CardTitle>
              <CardDescription>Administración de clubes y equipos.</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/dashboard/player/search" className="group">
          <Card className="hover:border-primary transition-all cursor-pointer h-full">
            <CardHeader className="pb-2">
              <UserRoundSearch className="h-8 w-8 text-muted-foreground mb-2 group-hover:scale-110 transition-transform" />
              <CardTitle className="text-lg">Jugadores</CardTitle>
              <CardDescription>Base de datos nacional y pases.</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Actividad del Sistema
            </CardTitle>
            <CardDescription>Movimientos globales detectados recientemente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Validación de Carnet", desc: "Federación Buenos Aires validó 45 nuevos jugadores", icon: ShieldCheck },
              { label: "Designación Arbitral", desc: "18 árbitros asignados para la Fecha 5 del Metropolitano", icon: Flag },
              { label: "Resultado Oficial", desc: "Vicentinos 2-1 Lomas (Validado por CAH)", icon: Trophy },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                <div className="bg-primary/10 p-2 rounded-full mt-1">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-bold block">{item.label}</span>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-sm font-bold">Guía de Arquitectura</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs opacity-90 leading-relaxed">
              <p>Este sistema replica un <strong>Modelo Federal Descentralizado</strong>:</p>
              <ul className="space-y-2 list-disc pl-4">
                <li><strong>Nacional:</strong> CAH define reglas.</li>
                <li><strong>Regional:</strong> Federaciones gestionan ligas.</li>
                <li><strong>Local:</strong> Clubes autogestionan planteles.</li>
                <li><strong>Individual:</strong> Jugadores construyen su historia.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
