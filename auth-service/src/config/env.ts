import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('Invalid database URL'),
  
  // Redis
  REDIS_URL: z.string().url('Invalid Redis URL'),
  
  // Azure AD
  AZURE_CLIENT_ID: z.string().min(1, 'Azure Client ID is required'),
  AZURE_CLIENT_SECRET: z.string().min(1, 'Azure Client Secret is required'),
  AZURE_TENANT_ID: z.string().optional(), // Optional for multi-tenant validation
  
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().min(1000).max(65535)).default('4000'),
  SESSION_SECRET: z.string().min(32, 'Session secret must be at least 32 characters'),
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  
  // CORS
  ALLOWED_ORIGINS: z.string().transform(s => s.split(',')).default('http://localhost:3000'),
  
  // Feature Flags
  FALLBACK_MAGIC_LINK: z.string().transform(s => s === 'true').default('false'),
  ENABLE_AUDIT_LOGS: z.string().transform(s => s === 'true').default('true'),
  ENABLE_RATE_LIMITING: z.string().transform(s => s === 'true').default('true'),
  
  // Email (for magic link fallback)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).optional(),
  SMTP_USER: z.string().email().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  
  // Monitoring
  ENABLE_TELEMETRY: z.string().transform(s => s === 'true').default('true'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  // Security
  BCRYPT_ROUNDS: z.string().transform(Number).pipe(z.number().min(10).max(15)).default('12'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),
  MAGIC_LINK_EXPIRES_IN: z.string().default('10m'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number().min(60000)).default('900000'), // 15 minutes
  RATE_LIMIT_MAX_ATTEMPTS: z.string().transform(Number).pipe(z.number().min(1)).default('10'),
  RATE_LIMIT_SKIP_SUCCESS: z.string().transform(s => s === 'true').default('true')
});

// Validate environment variables
const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Invalid environment variables:');
  parseResult.error.issues.forEach(issue => {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = parseResult.data;

// Validation for feature-dependent requirements
if (env.FALLBACK_MAGIC_LINK) {
  const requiredEmailFields = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM'];
  const missingFields = requiredEmailFields.filter(field => !process.env[field]);
  
  if (missingFields.length > 0) {
    console.error('❌ Magic link fallback is enabled but missing email configuration:');
    missingFields.forEach(field => console.error(`  ${field} is required`));
    process.exit(1);
  }
}

// Azure tenant validation
if (!env.AZURE_TENANT_ID) {
  console.warn('⚠️  AZURE_TENANT_ID not set. Will validate tenant via claims.');
}

export default env;