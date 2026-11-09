import { BODY_PARTS } from '../../shared/body-map.component';
import { PART_GUIDE } from './part-guide';

describe('guía por parte del cuerpo', () => {
  it('cada parte tiene consejos y combina con partes que existen', () => {
    for (const id of Object.keys(BODY_PARTS)) {
      const g = PART_GUIDE[id];
      expect(g, id).toBeDefined();
      expect(g.tips.length).toBeGreaterThanOrEqual(2);
      expect(g.pairWhy.length).toBeGreaterThan(0);
      for (const p of g.pairsWith) {
        expect(BODY_PARTS[p], `${id} -> ${p}`).toBeDefined();
        expect(p).not.toBe(id);
      }
    }
  });
});
