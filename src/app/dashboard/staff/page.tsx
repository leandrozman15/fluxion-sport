
"use client";

import { useState } from "react";
import { 
  Plus, 
  Loader2, 
  UserCog, 
  Mail, 
  ShieldCheck,
  Trash2,
  Flag,
  Lock,
  ChevronRight
} from "lucide-react";
import { collection, doc, setDoc, query, where } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export default function StaffManagementPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "referee", id: "", sport: "hockey" });

  // Filtramos la colección global de usuarios para mostrar solo oficiales (árbitros/admins)
  const usersQuery = useMemoFirebase(() => 
    query(collection(db, "users"), where("role", "in", ["admin", "fed_admin", "referee"])), 
    [db]
  );
  const { data: users, isLoading } = useCollection(usersQuery);

  const handleCreateStaff = async () => {
    if (!newUser.id || !newUser.name) return;
    const userDoc = doc(db, "users", newUser.id);
    
    try {
      await setDoc(userDoc, {
        ...newUser,
        createdAt: new Date().toISOString()
      });
      
      toast({ title: "Oficial Registrado", description: `${newUser.name} ha sido añadido como ${newUser.role}.` });
      setNewUser({ name: "", email: "", role: "referee", id: "", sport: "hockey" });
      setIsDialogOpen(false);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error al registrar" });
    }
  };

  const handleDeleteUser = (id: string) => {
    if(confirm("¿Eliminar este perfil de oficial?")) {
      deleteDocumentNonBlocking(doc(db, "users", id));
      toast({ variant: "destructive", title: "Perfil Eliminado" });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black font-headline text-white drop-shadow-md">Staff & Oficiales</h1>
          <p className="text-white/80 font-bold uppercase tracking-widest text-[10px] mt-1">Gestión de árbitros y personal administrativo global.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2 h-12 px-6 font-black uppercase text-xs tracking-widest shadow-lg">
              <Plus className="h-5 w-5" /> Registrar Oficial
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-slate-900">Nuevo Miembro de Staff</DialogTitle>
              <DialogDescription className="text-slate-500">Asigna roles y disciplina predominante para el oficial.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold text-slate-700">Disciplina Principal</Label>
                  <p className="text-[10px] text-primary font-black uppercase tracking-widest">
                    {newUser.sport === 'rugby' ? '🏉 RUGBY' : '🏑 HOCKEY'}
                  </p>
                </div>
                <Switch 
                  checked={newUser.sport === 'rugby'} 
                  onCheckedChange={(v) => setNewUser({...newUser, sport: v ? 'rugby' : 'hockey'})} 
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 font-bold">UID del Usuario</Label>
                <Input value={newUser.id} onChange={e => setNewUser({...newUser, id: e.target.value})} placeholder="ID de autenticación" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 font-bold">Nombre Completo</Label>
                <Input value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} placeholder="Ej. Juan Referí" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 font-bold">Email Institucional</Label>
                <Input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} placeholder="oficial@fluxionsport.app" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 font-bold">Rol del Sistema</Label>
                <Select value={newUser.role} onValueChange={v => setNewUser({...newUser, role: v})}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="referee">Árbitro</SelectItem>
                    <SelectItem value="admin">Administrador Global</SelectItem>
                    <SelectItem value="fed_admin">Administrador Federativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="bg-muted/30 -mx-6 -mb-6 p-6 mt-4">
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateStaff} disabled={!newUser.id || !newUser.name} className="font-bold">Guardar Perfil</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full flex justify-center p-12"><Loader2 className="animate-spin text-white" /></div>
        ) : (
          users?.map((u: any) => (
            <Card key={u.id} className="group hover:border-primary transition-all bg-card overflow-hidden border-l-4 border-l-primary shadow-sm">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  {u.role === 'referee' ? <Flag className="h-6 w-6 text-primary" /> : <UserCog className="h-6 w-6 text-primary" />}
                </div>
                <div>
                  <CardTitle className="text-lg font-black text-slate-900">{u.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[8px] font-black border-primary/30 text-primary uppercase">
                      {u.sport === 'rugby' ? '🏉 RUGBY' : '🏑 HOCKEY'}
                    </Badge>
                    <Badge variant="secondary" className="text-[8px] font-black uppercase">
                      {u.role}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="text-xs text-slate-500 font-medium flex items-center gap-2"><Mail className="h-3 w-3" /> {u.email}</p>
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-4 bg-slate-50/50">
                <span className="text-[10px] text-slate-400 font-mono">ID: {u.id.substring(0, 8)}...</span>
                <Button variant="ghost" size="sm" className="text-destructive h-8 w-8 p-0 hover:bg-red-50" onClick={() => handleDeleteUser(u.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
        {users?.length === 0 && !isLoading && (
          <div className="col-span-full text-center py-20 border-2 border-dashed rounded-3xl bg-white/5 backdrop-blur-sm opacity-50">
            <UserCog className="h-12 w-12 mx-auto text-white mb-4" />
            <p className="text-white font-black uppercase tracking-widest text-sm">No hay oficiales registrados.</p>
          </div>
        )}
      </div>
    </div>
  );
}
