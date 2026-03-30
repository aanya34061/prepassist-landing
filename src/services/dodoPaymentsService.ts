/**
 * DODO PAYMENTS SERVICE
 * 
 * Integration with DodoPayments for subscription and credit billing
 * Uses meter-based billing for AI credit consumption
 * 
 * API Endpoints:
 * - Test: https://test.dodopayments.com
 * - Live: https://live.dodopayments.com
 */

// ===================== CONFIGURATION =====================
const DODO_CONFIG = {
    // LIVE MODE - Production Environment
    API_URL: 'https://live.dodopayments.com',

    // LIVE Product IDs from DodoPayments
    PRODUCTS: {
        BASIC_PLAN: 'pdt_0NWfLOSWmnFywSwZldAHa',    // ₹399/month - 200 credits
        PRO_PLAN: 'pdt_0NWfLU5OfjnVhmPz86wWZ',      // ₹699/month - 400 credits
        STORAGE_PLAN: 'pdt_0NaAamwV8NdMAXe0v2yBx',     // ₹199/month - Firebase notes storage
        CREDITS_50: 'pdt_0NWfLXQfz6P34vDNgGT6J',    // ₹99 - 50 credits
        CREDITS_120: 'pdt_0NWfLZHVYcwnA37B60iio',   // ₹199 - 120 credits
        CREDITS_300: 'pdt_0NWfLbT49dqQm9bNqVVjS',   // ₹399 - 300 credits
        CREDITS_750: 'pdt_0NWfNy0Q3SrufzdKZlE2G',   // ₹599 - 750 credits
        CREDITS_1200: 'pdt_0NWfO0TYn9murkxJ3FWbC',  // ₹999 - 1200 credits
        CREDITS_1999: 'pdt_0NWfO2IA7c8uoxbXKPkFP',  // ₹1499 - 1999 credits
        TEST_5_RUPEES: 'pdt_0NXVmuekVgYecsGGsW7li', // ₹5 - 10 test credits
    },

    // Business ID
    BUSINESS_ID: 'bus_0NWdKs3BLzg0nKRSCQD1L',

    // LIVE Meter ID for tracking AI credit usage
    METER_ID: 'mtr_0NWfLo4DtyRDX8xVbDVhe',

    // Event name for credit consumption
    EVENT_NAME: 'ai.credit.used',
};

// ===================== API HELPER =====================
async function dodoFetch(
    endpoint: string,
    options: RequestInit = {}
): Promise<any> {
    const apiKey = process.env.EXPO_PUBLIC_DODO_API_KEY || '';

    if (!apiKey) {
        throw new Error('DodoPayments API key not configured');
    }

    const response = await fetch(`${DODO_CONFIG.API_URL}${endpoint}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `DodoPayments API error: ${response.status}`);
    }

    return response.json();
}

// ===================== WEBHOOK HANDLERS =====================

/**
 * Handle DodoPayments webhook events
 * Call this from your webhook endpoint
 */
export function handleWebhook(
    event: { type: string; data: any }
): { action: string; data: any } {
    switch (event.type) {
        case 'subscription.created':
            return {
                action: 'provision_subscription',
                data: {
                    customerId: event.data.customer_id,
                    subscriptionId: event.data.subscription_id,
                    planType: event.data.metadata?.plan_type,
                    credits: event.data.metadata?.plan_type === 'pro' ? 400 : 200,
                },
            };

        case 'subscription.renewed':
            return {
                action: 'renew_credits',
                data: {
                    customerId: event.data.customer_id,
                    credits: event.data.metadata?.plan_type === 'pro' ? 400 : 200,
                },
            };

        case 'subscription.cancelled':
            return {
                action: 'cancel_subscription',
                data: {
                    customerId: event.data.customer_id,
                    subscriptionId: event.data.subscription_id,
                },
            };

        case 'payment.completed':
            if (event.data.metadata?.type === 'credit_purchase') {
                return {
                    action: 'add_credits',
                    data: {
                        customerId: event.data.customer_id,
                        credits: event.data.metadata.credits_amount,
                        paymentId: event.data.payment_id,
                    },
                };
            }
            return { action: 'none', data: {} };

        default:
            return { action: 'none', data: {} };
    }
}

// ===================== DIRECT PAYMENT LINK =====================

/**
 * Get direct payment link URL for subscription
 * Uses DodoPayments checkout page with product ID
 */
export function getSubscriptionPaymentUrl(
    planType: 'basic' | 'pro' | 'storage',
    email: string,
    returnUrl: string
): string {
    const productId = planType === 'pro'
        ? DODO_CONFIG.PRODUCTS.PRO_PLAN
        : planType === 'storage'
        ? DODO_CONFIG.PRODUCTS.STORAGE_PLAN
        : DODO_CONFIG.PRODUCTS.BASIC_PLAN;

    // DodoPayments checkout URL format
    const baseUrl = 'https://checkout.dodopayments.com/buy';
    const params = new URLSearchParams({
        product_id: productId,
        email: email,
        redirect_url: returnUrl,
        quantity: '1',
    });

    return `${baseUrl}/${productId}?${params.toString()}`;
}

/**
 * Get direct payment link URL for credit purchase
 */
export function getCreditPurchaseUrl(
    credits: 50 | 120 | 300,
    email: string,
    returnUrl: string
): string {
    const productMap = {
        50: DODO_CONFIG.PRODUCTS.CREDITS_50,
        120: DODO_CONFIG.PRODUCTS.CREDITS_120,
        300: DODO_CONFIG.PRODUCTS.CREDITS_300,
    };

    const productId = productMap[credits];
    const baseUrl = 'https://checkout.dodopayments.com/buy';
    const params = new URLSearchParams({
        product_id: productId,
        email: email,
        redirect_url: returnUrl,
        quantity: '1',
    });

    return `${baseUrl}/${productId}?${params.toString()}`;
}

/**
 * Get checkout URL for any product by its ID
 */
export function getCheckoutUrl(productId: string): string {
    return `https://checkout.dodopayments.com/buy/${productId}`;
}

export { DODO_CONFIG };
