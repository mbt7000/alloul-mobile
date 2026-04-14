# ALLOUL&Q Web Frontend

A modern, subscription-based SaaS platform frontend built with Next.js 14, TypeScript, Tailwind CSS, and integrated with Stripe for payment processing.

## Project Description

ALLOUL&Q is a comprehensive subscription management system that enables businesses to manage recurring billing, user tiers, and payment processing. The web frontend provides:

- **Admin Dashboard**: Real-time subscription analytics, revenue tracking, and customer management
- **User Portal**: Subscription management, plan upgrades/downgrades, and billing history
- **Authentication**: Secure user registration and login with OAuth support
- **Payment Integration**: Seamless Stripe integration for subscription processing
- **Analytics**: Comprehensive KPI tracking, revenue charts, trial analytics, and churn metrics
- **RTL Support**: Full right-to-left (RTL) Arabic language support
- **Dark Mode**: Professional dark theme throughout the application

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v3+
- **Icons**: Lucide React
- **Payment Processing**: Stripe (API)
- **Authentication**: NextAuth.js or OAuth providers
- **Database ORM**: Prisma (optional, for future implementation)
- **HTTP Client**: Axios or Fetch API
- **State Management**: React Context or Zustand (optional)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Stripe account with API keys
- Environment variables configured

### Installation

```bash
# Clone the repository
git clone https://github.com/alloulq/web.git
cd web

# Install dependencies
npm install
# or
yarn install
# or
pnpm install
```

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# API
NEXT_PUBLIC_API_URL=http://localhost:3000
API_SECRET_KEY=your_api_secret_key

# Authentication
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Database (optional)
DATABASE_URL=postgresql://user:password@localhost:5432/alloulq
```

### Running Locally

```bash
# Development server
npm run dev
# Runs on http://localhost:3000

# Production build
npm run build
npm run start

# Linting
npm run lint

# Type checking
npm run type-check
```

## Project Structure

```
web/
├── public/                          # Static assets
│   ├── icons/
│   ├── images/
│   └── logos/
├── src/
│   ├── app/                        # Next.js 14 App Router
│   │   ├── (auth)/                 # Authentication routes
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   └── forgot-password/
│   │   ├── (dashboard)/            # Protected routes
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx            # Home/Overview
│   │   │   └── settings/
│   │   ├── admin/                  # Admin panel
│   │   │   ├── dashboard/
│   │   │   ├── subscriptions/
│   │   │   ├── customers/
│   │   │   ├── billing/
│   │   │   └── reports/
│   │   ├── api/                    # API routes
│   │   │   ├── auth/
│   │   │   ├── subscriptions/
│   │   │   ├── webhooks/
│   │   │   ├── stripe/
│   │   │   └── users/
│   │   ├── layout.tsx              # Root layout
│   │   └── page.tsx                # Home page
│   ├── components/                 # Reusable components
│   │   ├── ui/                     # Base UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── ...
│   │   ├── forms/                  # Form components
│   │   │   ├── LoginForm.tsx
│   │   │   ├── SignupForm.tsx
│   │   │   └── ...
│   │   ├── dashboard/              # Dashboard components
│   │   │   ├── KPICard.tsx
│   │   │   ├── RevenueChart.tsx
│   │   │   ├── SubscriptionTable.tsx
│   │   │   └── ...
│   │   ├── layout/                 # Layout components
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   └── common/                 # Shared components
│   │       ├── Loading.tsx
│   │       ├── ErrorBoundary.tsx
│   │       └── ...
│   ├── hooks/                      # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useSubscription.ts
│   │   └── ...
│   ├── lib/                        # Utility functions
│   │   ├── api.ts
│   │   ├── stripe.ts
│   │   ├── auth.ts
│   │   ├── utils.ts
│   │   └── constants.ts
│   ├── types/                      # TypeScript type definitions
│   │   ├── user.ts
│   │   ├── subscription.ts
│   │   ├── billing.ts
│   │   └── api.ts
│   ├── styles/                     # Global styles
│   │   ├── globals.css
│   │   └── variables.css
│   ├── context/                    # React Context
│   │   ├── AuthContext.tsx
│   │   ├── ThemeContext.tsx
│   │   └── ...
│   └── config/                     # Configuration files
│       ├── navigation.ts
│       └── stripe.ts
├── .env.local                      # Environment variables (not committed)
├── .env.example                    # Environment variables template
├── .gitignore
├── next.config.js                  # Next.js configuration
├── tailwind.config.ts              # Tailwind configuration
├── tsconfig.json                   # TypeScript configuration
├── package.json
├── package-lock.json
└── README.md
```

## Pages and Routes

### Public Routes

- `/` - Landing page with pricing
- `/login` - User login page
- `/signup` - User registration page
- `/forgot-password` - Password reset flow
- `/pricing` - Pricing plans page

### Protected User Routes

- `/dashboard` - User dashboard overview
- `/dashboard/subscriptions` - Manage subscriptions
- `/dashboard/billing` - Billing and invoice history
- `/dashboard/settings` - Account settings
- `/dashboard/usage` - Usage analytics

### Admin Routes (Protected)

- `/admin/dashboard` - Admin overview
- `/admin/subscriptions` - Subscription analytics and management
- `/admin/customers` - Customer list and management
- `/admin/billing` - Billing reports and reconciliation
- `/admin/reports` - Custom reports and exports
- `/admin/settings` - System configuration

## API Integration Notes

### Base URL

The API base URL is configured in `NEXT_PUBLIC_API_URL` environment variable.

### Authentication

All API requests (except auth endpoints) include:

```typescript
Authorization: Bearer {token}
Content-Type: application/json
```

### Key API Endpoints

```
POST   /api/auth/login              - User login
POST   /api/auth/signup             - User registration
POST   /api/auth/refresh            - Refresh access token
GET    /api/subscriptions           - List user subscriptions
POST   /api/subscriptions           - Create subscription
PUT    /api/subscriptions/:id       - Update subscription
DELETE /api/subscriptions/:id       - Cancel subscription
GET    /api/invoices                - Get user invoices
GET    /api/admin/analytics         - Admin analytics data
POST   /api/stripe/webhook          - Stripe webhook handler
```

### Stripe Integration

The application integrates with Stripe for:

- **Subscription Management**: Create, update, and cancel subscriptions
- **Payment Processing**: Handle one-time and recurring payments
- **Webhook Handling**: Process Stripe events (payment_intent.succeeded, customer.subscription.updated, etc.)
- **Invoice Management**: Generate and retrieve invoices

**Webhook Events Handled:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.created`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `charge.refunded`

