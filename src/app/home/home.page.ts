import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { AuthService } from '../core/auth.service';
import { GOAL_OPTIONS, PLACE_OPTIONS, STYLE_OPTIONS, labelOf } from '../core/models';
import { ProfileService } from '../core/profile.service';

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
  ],
})
export class HomePage {
  private readonly auth = inject(AuthService);
  private readonly profiles = inject(ProfileService);
  private readonly router = inject(Router);

  readonly firstName = computed(() => {
    const name = this.profiles.profile()?.full_name?.trim();
    return name ? name.split(/\s+/)[0] : '';
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

  async logout() {
    await this.auth.signOut();
    this.profiles.reset();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
