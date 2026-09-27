/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** id of the GitHub Gist that holds the live log (see src/data/live.ts) */
  readonly VITE_LIBRARY_GIST_ID?: string;
}
