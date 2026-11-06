/**
 * URL pública do portal do cliente. Usa VITE_PUBLIC_APP_URL (sem barra final)
 * quando o domínio público difere do de onde a equipe está logada; senão, a origem atual.
 */
export function buildPortalUrl(token: string, baseUrl?: string): string {
  const envBase = (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.trim();
  const raw = (baseUrl ?? envBase) || (typeof window !== "undefined" ? window.location.origin : "");
  return `${raw.replace(/\/+$/, "")}/client/${token}`;
}

export function portalWhatsappUrl(url: string): string {
  const text = `Olá! Aqui está o link para acompanhar a sua obra: ${url}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
