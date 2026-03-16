/**
 * TEST CASE: Payment Gateway Integration for Notes Storage
 *
 * Tests the end-to-end flow of the ₹199 storage subscription
 * that gates Firebase note storage via Dodo Payments.
 *
 * Flow under test:
 *   1. User creates/edits a note
 *   2. Note saves locally (always free)
 *   3. Firebase cloud sync requires active "storage" subscription
 *   4. If no subscription → show paywall → redirect to Billing
 *   5. User purchases ₹199 storage plan via Dodo Payments
 *   6. Webhook confirms payment → subscription activated in Supabase
 *   7. Firebase sync unlocked → notes sync to cloud
 */

// ================== MOCKS ==================

// Mock Supabase
const mockSupabase = {
    auth: {
        getUser: jest.fn(),
    },
    from: jest.fn(),
    rpc: jest.fn(),
    channel: jest.fn(() => ({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
    })),
};

jest.mock('../lib/supabase', () => ({
    supabase: mockSupabase,
}));

// Mock Firebase
jest.mock('../config/firebase', () => ({
    db: {},
    storage: {},
}));

jest.mock('firebase/firestore', () => ({
    doc: jest.fn(),
    setDoc: jest.fn(),
    deleteDoc: jest.fn(),
    collection: jest.fn(),
    getDocs: jest.fn(),
    serverTimestamp: jest.fn(() => 'mock-timestamp'),
}));

