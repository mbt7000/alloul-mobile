/**
 * API Client for ALLOUL&Q subscription system
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.alloul.app'

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

interface TrialRequest {
  email: string
  companyName: string
  phone: string
}

interface CheckoutSession {
  sessionId: string
  url: string
}

interface SubscriptionStatus {
  status: 'active' | 'canceled' | 'past_due' | 'trial' | 'none'
  plan: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
}

interface UpgradeRequest {
  planId: string
}

interface Invoice {
  id: string
  date: string
  amount: number
  status: 'paid' | 'pending' | 'failed'
  pdfUrl: string
}

interface UsageData {
  apiCalls: number
  apiCallsLimit: number
  storage: number
  storageLimit: number
  usersLimit: number
}

interface EnterpriseContactRequest {
  email: string
  companyName: string
  phone: string
  employees: number
  message: string
}

interface DemoBookingRequest {
  email: string
  name: string
  companyName: string
  phone: string
  preferredTime: string
}

/**
 * Make an API request
 */
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json() as ApiResponse<T>

    if (!data.success) {
      throw new Error(data.error || 'Unknown API error')
    }

    return data.data as T
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error)
    throw error
  }
}

/**
 * Start a free trial
 */
export async function startTrial(data: TrialRequest): Promise<{ trialId: string }> {
  return apiCall('/trials', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckout(planId: string): Promise<CheckoutSession> {
  return apiCall('/checkout', {
    method: 'POST',
    body: JSON.stringify({ planId }),
  })
}

/**
 * Get current subscription status
 */
export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  return apiCall('/subscription/status', {
    method: 'GET',
  })
}

/**
 * Upgrade subscription to a different plan
 */
export async function upgradeSubscription(data: UpgradeRequest): Promise<{
  success: boolean
  newPlan: string
}> {
  return apiCall('/subscription/upgrade', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(): Promise<{
  success: boolean
  canceledAt: string
}> {
  return apiCall('/subscription/cancel', {
    method: 'POST',
  })
}

/**
 * Get list of invoices
 */
export async function getInvoices(): Promise<Invoice[]> {
  return apiCall('/invoices', {
    method: 'GET',
  })
}

/**
 * Get usage data for current subscription
 */
export async function getUsage(): Promise<UsageData> {
  return apiCall('/usage', {
    method: 'GET',
  })
}

/**
 * Submit enterprise contact request
 */
export async function submitEnterpriseContact(
  data: EnterpriseContactRequest
): Promise<{ contactId: string; message: string }> {
  return apiCall('/contact/enterprise', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Book a demo call
 */
export async function bookDemo(data: DemoBookingRequest): Promise<{
  bookingId: string
  confirmationEmail: string
}> {
  return apiCall('/demo/book', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Get all available plans
 */
export async function getPlans(): Promise<
  Array<{
    id: string
    name: string
    price: number
    billingInterval: 'month' | 'year'
    features: string[]
    description: string
  }>
> {
  return apiCall('/plans', {
    method: 'GET',
  })
}

/**
 * Verify payment status
 */
export async function verifyPayment(sessionId: string): Promise<{
  status: 'succeeded' | 'processing' | 'failed'
  paymentIntentId: string
}> {
  return apiCall(`/payment/verify/${sessionId}`, {
    method: 'GET',
  })
}

/**
 * Get coupon/discount details
 */
export async function validateCoupon(code: string): Promise<{
  valid: boolean
  discountPercent?: number
  discountAmount?: number
  expiresAt?: string
}> {
  return apiCall(`/coupons/validate/${code}`, {
    method: 'GET',
  })
}
