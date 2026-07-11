// Criptografia simétrica (AES-GCM) para as chaves de API/tokens salvos em
// ia_agent_config. A chave fica apenas no secret ENCRYPTION_KEY da function
// (nunca chega ao client). Formato armazenado: base64(iv (12 bytes) || ciphertext).

async function importKey(): Promise<CryptoKey> {
  const raw = Deno.env.get('ENCRYPTION_KEY')
  if (!raw) throw new Error('ENCRYPTION_KEY não configurada nos secrets da function')
  const keyBytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0))
  return crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

export async function encryptSecret(plaintext: string): Promise<string> {
  const key = await importKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.length)
  return btoa(String.fromCharCode(...combined))
}

export async function decryptSecret(stored: string): Promise<string> {
  const key = await importKey()
  const combined = Uint8Array.from(atob(stored), c => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  const plaintextBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new TextDecoder().decode(plaintextBuf)
}

export function maskSecret(value: string): string {
  if (value.length <= 4) return `....${value}`
  return `${value.slice(0, 3)}....${value.slice(-4)}`
}
