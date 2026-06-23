import { getStripe } from "./stripeClient.js";

/** Fallback display amount when Stripe price is unavailable (PDFs, etc.). */
export const REGISTRATION_FEE_USD = 250;
export const REGISTRATION_FEE_CENTS = REGISTRATION_FEE_USD * 100;

let cachedStripePrice = null;

export function getStripeRegistrationFeeProductId() {
  return process.env.STRIPE_REGISTRATION_FEE_PRODUCT_ID || null;
}

export function getStripeRegistrationFeePriceId() {
  return process.env.STRIPE_REGISTRATION_FEE_PRICE_ID || null;
}

/**
 * Resolves the Stripe Price used for MIRI registration fee checkout.
 * Prefers STRIPE_REGISTRATION_FEE_PRICE_ID; otherwise loads the first active
 * price for STRIPE_REGISTRATION_FEE_PRODUCT_ID.
 */
export async function getRegistrationFeeStripePrice(stripe = null) {
  const client = stripe || getStripe();
  const priceId = getStripeRegistrationFeePriceId();

  if (priceId) {
    if (!cachedStripePrice || cachedStripePrice.id !== priceId) {
      cachedStripePrice = await client.prices.retrieve(priceId);
    }
    return cachedStripePrice;
  }

  const productId = getStripeRegistrationFeeProductId();
  if (!productId) {
    return null;
  }

  if (!cachedStripePrice || cachedStripePrice.product !== productId) {
    const prices = await client.prices.list({
      product: productId,
      active: true,
      limit: 1,
    });
    if (!prices.data.length) {
      throw new Error(`No active price found for Stripe product ${productId}`);
    }
    cachedStripePrice = prices.data[0];
  }

  return cachedStripePrice;
}

export async function getRegistrationFeeAmountUsd(stripe = null) {
  try {
    const price = await getRegistrationFeeStripePrice(stripe);
    if (price?.unit_amount != null) {
      return price.unit_amount / 100;
    }
  } catch (error) {
    console.warn("Could not load registration fee from Stripe, using fallback:", error.message);
  }
  return REGISTRATION_FEE_USD;
}

export async function getRegistrationFeeCheckoutLineItem(stripe = null) {
  const price = await getRegistrationFeeStripePrice(stripe);
  if (price) {
    return { price: price.id, quantity: 1 };
  }

  return {
    price_data: {
      currency: "usd",
      product_data: {
        name: "MIRI Program Registration Fee",
        description: "One-time program registration fee (non-refundable)",
      },
      unit_amount: REGISTRATION_FEE_CENTS,
    },
    quantity: 1,
  };
}

/**
 * True when the applicant has paid the registration fee, or was already in the
 * invoice flow before Stripe was introduced (grandfathered).
 */
export function isRegistrationFeePaid(application) {
  if (!application) return false;
  if (application.registrationFeeStatus === "paid") return true;
  if (application.invoiceStatus === "pending" || application.invoiceStatus === "approved") {
    return true;
  }
  return false;
}
