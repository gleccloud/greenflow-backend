/**
 * Login Page
 * Email/password authentication with form validation
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginFormSchema, type LoginFormData } from '../schemas/forms';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, CheckCircle, Leaf } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading, error: authError, clearError } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginFormSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: LoginFormData) => {
    setLocalError(null);
    clearError();

    try {
      await login(data);
      setIsSuccess(true);

      // Redirect after success
      setTimeout(() => {
        navigate('/dashboard/shipper');
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : '로그인에 실패했습니다';
      setLocalError(message);
    }
  };

  const getFieldError = (field: keyof LoginFormData): string | null => {
    return errors[field]?.message || null;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <div className="flex items-center gap-2 rounded-lg bg-emerald-600 p-3">
            <Leaf className="h-6 w-6 text-white" />
            <span className="text-lg font-bold text-white">GreenFlow</span>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-soft">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">로그인</h1>
            <p className="mt-2 text-sm text-slate-600">
              계정에 로그인하여 대시보드에 접속하세요
            </p>
          </div>

          {/* Error Message */}
          {(localError || authError) && (
            <div className="mb-6 flex gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p>{localError || authError}</p>
            </div>
          )}

          {/* Success Message */}
          {isSuccess && (
            <div className="mb-6 flex gap-3 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700">
              <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p>로그인되었습니다. 대시보드로 이동 중...</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">
                이메일
              </label>
              <input
                id="email"
                type="email"
                placeholder="your@email.com"
                {...register('email')}
                className={`rounded-lg border px-3 py-2 text-sm transition focus:outline-none focus:ring-2 ${
                  getFieldError('email')
                    ? 'border-red-300 focus:ring-red-200'
                    : 'border-slate-200 focus:ring-emerald-200'
                }`}
              />
              {getFieldError('email') && (
                <p className="text-xs text-red-600">{getFieldError('email')}</p>
              )}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-slate-700">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                className={`rounded-lg border px-3 py-2 text-sm transition focus:outline-none focus:ring-2 ${
                  getFieldError('password')
                    ? 'border-red-300 focus:ring-red-200'
                    : 'border-slate-200 focus:ring-emerald-200'
                }`}
              />
              {getFieldError('password') && (
                <p className="text-xs text-red-600">{getFieldError('password')}</p>
              )}
            </div>

            {/* Remember Me */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="rounded border-slate-300"
              />
              <span className="text-sm text-slate-600">로그인 상태 유지</span>
            </label>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || isLoading || isSuccess}
              className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition ${
                isSubmitting || isLoading || isSuccess
                  ? 'cursor-not-allowed bg-slate-400'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isSubmitting || isLoading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-500">또는</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Footer */}
          <div className="space-y-3 text-center text-sm">
            <p className="text-slate-600">
              계정이 없으신가요?{' '}
              <Link
                to="/register"
                className="font-semibold text-emerald-600 hover:text-emerald-700"
              >
                회원가입
              </Link>
            </p>
            <Link
              to="/"
              className="block text-slate-600 hover:text-slate-900"
            >
              홈으로 돌아가기
            </Link>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 rounded-lg bg-blue-50 border border-blue-200 p-4">
          <p className="text-xs text-blue-700">
            💡 <strong>테스트 계정:</strong> 아무 이메일과 비밀번호(8자 이상, 대문자 + 숫자 포함)로 로그인할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
