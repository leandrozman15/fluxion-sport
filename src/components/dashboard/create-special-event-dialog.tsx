
"use client";

import { useState, useRef } from "react";
import { 
  Plus, 
  Loader2, 
  Camera, 
  Megaphone, 
  CheckCircle2, 
  Upload
} from "lucide-react";
import { collection, doc, setDoc } from "firebase/firestore";
import { useFirestore, useFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export function CreateSpecialEventDialog({ clubId, authorName }: { clubId: string, authorName: string }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "",
    comment: "",
    imageUrl: ""
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePublish = async () => {
    if (!form.title || !form.comment || !clubId) return;
    setLoading(true);
    try {
      const eventId = doc(collection(firestore, "clubs", clubId, "special_events")).id;
      const eventRef = doc(firestore, "clubs", clubId, "special_events", eventId);

      await setDoc(eventRef, {
        ...form,
        id: eventId,
        clubId,
        authorName,
        createdAt: new Date().toISOString()
      });

      toast({ title: "Evento Publicado", description: "La novedad ya es visible para los socios." });
      setForm({ title: "", comment: "", imageUrl: "" });
      setIsOpen(false);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error al publicar" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="h-12 px-6 font-black uppercase text-[10px] tracking-[0.2em] gap-3 shadow-xl bg-primary text-white hover:bg-primary/90 rounded-xl">
          <Megaphone className="h-4 w-4" /> Publicar Evento Especial
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-white border-none shadow-2xl rounded-[2.5rem]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Nuevo Comunicado</DialogTitle>
          <DialogDescription className="font-bold text-slate-500">Publica noticias en el inicio institucional.</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          <div className="space-y-2">
            <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Título de la Novedad</Label>
            <Input 
              value={form.title} 
              onChange={e => setForm({...form, title: e.target.value})} 
              placeholder="Ej. Gran Cena de Fin de Año" 
              className="h-12 border-2 font-bold"
            />
          </div>

          <div className="space-y-2">
            <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Imagen / Banner</Label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="aspect-video w-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-all overflow-hidden group"
            >
              {form.imageUrl ? (
                <div className="relative w-full h-full">
                  <img src={form.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="h-8 w-8 text-white" />
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-slate-300 mb-2" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subir Imagen</p>
                </>
              )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
          </div>

          <div className="space-y-2">
            <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Comentario / Detalles</Label>
            <Textarea 
              value={form.comment} 
              onChange={e => setForm({...form, comment: e.target.value})} 
              placeholder="Mensaje oficial..." 
              className="min-h-[120px] border-2 font-medium"
            />
          </div>
        </div>

        <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-8 border-t border-slate-100 mt-4 rounded-b-[2.5rem]">
          <Button variant="ghost" onClick={() => setIsOpen(false)} className="font-bold text-slate-500">Cancelar</Button>
          <Button onClick={handlePublish} disabled={loading || !form.title || !form.comment} className="font-black uppercase text-xs tracking-widest h-14 px-10 shadow-xl shadow-primary/20 gap-2">
            {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            Confirmar y Publicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
