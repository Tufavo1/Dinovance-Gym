/**
 * Sonidos cortos para la cuenta regresiva y el fin del descanso (Web Audio, sin archivos).
 * Si el navegador no lo permite, no pasa nada.
 */
let ctx: AudioContext | null = null;

export function beep(frequency = 880, ms = 140, volume = 0.18): void {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = frequency;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + ms / 1000);
  } catch {
    // sin audio
  }
}

export function buzz(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // sin vibración
  }
}
