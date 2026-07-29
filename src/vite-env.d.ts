/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ID: string
  readonly VITE_APP_SECRET: string
  readonly VITE_GATEWAY_SERVER: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
