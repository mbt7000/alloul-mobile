'use client';

import { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  Users,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';

// KPI Card Component
const KPICard = ({
  label,
  value,
  unit = '',
  growth,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  unit?: string;
  growth?: number;
  icon: any;
}) => (
  <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-sm text-slate-400 mb-2">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-3xl font-bold text-white">{value}</p>
          {unit && <span className="text-sm text-slate-400">{unit}</span>}
        </div>
        {growth !== undefined && (
          <p className={`text-sm mt-2 ${growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {growth >= 0 ? '↑' : '↓'} {Math.abs(growth)}% from last month
          </p>
        )}
      </div>
      <div className="bg-slate-700 rounded-lg p-3">
        <Icon className="text-slate-300" size={24} />
      </div>
    </div>
  </div>
);

// Mock Data
const mockKPIs = [
  { label: 'إجمالي الاشتراكات', value: 1248, growth: 12, icon: Users },
  { label: 'MRR', value: '$48,250', growth: 8, icon: DollarSign },
  { label: 'ARR', value: '$579,000', growth: 15, icon: TrendingUp },
  { label: 'معدل التحويل', value: '34%', growth: 5, icon: Activity },
];

const monthlyRevenueData = [
  { month: 'أكتوبر', value: 38000, color: 'from-blue-600 to-blue-500' },
  { month: 'نوفمبر', value: 42000, color: 'from-purple-600 to-purple-500' },
  { month: 'ديسمبر', value: 45000, color: 'from-pink-600 to-pink-500' },
  { month: 'يناير', value: 46000, color: 'from-green-600 to-green-500' },
  { month: 'فبراير', value: 48000, color: 'from-indigo-600 to-indigo-500' },
  { month: 'مارس', value: 48250, color: 'from-cyan-600 to-cyan-500' },
];

const subscriptionsByPlan = [
  { plan: 'Starter', count: 584, percentage: 47, color: 'bg-blue-500' },
  { plan: 'Professional', count: 456, percentage: 37, color: 'bg-purple-500' },
  { plan: 'Business', count: 208, percentage: 16, color: 'bg-green-500' },
];

const recentSubscriptions = [
  {
    id: 1,
    company: 'Tech Innovations LLC',
    plan: 'Professional',
    status: 'active',
    amount: '$99/month',
    date: '2026-04-10',
  },
  {
    id: 2,
    company: 'Global Solutions Inc',
    plan: 'Business',
    status: 'active',
    amount: '$299/month',
    date: '2026-04-09',
  },
  {
    id: 3,
    company: 'Digital Agency Pro',
    plan: 'Starter',
    status: 'trialing',
    amount: 'Free',
    date: '2026-04-08',
  },
  {
    id: 4,
    company: 'Cloud Services Co',
    plan: 'Professional',
    status: 'active',
    amount: '$99/month',
    date: '2026-04-07',
  },
  {
    id: 5,
    company: 'Enterprise Solutions',
    plan: 'Business',
    status: 'active',
    amount: '$299/month',
    date: '2026-04-06',
  },
  {
    id: 6,
    company: 'Startup Ventures',
    plan: 'Starter',
    status: 'canceled',
    amount: '$0',
    date: '2026-04-05',
  },
  {
    id: 7,
    company: 'Data Systems Group',
    plan: 'Professional',
    status: 'trialing',
    amount: 'Free',
    date: '2026-04-04',
  },
  {
    id: 8,
    company: 'Marketing Dynamics',
    plan: 'Starter',
    status: 'active',
    amount: '$49/month',
    date: '2026-04-03',
  },
  {
    id: 9,
    company: 'Finance Plus Ltd',
    plan: 'Business',
    status: 'active',
    amount: '$299/month',
    date: '2026-04-02',
  },
  {
    id: 10,
    company: 'Media Group Holdings',
    plan: 'Professional',
    status: 'active',
    amount: '$99/month',
    date: '2026-04-01',
  },
];

const enterpriseLeads = [
  {
    id: 1,
    company: 'Mega Corp Industries',
    employees: '5,000+',
    status: 'negotiating',
    owner: 'Ahmed Hassan',
    date: '2026-04-09',
  },
  {
    id: 2,
    company: 'Global Enterprises Ltd',
    employees: '2,500',
    status: 'demo',
    owner: 'Fatima Al-Rashid',
    date: '2026-04-08',
  },
  {
    id: 3,
    company: 'International Holdings',
    employees: '8,000+',
    status: 'contacted',
    owner: 'Mohammed Al-Noor',
    date: '2026-04-07',
  },
  {
    id: 4,
    company: 'Strategic Ventures Inc',
    employees: '1,200',
    status: 'won',
    owner: 'Leila Al-Mansoori',
    date: '2026-04-05',
  },
  {
    id: 5,
    company: 'Premium Solutions Group',
    employees: '3,500',
    status: 'new',
    owner: 'Omar Al-Amri',
    date: '2026-04-01',
  },
];

const statusColors = {
  active: 'bg-green-900 text-green-200',
  trialing: 'bg-yellow-900 text-yellow-200',
  canceled: 'bg-red-900 text-red-200',
  new: 'bg-blue-900 text-blue-200',
  contacted: 'bg-purple-900 text-purple-200',
  demo: 'bg-indigo-900 text-indigo-200',
  negotiating: 'bg-orange-900 text-orange-200',
  won: 'bg-green-900 text-green-200',
};

const statusLabels = {
  active: 'نشط',
  trialing: 'في المحاولة',
  canceled: 'ملغى',
  new: 'جديد',
  contacted: 'تم التواصل',
  demo: 'عرض توضيحي',
  negotiating: 'قيد التفاوض',
  won: 'تم الفوز',
};

export default function SubscriptionsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'enterprise' | 'trials' | 'churn'>(
    'overview'
  );

  const maxRevenue = Math.max(...monthlyRevenueData.map((d) => d.value));

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">تحليلات الاشتراكات</h1>
          <p className="text-slate-400">Subscription Analytics Dashboard</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {mockKPIs.map((kpi, idx) => (
            <KPICard key={idx} {...kpi} />
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-slate-700">
          {[
            { id: 'overview', label: 'نظرة عامة' },
            { id: 'enterprise', label: 'خط أنابيب المؤسسات' },
            { id: 'trials', label: 'تحليلات المحاولات' },
            { id: 'churn', label: 'مقاييس الإلغاء' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Revenue Chart */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-bold mb-6">إيرادات الشهر الأخير</h2>
              <div className="flex items-end justify-between h-48 gap-2 mb-4">
                {monthlyRevenueData.map((data) => {
                  const percentage = (data.value / maxRevenue) * 100;
                  return (
                    <div key={data.month} className="flex-1 flex flex-col items-center gap-2">
                      <div
                        className={`w-full bg-gradient-to-t ${data.color} rounded-t transition-all hover:opacity-80`}
                        style={{ height: `${percentage}%`, minHeight: '40px' }}
                      />
                      <div className="text-xs text-slate-400 text-center">{data.month}</div>
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-6 gap-2 text-xs text-slate-400">
                {monthlyRevenueData.map((data) => (
                  <div key={data.month} className="text-center">
                    ${(data.value / 1000).toFixed(0)}K
                  </div>
                ))}
              </div>
            </div>

            {/* Subscriptions by Plan */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <h2 className="text-xl font-bold mb-6">توزيع الاشتراكات</h2>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {subscriptionsByPlan.map((plan, idx) => (
                      <div key={idx} className="mb-4">
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium">{plan.plan}</span>
                          <span className="text-sm text-slate-400">
                            {plan.count} ({plan.percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                          <div
                            className={`${plan.color} h-full rounded-full`}
                            style={{ width: `${plan.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mr-8 flex flex-col gap-4">
                    {subscriptionsByPlan.map((plan, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full ${plan.color}`} />
                        <span className="text-xs text-slate-400">{plan.plan}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="space-y-4">
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle className="text-green-400" size={20} />
                    <span className="text-slate-400">النشطة</span>
                  </div>
                  <p className="text-2xl font-bold">1,084</p>
                  <p className="text-sm text-green-400 mt-2">↑ 18% من الشهر السابق</p>
                </div>

                <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Clock className="text-yellow-400" size={20} />
                    <span className="text-slate-400">في المحاولة</span>
                  </div>
                  <p className="text-2xl font-bold">164</p>
                  <p className="text-sm text-yellow-400 mt-2">معدل التحويل: 34%</p>
                </div>
              </div>
            </div>

            {/* Recent Subscriptions Table */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-6">الاشتراكات الأخيرة</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">
                        الشركة
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">
                        الخطة
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">
                        الحالة
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">
                        المبلغ
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">
                        تاريخ البدء
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSubscriptions.map((sub) => (
                      <tr key={sub.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                        <td className="py-4 px-4 text-sm">{sub.company}</td>
                        <td className="py-4 px-4 text-sm">{sub.plan}</td>
                        <td className="py-4 px-4 text-sm">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                              statusColors[sub.status as keyof typeof statusColors]
                            }`}
                          >
                            {statusLabels[sub.status as keyof typeof statusLabels]}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm">{sub.amount}</td>
                        <td className="py-4 px-4 text-sm text-slate-400">{sub.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Enterprise Tab */}
        {activeTab === 'enterprise' && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-6">خط أنابيب المؤسسات</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">
                      الشركة
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">
                      الموظفين
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">
                      الحالة
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">
                      المسؤول
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">
                      التاريخ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {enterpriseLeads.map((lead) => (
                    <tr key={lead.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                      <td className="py-4 px-4 text-sm">{lead.company}</td>
                      <td className="py-4 px-4 text-sm">{lead.employees}</td>
                      <td className="py-4 px-4 text-sm">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            statusColors[lead.status as keyof typeof statusColors]
                          }`}
                        >
                          {statusLabels[lead.status as keyof typeof statusLabels]}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm">{lead.owner}</td>
                      <td className="py-4 px-4 text-sm text-slate-400">{lead.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Trials Tab */}
        {activeTab === 'trials' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Activity className="text-blue-400" size={20} />
                  <span className="text-slate-400">محاولات نشطة</span>
                </div>
                <p className="text-3xl font-bold">164</p>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertCircle className="text-orange-400" size={20} />
                  <span className="text-slate-400">تنتهي هذا الأسبوع</span>
                </div>
                <p className="text-3xl font-bold">23</p>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="text-green-400" size={20} />
                  <span className="text-slate-400">معدل التحويل</span>
                </div>
                <p className="text-3xl font-bold">34%</p>
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-6">漏斗التحويل</h2>
              <div className="space-y-4">
                {[
                  { stage: 'بدأ المحاولة', count: 512, percentage: 100 },
                  { stage: 'اليوم 7', count: 421, percentage: 82 },
                  { stage: 'اليوم 14', count: 284, percentage: 55 },
                  { stage: 'محول', count: 164, percentage: 34 },
                ].map((item) => (
                  <div key={item.stage}>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">{item.stage}</span>
                      <span className="text-sm text-slate-400">
                        {item.count} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Churn Tab */}
        {activeTab === 'churn' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <XCircle className="text-red-400" size={20} />
                  <span className="text-slate-400">معدل الإلغاء الشهري</span>
                </div>
                <p className="text-3xl font-bold">2.3%</p>
                <p className="text-sm text-slate-400 mt-4">↓ 0.4% من الشهر السابق</p>
              </div>

              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertCircle className="text-orange-400" size={20} />
                  <span className="text-slate-400">حسابات معرضة للخطر</span>
                </div>
                <p className="text-3xl font-bold">17</p>
                <p className="text-sm text-orange-400 mt-4">اقتراب الحدود</p>
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-6">أسباب الإلغاء</h2>
              <div className="space-y-4">
                {[
                  {
                    reason: 'مشاكل التكامل التقني',
                    count: 12,
                    percentage: 32,
                  },
                  {
                    reason: 'السعر مرتفع جداً',
                    count: 10,
                    percentage: 27,
                  },
                  {
                    reason: 'تحويل إلى منافس',
                    count: 8,
                    percentage: 21,
                  },
                  {
                    reason: 'لم تعد هناك حاجة',
                    count: 7,
                    percentage: 19,
                  },
                ].map((item) => (
                  <div key={item.reason}>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">{item.reason}</span>
                      <span className="text-sm text-slate-400">
                        {item.count} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-red-500 h-full rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
