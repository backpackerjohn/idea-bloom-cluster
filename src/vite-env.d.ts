/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string
  readonly VITE_SUPABASE_PROJECT_ID?: string
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_APP_ENV?: 'development' | 'staging' | 'production'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
