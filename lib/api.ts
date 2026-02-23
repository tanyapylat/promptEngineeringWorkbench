import { toast } from "sonner";

/**
 * Single place for API calls: runs the request, on error shows a toast and throws.
 * Use this instead of fetch for /api/* so all errors are handled and shown in one place.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Network request failed";
    toast.error(message);
    throw new Error(message);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      (body as { error?: string }).error ?? res.statusText ?? "Request failed";
    toast.error(message);
    throw new Error(message);
  }

  return res;
}
