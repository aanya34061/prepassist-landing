import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../features/Reference/theme/ThemeContext';
import { useWebStyles } from '../components/WebContainer';
import { supabase } from '../lib/supabase';

const SUBJECT_COLORS = {
  Polity: '#5EC7B2',
  Economy: '#34D399',
  History: '#FBBF24',
  Geography: '#60A5FA',
  'Science & Technology': '#22D3EE',
  Environment: '#4ADE80',
};

const getSubjectColor = (title) => {
  for (const [key, color] of Object.entries(SUBJECT_COLORS)) {
    if (title?.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return '#F59E0B';
};

export default function QuestionBankScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const { horizontalPadding, isWeb } = useWebStyles();
  const [refreshing, setRefreshing] = useState(false);

  // Supabase question sets state
  const [questionSets, setQuestionSets] = useState([]);
  const [setsLoading, setSetsLoading] = useState(true);
  const [setsError, setSetsError] = useState(null);

  const fetchQuestionSets = async () => {
    try {
      setSetsLoading(true);
      setSetsError(null);
      const { data, error } = await supabase
        .from('question_sets')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setQuestionSets(data || []);
    } catch (error) {
      console.error('Error fetching question sets:', error);
      setSetsError('Failed to load question sets');
    } finally {
      setSetsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchQuestionSets();
    }, [])
  );

  // Realtime: auto-refresh when question_sets table changes in Supabase
  useEffect(() => {
    const channel = supabase
      .channel('question_sets_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'question_sets' },
        () => {
          console.log('[QuestionBank] Realtime update detected, refreshing...');
          fetchQuestionSets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchQuestionSets();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding || 20 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={[styles.backText, { color: theme.colors.primary }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#000000' }]}>Question Bank</Text>
        </View>

        {/* ── Supabase Question Sets Section ── */}
        <View style={styles.setsSection}>
          <View style={styles.setsSectionHeader}>
            <Ionicons name="library" size={20} color={isDark ? '#F59E0B' : '#B45309'} />
            <Text style={[styles.setsSectionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>Question Sets</Text>
          </View>

          {setsLoading ? (
            <View style={[styles.setsStateBox, { backgroundColor: theme.colors.surface }]}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={[styles.setsStateText, { color: theme.colors.textSecondary }]}>Loading question sets…</Text>
            </View>
          ) : setsError ? (
            <View style={[styles.setsStateBox, { backgroundColor: theme.colors.surface }]}>
              <Ionicons name="warning-outline" size={20} color={theme.colors.error || '#FF3B30'} />
              <Text style={[styles.setsStateText, { color: theme.colors.error || '#FF3B30' }]}>{setsError}</Text>
              <TouchableOpacity onPress={fetchQuestionSets}>
                <Text style={[styles.retryText, { color: theme.colors.primary }]}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : questionSets.length === 0 ? (
            <View style={[styles.setsStateBox, { backgroundColor: theme.colors.surface }]}>
              <Ionicons name="document-text-outline" size={20} color={theme.colors.textSecondary} />
              <Text style={[styles.setsStateText, { color: theme.colors.textSecondary }]}>No question sets available yet.</Text>
            </View>
          ) : (
            questionSets.map((set) => {
              const accentColor = getSubjectColor(set.title);
              return (
                <TouchableOpacity
                  key={set.id}
                  activeOpacity={0.8}
                  style={[styles.setCard, { backgroundColor: theme.colors.surface, borderColor: isDark ? 'rgba(255,255,255,0.10)' : theme.colors.border }]}
                  onPress={() => navigation.navigate('QuestionPaper', { setId: set.id, title: set.title })}
                >
                  <View style={[styles.setCardStripe, { backgroundColor: accentColor }]} />
                  <View style={[styles.setCardIcon, { backgroundColor: `${accentColor}22` }]}>
                    <Ionicons name="book-outline" size={22} color={accentColor} />
                  </View>
                  <View style={styles.setCardBody}>
                    <Text style={[styles.setCardTitle, { color: isDark ? '#FFFFFF' : '#000000' }]} numberOfLines={2}>{set.title}</Text>
                    <Text style={[styles.setCardDesc, { color: isDark ? '#B0B0B0' : '#6B7280' }]} numberOfLines={1}>
                      {set.description || 'Practice questions for UPSC'}
                    </Text>
                    <View style={styles.setCardMeta}>
                      {set.year && (
                        <View style={[styles.setYearPill, { backgroundColor: `${accentColor}22` }]}>
                          <Ionicons name="calendar-outline" size={10} color={accentColor} />
                          <Text style={[styles.setYearText, { color: accentColor }]}>{set.year}</Text>
                        </View>
                      )}
                      <View style={[styles.setYearPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.05)' }]}>
                        <Ionicons name="help-circle-outline" size={10} color={isDark ? 'rgba(255,255,255,0.55)' : '#6B7280'} />
                        <Text style={[styles.setYearText, { color: isDark ? 'rgba(255,255,255,0.55)' : '#6B7280' }]}>MCQs</Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={isDark ? 'rgba(255,255,255,0.35)' : '#C0C0C0'} />
                </TouchableOpacity>
              );
            })
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  backButton: {
    marginBottom: 12,
  },
  backText: {
    fontSize: 17,
    fontWeight: '400',
    color: '#007AFF',
    letterSpacing: -0.4,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
    marginTop: 4,
    letterSpacing: -0.3,
  },
  filterSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  filterTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.4,
  },
  clearText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF3B30',
    letterSpacing: -0.3,
  },
  tagGroup: {
    marginBottom: 12,
  },
  tagGroupLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  systemFilterTag: {
    backgroundColor: '#F2F2F7',
    borderColor: '#E5E5EA',
  },
  userFilterTag: {
    backgroundColor: 'transparent',
    borderColor: '#34C759',
  },
  filterTagActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  userFilterTagActive: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  filterTagText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  systemFilterTagText: {
    color: '#1C1C1E',
  },
  userFilterTagText: {
    color: '#34C759',
  },
  filterTagTextActive: {
    color: '#FFFFFF',
  },
  userFilterTagTextActive: {
    color: '#FFFFFF',
  },
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
    letterSpacing: -0.3,
  },
  selectionActions: {
    flexDirection: 'row',
    gap: 16,
  },
  selectAllText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#007AFF',
    letterSpacing: -0.3,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 15,
    fontWeight: '400',
    color: '#000000',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkboxTick: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  questionInfo: {
    flex: 1,
  },
  qText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    lineHeight: 22,
    letterSpacing: -0.3,
    textAlign: 'justify',
  },
  expandIcon: {
    fontSize: 24,
    fontWeight: '300',
    color: '#8E8E93',
    marginLeft: 12,
  },
  tagsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 6,
  },
  previewSystemTag: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  previewSystemTagText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  previewUserTag: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  previewUserTagText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#34C759',
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  optionsList: {
    marginTop: 12,
    gap: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9FB',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  correctOption: {
    backgroundColor: '#E8F8ED',
  },
  optionLetter: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginRight: 12,
    width: 20,
  },
  correctLetter: {
    color: '#34C759',
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    color: '#000000',
    letterSpacing: -0.3,
    textAlign: 'justify',
  },
  correctText: {
    color: '#34C759',
    fontWeight: '500',
  },
  checkmark: {
    fontSize: 16,
    color: '#34C759',
    fontWeight: '700',
  },
  explanationBox: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
  },
  explanationTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B8860B',
    marginBottom: 6,
  },
  explanationText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#000000',
    lineHeight: 20,
    letterSpacing: -0.2,
    textAlign: 'justify',
  },
  allTagsContainer: {
    marginTop: 14,
  },
  tagSection: {
    marginBottom: 10,
  },
  tagSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 6,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  systemTag: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  systemTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  userTag: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#34C759',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  userTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#34C759',
    letterSpacing: -0.2,
  },
  deleteButton: {
    backgroundColor: '#FFE5E5',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  deleteText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3B30',
    letterSpacing: -0.3,
  },
  testButton: {
    marginTop: 12,
  },
  testGradient: {
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  testButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  // Question Sets section
  setsSection: {
    marginBottom: 24,
  },
  setsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  setsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  setsStateBox: {
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  setsStateText: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  setCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  setCardStripe: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginRight: 12,
  },
  setCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  setCardBody: {
    flex: 1,
  },
  setCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  setCardDesc: {
    fontSize: 12,
    marginBottom: 6,
  },
  setCardMeta: {
    flexDirection: 'row',
    gap: 6,
  },
  setYearPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  setYearText: {
    fontSize: 10,
    fontWeight: '700',
  },
  savedSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
});

