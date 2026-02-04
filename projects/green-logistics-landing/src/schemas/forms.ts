/**
 * Form Validation Schemas
 * Using Zod for runtime type-safe validation
 */

import { z } from 'zod';

// ============================================================================
// BID CREATION FORM SCHEMA
// ============================================================================

export const LocationSchema = z.object({
  address: z.string().min(5, '주소는 최소 5자 이상이어야 합니다'),
  city: z.string().min(2, '도시명은 필수입니다'),
  province: z.string().optional(),
  lat: z.number().min(-90).max(90, '위도 범위 오류'),
  lng: z.number().min(-180).max(180, '경도 범위 오류'),
});

export const ShipmentDetailsSchema = z.object({
  weight: z.number().min(0.1, '화물 중량은 0.1kg 이상이어야 합니다'),
  volume: z.number().positive('부피는 양수여야 합니다').optional(),
  itemType: z.string().min(2, '화물 종류를 입력하세요'),
  specialHandling: z.array(z.string()).optional(),
  pickupTime: z.string().optional(),
  deliveryTime: z.string().optional(),
});

export const EvaluationPolicySchema = z.object({
  alpha: z.number().min(0).max(1, '가격 가중치는 0~1 사이'),
  beta: z.number().min(0).max(1, '리드타임 가중치는 0~1 사이'),
  gamma: z.number().min(0).max(1, 'EI 가중치는 0~1 사이'),
}).refine(
  (data) => {
    const sum = data.alpha + data.beta + data.gamma;
    return Math.abs(sum - 1.0) < 0.01; // Allow 0.01 tolerance
  },
  {
    message: '가중치 합계는 1.0이어야 합니다 (오차 ±0.01)',
    path: ['alpha'],
  }
);

export const CreateBidFormSchema = z.object({
  shipmentName: z.string()
    .min(3, '입찰 이름은 최소 3자 이상')
    .max(255, '입찰 이름은 최대 255자'),

  sourceLocation: LocationSchema,
  destinationLocation: LocationSchema,

  shipmentDetails: ShipmentDetailsSchema,

  budgetMin: z.number()
    .positive('최소 예산은 양수여야 합니다'),

  budgetMax: z.number()
    .positive('최대 예산은 양수여야 합니다'),

  requiredLeadtimeHours: z.number()
    .int('리드타임은 정수여야 합니다')
    .positive('리드타임은 양수여야 합니다'),

  evaluationPolicy: EvaluationPolicySchema,

  preferEcoFriendly: z.boolean().optional().default(false),

  expiresAt: z.string().datetime('유효한 날짜/시간을 입력하세요').optional(),
}).refine(
  (data) => data.budgetMin <= data.budgetMax,
  {
    message: '최소 예산이 최대 예산을 초과할 수 없습니다',
    path: ['budgetMin'],
  }
);

export type CreateBidFormData = z.infer<typeof CreateBidFormSchema>;

// ============================================================================
// PROPOSAL/COUNTER-OFFER FORM SCHEMA
// ============================================================================

export const ProposalSchema = z.object({
  proposedPrice: z.number()
    .positive('제시 가격은 양수여야 합니다'),

  estimatedLeadtimeHours: z.number()
    .int('리드타임은 정수여야 합니다')
    .positive('리드타임은 양수여야 합니다'),

  fleetId: z.string().uuid('유효한 차량 ID를 선택하세요').optional(),

  notes: z.string()
    .max(1000, '메모는 최대 1000자')
    .optional(),
});

export type ProposalFormData = z.infer<typeof ProposalSchema>;

// ============================================================================
// LOGIN FORM SCHEMA
// ============================================================================

export const LoginFormSchema = z.object({
  email: z.string()
    .email('유효한 이메일 주소를 입력하세요'),

  password: z.string()
    .min(8, '비밀번호는 최소 8자 이상')
    .regex(/[A-Z]/, '대문자를 포함해야 합니다')
    .regex(/[0-9]/, '숫자를 포함해야 합니다'),
});

export type LoginFormData = z.infer<typeof LoginFormSchema>;

// ============================================================================
// REGISTER FORM SCHEMA
// ============================================================================

export const RegisterFormSchema = z.object({
  email: z.string()
    .email('유효한 이메일 주소를 입력하세요'),

  password: z.string()
    .min(8, '비밀번호는 최소 8자 이상')
    .regex(/[A-Z]/, '대문자를 포함해야 합니다')
    .regex(/[0-9]/, '숫자를 포함해야 합니다')
    .regex(/[^A-Za-z0-9]/, '특수문자를 포함해야 합니다'),

  confirmPassword: z.string(),

  companyName: z.string()
    .min(2, '회사명은 최소 2자 이상'),

  role: z.enum(['SHIPPER', 'CARRIER', 'FLEET_OWNER', 'BROKER']),

  agreeToTerms: z.boolean()
    .refine((val) => val === true, {
      message: '약관에 동의해야 합니다',
    }),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: '비밀번호가 일치하지 않습니다',
    path: ['confirmPassword'],
  }
);

export type RegisterFormData = z.infer<typeof RegisterFormSchema>;

// ============================================================================
// PROFILE UPDATE FORM SCHEMA
// ============================================================================

export const ProfileUpdateFormSchema = z.object({
  displayName: z.string()
    .min(2, '이름은 최소 2자 이상')
    .max(100, '이름은 최대 100자'),

  phoneNumber: z.string()
    .regex(/^[0-9\-\+\(\)\s]+$/, '유효한 전화번호를 입력하세요')
    .optional(),

  companyName: z.string()
    .optional(),

  website: z.string()
    .url('유효한 URL을 입력하세요')
    .optional(),

  bio: z.string()
    .max(500, '소개는 최대 500자')
    .optional(),
});

export type ProfileUpdateFormData = z.infer<typeof ProfileUpdateFormSchema>;

// ============================================================================
// EVALUATION POLICY FORM SCHEMA (for bid adjustment)
// ============================================================================

export const QuickEvaluationPolicySchema = z.object({
  strategy: z.enum(['price-focused', 'balanced', 'eco-focused']),
  customAlpha: z.number().min(0).max(1).optional(),
  customBeta: z.number().min(0).max(1).optional(),
  customGamma: z.number().min(0).max(1).optional(),
}).transform((data) => {
  const strategies = {
    'price-focused': { alpha: 0.6, beta: 0.2, gamma: 0.2 },
    'balanced': { alpha: 0.4, beta: 0.3, gamma: 0.3 },
    'eco-focused': { alpha: 0.2, beta: 0.2, gamma: 0.6 },
  };

  return strategies[data.strategy];
});

export type QuickEvaluationPolicyData = z.infer<typeof QuickEvaluationPolicySchema>;

// ============================================================================
// NOTIFICATION PREFERENCES FORM SCHEMA
// ============================================================================

export const NotificationPreferencesSchema = z.object({
  emailOnNewProposal: z.boolean().default(true),
  emailOnBidClose: z.boolean().default(true),
  emailOnProposalReview: z.boolean().default(true),
  emailOnAward: z.boolean().default(true),
  pushNotifications: z.boolean().default(false),
  dailyDigest: z.boolean().default(false),
  digestFrequency: z.enum(['daily', 'weekly', 'never']).default('daily'),
});

export type NotificationPreferencesData = z.infer<typeof NotificationPreferencesSchema>;

// ============================================================================
// VALIDATION ERROR TYPES
// ============================================================================

export type ValidationError<T> = {
  field: keyof T;
  message: string;
};
