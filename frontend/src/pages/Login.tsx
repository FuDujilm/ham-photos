import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { authApi } from '../api/photos';
import { siteConfig } from '../config/site';
import { useAuthStore } from '../stores/authStore';
import { Radio } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const statusQuery = useQuery({
    queryKey: ['init-status'],
    queryFn: authApi.getInitStatus,
    retry: 1,
  });

  useEffect(() => {
    if (statusQuery.data && !statusQuery.data.initialized) {
      navigate('/init', { replace: true });
    }
  }, [navigate, statusQuery.data]);


  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      login(data.token, data.username);
      navigate('/admin');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ username, password });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 dark:from-gray-950 dark:to-gray-900">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 dark:bg-gray-900 dark:shadow-none dark:ring-1 dark:ring-gray-800">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Radio className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">管理员登录</h1>
          <p className="text-gray-600 mt-2 dark:text-gray-400">{siteConfig.siteTitle} 管理系统</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              用户名
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              密码
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              required
            />
          </div>

          {loginMutation.isError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              登录失败，请检查用户名和密码
            </div>
          )}

          <button
            type="submit"
            disabled={loginMutation.isPending || statusQuery.isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loginMutation.isPending ? '登录中...' : '登录'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            返回主页
          </button>
        </div>
      </div>
    </div>
  );
}
