import {
  Component,
  type ElementRef,
  NgZone,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
  effect,
  type AfterViewInit,
  type OnDestroy,
} from '@angular/core';
import {
  CapsuleGeometry,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Raycaster,
  Scene,
  SphereGeometry,
  Vector2,
  WebGLRenderer,
  type BufferGeometry,
} from 'three';

export type BodyView = 'front' | 'back';

export interface BodyPart {
  id: string;
  label: string;
  /** Músculos del dataset que trabaja esta zona. */
  muscles: string[];
  /** Explicación corta para quien no conoce el nombre del músculo. */
  hint: string;
}

/** Zonas tocables del cuerpo y sus músculos. */
export const BODY_PARTS: Record<string, BodyPart> = {
  pecho: { id: 'pecho', label: 'Pecho', muscles: ['chest'], hint: 'Pectorales: empujar hacia adelante.' },
  hombros: {
    id: 'hombros',
    label: 'Hombros',
    muscles: ['shoulders'],
    hint: 'Deltoides: levantar y empujar los brazos.',
  },
  biceps: { id: 'biceps', label: 'Bíceps', muscles: ['biceps'], hint: 'Parte de adelante del brazo: doblar el codo.' },
  triceps: {
    id: 'triceps',
    label: 'Tríceps',
    muscles: ['triceps'],
    hint: 'Parte de atrás del brazo: estirar el codo.',
  },
  antebrazos: { id: 'antebrazos', label: 'Antebrazos', muscles: ['forearms'], hint: 'Agarre y muñecas.' },
  abdomen: { id: 'abdomen', label: 'Abdomen', muscles: ['abdominals'], hint: 'Core: estabiliza la columna.' },
  cadera: {
    id: 'cadera',
    label: 'Cadera (aductores y abductores)',
    muscles: ['adductors', 'abductors'],
    hint: 'Cerrar y abrir las piernas; estabilizan la rodilla.',
  },
  cuadriceps: { id: 'cuadriceps', label: 'Cuádriceps', muscles: ['quadriceps'], hint: 'Parte de adelante del muslo.' },
  trapecio: { id: 'trapecio', label: 'Trapecio', muscles: ['traps'], hint: 'Entre el cuello y los hombros.' },
  espalda: {
    id: 'espalda',
    label: 'Espalda',
    muscles: ['lats', 'middle back'],
    hint: 'Dorsales y espalda media: tirar y mejorar la postura.',
  },
  lumbar: { id: 'lumbar', label: 'Zona lumbar', muscles: ['lower back'], hint: 'Espalda baja: protege la columna.' },
  gluteos: { id: 'gluteos', label: 'Glúteos', muscles: ['glutes'], hint: 'El músculo más grande: cadera y postura.' },
  isquiotibiales: {
    id: 'isquiotibiales',
    label: 'Isquiotibiales',
    muscles: ['hamstrings'],
    hint: 'Parte de atrás del muslo: doblar la rodilla.',
  },
  pantorrillas: {
    id: 'pantorrillas',
    label: 'Pantorrillas',
    muscles: ['calves'],
    hint: 'Gemelos: subir en punta de pies.',
  },
};

type Ellipsoid = [part: string, x: number, y: number, z: number, rx: number, ry: number, rz: number, tilt?: number];

/**
 * Músculos del maniquí 3D (unidades en metros, y hacia arriba, el frente mira a +z).
 * Cada elipsoide se espeja a izquierda y derecha cuando "mirror" es true.
 */
