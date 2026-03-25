/**
 * CREDITS HOOK
 *
 * Manages user credits for AI features:
 * - Fetches credits from Supabase via RPC (bypasses RLS)
 * - Deducts credits when using features via RPC
 * - Auto-initializes new users with 10 free credits
 * - planType defaults to 'free' unless explicitly 'basic' or 'pro'
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { canBypassCredits } from '../utils/devMode';

// Cross-platform alert helper
function showAlert(title: string, message: string, buttons?: Array<{ text: string; onPress?: () => void; style?: string }>) {
    if (Platform.OS === 'web') {
        const hasAction = buttons?.find(b => b.text !== 'Cancel' && b.onPress);
        if (hasAction) {
            if (window.confirm(`${title}\n\n${message}`)) {
                hasAction.onPress?.();
            }
        } else {
            window.alert(`${title}\n\n${message}`);
        }
    } else {
        showAlert(title, message, buttons as any);
    }
}

// Credit costs for each feature
export const CREDIT_COSTS = {
    summary: 1,
    mind_map: 2,
    mcq_generator: 3,
    pdf_mcq: 5,
    essay_evaluation: 3,
};

export type FeatureType = keyof typeof CREDIT_COSTS;

const DEFAULT_CREDITS = 10;
const VALID_PAID_PLANS = ['basic', 'pro'];

// Safely resolve plan type - only 'basic'/'pro' are paid, everything else is 'free'
function resolvePlanType(raw: any): string {
    if (typeof raw === 'string' && VALID_PAID_PLANS.includes(raw)) {
        return raw;
    }
    return 'free';
}

// Check if user is on a free plan (not basic/pro)
export function isFreePlan(planType: string): boolean {
    return !VALID_PAID_PLANS.includes(planType);
}

// Initialize a subscription row for new users who don't have one yet
async function initializeUserSubscription(userId: string): Promise<{ credits: number; planType: string }> {
    try {
        console.log('[Credits] Initializing subscription for user:', userId);

        // Method 1: Try add_credits RPC (creates row if not exists)
        const { error: rpcError } = await supabase.rpc('add_credits', {
            p_user_id: userId,
            p_credits: DEFAULT_CREDITS,
            p_transaction_type: 'signup_bonus',
            p_payment_id: null,
            p_description: 'Welcome bonus - 10 free credits'
        });

        if (!rpcError) {
            console.log('[Credits] Initialized via RPC with 10 credits');
            return { credits: DEFAULT_CREDITS, planType: 'free' };
        }

        console.error('[Credits] add_credits RPC failed:', rpcError);

        // Method 2: Try direct upsert
        const { error: upsertError } = await supabase
            .from('user_subscriptions')
            .upsert({
                user_id: userId,
                plan_type: 'free',
                current_credits: DEFAULT_CREDITS,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });

        if (!upsertError) {
            console.log('[Credits] Initialized via direct upsert with 10 credits');
            return { credits: DEFAULT_CREDITS, planType: 'free' };
        }

        console.error('[Credits] Direct upsert failed:', upsertError);

        // Method 3: Try direct insert (in case upsert syntax differs)
        const { error: insertError } = await supabase
            .from('user_subscriptions')
            .insert({
                user_id: userId,
                plan_type: 'free',
                current_credits: DEFAULT_CREDITS,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });

        if (!insertError) {
            console.log('[Credits] Initialized via direct insert with 10 credits');
            return { credits: DEFAULT_CREDITS, planType: 'free' };
        }

        console.error('[Credits] Direct insert also failed:', insertError);
    } catch (err) {
        console.error('[Credits] Init error:', err);
    }

    // Even if all DB methods fail, return free defaults so UI works
    return { credits: DEFAULT_CREDITS, planType: 'free' };
}

export function useCredits() {
    const { user } = useAuth() as { user: { id?: string; email?: string } | null };
    const [credits, setCredits] = useState<number>(DEFAULT_CREDITS);
    const [planType, setPlanType] = useState<string>('free');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [initialized, setInitialized] = useState(false);

    const userId = user?.id;
    const userEmail = user?.email;

    // Fetch credits from Supabase using RPC (bypasses RLS)
    const fetchCredits = useCallback(async () => {
        if (!userId) {
            setCredits(DEFAULT_CREDITS);
            setPlanType('free');
            setLoading(false);
            setInitialized(true);
            return;
        }

        try {
            setLoading(true);

            // Try RPC first
            const { data, error: rpcError } = await supabase.rpc('get_user_credits', {
                p_user_id: userId
            });

            if (!rpcError && data) {
                const creditData = typeof data === 'object' ? data : { credits: data };

                // If RPC says no subscription exists, this is a new user — initialize them
                if (creditData.has_subscription === false) {
                    console.log('[Credits] No subscription found via RPC, initializing new user:', userId);
                    const initResult = await initializeUserSubscription(userId);
                    setCredits(initResult.credits);
                    setPlanType(initResult.planType);
                    setInitialized(true);
                    return;
                }

                // RPC returned data for an existing subscriber
                // Use || to pick whichever field has a non-zero value (avoids 0-vs-real mismatch)
                const fetchedCredits = creditData.current_credits || creditData.credits || 0;
                const fetchedPlan = resolvePlanType(creditData.plan_type);
                setCredits(fetchedCredits);
                setPlanType(fetchedPlan);
                setInitialized(true);
                console.log(`[Credits] Fetched via RPC: ${fetchedCredits} credits, plan: ${fetchedPlan}`);
                return;
            }

            if (rpcError) {
                console.error('[Credits] RPC get_user_credits error:', rpcError);
            }

            // RPC failed or returned null — try direct table read
            const { data: fallbackData, error: fallbackError } = await supabase
                .from('user_subscriptions')
                .select('current_credits, plan_type')
                .eq('user_id', userId)
                .maybeSingle();

            if (!fallbackError && fallbackData) {
                setCredits(fallbackData.current_credits || 0);
                setPlanType(resolvePlanType(fallbackData.plan_type));
                setInitialized(true);
                console.log('[Credits] Fetched via direct query:', fallbackData.current_credits);
                return;
            }

            // No data at all — this is a NEW user, initialize their subscription
            console.log('[Credits] No subscription found, initializing new user:', userId);
            const initResult = await initializeUserSubscription(userId);
            setCredits(initResult.credits);
            setPlanType(initResult.planType);
            setInitialized(true);

        } catch (err: any) {
            console.error('[Credits] Error:', err);
            setError(err.message);
            // ALWAYS default to free plan so note limits still work
            setCredits(DEFAULT_CREDITS);
            setPlanType('free');
            setInitialized(true);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    // Check if user has enough credits for a feature
    const hasEnoughCredits = useCallback((feature: FeatureType): boolean => {
        if (canBypassCredits()) return true;
        const cost = CREDIT_COSTS[feature];
        return credits >= cost;
    }, [credits]);

    // Deduct credits for using a feature via RPC (bypasses RLS)
    const useCredits = useCallback(async (feature: FeatureType): Promise<boolean> => {
        const cost = CREDIT_COSTS[feature];

        // Dev mode: skip credit deduction entirely
        if (canBypassCredits()) {
            console.log(`[Credits] Dev bypass: skipping ${cost} credit deduction for ${feature}`);
            return true;
        }

        if (!userId) {
            showAlert('Login Required', 'Please login to use AI features.');
            return false;
        }

        // Quick local check first
        if (credits < cost) {
            showAlert(
                'Insufficient Credits',
                `You need ${cost} credits for ${feature.replace('_', ' ')}. You have ${credits} credits.\n\nPurchase more credits to continue.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Buy Credits', onPress: () => {} },
                ]
            );
            return false;
        }

        try {
            // Use RPC function which handles deduction atomically and bypasses RLS
            const { data, error: rpcError } = await supabase.rpc('deduct_credits', {
                p_user_id: userId,
                p_credits: cost,
                p_feature: feature,
                p_description: `Used ${cost} credits for ${feature.replace('_', ' ')}`
            });

            if (!rpcError && data?.success !== false && !data?.error) {
                // RPC succeeded - update local state
                const newBalance = data?.balance ?? (credits - cost);
                setCredits(newBalance);
                console.log(`[Credits] Deducted ${cost} credits for ${feature} via RPC. Remaining: ${newBalance}`);
                return true;
            }

            // RPC failed — check if it's an insufficient credits error
            const errorMsg = rpcError?.message || data?.error || '';
            if (errorMsg.toLowerCase().includes('insufficient') || errorMsg.toLowerCase().includes('not enough')) {
                await fetchCredits();
                showAlert(
                    'Insufficient Credits',
                    `You need ${cost} credits for ${feature.replace('_', ' ')}.\n\nPurchase more credits to continue.`,
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Buy Credits', onPress: () => {} },
                    ]
                );
                return false;
            }

            // RPC failed for other reasons — try direct table update as fallback
            console.warn('[Credits] RPC failed, trying direct update fallback:', rpcError?.message || data?.error);

            try {
                const { error: directError } = await supabase
                    .from('user_subscriptions')
                    .update({ current_credits: credits - cost, updated_at: new Date().toISOString() })
                    .eq('user_id', userId);

                if (!directError) {
                    setCredits(credits - cost);
                    console.log(`[Credits] Direct update fallback succeeded. Remaining: ${credits - cost}`);
                    return true;
                }
                console.warn('[Credits] Direct update also failed:', directError.message);
            } catch (fallbackErr) {
                console.warn('[Credits] Direct update fallback error:', fallbackErr);
            }

            // All DB methods failed — allow the feature anyway and log it
            // This prevents a broken Supabase RPC from blocking the entire app
            console.warn(`[Credits] All deduction methods failed. Allowing feature ${feature} to proceed.`);
            setCredits(Math.max(0, credits - cost));
            return true;

        } catch (err: any) {
            console.error('[Credits] Deduction error:', err);
            // Network/unexpected errors — still allow the feature to work
            console.warn(`[Credits] Allowing feature ${feature} despite error.`);
            setCredits(Math.max(0, credits - cost));
            return true;
        }
    }, [credits, userId, fetchCredits]);

    // Check credits before allowing feature access
    const checkFeatureAccess = useCallback((feature: FeatureType, onNavigateToBilling: () => void): boolean => {
        const cost = CREDIT_COSTS[feature];

        if (!userId && !userEmail) {
            showAlert(
                'Login Required',
                'Please login to use AI features.',
                [{ text: 'OK' }]
            );
            return false;
        }

        if (credits < cost) {
            showAlert(
                'Insufficient Credits',
                `This feature requires ${cost} credits.\nYou have ${credits} credits.\n\nBuy more credits to continue.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Buy Credits', onPress: onNavigateToBilling },
                ]
            );
            return false;
        }

        return true;
    }, [credits, userId, userEmail]);

    // Fetch credits on mount and when user changes
    useEffect(() => {
        fetchCredits();
    }, [fetchCredits]);

    // Subscribe to realtime updates
    useEffect(() => {
        if (!userId) return;

        const subscription = supabase
            .channel(`credits-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'user_subscriptions',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    console.log('[Credits] Realtime update:', payload);
                    if (payload.new?.current_credits !== undefined) {
                        setCredits(payload.new.current_credits);
                    }
                    if (payload.new?.plan_type) {
                        setPlanType(resolvePlanType(payload.new.plan_type));
                    }
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [userId]);

    return {
        credits,
        planType,
        loading,
        error,
        initialized,
        isFreePlan: isFreePlan(planType),
        hasEnoughCredits,
        useCredits,
        checkFeatureAccess,
        refreshCredits: fetchCredits,
        CREDIT_COSTS,
    };
}

export default useCredits;
