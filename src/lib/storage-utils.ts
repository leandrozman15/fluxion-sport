
'use client';

import { ref, uploadBytes, getDownloadURL, FirebaseStorage } from "firebase/storage";

/**
 * Sube un archivo o una cadena base64 a Firebase Storage y devuelve la URL de descarga.
 * @param storage Instancia de Firebase Storage.
 * @param path Ruta donde se guardará el archivo (ej. 'clubs/logo.png').
 * @param file Archivo Blob/File o cadena DataURL (base64).
 * @returns Promesa con la URL de descarga.
 */
export async function uploadFileAndGetUrl(
  storage: FirebaseStorage,
  path: string,
  file: File | Blob | string
): Promise<string> {
  const storageRef = ref(storage, path);
  
  let blob: Blob;
  
  if (typeof file === 'string' && file.startsWith('data:')) {
    // Es un base64 DataURL
    const response = await fetch(file);
    blob = await response.blob();
  } else if (file instanceof Blob || file instanceof File) {
    blob = file;
  } else {
    throw new Error('Tipo de archivo no soportado para carga en Storage.');
  }

  const snapshot = await uploadBytes(storageRef, blob);
  const downloadUrl = await getDownloadURL(snapshot.ref);
  
  return downloadUrl;
}
