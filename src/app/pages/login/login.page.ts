import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonInput, IonInputPasswordToggle, ToastController } from '@ionic/angular';

import { BrandLogoComponent } from '../../shared/brand-logo.component';
import { AuthService, translateAuthError } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    IonContent,
    IonInput,
    IonInputPasswordToggle,
    IonButton,
    BrandLogoComponent,
  ],
  template: `
    <ion-content>
      <app-brand-logo tagline="Entrena con ciencia, no con suerte"></app-brand-logo>
      <form class="page sheet" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <h1>Bienvenido/a</h1>
        <p class="hint">Inicia sesión para ver tu rutina.</p>

        <ion-input
          label="Correo"
          labelPlacement="floating"
          fill="outline"
          type="email"
          inputmode="email"
          autocomplete="email"
          formControlName="email"
        ></ion-input>

        <ion-input
          label="Contraseña"
          labelPlacement="floating"
          fill="outline"
          type="password"
          autocomplete="current-password"
          formControlName="password"
        >
          <ion-input-password-toggle slot="end"></ion-input-password-toggle>
        </ion-input>

        <ion-button type="submit" expand="block" [disabled]="busy()">
          {{ busy() ? 'Entrando...' : 'Entrar' }}
        </ion-button>

        <ion-button fill="clear" expand="block" routerLink="/registro"> ¿No tienes cuenta? Regístrate </ion-button>
      </form>
    </ion-content>
  `,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastController);

  readonly busy = signal(false);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  async submit() {
    if (this.form.invalid || this.busy()) {
      await this.toast('Escribe tu correo y contraseña.');
      return;
    }
    this.busy.set(true);
    try {
      const { email, password } = this.form.getRawValue();
      const { error } = await this.auth.signIn(email!.trim().toLowerCase(), password!);
      if (error) {
        await this.toast(translateAuthError(error.message));
        return;
      }
      await this.router.navigateByUrl('/home', { replaceUrl: true });
    } catch {
      await this.toast('No se pudo conectar. Revisa tu internet.');
    } finally {
      this.busy.set(false);
    }
  }

  private async toast(message: string) {
    const t = await this.toasts.create({ message, duration: 3500, position: 'top' });
    await t.present();
  }
}
