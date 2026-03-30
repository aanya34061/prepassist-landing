/**
 * BILLING & CREDITS SERVICE
 * 
 * Handles subscription management, credit purchases, and usage tracking
 * Integrates with DodoPayments for UPI payments
 */

import { supabase } from '../lib/supabase';

// ===================== TYPES =====================
export interface SubscriptionPlan {
    id: string;
    name: string;
    plan_type: 'basic' | 'pro';
    price_inr: number;
    monthly_credits: number;
    features: string[];
    max_response_length: 'medium' | 'long';
    max_pdf_pages: number;
}

export interface CreditPackage {
    id: string;
    name: string;
    credits: number;
    price_inr: number;
}

export interface UserSubscription {
    id: string;
    user_id: string;
    plan_type: 'basic' | 'pro' | 'free';
    status: 'active' | 'cancelled' | 'expired' | 'pending';
    price_inr: number;
    monthly_credits: number;
    current_credits: number;
    expires_at: string | null;
}

export interface CreditBalance {
    has_subscription: boolean;
    plan_type: string;
    credits: number;
    monthly_credits: number;
    expires_at: string | null;
    status: string;
}

// ===================== CREDIT COSTS =====================
export const CREDIT_COSTS = {
    summary: 1,
    mind_map: 2,
    mcq_generator: 3,
    pdf_mcq: 5,  // Average of 4-6
    essay_evaluation: 3,
} as const;

export type FeatureType = keyof typeof CREDIT_COSTS;

// ===================== API FUNCTIONS =====================

/**
 * Get user's current subscription and credits
 */
export async function getUserCredits(): Promise<CreditBalance> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return {
            has_subscription: false,
            plan_type: 'none',
            credits: 0,
            monthly_credits: 0,
            expires_at: null,
            status: 'none'
        };
    }

    const { data, error } = await supabase.rpc('get_user_credits', {
        p_user_id: user.id
    });

    if (error) {
        console.error('[Billing] Error getting credits:', error);
        return {
            has_subscription: false,
            plan_type: 'none',
            credits: 0,
            monthly_credits: 0,
            expires_at: null,
            status: 'none'
        };
    }

    return data;
}

/**
 * Check if user has enough credits for a feature
 */
export async function checkCredits(feature: FeatureType): Promise<{
    hasCredits: boolean;
    currentCredits: number;
    requiredCredits: number;
    planType: string;
}> {
    const balance = await getUserCredits();
    const requiredCredits = CREDIT_COSTS[feature];

    return {
        hasCredits: balance.credits >= requiredCredits,
        currentCredits: balance.credits,
        requiredCredits,
        planType: balance.plan_type
    };
}

/**
 * Deduct credits for using a feature
 */
export async function deductCredits(
    feature: FeatureType,
    description?: string
): Promise<{ success: boolean; balance: number; error?: string }> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, balance: 0, error: 'Not authenticated' };
    }

    const credits = CREDIT_COSTS[feature];

    const { data, error } = await supabase.rpc('deduct_credits', {
        p_user_id: user.id,
        p_credits: credits,
        p_feature: feature,
        p_description: description || `Used ${feature}`
    });

    if (error) {
        console.error('[Billing] Error deducting credits:', error);
        return { success: false, balance: 0, error: error.message };
    }

    return data;
}

/**
 * Get user's transaction history
 */
export async function getTransactionHistory(limit = 20) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('[Billing] Error getting transactions:', error);
        return [];
    }

    return data || [];
}

/**
 * Format price for display
 */
export function formatPrice(priceInr: number): string {
    return `₹${priceInr.toLocaleString('en-IN')}`;
}

/**
 * Get feature display name
 */
export function getFeatureDisplayName(feature: FeatureType): string {
    const names: Record<FeatureType, string> = {
        summary: 'AI Summary',
        mind_map: 'Mind Map',
        mcq_generator: 'MCQ Generator',
        pdf_mcq: 'PDF to MCQ',
        essay_evaluation: 'Essay Evaluation'
    };
    return names[feature];
}
