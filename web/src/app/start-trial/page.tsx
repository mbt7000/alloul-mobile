'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Mail,
  Lock,
  Building2,
  User,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Loader2,
  Shield,
  CheckCircle2,
} from 'lucide-react';

type PasswordStrength = 'weak' | 'medium' | 'strong';

interface FormErrors {
  companyName?: string;
  subdomain?: string;
  email?: string;
  managerName?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
}

interface SubmitStatus {
  type: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
}

const TRIAL_BENEFITS = [
  'حتى 5 موظفين',
  'Media World كامل',
  'Corporate World أساسي',
  '10GB تخزين',
  'AI Assistant (50 رسالة)',
  'تطبيقات iOS و Android',
];

const TRUST_BADGES = [
  { icon: '🔒', text: '256-bit SSL' },
  { icon: '🛡️', text: 'بياناتك محمية' },
  { icon: '✓', text: 'إلغاء في أي وقت' },
];

const generateSubdomain = (companyName: string): string => {
  return companyName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

const calculatePasswordStrength = (password: string): PasswordStrength => {
  if (password.length < 12) return 'weak';

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const strengthScore = [hasUppercase, hasLowercase, hasNumbers, hasSpecialChar].filter(
    Boolean
  ).length;

  if (strengthScore >= 3) return 'strong';
  if (strengthScore >= 2) return 'medium';
  return 'weak';
};

const getPasswordStrengthColor = (strength: PasswordStrength): string => {
  switch (strength) {
    case 'strong':
      return 'bg-green-500';
    case 'medium':
      return 'bg-yellow-500';
    case 'weak':
      return 'bg-red-500';
  }
};

const getPasswordStrengthText = (strength: PasswordStrength): string => {
  switch (strength) {
    case 'strong':
      return 'قوية جداً';
    case 'medium':
      return 'متوسطة';
    case 'weak':
      return 'ضعيفة';
  }
};

export default function StartTrialPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>({ type: 'idle' });
  const [errors, setErrors] = useState<FormErrors>({});

  const [formData, setFormData] = useState({
    companyName: '',
    subdomain: '',
    email: '',
    managerName: '',
    password: '',
    confirmPassword: '',
    terms: false,
  });

  const passwordStrength = useMemo(
    () => calculatePasswordStrength(formData.password),
    [formData.password]
  );

  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      companyName: value,
      subdomain: generateSubdomain(value),
    }));
    if (errors.companyName) {
      setErrors((prev) => ({ ...prev, companyName: undefined }));
    }
  };

  const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      subdomain: value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
    }));
    if (errors.subdomain) {
      setErrors((prev) => ({ ...prev, subdomain: undefined }));
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof Omit<typeof formData, 'terms'>
  ) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, terms: e.target.checked }));
    if (errors.terms) {
      setErrors((prev) => ({ ...prev, terms: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.companyName.trim()) {
      newErrors.companyName = 'اسم الشركة مطلوب';
    }

    if (!formData.subdomain.trim()) {
      newErrors.subdomain = 'النطاق الفرعي مطلوب';
    } else if (!/^[a-z0-9-]+$/.test(formData.subdomain)) {
      newErrors.subdomain = 'النطاق الفرعي يجب أن يحتوي على أحرف وأرقام وشرطات فقط';
    } else if (formData.subdomain.startsWith('-') || formData.subdomain.endsWith('-')) {
      newErrors.subdomain = 'النطاق الفرعي لا يمكن أن يبدأ أو ينتهي بشرطة';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'البريد الإلكتروني مطلوب';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'البريد الإلكتروني غير صحيح';
    }

    if (!formData.managerName.trim()) {
      newErrors.managerName = 'اسم المدير مطلوب';
    }

    if (!formData.password) {
      newErrors.password = 'كلمة المرور مطلوبة';
    } else if (formData.password.length < 12) {
      newErrors.password = 'كلمة المرور يجب أن تكون 12 حرفاً على الأقل';
    }

    if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = 'كلمات المرور غير متطابقة';
    }

    if (!formData.terms) {
      newErrors.terms = 'يجب الموافقة على الشروط والأحكام';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      setSubmitStatus({ type: 'loading' });

      try {
        const response = await fetch('/api/trial/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            companyName: formData.companyName,
            subdomain: formData.subdomain,
            email: formData.email,
            managerName: formData.managerName,
            password: formData.password,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'حدث خطأ أثناء إنشاء الحساب');
        }

        setSubmitStatus({
          type: 'success',
          message: 'تم إنشاء حسابك بنجاح! تم إرسال رابط التفعيل إلى بريدك الإلكتروني',
        });
        setCurrentStep(2);
      } catch (error) {
        setSubmitStatus({
          type: 'error',
          message:
            error instanceof Error ? error.message : 'حدث خطأ أثناء إنشاء الحساب',
        });
      }
    },
    [formData]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-right" dir="rtl">
      {/* Progress Steps */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-950/95 border-b border-slate-800 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center gap-4 md:gap-8">
            {[
              { num: 1, label: 'إنشاء الحساب' },
              { num: 2, label: 'تفعيل البريد' },
              { num: 3, label: 'إعداد الشركة' },
              { num: 4, label: 'البدء!' },
            ].map((step, index) => (
              <div key={step.num} className="flex items-center gap-3">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                    step.num <= currentStep
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'border-slate-700 text-slate-400'
                  }`}
                >
                  {step.num < currentStep ? (
                    <Check size={20} />
                  ) : (
                    <span className="text-sm font-semibold">{step.num}</span>
                  )}
                </div>
                <span
                  className={`text-sm font-medium hidden sm:inline ${
                    step.num <= currentStep ? 'text-blue-400' : 'text-slate-500'
                  }`}
                >
                  {step.label}
                </span>
                {index < 3 && (
                  <div
                    className={`w-8 h-1 mx-2 transition-all ${
                      step.num < currentStep ? 'bg-blue-600' : 'bg-slate-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-28 pb-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Left Side - Benefits */}
            <div className="space-y-8">
              <div className="space-y-3">
                <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  ابدأ تجربتك المجانية لمدة 14 يوم
                </h1>
                <p className="text-xl text-slate-300 font-semibold">
                  ALLOUL&Q Starter - بدون بطاقة ائتمان
                </p>
              </div>

              {/* Benefits List */}
              <div className="space-y-4 bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                <h2 className="text-lg font-semibold text-slate-200 mb-4">
                  ما سيحصل عليه في التجربة:
                </h2>
                <ul className="space-y-3">
                  {TRIAL_BENEFITS.map((benefit, index) => (
                    <li
                      key={index}
                      className="flex items-center gap-3 text-slate-300 hover:text-white transition-colors"
                    >
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                        <Check size={16} className="text-white" />
                      </div>
                      <span className="text-base">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Trust Badges */}
              <div className="space-y-3">
                <div className="flex flex-col gap-2">
                  {TRUST_BADGES.map((badge, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 text-sm text-slate-400"
                    >
                      <span className="text-lg">{badge.icon}</span>
                      <span>{badge.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Limited Time Offer */}
              <div className="relative overflow-hidden rounded-xl border border-red-500/50 bg-gradient-to-r from-red-950/50 to-orange-950/50 p-4">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-orange-500/10 animate-pulse"></div>
                <div className="relative flex items-center gap-3 text-red-300">
                  <AlertCircle size={20} className="flex-shrink-0" />
                  <div>
                    <p className="font-semibold">عرض محدود - ابدأ اليوم</p>
                    <p className="text-sm text-red-200/75">
                      احصل على 14 يوم مجاني بدون تحويل تلقائي
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Registration Form */}
            <div className="lg:h-full">
              <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 space-y-6">
                {submitStatus.type === 'success' ? (
                  <div className="min-h-96 flex flex-col items-center justify-center space-y-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center animate-bounce">
                      <CheckCircle2 size={32} className="text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">
                      تم بنجاح!
                    </h3>
                    <p className="text-slate-300 max-w-sm">
                      {submitStatus.message}
                    </p>
                    <button
                      onClick={() => {
                        setFormData({
                          companyName: '',
                          subdomain: '',
                          email: '',
                          managerName: '',
                          password: '',
                          confirmPassword: '',
                          terms: false,
                        });
                        setSubmitStatus({ type: 'idle' });
                      }}
                      className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                    >
                      إنشاء حساب آخر
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <h2 className="text-2xl font-bold text-white mb-6">
                      إنشاء حسابك
                    </h2>

                    {/* Company Name */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-200">
                        اسم الشركة
                      </label>
                      <div className="relative">
                        <Building2
                          size={18}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500"
                        />
                        <input
                          type="text"
                          value={formData.companyName}
                          onChange={handleCompanyNameChange}
                          placeholder="أدخل اسم شركتك"
                          className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-3 pr-12 pl-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                      </div>
                      {errors.companyName && (
                        <p className="text-red-400 text-sm flex items-center gap-1">
                          <AlertCircle size={14} />
                          {errors.companyName}
                        </p>
                      )}
                    </div>

                    {/* Subdomain */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-200">
                        النطاق الفرعي
                      </label>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={formData.subdomain}
                            onChange={handleSubdomainChange}
                            placeholder="my-company"
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-3 pl-4 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-right"
                          />
                        </div>
                        <div className="flex items-center px-3 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-400 whitespace-nowrap">
                          .alloul.app
                        </div>
                      </div>
                      {errors.subdomain && (
                        <p className="text-red-400 text-sm flex items-center gap-1">
                          <AlertCircle size={14} />
                          {errors.subdomain}
                        </p>
                      )}
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-200">
                        البريد الإلكتروني
                      </label>
                      <div className="relative">
                        <Mail
                          size={18}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500"
                        />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange(e, 'email')}
                          placeholder="your@email.com"
                          className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-3 pr-12 pl-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                      </div>
                      {errors.email && (
                        <p className="text-red-400 text-sm flex items-center gap-1">
                          <AlertCircle size={14} />
                          {errors.email}
                        </p>
                      )}
                    </div>

                    {/* Manager Name */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-200">
                        اسم المدير
                      </label>
                      <div className="relative">
                        <User
                          size={18}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500"
                        />
                        <input
                          type="text"
                          value={formData.managerName}
                          onChange={(e) => handleInputChange(e, 'managerName')}
                          placeholder="أدخل اسمك"
                          className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-3 pr-12 pl-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                      </div>
                      {errors.managerName && (
                        <p className="text-red-400 text-sm flex items-center gap-1">
                          <AlertCircle size={14} />
                          {errors.managerName}
                        </p>
                      )}
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-200">
                        كلمة المرور
                      </label>
                      <div className="relative">
                        <Lock
                          size={18}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500"
                        />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={(e) => handleInputChange(e, 'password')}
                          placeholder="12 حرفاً على الأقل"
                          className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-3 pr-12 pl-12 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>

                      {/* Password Strength Indicator */}
                      {formData.password && (
                        <div className="space-y-2">
                          <div className="flex gap-1">
                            <div
                              className={`h-1 flex-1 rounded-full transition-all ${
                                passwordStrength === 'weak'
                                  ? 'bg-red-500'
                                  : 'bg-slate-700'
                              }`}
                            />
                            <div
                              className={`h-1 flex-1 rounded-full transition-all ${
                                passwordStrength !== 'weak'
                                  ? getPasswordStrengthColor(passwordStrength)
                                  : 'bg-slate-700'
                              }`}
                            />
                            <div
                              className={`h-1 flex-1 rounded-full transition-all ${
                                passwordStrength === 'strong'
                                  ? 'bg-green-500'
                                  : 'bg-slate-700'
                              }`}
                            />
                          </div>
                          <p className="text-xs text-slate-400">
                            قوة كلمة المرور:{' '}
                            <span
                              className={
                                passwordStrength === 'strong'
                                  ? 'text-green-400'
                                  : passwordStrength === 'medium'
                                  ? 'text-yellow-400'
                                  : 'text-red-400'
                              }
                            >
                              {getPasswordStrengthText(passwordStrength)}
                            </span>
                          </p>
                        </div>
                      )}

                      {errors.password && (
                        <p className="text-red-400 text-sm flex items-center gap-1">
                          <AlertCircle size={14} />
                          {errors.password}
                        </p>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-200">
                        تأكيد كلمة المرور
                      </label>
                      <div className="relative">
                        <Lock
                          size={18}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500"
                        />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={formData.confirmPassword}
                          onChange={(e) =>
                            handleInputChange(e, 'confirmPassword')
                          }
                          placeholder="أعد إدخال كلمة المرور"
                          className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-3 pr-12 pl-12 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          {showConfirmPassword ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                      </div>
                      {errors.confirmPassword && (
                        <p className="text-red-400 text-sm flex items-center gap-1">
                          <AlertCircle size={14} />
                          {errors.confirmPassword}
                        </p>
                      )}
                    </div>

                    {/* Terms Checkbox */}
                    <div className="space-y-2 pt-2">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.terms}
                          onChange={handleCheckboxChange}
                          className="w-5 h-5 mt-1 rounded border-slate-600 bg-slate-900/50 text-blue-600 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                        />
                        <span className="text-sm text-slate-300">
                          أوافق على{' '}
                          <a
                            href="#"
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            الشروط والأحكام
                          </a>{' '}
                          و{' '}
                          <a
                            href="#"
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            سياسة الخصوصية
                          </a>
                        </span>
                      </label>
                      {errors.terms && (
                        <p className="text-red-400 text-sm flex items-center gap-1">
                          <AlertCircle size={14} />
                          {errors.terms}
                        </p>
                      )}
                    </div>

                    {/* Error Message */}
                    {submitStatus.type === 'error' && (
                      <div className="bg-red-950/50 border border-red-500/50 rounded-lg p-4 flex gap-3 text-red-300">
                        <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-sm">
                            {submitStatus.message}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={submitStatus.type === 'loading'}
                      className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2 mt-6"
                    >
                      {submitStatus.type === 'loading' ? (
                        <>
                          <Loader2
                            size={18}
                            className="animate-spin"
                          />
                          جاري الإنشاء...
                        </>
                      ) : (
                        'ابدأ التجربة المجانية'
                      )}
                    </button>

                    {/* Already Have Account */}
                    <p className="text-center text-sm text-slate-400 pt-4">
                      هل لديك حساب بالفعل؟{' '}
                      <a
                        href="/login"
                        className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                      >
                        تسجيل الدخول
                      </a>
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
