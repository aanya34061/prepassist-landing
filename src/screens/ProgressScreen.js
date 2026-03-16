import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../features/Reference/theme/ThemeContext';
import { getStats, getTestHistory, checkStreakStatus } from '../utils/storage';
import { getAllPDFMCQSessions, calculateSessionScore } from '../features/PDFMCQ/utils/pdfMCQStorage';
import { getAllMCQSessions, getSessionStats } from '../features/PDFMCQ/utils/aiMCQStorage';

// ── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, gradient, isDark, cardBg, cardBorder }) => (
  <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
    <LinearGradient colors={gradient} style={styles.statIcon}>
      <Ionicons name={icon} size={18} color="#FFF" />
    </LinearGradient>
    <Text style={[styles.statValue, { color: isDark ? '#FFF' : '#1F2937' }]}>{value}</Text>
    <Text style={[styles.statLabel, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)' }]}>{label}</Text>
    {sub ? <Text style={[styles.statSub, { color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)' }]}>{sub}</Text> : null}
  </View>
);

// ── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ icon, title, isDark, gradient }) => (
  <View style={styles.sectionRow}>
    <LinearGradient colors={gradient} style={styles.sectionIcon}>
      <Ionicons name={icon} size={15} color="#FFF" />
    </LinearGradient>
    <Text style={[styles.sectionTitle, { color: isDark ? '#FFF' : '#1F2937' }]}>{title}</Text>
  </View>
);

// ── Score Bar ────────────────────────────────────────────────────────────────
const ScoreBar = ({ label, pct, gradient, isDark }) => (
  <View style={styles.barRow}>
    <Text style={[styles.barLabel, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)' }]} numberOfLines={1}>{label}</Text>
    <View style={[styles.barTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.barFill, { width: `${Math.min(pct, 100)}%` }]} />
    </View>
    <Text style={[styles.barPct, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)' }]}>{pct}%</Text>
  </View>
);

// ── Session Row ──────────────────────────────────────────────────────────────
const SessionRow = ({ title, date, score, isDark, cardBg, cardBorder }) => (
  <View style={[styles.sessionRow, { backgroundColor: cardBg, borderColor: cardBorder }]}>
    <View style={{ flex: 1 }}>
      <Text style={[styles.sessionTitle, { color: isDark ? '#FFF' : '#1F2937' }]} numberOfLines={1}>{title}</Text>
      <Text style={[styles.sessionDate, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }]}>{date}</Text>
    </View>
    <View style={[styles.scorePill, { backgroundColor: score >= 70 ? 'rgba(34,197,94,0.15)' : score >= 40 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)' }]}>
      <Text style={[styles.scorePillText, { color: score >= 70 ? '#22C55E' : score >= 40 ? '#F59E0B' : '#EF4444' }]}>{score}%</Text>
    </View>
  </View>
);

export default function ProgressScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);

  const bg         = isDark ? ['#07091A', '#062510', '#080E28'] : ['#F7F8FC', '#EDFDF4', '#F0FFF4'];
  const orbTop     = isDark ? ['rgba(34,197,94,0.28)', 'transparent'] : ['rgba(34,197,94,0.12)', 'transparent'];
  const orbBottom  = isDark ? ['rgba(21,128,61,0.18)', 'transparent'] : ['rgba(21,128,61,0.08)', 'transparent'];
  const cardBg     = isDark ? 'rgba(255,255,255,0.07)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.10)' : theme.colors.border;

  const loadData = useCallback(async () => {
    const [stats, streak, testHistory, pdfSessions, aiSessions] = await Promise.all([
      getStats(),
      checkStreakStatus(),
      getTestHistory(),
      getAllPDFMCQSessions(),
      getAllMCQSessions(),
    ]);

    // PDF MCQ aggregation
    const completedPdf = pdfSessions.filter(s => s.completed);
    const pdfScores = completedPdf.map(s => calculateSessionScore(s));
    const pdfTotalQ = pdfScores.reduce((a, s) => a + s.total, 0);
    const pdfCorrect = pdfScores.reduce((a, s) => a + s.correct, 0);
    const pdfAvg = pdfScores.length > 0 ? Math.round(pdfScores.reduce((a, s) => a + s.percentage, 0) / pdfScores.length) : 0;

    // AI MCQ aggregation
    const completedAi = aiSessions.filter(s => s.completed);
    const aiScores = completedAi.map(s => getSessionStats(s));
    const aiTotalQ = aiScores.reduce((a, s) => a + s.total, 0);
    const aiCorrect = aiScores.reduce((a, s) => a + s.correct, 0);
    const aiAvg = aiScores.length > 0 ? Math.round(aiScores.reduce((a, s) => a + s.percentage, 0) / aiScores.length) : 0;

    // Combined totals
    const totalQuestions = stats.totalQuestions + pdfTotalQ + aiTotalQ;
    const totalCorrect = stats.correctAnswers + pdfCorrect + aiCorrect;
    const totalTests = stats.totalTests + completedPdf.length + completedAi.length;
    const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    // Recent sessions (last 5 from each, merged and sorted)
    const recentPdf = completedPdf.slice(0, 5).map(s => {
      const sc = calculateSessionScore(s);
      return { title: s.pdfName, date: s.createdAt, score: sc.percentage };
    });
    const recentAi = completedAi.slice(0, 5).map(s => {
      const sc = getSessionStats(s);
      return { title: s.title, date: s.createdAt, score: sc.percentage };
    });
    const recentAll = [...recentPdf, ...recentAi]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 6);

    // Topic breakdown from global stats
    const topics = Object.entries(stats.topicStats || {})
      .map(([name, { correct, total }]) => ({ name, correct, total, pct: total > 0 ? Math.round((correct / total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    setData({
      totalTests, totalQuestions, totalCorrect, overallAccuracy,
      streak,
      pdf: { sessions: pdfSessions.length, completed: completedPdf.length, totalQ: pdfTotalQ, correct: pdfCorrect, avg: pdfAvg },
      ai:  { sessions: aiSessions.length, completed: completedAi.length, totalQ: aiTotalQ, correct: aiCorrect, avg: aiAvg },
      qb:  { totalTests: stats.totalTests, totalQ: stats.totalQuestions, correct: stats.correctAnswers, accuracy: stats.totalQuestions > 0 ? Math.round((stats.correctAnswers / stats.totalQuestions) * 100) : 0 },
      topics,
      recentAll,
    });
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const fmtDate = (iso) => {
    try { return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); }
    catch { return ''; }
  };

  return (
    <View style={[styles.root, { backgroundColor: isDark ? '#07091A' : '#F7F8FC' }]}>
      <LinearGradient colors={bg} style={StyleSheet.absoluteFillObject} />
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <LinearGradient colors={orbTop} style={styles.orbTop} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        <LinearGradient colors={orbBottom} style={styles.orbBottom} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} />
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        {/* Hero header */}
        <LinearGradient colors={['#15803D', '#166534', '#14532D']} start={{ x: 0, y: 0 }} end={{ x: 1.2, y: 1 }} style={styles.hero}>
          <View style={styles.heroShimmer} />
          <View style={styles.heroCircleLarge} />
          <View style={styles.heroCircleSmall} />
          <View style={styles.heroRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color="#FFF" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.heroTitle}>Progress</Text>
              <Text style={styles.heroSub}>Your UPSC journey dashboard</Text>
            </View>
            <LinearGradient colors={['rgba(255,255,255,0.30)', 'rgba(255,255,255,0.10)']} style={styles.heroIconBubble}>
              <Ionicons name="bar-chart-outline" size={26} color="#FFF" />
            </LinearGradient>
          </View>
        </LinearGradient>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? '#22C55E' : '#15803D'} />}
        >
          {!data ? (
            <Text style={[styles.loadingText, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }]}>Loading analytics...</Text>
          ) : (
            <>
              {/* ── Overview Stats ─────────────────────────────── */}
              <View style={styles.statsGrid}>
                <StatCard icon="checkmark-done-outline" label="Total Tests" value={data.totalTests} isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} gradient={['#22C55E', '#15803D']} />
                <StatCard icon="help-circle-outline" label="Questions" value={data.totalQuestions} isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} gradient={['#3B82F6', '#1D4ED8']} />
                <StatCard icon="trending-up-outline" label="Accuracy" value={`${data.overallAccuracy}%`} isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} gradient={['#2A7DEB', '#1A5DB8']} />
                <StatCard icon="flame-outline" label="Streak" value={`${data.streak.currentStreak}d`} sub={`Best: ${data.streak.longestStreak}d`} isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} gradient={['#F97316', '#C2410C']} />
              </View>

              {/* ── PDF MCQs ──────────────────────────────────── */}
              <SectionHeader icon="document-attach-outline" title="PDF MCQs" isDark={isDark} gradient={['#F43F5E', '#BE123C']} />
              <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <View style={styles.sectionStatsRow}>
                  <View style={styles.sectionStat}>
                    <Text style={[styles.sectionStatVal, { color: isDark ? '#FFF' : '#1F2937' }]}>{data.pdf.completed}</Text>
                    <Text style={[styles.sectionStatLbl, { color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)' }]}>Completed</Text>
                  </View>
                  <View style={[styles.sectionDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />
                  <View style={styles.sectionStat}>
                    <Text style={[styles.sectionStatVal, { color: isDark ? '#FFF' : '#1F2937' }]}>{data.pdf.totalQ}</Text>
                    <Text style={[styles.sectionStatLbl, { color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)' }]}>Questions</Text>
                  </View>
                  <View style={[styles.sectionDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />
                  <View style={styles.sectionStat}>
                    <Text style={[styles.sectionStatVal, { color: isDark ? '#FFF' : '#1F2937' }]}>{data.pdf.correct}</Text>
                    <Text style={[styles.sectionStatLbl, { color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)' }]}>Correct</Text>
                  </View>
                  <View style={[styles.sectionDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />
                  <View style={styles.sectionStat}>
                    <Text style={[styles.sectionStatVal, { color: data.pdf.avg >= 70 ? '#22C55E' : data.pdf.avg >= 40 ? '#F59E0B' : isDark ? '#FFF' : '#1F2937' }]}>{data.pdf.avg}%</Text>
                    <Text style={[styles.sectionStatLbl, { color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)' }]}>Avg Score</Text>
                  </View>
                </View>
                {data.pdf.completed === 0 && (
                  <Text style={[styles.emptyHint, { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }]}>No completed PDF MCQ sessions yet</Text>
                )}
              </View>

              {/* ── AI MCQs ───────────────────────────────────── */}
              <SectionHeader icon="flash-outline" title="AI MCQs" isDark={isDark} gradient={['#3B82F6', '#1D4ED8']} />
              <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <View style={styles.sectionStatsRow}>
                  <View style={styles.sectionStat}>
                    <Text style={[styles.sectionStatVal, { color: isDark ? '#FFF' : '#1F2937' }]}>{data.ai.completed}</Text>
                    <Text style={[styles.sectionStatLbl, { color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)' }]}>Completed</Text>
                  </View>
                  <View style={[styles.sectionDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />
                  <View style={styles.sectionStat}>
                    <Text style={[styles.sectionStatVal, { color: isDark ? '#FFF' : '#1F2937' }]}>{data.ai.totalQ}</Text>
                    <Text style={[styles.sectionStatLbl, { color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)' }]}>Questions</Text>
                  </View>
                  <View style={[styles.sectionDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />
                  <View style={styles.sectionStat}>
                    <Text style={[styles.sectionStatVal, { color: isDark ? '#FFF' : '#1F2937' }]}>{data.ai.correct}</Text>
                    <Text style={[styles.sectionStatLbl, { color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)' }]}>Correct</Text>
                  </View>
                  <View style={[styles.sectionDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />
                  <View style={styles.sectionStat}>
                    <Text style={[styles.sectionStatVal, { color: data.ai.avg >= 70 ? '#22C55E' : data.ai.avg >= 40 ? '#F59E0B' : isDark ? '#FFF' : '#1F2937' }]}>{data.ai.avg}%</Text>
                    <Text style={[styles.sectionStatLbl, { color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)' }]}>Avg Score</Text>
                  </View>
                </View>
                {data.ai.completed === 0 && (
                  <Text style={[styles.emptyHint, { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }]}>No completed AI MCQ sessions yet</Text>
                )}
              </View>

              {/* ── Question Bank ─────────────────────────────── */}
              <SectionHeader icon="library-outline" title="Question Bank" isDark={isDark} gradient={['#F59E0B', '#B45309']} />
              <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <View style={styles.sectionStatsRow}>
                  <View style={styles.sectionStat}>
                    <Text style={[styles.sectionStatVal, { color: isDark ? '#FFF' : '#1F2937' }]}>{data.qb.totalTests}</Text>
                    <Text style={[styles.sectionStatLbl, { color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)' }]}>Tests</Text>
                  </View>
                  <View style={[styles.sectionDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />
                  <View style={styles.sectionStat}>
                    <Text style={[styles.sectionStatVal, { color: isDark ? '#FFF' : '#1F2937' }]}>{data.qb.totalQ}</Text>
                    <Text style={[styles.sectionStatLbl, { color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)' }]}>Questions</Text>
                  </View>
                  <View style={[styles.sectionDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />
                  <View style={styles.sectionStat}>
                    <Text style={[styles.sectionStatVal, { color: isDark ? '#FFF' : '#1F2937' }]}>{data.qb.correct}</Text>
                    <Text style={[styles.sectionStatLbl, { color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)' }]}>Correct</Text>
                  </View>
                  <View style={[styles.sectionDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />
                  <View style={styles.sectionStat}>
                    <Text style={[styles.sectionStatVal, { color: data.qb.accuracy >= 70 ? '#22C55E' : data.qb.accuracy >= 40 ? '#F59E0B' : isDark ? '#FFF' : '#1F2937' }]}>{data.qb.accuracy}%</Text>
                    <Text style={[styles.sectionStatLbl, { color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)' }]}>Accuracy</Text>
                  </View>
                </View>
                {data.qb.totalTests === 0 && (
                  <Text style={[styles.emptyHint, { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }]}>No question bank tests taken yet</Text>
                )}
              </View>

              {/* ── Topic Breakdown ───────────────────────────── */}
              {data.topics.length > 0 && (
                <>
                  <SectionHeader icon="pie-chart-outline" title="Topic Performance" isDark={isDark} gradient={['#2A7DEB', '#1A5DB8']} />
                  <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                    {data.topics.map((t, i) => (
                      <ScoreBar key={i} label={t.name} pct={t.pct} isDark={isDark} gradient={t.pct >= 70 ? ['#22C55E', '#15803D'] : t.pct >= 40 ? ['#F59E0B', '#B45309'] : ['#EF4444', '#DC2626']} />
                    ))}
                  </View>
                </>
              )}

              {/* ── Recent Sessions ───────────────────────────── */}
              {data.recentAll.length > 0 && (
                <>
                  <SectionHeader icon="time-outline" title="Recent Sessions" isDark={isDark} gradient={['#06B6D4', '#0E7490']} />
                  {data.recentAll.map((s, i) => (
                    <SessionRow key={i} title={s.title} date={fmtDate(s.date)} score={s.score} isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} />
                  ))}
                </>
              )}

              <View style={{ height: 40 }} />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  orbTop:    { position: 'absolute', width: 360, height: 360, borderRadius: 180, top: -100, right: -80 },
  orbBottom: { position: 'absolute', width: 260, height: 260, borderRadius: 130, bottom: 80, left: -70 },

  hero: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 28, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden' },
  heroShimmer: { position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, backgroundColor: 'rgba(255,255,255,0.28)' },
  heroCircleLarge: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.055)', top: -70, right: -50 },
  heroCircleSmall: { position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.07)', bottom: 10, left: -20 },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.30)', justifyContent: 'center', alignItems: 'center' },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#FFF', letterSpacing: -0.5 },
  heroSub:   { fontSize: 12, color: 'rgba(255,255,255,0.62)', marginTop: 2 },
  heroIconBubble: { width: 52, height: 52, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },

  content: { paddingHorizontal: 20, paddingBottom: 60, paddingTop: 20 },
  loadingText: { textAlign: 'center', marginTop: 60, fontSize: 14 },

  // Stats grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard: { width: '48%', flexGrow: 1, borderRadius: 16, borderWidth: 1, padding: 14, alignItems: 'center', gap: 4 },
  statIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statSub: { fontSize: 10, marginTop: 1 },

  // Section
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, marginTop: 8 },
  sectionIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },

  sectionCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 16 },
  sectionStatsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionStat: { flex: 1, alignItems: 'center' },
  sectionStatVal: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  sectionStatLbl: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', marginTop: 2, letterSpacing: 0.3 },
  sectionDivider: { width: 1, height: 32 },
  emptyHint: { fontSize: 12, textAlign: 'center', marginTop: 10 },

  // Score bars
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  barLabel: { width: 90, fontSize: 12, fontWeight: '500' },
  barTrack: { flex: 1, height: 8, borderRadius: 4, marginHorizontal: 8, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  barPct: { width: 36, fontSize: 12, fontWeight: '600', textAlign: 'right' },

  // Session rows
  sessionRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
  sessionTitle: { fontSize: 13, fontWeight: '600', letterSpacing: -0.2 },
  sessionDate: { fontSize: 11, marginTop: 2 },
  scorePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  scorePillText: { fontSize: 13, fontWeight: '700' },
});
