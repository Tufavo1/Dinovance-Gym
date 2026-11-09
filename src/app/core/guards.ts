import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

import { AuthService } from './auth.service';
import { ProfileService } from './profile.service';

/** Exige sesión iniciada; si no, manda a /login. */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.initialized;
  return auth.session() ? true : router.createUrlTree(['/login']);
};

/** Solo para quien NO ha iniciado sesión (login y registro). */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.initialized;
  return auth.session() ? router.createUrlTree(['/home']) : true;
};

/** Exige haber completado el cuestionario de salud; si no, manda a /onboarding. */
export const onboardedGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const profiles = inject(ProfileService);
  const router = inject(Router);
  // Angular ejecuta las guardas en paralelo: hay que esperar a que se recupere la sesión,
  // si no, al recargar la página el perfil se lee sin usuario y se manda al cuestionario.
  await auth.initialized;
  try {
    await profiles.load();
  } catch {
    // Sin conexión no podemos saberlo; dejamos pasar (el modo offline se resuelve más adelante).
    return true;
  }
  return profiles.isOnboarded() ? true : router.createUrlTree(['/onboarding']);
};
