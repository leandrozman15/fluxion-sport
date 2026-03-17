
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
  Stethoscope,
  TrendingUp,
  AlertCircle,
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
    { title: "Administración", href: `/dashboard/clubs/${clubId}/admin`, icon: ShieldCheck },
    { title: "Categorías", href: `/dashboard/clubs/${clubId}/divisions`, icon: Layers },
    { title: "Tienda Club", href: `/dashboard/clubs/${clubId}/shop/admin`, icon: ShoppingBag },
    { title: "Base Jugadores", href: `/dashboard/clubs/${clubId}/players`, icon: Users },
    { title: "Finanzas", href: `/dashboard/clubs/${clubId}/finances`, icon: CreditCard },
  ];

  const copyRegistrationLink = () => {
    const link = `${window.location.origin}/clubs/${clubId}/register`;
    navigator.clipboard.writeText(link);
    toast({ title: "Enlace Copiado", description: "El link de inscripción ha sido copiado." });
  };

  if (clubLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4">
        <Link href="/dashboard/clubs" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors w-fit">
          <ChevronLeft className="h-4 w-4" /> Volver a Instituciones
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary/10">
              <AvatarImage src={club?.logoUrl} />
              <AvatarFallback><Building2 /></AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold font-headline">{club?.name}</h1>
              <p className="text-muted-foreground text-sm">{club?.address || "Sede oficial"}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild className="gap-2 border-primary text-primary hover:bg-primary/5 text-xs h-9">
              <Link href={`/dashboard/clubs/${clubId}/shop`}>
                <ShoppingBag className="h-4 w-4" /> Ir a la Tienda
              </Link>
            </Button>
            <Button variant="outline" onClick={copyRegistrationLink} className="gap-2 border-accent text-accent hover:bg-accent/5 text-xs h-9">
              <Share2 className="h-4 w-4" /> Link Inscripción
            </Button>
            
            <Button variant="default" className="gap-2 text-xs h-9" asChild>
              <Link href={`/dashboard/clubs/${clubId}/settings`}>
                <Settings2 className="h-4 w-4" /> Configurar Club
              </Link>
            </Button>
          </div>
        </div>

        <SectionNav items={clubNav} basePath={`/dashboard/clubs/${clubId}`} />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-primary/5 border-primary/10">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground">Padrón Total</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{players?.length || 0}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Jugadores activos</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground">Cobranza Mayo</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-green-600">82%</div>
            <p className="text-[10px] text-muted-foreground mt-1">Efectividad de pago</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground">Legajos Médicos</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-red-600">12</div>
            <p className="text-[10px] text-muted-foreground mt-1">Vencidos o faltantes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground">Categorías</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{categories?.length || 0}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Ramas y categorías</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" /> Actividad Reciente del Club
            </CardTitle>
            <CardDescription>Resumen de movimientos administrativos y deportivos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Nuevo Ingreso", desc: "Se registró a Mateo González en 9na División.", time: "Hace 2 horas", icon: Users },
              { label: "Venta Tienda", desc: "Se reservó una Camiseta Titular (Talle M).", time: "Hace 4 horas", icon: ShoppingBag },
              { label: "Pago Registrado", desc: "Cobro de cuota social de 15 jugadores.", time: "Hace 5 horas", icon: CreditCard },
              { label: "Agenda Actualizada", desc: "Entrenamiento de 1ra Damas movido a las 19:00hs.", time: "Ayer", icon: Calendar },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                <div className="bg-primary/10 p-2 rounded-full mt-1">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-bold">{item.label}</span>
                    <span className="text-[10px] text-muted-foreground">{item.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter className="bg-muted/10 border-t pt-4">
            <Button variant="link" className="w-full text-xs text-muted-foreground">Ver historial completo</Button>
          </CardFooter>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" /> Alertas Críticas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg text-xs">
                <p className="font-bold text-orange-800 mb-1">Pases Pendientes</p>
                <p className="text-orange-700">3 jugadoras esperando validación de asociación regional.</p>
              </div>
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs">
                <p className="font-bold text-red-800 mb-1">Seguro Médico</p>
                <p className="text-red-700">La póliza colectiva vence en 15 días.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary to-primary/90 text-primary-foreground border-none">
            <CardHeader>
              <CardTitle className="text-lg">Acceso Rápido</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2">
              <Button variant="secondary" size="sm" className="justify-start gap-3 bg-white/10 hover:bg-white/20 border-none text-white h-10" asChild>
                <Link href={`/dashboard/clubs/${clubId}/players`}><FileText className="h-4 w-4" /> Legajos Médicos</Link>
              </Button>
              <Button variant="secondary" size="sm" className="justify-start gap-3 bg-white/10 hover:bg-white/20 border-none text-white h-10">
                <TrendingUp className="h-4 w-4" /> Reporte de Cuotas
              </Button>
              <Button variant="secondary" size="sm" className="justify-start gap-3 bg-white/10 hover:bg-white/20 border-none text-white h-10" asChild>
                <Link href={`/dashboard/clubs/${clubId}/coaches`}><UserRound className="h-4 w-4" /> Staff del Club</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