const MUSCLES: { mirror: boolean; e: Ellipsoid }[] = [
  { mirror: true, e: ['hombros', 0.255, 1.43, 0, 0.065, 0.075, 0.07] },
  { mirror: true, e: ['pecho', 0.088, 1.34, 0.085, 0.092, 0.068, 0.055, 0.12] },
  { mirror: true, e: ['biceps', 0.285, 1.27, 0.03, 0.04, 0.1, 0.042] },
  { mirror: true, e: ['triceps', 0.285, 1.27, -0.035, 0.042, 0.1, 0.042] },
  { mirror: true, e: ['antebrazos', 0.292, 1.0, 0, 0.042, 0.125, 0.042] },
  { mirror: false, e: ['abdomen', 0.042, 1.2, 0.1, 0.04, 0.034, 0.03] },
  { mirror: true, e: ['abdomen', 0.042, 1.2, 0.1, 0.04, 0.034, 0.03] },
  { mirror: true, e: ['abdomen', 0.042, 1.12, 0.1, 0.04, 0.034, 0.03] },
  { mirror: true, e: ['abdomen', 0.042, 1.04, 0.1, 0.04, 0.034, 0.03] },
  { mirror: true, e: ['cuadriceps', 0.105, 0.74, 0.045, 0.072, 0.205, 0.062] },
  { mirror: true, e: ['cadera', 0.185, 0.99, 0, 0.05, 0.075, 0.075] },
  { mirror: true, e: ['cadera', 0.058, 0.82, 0.005, 0.038, 0.15, 0.052] },
  { mirror: true, e: ['pantorrillas', 0.1, 0.3, -0.035, 0.052, 0.135, 0.058] },
  { mirror: true, e: ['isquiotibiales', 0.105, 0.72, -0.05, 0.072, 0.195, 0.062] },
  { mirror: true, e: ['gluteos', 0.092, 0.95, -0.085, 0.092, 0.088, 0.082] },
  { mirror: true, e: ['espalda', 0.125, 1.25, -0.09, 0.1, 0.165, 0.048, 0.18] },
  { mirror: false, e: ['espalda', 0, 1.31, -0.095, 0.075, 0.085, 0.04] },
  { mirror: true, e: ['trapecio', 0.065, 1.47, -0.07, 0.085, 0.06, 0.045, 0.25] },
  { mirror: false, e: ['trapecio', 0, 1.51, -0.05, 0.05, 0.07, 0.042] },
  { mirror: false, e: ['lumbar', 0, 1.07, -0.095, 0.075, 0.055, 0.042] },
];

/** Partes del maniquí que no se pueden elegir (cabeza, manos, pies y la base del cuerpo). */
const BASE: {
  kind: 'sphere' | 'capsule';
  x: number;
  y: number;
  z: number;
  a: number;
  b: number;
  c?: number;
  mirror: boolean;
}[] = [
  { kind: 'sphere', x: 0, y: 1.69, z: 0.005, a: 0.092, b: 0.108, c: 0.1, mirror: false },
  { kind: 'capsule', x: 0, y: 1.55, z: 0, a: 0.045, b: 0.07, mirror: false },
  { kind: 'sphere', x: 0, y: 1.22, z: 0, a: 0.205, b: 0.3, c: 0.115, mirror: false },
  { kind: 'sphere', x: 0, y: 0.98, z: 0, a: 0.19, b: 0.14, c: 0.11, mirror: false },
  { kind: 'capsule', x: 0.285, y: 1.18, z: 0, a: 0.036, b: 0.3, mirror: true },
  { kind: 'capsule', x: 0.292, y: 0.98, z: 0, a: 0.032, b: 0.22, mirror: true },
  { kind: 'sphere', x: 0.295, y: 0.8, z: 0, a: 0.04, b: 0.06, c: 0.03, mirror: true },
  { kind: 'capsule', x: 0.105, y: 0.72, z: 0, a: 0.06, b: 0.4, mirror: true },
  { kind: 'capsule', x: 0.1, y: 0.3, z: 0, a: 0.042, b: 0.3, mirror: true },
  { kind: 'sphere', x: 0.1, y: 0.04, z: 0.04, a: 0.05, b: 0.04, c: 0.1, mirror: true },
];

/** Zonas que solo se ven y se eligen desde la espalda; el resto, desde el frente. */
const BACK_PARTS = new Set(['espalda', 'trapecio', 'triceps', 'lumbar', 'gluteos', 'isquiotibiales', 'pantorrillas']);

const CANVAS_RATIO = 1.3;

