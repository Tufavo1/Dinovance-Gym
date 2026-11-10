import { Component, input } from '@angular/core';

/** Cabecera de marca para acceso y registro: ícono sobre tarjeta clara + nombre. */
@Component({
  selector: 'app-brand-logo',
  template: `
    <div class="hero brand">
      <img
        class="tile"
        src="assets/icon/icon-512.png"
        alt=""
        [width]="small() ? 64 : 88"
        [height]="small() ? 64 : 88"
      />
      <img class="word" src="assets/wordmark.png" alt="Dinovance" [width]="small() ? 140 : 180" />
      @if (tagline()) {
        <p>{{ tagline() }}</p>
      }
    </div>
  `,
  styles: `
    .brand {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: max(env(safe-area-inset-top), 24px) 16px 56px;
    }
    .tile {
      border-radius: 24px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    }
    .word {
      height: auto;
    }
    p {
      margin: 0;
      font-size: 0.9rem;
      color: rgba(255, 255, 255, 0.75);
      text-align: center;
    }
  `,
})
export class BrandLogoComponent {
  readonly small = input(false);
  readonly tagline = input('');
}
