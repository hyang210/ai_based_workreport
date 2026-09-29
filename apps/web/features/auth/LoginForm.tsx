'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, setToken } from '@/lib/api-client';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { accessToken } = await apiFetch<{ accessToken: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setToken(accessToken);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto mt-16 max-w-sm space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold text-brand">로그인</h1>
      <div>
        <label className="block text-sm text-gray-600">이메일</label>
        <input
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
        />
      </div>
      <div>
        <label className="block text-sm text-gray-600">비밀번호</label>
        <input
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-brand py-2 text-sm font-semibold text-white hover:bg-brand-light disabled:opacity-50"
      >
        {loading ? '로그인 중...' : '로그인'}
      </button>
      <p className="text-xs text-gray-400">seed 계정: admin@example.com / password123</p>
    </form>
  );
}
