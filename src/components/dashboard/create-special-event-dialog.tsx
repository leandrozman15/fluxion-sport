
"use client";

import { useState, useRef } from "react";
import {
  Loader2,
  Camera,
  Megaphone,
  CheckCircle2,
  Upload,
  Video,
  Image as ImageIcon,
  Play,
  X,
} from "lucide-react";
import { collection, doc, setDoc } from "firebase/firestore";
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useFirebase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { compressImage } from "@/lib/compress-image";

type MediaType = "image" | "video";

const MAX_VIDEO_DURATION = 20; // seconds
const MAX_VIDEO_MB = 80;

function validateVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer el video")); };
    video.src = url;
  });
}

export function CreateSpecialEventDialog({ clubId, authorName }: { clubId: string; authorName: string }) {
  const { firebaseApp, firestore } = useFirebase();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mediaType, setMediaType] = useState<MediaType>("image");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "",
    comment: "",
    imageUrl: "",
    videoUrl: "",
    videoPreview: "",   // local object URL for preview only
    videoDuration: 0,
  });

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    setForm(prev => ({ ...prev, imageUrl: compressed }));
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeMB = file.size / 1024 / 1024;
    if (sizeMB > MAX_VIDEO_MB) {
      toast({ variant: "destructive", title: "Video demasiado grande", description: `Máximo ${MAX_VIDEO_MB} MB.` });
      return;
    }

    try {
      const dur = await validateVideoDuration(file);
      if (dur > MAX_VIDEO_DURATION + 2) {
        toast({
          variant: "destructive",
          title: "Video demasiado largo",
          description: `Máximo ${MAX_VIDEO_DURATION} segundos. Este tiene ${Math.round(dur)}s.`,
        });
        e.target.value = "";
        return;
      }
      const preview = URL.createObjectURL(file);
      setForm(prev => ({ ...prev, videoPreview: preview, videoDuration: Math.round(dur), videoFile: file } as any));
    } catch {
      toast({ variant: "destructive", title: "No se pudo procesar el video" });
    }
  };

  const uploadVideo = async (file: File, eventId: string): Promise<string> => {
    const storage = getStorage(firebaseApp);
    const ext = file.name.split(".").pop() || "mp4";
    const path = `clubs/${clubId}/media/events/${eventId}.${ext}`;
    const sRef = storageRef(storage, path);
    return new Promise((resolve, reject) => {
      const task = uploadBytesResumable(sRef, file);
      task.on(
        "state_changed",
        snap => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
        reject,
        async () => resolve(await getDownloadURL(task.snapshot.ref))
      );
    });
  };

  const handlePublish = async () => {
    if (!form.title || !form.comment || !clubId) return;
    if (mediaType === "video" && !(form as any).videoFile) {
      toast({ variant: "destructive", title: "Seleccioná un video antes de publicar" });
      return;
    }
    setLoading(true);
    setUploadProgress(0);
    try {
      const eventId = doc(collection(firestore, "clubs", clubId, "special_events")).id;

      let videoUrl = "";
      if (mediaType === "video" && (form as any).videoFile) {
        videoUrl = await uploadVideo((form as any).videoFile, eventId);
      }

      const eventRef = doc(firestore, "clubs", clubId, "special_events", eventId);
      await setDoc(eventRef, {
        id: eventId,
        clubId,
        authorName,
        title: form.title,
        comment: form.comment,
        mediaType,
        imageUrl: mediaType === "image" ? form.imageUrl : "",
        videoUrl: mediaType === "video" ? videoUrl : "",
        videoDuration: mediaType === "video" ? form.videoDuration : 0,
        createdAt: new Date().toISOString(),
      });

      toast({ title: "Novedad Publicada", description: "El contenido ya es visible para los socios." });
      // Cleanup preview URL
      if (form.videoPreview) URL.revokeObjectURL(form.videoPreview);
      setForm({ title: "", comment: "", imageUrl: "", videoUrl: "", videoPreview: "", videoDuration: 0 });
      setMediaType("image");
      setIsOpen(false);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error al publicar" });
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const clearVideo = () => {
    if (form.videoPreview) URL.revokeObjectURL(form.videoPreview);
    setForm(prev => ({ ...prev, videoPreview: "", videoDuration: 0, videoFile: undefined } as any));
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="h-12 px-6 font-black uppercase text-[10px] tracking-[0.2em] gap-3 shadow-xl bg-primary text-white hover:bg-primary/90 rounded-xl">
          <Megaphone className="h-4 w-4" /> Publicar Novedad
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-white border-none shadow-2xl rounded-[2.5rem]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Nueva Novedad</DialogTitle>
          <DialogDescription className="font-bold text-slate-500">Publica noticias o videos cortos para los socios.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-6 max-h-[70vh] overflow-y-auto pr-2">

          {/* Media type toggle */}
          <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setMediaType("image")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                ${mediaType === "image" ? "bg-white shadow-md text-primary" : "text-slate-400 hover:text-slate-600"}`}
            >
              <ImageIcon className="h-3.5 w-3.5" /> Imagen
            </button>
            <button
              type="button"
              onClick={() => setMediaType("video")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                ${mediaType === "video" ? "bg-white shadow-md text-primary" : "text-slate-400 hover:text-slate-600"}`}
            >
              <Video className="h-3.5 w-3.5" /> Video corto
            </button>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Título</Label>
            <Input
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Ej. Post-partido: habla el DT"
              className="h-12 border-2 font-bold"
            />
          </div>

          {/* Media upload area */}
          {mediaType === "image" ? (
            <div className="space-y-2">
              <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Imagen / Banner</Label>
              <div
                onClick={() => imageInputRef.current?.click()}
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
              <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Video Corto</Label>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Máx. {MAX_VIDEO_DURATION}s</span>
              </div>
              {form.videoPreview ? (
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black">
                  <video
                    src={form.videoPreview}
                    className="w-full h-full object-cover"
                    controls
                    muted
                  />
                  <button
                    type="button"
                    onClick={clearVideo}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="absolute bottom-2 left-3 bg-black/60 backdrop-blur-sm text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg">
                    {form.videoDuration}s
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => videoInputRef.current?.click()}
                  className="aspect-video w-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-all group"
                >
                  <Play className="h-10 w-10 text-slate-300 mb-2 group-hover:text-primary transition-colors" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subir Video</p>
                  <p className="text-[9px] text-slate-300 font-bold mt-1">mp4, mov, webm · máx. {MAX_VIDEO_DURATION}s</p>
                </div>
              )}
              <input
                type="file"
                ref={videoInputRef}
                className="hidden"
                accept="video/mp4,video/quicktime,video/webm,video/*"
                onChange={handleVideoChange}
              />
            </div>
          )}

          {/* Comment */}
          <div className="space-y-2">
            <Label className="font-black text-xs uppercase tracking-widest text-slate-400">Descripción</Label>
            <Textarea
              value={form.comment}
              onChange={e => setForm({ ...form, comment: e.target.value })}
              placeholder="Mensaje oficial o contexto del video..."
              className="min-h-[100px] border-2 font-medium"
            />
          </div>

          {/* Upload progress bar */}
          {loading && mediaType === "video" && (
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <span>Subiendo video...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-8 border-t border-slate-100 mt-4 rounded-b-[2.5rem]">
          <Button variant="ghost" onClick={() => setIsOpen(false)} className="font-bold text-slate-500">Cancelar</Button>
          <Button
            onClick={handlePublish}
            disabled={loading || !form.title || !form.comment}
            className="font-black uppercase text-xs tracking-widest h-14 px-10 shadow-xl shadow-primary/20 gap-2"
          >
            {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            {loading ? (mediaType === "video" ? "Subiendo..." : "Publicando...") : "Confirmar y Publicar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
