import type { Routes } from '@angular/router';

import { authGuard, guestGuard, onboardedGuard } from './core/guards';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'registro',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'onboarding',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/onboarding/onboarding.page').then((m) => m.OnboardingPage),
  },
  {
    // Mismo cuestionario, con las respuestas guardadas para editarlas.
    path: 'perfil',
    canActivate: [authGuard, onboardedGuard],
    data: { edit: true },
    loadComponent: () => import('./pages/onboarding/onboarding.page').then((m) => m.OnboardingPage),
  },
  {
    path: 'home',
    canActivate: [authGuard, onboardedGuard],
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'rutina',
    canActivate: [authGuard, onboardedGuard],
    loadComponent: () => import('./pages/routine/routine.page').then((m) => m.RoutinePage),
  },
  {
    path: 'rutina/:id',
    canActivate: [authGuard, onboardedGuard],
    loadComponent: () => import('./pages/routine/routine.page').then((m) => m.RoutinePage),
  },
  {
    // Entrenamiento guiado de un día: ejercicio por ejercicio, con peso, series, RIR y descanso.
    path: 'entrenar/:dayId',
    canActivate: [authGuard, onboardedGuard],
    loadComponent: () => import('./pages/workout/workout.page').then((m) => m.WorkoutPage),
  },
  {
    // Crear una rutina a mano: cuerpo interactivo, ejercicios recomendados y reglas que aconsejan.
    path: 'crear-rutina',
    canActivate: [authGuard, onboardedGuard],
    loadComponent: () => import('./pages/manual/manual.page').then((m) => m.ManualPage),
  },
  {
    path: 'rutinas',
    canActivate: [authGuard, onboardedGuard],
    loadComponent: () => import('./pages/routines/routines.page').then((m) => m.RoutinesPage),
  },
  {
    path: 'progreso',
    canActivate: [authGuard, onboardedGuard],
    loadComponent: () => import('./pages/progress/progress.page').then((m) => m.ProgressPage),
  },
  {
    // Informe semanal y recomendaciones de carga (aceptar o rechazar).
    path: 'informe',
    canActivate: [authGuard, onboardedGuard],
    loadComponent: () => import('./pages/report/report.page').then((m) => m.ReportPage),
  },
  {
    // Progresión por ejercicio, comparación entre semanas, mediciones y metas.
    path: 'evolucion',
    canActivate: [authGuard, onboardedGuard],
    loadComponent: () => import('./pages/evolution/evolution.page').then((m) => m.EvolutionPage),
  },
  {
    // Vínculo opcional entre los dos perfiles: compartir rutina y comparación.
    path: 'pareja',
    canActivate: [authGuard, onboardedGuard],
    loadComponent: () => import('./pages/partner/partner.page').then((m) => m.PartnerPage),
  },
  {
    // Datos personales, máquinas, exportar/importar e historial de modificaciones.
    path: 'mis-datos',
    canActivate: [authGuard, onboardedGuard],
    loadComponent: () => import('./pages/data/data.page').then((m) => m.DataPage),
  },
  {
    path: 'mensajes',
    canActivate: [authGuard, onboardedGuard],
    loadComponent: () => import('./pages/messages/messages.page').then((m) => m.MessagesPage),
  },
  {
    path: 'ciencia',
    canActivate: [authGuard, onboardedGuard],
    loadComponent: () => import('./pages/science/science.page').then((m) => m.SciencePage),
  },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', redirectTo: 'home' },
];
