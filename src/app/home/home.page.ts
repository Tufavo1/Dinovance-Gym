import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  AlertController,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonProgressBar,
  IonTitle,
  IonToolbar,
  type ViewWillEnter,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { logOutOutline } from 'ionicons/icons';

import { AuthService } from '../core/auth.service';
import { GOAL_OPTIONS, PLACE_OPTIONS, STYLE_OPTIONS, labelOf } from '../core/models';
import { ProfileService } from '../core/profile.service';
import { ReportService } from '../core/report.service';
import { RoutineService, type StoredRoutine } from '../core/routine.service';
import { WorkoutService, type WorkoutProgress } from '../core/workout.service';
import { HeaderActionsComponent } from '../shared/header-actions.component';
import { MessageService } from '../core/message.service';
import { TabBarComponent } from '../shared/tab-bar.component';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonButton,
    IonButtons,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonProgressBar,
    TabBarComponent,
    HeaderActionsComponent,
  ],
})
export class HomePage implements ViewWillEnter {
  private readonly auth = inject(AuthService);
  private readonly profiles = inject(ProfileService);
  private readonly routines = inject(RoutineService);
  private readonly workouts = inject(WorkoutService);
  private readonly router = inject(Router);
  private readonly alerts = inject(AlertController);
  private readonly messages = inject(MessageService);
  private readonly reports = inject(ReportService);

  readonly loading = signal(true);
  private readonly routine = signal<StoredRoutine | null>(null);
  private readonly progress = signal<WorkoutProgress | null>(null);

  constructor() {
    addIcons({ logOutOutline });
  }

  readonly firstName = computed(() => {
    const name = this.profiles.profile()?.full_name?.trim();
    return name ? name.split(/\s+/)[0] : '';
  });

  readonly today = computed(() => {
    const r = this.routine();
    if (!r || r.routine_days.length === 0) return null;
    const day = r.routine_days[this.progress()?.nextDay ?? 0] ?? r.routine_days[0];
    return {
      id: day.id,
      day_index: day.day_index,
      title: day.name.replace(/^Día \d+ · /, ''),
      exercises: day.routine_exercises.length,
      minutes: day.estimated_minutes,
    };
  });

  readonly week = computed(() => {
    const r = this.routine();
    const p = this.progress();
    if (!r || !p) return null;
    const goal = r.routine_days.length;
    const done = p.doneThisWeek;
    return {
      done,
      goal,
      message: done >= goal ? '¡Cumpliste tu semana!' : 'Toca Empezar: la app te guía ejercicio por ejercicio.',
    };
  });

  readonly greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
  };

  readonly todayTitle = computed(() => {
    if (this.loading()) return 'Cargando…';
    const t = this.today();
    return t ? `Día ${t.day_index} · ${t.title}` : 'Tu primera rutina';
  });

  readonly todayDetail = computed(() => {
    const t = this.today();
    if (t) return `${t.exercises} ejercicios${t.minutes ? ` · ≈ ${t.minutes} min` : ''}`;
    return this.loading() ? '' : 'La armamos en segundos con tus respuestas.';
  });

  readonly summary = computed(() => {
    const h = this.profiles.health();
    if (!h) return null;
    return {
      goal: labelOf(GOAL_OPTIONS, h.goal),
      styles: (h.training_styles ?? []).map((s) => labelOf(STYLE_OPTIONS, s)).join(', '),
      days: h.days_per_week,
      minutes: h.session_minutes,
      places: h.places.map((p) => labelOf(PLACE_OPTIONS, p)).join(', '),
    };
  });

  /** Se recarga cada vez que se vuelve a Inicio (por ejemplo, después de terminar un día). */
  ionViewWillEnter() {
    void this.load();
  }

  private async load() {
    // Entrenamientos que quedaron sin enviar por falta de conexión.
    void this.workouts.flushPending().catch(() => undefined);
    try {
      const { routine, offline } = await this.routines.loadActive();
      this.routine.set(routine);
      this.progress.set(routine && !offline ? await this.workouts.progress(routine) : null);
      // Análisis semanal automático: cierra en segundo plano los informes de las semanas ya
      // terminadas que falten (no hay tarea programada en el servidor).
      if (!offline) void this.reports.ensureReports().catch(() => undefined);
    } catch {
      // Sin conexión y sin copia local: Inicio sigue funcionando con el resumen del plan.
    } finally {
      this.loading.set(false);
    }
  }

  async logout() {
    const alert = await this.alerts.create({
      header: 'Cerrar sesión',
      message: '¿Quieres salir de tu cuenta en este dispositivo?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Salir', role: 'confirm' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'confirm') return;
    await this.auth.signOut();
    this.profiles.reset();
    this.messages.reset();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