jest.mock('../services/firebaseStorageService', () => ({
    uploadNoteFileBlocks: jest.fn((_userId, _noteId, blocks) => blocks),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock environment
process.env.EXPO_PUBLIC_DODO_API_KEY = 'test-dodo-key';

// ================== IMPORTS ==================

import { DODO_CONFIG, getSubscriptionPaymentUrl, handleWebhook } from '../services/dodoPaymentsService';
import { syncNoteToFirebase, deleteNoteFromFirebase, fetchNotesFromFirebase } from '../services/firebaseNotesSync';
import { CREDIT_COSTS } from '../services/billingService';
import { setDoc, doc, getDocs, deleteDoc } from 'firebase/firestore';

// ================== TEST SUITES ==================

describe('Notes Storage Payment Gateway', () => {

    const TEST_USER = {
        id: 'user-123',
        email: 'aspirant@example.com',
        name: 'Test Aspirant',
    };

    const TEST_NOTE = {
        id: 1,
        title: 'Indian Polity Notes',
        content: 'Article 370 was a temporary provision...',
        blocks: [{ id: '1', type: 'paragraph', content: 'Article 370 notes' }],
        tags: ['Polity', 'GS2'],
        sourceType: 'manual',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: TEST_USER },
        });
    });

    // =========================================================
    // 1. STORAGE PLAN CONFIGURATION
    // =========================================================
    describe('1. Storage Plan Configuration', () => {

        it('should have storage plan product ID in Dodo config', () => {
            expect(DODO_CONFIG.PRODUCTS.STORAGE_PLAN).toBeDefined();
            expect(typeof DODO_CONFIG.PRODUCTS.STORAGE_PLAN).toBe('string');
        });

        it('storage plan should be distinct from basic and pro plans', () => {
            expect(DODO_CONFIG.PRODUCTS.STORAGE_PLAN).not.toBe(DODO_CONFIG.PRODUCTS.BASIC_PLAN);
            expect(DODO_CONFIG.PRODUCTS.STORAGE_PLAN).not.toBe(DODO_CONFIG.PRODUCTS.PRO_PLAN);
        });

        it('should generate a valid Dodo checkout URL for storage plan', () => {
            const url = getSubscriptionPaymentUrl('storage', TEST_USER.email, 'upscprep://billing/success');

            expect(url).toContain('checkout.dodopayments.com');
            expect(url).toContain(DODO_CONFIG.PRODUCTS.STORAGE_PLAN);
            expect(url).toContain(encodeURIComponent(TEST_USER.email));
            expect(url).toContain(encodeURIComponent('upscprep://billing/success'));
        });

        it('storage checkout URL should have quantity=1', () => {
            const url = getSubscriptionPaymentUrl('storage', TEST_USER.email, 'https://callback.url');
            expect(url).toContain('quantity=1');
        });
    });

    // =========================================================
    // 2. FIREBASE NOTE SYNC (current behavior - no gate)
    // =========================================================
    describe('2. Firebase Note Sync', () => {

        it('should sync a note to Firebase when userId and note are valid', async () => {
            (setDoc as jest.Mock).mockResolvedValue(undefined);
            (doc as jest.Mock).mockReturnValue('mock-doc-ref');

            await syncNoteToFirebase(TEST_USER.id, TEST_NOTE);

            expect(doc).toHaveBeenCalledWith(
                expect.anything(), // db
                'userNotes',
                TEST_USER.id,
                'notes',
                String(TEST_NOTE.id),
            );
            expect(setDoc).toHaveBeenCalledWith(
                'mock-doc-ref',
                expect.objectContaining({
                    title: 'Indian Polity Notes',
                    lastSynced: 'mock-timestamp',
                }),
                { merge: true },
            );
        });

        it('should NOT sync when userId is missing', async () => {
            await syncNoteToFirebase(null, TEST_NOTE);
            expect(setDoc).not.toHaveBeenCalled();
        });

        it('should NOT sync when note is missing', async () => {
            await syncNoteToFirebase(TEST_USER.id, null);
            expect(setDoc).not.toHaveBeenCalled();
        });

        it('should NOT sync when note has no id', async () => {
            await syncNoteToFirebase(TEST_USER.id, { title: 'No ID note' });
            expect(setDoc).not.toHaveBeenCalled();
        });

        it('should handle Firebase sync failure gracefully (offline)', async () => {
            (doc as jest.Mock).mockReturnValue('mock-doc-ref');
            (setDoc as jest.Mock).mockRejectedValue(new Error('Network error'));

            // Should NOT throw
            await syncNoteToFirebase(TEST_USER.id, TEST_NOTE);
            expect(setDoc).toHaveBeenCalled();
        });

        it('should delete a note from Firebase', async () => {
            (doc as jest.Mock).mockReturnValue('mock-doc-ref');
            (deleteDoc as jest.Mock).mockResolvedValue(undefined);

            await deleteNoteFromFirebase(TEST_USER.id, TEST_NOTE.id);

            expect(deleteDoc).toHaveBeenCalledWith('mock-doc-ref');
        });

        it('should fetch all notes from Firebase', async () => {
            const mockNotes = [
                { data: () => ({ id: 1, title: 'Note 1', lastSynced: 'ts' }) },
                { data: () => ({ id: 2, title: 'Note 2', lastSynced: 'ts' }) },
            ];
            (getDocs as jest.Mock).mockResolvedValue({
                forEach: (cb: any) => mockNotes.forEach(cb),
            });

            const notes = await fetchNotesFromFirebase(TEST_USER.id);

            expect(notes.length).toBe(2);
            expect(notes[0].title).toBe('Note 1');
            // lastSynced should be stripped
            expect(notes[0]).not.toHaveProperty('lastSynced');
        });

        it('should return empty array when userId is null', async () => {
            const notes = await fetchNotesFromFirebase(null);
            expect(notes).toEqual([]);
        });
    });

    // =========================================================
    // 3. DODO PAYMENTS WEBHOOK HANDLING
    // =========================================================
    describe('3. Payment Webhook Handling', () => {

        it('should handle subscription.created for storage plan', () => {
            const event = {
                type: 'subscription.created',
                data: {
                    customer_id: 'cust-123',
                    subscription_id: 'sub-456',
                    metadata: { plan_type: 'storage' },
                },
            };

            const result = handleWebhook(event);

            expect(result.action).toBe('provision_subscription');
            expect(result.data.customerId).toBe('cust-123');
            expect(result.data.subscriptionId).toBe('sub-456');
            expect(result.data.planType).toBe('storage');
        });

        it('should handle subscription.renewed event', () => {
            const event = {
                type: 'subscription.renewed',
                data: {
                    customer_id: 'cust-123',
                    metadata: { plan_type: 'storage' },
                },
            };

            const result = handleWebhook(event);

            expect(result.action).toBe('renew_credits');
            expect(result.data.customerId).toBe('cust-123');
        });

        it('should handle subscription.cancelled event', () => {
            const event = {
                type: 'subscription.cancelled',
                data: {
                    customer_id: 'cust-123',
                    subscription_id: 'sub-456',
                },
            };

            const result = handleWebhook(event);

            expect(result.action).toBe('cancel_subscription');
            expect(result.data.customerId).toBe('cust-123');
            expect(result.data.subscriptionId).toBe('sub-456');
        });

        it('should handle payment.completed for credit purchase', () => {
            const event = {
                type: 'payment.completed',
                data: {
                    customer_id: 'cust-123',
                    payment_id: 'pay-789',
                    metadata: {
                        type: 'credit_purchase',
                        credits_amount: 120,
                    },
                },
            };

            const result = handleWebhook(event);

            expect(result.action).toBe('add_credits');
            expect(result.data.credits).toBe(120);
            expect(result.data.paymentId).toBe('pay-789');
        });

        it('should return "none" for unknown event types', () => {
            const result = handleWebhook({ type: 'unknown.event', data: {} });
            expect(result.action).toBe('none');
        });
    });

    // =========================================================
    // 4. CREDIT COSTS FOR AI NOTE FEATURES
    // =========================================================
    describe('4. Credit Costs for Notes AI Features', () => {

        it('AI summary should cost 1 credit', () => {
            expect(CREDIT_COSTS.summary).toBe(1);
        });

        it('Mind map should cost 2 credits', () => {
            expect(CREDIT_COSTS.mind_map).toBe(2);
        });

        it('all feature costs should be positive integers', () => {
            Object.values(CREDIT_COSTS).forEach(cost => {
                expect(cost).toBeGreaterThan(0);
                expect(Number.isInteger(cost)).toBe(true);
            });
        });
    });

    // =========================================================
    // 5. STORAGE PLAN CHECKOUT FLOW
    // =========================================================
    describe('5. Storage Plan Checkout Flow', () => {

        it('checkout URL should use HTTPS', () => {
            const url = getSubscriptionPaymentUrl('storage', TEST_USER.email, 'https://callback');
            expect(url.startsWith('https://')).toBe(true);
        });

        it('basic plan checkout should use a different product than storage', () => {
            const storageUrl = getSubscriptionPaymentUrl('storage', TEST_USER.email, 'https://cb');
            const basicUrl = getSubscriptionPaymentUrl('basic', TEST_USER.email, 'https://cb');

            // Extract product_id from URLs
            const storageProductId = new URL(storageUrl).pathname.split('/').pop();
            const basicProductId = new URL(basicUrl).pathname.split('/').pop();

            expect(storageProductId).not.toBe(basicProductId);
        });

        it('pro plan checkout should use a different product than storage', () => {
            const storageUrl = getSubscriptionPaymentUrl('storage', TEST_USER.email, 'https://cb');
            const proUrl = getSubscriptionPaymentUrl('pro', TEST_USER.email, 'https://cb');

            expect(storageUrl).not.toBe(proUrl);
        });

        it('checkout URL should include all required params', () => {
            const url = getSubscriptionPaymentUrl('storage', TEST_USER.email, 'https://app/callback');
            const urlObj = new URL(url);
            const params = urlObj.searchParams;

            expect(params.get('email')).toBe(TEST_USER.email);
            expect(params.get('redirect_url')).toBe('https://app/callback');
            expect(params.get('quantity')).toBe('1');
        });
    });

    // =========================================================
    // 6. NOTE SYNC WITH FILE BLOCKS (images/PDFs)
    // =========================================================
    describe('6. Note Sync with File Attachments', () => {

        it('should upload file blocks before syncing', async () => {
            const { uploadNoteFileBlocks } = require('../services/firebaseStorageService');
            (doc as jest.Mock).mockReturnValue('mock-doc-ref');
            (setDoc as jest.Mock).mockResolvedValue(undefined);

            const noteWithFiles = {
                ...TEST_NOTE,
                blocks: [
                    { id: '1', type: 'image', content: 'file:///local/image.jpg' },
                    { id: '2', type: 'pdf', content: 'file:///local/doc.pdf' },
                ],
            };

            await syncNoteToFirebase(TEST_USER.id, noteWithFiles);

            expect(uploadNoteFileBlocks).toHaveBeenCalledWith(
                TEST_USER.id,
                noteWithFiles.id,
                noteWithFiles.blocks,
            );
        });

        it('should sync note without blocks normally', async () => {
            (doc as jest.Mock).mockReturnValue('mock-doc-ref');
            (setDoc as jest.Mock).mockResolvedValue(undefined);

            const noteNoBlocks = { ...TEST_NOTE, blocks: [] };
            await syncNoteToFirebase(TEST_USER.id, noteNoBlocks);

            expect(setDoc).toHaveBeenCalled();
        });
    });

    // =========================================================
    // 7. EDGE CASES
    // =========================================================
    describe('7. Edge Cases', () => {

        it('should handle special characters in email for checkout URL', () => {
            const email = 'user+test@example.com';
            const url = getSubscriptionPaymentUrl('storage', email, 'https://cb');
            expect(url).toContain(encodeURIComponent(email));
        });

        it('should handle Firebase fetch failure gracefully', async () => {
            (getDocs as jest.Mock).mockRejectedValue(new Error('Firestore unavailable'));
            const notes = await fetchNotesFromFirebase(TEST_USER.id);
            expect(notes).toEqual([]);
        });

        it('should handle delete failure gracefully', async () => {
            (doc as jest.Mock).mockReturnValue('mock-doc-ref');
            (deleteDoc as jest.Mock).mockRejectedValue(new Error('Permission denied'));

            // Should not throw
            await deleteNoteFromFirebase(TEST_USER.id, 999);
        });

        it('webhook should handle missing metadata gracefully', () => {
            const event = {
                type: 'subscription.created',
                data: {
                    customer_id: 'cust-123',
                    subscription_id: 'sub-456',
                    metadata: {},
                },
            };

            const result = handleWebhook(event);
            expect(result.action).toBe('provision_subscription');
            expect(result.data.planType).toBeUndefined();
        });
    });
});
