import { Component, inject, signal } from '@angular/core';
import {
  type AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  type ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonInputPasswordToggle,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';

import { AuthService, translateAuthError } from '../../core/auth.service';
import { BrandLogoComponent } from '../../shared/brand-logo.component';
import { COUNTRY_OPTIONS, GENDER_OPTIONS } from '../../core/models';

function ageBetween(min: number, max: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = control.value as string;
    if (!v) return null;
    const born = new Date(v + 'T00:00:00');
    if (Number.isNaN(born.getTime())) return { date: true };
    const now = new Date();
    let age = now.getFullYear() - born.getFullYear();
    const hadBirthday =
      now.getMonth() > born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() >= born.getDate());
    if (!hadBirthday) age--;
    return age >= min && age <= max ? null : { age: { min, max } };
  };
}

/** Igual que en Supabase Auth (password_requirements = letters_digits). */
function lettersAndDigits(control: AbstractControl): ValidationErrors | null {
  const v = String(control.value ?? '');
  if (!v) return null;
  return /[A-Za-z]/.test(v) && /\d/.test(v) ? null : { weak: true };
}

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const p = group.get('password')?.value;
  const p2 = group.get('password2')?.value;
  return p && p2 && p !== p2 ? { mismatch: true } : null;
}

@Component({
  selector: 'app-register',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    BrandLogoComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonInput,
    IonInputPasswordToggle,
    IonSelect,
    IonSelectOption,
    IonButton,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Crear cuenta</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <app-brand-logo [small]="true"></app-brand-logo>
      <form class="page" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <p class="section-title">Tus datos</p>

        <ion-input
          label="Nombre completo"
          labelPlacement="floating"
          fill="outline"
          autocomplete="name"
          formControlName="fullName"
          [class.ion-invalid]="bad('fullName')"
          [class.ion-touched]="bad('fullName')"
          [errorText]="msg('fullName')"
        ></ion-input>

        <ion-input
          label="Teléfono (ej: +56912345678)"
          labelPlacement="floating"
          fill="outline"
          type="tel"
          inputmode="tel"
          autocomplete="tel"
          formControlName="phone"
          [class.ion-invalid]="bad('phone')"
          [class.ion-touched]="bad('phone')"
          [errorText]="msg('phone')"
        ></ion-input>

        <ion-select
          label="Género"
          labelPlacement="floating"
          fill="outline"
          interface="popover"
          formControlName="gender"
          [class.ion-invalid]="bad('gender')"
          [class.ion-touched]="bad('gender')"
          [errorText]="msg('gender')"
        >
          @for (g of genders; track g.value) {
            <ion-select-option [value]="g.value">{{ g.label }}</ion-select-option>
          }
        </ion-select>

        <ion-input
          label="Fecha de nacimiento"
          labelPlacement="stacked"
          fill="outline"
          type="date"
          [max]="today"
          formControlName="birthDate"
          [class.ion-invalid]="bad('birthDate')"
          [class.ion-touched]="bad('birthDate')"
          [errorText]="msg('birthDate')"
        ></ion-input>

        <ion-input
          label="Peso (kg)"
          labelPlacement="floating"
          fill="outline"
          type="number"
          inputmode="decimal"
          formControlName="weightKg"
          [class.ion-invalid]="bad('weightKg')"
          [class.ion-touched]="bad('weightKg')"
          [errorText]="msg('weightKg')"
        ></ion-input>

        <ion-input
          label="Altura (cm)"
          labelPlacement="floating"
          fill="outline"
          type="number"
          inputmode="decimal"
          formControlName="heightCm"
          [class.ion-invalid]="bad('heightCm')"
          [class.ion-touched]="bad('heightCm')"
          [errorText]="msg('heightCm')"
        ></ion-input>

        <ion-select
          label="País"
          labelPlacement="floating"
          fill="outline"
          interface="popover"
          formControlName="country"
          [class.ion-invalid]="bad('country')"
          [class.ion-touched]="bad('country')"
          [errorText]="msg('country')"
        >
          @for (c of countries; track c) {
            <ion-select-option [value]="c">{{ c }}</ion-select-option>
          }
        </ion-select>

        <p class="section-title">Tu cuenta</p>

        <ion-input
          label="Correo"
          labelPlacement="floating"
          fill="outline"
          type="email"
          inputmode="email"
          autocomplete="email"
          formControlName="email"
          [class.ion-invalid]="bad('email')"
          [class.ion-touched]="bad('email')"
          [errorText]="msg('email')"
        ></ion-input>

        <ion-input
          label="Contraseña (mínimo 8 caracteres)"
          labelPlacement="floating"
          fill="outline"
          type="password"
          autocomplete="new-password"
          formControlName="password"
          [class.ion-invalid]="bad('password')"
          [class.ion-touched]="bad('password')"
          [errorText]="msg('password')"
        >
          <ion-input-password-toggle slot="end"></ion-input-password-toggle>
        </ion-input>

        <ion-input
          label="Repite la contraseña"
          labelPlacement="floating"
          fill="outline"
          type="password"
          autocomplete="new-password"
          formControlName="password2"
          [class.ion-invalid]="bad('password2') || mismatch()"
          [class.ion-touched]="bad('password2') || mismatch()"
          [errorText]="mismatch() ? 'Las contraseñas no coinciden' : msg('password2')"
        ></ion-input>

        <ion-button type="submit" expand="block" [disabled]="busy()">
          {{ busy() ? 'Creando cuenta...' : 'Crear cuenta' }}
        </ion-button>

        <ion-button fill="clear" expand="block" routerLink="/login"> ¿Ya tienes cuenta? Inicia sesión </ion-button>
      </form>
    </ion-content>
  `,
})
export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastController);

  readonly genders = GENDER_OPTIONS;
  readonly countries = COUNTRY_OPTIONS;
  readonly today = new Date().toISOString().slice(0, 10);
  readonly busy = signal(false);

  readonly form = this.fb.group(
    {
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9 ]{8,15}$/)]],
      gender: ['', [Validators.required]],
      birthDate: ['', [Validators.required, ageBetween(14, 100)]],
      weightKg: ['', [Validators.required, Validators.min(20), Validators.max(400)]],
      heightCm: ['', [Validators.required, Validators.min(80), Validators.max(250)]],
      country: ['Chile', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8), lettersAndDigits]],
      password2: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  bad(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  mismatch(): boolean {
    const c = this.form.get('password2');
    return !!this.form.errors?.['mismatch'] && !!c && (c.touched || c.dirty);
  }

  msg(name: string): string {
    const e = this.form.get(name)?.errors;
    if (!e) return '';
    if (e['required']) return 'Este campo es obligatorio';
    if (e['email']) return 'Escribe un correo válido';
    if (e['minlength']) return `Mínimo ${e['minlength'].requiredLength} caracteres`;
    if (e['pattern']) return 'Formato no válido (ej: +56912345678)';
    if (e['min']) return `El valor mínimo es ${e['min'].min}`;
    if (e['max']) return `El valor máximo es ${e['max'].max}`;
    if (e['age']) return `La edad debe estar entre ${e['age'].min} y ${e['age'].max} años`;
    if (e['date']) return 'Fecha no válida';
    if (e['weak']) return 'Usa letras y números';
    return 'Dato no válido';
  }

  async submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy()) {
      await this.toast('Revisa los campos marcados en rojo.');
      return;
    }
    this.busy.set(true);
    try {
      const v = this.form.getRawValue();
      const { data, error } = await this.auth.signUp(v.email!.trim().toLowerCase(), v.password!, {
        full_name: v.fullName!.trim(),
        phone: v.phone!.replace(/\s+/g, ''),
        birth_date: v.birthDate!,
        gender: v.gender!,
        weight_kg: Number(v.weightKg),
        height_cm: Number(v.heightCm),
        country: v.country!,
      });
      if (error) {
        await this.toast(translateAuthError(error.message));
        return;
      }
      if (!data.session) {
        await this.toast('Cuenta creada. Revisa tu correo para confirmarla.');
        await this.router.navigateByUrl('/login', { replaceUrl: true });
        return;
      }
      await this.router.navigateByUrl('/onboarding', { replaceUrl: true });
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
