const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// baseline: 토큰은 localStorage에 저장한다.
// (운영에서는 httpOnly 쿠키 기반으로 교체 권장 — XSS 노출 범위 축소)
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('workreport_token');
}

export function setToken(token: string) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('workreport_token', token);
  }
}

// 토큰에 담긴 이메일 (화면 표시용). 서명 검증은 서버가 하므로 여기서는 읽기만 한다.
export function getUserEmail(): string | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload)).email ?? null;
  } catch {
    return null;
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
    // 토큰이 없거나 만료된 경우: 로그인 화면으로 보낸다 (로그인·대시보드는 자체 안내가 있어 제외).
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    if (res.status === 401 && typeof window !== 'undefined' && path !== '/login' && path !== '/') {
      clearToken();
      window.location.assign('/login');
    }
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `API 요청 실패 (${res.status})`);
  }

  // 204 No Content 등 빈 응답 대비
  const text = await res.text();
  return text ? JSON.parse(text) : (undefined as T);
}