/**
 * Maniquí 3D interactivo: arrástralo para girarlo y toca un músculo para elegirlo.
 * Rojo = lesión activa · verde = ya tiene ejercicios en el día · verde azulado = elegido.
 * Es un modelo estilizado (no un escaneo anatómico): agrupa los músculos como el generador.
 */
@Component({
  selector: 'app-body-map',
  template: `
    <div class="stage" #stage>
      <canvas #canvas [attr.aria-label]="'Maniquí 3D: toca un músculo para elegirlo'"></canvas>
      @if (unsupported()) {
        <p class="fallback">Tu dispositivo no puede mostrar el modelo 3D. Elige la zona en la lista de abajo.</p>
      }
      <span class="tip">{{ tip() }}</span>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .stage {
      position: relative;
      width: 100%;
      max-width: 340px;
      margin: 0 auto;
      aspect-ratio: 1 / 1.3;
      border-radius: 20px;
      background: radial-gradient(90% 70% at 50% 35%, rgba(14, 116, 144, 0.14), transparent 70%);
      overflow: hidden;
    }
    canvas {
      width: 100%;
      height: 100%;
      display: block;
      touch-action: pan-y;
      cursor: grab;
      outline: none;
    }
    canvas:active {
      cursor: grabbing;
    }
    .tip {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 8px;
      text-align: center;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--ion-color-medium);
      pointer-events: none;
    }
    .fallback {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      padding: 24px;
      text-align: center;
      color: var(--ion-color-medium);
    }
  `,
})
export class BodyMapComponent implements AfterViewInit, OnDestroy {
  /** Cara que mira al frente. Al girar el maniquí con el dedo se actualiza solo. */
  readonly view = model<BodyView>('front');
  readonly selected = input<string | null>(null);
  /** Zonas que ya tienen ejercicios en el día elegido. */
  readonly active = input<string[]>([]);
  /** Zonas con lesión activa. */
  readonly injured = input<string[]>([]);
  readonly pick = output<string>();

  readonly unsupported = signal(false);
  readonly tip = signal('Arrastra para girar · toca un músculo');

  private readonly zone = inject(NgZone);
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly stageRef = viewChild.required<ElementRef<HTMLDivElement>>('stage');

  private renderer: WebGLRenderer | null = null;
  private scene = new Scene();
  private camera = new PerspectiveCamera(28, 1 / CANVAS_RATIO, 0.1, 20);
  private model3d = new Group();
  private readonly mats = new Map<string, MeshStandardMaterial>();
  private readonly geometries: BufferGeometry[] = [];
  private readonly baseMats: MeshStandardMaterial[] = [];
  private pickables: Mesh[] = [];
  /** Todo el cuerpo (músculos y base): el cuerpo tapa lo que queda detrás al tocar. */
  private solids: Mesh[] = [];
  private raycaster = new Raycaster();
  private resizeObs: ResizeObserver | null = null;
  private raf = 0;
  private targetRot = 0;
  private hover: string | null = null;
  private dragging = false;
  private downAt = { x: 0, y: 0, t: 0 };
  private lastX = 0;
  private moved = 0;

  constructor() {
    effect(() => {
      // Dependencias: se repinta cuando cambian los estados de las zonas.
      this.selected();
      this.active();
      this.injured();
      this.paint();
    });
    effect(() => {
      const v = this.view();
      this.targetRot = v === 'front' ? 0 : Math.PI;
      this.animate();
    });
  }

