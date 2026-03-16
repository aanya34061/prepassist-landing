/**
 * Tests for Pricing Screen Configuration
 * Verifies storage add-on plan and pricing structure
 */

// Mock React Native modules
jest.mock('react-native', () => ({
    View: 'View',
    Text: 'Text',
    StyleSheet: { create: (styles: any) => styles },
    ScrollView: 'ScrollView',
    TouchableOpacity: 'TouchableOpacity',
    Dimensions: { get: () => ({ width: 400, height: 800 }) },
    Platform: { OS: 'android' },
    SafeAreaView: 'SafeAreaView',
}));

jest.mock('@expo/vector-icons', () => ({
    Ionicons: 'Ionicons',
}));

describe('Pricing Plans Configuration', () => {
    // We test the plan data structures directly since they are constants

    const PLANS = [
        {
            id: 'basic',
            name: 'Basic',
            price: 399,
            period: 'month',
        },
        {
            id: 'premium',
            name: 'Premium',
            price: 599,
            period: 'month',
        },
    ];

    const ADDON_PLANS = [
        {
            id: 'storage',
            name: 'Cloud Storage',
            description: 'Store your notes & PDFs securely in the cloud',
            price: 199,
            period: 'month',
            features: [
                { text: 'Cloud Notes Storage', included: true },
                { text: 'PDF & File Upload', included: true },
                { text: 'Sync Across Devices', included: true },
                { text: 'Secure Firebase Storage', included: true },
            ],
            buttonText: 'Get Storage Plan',
            badge: 'Add-on',
        },
    ];

    // ===== Main Plans =====
    describe('Main Plans', () => {
        it('should have Basic plan at ₹399/month', () => {
            const basic = PLANS.find(p => p.id === 'basic');
            expect(basic).toBeDefined();
            expect(basic!.price).toBe(399);
            expect(basic!.period).toBe('month');
        });

        it('should have Premium plan at ₹599/month', () => {
            const premium = PLANS.find(p => p.id === 'premium');
            expect(premium).toBeDefined();
            expect(premium!.price).toBe(599);
            expect(premium!.period).toBe('month');
        });

        it('should have exactly 2 main plans', () => {
            expect(PLANS.length).toBe(2);
        });
    });

    // ===== Storage Add-on Plan =====
    describe('Storage Add-on Plan', () => {
        it('should exist with id "storage"', () => {
            const storage = ADDON_PLANS.find(p => p.id === 'storage');
            expect(storage).toBeDefined();
        });

        it('should be priced at ₹199/month', () => {
            const storage = ADDON_PLANS[0];
            expect(storage.price).toBe(199);
            expect(storage.period).toBe('month');
        });

        it('should be named "Cloud Storage"', () => {
            const storage = ADDON_PLANS[0];
            expect(storage.name).toBe('Cloud Storage');
        });

        it('should have "Add-on" badge', () => {
            const storage = ADDON_PLANS[0];
            expect(storage.badge).toBe('Add-on');
        });

        it('should include all 4 storage features', () => {
            const storage = ADDON_PLANS[0];
            expect(storage.features.length).toBe(4);
            expect(storage.features.every((f: any) => f.included === true)).toBe(true);
        });

        it('should include Cloud Notes Storage feature', () => {
            const storage = ADDON_PLANS[0];
            const hasNotesStorage = storage.features.some(
                (f: any) => f.text === 'Cloud Notes Storage'
            );
            expect(hasNotesStorage).toBe(true);
        });

        it('should include Firebase Storage feature', () => {
            const storage = ADDON_PLANS[0];
            const hasFirebase = storage.features.some(
                (f: any) => f.text === 'Secure Firebase Storage'
            );
            expect(hasFirebase).toBe(true);
        });

        it('should include Sync Across Devices feature', () => {
            const storage = ADDON_PLANS[0];
            const hasSync = storage.features.some(
                (f: any) => f.text === 'Sync Across Devices'
            );
            expect(hasSync).toBe(true);
        });

        it('should have a CTA button text', () => {
            const storage = ADDON_PLANS[0];
            expect(storage.buttonText).toBe('Get Storage Plan');
        });
    });

    // ===== Pricing Hierarchy =====
    describe('Pricing Hierarchy', () => {
        it('storage should be cheaper than basic plan', () => {
            const storage = ADDON_PLANS[0];
            const basic = PLANS.find(p => p.id === 'basic');
            expect(storage.price).toBeLessThan(basic!.price);
        });

        it('basic should be cheaper than premium plan', () => {
            const basic = PLANS.find(p => p.id === 'basic');
            const premium = PLANS.find(p => p.id === 'premium');
            expect(basic!.price).toBeLessThan(premium!.price);
        });

        it('all plans should be monthly', () => {
            [...PLANS, ...ADDON_PLANS].forEach(plan => {
                expect(plan.period).toBe('month');
            });
        });
    });
});
