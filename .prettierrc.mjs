import ionic from '@ionic/prettier-config';

// Configuración de Ionic + parser de Angular para las plantillas .html
// (sin él, Prettier rompe la sintaxis @if / @for).
export default {
  ...ionic,
  overrides: [...(ionic.overrides ?? []), { files: '*.html', options: { parser: 'angular' } }],
};
