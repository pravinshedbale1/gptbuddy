import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const env = import.meta.env;

const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

export const isConfigured = Boolean(config.apiKey && config.databaseURL);

export const db = isConfigured ? getDatabase(initializeApp(config)) : null;
