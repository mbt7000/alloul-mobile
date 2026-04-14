'use client';

import { useState } from 'react';
import {
  Building2,
  Globe,
  Shield,
  Users,
  Headphones,
  Palette,
  Check,
  ChevronDown,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';

export default function EnterprisePage() {
  const [formData, setFormData] = useState({
    companyName: '',
    employeeCount: '',
    contactPerson: '',
    email: '',
    phone: '',
    country: 'AE',
    message: '',
  });

  const [formStatus, setFormStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus('loading');

    try {
      const response = await fetch('/api/enterprise/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setFormStatus('success');
        setFormData({
          companyName: '',
          employeeCount: '',
          contactPerson: '',
          email: '',
          phone: '',
          country: 'AE',
          message: '',
        });
        setTimeout(() => setFormStatus('idle'), 5000);
      } else {
        setFormStatus('error');
        setTimeout(() => setFormStatus('idle'), 5000);
      }
    } catch (error) {
      setFormStatus('error');
      setTimeout(() => setFormStatus('idle'), 5000);
    }
  };

  const benefits = [
    {
      icon: Building2,
      title: 'Dedicated Infrastructure',
      ar_title: 'بنية تحتية مخصصة',
      description: 'بنية تحتية مخصصة لشركتك مع ضمان الأداء العالي',
    },
    {
      icon: Globe,
      title: 'Custom Domain',
      ar_title: 'نطاق مخصص',
      description: 'نطاق مخصص (company.alloul.app)',
    },
    {
      icon: Shield,
      title: 'SLA 99.9%',
      ar_title: 'ضمان وقت التشغيل',
      description: 'ضمان وقت التشغيل بنسبة 99.9% مع دعم فني',
    },
    {
      icon: Users,
      title: 'Account Manager',
      ar_title: 'مدير حساب مخصص',
      description: 'مدير حساب مخصص لدعم احتياجات شركتك',
    },
    {
      icon: Headphones,
      title: '24/7 Support',
      ar_title: 'دعم فني على مدار الساعة',
      description: 'دعم فني متخصص متاح 24/7 بأولويتك',
    },
    {
      icon: Palette,
      title: 'White-label',
      ar_title: 'إمكانية تخصيص الهوية البصرية',
      description: 'تخصيص كامل للهوية البصرية حسب علامتك التجارية',
    },
  ];

  const useCases = [
    {
      title: 'الشركات الكبيرة',
      icon: Building2,
      description: 'إدارة فعالة لفرق متعددة وتوزيع المسؤوليات بسهولة',
      details: [
        'إدارة 50-500 موظف',
        'تقارير متقدمة ومخصصة',
        'تكامل مع أنظمة HR الحالية',
      ],
    },
    {
      title: 'المؤسسات المالية',
      icon: Shield,
      description: 'أمان على مستوى البنوك مع الامتثال للوائح المالية',
      details: [
        'الامتثال GDPR و SOC 2',
        'تشفير البيانات من الدرجة الأولى',
        'تدقيق شامل للعمليات',
      ],
    },
    {
      title: 'الشركات متعددة الفروع',
      icon: Globe,
      description: 'إدارة مركزية لجميع الفروع مع الحفاظ على الاستقلالية المحلية',
      details: [
        'لوحة تحكم موحدة',
        'إدارة الأذونات الهرمية',
        'التقارير الموحدة والمحلية',
      ],
    },
  ];

  const faqs = [
    {
      question: 'ما هي مدة عقد Enterprise؟',
      answer: 'تختلف مدة العقد حسب احتياجات شركتك، لكننا نقدم عقود سنوية مع خيارات مرنة للتجديد والتوسع.',
    },
    {
      question: 'هل يمكن تجربة Enterprise قبل الاشتراك؟',
      answer: 'نعم، نقدم demo مجاني شامل وفترة تجريبية مدتها 14 يوم بكامل الميزات حتى تتمكن من تقييم المنصة.',
    },
    {
      question: 'ما هي خيارات الدفع؟',
      answer: 'نقدم خيارات دفع مرنة تشمل الدفع الشهري والسنوي والفترات المخصصة، مع عروض خاصة للعقود الطويلة.',
    },
    {
      question: 'هل تدعمون التكامل مع أنظمتنا الحالية؟',
      answer: 'نعم، لدينا فريق متخصص يقوم بتطوير التكاملات المخصصة مع أنظمتك الحالية مثل SAP و Oracle و Salesforce.',
    },
    {
      question: 'كيف يتم نقل البيانات من نظامنا الحالي؟',
      answer: 'نوفر خدمة نقل البيانات الكاملة بدون تكاليف إضافية، مع ضمان سلامة البيانات وعدم فقدان أي معلومات.',
    },
  ];

  const countries = [
    { code: 'AE', name: 'الإمارات العربية المتحدة' },
    { code: 'SA', name: 'المملكة العربية السعودية' },
    { code: 'KW', name: 'الكويت' },
    { code: 'BH', name: 'البحرين' },
    { code: 'QA', name: 'قطر' },
    { code: 'OM', name: 'عمان' },
    { code: 'EG', name: 'مصر' },
    { code: 'JO', name: 'الأردن' },
    { code: 'OTHER', name: 'دول أخرى' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white" dir="rtl">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 py-20 md:py-32 lg:py-40">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/30 via-slate-950 to-slate-950" />
        <div className="relative mx-auto max-w-4xl text-center">
          <h1 className="mb-4 text-5xl font-bold tracking-tight md:text-6xl lg:text-7xl">
            ALLOUL&Q Enterprise
          </h1>
          <p className="mb-6 text-xl font-semibold text-blue-300 md:text-2xl">
            حلول مخصصة للشركات الكبيرة - أكثر من 32 موظف
          </p>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-slate-300 md:text-xl">
            نحن نقدم حلولاً عملية للشركات الكبرى والمؤسسات، مع البنية التحتية المتقدمة والدعم المتميز وميزات الأمان
            من الدرجة الأولى. أطلق إمكانات شركتك الكاملة مع منصة ALLOUL&Q Enterprise.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <button className="rounded-lg bg-blue-600 px-8 py-3 font-semibold transition hover:bg-blue-700 md:px-10 md:py-4">
              تواصل مع المبيعات
            </button>
            <button className="rounded-lg border border-blue-500 px-8 py-3 font-semibold text-blue-400 transition hover:bg-blue-950 md:px-10 md:py-4">
              احجز Demo مجاني
            </button>
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-4 text-center text-4xl font-bold md:text-5xl">مميزات Enterprise</h2>
          <p className="mb-12 text-center text-slate-400">
            جميع الأدوات والدعم التي تحتاجها لتحقيق أهداف عملك
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={index}
                  className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 transition hover:border-blue-600 hover:bg-slate-800"
                >
                  <Icon className="mb-4 h-12 w-12 text-blue-400" />
                  <h3 className="mb-2 text-xl font-semibold">{benefit.title}</h3>
                  <p className="mb-2 text-sm font-medium text-blue-300">{benefit.ar_title}</p>
                  <p className="text-slate-400">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-4 text-center text-4xl font-bold md:text-5xl">حالات الاستخدام</h2>
          <p className="mb-12 text-center text-slate-400">
            حلول مخصصة لكل نوع من أنواع الشركات
          </p>
          <div className="grid gap-8 md:grid-cols-3">
            {useCases.map((useCase, index) => {
              const Icon = useCase.icon;
              return (
                <div key={index} className="rounded-xl border border-slate-800 bg-slate-900/50 p-8">
                  <Icon className="mb-4 h-12 w-12 text-blue-400" />
                  <h3 className="mb-3 text-2xl font-semibold">{useCase.title}</h3>
                  <p className="mb-6 text-slate-400">{useCase.description}</p>
                  <ul className="space-y-3">
                    {useCase.details.map((detail, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Check className="mt-1 h-5 w-5 flex-shrink-0 text-green-400" />
                        <span className="text-slate-300">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-4 text-center text-4xl font-bold md:text-5xl">ابدأ رحلتك مع Enterprise</h2>
          <p className="mb-12 text-center text-slate-400">
            اتصل بفريقنا للحصول على عرض مخصص يناسب احتياجات شركتك
          </p>

          {formStatus === 'success' && (
            <div className="mb-6 rounded-lg border border-green-600 bg-green-950 p-4 text-green-200">
              شكراً لك! سيتواصل معك فريق المبيعات خلال 24 ساعة
            </div>
          )}

          {formStatus === 'error' && (
            <div className="mb-6 rounded-lg border border-red-600 bg-red-950 p-4 text-red-200">
              حدث خطأ في إرسال النموذج. يرجى المحاولة مرة أخرى
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-6 rounded-xl border border-slate-800 bg-slate-900/50 p-8">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  اسم الشركة *
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleFormChange}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 transition focus:border-blue-500 focus:outline-none"
                  placeholder="أدخل اسم الشركة"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  عدد الموظفين *
                </label>
                <select
                  name="employeeCount"
                  value={formData.employeeCount}
                  onChange={handleFormChange}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white transition focus:border-blue-500 focus:outline-none"
                >
                  <option value="">اختر نطاق الموظفين</option>
                  <option value="33-50">33-50</option>
                  <option value="51-100">51-100</option>
                  <option value="101-500">101-500</option>
                  <option value="500+">500+</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  اسم الشخص المسؤول *
                </label>
                <input
                  type="text"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleFormChange}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 transition focus:border-blue-500 focus:outline-none"
                  placeholder="أدخل الاسم الكامل"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  البريد الإلكتروني *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 transition focus:border-blue-500 focus:outline-none"
                  placeholder="example@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  رقم الهاتف (اختياري)
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 transition focus:border-blue-500 focus:outline-none"
                  placeholder="+971 5X XXX XXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  الدولة *
                </label>
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white transition focus:border-blue-500 focus:outline-none"
                >
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                الرسالة (اختياري)
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleFormChange}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 transition focus:border-blue-500 focus:outline-none"
                rows={4}
                placeholder="أخبرنا عن احتياجات شركتك..."
              />
            </div>

            <button
              type="submit"
              disabled={formStatus === 'loading'}
              className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold transition hover:bg-blue-700 disabled:opacity-50"
            >
              {formStatus === 'loading' ? 'جاري الإرسال...' : 'أرسل طلبك'}
            </button>
          </form>
        </div>
      </section>

      {/* Book Demo Section */}
      <section className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-4 text-4xl font-bold md:text-5xl">احجز عرض Demo مجاني</h2>
          <p className="mb-8 text-lg text-slate-400">
            تعرف على كيفية عمل ALLOUL&Q Enterprise مع فريق متخصص. ستغطي الجلسة احتياجات شركتك المحددة والحلول
            المخصصة والتسعير والجدول الزمني للتطبيق.
          </p>
          <button className="rounded-lg bg-blue-600 px-10 py-4 font-semibold transition hover:bg-blue-700 md:px-12 md:py-5">
            احجز الآن
          </button>
          <p className="mt-4 text-sm text-slate-500">
            لا توجد بطاقة ائتمان مطلوبة • جلسة مجانية تماماً لمدة 30 دقيقة
          </p>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-12 text-center text-4xl font-bold md:text-5xl">موثوقية عالمية</h2>

          <div className="mb-16 flex flex-wrap justify-center gap-8">
            <div className="text-center">
              <div className="mb-3 flex justify-center">
                <div className="rounded-lg border border-slate-700 bg-slate-800 px-6 py-4">
                  <span className="font-semibold text-slate-300">SSL</span>
                </div>
              </div>
              <p className="text-slate-400">تشفير SSL</p>
            </div>

            <div className="text-center">
              <div className="mb-3 flex justify-center">
                <div className="rounded-lg border border-slate-700 bg-slate-800 px-6 py-4">
                  <span className="font-semibold text-slate-300">GDPR</span>
                </div>
              </div>
              <p className="text-slate-400">الامتثال GDPR</p>
            </div>

            <div className="text-center">
              <div className="mb-3 flex justify-center">
                <div className="rounded-lg border border-slate-700 bg-slate-800 px-6 py-4">
                  <span className="font-semibold text-slate-300">SOC 2</span>
                </div>
              </div>
              <p className="text-slate-400">شهادة SOC 2</p>
            </div>
          </div>

          <div className="rounded-xl border border-blue-600/30 bg-blue-900/20 p-8 text-center">
            <p className="mb-2 text-3xl font-bold text-blue-300">500+</p>
            <p className="text-lg text-slate-300">شركة عملاقة تثق بـ ALLOUL&Q</p>
          </div>

          <div className="mt-12">
            <p className="mb-6 text-center text-slate-400">شركاؤنا الموثوقون</p>
            <div className="grid gap-6 md:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900/50 py-8"
                >
                  <span className="text-slate-600">شركة {i}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-4 text-center text-4xl font-bold md:text-5xl">الأسئلة الشائعة</h2>
          <p className="mb-12 text-center text-slate-400">
            إجابات على أسئلة عملائنا الكبار
          </p>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="rounded-lg border border-slate-800 bg-slate-900/50">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="flex w-full items-center justify-between p-6 transition hover:bg-slate-800"
                >
                  <span className="text-right text-lg font-semibold">{faq.question}</span>
                  <ChevronDown
                    className={`h-5 w-5 transition ${expandedFaq === index ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandedFaq === index && (
                  <div className="border-t border-slate-700 px-6 py-4">
                    <p className="text-slate-400">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-16 md:py-24">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 to-slate-900 px-6 py-16 md:px-12 md:py-24">
          <div className="absolute inset-0 opacity-20" />
          <div className="relative text-center">
            <h2 className="mb-4 text-4xl font-bold md:text-5xl">
              هل أنت مستعد لتحويل عملك؟
            </h2>
            <p className="mb-8 text-lg text-slate-300">
              دع فريق المبيعات لدينا تساعدك في العثور على الحل المثالي
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <button className="rounded-lg bg-white px-8 py-3 font-semibold text-slate-900 transition hover:bg-slate-100 md:px-10 md:py-4">
                تواصل مع المبيعات
              </button>
              <button className="rounded-lg border border-white px-8 py-3 font-semibold text-white transition hover:bg-white/10 md:px-10 md:py-4">
                احجز Demo مجاني
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Contact Info */}
      <section className="border-t border-slate-800 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center md:text-right">
              <Mail className="mb-3 inline-block h-6 w-6 text-blue-400 md:ml-3" />
              <h3 className="mb-2 font-semibold">البريد الإلكتروني</h3>
              <p className="text-slate-400">enterprise@alloul.app</p>
            </div>
            <div className="text-center md:text-right">
              <Phone className="mb-3 inline-block h-6 w-6 text-blue-400 md:ml-3" />
              <h3 className="mb-2 font-semibold">الهاتف</h3>
              <p className="text-slate-400">+971 4 XXX XXXX</p>
            </div>
            <div className="text-center md:text-right">
              <MapPin className="mb-3 inline-block h-6 w-6 text-blue-400 md:ml-3" />
              <h3 className="mb-2 font-semibold">الموقع</h3>
              <p className="text-slate-400">دبي، الإمارات العربية المتحدة</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
