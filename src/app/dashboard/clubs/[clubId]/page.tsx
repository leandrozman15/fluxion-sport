
"use client";

import { useState } from "react";
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
  LayoutDashboard
} from "lucide-react";
import Link from "next/link";
import { collection, doc, setDoc } from "firebase/firestore";
import { useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SectionNav } from "@/components/layout/section-nav";

export default function InstitutionDetailPage() {
  const { clubId } = useParams() as { clubId: string };
  const db = useFirestore();
  const { toast } = useToast();
  
  const clubRef = useMemoFirebase(() => doc(db, "clubs", clubId), [db, clubId]);
  const { data: club, isLoading: clubLoading } = useDoc(clubRef);

  const divisionsQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "divisions"), [db, clubId]);
  const { data: divisions, isLoading: divisionsLoading } = useCollection(divisionsQuery);

  const playersQuery = useMemoFirebase(() => collection(db, "clubs", clubId, "players"), [db, clubId]);
  const { data: players } = useCollection(playersQuery);

  const [isCreateDivOpen, setIsCreateDivOpen] = useState(false);
  const [newDivision, setNewDivision] = useState({ name: "", description: "" });

  const clubNav = [
    { title: "Panel Club", href: `/dashboard/clubs/${clubId}`, icon: LayoutDashboard },
    { title: "Administración", href: `/dashboard/clubs/${clubId}/admin`, icon: ShieldCheck },
    { title: "Entrenadores", href: `/dashboard/clubs/${clubId}/coaches`, icon: UserRound },
    { title: "Divisiones", href: `/dashboard/clubs/${clubId}/divisions`, icon: LayoutGrid },
    { title: "Jugadores", href: `/dashboard/clubs/${clubId}/players`, icon: Users },
    { title: "Finanzas", href: `/dashboard/clubs/${clubId}/finances`, icon: CreditCard },
  ];

  const handleCreateDivision = () => {
    const divId = doc(collection(db, "clubs", clubId, "divisions")).id;
    setDoc(doc(db, "clubs", clubId, "divisions", divId), {
      ...newDivision, id: divId, clubId, createdAt: new Date().toISOString()
    });
    setNewDivision({ name: "", description: "" });
    setIsCreateDivOpen(false);
  };

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
            <Button variant="outline" onClick={copyRegistrationLink} className="gap-2 border-accent text-accent hover:bg-accent/5 text-xs h-9">
              <Share2 className="h-4 w-4" /> Link Inscripción
            </Button>
            <Button variant="default" className="gap-2 text-xs h-9">
              <Settings2 className="h-4 w-4" /> Ajustes Club
            </Button>
          </div>
        </div>

        <SectionNav items={clubNav} basePath={`/dashboard/clubs/${clubId}`} />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/10">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground">Padrón Jugadores</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{players?.length || 0}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Activos esta temporada</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground">Efectividad Cobros</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-green-600">82%</div>
            <p className="text-[10px] text-muted-foreground mt-1">Cuotas al día (Mayo 2024)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground">Divisiones</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{divisions?.length || 0}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Ramas deportivas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Divisiones y Ramas</CardTitle>
              <CardDescription>Organización deportiva del club.</CardDescription>
            </div>
            <Dialog open={isCreateDivOpen} onOpenChange={setIsCreateDivOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nueva</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Añadir División</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nombre (Ej. Damas, Inferiores)</Label>
                    <Input value={newDivision.name} onChange={e => setNewDivision({...newDivision, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Descripción</Label>
                    <Input value={newDivision.description} onChange={e => setNewDivision({...newDivision, description: e.target.value})} />
                  </div>
                </div>
                <DialogFooter><Button onClick={handleCreateDivision}>Guardar</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {divisionsLoading ? <Loader2 className="animate-spin mx-auto" /> : divisions?.map((div: any) => (
                <div key={div.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-bold">{div.name}</p>
                    <p className="text-xs text-muted-foreground">{div.description || "División deportiva"}</p>
                  </div>
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/dashboard/clubs/${clubId}/divisions/${div.id}`}><ArrowRight className="h-4 w-4" /></Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Herramientas de Gestión</CardTitle>
            <CardDescription>Accesos rápidos de administración.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-24 flex-col gap-2" asChild>
              <Link href={`/dashboard/clubs/${clubId}/players`}>
                <Users className="h-5 w-5 text-primary" /> 
                <span className="text-xs">Base Jugadores</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-24 flex-col gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <span className="text-xs">Cobros / Cuotas</span>
            </Button>
            <Button variant="outline" className="h-24 flex-col gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span className="text-xs">Legajos Médicos</span>
            </Button>
            <Button variant="outline" className="h-24 flex-col gap-2" asChild>
              <Link href={`/dashboard/clubs/${clubId}/coaches`}>
                <UserRound className="h-5 w-5 text-primary" />
                <span className="text-xs">Staff Técnico</span>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