  ngAfterViewInit() {
    const canvas = this.canvasRef().nativeElement;
    try {
      this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      this.unsupported.set(true);
      return;
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.buildScene();
    this.camera.position.set(0, 1.0, 4.1);
    this.camera.lookAt(0, 0.93, 0);

    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(this.stageRef().nativeElement);
    this.resize();

    // Los eventos del lienzo corren fuera de Angular para no repintar toda la pantalla.
    this.zone.runOutsideAngular(() => {
      canvas.addEventListener('pointerdown', this.onDown);
      canvas.addEventListener('pointermove', this.onMove);
      canvas.addEventListener('pointerup', this.onUp);
      canvas.addEventListener('pointercancel', this.onCancel);
      canvas.addEventListener('pointerleave', this.onLeave);
    });
    this.paint();
    this.model3d.rotation.y = this.targetRot;
    this.render();
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.raf);
    this.resizeObs?.disconnect();
    const canvas = this.canvasRef().nativeElement;
    canvas.removeEventListener('pointerdown', this.onDown);
    canvas.removeEventListener('pointermove', this.onMove);
    canvas.removeEventListener('pointerup', this.onUp);
    canvas.removeEventListener('pointercancel', this.onCancel);
    canvas.removeEventListener('pointerleave', this.onLeave);
    this.geometries.forEach((g) => g.dispose());
    this.mats.forEach((m) => m.dispose());
    this.baseMats.forEach((m) => m.dispose());
    this.renderer?.dispose();
  }

  // ---------- Escena ----------

  private buildScene() {
    const dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    const baseColor = new Color(dark ? '#16202f' : '#4f6178');
    const baseMat = new MeshStandardMaterial({ color: baseColor, roughness: 0.85, metalness: 0.02 });
    this.baseMats.push(baseMat);

    const sphere = new SphereGeometry(1, 36, 24);
    this.geometries.push(sphere);

    for (const b of BASE) {
      for (const sx of b.mirror ? [-1, 1] : [1]) {
        let mesh: Mesh;
        if (b.kind === 'sphere') {
          mesh = new Mesh(sphere, baseMat);
          mesh.scale.set(b.a, b.b, b.c ?? b.a);
        } else {
          const g = new CapsuleGeometry(b.a, b.b, 8, 20);
          this.geometries.push(g);
          mesh = new Mesh(g, baseMat);
        }
        mesh.position.set(b.x * sx, b.y, b.z);
        this.model3d.add(mesh);
        this.solids.push(mesh);
      }
    }

    for (const m of MUSCLES) {
      const [part, x, y, z, rx, ry, rz, tilt] = m.e;
      let mat = this.mats.get(part);
      if (!mat) {
        mat = new MeshStandardMaterial({ roughness: 0.55, metalness: 0.05 });
        this.mats.set(part, mat);
      }
      for (const sx of m.mirror ? [-1, 1] : [1]) {
        const mesh = new Mesh(sphere, mat);
        mesh.scale.set(rx, ry, rz);
        mesh.position.set(x * sx, y, z);
        if (tilt) mesh.rotation.z = -tilt * sx;
        mesh.userData['part'] = part;
        this.model3d.add(mesh);
        this.pickables.push(mesh);
        this.solids.push(mesh);
      }
    }

    this.scene.add(this.model3d);
    this.scene.add(new HemisphereLight(0xffffff, dark ? 0x1b2433 : 0x9fb0c4, dark ? 1.1 : 1.35));
    const key = new DirectionalLight(0xffffff, dark ? 1.6 : 1.9);
    key.position.set(1.5, 2.6, 3);
    this.scene.add(key);
    const rim = new DirectionalLight(0x7dd3fc, 0.7);
    rim.position.set(-2, 1.5, -2.5);
    this.scene.add(rim);
  }

  private resize() {
    const el = this.stageRef().nativeElement;
    const w = el.clientWidth;
    const h = el.clientHeight || w * CANVAS_RATIO;
    if (!this.renderer || w === 0) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.render();
  }

  private cssColor(name: string, fallback: string): Color {
    const v = getComputedStyle(this.stageRef().nativeElement).getPropertyValue(name).trim();
    return new Color(v || fallback);
  }

  /** Pinta cada zona según su estado: elegida, con ejercicios, lesionada, con el cursor encima. */
  private paint() {
    if (this.mats.size === 0) return;
    const dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    const idle = new Color(dark ? '#8aa2c2' : '#d5e0ec');
    const primary = this.cssColor('--ion-color-primary', '#0e7490');
    const success = this.cssColor('--ion-color-success', '#15803d');
    const danger = this.cssColor('--ion-color-danger', '#eb445a');
    for (const [part, mat] of this.mats) {
      let c = idle;
      if (this.active().includes(part)) c = success;
      if (this.injured().includes(part)) c = danger;
      if (this.selected() === part) c = primary;
      mat.color.copy(c);
      mat.emissive.copy(c).multiplyScalar(this.hover === part ? 0.45 : this.selected() === part ? 0.2 : 0);
    }
    this.render();
  }

