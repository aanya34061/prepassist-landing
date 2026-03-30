-- RPC function to fully delete a user account
-- Run this in the Supabase SQL Editor to create the function
--
-- This function:
-- 1. Deletes user data from all app tables
-- 2. Deletes the user from Supabase Auth (prevents re-login)
-- 3. Must be called by the authenticated user (security check)

CREATE OR REPLACE FUNCTION public.delete_user_account(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs with elevated privileges (needed for auth.users deletion)
SET search_path = public
AS $$
DECLARE
    _auth_uid UUID;
BEGIN
    -- Security: Verify the caller is deleting their own account
    _auth_uid := auth.uid();
    IF _auth_uid IS NULL OR _auth_uid != p_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: can only delete your own account');
    END IF;

    -- Step 1: Delete from app tables (order matters for foreign keys)
    DELETE FROM public.credit_transactions WHERE user_id = p_user_id;
    DELETE FROM public.user_subscriptions WHERE user_id = p_user_id;
    DELETE FROM public.saved_articles WHERE user_id = p_user_id;
    DELETE FROM public.bug_reports WHERE user_id = p_user_id;

    -- Step 2: Delete from Supabase Auth (prevents re-login with same credentials)
    DELETE FROM auth.users WHERE id = p_user_id;

    RETURN jsonb_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user_account(UUID) TO authenticated;
