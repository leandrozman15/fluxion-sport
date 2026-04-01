
"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import { 
  Plus, 
  Loader2, 
  Trash2, 
  ChevronLeft, 
  MapPin, 
  Trophy, 
  Shield, 
  ImagePlus,
  Search,
  Building2,
  Pencil,
  ExternalLink
} from "lucide-react";
import Link from "next/link";
import { collection, doc, setDoc, query, orderBy } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function OpponentsManagerPage() {
  const { clubId } = useParams() as { clubId: string };
  const db = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newOpp, setNewOpp] = useState({ 
    name: "", 
    shortName: "", 
    address: "", 
    city: "", 
    logoUrl: "" 
  });

  const opponentsQuery = useMemoFirebase(() => 
    query(collection(db, "clubs", clubId, "opponents"), orderBy("name", "asc")),
    [db, clubId]
  );
  const { data: opponents, isLoading } = useCollection(opponentsQuery);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (isEdit) setEditingOpp({ ...editingOpp, logoUrl: base64 });
      else setNewOpp({ ...newOpp, logoUrl: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleCreateOpponent = async () => {
    if (!newOpp.name) return;
    const oppId = doc(collection(db, "clubs", clubId, "opponents")).id;
    const oppDoc = doc(db, "clubs", clubId, "opponents", oppId);
    
    await setDoc(oppDoc, {
      ...newOpp,
      id: oppId,
      createdAt: new Date().toISOString()
    });
    
    setNewOpp({ name: "", shortName: "", address: "", city: "", logoUrl: "" });
    setIsDialogOpen(false);
    toast({ title: "Club Rival Registrado", description: `${newOpp.name} ya está en la base de datos.` });
  };

  const handleUpdateOpponent = () => {
    if (!editingOpp) return;
    updateDocumentNonBlocking(doc(db, "clubs", clubId, "opponents", editingOpp.id), { ...editingOpp });
    setIsEditOpen(false);
    toast({ title: "Información Actualizada" });
  };

  const filteredOpponents = opponents?.filter(o => 
    o.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.shortName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 px-4 md:px-0">
      <header className="flex flex-col gap-4">
        <Link href="/dashboard/coordinator" className="ambient-link group w-fit">
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Volver a Coordinación
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black font-headline text-white drop-shadow-md">Base de Clubes Rivales</h1>
            <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] mt-1">Gestión centralizada de escudos y sedes de la liga.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white text-primary hover:bg-slate-50 h-12 font-black uppercase text-[10px] tracking-widest px-8 shadow-2xl">
                <Plus className="h-5 w-5 mr-2" /> Agregar Club Rival
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-white border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-slate-900">Nuevo Oponente</DialogTitle>
                <DialogDescription className="font-bold text-slate-500">Registra el escudo y la dirección para los mapas del plantel.</DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative group">
                    <Avatar className="h-24 w-24 border-4 border-slate-100 shadow-xl rounded-2xl bg-slate-50">
                      <AvatarImage src={newOpp.logoUrl} className="object-contain p-2" />
                      <AvatarFallback className="bg-slate-50 text-slate-300"><Shield className="h-10 w-10" /></AvatarFallback>
                    </Avatar>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ImagePlus className="h-6 w-6 text-white" />
                    </button>
                  </div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Escudo Oficial</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Nombre del Club</Label>
                    <Input value={newOpp.name} onChange={e => setNewOpp({...newOpp, name: e.target.value})} placeholder="Ej. Lomas Athletic Club" className="h-12 border-2 font-bold" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Siglas</Label>
                      <Input value={newOpp.shortName} onChange={e => setNewOpp({...newOpp, shortName: e.target.value})} placeholder="Ej. LAC" className="h-12 border-2" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Ciudad</Label>
                      <Input value={newOpp.city} onChange={e => setNewOpp({...newOpp, city: e.target.value})} placeholder="Ej. Lomas de Zamora" className="h-12 border-2" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-black text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-primary" /> Dirección de Sede (GPS)
                    </Label>
                    <Input value={newOpp.address} onChange={e => setNewOpp({...newOpp, address: e.target.value})} placeholder="Calle, Nro, Localidad" className="h-12 border-2" />
                  </div>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e)} />
              </div>
              <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-8 border-t">
                <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="font-bold">Cancelar</Button>
                <Button onClick={handleCreateOpponent} disabled={!newOpp.name} className="font-black uppercase text-xs tracking-widest h-12 px-10 shadow-lg shadow-primary/20">Guardar Rival</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
          <Input 
            placeholder="Buscar por nombre o sigla..." 
            className="pl-10 h-14 text-lg bg-white/10 border-white/20 text-white placeholder:text-white/30 focus-visible:ring-primary backdrop-blur-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      {isLoading ? (
        <div className="flex justify-center p-20"><Loader2 className="animate-spin text-white h-12 w-12" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOpponents?.map((opp: any) => (
            <Card key={opp.id} className="group hover:border-primary/50 transition-all border-none shadow-2xl bg-white/95 backdrop-blur-md overflow-hidden flex flex-col">
              <CardHeader className="flex flex-row items-center gap-5 pb-4">
                <Avatar className="h-16 w-16 border-2 border-slate-100 shadow-lg rounded-2xl bg-white group-hover:scale-105 transition-transform">
                  <AvatarImage src={opp.logoUrl} className="object-contain p-2" />
                  <AvatarFallback className="bg-slate-50 text-slate-200"><Shield className="h-8 w-8" /></AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <Badge variant="secondary" className="text-[8px] font-black uppercase tracking-widest px-2 mb-1">{opp.shortName || 'RIVAL'}</Badge>
                  <CardTitle className="text-xl font-black truncate text-slate-900 leading-none">{opp.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pb-6 flex-1">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                    <MapPin className="h-3.5 w-3.5 text-primary" /> {opp.city || 'Sede'}
                  </div>
                  <p className="text-sm font-bold text-slate-700 leading-tight">
                    {opp.address || 'Sin dirección cargada'}
                  </p>
                  {opp.address && (
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${opp.name} ${opp.address} ${opp.city}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-primary hover:underline pt-1"
                    >
                      <ExternalLink className="h-3 w-3" /> Ver en Google Maps
                    </a>
                  )}
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50/50 border-t flex justify-end gap-2 p-4">
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-primary rounded-xl" onClick={() => { setEditingOpp(opp); setIsEditOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-destructive rounded-xl" onClick={() => deleteDocumentNonBlocking(doc(db, "clubs", clubId, "opponents", opp.id))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
          {filteredOpponents?.length === 0 && (
            <div className="col-span-full text-center py-32 border-2 border-dashed rounded-[2.5rem] bg-white/5 opacity-50">
              <Building2 className="h-20 w-20 mx-auto text-white mb-6 opacity-20" />
              <p className="text-white font-black uppercase tracking-[0.3em] text-sm">No hay rivales registrados</p>
              <p className="text-white/60 text-xs mt-2 font-bold uppercase tracking-widest">Registra los clubes de la liga para automatizar fixture y mapas.</p>
            </div>
          )}
        </div>
      )}

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md bg-white border-none shadow-2xl">
          <DialogHeader><DialogTitle className="text-xl font-black">Editar Oponente</DialogTitle></DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <Avatar className="h-24 w-24 border-4 border-slate-100 shadow-xl rounded-2xl bg-white">
                  <AvatarImage src={editingOpp?.logoUrl} className="object-contain p-2" />
                  <AvatarFallback className="bg-slate-50 text-slate-300"><Shield className="h-10 w-10" /></AvatarFallback>
                </Avatar>
                <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ImagePlus className="h-6 w-6 text-white" />
                </button>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-bold">Nombre Oficial</Label>
                <Input value={editingOpp?.name || ""} onChange={e => setEditingOpp({...editingOpp, name: e.target.value})} className="h-12 border-2" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Dirección de Sede</Label>
                <Input value={editingOpp?.address || ""} onChange={e => setEditingOpp({...editingOpp, address: e.target.value})} className="h-12 border-2" />
              </div>
            </div>
          </div>
          <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-8 border-t">
            <Button variant="ghost" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateOpponent} className="font-black uppercase text-xs tracking-widest h-12 px-10">Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
