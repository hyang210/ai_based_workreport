const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// baseline: 토큰은 localStorage에 저장한다.
// (운영에서는 httpOnly 쿠키 기반으로 교체 권장 — XSS 노출 범위 축소)
function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('workreport_token');
}

export function setToken(token: string) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('workreport_token', token);
  }
}

export function clearToken() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('workreport_token');
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `API 요청 실패 (${res.status})`);
  }

  // 204 No Content 등 빈 응답 대비
  const text = await res.text();
  return text ? JSON.parse(text) : (undefined as T);
}
