
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Plus, 
  ArrowRight,
  Loader2,
  Trash2,
  ChevronLeft,
  Users,
  Share2,
  Building2,
  UserRound,
  FileText,
  Settings2,
  ShieldCheck,
  CreditCard,
  LayoutDashboard,
  Clock,
  Calendar,
  Layers,
  ShoppingBag,
  Megaphone,
  CircleDollarSign
} from "lucide-react";
import Link from "next/link";
import { collection, doc, query, where, getDocs, orderBy, limit, getDoc } from "firebase/firestore";
import { useFirestore, useCollection, useDoc, useMemoFirebase, useFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SectionNav } from "@/components/layout/section-nav";
import { useToast } from "@/hooks/use-toast";
import { LiveMatchesCard } from "@/components/dashboard/live-matches-card";
import { SpecialEventsFeed } from "@/components/dashboard/special-events-feed";
import { CreateSpecialEventDialog } from "@/components/dashboard/create-special-event-dialog";
import { useRoleGuard } from "@/hooks/use-role-guard";

export default function InstitutionDetailPage() {
  const { authorized, loading: guardLoading } = useRoleGuard(['club_admin', 'coordinator', 'admin', 'fed_admin']);
  const { clubId } = useParams() as { clubId: string };
  const { firestore, user } = useFirebase();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  // Datos del Club
  const clubRef = useMemoFirebase(() => doc(db, "clubs", clubId), [db, clubId]);
  const { data: club, isLoading: clubLoading } = useDoc(clubRef);

  const categoriesQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "divisions"), [db, clubId]);
  const { data: categories } = useCollection(categoriesQuery);

  const playersQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "players"), [db, clubId]);
  const { data: players } = useCollection(playersQuery);

  const staffQuery = useMemoFirebase(() => query(collection(db, "users"), where("clubId", "==", clubId)), [db, clubId]);
  const { data: staff } = useCollection(staffQuery);

  const transactionsQuery = useMemoFirebase(() => query(collection(db, "clubs", clubId, "transactions"), orderBy("createdAt", "desc"), limit(5)), [db, clubId]);
  const { data: transactions } = useCollection(transactionsQuery);

  const recentPlayersQuery = useMemoFirebase(() => query(collection(db, "clubs", clubId, "players"), orderBy("createdAt", "desc"), limit(5)), [db, clubId]);
  const { data: recentPlayers } = useCollection(recentPlayersQuery);

  const clubNav = [
    { title: "Panel General", href: `/dashboard/clubs/${clubId}`, icon: LayoutDashboard },
    { title: "Categorías", href: `/dashboard/clubs/${clubId}/divisions`, icon: Layers },
    { title: "Staff Técnico", href: `/dashboard/clubs/${clubId}/coaches`, icon: UserRound },
    { title: "Tienda Club", href: `/dashboard/clubs/${clubId}/shop/admin`, icon: ShoppingBag },
    { title: "Base Jugadores", href: `/dashboard/clubs/${clubId}/players`, icon: Users },
    { title: "Finanzas", href: `/dashboard/clubs/${clubId}/finances`, icon: CreditCard },
    { title: "Mi Carnet", href: "/dashboard/player/id-card", icon: ShieldCheck },
  ];

  const copyRegistrationLink = () => {
    const link = `${window.location.origin}/clubs/${clubId}/register`;
    navigator.clipboard.writeText(link);
    toast({ title: "Enlace Copiado", description: "El link de inscripción ha sido copiado." });
  };

  const totalRevenue = transactions?.filter(t => t.type === 'in').reduce((acc, t) => acc + (t.amount || 0), 0) || 0;

  const activities = [
    ...(recentPlayers?.map(p => ({
      label: "Nuevo Ingreso",
      desc: `Se registró a ${p.firstName} ${p.lastName} en el padrón.`,
      time: p.createdAt,
      icon: Users,
      color: "text-primary"
    })) || []),
    ...(transactions?.map(t => ({
      label: t.type === 'in' ? "Ingreso de Caja" : "Egreso de Caja",
      desc: `${t.concept} por $${t.amount.toLocaleString()}.`,
      time: t.createdAt,
      icon: CreditCard,
      color: t.type === 'in' ? "text-green-600" : "text-red-600"
    })) || [])
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);

  if (guardLoading || !authorized) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white" /></div>;

  if (clubLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white" /></div>;

  return (
    <div className="flex flex-col md:flex-row gap-8 animate-in fade-in duration-500">
      <SectionNav items={clubNav} basePath={`/dashboard/clubs/${clubId}`} />
      
      <div className="flex-1 space-y-8 pb-24 px-4 md:px-0">
        <header className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border shadow-xl">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-primary/10 shadow-sm rounded-2xl bg-white">
                <AvatarImage src={club?.logoUrl} className="object-contain p-1" />
                <AvatarFallback className="bg-primary/5 text-primary"><Building2 /></AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-black font-headline !text-slate-900 shadow-none">{club?.name || "Cargando Club..."}</h1>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{club?.address || "Sede oficial del club"}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <CreateSpecialEventDialog clubId={clubId} authorName={club?.name || "Administración"} />
              <Button variant="outline" asChild className="gap-2 border-primary text-primary hover:bg-primary/5 text-[10px] h-10 font-black uppercase px-4 rounded-xl">
                <Link href={`/dashboard/clubs/${clubId}/shop`}>
                  <ShoppingBag className="h-4 w-4" /> Tienda
                </Link>
              </Button>
              <Button variant="default" className="gap-2 text-[10px] h-10 font-black uppercase tracking-widest px-6 shadow-xl rounded-xl" asChild>
                <Link href={`/dashboard/clubs/${clubId}/settings`}>
                  <Settings2 className="h-4 w-4" /> Configurar
                </Link>
              </Button>
            </div>
          </div>
        </header>

        <LiveMatchesCard clubId={clubId} />
        <SpecialEventsFeed clubId={clubId} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-primary text-primary-foreground border-none shadow-2xl shadow-primary/20 transform hover:scale-105 transition-all rounded-[1.5rem]">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Padrón Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-black tracking-tighter">{players?.length || 0}</div>
              <p className="text-[9px] font-bold uppercase mt-1 opacity-90">Jugadoras federadas</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-none shadow-xl border-l-8 border-l-green-500 rounded-[1.5rem]">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Ingresos Totales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-green-600 tracking-tighter">${totalRevenue.toLocaleString()}</div>
              <p className="text-[9px] text-green-600/70 font-bold uppercase mt-1">Caja institucional</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-xl border-l-8 border-l-primary rounded-[1.5rem]">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Categorías</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-slate-900 tracking-tighter">{categories?.length || 0}</div>
              <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Ramas y divisiones</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-xl border-l-8 border-l-primary rounded-[1.5rem]">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Staff Técnico</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-primary tracking-tighter">{staff?.length || 0}</div>
              <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Profesores vinculados</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 bg-white border-none shadow-xl overflow-hidden rounded-[2.5rem]">
            <CardHeader className="bg-slate-50 border-b py-6 px-8">
              <CardTitle className="text-xl font-black flex items-center gap-3 text-slate-900">
                <Clock className="h-6 w-6 text-primary" /> Actividad Institucional
              </CardTitle>
              <CardDescription className="font-medium">Movimientos reales detectados en la plataforma.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-8 px-8 pb-8">
              {activities.length > 0 ? activities.map((item, i) => (
                <div key={i} className="flex items-start gap-5 p-5 rounded-2xl border-2 border-slate-50 hover:bg-slate-50 transition-colors group">
                  <div className="bg-slate-50 p-3 rounded-xl group-hover:scale-110 transition-transform shrink-0">
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{item.label}</span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                        {new Date(item.time).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-bold leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-12 opacity-30">
                  <Clock className="h-12 w-12 mx-auto mb-4" />
                  <p className="font-black uppercase text-xs tracking-widest">Sin actividad reciente</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="bg-slate-50/50 border-t py-5 px-8">
              <Button variant="link" asChild className="w-full text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] hover:text-primary">
                <Link href={`/dashboard/clubs/${clubId}/finances`}>Ver movimientos financieros</Link>
              </Button>
            </CardFooter>
          </Card>

          <div className="space-y-6">
            <Card className="bg-white text-slate-900 border-none shadow-2xl relative overflow-hidden rounded-[2.5rem]">
              <CardHeader className="relative z-10 pt-8 px-8">
                <CardTitle className="text-xs font-black uppercase tracking-[0.3em] opacity-60">Accesos Directos</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-2 relative z-10 pt-4 px-8 pb-8">
                <Button variant="secondary" size="sm" className="justify-start gap-4 bg-slate-50 hover:bg-primary/5 border-none text-slate-900 h-14 font-black uppercase text-[10px] tracking-widest transition-all rounded-xl shadow-sm" asChild>
                  <Link href={`/dashboard/clubs/${clubId}/players`}><FileText className="h-5 w-5 text-primary" /> Padrón de Socios</Link>
                </Button>
                <Button variant="secondary" size="sm" className="justify-start gap-4 bg-slate-50 hover:bg-primary/5 border-none text-slate-900 h-14 font-black uppercase text-[10px] tracking-widest transition-all rounded-xl shadow-sm" asChild>
                  <Link href={`/dashboard/clubs/${clubId}/shop/admin`}><ShoppingBag className="h-5 w-5 text-primary" /> Administrar Tienda</Link>
                </Button>
                <Button variant="secondary" size="sm" className="justify-start gap-4 bg-slate-50 hover:bg-primary/5 border-none text-slate-900 h-14 font-black uppercase text-[10px] tracking-widest transition-all rounded-xl shadow-sm" asChild>
                  <Link href={`/dashboard/clubs/${clubId}/coaches`}><UserRound className="h-5 w-5 text-primary" /> Staff del Club</Link>
                </Button>
              </CardContent>
              <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
                <Building2 className="h-48 w-48 rotate-12" />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
