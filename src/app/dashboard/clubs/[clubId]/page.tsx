
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  Plus, 
  ArrowRight,
  Loader2,
  Trash2,
  ChevronLeft,
  Users,
  Share2,
  LayoutGrid,
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
  Save,
  Globe,
  Phone,
  MapPin,
  ShoppingBag
} from "lucide-react";
import Link from "next/link";
import { collection, doc, setDoc } from "firebase/firestore";
import { useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SectionNav } from "@/components/layout/section-nav";
import { useToast } from "@/hooks/use-toast";

export default function InstitutionDetailPage() {
  const { clubId } = useParams() as { clubId: string };
  const db = useFirestore();
  const { toast } = useToast();
  
  const clubRef = useMemoFirebase(() => doc(db, "clubs", clubId), [db, clubId]);
  const { data: club, isLoading: clubLoading } = useDoc(clubRef);

  const categoriesQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "divisions"), [db, clubId]);
  const { data: categories } = useCollection(categoriesQuery);

  const playersQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "players"), [db, clubId]);
  const { data: players } = useCollection(playersQuery);

  const clubNav = [
    { title: "Panel General", href: `/dashboard/clubs/${clubId}`, icon: LayoutDashboard },
    { title: "Categorías", href: `/dashboard/clubs/${clubId}/divisions`, icon: Layers },
    { title: "Staff Técnico", href: `/dashboard/clubs/${clubId}/coaches`, icon: UserRound },
    { title: "Tienda Club", href: `/dashboard/clubs/${clubId}/shop/admin`, icon: ShoppingBag },
    { title: "Base Jugadores", href: `/dashboard/clubs/${clubId}/players`, icon: Users },
    { title: "Finanzas", href: `/dashboard/clubs/${clubId}/finances`, icon: CreditCard },
  ];

  const copyRegistrationLink = () => {
    const link = `${window.location.origin}/clubs/${clubId}/register`;
    navigator.clipboard.writeText(link);
    toast({ title: "Enlace Copiado", description: "El link de inscripción ha sido copiado." });
  };

  if (clubLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white" /></div>;

  return (
    <div className="flex gap-8 animate-in fade-in duration-500">
      <SectionNav items={clubNav} basePath={`/dashboard/clubs/${clubId}`} />
      
      <div className="flex-1 space-y-8">
        <header className="flex flex-col gap-4">
          <Link href="/dashboard/clubs" className="ambient-link group">
            <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Volver a Instituciones
          </Link>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border shadow-xl">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-primary/10 shadow-sm">
                <AvatarImage src={club?.logoUrl} />
                <AvatarFallback className="bg-primary/5 text-primary"><Building2 /></AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-black font-headline !text-slate-900 shadow-none !text-shadow-none" style={{ textShadow: 'none' }}>{club?.name}</h1>
                <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">{club?.address || "Sede oficial del club"}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild className="gap-2 border-primary text-primary hover:bg-primary/5 text-xs h-10 font-bold px-4">
                <Link href={`/dashboard/clubs/${clubId}/shop`}>
                  <ShoppingBag className="h-4 w-4" /> Ver Tienda
                </Link>
              </Button>
              <Button variant="outline" onClick={copyRegistrationLink} className="gap-2 border-accent text-accent hover:bg-accent/5 text-xs h-10 font-bold px-4">
                <Share2 className="h-4 w-4" /> Link Inscripción
              </Button>
              <Button variant="default" className="gap-2 text-xs h-10 font-black uppercase tracking-widest px-6 shadow-lg shadow-primary/20" asChild>
                <Link href={`/dashboard/clubs/${clubId}/settings`}>
                  <Settings2 className="h-4 w-4" /> Configurar Club
                </Link>
              </Button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-primary text-primary-foreground border-none shadow-xl shadow-primary/30 transform hover:scale-105 transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Padrón Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-black">{players?.length || 0}</div>
              <p className="text-[10px] font-bold uppercase mt-1 opacity-90">Jugadoras federadas activas</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-none shadow-sm border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Cobranza Mayo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-green-600">82%</div>
              <p className="text-[10px] text-green-600/70 font-bold uppercase mt-1">Efectividad de pago</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm border-l-4 border-l-slate-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Categorías</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-900">{categories?.length || 0}</div>
              <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Ramas y divisiones</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-sm border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Staff</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-primary">Activo</div>
              <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Profesores vinculados</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 bg-white border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="text-lg font-black flex items-center gap-2 text-slate-900">
                <Clock className="h-5 w-5 text-primary" /> Actividad Institucional
              </CardTitle>
              <CardDescription className="font-medium">Movimientos recientes en el club.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {[
                { label: "Nuevo Ingreso", desc: "Se registró una nueva jugadora en 9na División.", time: "Hace 2 horas", icon: Users },
                { label: "Venta Tienda", desc: "Se reservó una Camiseta Titular (Talle M).", time: "Hace 4 horas", icon: ShoppingBag },
                { label: "Pago Registrado", desc: "Cobro de cuota social de 15 jugadores.", time: "Hace 5 horas", icon: CreditCard },
                { label: "Agenda Actualizada", desc: "Entrenamiento de 1ra Damas confirmado.", time: "Ayer", icon: Calendar },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="bg-primary/10 p-2.5 rounded-full mt-1 shrink-0">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-black text-slate-900">{item.label}</span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{item.time}</span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">{item.desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
            <CardFooter className="bg-slate-50 border-t py-4">
              <Button variant="link" className="w-full text-xs text-slate-500 font-black uppercase tracking-widest hover:text-primary">Ver historial completo</Button>
            </CardFooter>
          </Card>

          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-2xl relative overflow-hidden">
              <CardHeader className="relative z-10">
                <CardTitle className="text-lg font-black uppercase tracking-tight">Accesos Directos</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-2 relative z-10">
                <Button variant="secondary" size="sm" className="justify-start gap-3 bg-white/10 hover:bg-white/20 border-none text-white h-12 font-black uppercase text-[10px] tracking-widest transition-all" asChild>
                  <Link href={`/dashboard/clubs/${clubId}/players`}><FileText className="h-4 w-4" /> Padrón de Socios</Link>
                </Button>
                <Button variant="secondary" size="sm" className="justify-start gap-3 bg-white/10 hover:bg-white/20 border-none text-white h-12 font-black uppercase text-[10px] tracking-widest transition-all" asChild>
                  <Link href={`/dashboard/clubs/${clubId}/shop/admin`}><ShoppingBag className="h-4 w-4" /> Administrar Tienda</Link>
                </Button>
                <Button variant="secondary" size="sm" className="justify-start gap-3 bg-white/10 hover:bg-white/20 border-none text-white h-12 font-black uppercase text-[10px] tracking-widest transition-all" asChild>
                  <Link href={`/dashboard/clubs/${clubId}/coaches`}><UserRound className="h-4 w-4" /> Staff del Club</Link>
                </Button>
              </CardContent>
              <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
                <Building2 className="h-40 w-40 rotate-12" />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
