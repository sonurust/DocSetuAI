export type RuntimeMode = 'demo' | 'cloud';

export interface AppConfig {
  runtime_mode: RuntimeMode;
  port: number;
  node_env: string;
  google_api_key: string;
  gemini_model: string;
  google_cloud_project: string;
  google_cloud_location: string;
  firestore_database: string;
  pubsub_topic: string;
  next_public_api_url: string;
}

function getEnv(key: string, fallback = ''): string {
  return process.env[key] ?? fallback;
}

export const config: AppConfig = {
  runtime_mode: (getEnv('RUNTIME_MODE', 'demo') as RuntimeMode),
  port: parseInt(getEnv('PORT', '4000'), 10),
  node_env: getEnv('NODE_ENV', 'development'),
  google_api_key: getEnv('GOOGLE_API_KEY'),
  gemini_model: getEnv('GEMINI_MODEL', 'gemini-3.6-flash'),  // default: gemini-3.6-flash
  google_cloud_project: getEnv('GOOGLE_CLOUD_PROJECT'),
  google_cloud_location: getEnv('GOOGLE_CLOUD_LOCATION', 'us-central1'),
  firestore_database: getEnv('FIRESTORE_DATABASE', '(default)'),
  pubsub_topic: getEnv('PUBSUB_TOPIC', 'docsetuai-task-events'),
  next_public_api_url: getEnv('NEXT_PUBLIC_API_URL', 'http://localhost:4000'),
};

export function isDemoMode(): boolean {
  return config.runtime_mode === 'demo';
}

export function isCloudMode(): boolean {
  return config.runtime_mode === 'cloud';
}
