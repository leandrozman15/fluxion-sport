
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
  Pencil,
  Share2,
  LayoutGrid,
  Building2,
  UserCheck,
  Trophy,
  Activity,
  UserRound,
  FileText,
  Settings2
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
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
            <Button variant="outline" onClick={copyRegistrationLink} className="gap-2 border-accent text-accent hover:bg-accent/5">
              <Share2 className="h-4 w-4" /> Link Inscripción
            </Button>
            <Button variant="default" className="gap-2">
              <Settings2 className="h-4 w-4" /> Configuración
            </Button>
          </div>
        </div>
      </header>

      <Tabs defaultValue="divisions" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl bg-muted/50 p-1">
          <TabsTrigger value="admin" className="gap-2"><ShieldCheck className="h-4 w-4" /> Administración</TabsTrigger>
          <TabsTrigger value="coaches" className="gap-2"><UserRound className="h-4 w-4" /> Entrenadores</TabsTrigger>
          <TabsTrigger value="divisions" className="gap-2"><LayoutGrid className="h-4 w-4" /> Divisiones</TabsTrigger>
        </TabsList>

        <TabsContent value="admin" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-bold uppercase text-muted-foreground">Padrón Jugadores</CardTitle></CardHeader>
              <CardContent>
                <div className="text-3xl font-black">{players?.length || 0}</div>
                <Button asChild variant="link" className="p-0 h-auto text-xs" size="sm">
                  <Link href={`/dashboard/clubs/${clubId}/players`}>Ver listado completo</Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-bold uppercase text-muted-foreground">Efectividad Cobros</CardTitle></CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-green-600">82%</div>
                <p className="text-[10px] text-muted-foreground mt-1">Cuotas al día (Mayo 2024)</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-bold uppercase text-muted-foreground">Documentación</CardTitle></CardHeader>
              <CardContent>
                <div className="text-3xl font-black">95%</div>
                <p className="text-[10px] text-muted-foreground mt-1">Fichas médicas cargadas</p>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Gestión Administrativa</CardTitle>
              <CardDescription>Herramientas centrales de la institución.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button variant="outline" className="h-20 flex-col gap-2" asChild>
                <Link href={`/dashboard/clubs/${clubId}/players`}>
                  <Users className="h-5 w-5" /> Base de Jugadores
                </Link>
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2">
                <CreditCard className="h-5 w-5" /> Finanzas y Cuotas
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2">
                <FileText className="h-5 w-5" /> Legajos Médicos
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2">
                <Activity className="h-5 w-5" /> Auditoría
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coaches" className="space-y-6 mt-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Cuerpo Técnico</h2>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Registrar Entrenador</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:border-primary transition-colors">
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-12 w-12"><AvatarFallback>CO</AvatarFallback></Avatar>
                <div>
                  <CardTitle className="text-lg">Carlos Entrenador</CardTitle>
                  <CardDescription>Coordinador General</CardDescription>
                </div>
              </CardHeader>
              <CardFooter className="border-t pt-4">
                <Button variant="ghost" size="sm" className="w-full">Ver Legajo</Button>
              </CardFooter>
            </Card>
            {/* Aquí se cargarían dinámicamente los coaches vinculados al club */}
          </div>
        </TabsContent>

        <TabsContent value="divisions" className="space-y-6 mt-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Ramas y Divisiones</h2>
            <Dialog open={isCreateDivOpen} onOpenChange={setIsCreateDivOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> Nueva División</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Añadir División</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nombre (Ej. Divisiones Inferiores)</Label>
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {divisionsLoading ? <Loader2 className="animate-spin" /> : divisions?.map((div: any) => (
              <Card key={div.id} className="group hover:border-primary transition-all">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    {div.name}
                    <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                  </CardTitle>
                  <CardDescription>{div.description || "División deportiva"}</CardDescription>
                </CardHeader>
                <CardFooter className="flex justify-between border-t pt-4">
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteDocumentNonBlocking(doc(db, "clubs", clubId, "divisions", div.id))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/dashboard/clubs/${clubId}/divisions/${div.id}`} className="gap-2">
                      Subcategorías <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
            {divisions?.length === 0 && !divisionsLoading && (
              <div className="col-span-full text-center py-12 border-2 border-dashed rounded-xl">
                <p className="text-muted-foreground">Crea una división (ej. Damas, Caballeros, Inferiores) para organizar los equipos.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
