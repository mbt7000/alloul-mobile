import { loadStripe, Stripe } from '@stripe/stripe-js'

let stripePromise: Promise<Stripe | null> | null = null

/**
 * Initialize Stripe
 */
export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

    if (!publishableKey) {
      console.error('Stripe publishable key is not configured')
      return Promise.resolve(null)
    }

    stripePromise = loadStripe(publishableKey)
  }

  return stripePromise
}

/**
 * Redirect to Stripe checkout
 */
export async function redirectToCheckout(sessionId: string): Promise<void> {
  const stripe = await getStripe()

  if (!stripe) {
    throw new Error('Stripe failed to initialize')
  }

  const { error } = await stripe.redirectToCheckout({ sessionId })

  if (error) {
    throw new Error(error.message)
  }
}

/**
 * Confirm payment
 */
export async function confirmPayment(clientSecret: string): Promise<any> {
  const stripe = await getStripe()

  if (!stripe) {
    throw new Error('Stripe failed to initialize')
  }

  const result = await stripe.confirmCardPayment(clientSecret)

  if (result.error) {
    throw new Error(result.error.message)
  }

  return result.paymentIntent
}

/**
 * Handle payment method setup
 */
export async function setupPaymentMethod(clientSecret: string): Promise<any> {
  const stripe = await getStripe()

  if (!stripe) {
    throw new Error('Stripe failed to initialize')
  }

  const result = await stripe.confirmSetupIntent(clientSecret)

  if (result.error) {
    throw new Error(result.error.message)
  }

  return result.setupIntent
}
