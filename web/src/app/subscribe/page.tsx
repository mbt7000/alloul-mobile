'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Lock,
  Zap,
  Users,
  HardDrive,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { validateCoupon } from '@/lib/api';
import { cn } from '@/lib/utils';

type PlanType = 'professional' | 'business';
type BillingCycle = 'monthly' | 'yearly';
type Industry = 'تقنية' | 'تعليم' | 'صحة' | 'مالية' | 'عقارات' | 'تجزئة' | 'خدمات' | 'أخرى';

interface Plan {
  id: PlanType;
  name: string;
  nameAr: string;
  monthlyPrice: number;
  features: Array<{ icon: React.ReactNode; text: string }>;
  limits: {
    users: number;
    storage: number;
    apiCalls: number;
  };
}

interface FormData {
  companyName: string;
  subdomain: string;
  industry: Industry;
  adminFullName: string;
  adminEmail: string;
  adminPhone: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
}

interface CouponData {
  valid: boolean;
  discountPercent?: number;
  discountAmount?: number;
}

const PLANS: Record<PlanType, Plan> = {
  professional: {
    id: 'professional',
    name: 'Professional',
    nameAr: 'احترافي',
    monthlyPrice: 90,
    features: [
      { icon: Users, text: 'حتى 15 موظف' },
      { icon: HardDrive, text: '50GB تخزين سحابي' },
      { icon: Zap, text: 'AI Assistant (500 رسالة/شهر)' },
      { icon: ShieldCheck, text: 'مكالمات الفيديو' },
      { icon: Lock, text: 'دعم أولوية (24 ساعة)' },
    ],
    limits: {
      users: 15,
      storage: 50,
      apiCalls: 10000,
    },
  },
  business: {
    id: 'business',
    name: 'Business',
    nameAr: 'ريادي',
    monthlyPrice: 210,
    features: [
      { icon: Users, text: 'حتى 32 موظف' },
      { icon: HardDrive, text: '200GB تخزين سحابي' },
      { icon: Zap, text: 'AI Assistant غير محدود' },
      { icon: ShieldCheck, text: 'SSO + 2FA إلزامي' },
      { icon: Lock, text: 'دعم مخصص (12 ساعة)' },
    ],
    limits: {
      users: 32,
      storage: 200,
      apiCalls: 50000,
    },
  },
};

const INDUSTRIES: Industry[] = ['تقنية', 'تعليم', 'صحة', 'مالية', 'عقارات', 'تجزئة', 'خدمات', 'أخرى'];
const VAT_RATE = 0.05;

