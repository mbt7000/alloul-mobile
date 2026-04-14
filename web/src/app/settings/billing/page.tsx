'use client';

import React, { useState } from 'react';
import {
  CreditCard,
  Calendar,
  Users,
  HardDrive,
  MessageSquare,
  FileText,
  AlertTriangle,
  ChevronRight,
  Download,
  ExternalLink,
  X,
  Check,
} from 'lucide-react';

// Types
interface Plan {
  id: string;
  name: string;
  price: number;
  interval: 'monthly' | 'yearly';
  features: {
    employees: number | null;
    storage: number;
    aiMessages: number | null;
  };
}

interface CurrentSubscription {
  planId: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled';
  trialDaysRemaining?: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate: string;
  amount: number;
  interval: 'monthly' | 'yearly';
  paymentMethod: {
    last4: string;
    brand: string;
  };
  autoRenewal: boolean;
  canceledAt?: string;
}

interface Usage {
  employees: { current: number; limit: number };
  storage: { current: number; limit: number };
  aiMessages: { current: number; limit: number | null };
}

interface Invoice {
  id: string;
  number: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  pdfUrl: string;
}

// Mock Plans Data
const PLANS: Record<string, Plan> = {
  starter: {
    id: 'starter',
    name: 'ALLOUL&Q Starter',
    price: 29,
    interval: 'monthly',
    features: {
      employees: 5,
      storage: 50,
      aiMessages: 1000,
    },
  },
  professional: {
    id: 'professional',
    name: 'ALLOUL&Q Professional',
    price: 79,
    interval: 'monthly',
    features: {
      employees: 20,
      storage: 500,
      aiMessages: 10000,
    },
  },
  business: {
    id: 'business',
    name: 'ALLOUL&Q Business',
    price: 199,
    interval: 'monthly',
    features: {
      employees: null,
      storage: 2000,
      aiMessages: null,
    },
  },
};

// Mock Data
const MOCK_SUBSCRIPTION: CurrentSubscription = {
  planId: 'professional',
  status: 'active',
  currentPeriodStart: '2026-03-13',
  currentPeriodEnd: '2026-04-13',
  nextBillingDate: '2026-04-13',
  amount: 79,
  interval: 'monthly',
  paymentMethod: {
    last4: '4242',
    brand: 'Visa',
  },
  autoRenewal: true,
};

const MOCK_USAGE: Usage = {
  employees: { current: 14, limit: 20 },
  storage: { current: 320, limit: 500 },
  aiMessages: { current: 8500, limit: 10000 },
};

const MOCK_INVOICES: Invoice[] = [
  {
    id: 'inv_1',
    number: 'INV-2026-001',
    date: '2026-03-13',
    amount: 79,
    status: 'paid',
    pdfUrl: '#',
  },
  {
    id: 'inv_2',
    number: 'INV-2026-002',
    date: '2026-02-13',
    amount: 79,
    status: 'paid',
    pdfUrl: '#',
  },
  {
    id: 'inv_3',
    number: 'INV-2026-003',
    date: '2026-01-13',
    amount: 79,
    status: 'paid',
    pdfUrl: '#',
  },
];

