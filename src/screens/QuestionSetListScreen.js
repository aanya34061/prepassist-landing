import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useTheme } from '../features/Reference/theme/ThemeContext';

const SUBJECT_COLORS = {
  Polity: '#5EC7B2',
  Economy: '#34D399',
  History: '#FBBF24',
  Geography: '#60A5FA',
  'Science & Technology': '#22D3EE',
  Environment: '#4ADE80',
};

const QuestionSetListScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSets();
  }, []);

  const fetchSets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('question_sets')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSets(data || []);
    } catch (error) {
      console.error('Error fetching sets:', error);
      Alert.alert('Error', 'Failed to load question banks');
    } finally {
      setLoading(false);
    }
  };

  const getSubjectColor = (title) => {
    for (const [key, color] of Object.entries(SUBJECT_COLORS)) {
      if (title?.toLowerCase().includes(key.toLowerCase())) return color;
    }
    return '#F59E0B';
  };

  const bg         = isDark ? ['#07091A', '#1A1000', '#080E28'] : ['#F7F8FC', '#FFFBEB', '#FEF9EC'];
  const orbTop     = isDark ? ['rgba(245,158,11,0.26)', 'transparent'] : ['rgba(245,158,11,0.10)', 'transparent'];
  const orbBottom  = isDark ? ['rgba(180,83,9,0.16)', 'transparent']   : ['rgba(180,83,9,0.06)', 'transparent'];
  const cardBg     = isDark ? 'rgba(255,255,255,0.075)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.10)'  : theme.colors.border;

  return (
    <View style={[styles.root, { backgroundColor: isDark ? '#07091A' : '#F7F8FC' }]}>
      <LinearGradient colors={bg} style={StyleSheet.absoluteFillObject} />

      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <LinearGradient colors={orbTop}    style={styles.orbTop}    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        <LinearGradient colors={orbBottom} style={styles.orbBottom} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} />
      </View>

      <SafeAreaView style={{ flex: 1 }}>

        {/* ── Hero header ─────────────────────────────────────────── */}
        <LinearGradient
          colors={['#B45309', '#92400E', '#78350F']}
          start={{ x: 0, y: 0 }} end={{ x: 1.2, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroShimmer} />
          <View style={styles.heroCircleLarge} />
          <View style={styles.heroCircleSmall} />

          <View style={styles.heroRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color="#FFF" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.heroTitle}>Question Bank</Text>
              <Text style={styles.heroSub}>UPSC practice question sets</Text>
            </View>
            <LinearGradient
              colors={['rgba(255,255,255,0.30)', 'rgba(255,255,255,0.10)']}
              style={styles.heroIconBubble}
            >
              <Ionicons name="library-outline" size={26} color="#FFF" />
            </LinearGradient>
          </View>

          {/* Stats strip */}
          <View style={[styles.statsStrip, {
            backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(26,29,58,0.07)',
            borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#E4E6F0',
          }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: isDark ? '#FFF' : '#333333' }]}>{sets.length}</Text>
              <Text style={[styles.statLabel, { color: isDark ? 'rgba(255,255,255,0.60)' : '#3D565E' }]}>Sets</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : '#E4E6F0' }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: isDark ? '#FFF' : '#333333' }]}>500+</Text>
              <Text style={[styles.statLabel, { color: isDark ? 'rgba(255,255,255,0.60)' : '#3D565E' }]}>Questions</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : '#E4E6F0' }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: isDark ? '#FFF' : '#333333' }]}>PYQ</Text>
              <Text style={[styles.statLabel, { color: isDark ? 'rgba(255,255,255,0.60)' : '#3D565E' }]}>Series</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Content ─────────────────────────────────────────────── */}
        {loading ? (
          <View style={styles.centeredState}>
            <LinearGradient colors={['#F59E0B', '#B45309']} style={styles.loadingBubble}>
              <ActivityIndicator size="large" color="#FFF" />
            </LinearGradient>
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading question sets…</Text>
          </View>
        ) : sets.length === 0 ? (
          <View style={styles.centeredState}>
            <View style={[styles.emptyIconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(26,29,58,0.05)' }]}>
              <Ionicons name="library-outline" size={42} color={isDark ? 'rgba(255,255,255,0.25)' : '#C0C0C0'} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Sets Available</Text>
            <Text style={[styles.emptyDesc, { color: theme.colors.textSecondary }]}>Question banks will appear here once uploaded.</Text>
            <TouchableOpacity onPress={fetchSets} style={styles.retryBtn}>
              <LinearGradient
                colors={['#F59E0B', '#B45309']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.retryBtnInner}
              >
                <Ionicons name="refresh" size={16} color="#FFF" />
                <Text style={styles.retryBtnText}>Retry</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {sets.map((set) => {
              const accentColor = getSubjectColor(set.title);
              return (
                <TouchableOpacity
                  key={set.id}
                  activeOpacity={0.80}
                  style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}
                  onPress={() => navigation.navigate('QuestionPaper', { setId: set.id, title: set.title })}
                >
                  <LinearGradient
                    colors={['rgba(255,255,255,0.075)', 'rgba(255,255,255,0.03)']}
                    style={StyleSheet.absoluteFillObject}
                  />
                  {/* Left accent stripe */}
                  <View style={[styles.cardStripe, { backgroundColor: accentColor }]} />

                  <View style={[styles.cardIconWrap, { backgroundColor: `${accentColor}22` }]}>
                    <Ionicons name="book-outline" size={24} color={accentColor} />
                  </View>

                  <View style={styles.cardBody}>
                    <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={2}>{set.title}</Text>
                    <Text style={[styles.cardDesc, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                      {set.description || 'Practice questions for UPSC Prelims & Mains'}
                    </Text>
                    <View style={styles.cardMeta}>
                      {set.year && (
                        <View style={[styles.yearPill, { backgroundColor: `${accentColor}22` }]}>
                          <Ionicons name="calendar-outline" size={10} color={accentColor} />
                          <Text style={[styles.yearText, { color: accentColor }]}>{set.year}</Text>
                        </View>
                      )}
                      <View style={[styles.yearPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(26,29,58,0.07)' }]}>
                        <Ionicons name="help-circle-outline" size={10} color={isDark ? 'rgba(255,255,255,0.55)' : '#3D565E'} />
                        <Text style={[styles.yearText, { color: isDark ? 'rgba(255,255,255,0.55)' : '#3D565E' }]}>MCQs</Text>
                      </View>
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={20} color={isDark ? 'rgba(255,255,255,0.35)' : '#C0C0C0'} />
                </TouchableOpacity>
              );
            })}
            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },

  orbTop: {
    position: 'absolute', width: 360, height: 360, borderRadius: 180,
    top: -80, right: -80,
  },
  orbBottom: {
    position: 'absolute', width: 240, height: 240, borderRadius: 120,
    bottom: 100, left: -60,
  },

  // Hero
  hero: {
    paddingTop: 16, paddingHorizontal: 20, paddingBottom: 20,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden',
  },
  heroShimmer: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  heroCircleLarge: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)', top: -60, right: -50,
  },
  heroCircleSmall: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)', bottom: 14, left: -20,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.30)',
    justifyContent: 'center', alignItems: 'center',
  },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#FFF', letterSpacing: -0.5 },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.62)', marginTop: 2 },
  heroIconBubble: {
    width: 52, height: 52, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },

  // Stats strip
  statsStrip: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, paddingVertical: 12,
    borderWidth: 1,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  statDivider: { width: 1, height: 30 },

  // States
  centeredState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 14 },
  loadingBubble: { width: 68, height: 68, borderRadius: 34, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 14, marginTop: 4 },
  emptyIconWrap: {
    width: 84, height: 84, borderRadius: 42,
    justifyContent: 'center', alignItems: 'center',
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.4 },
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  retryBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  retryBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12 },
  retryBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  // List
  listContent: { padding: 20 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 22, padding: 16,
    borderWidth: 1,
    marginBottom: 14, overflow: 'hidden',
    shadowColor: '#333333',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 14, elevation: 4,
  },
  cardStripe: { width: 3, height: '100%', borderRadius: 2, marginRight: 14, alignSelf: 'stretch' },
  cardIconWrap: {
    width: 52, height: 52, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 14, flexShrink: 0,
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#FFF', letterSpacing: -0.3, marginBottom: 4 },
  cardDesc: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 8 },
  cardMeta: { flexDirection: 'row', gap: 6 },
  yearPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  yearText: { fontSize: 10, fontWeight: '700' },
});

export default QuestionSetListScreen;
