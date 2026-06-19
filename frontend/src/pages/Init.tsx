import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { KeyRound, Radio } from 'lucide-react';
import { authApi } from '../api/photos';
import { useAuthStore } from '../stores/authStore';

export default function Init() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const statusQuery = useQuery({
    queryKey: ['init-status'],
    queryFn: authApi.getInitStatus,
    retry: 1,
  });

  useEffect(() => {
    if (statusQuery.data?.initialized) {
      navigate('/login', { replace: true });
    }
  }, [navigate, statusQuery.data?.initialized]);

  const initMutation = useMutation({
    mutationFn: authApi.initialize,
    onSuccess: (data) => {
      login(data.token, data.username);
      navigate('/admin', { replace: true });
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');

    if (username.trim().length < 3) {
      setFormError('用户名至少需要 3 个字符');
      return;
    }

    if (password.length < 8) {
      setFormError('密码至少需要 8 个字符');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('两次输入的密码不一致');
      return;
    }

    initMutation.mutate({
      username: username.trim(),
      password,
    });
  };

  const isSubmitting = initMutation.isPending || statusQuery.isLoading;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 dark:bg-gray-950 dark:text-gray-100">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center">
        <div className="w-full rounded-lg border border-slate-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white">
              <Radio size={28} />
            </div>
            <h1 className="text-2xl font-bold">初始化管理员</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
              创建第一个管理员账户后即可进入后台。
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="init-username" className="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300">
                用户名
              </label>
              <input
                id="init-username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label htmlFor="init-password" className="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300">
                密码
              </label>
              <input
                id="init-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                autoComplete="new-password"
                required
              />
            </div>

            <div>
              <label htmlFor="init-confirm-password" className="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300">
                确认密码
              </label>
              <input
                id="init-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                autoComplete="new-password"
                required
              />
            </div>

            {(formError || initMutation.isError || statusQuery.isError) && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                {formError || '初始化失败，请检查输入后重试'}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <KeyRound size={18} />
              {isSubmitting ? '正在初始化...' : '创建管理员'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
