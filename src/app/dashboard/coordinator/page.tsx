
"use client";

import { useState, useEffect } from "react";
import { 
  Briefcase, 
  Loader2, 
  Users, 
  Layers, 
  TrendingUp, 
  AlertCircle,
  Building2,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  ShoppingBag,
  Settings,
  Trophy,
  Activity,
  Plus
} from "lucide-react";
import Link from "next/link";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SectionNav } from "@/components/layout/section-nav";

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
              
              // Cargar algunos resultados recientes de cualquier categoría para el feed
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

  const staffQuery = useMemoFirebase(() => {
    if (!firestore || !club) return null;
    return query(collection(firestore, "users"), where("clubId", "==", club.id));
  }, [firestore, club]);
  const { data: staff } = useCollection(staffQuery);

  const coordNav = [
    { title: "Dashboard", href: "/dashboard/coordinator", icon: Trophy },
    { title: "Categorías", href: club ? `/dashboard/clubs/${club.id}/divisions` : "#", icon: Layers },
    { title: "Staff Técnico", href: club ? `/dashboard/clubs/${club.id}/coaches` : "#", icon: Users },
    { title: "Tesorería", href: club ? `/dashboard/clubs/${club.id}/finances` : "#", icon: CreditCard },
    { title: "Tienda Club", href: club ? `/dashboard/clubs/${club.id}/shop` : "#", icon: ShoppingBag },
  ];

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[80vh] space-y-4">
      <Loader2 className="animate-spin text-white h-12 w-12" />
      <p className="text-white font-black uppercase tracking-widest text-[10px]">Cargando Consola de Coordinación...</p>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row gap-8 animate-in fade-in duration-500">
      <SectionNav items={coordNav} basePath="/dashboard/coordinator" />
      
      <div className="flex-1 space-y-8 pb-24 px-4 md:px-0">
        <header className="space-y-2">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-4 border-white/20 shadow-2xl">
              <AvatarImage src={club?.logoUrl} />
              <AvatarFallback className="bg-primary/10 text-primary font-black"><Building2 /></AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-4xl font-black font-headline text-white drop-shadow-md">Panel de Coordinación</h1>
              <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 mt-1">
                <ShieldCheck className="h-3.5 w-3.5 text-accent" /> {club?.name} • Gestión Técnica y Deportiva
              </p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white/95 backdrop-blur-md border-none shadow-xl border-l-8 border-l-primary">
            <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Categorías</CardTitle></CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-slate-900">{divisions?.length || 0}</div>
              <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Ramas en competencia</p>
            </CardContent>
          </Card>
          <Card className="bg-white/95 backdrop-blur-md border-none shadow-xl border-l-8 border-l-accent">
            <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Staff Activo</CardTitle></CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-slate-900">{staff?.length || 0}</div>
              <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Profesores vinculados</p>
            </CardContent>
          </Card>
          <Card className="bg-white/95 backdrop-blur-md border-none shadow-xl border-l-8 border-l-green-500">
            <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cobranza</CardTitle></CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-green-600">82%</div>
              <p className="text-[9px] text-green-600 font-bold uppercase mt-1">Efectividad mensual</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden">
            <CardHeader className="pb-2 relative z-10"><CardTitle className="text-[10px] font-black uppercase opacity-60 tracking-widest">Partidos Próximos</CardTitle></CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-black text-primary">14</div>
              <p className="text-[9px] opacity-80 font-bold uppercase mt-1">Este fin de semana</p>
            </CardContent>
            <Trophy className="absolute right-[-10px] bottom-[-10px] h-24 w-24 opacity-10 rotate-12" />
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-md">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-xl font-black flex items-center gap-3 text-slate-900">
                  <Layers className="h-6 w-6 text-primary" /> Control de Ramas y Divisiones
                </CardTitle>
                <CardDescription className="font-medium">Estado actual de la formación deportiva.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                {divisions?.map((div: any) => (
                  <div key={div.id} className="flex items-center justify-between p-5 rounded-2xl border-2 border-slate-50 hover:border-primary/20 hover:bg-slate-50/50 transition-all group">
                    <div className="flex items-center gap-5">
                      <div className="bg-primary/5 p-3 rounded-xl group-hover:scale-110 transition-transform">
                        {div.sport === 'rugby' ? <Activity className="h-6 w-6 text-primary" /> : <Trophy className="h-6 w-6 text-primary" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-slate-900 text-white text-[8px] font-black uppercase px-2 h-4">{div.sport?.toUpperCase()}</Badge>
                          <Badge variant="outline" className="text-[8px] font-black uppercase px-2 h-4">{div.gender || 'Femenino'}</Badge>
                        </div>
                        <p className="font-black text-lg text-slate-900 leading-none">{div.name}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" asChild className="h-10 w-10 p-0 rounded-full hover:bg-primary hover:text-white">
                      <Link href={`/dashboard/clubs/${club.id}/divisions`}><ArrowRight className="h-5 w-5" /></Link>
                    </Button>
                  </div>
                ))}
                {(!divisions || divisions.length === 0) && (
                  <div className="text-center py-16 border-2 border-dashed rounded-[2rem] opacity-40">
                    <Layers className="h-12 w-12 mx-auto mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest">No hay categorías configuradas</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="bg-slate-50/50 border-t p-4">
                <Button variant="link" asChild className="w-full font-black uppercase text-[10px] tracking-[0.2em] text-slate-400 hover:text-primary">
                  <Link href={`/dashboard/clubs/${club?.id}/divisions`}>Gestionar Todas las Categorías</Link>
                </Button>
              </CardFooter>
            </Card>

            <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-md">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-xl font-black flex items-center gap-3 text-slate-900">
                  <TrendingUp className="h-6 w-6 text-green-600" /> Resultados Recientes
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
                          <div className="flex items-center gap-3 bg-slate-900 text-white px-5 py-2.5 rounded-2xl shadow-xl">
                            <span className="text-2xl font-black">{res.homeScore}</span>
                            <span className="text-xs font-black opacity-40">-</span>
                            <span className="text-2xl font-black">{res.awayScore}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 italic text-slate-400 font-medium">Sin partidos registrados recientemente.</div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-primary to-primary/80 text-white border-none shadow-2xl rounded-[2rem] overflow-hidden">
              <CardHeader>
                <CardTitle className="text-xs font-black uppercase tracking-[0.2em] opacity-80">Acciones Directas</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-2">
                <Button variant="secondary" className="justify-start gap-3 h-14 bg-white/10 hover:bg-white/20 border-none text-white font-black uppercase text-[10px] tracking-widest rounded-xl" asChild>
                  <Link href={`/dashboard/clubs/${club?.id}/players`}><Briefcase className="h-4 w-4" /> Legajos Jugadoras</Link>
                </Button>
                <Button variant="secondary" className="justify-start gap-3 h-14 bg-white/10 hover:bg-white/20 border-none text-white font-black uppercase text-[10px] tracking-widest rounded-xl" asChild>
                  <Link href={`/dashboard/clubs/${club?.id}/coaches`}><Users className="h-4 w-4" /> Gestión de Staff</Link>
                </Button>
                <Button variant="secondary" className="justify-start gap-3 h-14 bg-white/10 hover:bg-white/20 border-none text-white font-black uppercase text-[10px] tracking-widest rounded-xl" asChild>
                  <Link href={`/dashboard/clubs/${club?.id}/finances`}><CreditCard className="h-4 w-4" /> Caja y Tesorería</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl bg-white/95 rounded-[2rem]">
              <CardHeader><CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Alertas Operativas</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="p-4 bg-red-50 border-2 border-red-100 rounded-2xl flex gap-3 group">
                  <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5 group-hover:animate-pulse" />
                  <p className="text-[11px] text-red-700 font-black leading-tight uppercase">8 Jugadoras con apto médico vencido en 1ra Damas.</p>
                </div>
                <div className="p-4 bg-orange-50 border-2 border-orange-100 rounded-2xl flex gap-3">
                  <Clock className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-orange-700 font-black leading-tight uppercase">Falta designar Coach para 9na Rugby.</p>
                </div>
              </CardContent>
            </Card>

            <div className="p-8 bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] border border-white/10 text-center space-y-4">
              <Settings className="h-10 w-10 text-primary mx-auto opacity-50" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Configuración Institucional</p>
              <Button variant="outline" asChild className="w-full bg-transparent border-white/20 text-white hover:bg-white hover:text-slate-900 font-black uppercase text-[10px] tracking-widest h-12">
                <Link href={`/dashboard/clubs/${club?.id}/settings`}>Editar Identidad Sede</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
