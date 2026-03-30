
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
import { collection, doc, setDoc } from "firebase/firestore";
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

export default function StaffManagementPage() {
  const db = useFirestore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "referee", id: "", sport: "hockey" });

  const usersQuery = useMemoFirebase(() => collection(db, "users"), [db]);
  const { data: users, isLoading } = useCollection(usersQuery);

  const handleCreateStaff = () => {
    if (!newUser.id || !newUser.name) return;
    const userDoc = doc(db, "users", newUser.id);
    
    setDoc(userDoc, {
      ...newUser,
      createdAt: new Date().toISOString()
    });
    
    setNewUser({ name: "", email: "", role: "referee", id: "", sport: "hockey" });
    setIsDialogOpen(false);
  };

  const handleDeleteUser = (id: string) => {
    deleteDocumentNonBlocking(doc(db, "users", id));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline text-foreground">Staff & Oficiales</h1>
          <p className="text-muted-foreground">Gestiona los perfiles de árbitros y personal administrativo global.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Registrar Oficial
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo Miembro de Staff</DialogTitle>
              <DialogDescription>Asigna roles y disciplina predominante.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/10">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Especialidad</Label>
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
                <Label>UID del Usuario (Firebase Auth)</Label>
                <Input value={newUser.id} onChange={e => setNewUser({...newUser, id: e.target.value})} placeholder="Pega el UID del usuario" />
              </div>
              <div className="space-y-2">
                <Label>Nombre Completo</Label>
                <Input value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} placeholder="Ej. Pedro Arbitro" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} placeholder="pedro@ejemplo.com" />
              </div>
              <div className="space-y-2">
                <Label>Rol del Sistema</Label>
                <Select value={newUser.role} onValueChange={v => setNewUser({...newUser, role: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="referee">Árbitro</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="coordinator">Coordinador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateStaff} disabled={!newUser.id || !newUser.name}>Guardar Perfil</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full flex justify-center p-12"><Loader2 className="animate-spin" /></div>
        ) : (
          users?.map((u: any) => (
            <Card key={u.id} className="group hover:border-primary transition-all bg-card">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  {u.role === 'referee' ? <Flag className="h-6 w-6 text-primary" /> : <UserCog className="h-6 w-6 text-primary" />}
                </div>
                <div>
                  <CardTitle className="text-lg">{u.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[8px] font-black border-primary/30 text-primary">
                      {u.sport?.toUpperCase() || 'HOCKEY'}
                    </Badge>
                    <Badge variant="secondary" className="text-[8px] font-black uppercase">
                      {u.role}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardFooter className="flex justify-between border-t pt-4 bg-muted/5">
                <span className="text-[10px] text-muted-foreground font-mono">ID: {u.id.substring(0, 8)}...</span>
                <Button variant="ghost" size="sm" className="text-destructive h-8 w-8 p-0" onClick={() => handleDeleteUser(u.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
