/**
 * Tests for Dodo Payments Service
 * Verifies storage subscription plan, plan types, and payment URL generation
 */

// Mock fetch globally
global.fetch = jest.fn();

// Mock the environment variable
process.env.EXPO_PUBLIC_DODO_API_KEY = 'test-api-key';

import {
    DODO_CONFIG,
    getSubscriptionPaymentUrl,
    getCreditPurchaseUrl,
} from '../services/dodoPaymentsService';

describe('DodoPaymentsService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ===== DODO_CONFIG Tests =====
    describe('DODO_CONFIG', () => {
        it('should have STORAGE_PLAN product defined', () => {
            expect(DODO_CONFIG.PRODUCTS.STORAGE_PLAN).toBeDefined();
            expect(typeof DODO_CONFIG.PRODUCTS.STORAGE_PLAN).toBe('string');
            expect(DODO_CONFIG.PRODUCTS.STORAGE_PLAN.length).toBeGreaterThan(0);
        });

        it('should have all required product IDs', () => {
            expect(DODO_CONFIG.PRODUCTS).toHaveProperty('BASIC_PLAN');
            expect(DODO_CONFIG.PRODUCTS).toHaveProperty('PRO_PLAN');
            expect(DODO_CONFIG.PRODUCTS).toHaveProperty('STORAGE_PLAN');
            expect(DODO_CONFIG.PRODUCTS).toHaveProperty('CREDITS_50');
            expect(DODO_CONFIG.PRODUCTS).toHaveProperty('CREDITS_120');
            expect(DODO_CONFIG.PRODUCTS).toHaveProperty('CREDITS_300');
        });

        it('should use live API URL', () => {
            expect(DODO_CONFIG.API_URL).toBe('https://live.dodopayments.com');
        });

        it('should have meter ID configured', () => {
            expect(DODO_CONFIG.METER_ID).toBeDefined();
            expect(DODO_CONFIG.METER_ID.startsWith('mtr_')).toBe(true);
        });
    });

    // ===== Subscription Payment URL Tests =====
    describe('getSubscriptionPaymentUrl', () => {
        const testEmail = 'test@example.com';
        const testReturnUrl = 'https://app.example.com/callback';

        it('should generate URL for basic plan', () => {
            const url = getSubscriptionPaymentUrl('basic', testEmail, testReturnUrl);
            expect(url).toContain(DODO_CONFIG.PRODUCTS.BASIC_PLAN);
            expect(url).toContain('checkout.dodopayments.com');
            expect(url).toContain(encodeURIComponent(testEmail));
        });

        it('should generate URL for pro plan', () => {
            const url = getSubscriptionPaymentUrl('pro', testEmail, testReturnUrl);
            expect(url).toContain(DODO_CONFIG.PRODUCTS.PRO_PLAN);
            expect(url).toContain('checkout.dodopayments.com');
        });

        it('should generate URL for storage plan', () => {
            const url = getSubscriptionPaymentUrl('storage', testEmail, testReturnUrl);
            expect(url).toContain(DODO_CONFIG.PRODUCTS.STORAGE_PLAN);
            expect(url).toContain('checkout.dodopayments.com');
            expect(url).toContain(encodeURIComponent(testEmail));
        });

        it('should include redirect URL in all plan types', () => {
            const plans: Array<'basic' | 'pro' | 'storage'> = ['basic', 'pro', 'storage'];
            plans.forEach(plan => {
                const url = getSubscriptionPaymentUrl(plan, testEmail, testReturnUrl);
                expect(url).toContain(encodeURIComponent(testReturnUrl));
            });
        });

        it('should use different product IDs for each plan', () => {
            const basicUrl = getSubscriptionPaymentUrl('basic', testEmail, testReturnUrl);
            const proUrl = getSubscriptionPaymentUrl('pro', testEmail, testReturnUrl);
            const storageUrl = getSubscriptionPaymentUrl('storage', testEmail, testReturnUrl);

            expect(basicUrl).not.toEqual(proUrl);
            expect(basicUrl).not.toEqual(storageUrl);
            expect(proUrl).not.toEqual(storageUrl);
        });
    });

    // ===== Credit Purchase URL Tests =====
    describe('getCreditPurchaseUrl', () => {
        const testEmail = 'test@example.com';
        const testReturnUrl = 'https://app.example.com/callback';

        it('should generate URL for 50 credits', () => {
            const url = getCreditPurchaseUrl(50, testEmail, testReturnUrl);
            expect(url).toContain(DODO_CONFIG.PRODUCTS.CREDITS_50);
        });

        it('should generate URL for 120 credits', () => {
            const url = getCreditPurchaseUrl(120, testEmail, testReturnUrl);
            expect(url).toContain(DODO_CONFIG.PRODUCTS.CREDITS_120);
        });

        it('should generate URL for 300 credits', () => {
            const url = getCreditPurchaseUrl(300, testEmail, testReturnUrl);
            expect(url).toContain(DODO_CONFIG.PRODUCTS.CREDITS_300);
        });
    });
});
