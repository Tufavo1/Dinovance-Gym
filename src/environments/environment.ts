// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  // Project URL y anon public key (Supabase > Project Settings > API).
  // La anon key es pública por diseño: la protección real la dan las políticas RLS.
  // NUNCA pongas aquí la service_role key.
  supabaseUrl: 'https://qwpwjyboeauoohwbtytk.supabase.co',
  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3cHdqeWJvZWF1b29od2J0eXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQwNzgwMTAsImV4cCI6MjEwOTY1NDAxMH0.dlHA2tPyN2CMsmKnFQ89bV77vOeTkWxOTP9IYqkqt_s',
  exerciseImagesBaseUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/',
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
