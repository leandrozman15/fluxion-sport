'use client';
import {
  Auth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';

/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  signInAnonymously(authInstance).catch(err => console.warn("Anon sign-in suppressed:", err.message));
}

/** Initiate email/password sign-up (non-blocking). */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string): void {
  createUserWithEmailAndPassword(authInstance, email, password).catch(err => {
    // Si el email ya está en uso, ignoramos el error para permitir que el flujo de Firestore continúe.
    if (err.code === 'auth/email-already-in-use') {
      console.warn("El usuario ya existe en Auth. Se procederá con la actualización de su perfil.");
    } else {
      console.error("Error en registro de Auth:", err.message);
    }
  });
}

/** Initiate email/password sign-in (non-blocking). */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string): void {
  signInWithEmailAndPassword(authInstance, email, password).catch(err => console.warn("Sign-in error suppressed:", err.message));
}

/** Initiate password reset email (non-blocking). */
export function initiatePasswordReset(authInstance: Auth, email: string): Promise<void> {
  // CRITICAL: Call sendPasswordResetEmail directly.
  return sendPasswordResetEmail(authInstance, email);
}
