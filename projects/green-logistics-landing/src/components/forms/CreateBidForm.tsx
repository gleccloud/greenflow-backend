/**
 * Create Bid Form Component
 * Multi-step form for creating new bids
 */

import { useState } from 'react';
import { ChevronRight, ChevronLeft, AlertCircle, CheckCircle } from 'lucide-react';
import type { CreateBidFormData } from '../../schemas/forms';

interface CreateBidFormProps {
  onSuccess?: (bidId: string) => void;
  onCancel?: () => void;
}

export function CreateBidForm({ onSuccess, onCancel }: CreateBidFormProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [formData, setFormData] = useState<Partial<CreateBidFormData>>({
    evaluationPolicy: {
      alpha: 0.4,
      beta: 0.3,
      gamma: 0.3,
    },
    preferEcoFriendly: false,
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // TODO: Call API to create bid
      // eslint-disable-next-line no-console
      console.log('Bid creation form data:', formData);
      setSubmitSuccess(true);
      setTimeout(() => {
        onSuccess?.('mock-bid-id');
      }, 1500);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '입찰 생성에 실패했습니다';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderInput = (
    label: string,
    value: string | number | undefined,
    onChange: (v: string | number) => void,
    type: string = 'text',
    placeholder?: string,
    error?: string | null
  ) => {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <input
          type={type}
          placeholder={placeholder}
          value={value || ''}
          onChange={(e) => {
            const v = type === 'number' ? parseFloat(e.target.value) : e.target.value;
            onChange(v);
          }}
          className={`rounded-lg border px-3 py-2 text-sm transition focus:outline-none focus:ring-2 ${
            error
              ? 'border-red-300 focus:ring-red-200'
              : 'border-slate-200 focus:ring-emerald-200'
          }`}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  };

  const policy = formData.evaluationPolicy || { alpha: 0.4, beta: 0.3, gamma: 0.3 };
  const policySum = (policy.alpha || 0) + (policy.beta || 0) + (policy.gamma || 0);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-8 shadow-soft">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">새 입찰 생성</h2>
        <p className="mt-2 text-sm text-slate-600">
          물류사로부터 제안을 받을 새로운 입찰을 생성하세요
        </p>
      </div>

      {/* Step Indicator */}
      <div className="mb-8 flex gap-2">
        {[1, 2, 3].map((stepNum) => (
          <button
            key={stepNum}
            onClick={() => setStep(stepNum)}
            className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold transition ${
              step === stepNum
                ? 'bg-emerald-600 text-white'
                : step > stepNum
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-600'
            }`}
          >
            {stepNum}
          </button>
        ))}
      </div>

      {/* Error Message */}
      {submitError && (
        <div className="mb-6 flex gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>{submitError}</p>
        </div>
      )}

      {/* Success Message */}
      {submitSuccess && (
        <div className="mb-6 flex gap-3 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <p>입찰이 성공적으로 생성되었습니다</p>
        </div>
      )}

      {/* Form Content */}
      <form onSubmit={onSubmit} className="flex-1">
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">기본 정보</h3>
            {renderInput(
              '입찰 이름',
              formData.shipmentName,
              (v) => setFormData({ ...formData, shipmentName: String(v) }),
              'text',
              '예: 서울-부산 일반 화물'
            )}

            <div className="grid grid-cols-2 gap-4">
              {renderInput(
                '최소 예산 (원)',
                formData.budgetMin,
                (v) => setFormData({ ...formData, budgetMin: Number(v) }),
                'number',
                '1000000'
              )}
              {renderInput(
                '최대 예산 (원)',
                formData.budgetMax,
                (v) => setFormData({ ...formData, budgetMax: Number(v) }),
                'number',
                '2000000'
              )}
            </div>

            {renderInput(
              '필요 리드타임 (시간)',
              formData.requiredLeadtimeHours,
              (v) => setFormData({ ...formData, requiredLeadtimeHours: Number(v) }),
              'number',
              '24'
            )}

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.preferEcoFriendly || false}
                onChange={(e) => setFormData({ ...formData, preferEcoFriendly: e.target.checked })}
                className="rounded border-slate-300"
              />
              <span className="text-sm text-slate-700">친환경 물류사 우대</span>
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">출발지 & 도착지</h3>

            <div>
              <h4 className="mb-2 text-sm font-medium text-slate-700">출발지</h4>
              <div className="space-y-3 rounded-lg bg-slate-50 p-4">
                {renderInput('주소', formData.sourceLocation?.address, (v) =>
                  setFormData({ ...formData, sourceLocation: { ...formData.sourceLocation, address: String(v) } as any }), 'text', '서울시 강남구')}
                {renderInput('도시', formData.sourceLocation?.city, (v) =>
                  setFormData({ ...formData, sourceLocation: { ...formData.sourceLocation, city: String(v) } as any }), 'text', '서울')}
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-medium text-slate-700">도착지</h4>
              <div className="space-y-3 rounded-lg bg-slate-50 p-4">
                {renderInput('주소', formData.destinationLocation?.address, (v) =>
                  setFormData({ ...formData, destinationLocation: { ...formData.destinationLocation, address: String(v) } as any }), 'text', '부산시 중구')}
                {renderInput('도시', formData.destinationLocation?.city, (v) =>
                  setFormData({ ...formData, destinationLocation: { ...formData.destinationLocation, city: String(v) } as any }), 'text', '부산')}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">화물 & 평가 정책</h3>

            <div>
              <h4 className="mb-2 text-sm font-medium text-slate-700">화물 정보</h4>
              <div className="space-y-3 rounded-lg bg-slate-50 p-4">
                {renderInput(
                  '화물 중량 (kg)',
                  formData.shipmentDetails?.weight,
                  (v) => setFormData({ ...formData, shipmentDetails: { ...formData.shipmentDetails, weight: Number(v) } as any }),
                  'number',
                  '500'
                )}
                {renderInput(
                  '화물 종류',
                  formData.shipmentDetails?.itemType,
                  (v) => setFormData({ ...formData, shipmentDetails: { ...formData.shipmentDetails, itemType: String(v) } as any }),
                  'text',
                  '일반 화물'
                )}
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-medium text-slate-700">평가 정책 가중치</h4>
              <div className="space-y-3 rounded-lg bg-slate-50 p-4">
                <p className="text-xs text-slate-600">
                  합계가 1.0이 되도록 설정하세요
                </p>

                {renderInput('가격 (α)', policy.alpha, (v) =>
                  setFormData({ ...formData, evaluationPolicy: { ...policy, alpha: Number(v) } }), 'number', '0.4')}
                {renderInput('리드타임 (β)', policy.beta, (v) =>
                  setFormData({ ...formData, evaluationPolicy: { ...policy, beta: Number(v) } }), 'number', '0.3')}
                {renderInput('탄소집약도 (γ)', policy.gamma, (v) =>
                  setFormData({ ...formData, evaluationPolicy: { ...policy, gamma: Number(v) } }), 'number', '0.3')}

                <div className={`rounded-lg p-3 text-xs ${policySum.toFixed(2) === '1.00' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                  <p className="font-semibold">현재 합계: {policySum.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 flex gap-3 border-t border-slate-200 pt-6">
          <button
            type="button"
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              step === 1
                ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ChevronLeft className="h-4 w-4" />
            이전
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="ml-auto flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              다음
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onCancel}
                className="ml-auto rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition ${
                  isSubmitting
                    ? 'cursor-not-allowed bg-slate-400'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isSubmitting ? '생성 중...' : '입찰 생성'}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}

export default CreateBidForm;