### Error Handling

All API responses follow a standard format:

```typescript
// Success
{
  success: true,
  data: { ... }
}

// Error
{
  success: false,
  error: {
    code: "ERROR_CODE",
    message: "Human-readable message",
    details: { ... }
  }
}
```

## Styling & Dark Mode

The application uses Tailwind CSS with:

- **Dark Mode**: `dark:` prefix classes (default dark theme)
- **Custom Colors**: Defined in `tailwind.config.ts`
- **Responsive Design**: Mobile-first approach
- **Typography**: Professional sans-serif fonts

### Color Palette

- **Primary**: Blue (`#3B82F6`)
- **Success**: Green (`#10B981`)
- **Warning**: Yellow (`#F59E0B`)
- **Error**: Red (`#EF4444`)
- **Background**: Slate (`#0F172A`)
- **Text**: White/Slate shades

## RTL Support

The application fully supports Arabic (RTL) with:

- `dir="rtl"` attributes on root elements
- RTL-aware Tailwind utilities (e.g., `ml-4` → `mr-4` in RTL)
- Proper text and icon alignment
- RTL-specific form input handling

## Authentication

### NextAuth.js Setup

The application uses NextAuth.js for authentication:

1. **Credentials Provider**: Email/password authentication
2. **OAuth Providers**: Google, GitHub (optional)
3. **JWT Sessions**: Token-based authentication

Session management includes:
- Access token (short-lived)
- Refresh token (long-lived)
- User profile data

## Performance Optimization

- **Image Optimization**: Next.js Image component for lazy loading
- **Code Splitting**: Automatic route-based code splitting
- **Caching**: Strategic API response caching
- **Compression**: Gzip compression for assets
- **Minification**: Production build optimization

## Testing

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests (if configured)
npm run test:e2e

# Coverage report
npm run test:coverage
```

## Deployment

### Vercel Deployment

The easiest way to deploy is using Vercel:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

### Manual Deployment

```bash
# Build production bundle
npm run build

# Set environment variables on your hosting platform
# Deploy the .next folder and public directory
```

### Environment Variables for Production

Ensure all environment variables are set on your hosting platform:

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (production domain)
- `DATABASE_URL` (if using database)
- Other API secrets

### Health Checks

Once deployed, verify:

1. Check `/api/health` endpoint
2. Verify Stripe webhook connectivity
3. Test authentication flow (login/signup)
4. Confirm database connectivity

## Security Considerations

- **HTTPS Only**: All communication over HTTPS in production
- **CSRF Protection**: Built-in with Next.js
- **XSS Prevention**: React's default escaping + Content Security Policy
- **SQL Injection**: Using parameterized queries (Prisma)
- **Rate Limiting**: Implement API rate limiting
- **Secrets**: Never commit `.env.local` or secret keys
- **API Keys**: Rotate Stripe keys regularly
- **Authentication**: Secure token storage and refresh logic

## Common Tasks

### Adding a New Page

```typescript
// src/app/(dashboard)/new-page/page.tsx
export default function NewPage() {
  return <div>New Page Content</div>;
}
```

### Creating a Component

```typescript
// src/components/ui/MyComponent.tsx
interface MyComponentProps {
  title: string;
  children?: React.ReactNode;
}

export function MyComponent({ title, children }: MyComponentProps) {
  return (
    <div className="bg-slate-800 rounded-lg p-6">
      <h2 className="text-xl font-bold">{title}</h2>
      {children}
    </div>
  );
}
```

### Using Hooks

```typescript
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';

export function MyComponent() {
  const { user, logout } = useAuth();
  const { subscription, loading } = useSubscription();

  return (
    <div>
      Welcome, {user?.name}
      {subscription && <p>Plan: {subscription.plan}</p>}
    </div>
  );
}
```

## Troubleshooting

### Port 3000 Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or run on different port
npm run dev -- -p 3001
```

### TypeScript Errors

```bash
# Regenerate types
npm run type-check

# Clear Next.js cache
rm -rf .next
npm run dev
```

### Stripe Integration Issues

1. Verify API keys in `.env.local`
2. Check webhook secret configuration
3. Ensure Stripe account is in test mode for development
4. Review Stripe dashboard for failed events

## Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit changes (`git commit -m 'Add amazing feature'`)
3. Push to branch (`git push origin feature/amazing-feature`)
4. Open Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:

- GitHub Issues: [Project Issues](https://github.com/alloulq/web/issues)
- Documentation: [Docs](https://docs.alloulq.com)
- Email: support@alloulq.com

## Changelog

### v1.0.0 (Initial Release)

- Initial Next.js 14 setup
- Authentication system
- Subscription management
- Admin analytics dashboard
- Stripe integration
- RTL/Arabic support
- Dark mode theme
