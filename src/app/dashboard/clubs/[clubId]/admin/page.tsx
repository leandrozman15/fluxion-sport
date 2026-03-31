
"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Pantalla de Administración eliminada a solicitud del usuario.
 * Redirige al panel general del club.
 */
export default function DeletedAdminPage() {
  const { clubId } = useParams() as { clubId: string };
  const router = useRouter();

  useEffect(() => {
    router.replace(`/dashboard/clubs/${clubId}`);
  }, [router, clubId]);

  return (
    <div className="flex h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-white opacity-50" />
    </div>
  );
}
