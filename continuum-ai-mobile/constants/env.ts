export const ENV = {
  apiUrl:        process.env.EXPO_PUBLIC_API_URL    ?? 'http://localhost:8000',
  appEnv:        process.env.EXPO_PUBLIC_APP_ENV    ?? 'development',
  appVersion:    process.env.EXPO_PUBLIC_APP_VERSION ?? '1.0.0',
  isDevelopment: (process.env.EXPO_PUBLIC_APP_ENV ?? 'development') === 'development',
  isProduction:  process.env.EXPO_PUBLIC_APP_ENV    === 'production',
} as const;
