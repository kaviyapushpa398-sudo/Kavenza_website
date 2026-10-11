export function authApiUrl(path: string) {
  const origin = import.meta.env.VITE_CONTACT_API_URL?.trim().replace(/\/+$/, "");
  if (!origin) throw new Error("The account service is not configured.");
  return `${origin}${path}`;
}

export async function readApiError(response: Response, fallback: string) {
  const result: unknown = await response.json().catch(() => null);
  if (
    typeof result === "object" &&
    result !== null &&
    "error" in result &&
    typeof result.error === "string"
  ) {
    return result.error;
  }
  return fallback;
}
