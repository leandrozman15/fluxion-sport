
"use client";

import { useState } from "react";
import { 
  Trophy, 
  Users, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  ArrowUpRight,
  Target,
  Zap,
  Database,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { 
  mockTransactions, 
  demoFederations, 
  demoAssociations, 
  demoClubs, 
  demoPlayers, 
  demoTournaments, 
  demoStandings 
} from "@/lib/mock-data";
import { useFirestore, useUser } from "@/firebase";
import { doc, setDoc, collection } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const { firestore } = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [seeding, setSeeding] = useState(false);

  const totalRevenue = mockTransactions.filter(t => t.type === 'revenue').reduce((acc, t) => acc + t.amount, 0);

  const handleSeedData = async () => {
    if (!firestore || !user) return;
    setSeeding(true);
    try {
      // 1. Cargar Federación
      for (const fed of demoFederations) {
        await setDoc(doc(firestore, "federations", fed.id), { ...fed, ownerId: user.uid, createdAt: new Date().toISOString() });
      }
      
      // 2. Cargar Asociación
      for (const assoc of demoAssociations) {
        await setDoc(doc(firestore, "federations", assoc.federationId, "associations", assoc.id), { ...assoc, createdAt: new Date().toISOString() });
      }

      // 3. Cargar Clubes
      for (const club of demoClubs) {
        await setDoc(doc(firestore, "clubs", club.id), { ...club, ownerId: user.uid, createdAt: new Date().toISOString() });
        
        // Division e Inferiores por defecto
        const divId = "div-inferiores";
        await setDoc(doc(firestore, "clubs", club.id, "divisions", divId), { id: divId, clubId: club.id, name: "Divisiones Inferiores", createdAt: new Date().toISOString() });
        
        const subId = "sub-7ma";
        await setDoc(doc(firestore, "clubs", club.id, "divisions", divId, "subcategories", subId), { id: subId, divisionId: divId, name: "7ma División", ageRange: "13-14 años", createdAt: new Date().toISOString() });

        const teamId = "team-a";
        await setDoc(doc(firestore, "clubs", club.id, "divisions", divId, "subcategories", subId, "teams", teamId), { id: teamId, name: club.name + " A", coachName: "Entrenador Demo", season: "2025", createdAt: new Date().toISOString() });

        // 4. Cargar Jugadores al Club
        if (club.id === "club-vic") {
          for (const player of demoPlayers) {
            const pId = doc(collection(firestore, "clubs", club.id, "players")).id;
            await setDoc(doc(firestore, "clubs", club.id, "players", pId), { ...player, id: pId, clubId: club.id, createdAt: new Date().toISOString() });
          }
        }

        // 5. Cargar Tablas de Posiciones
        for (const s of demoStandings) {
          const sId = doc(collection(firestore, "clubs", club.id, "divisions", divId, "standings")).id;
          await setDoc(doc(firestore, "clubs", club.id, "divisions", divId, "standings", sId), { ...s, id: sId, createdAt: new Date().toISOString() });
        }
      }

      // 6. Cargar Torneo
      for (const tour of demoTournaments) {
        await setDoc(doc(firestore, "tournaments", tour.id), { ...tour, organizerId: demoFederations[0].id, organizerType: "federation", createdAt: new Date().toISOString() });
      }

      toast({ title: "¡Ecosistema Cargado!", description: "Se han creado federaciones, clubes y jugadores de ejemplo." });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error al cargar datos", description: "Asegúrate de estar autenticado." });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline text-foreground">Panel General</h1>
          <p className="text-muted-foreground">Resumen de actividad de tu ecosistema deportivo.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSeedData} disabled={seeding} className="border-primary text-primary">
            {seeding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Database className="h-4 w-4 mr-2" />}
            Cargar Ecosistema de Prueba
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/clubs">Ver Mis Clubes</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/federations">Gestionar Ligas</Link>
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Clubes Activos</CardTitle>
            <Trophy className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">12</div>
            <p className="text-[10px] text-green-600 font-bold flex items-center gap-1 mt-1">
              <ArrowUpRight className="h-3 w-3" /> +2 esta temporada
            </p>
          </CardContent>
        </Card>

        <Card className="bg-accent/5 border-accent/20">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Jugadores Federados</CardTitle>
            <Users className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">842</div>
            <p className="text-[10px] text-muted-foreground font-bold mt-1">95% con carnet activo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Ingresos (Mock)</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">${totalRevenue.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Recaudación mensual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Efectividad</CardTitle>
            <Target className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">78%</div>
            <div className="w-full bg-secondary h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-orange-500 h-full w-[78%]"></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" /> Actividad Reciente
            </CardTitle>
            <CardDescription>Eventos y movimientos administrativos de las últimas 24hs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Nuevo Jugador", desc: "Mateo G. se inscribió en Real Madrid C.F.", time: "Hace 2hs", icon: Activity },
              { label: "Planilla Presentada", desc: "9na A presentó alineación vs C.D. Leones", time: "Hace 5hs", icon: CalendarIcon },
              { label: "Resultado Cargado", desc: "Arbitro P. registró 2-1 en Primera Div.", time: "Ayer", icon: Trophy },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                <div className="bg-primary/10 p-2 rounded-full mt-1">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold">{item.label}</span>
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">{item.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Ecosistema Demo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs opacity-90 leading-relaxed">
                Usa el botón superior para cargar automáticamente:<br/>
                • 1 Federación (CAH)<br/>
                • 1 Asociación Regional<br/>
                • 3 Clubes de Hockey<br/>
                • Plantillas y Tablas de Posiciones
              </p>
              <Button variant="secondary" size="sm" className="w-full text-xs font-bold" onClick={handleSeedData}>
                Poblar Sistema Ahora
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold">Estado de la Red</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="opacity-80">Torneos en Curso</span>
                <span className="font-bold">4</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="opacity-80">Árbitros Disponibles</span>
                <span className="font-bold">18</span>
              </div>
              <Button variant="outline" size="sm" className="w-full text-xs font-bold" asChild>
                <Link href="/dashboard/staff">Gestionar Staff</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
