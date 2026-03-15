
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { 
  Plus, 
  Milestone, 
  Loader2, 
  Trash2, 
  Pencil, 
  ArrowRight,
  ChevronLeft,
  MapPin,
  Trophy,
  LayoutDashboard,
  Building2,
  Users,
  BarChart3
} from "lucide-react";
import Link from "next/link";
import { collection, doc, setDoc } from "firebase/firestore";
import { useFirebase, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Textarea } from "@/components/ui/textarea";
import { SectionNav } from "@/components/layout/section-nav";

export default function FederationDetailPage() {
  const { federationId } = useParams() as { federationId: string };
  const { firestore } = useFirebase();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newAssoc, setNewAssoc] = useState({ name: "", region: "", logoUrl: "", description: "" });

  const fedRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, "federations", federationId);
  }, [firestore, federationId]);

  const { data: federation, isLoading: fedLoading } = useDoc(fedRef);

  const assocQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "federations", federationId, "associations");
  }, [firestore, federationId]);

  const { data: associations, isLoading: assocLoading } = useCollection(assocQuery);

  const fedNav = [
    { title: "Asociaciones", href: `/dashboard/federations/${federationId}`, icon: Milestone },
    { title: "Torneos Regionales", href: `/dashboard/federations/${federationId}/tournaments`, icon: Trophy },
    { title: "Clubes Afiliados", href: `/dashboard/federations/${federationId}/clubs`, icon: Building2 },
    { title: "Cuerpo de Árbitros", href: `/dashboard/federations/${federationId}/referees`, icon: Users },
    { title: "Estadísticas", href: `/dashboard/federations/${federationId}/stats`, icon: BarChart3 },
  ];

  const handleCreateAssoc = () => {
    if (!firestore) return;
    const assocId = doc(collection(firestore, "federations", federationId, "associations")).id;
    const assocDoc = doc(firestore, "federations", federationId, "associations", assocId);
    
    setDoc(assocDoc, {
      ...newAssoc,
      id: assocId,
      federationId,
      createdAt: new Date().toISOString()
    });
    
    setNewAssoc({ name: "", region: "", logoUrl: "", description: "" });
    setIsCreateOpen(false);
  };

  const handleDeleteAssoc = (id: string) => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, "federations", federationId, "associations", id));
  };

  if (fedLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4">
        <Link href="/dashboard/federations" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors w-fit">
          <ChevronLeft className="h-4 w-4" /> Volver a Federaciones
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary/20">
              <AvatarImage src={federation?.logoUrl} />
              <AvatarFallback>FED</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold font-headline text-foreground">{federation?.name}</h1>
              <p className="text-muted-foreground">{federation?.sport} • {federation?.country}</p>
            </div>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> Nueva Asociación
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva Asociación Regional</DialogTitle>
                <DialogDescription>Crea una liga o asociación local dentro de esta federación.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input value={newAssoc.name} onChange={e => setNewAssoc({...newAssoc, name: e.target.value})} placeholder="Ej. Asociación de Hockey de Madrid" />
                </div>
                <div className="space-y-2">
                  <Label>Región / Ciudad</Label>
                  <Input value={newAssoc.region} onChange={e => setNewAssoc({...newAssoc, region: e.target.value})} placeholder="Ej. Comunidad de Madrid" />
                </div>
                <div className="space-y-2">
                  <Label>URL Logo</Label>
                  <Input value={newAssoc.logoUrl} onChange={e => setNewAssoc({...newAssoc, logoUrl: e.target.value})} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea value={newAssoc.description} onChange={e => setNewAssoc({...newAssoc, description: e.target.value})} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreateAssoc} disabled={!newAssoc.name || !newAssoc.region}>Registrar Asociación</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <SectionNav items={fedNav} basePath={`/dashboard/federations/${federationId}`} />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assocLoading ? (
          <div className="col-span-full flex justify-center p-12"><Loader2 className="animate-spin" /></div>
        ) : (
          associations?.map((assoc: any) => (
            <Card key={assoc.id}>
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-10 w-10 border">
                  <AvatarImage src={assoc.logoUrl} alt={assoc.name} />
                  <AvatarFallback><Milestone /></AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{assoc.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1 font-medium">
                    <MapPin className="h-3 w-3" /> {assoc.region}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardFooter className="flex justify-between border-t pt-4">
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteAssoc(assoc.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/dashboard/federations/${federationId}/associations/${assoc.id}`} className="flex items-center gap-2">
                    Gestionar Clubes <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
        {associations?.length === 0 && !assocLoading && (
          <div className="col-span-full text-center py-12 border-2 border-dashed rounded-xl">
            <p className="text-muted-foreground">No hay asociaciones registradas bajo esta federación.</p>
          </div>
        )}
      </div>
    </div>
  );
}
