import { Injectable } from '@angular/core';

import { localStore } from '../local-store';
import type { Reference } from './references';

const BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';

export interface PubmedArticle {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  year: string;
  url: string;
}

export interface Verification {
  pmid: string | null;
  /** El título y el año coinciden con lo que hay en PubMed. */
  matched: boolean;
  checkedAt: number;
}

interface PubmedSummary {
  uid: string;
  title?: string;
  authors?: { name: string }[];
  fulljournalname?: string;
  source?: string;
  pubdate?: string;
}

const STOP = new Set([
  'with',
  'between',
  'from',
  'that',
  'this',
  'than',
  'their',
  'into',
  'have',
  'been',
  'were',
  'which',
  'versus',
  'after',
  'during',
  'about',
  'over',
]);

/** Palabras del título que sirven para comparar (sin signos, palabras cortas ni conectores). */
function significantWords(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((w) => w.length > 3 && !STOP.has(w));
}

/**
 * Consulta en vivo la base PubMed (NCBI E-utilities, pública y gratuita). Solo se envían
 * términos de búsqueda de ciencia del ejercicio: nunca datos de la persona.
 */
@Injectable({ providedIn: 'root' })
export class PubmedService {
  private last = 0;

  /** NCBI permite 3 consultas por segundo sin clave: se espacian. */
  private async get<T>(path: string, params: Record<string, string>): Promise<T> {
    const wait = this.last + 380 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    this.last = Date.now();
    const qs = new URLSearchParams({ ...params, retmode: 'json', tool: 'dinovance-gym' });
    const res = await fetch(`${BASE}${path}?${qs}`);
    if (!res.ok) throw new Error('PubMed no respondió');
    return (await res.json()) as T;
  }

  private async summaries(ids: string[]): Promise<PubmedArticle[]> {
    if (ids.length === 0) return [];
    const data = await this.get<{ result: Record<string, PubmedSummary> }>('esummary.fcgi', {
      db: 'pubmed',
      id: ids.join(','),
    });
    return ids
      .map((id) => data.result?.[id])
      .filter(Boolean)
      .map((r) => ({
        pmid: String(r.uid),
        title: String(r.title ?? '').replace(/\.$/, ''),
        authors:
          (r.authors ?? [])
            .slice(0, 3)
            .map((a) => a.name)
            .join(', ') + ((r.authors?.length ?? 0) > 3 ? ' et al.' : ''),
        journal: String(r.fulljournalname ?? r.source ?? ''),
        year: String(r.pubdate ?? '').slice(0, 4),
        url: `https://pubmed.ncbi.nlm.nih.gov/${r.uid}/`,
      }));
  }

  /** Busca estudios. `jscr` limita a Journal of Strength and Conditioning Research. */
  async search(text: string, opts: { jscr: boolean; reviewsOnly: boolean }): Promise<PubmedArticle[]> {
    const clean = text.trim().replace(/[\[\]"]/g, '');
    if (clean.length < 3) return [];
    let term = `(${clean})`;
    if (opts.jscr) term += ' AND "J Strength Cond Res"[Journal]';
    if (opts.reviewsOnly) term += ' AND (meta-analysis[Publication Type] OR systematic review[Publication Type])';
    const r = await this.get<{ esearchresult: { idlist: string[] } }>('esearch.fcgi', {
      db: 'pubmed',
      term,
      retmax: '12',
      sort: 'relevance',
    });
    return this.summaries(r.esearchresult.idlist ?? []);
  }

  /** Comprueba que la referencia existe en PubMed y que título y año coinciden. */
  async verify(ref: Reference): Promise<Verification> {
    const key = `pubmed.${ref.id}`;
    const cached = localStore.get<Verification>(key);
    if (cached && Date.now() - cached.checkedAt < 30 * 86_400_000) return cached;
    const words = significantWords(ref.title);
    let found: PubmedArticle[] = [];
    // Se parte con la frase y se relaja: PubMed cambia signos y prefijos en algunos títulos.
    const phrase = `"${ref.title.replace(/["“”[\]]/g, '')}"[Title]`;
    const terms = [
      phrase,
      ...[
        [0, 8],
        [0, 6],
        [0, 4],
        [2, 6],
      ].map(([i, j]) =>
        words
          .slice(i, j)
          .map((w) => `${w}[ti]`)
          .join(' AND '),
      ),
    ];
    for (const term of terms) {
      const r = await this.get<{ esearchresult: { idlist: string[] } }>('esearch.fcgi', {
        db: 'pubmed',
        term: `(${term}) AND ${ref.year}[dp]`,
        retmax: '10',
      });
      found = await this.summaries(r.esearchresult.idlist ?? []);
      if (found.length > 0) break;
    }
    const hit = found.find((a) => {
      const theirs = new Set(significantWords(a.title));
      const share = words.filter((w) => theirs.has(w)).length / words.length;
      return share >= 0.75 && Math.abs(Number(a.year) - ref.year) <= 1;
    });
    const v: Verification = {
      pmid: hit?.pmid ?? null,
      matched: !!hit,
      checkedAt: Date.now(),
    };
    localStore.set(key, v);
    return v;
  }
}
