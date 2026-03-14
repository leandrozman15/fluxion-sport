
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { 
  Plus, 
  ShieldCheck, 
  Loader2, 
  ChevronLeft,
  ArrowRight,
  Search,
  Building
} from "lucide-react";
import Link from "next/link";
import { collection, doc, query, where } from "firebase/firestore";
import { useFirebase, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function AssociationDetailPage() {
  const { federationId, associationId } = useParams() as { federationId: string, associationId: string };
  const { firestore } = useFirebase();

  const assocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, "federations", federationId, "associations", associationId);
  }, [firestore, federationId, associationId]);

  const { data: association, isLoading: assocLoading } = useDoc(assocRef);

  // Consultar clubes vinculados a esta asociación
  const clubsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "clubs"), where("associationId", "==", associationId));
  }, [firestore, associationId]);

  const { data: clubs, isLoading: clubsLoading } = useCollection(clubsQuery);

  if (assocLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4">
        <Link href={`/dashboard/federations/${federationId}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors w-fit">
          <ChevronLeft className="h-4 w-4" /> Volver a Federación
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-accent/20">
              <AvatarImage src={association?.logoUrl} />
              <AvatarFallback>ASC</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold font-headline text-foreground">{association?.name}</h1>
              <p className="text-muted-foreground">{association?.region}</p>
            </div>
          </div>
          <Button asChild>
            <Link href="/dashboard/clubs">
              Vincular Club <Plus className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" /> Clubes Federados
            </CardTitle>
            <CardDescription>Clubes inscritos en esta asociación o liga.</CardDescription>
          </CardHeader>
          <CardContent>
            {clubsLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clubs?.map((club: any) => (
                  <Card key={club.id} className="bg-muted/30">
                    <CardHeader className="flex flex-row items-center gap-3 pb-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={club.logoUrl} />
                        <AvatarFallback><ShieldCheck /></AvatarFallback>
                      </Avatar>
                      <CardTitle className="text-base truncate">{club.name}</CardTitle>
                    </CardHeader>
                    <CardFooter className="pt-0">
                      <Button asChild variant="ghost" size="sm" className="w-full">
                        <Link href={`/dashboard/clubs/${club.id}`}>
                          Ver Club <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
                {clubs?.length === 0 && (
                  <div className="col-span-full py-12 text-center bg-background border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">No hay clubes vinculados a esta asociación todavía.</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
