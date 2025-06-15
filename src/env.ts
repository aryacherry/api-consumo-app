import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('Erro na validação das variáveis de ambiente do servidor'),_env.error.format();
  process.exit(1);
}

const clientEnvSchema= z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_KEY: z.string().min(10),
})

const _clientEnv = clientEnvSchema.safeParse(process.env)
if(!_clientEnv.success){
  console.error('Erro na validação das variáveis de ambiente do cliente:'), _clientEnv.error.format();
  process.exit(1);
}

export const serverEnv = _env.data;
export const clientEnv = _clientEnv.data;