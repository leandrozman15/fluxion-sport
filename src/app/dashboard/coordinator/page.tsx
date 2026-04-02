
"use client";

import { useState, useEffect } from "react";
import { 
  Loader2, 
  Layers, 
  TrendingUp, 
  Building2,
  Calendar,
  ShieldCheck,
  CreditCard,
  Trophy,
  Plus,
  Table as TableIcon,
  CalendarDays,
  Shield,
  ArrowRight,
  Users
} from "lucide-react";
import Link from "next/link";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SectionNav } from "@/components/layout/section-nav";
import { LiveMatchesCard } from "@/components/dashboard/live-matches-card";

export default function CoordinatorDashboard() {
  const { firestore, user } = useFirebase();
  const [club, setClub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recentResults, setRecentResults] = useState<any[]>([]);

  useEffect(() => {
    async function fetchCoordinatorContext() {
      if (!user || !firestore) return;
      try {
        const email = user.email?.toLowerCase().trim();
        const staffQuery = query(collection(firestore, "users"), where("email", "==", email));
        const staffSnap = await getDocs(staffQuery);
        
        if (!staffSnap.empty) {
          const staffData = staffSnap.docs[0].data();
          if (staffData.clubId) {
            const clubDoc = await getDoc(doc(firestore, "clubs", staffData.clubId));
            if (clubDoc.exists()) {
              setClub({ ...clubDoc.data(), id: clubDoc.id });
              
              const divsSnap = await getDocs(collection(firestore, "clubs", clubDoc.id, "divisions"));
              const results: any[] = [];
              
              for (const divDoc of divsSnap.docs) {
                const teamsSnap = await getDocs(collection(firestore, "clubs", clubDoc.id, "divisions", divDoc.id, "teams"));
                for (const teamDoc of teamsSnap.docs) {
                  const eventsSnap = await getDocs(query(
                    collection(firestore, "clubs", clubDoc.id, "divisions", divDoc.id, "teams", teamDoc.id, "events"),
                    where("type", "==", "match"),
                    where("status", "==", "played")
                  ));
                  eventsSnap.forEach(ev => results.push({ ...ev.data(), teamName: teamDoc.data().name, divName: divDoc.data().name }));
                }
              }
              setRecentResults(results.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3));
            }
          }
        }
      } catch (e) { 
        console.error("Error en dashboard de coordinador:", e); 
      } finally { 
        setLoading(false); 
      }
    }
    fetchCoordinatorContext();
  }, [user, firestore]);

  const divsQuery = useMemoFirebase(() => {
    if (!firestore || !club) return null;
    return collection(firestore, "clubs", club.id, "divisions");
  }, [firestore, club]);
  const { data: divisions } = useCollection(divsQuery);

  const coordNav = [
    { title: "Dashboard", href: "/dashboard/coordinator", icon: Trophy },
    { title: "Rivales", href: club ? `/dashboard/clubs/${club.id}/opponents` : "#", icon: Shield },
    { title: "Gestor Fixture", href: club ? `/dashboard/clubs/${club.id}/fixture` : "#", icon: CalendarDays },
    { title: "Categorías", href: club ? `/dashboard/clubs/${club.id}/divisions` : "#", icon: Layers },
    { title: "Staff Técnico", href: club ? `/dashboard/clubs/${club.id}/coaches` : "#", icon: Users },
    { title: "Tesorería", href: club ? `/dashboard/clubs/${club.id}/finances` : "#", icon: CreditCard },
  ];

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[80vh] space-y-4">
      <Loader2 className="animate-spin text-white h-12 w-12" />
      <p className="text-white font-black uppercase tracking-widest text-[10px]">Cargando Consola Deportiva...</p>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row gap-8 animate-in fade-in duration-500">
      <SectionNav items={coordNav} basePath="/dashboard/coordinator" />
      
      <div className="flex-1 space-y-8 pb-24 px-4 md:px-0">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-4 border-white/20 shadow-2xl">
              <AvatarImage src={club?.logoUrl} />
              <AvatarFallback className="bg-primary/10 text-primary font-black"><Building2 /></AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-4xl font-black font-headline text-white drop-shadow-md">Coordinación: {club?.name}</h1>
              <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 mt-1">
                <ShieldCheck className="h-3.5 w-3.5 text-accent" /> Control de Competencia y Ramas
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild className="bg-white text-primary hover:bg-slate-50 border-none h-12 font-black uppercase text-[10px] tracking-widest px-6 shadow-xl">
              <Link href={`/dashboard/clubs/${club?.id}/opponents`}><Shield className="h-4 w-4 mr-2" /> Clubes Rivales</Link>
            </Button>
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90 font-black uppercase text-[10px] tracking-widest h-12 px-6 shadow-xl">
              <Link href={`/dashboard/clubs/${club?.id}/fixture`}><Plus className="h-4 w-4 mr-2" /> Armar Fixture</Link>
            </Button>
          </div>
        </header>

        <LiveMatchesCard clubId={club?.id} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white border-none shadow-xl border-l-8 border-l-primary rounded-2xl">
            <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Ramas Activas</CardTitle></CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-slate-900">{divisions?.length || 0}</div>
              <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Divisiones en torneo</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-none shadow-xl border-l-8 border-l-accent rounded-2xl">
            <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Monitor Liga</CardTitle></CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-slate-900">Activo</div>
              <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Sedes y Rivales OK</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-none shadow-xl border-l-8 border-l-green-500 rounded-2xl">
            <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tablas OK</CardTitle></CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-green-600">100%</div>
              <p className="text-[9px] text-green-600 font-bold uppercase mt-1">Posiciones actualizadas</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-none shadow-xl border-l-8 border-l-blue-600 relative overflow-hidden rounded-2xl">
            <CardHeader className="pb-2 relative z-10"><CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Fixture 2025</CardTitle></CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-black text-blue-600">Activo</div>
              <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Gestión de calendarios</p>
            </CardContent>
            <CalendarDays className="absolute right-[-10px] bottom-[-10px] h-24 w-24 text-blue-50 opacity-20 rotate-12" />
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-2xl bg-white overflow-hidden rounded-3xl">
              <CardHeader className="bg-slate-50 border-b border-slate-100 py-6 px-8">
                <CardTitle className="text-xl font-black flex items-center gap-3 text-slate-900">
                  <Layers className="h-6 w-6 text-primary" /> Organización por Ramas
                </CardTitle>
                <CardDescription className="font-medium text-slate-500">Gestión de divisiones, subcategorías y tablas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6 px-8 pb-8">
                {divisions?.map((div: any) => (
                  <div key={div.id} className="flex flex-col p-5 rounded-2xl border-2 border-slate-50 hover:border-primary/20 bg-white transition-all group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <div className="bg-primary/5 p-3 rounded-xl group-hover:scale-110 transition-transform">
                          {div.sport === 'rugby' ? <Calendar className="h-6 w-6 text-primary" /> : <Trophy className="h-6 w-6 text-primary" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-slate-900 text-white text-[8px] font-black uppercase px-2 h-4">{div.sport?.toUpperCase()}</Badge>
                            <Badge variant="outline" className="text-[8px] font-black uppercase px-2 h-4 border-primary text-primary">{div.gender || 'Femenino'}</Badge>
                          </div>
                          <p className="font-black text-lg text-slate-900 leading-none">{div.name}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild className="h-9 gap-2 text-[9px] font-black uppercase border-slate-200 text-slate-600 hover:bg-slate-50">
                          <Link href={`/dashboard/clubs/${club.id}/divisions/${div.id}/standings`}><TableIcon className="h-3 w-3" /> Tabla Pos.</Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild className="h-9 w-9 p-0 rounded-full hover:bg-primary hover:text-white transition-colors">
                          <Link href={`/dashboard/clubs/${club.id}/divisions`}><ArrowRight className="h-5 w-5" /></Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-none shadow-2xl bg-white overflow-hidden rounded-3xl">
              <CardHeader className="bg-slate-50 border-b border-slate-100 py-6 px-8">
                <CardTitle className="text-xl font-black flex items-center gap-3 text-green-600">
                  <TrendingUp className="h-6 w-6 text-green-600" /> Monitor de Competencia
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {recentResults.length > 0 ? (
                  <div className="divide-y divide-slate-50">
                    {recentResults.map((res, i) => (
                      <div key={i} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{res.divName} • {res.teamName}</p>
                          <h4 className="font-black text-slate-900 text-lg">VS {res.opponent}</h4>
                          <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><Calendar className="h-3 w-3" /> {new Date(res.date).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-3 bg-slate-50 text-slate-900 px-5 py-2.5 rounded-2xl border-2 border-slate-100">
                            <span className="text-2xl font-black">{res.homeScore}</span>
                            <span className="text-xs font-black opacity-40">-</span>
                            <span className="text-2xl font-black">{res.awayScore}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 italic text-slate-400 font-medium">Carga partidos para ver el monitor de resultados.</div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-white border-none shadow-2xl rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-slate-50 border-b border-slate-100 py-6 px-8">
                <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Gestión Competitiva</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-2 pt-6 px-8 pb-8">
                <Button variant="outline" className="justify-start gap-3 h-14 border-slate-100 hover:border-primary hover:bg-primary/5 text-slate-900 font-black uppercase text-[10px] tracking-widest rounded-xl shadow-sm transition-all" asChild>
                  <Link href={`/dashboard/clubs/${club?.id}/opponents`}><Shield className="h-4 w-4 text-primary" /> Base de Clubes Rivales</Link>
                </Button>
                <Button variant="outline" className="justify-start gap-3 h-14 border-slate-100 hover:border-primary hover:bg-primary/5 text-slate-900 font-black uppercase text-[10px] tracking-widest rounded-xl shadow-sm transition-all" asChild>
                  <Link href={`/dashboard/clubs/${club?.id}/fixture`}><CalendarDays className="h-4 w-4 text-primary" /> Armar Fixture Anual</Link>
                </Button>
                <Button variant="outline" className="justify-start gap-3 h-14 border-slate-100 hover:border-primary hover:bg-primary/5 text-slate-900 font-black uppercase text-[10px] tracking-widest rounded-xl shadow-sm transition-all" asChild>
                  <Link href={`/dashboard/clubs/${club?.id}/divisions`}><Layers className="h-4 w-4 text-primary" /> Subdivisiones y Equipos</Link>
                </Button>
              </CardContent>
            </Card>

            <div className="p-8 bg-white/10 backdrop-blur-md rounded-[2.5rem] border border-white/20 text-center space-y-4 shadow-xl">
              <Calendar className="h-10 w-10 text-white mx-auto opacity-50" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Configuración de Ramas</p>
              <Button variant="outline" asChild className="w-full bg-white text-slate-900 hover:bg-slate-50 font-black uppercase text-[10px] tracking-widest h-12 border-none shadow-lg rounded-xl">
                <Link href={`/dashboard/clubs/${club?.id}/divisions`}>Administrar Categorías</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
