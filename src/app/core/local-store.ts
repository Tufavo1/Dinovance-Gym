/**
 * Acceso seguro a localStorage. Todo lo que la app guarda en el teléfono lleva el prefijo
 * "avanza." para poder borrarlo completo al cerrar sesión (hay datos de salud en los
 * borradores). Si el almacenamiento no está disponible, la app sigue funcionando.
 */
const PREFIX = 'avanza.';

export const localStore = {
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },

  set(key: string, value: unknown): void {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // Sin espacio o en modo privado: se ignora.
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {
      // nada que borrar
    }
  },

  /** Borra todo lo de la app (se usa al cerrar sesión). */
  clearAll(): void {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k?.startsWith(PREFIX)) localStorage.removeItem(k);
      }
    } catch {
      // nada que borrar
    }
  },
};
