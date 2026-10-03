/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface Window {
  __GASTROSOFT_CONFIG__?: {
    apiUrl?: string;
  };
}
