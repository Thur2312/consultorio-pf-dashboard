import { createUserClient } from './supabaseAdmin.ts'

export type CallerInfo = { isService: boolean; isUser: boolean; userId?: string }

// Aceita chamadas de dois tipos:
// 1. Do dashboard (usuário autenticado) — JWT normal via header Authorization.
// 2. De outra Edge Function (ex: uazapi-webhook chamando ai-respond) — o
//    header Authorization traz a própria service_role key do projeto.
export async function verifyCaller(req: Request): Promise<CallerInfo> {
  const authHeader = req.headers.get('Authorization') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (serviceKey && authHeader === `Bearer ${serviceKey}`) {
    return { isService: true, isUser: false }
  }
  const userClient = createUserClient(authHeader)
  const { data, error } = await userClient.auth.getUser()
  if (!error && data?.user) {
    return { isService: false, isUser: true, userId: data.user.id }
  }
  return { isService: false, isUser: false }
}
