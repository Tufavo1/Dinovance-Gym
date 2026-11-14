import { Injectable, inject } from '@angular/core';

import { csvToWorkouts, jsonToWorkouts, workoutsToCsv, type ExportedWorkout, type ImportParse } from './data/export';
import { SupabaseService } from './supabase.service';

export interface ImportResult {
  imported: number;
  skipped_existing: number;
  rejected: { index: number; started_at: string | null; error: string }[];
  /** Filas del archivo que no se pudieron leer. */
  parseErrors: string[];
}

export interface AuditEntry {
  id: number;
  table_name: string;
  action: 'UPDATE' | 'DELETE';
  changed_at: string;
  old_data: Record<string, unknown>;
  new_data: Record<string, unknown> | null;
}

/** Exportación, importación e historial de modificaciones de los datos propios. */
@Injectable({ providedIn: 'root' })
export class DataService {
  private readonly sb = inject(SupabaseService).client;

  /** Respaldo completo en JSON (solo los datos de quien tiene la sesión). */
  async exportJson(): Promise<string> {
    const { data, error } = await this.sb.rpc('export_my_data');
    if (error) throw error;
    return JSON.stringify(data, null, 2);
  }

  /** Todas las series registradas en CSV (una fila por serie). */
  async exportCsv(): Promise<string> {
    const { data, error } = await this.sb.rpc('export_my_data');
    if (error) throw error;
    return workoutsToCsv(((data as { workouts?: ExportedWorkout[] })?.workouts ?? []) as ExportedWorkout[]);
  }

  /** Importa entrenamientos desde un respaldo JSON o un CSV de series. No duplica los ya existentes. */
  async importFile(name: string, text: string): Promise<ImportResult> {
    const parsed: ImportParse = /\.csv$/i.test(name) ? csvToWorkouts(text) : jsonToWorkouts(text);
    if (parsed.workouts.length === 0) {
      return { imported: 0, skipped_existing: 0, rejected: [], parseErrors: parsed.errors };
    }
    const { data, error } = await this.sb.rpc('import_my_workouts', { p_workouts: parsed.workouts });
    if (error) throw error;
    return { ...(data as Omit<ImportResult, 'parseErrors'>), parseErrors: parsed.errors };
  }

  /** Últimas modificaciones o borrados de registros ya guardados. */
  async audit(limit = 30): Promise<AuditEntry[]> {
    const { data, error } = await this.sb
      .from('audit_log')
      .select('id,table_name,action,changed_at,old_data,new_data')
      .order('changed_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as AuditEntry[];
  }

  /** Ofrece el archivo para descargar en el navegador. */
  download(filename: string, content: string, type: string): void {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