export default function SubscribePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = (searchParams?.get('plan') || 'professional') as PlanType;

  const [selectedPlan, setSelectedPlan] = useState<PlanType>(
    planParam === 'business' ? 'business' : 'professional'
  );
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showFeaturesExpanded, setShowFeaturesExpanded] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [couponData, setCouponData] = useState<CouponData | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    subdomain: '',
    industry: 'تقنية',
    adminFullName: '',
    adminEmail: '',
    adminPhone: '',
    termsAccepted: false,
    privacyAccepted: false,
  });

  const [formErrors, setFormErrors] = useState<Partial<FormData>>({});
  const [touchedFields, setTouchedFields] = useState<Partial<Record<keyof FormData, boolean>>>({});

  const plan = PLANS[selectedPlan];

  // Calculate pricing
  const basePrice = plan.monthlyPrice;
  const yearlyFactor = billingCycle === 'yearly' ? 12 : 1;
  const priceBeforeVat = basePrice * yearlyFactor;
  const vatAmount = priceBeforeVat * VAT_RATE;
  const totalPrice = priceBeforeVat + vatAmount;

  // Apply discount
  let discountAmount = 0;
  if (couponData?.discountAmount) {
    discountAmount = couponData.discountAmount;
  } else if (couponData?.discountPercent) {
    discountAmount = totalPrice * (couponData.discountPercent / 100);
  }
  const finalPrice = Math.max(0, totalPrice - discountAmount);

  // Yearly savings badge
  const yearlySavings = billingCycle === 'yearly' ? (basePrice * 12) * 0.15 : 0;

  const validateForm = useCallback((): boolean => {
    const errors: Partial<FormData> = {};

    if (!formData.companyName.trim()) {
      errors.companyName = 'اسم الشركة مطلوب';
    }

    if (!formData.subdomain.trim()) {
      errors.subdomain = 'Subdomain مطلوب';
    } else if (!/^[a-z0-9-]{3,}$/.test(formData.subdomain)) {
      errors.subdomain = 'Subdomain يجب أن يحتوي على أحرف وأرقام وشرطات فقط (3 أحرف على الأقل)';
    }

    if (!formData.adminFullName.trim()) {
      errors.adminFullName = 'الاسم الكامل مطلوب';
    }

    if (!formData.adminEmail.trim()) {
      errors.adminEmail = 'البريد الإلكتروني مطلوب';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
      errors.adminEmail = 'البريد الإلكتروني غير صحيح';
    }

    if (!formData.termsAccepted) {
      errors.termsAccepted = 'يجب قبول الشروط والأحكام';
    }

    if (!formData.privacyAccepted) {
      errors.privacyAccepted = 'يجب قبول سياسة الخصوصية';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const handleFieldChange = useCallback(
    (field: keyof FormData, value: any) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      // Clear error when user starts typing
      if (touchedFields[field]) {
        setFormErrors((prev) => ({
          ...prev,
          [field]: undefined,
        }));
      }
    },
    [touchedFields]
  );

  const handleFieldBlur = useCallback((field: keyof FormData) => {
    setTouchedFields((prev) => ({
      ...prev,
      [field]: true,
    }));
  }, []);

  const handleApplyCoupon = useCallback(async () => {
    if (!couponCode.trim()) {
      setFormErrors((prev) => ({
        ...prev,
        couponCode: 'أدخل كود الخصم',
      }));
      return;
    }

    setCouponLoading(true);
    setFormErrors((prev) => ({
      ...prev,
      couponCode: undefined,
    }));

    try {
      const result = await validateCoupon(couponCode);
      if (result.valid) {
        setCouponData(result);
      } else {
        setFormErrors((prev) => ({
          ...prev,
          couponCode: 'كود الخصم غير صحيح أو منتهي الصلاحية',
        }));
      }
    } catch (err) {
      setFormErrors((prev) => ({
        ...prev,
        couponCode: 'خطأ عند التحقق من كود الخصم',
      }));
    } finally {
      setCouponLoading(false);
    }
  }, [couponCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // In production, this would call the API to create the subscription
      // For now, we'll show success and redirect
      setSuccess(true);
      setTimeout(() => {
        router.push('/settings/billing');
      }, 2000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'حدث خطأ أثناء معالجة الاشتراك. يرجى المحاولة مجددًا.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white"
      dir="rtl"
    >
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold">اختر خطتك</h1>
          <p className="mt-2 text-slate-400">أكمل الاشتراك في ALLOUL&Q الآن</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Plan Selector */}
        <div className="mb-12 flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
          {(['professional', 'business'] as PlanType[]).map((planType) => (
            <button
              key={planType}
              onClick={() => setSelectedPlan(planType)}
              className={cn(
                'relative px-8 py-3 font-semibold rounded-lg transition-all duration-200',
                selectedPlan === planType
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/50'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              )}
            >
              {PLANS[planType].nameAr}
              {planType === 'business' && (
                <span className="absolute -top-2 -left-2 inline-block bg-orange-500 px-2 py-1 text-xs font-bold rounded-full">
                  الأفضل
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Success State */}
        {success && (
          <div className="mb-8 rounded-lg bg-green-500/20 border border-green-500/50 p-4 text-green-300">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5" />
              <span>تم إنشاء الاشتراك بنجاح! جاري التوجيه...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-8 rounded-lg bg-red-500/20 border border-red-500/50 p-4 text-red-300">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">حدث خطأ</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left: Checkout Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* معلومات الشركة */}
              <section className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-sm">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-sm font-semibold">
                    1
                  </span>
                  معلومات الشركة
                </h2>

                <div className="space-y-4">
                  {/* اسم الشركة */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">اسم الشركة *</label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => handleFieldChange('companyName', e.target.value)}
                      onBlur={() => handleFieldBlur('companyName')}
                      placeholder="مثال: شركة التقنية المتقدمة"
                      className={cn(
                        'w-full rounded-lg border bg-slate-900 px-4 py-2.5 text-white placeholder-slate-500 transition-colors',
                        formErrors.companyName
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50'
                          : 'border-slate-600 focus:border-blue-500 focus:ring-blue-500/50'
                      )}
                      disabled={isLoading}
                    />
                    {formErrors.companyName && (
                      <p className="mt-1 text-xs text-red-400">{formErrors.companyName}</p>
                    )}
                  </div>

                  {/* Subdomain */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Subdomain *</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={formData.subdomain}
                        onChange={(e) => handleFieldChange('subdomain', e.target.value.toLowerCase())}
                        onBlur={() => handleFieldBlur('subdomain')}
                        placeholder="مثال: my-company"
                        className={cn(
                          'flex-1 rounded-lg border bg-slate-900 px-4 py-2.5 text-white placeholder-slate-500 transition-colors',
                          formErrors.subdomain
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50'
                            : 'border-slate-600 focus:border-blue-500 focus:ring-blue-500/50'
                        )}
                        disabled={isLoading}
                      />
                      <span className="text-slate-400 whitespace-nowrap">.alloul.qa</span>
                    </div>
                    {formErrors.subdomain && (
                      <p className="mt-1 text-xs text-red-400">{formErrors.subdomain}</p>
                    )}
                  </div>

                  {/* القطاع */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">القطاع *</label>
                    <select
                      value={formData.industry}
                      onChange={(e) => handleFieldChange('industry', e.target.value as Industry)}
                      className={cn(
                        'w-full rounded-lg border bg-slate-900 px-4 py-2.5 text-white transition-colors cursor-pointer',
                        'border-slate-600 focus:border-blue-500 focus:ring-blue-500/50'
                      )}
                      disabled={isLoading}
                    >
                      {INDUSTRIES.map((ind) => (
                        <option key={ind} value={ind}>
                          {ind}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              {/* معلومات المسؤول */}
              <section className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-sm">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-sm font-semibold">
                    2
                  </span>
                  معلومات المسؤول
                </h2>

                <div className="space-y-4">
                  {/* الاسم الكامل */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">الاسم الكامل *</label>
                    <input
                      type="text"
                      value={formData.adminFullName}
                      onChange={(e) => handleFieldChange('adminFullName', e.target.value)}
                      onBlur={() => handleFieldBlur('adminFullName')}
                      placeholder="مثال: أحمد محمد علي"
                      className={cn(
                        'w-full rounded-lg border bg-slate-900 px-4 py-2.5 text-white placeholder-slate-500 transition-colors',
                        formErrors.adminFullName
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50'
                          : 'border-slate-600 focus:border-blue-500 focus:ring-blue-500/50'
                      )}
                      disabled={isLoading}
                    />
                    {formErrors.adminFullName && (
                      <p className="mt-1 text-xs text-red-400">{formErrors.adminFullName}</p>
                    )}
                  </div>

                  {/* البريد الإلكتروني */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">البريد الإلكتروني *</label>
                    <input
                      type="email"
                      value={formData.adminEmail}
                      onChange={(e) => handleFieldChange('adminEmail', e.target.value)}
                      onBlur={() => handleFieldBlur('adminEmail')}
                      placeholder="مثال: admin@company.com"
                      className={cn(
                        'w-full rounded-lg border bg-slate-900 px-4 py-2.5 text-white placeholder-slate-500 transition-colors',
                        formErrors.adminEmail
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50'
                          : 'border-slate-600 focus:border-blue-500 focus:ring-blue-500/50'
                      )}
                      disabled={isLoading}
                    />
                    {formErrors.adminEmail && (
                      <p className="mt-1 text-xs text-red-400">{formErrors.adminEmail}</p>
                    )}
                  </div>

                  {/* رقم الهاتف */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">رقم الهاتف (اختياري)</label>
                    <input
                      type="tel"
                      value={formData.adminPhone}
                      onChange={(e) => handleFieldChange('adminPhone', e.target.value)}
                      placeholder="مثال: +974 4444 5555"
                      className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:ring-blue-500/50"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </section>

              {/* معلومات الدفع */}
              <section className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-sm">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-sm font-semibold">
                    3
                  </span>
                  معلومات الدفع
                </h2>

                {/* Stripe Payment Element Placeholder */}
                <div
                  id="stripe-payment-element"
                  className="rounded-lg border border-slate-600 bg-slate-900 p-6 text-center text-slate-400"
                >
                  <Lock className="h-8 w-8 mx-auto mb-3 text-slate-500" />
                  <p className="font-semibold">نموذج الدفع الآمن</p>
                  <p className="text-sm mt-2">سيتم تحميل خيارات الدفع الآمنة عبر Stripe هنا</p>
                </div>

                <div className="mt-4 flex items-start gap-2 rounded-lg bg-slate-900/50 p-3 text-sm text-slate-300">
                  <ShieldCheck className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-500" />
                  <p>الدفع آمن ومشفر عبر Stripe. لا نقوم بحفظ بيانات بطاقتك.</p>
                </div>
              </section>

              {/* Coupon Code Section */}
              <section className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => setShowCouponInput(!showCouponInput)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <h3 className="text-base font-semibold flex items-center gap-2">
                    <span>لديك كود خصم؟</span>
                  </h3>
                  {showCouponInput ? (
                    <ChevronUp className="h-5 w-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  )}
                </button>

                {showCouponInput && (
                  <div className="mt-4 space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="أدخل كود الخصم"
                        className={cn(
                          'flex-1 rounded-lg border bg-slate-900 px-4 py-2.5 text-white placeholder-slate-500 transition-colors',
                          formErrors.couponCode
                            ? 'border-red-500'
                            : 'border-slate-600 focus:border-blue-500'
                        )}
                        disabled={couponLoading || isLoading || !!couponData?.valid}
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={couponLoading || isLoading || !!couponData?.valid}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
                      >
                        {couponLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : couponData?.valid ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          'تطبيق'
                        )}
                      </button>
                    </div>
                    {formErrors.couponCode && (
                      <p className="text-xs text-red-400">{formErrors.couponCode}</p>
                    )}
                    {couponData?.valid && (
                      <p className="text-xs text-green-400">تم تطبيق الكود بنجاح!</p>
                    )}
                  </div>
                )}
              </section>

              {/* الشروط والأحكام */}
              <section className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={formData.termsAccepted}
                    onChange={(e) => handleFieldChange('termsAccepted', e.target.checked)}
                    disabled={isLoading}
                    className="mt-1 h-5 w-5 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-sm group-hover:text-slate-200">
                    أوافق على{' '}
                    <button
                      type="button"
                      onClick={() => router.push('/terms')}
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      الشروط والأحكام
                    </button>
                  </span>
                </label>
                {formErrors.termsAccepted && (
                  <p className="text-xs text-red-400">{formErrors.termsAccepted}</p>
                )}

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={formData.privacyAccepted}
                    onChange={(e) => handleFieldChange('privacyAccepted', e.target.checked)}
                    disabled={isLoading}
                    className="mt-1 h-5 w-5 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-sm group-hover:text-slate-200">
                    أوافق على{' '}
                    <button
                      type="button"
                      onClick={() => router.push('/privacy')}
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      سياسة الخصوصية
                    </button>
                  </span>
                </label>
                {formErrors.privacyAccepted && (
                  <p className="text-xs text-red-400">{formErrors.privacyAccepted}</p>
                )}
              </section>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-bold text-white transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    جاري المعالجة...
                  </>
                ) : (
                  `أكمل الاشتراك - ${finalPrice.toFixed(2)} درهم/شهر`
                )}
              </button>

              <p className="text-center text-xs text-slate-400">
                لا تقلق، يمكنك إلغاء الاشتراك في أي وقت بدون رسوم إنهاء.
              </p>
            </form>
          </div>

          {/* Right: Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-sm">
              {/* Plan Badge */}
              <div className="mb-6">
                <div className="inline-block rounded-lg bg-gradient-to-r from-blue-500/20 to-cyan-500/20 px-3 py-1 text-sm font-semibold text-blue-300 border border-blue-500/30">
                  {plan.nameAr}
                </div>
              </div>

              {/* Billing Toggle */}
              <div className="mb-8">
                <label className="text-sm font-semibold text-slate-400 mb-3 block">
                  دورة الفواتير
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-lg">
                  {(['monthly', 'yearly'] as BillingCycle[]).map((cycle) => (
                    <button
                      key={cycle}
                      onClick={() => setBillingCycle(cycle)}
                      className={cn(
                        'py-2 rounded font-semibold transition-colors text-sm',
                        billingCycle === cycle
                          ? 'bg-blue-500 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      )}
                    >
                      {cycle === 'monthly' ? 'شهري' : 'سنوي'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Yearly Savings Badge */}
              {billingCycle === 'yearly' && yearlySavings > 0 && (
                <div className="mb-6 rounded-lg bg-gradient-to-r from-orange-500/20 to-amber-500/20 px-3 py-2 border border-orange-500/30">
                  <p className="text-sm font-semibold text-orange-300">
                    وفّر {yearlySavings.toFixed(2)} درهم سنويًا
                  </p>
                </div>
              )}

              {/* Price Breakdown */}
              <div className="mb-8 space-y-3 border-t border-slate-700 pt-6">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">المبلغ الأساسي:</span>
                  <span className="font-semibold">{priceBeforeVat.toFixed(2)} درهم</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">ضريبة القيمة المضافة (5%):</span>
                  <span className="font-semibold">{vatAmount.toFixed(2)} درهم</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-400">
                    <span>الخصم:</span>
                    <span>-{discountAmount.toFixed(2)} درهم</span>
                  </div>
                )}

                <div className="flex justify-between border-t border-slate-700 pt-3 text-lg font-bold">
                  <span>الإجمالي:</span>
                  <span className="text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text">
                    {finalPrice.toFixed(2)} درهم
                  </span>
                </div>
              </div>

              {/* VAT Note */}
              <div className="mb-6 rounded-lg bg-slate-900/50 px-3 py-2 text-xs text-slate-400">
                <p>
                  <span className="font-semibold text-slate-300">ملاحظة:</span> تطبق ضريبة القيمة المضافة
                  5% للإمارات
                </p>
              </div>

              {/* Features Toggle */}
              <button
                type="button"
                onClick={() => setShowFeaturesExpanded(!showFeaturesExpanded)}
                className="w-full mb-4 flex items-center justify-between px-4 py-3 rounded-lg bg-slate-900/50 hover:bg-slate-900 transition-colors text-sm font-semibold"
              >
                <span>ملخص الميزات ({plan.features.length})</span>
                {showFeaturesExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {/* Features List */}
              {showFeaturesExpanded && (
                <div className="space-y-3 pb-4">
                  {plan.features.map((feature, idx) => {
                    const Icon = feature.icon as any;
                    return (
                      <div key={idx} className="flex items-start gap-3">
                        <Icon className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-slate-300">{feature.text}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Plan Limits Info */}
              <div className="mt-6 space-y-2 rounded-lg bg-slate-900/50 p-3 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>الموظفون:</span>
                  <span className="font-semibold text-slate-200">حتى {plan.limits.users}</span>
                </div>
                <div className="flex justify-between">
                  <span>التخزين:</span>
                  <span className="font-semibold text-slate-200">{plan.limits.storage}GB</span>
                </div>
                <div className="flex justify-between">
                  <span>استدعاءات API:</span>
                  <span className="font-semibold text-slate-200">
                    {plan.limits.apiCalls.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Security Badge */}
              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
                <Lock className="h-3 w-3" />
                <span>الدفع آمن عبر Stripe</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
