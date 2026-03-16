/**
 * CREDITS BADGE COMPONENT
 * 
 * Displays credits in the header with:
 * - Credit count
 * - Plan badge (FREE/BASIC/PRO)
 * - Tap to navigate to billing
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../features/Reference/theme/ThemeContext';
import useCredits from '../hooks/useCredits';

interface CreditsBadgeProps {
    compact?: boolean;
}

export default function CreditsBadge({ compact = false }: CreditsBadgeProps) {
    const { theme, isDark } = useTheme();
    const navigation = useNavigation<any>();
    const { credits, planType, isFreePlan, loading } = useCredits();

    const handlePress = () => {
        navigation.navigate('Billing');
    };

    const getPlanColor = () => {
        switch (planType) {
            case 'pro': return '#2A7DEB';
            case 'basic': return '#10B981';
            default: return '#6B7280';
        }
    };

    const getPlanLabel = () => {
        switch (planType) {
            case 'pro': return 'PRO';
            case 'basic': return 'BASIC';
            default: return 'FREE';
        }
    };

    if (loading) {
        return (
            <View style={[styles.containerCompact, isDark ? styles.containerGlass : styles.containerLight]}>
                <ActivityIndicator size="small" color={isDark ? '#FFF' : '#374151'} />
            </View>
        );
    }

    if (compact) {
        return (
            <TouchableOpacity
                style={[styles.containerCompact, isDark ? styles.containerGlass : styles.containerLight]}
                onPress={handlePress}
            >
                <Ionicons name="flash" size={14} color="#F59E0B" />
                <Text style={[styles.creditsTextCompact, !isDark && { color: '#374151' }]}>
                    {credits}
                </Text>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF', borderColor: isDark ? '#2A2A4E' : '#E8E8E8' }]}
            onPress={handlePress}
        >
            <View style={styles.creditsSection}>
                <Ionicons name="flash" size={16} color="#F59E0B" />
                <Text style={[styles.creditsNumber, { color: isDark ? '#FFF' : '#1A1A1A' }]}>
                    {credits}
                </Text>
                <Text style={[styles.creditsLabel, { color: isDark ? '#666' : '#888' }]}>
                    credits
                </Text>
            </View>

            {/* CTA Button for low credits or free plan */}
            {(credits < 10 || isFreePlan) && (
                <View style={[styles.planBadge, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.planText}>+ GET CREDITS</Text>
                </View>
            )}

            {!(credits < 10 || isFreePlan) && (
                <View style={[styles.planBadge, { backgroundColor: getPlanColor() }]}>
                    <Text style={styles.planText}>{getPlanLabel()}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
    },
    containerCompact: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 18,
        borderWidth: 1,
        height: 36,
    },
    containerGlass: {
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderColor: 'rgba(255,255,255,0.30)',
    },
    containerLight: {
        backgroundColor: '#F3F4F6',
        borderColor: '#E5E7EB',
    },
    creditsSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    creditsNumber: {
        fontSize: 14,
        fontWeight: '700',
        marginLeft: 3,
    },
    creditsLabel: {
        fontSize: 11,
        marginLeft: 2,
    },
    creditsTextCompact: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFF',
        marginLeft: 3,
    },
    planBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        marginLeft: 6,
    },
    planText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '700',
    },
});
