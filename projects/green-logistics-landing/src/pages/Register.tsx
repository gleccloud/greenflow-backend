/**
 * Register Page
 * New user sign up with email, password, company, and role
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterFormSchema, type RegisterFormData } from '../schemas/forms';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, CheckCircle, Leaf, ChevronRight } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const { register: registerUser, isLoading, error: authError, clearError } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [step, setStep] = useState(1);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(RegisterFormSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: RegisterFormData) => {
    setLocalError(null);
    clearError();

    try {
      await registerUser(data);
      setIsSuccess(true);

      // Redirect after success
      setTimeout(() => {
        navigate('/dashboard/shipper');
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : '회원가입에 실패했습니다';
      setLocalError(message);
    }
  };

  const getFieldError = (field: keyof RegisterFormData): string | null => {
    return errors[field]?.message || null;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-8">
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
            <h1 className="text-2xl font-bold text-slate-900">회원가입</h1>
            <p className="mt-2 text-sm text-slate-600">
              {step === 1 ? '기본 정보를 입력하세요' : '회사 정보를 입력하세요'}
            </p>
          </div>

          {/* Step Indicator */}
          <div className="mb-8 flex gap-2">
            {[1, 2].map((s) => (
              <button
                key={s}
                onClick={() => setStep(s)}
                className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold transition ${
                  step === s
                    ? 'bg-emerald-600 text-white'
                    : step > s
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-600'
                }`}
              >
                {s}
              </button>
            ))}
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
              <p>가입되었습니다. 대시보드로 이동 중...</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {step === 1 && (
              <>
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
                  <p className="text-xs text-slate-500">
                    8자 이상, 대문자, 숫자, 특수문자 포함
                  </p>
                </div>

                {/* Confirm Password */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
                    비밀번호 확인
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    {...register('confirmPassword')}
                    className={`rounded-lg border px-3 py-2 text-sm transition focus:outline-none focus:ring-2 ${
                      getFieldError('confirmPassword')
                        ? 'border-red-300 focus:ring-red-200'
                        : 'border-slate-200 focus:ring-emerald-200'
                    }`}
                  />
                  {getFieldError('confirmPassword') && (
                    <p className="text-xs text-red-600">{getFieldError('confirmPassword')}</p>
                  )}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                {/* Company Name */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="companyName" className="text-sm font-medium text-slate-700">
                    회사명
                  </label>
                  <input
                    id="companyName"
                    type="text"
                    placeholder="회사 또는 조직명"
                    {...register('companyName')}
                    className={`rounded-lg border px-3 py-2 text-sm transition focus:outline-none focus:ring-2 ${
                      getFieldError('companyName')
                        ? 'border-red-300 focus:ring-red-200'
                        : 'border-slate-200 focus:ring-emerald-200'
                    }`}
                  />
                  {getFieldError('companyName') && (
                    <p className="text-xs text-red-600">{getFieldError('companyName')}</p>
                  )}
                </div>

                {/* Role */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="role" className="text-sm font-medium text-slate-700">
                    역할
                  </label>
                  <select
                    id="role"
                    {...register('role')}
                    className={`rounded-lg border px-3 py-2 text-sm transition focus:outline-none focus:ring-2 ${
                      getFieldError('role')
                        ? 'border-red-300 focus:ring-red-200'
                        : 'border-slate-200 focus:ring-emerald-200'
                    }`}
                  >
                    <option value="">역할을 선택하세요</option>
                    <option value="SHIPPER">화주사 (Shipper)</option>
                    <option value="CARRIER">물류사 (Carrier)</option>
                    <option value="FLEET_OWNER">차주 (Fleet Owner)</option>
                    <option value="BROKER">중개인 (Broker)</option>
                  </select>
                  {getFieldError('role') && (
                    <p className="text-xs text-red-600">{getFieldError('role')}</p>
                  )}
                </div>

                {/* Terms */}
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    {...register('agreeToTerms')}
                    className="rounded border-slate-300 mt-1"
                  />
                  <span className="text-xs text-slate-600">
                    <a href="#" className="text-emerald-600 hover:underline">이용약관</a>과{' '}
                    <a href="#" className="text-emerald-600 hover:underline">개인정보 처리방침</a>에 동의합니다
                  </span>
                </label>
                {getFieldError('agreeToTerms') && (
                  <p className="text-xs text-red-600">{getFieldError('agreeToTerms')}</p>
                )}
              </>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition"
                >
                  이전
                </button>
              )}

              {step === 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="ml-auto flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                >
                  다음
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting || isLoading || isSuccess}
                  className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition ${
                    isSubmitting || isLoading || isSuccess
                      ? 'cursor-not-allowed bg-slate-400'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {isSubmitting || isLoading ? '가입 중...' : '회원가입'}
                </button>
              )}
            </div>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-slate-600">
            이미 계정이 있으신가요?{' '}
            <Link
              to="/login"
              className="font-semibold text-emerald-600 hover:text-emerald-700"
            >
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
