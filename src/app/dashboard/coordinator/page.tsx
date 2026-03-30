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
  Settings
} from "lucide-react";
import Link from "next/link";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function CoordinatorDashboard() {
  const { firestore, user } = useFirebase();
  const [club, setClub] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMyClub() {
      if (!user || !firestore) return;
      try {
        const userDoc = await getDoc(doc(firestore, "users", user.uid));
        if (userDoc.exists() && userDoc.data().clubId) {
          const clubDoc = await getDoc(doc(firestore, "clubs", userDoc.data().clubId));
          if (clubDoc.exists()) {
            setClub({ ...clubDoc.data(), id: clubDoc.id });
          }
        } else {
          // Demo fallback
          const clubsSnap = await getDocs(collection(firestore, "clubs"));
          if (!clubsSnap.empty) {
            setClub({ ...clubsSnap.docs[0].data(), id: clubsSnap.docs[0].id });
          }
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    fetchMyClub();
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

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl shadow-sm border border-white/50">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-primary/10">
            <AvatarImage src={club?.logoUrl} />
            <AvatarFallback><Building2 /></AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-black font-headline text-slate-900">{club?.name}</h1>
            <p className="text-slate-500 font-bold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-orange-600" /> Consola de Coordinación Deportiva
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild size="sm" className="font-bold border-primary text-primary hover:bg-primary/5">
            <Link href={`/dashboard/clubs/${club?.id}/settings`}><Settings className="h-4 w-4 mr-2" /> Configurar Sede</Link>
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-orange-50 border-orange-100">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-black uppercase text-orange-800/60">Categorías</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-orange-700">{divisions?.length || 0}</div>
            <p className="text-[10px] text-orange-600 font-bold uppercase mt-1">Ramas activas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-black uppercase text-slate-500">Staff Técnico</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">{staff?.length || 0}</div>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Profesores y staff</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-black uppercase text-slate-500">Cobranza</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-green-600">85%</div>
            <p className="text-[10px] text-green-600 font-bold uppercase mt-1">Meta del mes</p>
          </CardContent>
        </Card>
        <Card className="bg-primary text-primary-foreground border-none shadow-xl shadow-primary/20">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-black uppercase opacity-80">Próximos Partidos</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-black">12</div>
            <p className="text-[10px] opacity-80 font-bold uppercase mt-1">Este fin de semana</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Layers className="h-5 w-5 text-orange-600" /> Supervisión por Categoría
            </CardTitle>
            <CardDescription>Estado de cada rama deportiva del club.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {divisions?.map((div: any) => (
              <Link key={div.id} href={`/dashboard/clubs/${club.id}/divisions`} className="block">
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-primary transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="bg-muted p-2 rounded-lg group-hover:bg-primary/10 transition-colors">
                      <Trophy className="h-5 w-5 text-slate-400 group-hover:text-primary" />
                    </div>
                    <div>
                      <p className="font-black text-slate-900">{div.name}</p>
                      <p className="text-xs text-slate-500 font-medium">{div.description || "Gestión de equipos."}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            ))}
            {(!divisions || divisions.length === 0) && (
              <div className="text-center py-10 text-slate-400 font-medium italic">No hay categorías configuradas.</div>
            )}
          </CardContent>
          <CardFooter className="border-t bg-muted/5">
            <Button variant="link" asChild className="w-full text-xs font-black uppercase tracking-widest text-slate-500 hover:text-primary">
              <Link href={`/dashboard/clubs/${club?.id}/divisions`}>Administrar Categorías</Link>
            </Button>
          </CardFooter>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500">Acceso Rápido</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-2">
              <Button variant="outline" className="justify-start gap-3 h-12 font-bold text-slate-700 hover:text-primary" asChild>
                <Link href={`/dashboard/clubs/${club?.id}/coaches`}><Users className="h-4 w-4" /> Staff Técnico</Link>
              </Button>
              <Button variant="outline" className="justify-start gap-3 h-12 font-bold text-slate-700 hover:text-primary" asChild>
                <Link href={`/dashboard/clubs/${club?.id}/players`}><Briefcase className="h-4 w-4" /> Legajos Jugadoras</Link>
              </Button>
              <Button variant="outline" className="justify-start gap-3 h-12 font-bold text-slate-700 hover:text-primary" asChild>
                <Link href={`/dashboard/clubs/${club?.id}/finances`}><CreditCard className="h-4 w-4" /> Tesorería</Link>
              </Button>
              <Button variant="outline" className="justify-start gap-3 h-12 font-bold text-slate-700 hover:text-primary" asChild>
                <Link href={`/dashboard/clubs/${club?.id}/shop/admin`}><ShoppingBag className="h-4 w-4" /> Tienda Oficial</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-dashed border-2 bg-muted/5">
            <CardHeader><CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500">Alertas de Coordinación</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                <p className="text-red-700 font-bold">8 Legajos médicos vencidos en 1ra Damas.</p>
              </div>
              <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg text-xs flex items-start gap-2">
                <Clock className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
                <p className="text-orange-700 font-bold">Falta designar entrenador para Sub 12.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}