// Components
function ProgressBar({
  current,
  limit,
  colorClass = 'bg-green-500',
}: {
  current: number;
  limit: number;
  colorClass?: string;
}) {
  const percentage = (current / limit) * 100;
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-400">
          {current.toLocaleString()} / {limit.toLocaleString()}
        </span>
        <span className="text-gray-400">{Math.round(percentage)}%</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${colorClass}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const badgeConfig: Record<
    string,
    { bg: string; text: string; label: string }
  > = {
    active: { bg: 'bg-green-900', text: 'text-green-200', label: 'نشط' },
    trialing: { bg: 'bg-blue-900', text: 'text-blue-200', label: 'في التجربة' },
    past_due: {
      bg: 'bg-red-900',
      text: 'text-red-200',
      label: 'متأخر عن الدفع',
    },
    canceled: { bg: 'bg-gray-700', text: 'text-gray-200', label: 'ملغى' },
  };

  const config = badgeConfig[status] || badgeConfig.active;

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { bg: string; text: string; icon: React.ReactNode }
  > = {
    paid: {
      bg: 'bg-green-900',
      text: 'text-green-200',
      icon: <Check className="w-4 h-4" />,
    },
    pending: {
      bg: 'bg-yellow-900',
      text: 'text-yellow-200',
      icon: <Calendar className="w-4 h-4" />,
    },
    failed: {
      bg: 'bg-red-900',
      text: 'text-red-200',
      icon: <X className="w-4 h-4" />,
    },
  };

  const { bg, text, icon } = config[status] || config.pending;

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${bg} ${text}`}>
      {icon}
      {status === 'paid' ? 'مدفوع' : status === 'pending' ? 'قيد الانتظار' : 'فشل'}
    </span>
  );
}

function SkeletonLoader() {
  return (
    <div className="space-y-4">
      <div className="h-32 bg-gray-800 rounded-lg animate-pulse" />
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// Page Component
export default function BillingPage() {
  const [subscription, setSubscription] = useState<CurrentSubscription>(
    MOCK_SUBSCRIPTION
  );
  const [usage, setUsage] = useState<Usage>(MOCK_USAGE);
  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_INVOICES);
  const [loading, setLoading] = useState(false);
  const [activeModal, setActiveModal] = useState<
    'cancel' | 'upgrade' | null
  >(null);
  const [selectedReason, setSelectedReason] = useState('');
  const [invoicePage, setInvoicePage] = useState(0);
  const invoicesPerPage = 10;

  const currentPlan = PLANS[subscription.planId];
  const paginatedInvoices = invoices.slice(
    invoicePage * invoicesPerPage,
    (invoicePage + 1) * invoicesPerPage
  );

  const handleCancelSubscription = () => {
    setLoading(true);
    setTimeout(() => {
      setSubscription((prev) => ({
        ...prev,
        status: 'canceled',
        canceledAt: new Date().toISOString().split('T')[0],
      }));
      setActiveModal(null);
      setLoading(false);
    }, 1000);
  };

  const handleReactivate = () => {
    setLoading(true);
    setTimeout(() => {
      setSubscription((prev) => ({
        ...prev,
        status: 'active',
        canceledAt: undefined,
      }));
      setLoading(false);
    }, 1000);
  };

  const handleUpgrade = (planId: string) => {
    setLoading(true);
    setTimeout(() => {
      setSubscription((prev) => ({
        ...prev,
        planId,
        amount: PLANS[planId].price,
      }));
      setActiveModal(null);
      setLoading(false);
    }, 1000);
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage < 70) return 'bg-green-500';
    if (percentage < 90) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const employeePercentage =
    (usage.employees.current / usage.employees.limit) * 100;
  const storagePercentage = (usage.storage.current / usage.storage.limit) * 100;
  const aiMessagesPercentage = currentPlan.features.aiMessages
    ? (usage.aiMessages.current / currentPlan.features.aiMessages) * 100
    : 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white" dir="rtl">
      {/* Header */}
      <div className="border-b border-gray-800 px-8 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-4 text-sm text-gray-400">
            <span>الإعدادات</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white">الفوترة</span>
          </div>
          <h1 className="text-3xl font-bold">إعدادات الفوترة</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {loading ? (
            <SkeletonLoader />
          ) : (
            <>
              {/* Section 1: Current Plan Card */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-900 rounded-lg p-3">
                      <CreditCard className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">
                        {currentPlan.name}
                      </h2>
                      <p className="text-sm text-gray-400">
                        الخطة الحالية
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={subscription.status} />
                </div>

                {subscription.status === 'trialing' &&
                  subscription.trialDaysRemaining && (
                    <div className="mb-4 space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">
                          {subscription.trialDaysRemaining} أيام متبقية في
                          التجربة
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="h-2 bg-blue-500 rounded-full"
                          style={{
                            width: `${(subscription.trialDaysRemaining / 14) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                <div className="flex items-center gap-4 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => setActiveModal('upgrade')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                  >
                    ترقية الخطة
                  </button>
                  {subscription.status !== 'canceled' && (
                    <button
                      onClick={() => setActiveModal('cancel')}
                      className="px-4 py-2 text-red-400 hover:text-red-300 font-medium transition-colors"
                    >
                      إلغاء الاشتراك
                    </button>
                  )}
                  {subscription.status === 'canceled' && (
                    <button
                      onClick={handleReactivate}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
                    >
                      إعادة تفعيل الاشتراك
                    </button>
                  )}
                </div>
              </div>

              {/* Section 2: Usage Overview */}
              <div>
                <h2 className="text-xl font-semibold mb-4">نظرة عامة على الاستخدام</h2>
                <div className="grid grid-cols-3 gap-6">
                  {/* Employees Card */}
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-purple-900 rounded-lg p-2">
                        <Users className="w-5 h-5 text-purple-400" />
                      </div>
                      <h3 className="font-semibold">الموظفين</h3>
                    </div>
                    <ProgressBar
                      current={usage.employees.current}
                      limit={usage.employees.limit}
                      colorClass={getProgressColor(employeePercentage)}
                    />
                    <button className="mt-4 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
                      إضافة موظف
                    </button>
                  </div>

                  {/* Storage Card */}
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-orange-900 rounded-lg p-2">
                        <HardDrive className="w-5 h-5 text-orange-400" />
                      </div>
                      <h3 className="font-semibold">التخزين</h3>
                    </div>
                    <ProgressBar
                      current={usage.storage.current}
                      limit={usage.storage.limit}
                      colorClass={getProgressColor(storagePercentage)}
                    />
                    <p className="mt-2 text-sm text-gray-400">
                      {usage.storage.current} GB من {usage.storage.limit} GB
                    </p>
                  </div>

                  {/* AI Messages Card */}
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-pink-900 rounded-lg p-2">
                        <MessageSquare className="w-5 h-5 text-pink-400" />
                      </div>
                      <h3 className="font-semibold">رسائل AI</h3>
                    </div>
                    {currentPlan.features.aiMessages ? (
                      <ProgressBar
                        current={usage.aiMessages.current}
                        limit={currentPlan.features.aiMessages}
                        colorClass={getProgressColor(aiMessagesPercentage)}
                      />
                    ) : (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-400">غير محدود</span>
                        </div>
                        <div className="w-full bg-green-900 rounded-full h-2">
                          <div className="h-2 bg-green-500 rounded-full w-full" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 3: Billing Details */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-6">تفاصيل الفوترة</h2>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-400 mb-2">تاريخ الفوترة التالي</p>
                    <p className="text-lg font-semibold">
                      {new Date(subscription.nextBillingDate).toLocaleDateString('ar-SA', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-2">الفترة الحالية</p>
                    <p className="text-lg font-semibold">
                      {new Date(subscription.currentPeriodStart).toLocaleDateString('ar-SA', {
                        day: 'numeric',
                        month: 'short',
                      })}
                      {' - '}
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString('ar-SA', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-2">فترة الفوترة</p>
                    <p className="text-lg font-semibold">
                      {subscription.interval === 'monthly' ? 'شهري' : 'سنوي'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-2">المبلغ</p>
                    <p className="text-lg font-semibold">
                      ${subscription.amount.toFixed(2)}/
                      <span className="text-sm">
                        {subscription.interval === 'monthly'
                          ? 'شهر'
                          : 'سنة'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-700 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400 mb-2">طريقة الدفع</p>
                    <p className="text-lg font-semibold">
                      •••• {subscription.paymentMethod.last4} (
                      {subscription.paymentMethod.brand})
                    </p>
                  </div>
                  <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors">
                    تحديث
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-gray-400">
                    التجديد التلقائي:{' '}
                    <span
                      className={
                        subscription.autoRenewal
                          ? 'text-green-400'
                          : 'text-red-400'
                      }
                    >
                      {subscription.autoRenewal ? 'مُفعّل' : 'معطّل'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Section 4: Invoice History */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-6">سجل الفواتير</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-400">
                          التاريخ
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-400">
                          رقم الفاتورة
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-400">
                          المبلغ
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-400">
                          الحالة
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-400">
                          الإجراءات
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedInvoices.map((invoice) => (
                        <tr
                          key={invoice.id}
                          className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors"
                        >
                          <td className="px-4 py-3 text-sm">
                            {new Date(invoice.date).toLocaleDateString('ar-SA', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="px-4 py-3 text-sm">{invoice.number}</td>
                          <td className="px-4 py-3 text-sm">
                            ${invoice.amount.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <InvoiceStatusBadge status={invoice.status} />
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              <button className="text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                                <Download className="w-4 h-4" />
                                تحميل
                              </button>
                              <button className="text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                                <ExternalLink className="w-4 h-4" />
                                عرض
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {Math.ceil(invoices.length / invoicesPerPage) > 1 && (
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <button
                      onClick={() =>
                        setInvoicePage(Math.max(0, invoicePage - 1))
                      }
                      disabled={invoicePage === 0}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      السابق
                    </button>
                    <span className="text-sm text-gray-400">
                      الصفحة {invoicePage + 1} من{' '}
                      {Math.ceil(invoices.length / invoicesPerPage)}
                    </span>
                    <button
                      onClick={() =>
                        setInvoicePage(
                          Math.min(
                            Math.ceil(invoices.length / invoicesPerPage) - 1,
                            invoicePage + 1
                          )
                        )
                      }
                      disabled={
                        invoicePage ===
                        Math.ceil(invoices.length / invoicesPerPage) - 1
                      }
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      التالي
                    </button>
                  </div>
                )}
              </div>

              {/* Section 5: Plan Comparison */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-6">مقارنة الخطط</h2>
                <div className="grid grid-cols-3 gap-6">
                  {Object.values(PLANS).map((plan) => (
                    <div
                      key={plan.id}
                      className={`p-6 rounded-lg border-2 transition-all ${
                        plan.id === subscription.planId
                          ? 'bg-gray-700 border-blue-500'
                          : 'bg-gray-900 border-gray-700'
                      }`}
                    >
                      <div className="mb-4">
                        <h3 className="font-semibold mb-2">{plan.name}</h3>
                        <p className="text-2xl font-bold">
                          ${plan.price}
                          <span className="text-sm text-gray-400">/شهر</span>
                        </p>
                      </div>

                      <div className="space-y-3 mb-6 py-6 border-t border-b border-gray-700">
                        <div className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-400" />
                          <span>
                            {plan.features.employees
                              ? `${plan.features.employees} موظفين`
                              : 'عدد غير محدود من الموظفين'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-400" />
                          <span>{plan.features.storage} GB تخزين</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-400" />
                          <span>
                            {plan.features.aiMessages
                              ? `${plan.features.aiMessages.toLocaleString()} رسالة AI`
                              : 'رسائل AI غير محدودة'}
                          </span>
                        </div>
                      </div>

                      {plan.id === subscription.planId ? (
                        <button
                          disabled
                          className="w-full py-2 bg-gray-600 text-gray-300 rounded-lg font-medium cursor-not-allowed"
                        >
                          الخطة الحالية
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpgrade(plan.id)}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                        >
                          ترقية إلى {plan.name.split(' ')[1]}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 6: Danger Zone */}
              {subscription.status !== 'canceled' && (
                <div className="bg-red-900/20 border border-red-900 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-red-400 mb-2">
                        منطقة الخطر
                      </h2>
                      <p className="text-gray-300 mb-4">
                        إلغاء الاشتراك الخاص بك سيؤدي إلى فقدان الوصول إلى جميع
                        الميزات. سيتم الإلغاء في نهاية فترة الفوترة الحالية.
                      </p>
                      <button
                        onClick={() => setActiveModal('cancel')}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
                      >
                        إلغاء الاشتراك
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {subscription.status === 'canceled' && (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-red-400 mb-1">
                        الاشتراك ملغى
                      </h2>
                      <p className="text-gray-400 text-sm">
                        تم إلغاء اشتراكك في{' '}
                        {new Date(subscription.canceledAt || '').toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                    <button
                      onClick={handleReactivate}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
                    >
                      إعادة تفعيل
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {activeModal === 'cancel' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">
              هل أنت متأكد من إلغاء اشتراكك؟
            </h2>
            <p className="text-gray-400 mb-6">
              سيتم إلغاء اشتراكك في نهاية فترة الفوترة الحالية. يمكنك إعادة تفعيله
              في أي وقت.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                السبب (اختياري)
              </label>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="">اختر السبب</option>
                <option value="expensive">غالي جداً</option>
                <option value="features">الميزات غير كافية</option>
                <option value="no-longer-needed">لا أحتاجها أكثر</option>
                <option value="switching">التبديل إلى خدمة أخرى</option>
                <option value="other">أخرى</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'جاري الإلغاء...' : 'إلغاء الاشتراك'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Confirmation Modal */}
      {activeModal === 'upgrade' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">ترقية الخطة</h2>
            <p className="text-gray-400 mb-6">
              ستتم محاسبتك بالفرق تناسبياً للفترة المتبقية من الشهر الحالي.
            </p>

            <div className="mb-6 p-4 bg-gray-700 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">الخطة الحالية:</span>
                <span className="font-medium">{currentPlan.name}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-400">
                <span>${subscription.amount}/شهر</span>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              {Object.values(PLANS).map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => {
                    if (plan.id !== subscription.planId) {
                      handleUpgrade(plan.id);
                    }
                  }}
                  disabled={plan.id === subscription.planId || loading}
                  className={`w-full p-3 rounded-lg text-sm font-medium transition-colors ${
                    plan.id === subscription.planId
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>{plan.name}</span>
                    <span>${plan.price}/شهر</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
              >
                إلغاء
              </button>
              <button
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'جاري الترقية...' : 'تأكيد الترقية'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
