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
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

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
                // RPC returned data successfully
                const creditData = typeof data === 'object' ? data : { credits: data };
                const fetchedCredits = creditData.credits ?? creditData.current_credits ?? 0;
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
        const cost = CREDIT_COSTS[feature];
        return credits >= cost;
    }, [credits]);

    // Deduct credits for using a feature via RPC (bypasses RLS)
    const useCredits = useCallback(async (feature: FeatureType): Promise<boolean> => {
        const cost = CREDIT_COSTS[feature];

        if (!userId) {
            Alert.alert('Login Required', 'Please login to use AI features.');
            return false;
        }

        // Quick local check first
        if (credits < cost) {
            Alert.alert(
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

            if (rpcError) {
                console.error('[Credits] RPC deduct_credits error:', rpcError);

                // Check if the error is about insufficient credits
                if (rpcError.message?.toLowerCase().includes('insufficient') ||
                    rpcError.message?.toLowerCase().includes('not enough')) {
                    await fetchCredits();
                    Alert.alert(
                        'Insufficient Credits',
                        `You need ${cost} credits for ${feature.replace('_', ' ')}.\n\nPurchase more credits to continue.`,
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Buy Credits', onPress: () => {} },
                        ]
                    );
                } else {
                    Alert.alert('Error', 'Failed to deduct credits. Please try again.');
                }
                return false;
            }

            // RPC succeeded - update local state
            const newBalance = data?.balance ?? (credits - cost);
            setCredits(newBalance);
            console.log(`[Credits] Deducted ${cost} credits for ${feature} via RPC. Remaining: ${newBalance}`);

            return true;
        } catch (err: any) {
            console.error('[Credits] Deduction error:', err);
            Alert.alert('Error', 'Failed to process credit usage.');
            return false;
        }
    }, [credits, userId, fetchCredits]);

    // Check credits before allowing feature access
    const checkFeatureAccess = useCallback((feature: FeatureType, onNavigateToBilling: () => void): boolean => {
        const cost = CREDIT_COSTS[feature];

        if (!userId && !userEmail) {
            Alert.alert(
                'Login Required',
                'Please login to use AI features.',
                [{ text: 'OK' }]
            );
            return false;
        }

        if (credits < cost) {
            Alert.alert(
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
