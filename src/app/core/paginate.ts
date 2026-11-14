/** Filas por consulta: la API de Supabase devuelve como máximo 1000 aunque se pida más. */
export const PAGE_SIZE = 1000;

interface PageResult {
  data: unknown[] | null;
  error: { message: string } | null;
}

/**
 * Descarga todas las filas de una consulta, página por página. Sin esto, una consulta de más de
 * 1000 filas llegaría cortada en silencio y los análisis se harían con datos incompletos.
 * `query` debe aplicar `.range(from, to)` sobre una consulta con orden estable.
 */
export async function fetchAllRows<T>(
  query: (from: number, to: number) => PromiseLike<PageResult>,
  max = 20_000,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < max; from += PAGE_SIZE) {
    const { data, error } = await query(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...((data ?? []) as T[]));
    if ((data ?? []).length < PAGE_SIZE) break;
  }
  return rows;
}