  // ---------- Dibujo y animación ----------

  private render() {
    this.renderer?.render(this.scene, this.camera);
  }

  /** Gira suavemente hasta la rotación objetivo (frente o espalda). */
  private animate() {
    if (!this.renderer || this.raf) return;
    const step = () => {
      this.raf = 0;
      if (this.dragging) return;
      const cur = this.model3d.rotation.y;
      const diff = this.shortest(this.targetRot - cur);
      if (Math.abs(diff) < 0.004) {
        this.model3d.rotation.y = this.targetRot;
        this.render();
        return;
      }
      this.model3d.rotation.y = cur + diff * 0.18;
      this.render();
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  private shortest(a: number): number {
    return Math.atan2(Math.sin(a), Math.cos(a));
  }

  // ---------- Toques y arrastre ----------

  private ndc(ev: PointerEvent): Vector2 {
    const r = this.canvasRef().nativeElement.getBoundingClientRect();
    return new Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -(((ev.clientY - r.top) / r.height) * 2 - 1));
  }

  private partAt(ev: PointerEvent): string | null {
    this.raycaster.setFromCamera(this.ndc(ev), this.camera);
    // Se mira desde el lado que está al frente: las zonas del otro lado no se pueden tocar.
    const facingBack = Math.abs(this.shortest(this.model3d.rotation.y)) > Math.PI / 2;
    const targets = this.solids.filter((m) => {
      const part = m.userData['part'] as string | undefined;
      return !part || BACK_PARTS.has(part) === facingBack;
    });
    const hit = this.raycaster.intersectObjects(targets, false)[0];
    return (hit?.object.userData['part'] as string | undefined) ?? null;
  }

  private readonly onDown = (ev: PointerEvent) => {
    this.dragging = true;
    this.moved = 0;
    this.lastX = ev.clientX;
    this.downAt = { x: ev.clientX, y: ev.clientY, t: Date.now() };
    this.canvasRef().nativeElement.setPointerCapture(ev.pointerId);
  };

  private readonly onMove = (ev: PointerEvent) => {
    if (this.dragging) {
      const dx = ev.clientX - this.lastX;
      this.lastX = ev.clientX;
      this.moved += Math.abs(dx);
      if (this.moved > 6) {
        this.model3d.rotation.y += dx * 0.012;
        this.render();
      }
      return;
    }
    const part = this.partAt(ev);
    if (part !== this.hover) {
      this.hover = part;
      this.paint();
      this.zone.run(() =>
        this.tip.set(part ? (BODY_PARTS[part]?.label ?? part) : 'Arrastra para girar · toca un músculo'),
      );
    }
  };

  private readonly onUp = (ev: PointerEvent) => {
    if (!this.dragging) return;
    this.dragging = false;
    const tap = this.moved < 6 && Date.now() - this.downAt.t < 600;
    if (tap) {
      const part = this.partAt(ev);
      if (part) {
        this.zone.run(() => {
          this.tip.set(BODY_PARTS[part]?.label ?? part);
          this.pick.emit(part);
        });
      }
    } else {
      // Al soltar, queda de frente o de espalda (lo más cercano).
      const turned = Math.abs(this.shortest(this.model3d.rotation.y)) > Math.PI / 2;
      const next: BodyView = turned ? 'back' : 'front';
      this.targetRot = next === 'front' ? 0 : Math.PI;
      this.zone.run(() => this.view.set(next));
    }
    this.animate();
  };

  private readonly onCancel = () => {
    this.dragging = false;
    this.animate();
  };

  private readonly onLeave = () => {
    if (this.hover) {
      this.hover = null;
      this.paint();
    }
  };
}
