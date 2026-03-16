/**
 * NewHomeScreen – Glassmorphic UI (v2 — Logo fixed, premium hero)
 * Data: Firebase Firestore with AsyncStorage fallback
 * UI:   Deep gradient · floating orbs · glass cards · overlapping stats
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  useWindowDimensions,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';

import { db } from '../config/firebase';
import { getStats, checkStreakStatus } from '../utils/storage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../features/Reference/theme/ThemeContext';
import { useWebStyles } from '../components/WebContainer';
import { checkNewsMatches, markMatchAsRead, forceRefreshMatches } from '../services/NewsMatchService';
import CreditsBadge from '../components/CreditsBadge';
import AIOnboarding, { useOnboarding } from '../components/AIOnboarding';
import NotificationCenter from '../components/NotificationCenter';
import { getAllNotes } from '../features/Notes/services/localNotesStorage';
import { getItem, setItem } from '../features/Notes/services/storage';

// ── Constants ─────────────────────────────────────────────────────────────────
const CARD_GAP = 14;
const MAP_DOT_OPACITIES = [0.55, 0.30, 0.70, 0.25, 0.60, 0.40, 0.35, 0.50, 0.25];

// ── Firebase helpers ──────────────────────────────────────────────────────────
async function loadStatsFromFirebase(userId) {
  try {
    if (!userId) return null;
    const snap = await getDoc(doc(db, 'userStats', userId));
    return snap.exists() ? snap.data() : null;
  } catch { return null; }
}
async function loadStreakFromFirebase(userId) {
  try {
    if (!userId) return null;
    const snap = await getDoc(doc(db, 'userStreak', userId));
    return snap.exists() ? snap.data() : null;
  } catch { return null; }
}

// ── Feature Data ──────────────────────────────────────────────────────────────
const FEATURES = [
  { id: 'articles',     icon: 'newspaper-outline',       title: 'News Feed',     desc: 'Current affairs',    gradient: ['#3B9AFF', '#2A7DEB'], screen: 'Articles' },
  { id: 'aimcq',        icon: 'flash-outline',           title: 'AI MCQs',       desc: 'Generate by topic',  gradient: ['#F6A30E', '#E08D00'], screen: 'AIMCQGenerator' },
  { id: 'aimindmap',    icon: 'git-network-outline',     title: 'AI Mind Map',   desc: 'Visual diagrams',    gradient: ['#5EC7B2', '#3DA897'], screen: 'AIMindMap' },
  { id: 'pdfmcq',       icon: 'document-attach-outline', title: 'PDF → MCQs',    desc: 'From your PDFs',     gradient: ['#F43F5E', '#D92B4A'], screen: 'PDFMCQGenerator' },
  { id: 'essay',        icon: 'document-text-outline',   title: 'Mains Eval',    desc: 'Answer writing',     gradient: ['#F97316', '#E06000'], screen: 'Essay' },
  { id: 'notes',        icon: 'journal-outline',         title: 'My Notes',      desc: 'Create & organise',  gradient: ['#2A7DEB', '#5EC7B2'], screen: 'Notes' },
  { id: 'savedarticles', icon: 'bookmark-outline',       title: 'Saved Articles', desc: 'Your clipped URLs', gradient: ['#EC4899', '#DB2777'], screen: 'SavedArticles' },
  { id: 'ainotesmaker', icon: 'sparkles-outline',        title: 'AI Notes',      desc: 'Smart summaries',    gradient: ['#10B981', '#059669'], screen: 'AINotesMaker' },
  { id: 'questionbank', icon: 'library-outline',         title: 'Question Bank', desc: 'Practice questions', gradient: ['#F6A30E', '#D4890B'], screen: 'QuestionSetList' },
  { id: 'progress',     icon: 'bar-chart-outline',       title: 'Progress',      desc: 'Charts & analytics', gradient: ['#22C55E', '#16A34A'], screen: 'Progress' },
  { id: 'roadmap',      icon: 'map-outline',             title: 'Study Roadmap', desc: 'Full syllabus',      gradient: ['#3D565E', '#2A7DEB'], screen: 'ComingSoon', comingSoon: true },
];

const TOPICS = [
  { label: 'Indian Polity',  icon: 'business-outline',    color: '#5EC7B2' },
  { label: 'Geography',      icon: 'earth-outline',       color: '#60A5FA' },
  { label: 'Economy',        icon: 'trending-up-outline', color: '#34D399' },
  { label: 'History',        icon: 'time-outline',        color: '#FBBF24' },
  { label: 'Science & Tech', icon: 'flask-outline',       color: '#22D3EE' },
  { label: 'Environment',    icon: 'leaf-outline',        color: '#4ADE80' },
];

// ── Flash Cards helpers ───────────────────────────────────────────────────────
const FLASH_CARD_LIMIT = 15;
const LEARNED_CARDS_KEY = '@upsc_flash_learned';

const SOURCE_TYPE_CONFIG = {
  manual:          { icon: 'create-outline',        color: '#2A7DEB' },
  institute:       { icon: 'school-outline',        color: '#3B82F6' },
  scraped:         { icon: 'globe-outline',         color: '#0EA5E9' },
  ncert:           { icon: 'book-outline',          color: '#84CC16' },
  book:            { icon: 'library-outline',       color: '#F59E0B' },
  current_affairs: { icon: 'newspaper-outline',     color: '#F43F5E' },
  report:          { icon: 'document-text-outline', color: '#A855F7' },
};

function truncateContent(content, maxLen) {
  if (!content) return '';
  const cleaned = content.replace(/\n+/g, ' ').trim();
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.substring(0, maxLen).replace(/\s+\S*$/, '') + '...';
}

function prepareFlashCards(notes) {
  if (!notes || notes.length === 0) return [];
  const eligible = notes.filter(n =>
    n.title && n.title !== 'Untitled' && n.content?.length > 0
  );
  const scored = eligible.map(note => {
    const daysSinceUpdate = (Date.now() - new Date(note.updatedAt).getTime()) / 86400000;
    const recencyScore = Math.max(0, 1 - daysSinceUpdate / 90);
    const tagScore = Math.min(note.tags.length / 5, 1);
    const randomFactor = Math.random() * 0.4;
    return { note, score: recencyScore * 0.4 + tagScore * 0.2 + randomFactor };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, FLASH_CARD_LIMIT).map(({ note }) => ({
    id: note.id,
    title: note.title,
    summary: note.summary || truncateContent(note.content, 120),
    sourceType: note.sourceType || 'manual',
    tags: note.tags.slice(0, 3),
    updatedAt: note.updatedAt,
  }));
}

function formatFlashDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function NewHomeScreen({ navigation }) {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { horizontalPadding, isWeb } = useWebStyles();
  const { width } = useWindowDimensions();

  const [stats, setStats]   = useState({ totalTests: 0, correctAnswers: 0, totalQuestions: 0 });
  const [streak, setStreak] = useState({ currentStreak: 0 });

  const { showOnboarding, setShowOnboarding } = useOnboarding();
  const creditsRef = useRef(null);
  const [creditsPosition, setCreditsPosition] = useState(null);

  const [newsMatches, setNewsMatches]             = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingMatches, setLoadingMatches]       = useState(false);
  const [flashCards, setFlashCards]               = useState([]);
  const [learnedIds, setLearnedIds]               = useState(new Set());

  const firstName = user?.name?.split(' ')[0] || 'Aspirant';
  const initials  = firstName.charAt(0).toUpperCase();
  const PAD       = horizontalPadding || 20;
  const cardWidth = (width - PAD * 2 - CARD_GAP) / 2;
  const avgScore  = stats.totalQuestions > 0
    ? Math.round((stats.correctAnswers / stats.totalQuestions) * 100) : 0;
  const greeting  = getGreeting();

  // ── Theme helpers ──────────────────────────────────────────────────────────
  const bgColors     = isDark ? ['#07091A', '#0F1335', '#080E28'] : ['#FFFFFF', '#FFFFFF', '#FFFFFF'];
  const headerColors = isDark ? ['#0E2D5E', '#0E2478', '#0A1850'] : ['#FFFFFF', '#FFFFFF'];
  const glassBg      = isDark ? 'rgba(255,255,255,0.065)' : '#FFFFFF';
  const glassBorder  = isDark ? 'rgba(255,255,255,0.135)' : '#E5E7EB';
  const textPrimary  = isDark ? '#F0F0FF' : '#333333';
  const textMuted    = isDark ? 'rgba(240,240,255,0.55)' : '#3D565E';

  useEffect(() => {
    if (creditsRef.current && showOnboarding) {
      setTimeout(() => {
        creditsRef.current?.measureInWindow((x, y, w, h) =>
          setCreditsPosition({ x: x + w / 2, y: y + h / 2 })
        );
      }, 500);
    }
  }, [showOnboarding]);

  useFocusEffect(useCallback(() => {
    loadAll();
    fetchMatches();
  }, [user?.id]));

  const loadAll = async () => {
    const [fbStats, fbStreak] = await Promise.all([
      loadStatsFromFirebase(user?.id),
      loadStreakFromFirebase(user?.id),
    ]);
    const [localStats, localStreak] = await Promise.all([getStats(), checkStreakStatus()]);
    setStats(fbStats   || localStats);
    setStreak(fbStreak || localStreak);

    // Flash Cards
    try {
      const allNotes = await getAllNotes();
      const nonArchived = allNotes.filter(n => !n.isArchived);
      setFlashCards(prepareFlashCards(nonArchived));
      const learnedJson = await getItem(LEARNED_CARDS_KEY);
      if (learnedJson) setLearnedIds(new Set(JSON.parse(learnedJson)));
    } catch (e) { console.error('[FlashCards] load error:', e); }
  };

  const handleShuffle = useCallback(async () => {
    try {
      const allNotes = await getAllNotes();
      const nonArchived = allNotes.filter(n => !n.isArchived);
      setFlashCards(prepareFlashCards(nonArchived));
    } catch (e) { console.error('[FlashCards] shuffle error:', e); }
  }, []);

  const handleMarkLearned = useCallback(async (noteId) => {
    setLearnedIds(prev => {
      const next = new Set(prev);
      if (next.has(noteId)) next.delete(noteId);
      else next.add(noteId);
      setItem(LEARNED_CARDS_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const fetchMatches = async () => {
    setLoadingMatches(true);
    try { setNewsMatches(await checkNewsMatches()); }
    catch (e) { console.error(e); }
    finally { setLoadingMatches(false); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>

      {/* ── Full-screen gradient background ─────────────────────────────── */}
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFillObject} />

      {/* ── Decorative glow orbs (dark mode only) ─────────────────────── */}
      {isDark && (
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={['rgba(42,125,235,0.42)', 'transparent']}
          style={styles.orbTopRight}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />
        <LinearGradient
          colors={['rgba(59,130,246,0.28)', 'transparent']}
          style={styles.orbBottomLeft}
          start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }}
        />
        <LinearGradient
          colors={['rgba(16,185,129,0.18)', 'transparent']}
          style={styles.orbMidRight}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />
      </View>
      )}

      {/* ── AI Onboarding ───────────────────────────────────────────────── */}
      <AIOnboarding
        visible={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
        onNavigateToBilling={() => navigation.navigate('Billing')}
        creditsPosition={creditsPosition}
      />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 60 }}
        >

          {/* ══════════════════════════════════════════════════════════════
              HERO HEADER
          ══════════════════════════════════════════════════════════════ */}
          <LinearGradient
            colors={headerColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1.2, y: 1 }}
            style={styles.hero}
          >
            {/* Inner decorative circles for depth (dark mode only) */}
            {isDark && (
            <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
              <View style={styles.heroCircleLarge} />
              <View style={styles.heroCircleSmall} />
              <View style={styles.heroCircleTiny} />
            </View>
            )}

            {/* Top shimmer line (dark mode only) */}
            {isDark && <View style={styles.heroShimmer} />}

            {/* ── Row 1: Logo pill + Action buttons ──────────────────── */}
            <View style={styles.heroTopRow}>

              {/* Logo — white background, tappable to navigate home */}
              <TouchableOpacity style={[styles.logoGlow, !isDark && { borderColor: '#E5E7EB' }]} onPress={() => navigation.navigate('NewHome')} activeOpacity={0.8}>
                <Image
                  source={require('../../assets/prepassist-logo.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>

              {/* Action buttons */}
              <View style={styles.heroActions}>
                <View ref={creditsRef} collapsable={false}>
                  <CreditsBadge compact />
                </View>
                {!isWeb && (
                  <TouchableOpacity style={[styles.heroIconBtn, !isDark && { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }]} onPress={() => setShowNotifications(true)}>
                    <Ionicons name="notifications-outline" size={17} color={isDark ? '#FFF' : '#374151'} />
                    {newsMatches.length > 0 && (
                      <View style={styles.notifDot}>
                        <Text style={styles.notifDotText}>{newsMatches.length}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
                {isWeb && <NotificationCenter iconColor={isDark ? '#FFF' : '#374151'} />}
                <TouchableOpacity style={[styles.heroIconBtn, !isDark && { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }]} onPress={() => navigation.navigate('Settings')}>
                  <Ionicons name="settings-outline" size={17} color={isDark ? '#FFF' : '#374151'} />
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Row 2: Greeting + Avatar ────────────────────────────── */}
            <View style={styles.greetingRow}>
              <View style={styles.greetingLeft}>
                {/* Greeting chip */}
                <View style={[styles.greetingChip, !isDark && { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0' }]}>
                  <View style={styles.greetingChipDot} />
                  <Text style={[styles.greetingChipText, !isDark && { color: '#166534' }]}>{greeting}</Text>
                </View>

                {/* Big name */}
                <Text style={[styles.greetingName, !isDark && { color: '#1F2937' }]}>{firstName} 👋</Text>
                <Text style={[styles.greetingTagline, !isDark && { color: '#6B7280' }]}>Your daily UPSC companion</Text>
              </View>

              {/* Avatar */}
              <LinearGradient
                colors={isDark ? ['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.12)'] : ['#2A7DEB', '#3B9AFF']}
                style={[styles.avatarGlass, !isDark && { borderColor: '#DBEAFE' }]}
              >
                <Text style={styles.avatarText}>{initials}</Text>
                {/* Online/active indicator */}
                <View style={[styles.avatarActiveDot, !isDark && { borderColor: '#FFF' }]} />
              </LinearGradient>
            </View>

            {/* ── Row 3: Bottom pills (streak + study tip) ────────────── */}
            <View style={styles.heroPillsRow}>
              {streak.currentStreak > 0 && (
                <TouchableOpacity
                  style={[styles.streakPill, !isDark && { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('Progress')}
                >
                  <Text style={styles.streakFire}>🔥</Text>
                  <Text style={[styles.streakPillText, !isDark && { color: '#92400E' }]}>{streak.currentStreak} Day Streak</Text>
                  <Ionicons name="chevron-forward" size={12} color={isDark ? 'rgba(255,255,255,0.85)' : '#92400E'} />
                </TouchableOpacity>
              )}
              <View style={[styles.examPill, !isDark && { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                <Ionicons name="calendar-outline" size={12} color={isDark ? 'rgba(255,255,255,0.8)' : '#2563EB'} />
                <Text style={[styles.examPillText, !isDark && { color: '#2563EB' }]}>UPSC 2025</Text>
              </View>
            </View>

            {/* Extra padding for overlapping stats */}
            <View style={{ height: 28 }} />
          </LinearGradient>

          {/* ══════════════════════════════════════════════════════════════
              OVERLAPPING STAT CARDS  (pulls up into hero)
          ══════════════════════════════════════════════════════════════ */}
          <View style={[styles.statsRow, { paddingHorizontal: PAD }]}>
            {[
              { label: 'Tests Taken', value: stats.totalTests,     icon: 'clipboard-outline',   gradient: ['#3B9AFF', '#2A7DEB'], glow: 'rgba(42,125,235,0.5)' },
              { label: 'Avg Score',   value: `${avgScore}%`,       icon: 'trophy-outline',      gradient: ['#F6A30E', '#E08D00'], glow: 'rgba(246,163,14,0.5)' },
              { label: 'Questions',   value: stats.totalQuestions,  icon: 'help-circle-outline', gradient: ['#5EC7B2', '#3DA897'], glow: 'rgba(94,199,178,0.5)' },
            ].map((s) => (
              <View
                key={s.label}
                style={[
                  styles.statCard,
                  {
                    backgroundColor: isDark ? 'rgba(15,18,50,0.94)' : 'rgba(255,255,255,0.96)',
                    borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,1)',
                    shadowColor: isDark ? s.glow : 'rgba(0,0,0,0.10)',
                  },
                ]}
              >
                {/* Colored top bar */}
                <LinearGradient
                  colors={s.gradient}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.statTopBar}
                />
                <LinearGradient
                  colors={s.gradient}
                  style={styles.statIconBubble}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  <Ionicons name={s.icon} size={17} color="#FFF" />
                </LinearGradient>
                <Text style={[styles.statValue, { color: textPrimary }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: textMuted }]}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* ══════════════════════════════════════════════════════════════
              BENTO WIDGET GRID
          ══════════════════════════════════════════════════════════════ */}
          <View style={[styles.sectionHeaderRow, { paddingHorizontal: PAD }]}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Start Learning</Text>
            <View style={[styles.countBadge, { backgroundColor: isDark ? 'rgba(42,125,235,0.22)' : 'rgba(42,125,235,0.12)' }]}>
              <Text style={styles.countBadgeText}>{FEATURES.length} tools</Text>
            </View>
          </View>

          <View style={[styles.bentoGrid, { paddingHorizontal: PAD }]}>

            {/* ── Row 1: News Feed (WIDE) ─────────────────────────────── */}
            <TouchableOpacity activeOpacity={0.82} style={styles.wideWidget}
              onPress={() => navigation.navigate('Articles')}>
              <LinearGradient colors={['#3B9AFF', '#2A7DEB']} style={StyleSheet.absoluteFillObject} />
              <View style={styles.widgetShimmer} />
              <View style={styles.wideLeft}>
                <LinearGradient colors={['rgba(255,255,255,0.32)', 'rgba(255,255,255,0.10)']} style={styles.wideIcon}>
                  <Ionicons name="newspaper-outline" size={22} color="#FFF" />
                </LinearGradient>
                <Text style={styles.wideTitle}>News Feed</Text>
                <Text style={styles.wideDesc}>Current affairs</Text>
                <View style={styles.livePill}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              </View>
              <View style={styles.wideRight}>
                <View style={styles.sourceChipsWrap}>
                  {['TH', 'ET', 'PIB'].map((s) => (
                    <View key={s} style={styles.sourceChip}>
                      <Text style={styles.sourceChipText}>{s}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <LinearGradient colors={['rgba(255,255,255,0.50)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.widgetBar} />
            </TouchableOpacity>

            {/* ── Row 2: AI MCQs + AI Mind Map ────────────────────────── */}
            <View style={styles.bentoRow}>
              {/* AI MCQs */}
              <TouchableOpacity activeOpacity={0.82} style={styles.halfWidget}
                onPress={() => navigation.navigate('AIMCQGenerator')}>
                <LinearGradient colors={['#F6A30E', '#E08D00']} style={StyleSheet.absoluteFillObject} />
                <View style={styles.widgetShimmer} />
                <LinearGradient colors={['rgba(255,255,255,0.32)', 'rgba(255,255,255,0.10)']} style={styles.halfIcon}>
                  <Ionicons name="flash-outline" size={20} color="#FFF" />
                </LinearGradient>
                <Text style={styles.halfTitle}>AI MCQs</Text>
                <Text style={styles.halfDesc}>Generate by topic</Text>
                <View style={styles.halfDecorArea}>
                  <View style={styles.tagRow}>
                    {['History', 'Polity', 'Economy'].map((t, i) => (
                      <View key={t} style={[styles.miniTag, { backgroundColor: i === 0 ? 'rgba(255,255,255,0.28)' : i === 1 ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.12)' }]}>
                        <Text style={styles.miniTagText}>{t}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <LinearGradient colors={['rgba(255,255,255,0.50)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.widgetBar} />
              </TouchableOpacity>

              {/* AI Mind Map */}
              <TouchableOpacity activeOpacity={0.82} style={styles.halfWidget}
                onPress={() => navigation.navigate('AIMindMap')}>
                <LinearGradient colors={['#5EC7B2', '#3DA897']} style={StyleSheet.absoluteFillObject} />
                <View style={styles.widgetShimmer} />
                <LinearGradient colors={['rgba(255,255,255,0.32)', 'rgba(255,255,255,0.10)']} style={styles.halfIcon}>
                  <Ionicons name="git-network-outline" size={20} color="#FFF" />
                </LinearGradient>
                <Text style={styles.halfTitle}>AI Mind Map</Text>
                <Text style={styles.halfDesc}>Visual diagrams</Text>
                <View style={styles.halfDecorArea}>
                  <View style={styles.netGraphWrap}>
                    {/* Center hub */}
                    <View style={[styles.netCenterNode, { backgroundColor: 'rgba(255,255,255,0.92)', alignSelf: 'center' }]} />
                    {/* Connector line */}
                    <View style={{ width: 1.5, height: 8, backgroundColor: 'rgba(255,255,255,0.40)', alignSelf: 'center' }} />
                    {/* Satellite row */}
                    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
                      <View style={[styles.netSatNode, { backgroundColor: 'rgba(255,255,255,0.70)' }]} />
                      <View style={[styles.netSatNode, { backgroundColor: 'rgba(255,255,255,0.50)' }]} />
                      <View style={[styles.netSatNode, { backgroundColor: 'rgba(255,255,255,0.70)' }]} />
                    </View>
                  </View>
                </View>
                <LinearGradient colors={['rgba(255,255,255,0.50)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.widgetBar} />
              </TouchableOpacity>
            </View>

            {/* ── Row 3: PDF MCQs + Mains Eval ────────────────────────── */}
            <View style={styles.bentoRow}>
              {/* PDF → MCQs */}
              <TouchableOpacity activeOpacity={0.82} style={styles.halfWidget}
                onPress={() => navigation.navigate('PDFMCQGenerator')}>
                <LinearGradient colors={['#F65E7A', '#D92B4A']} style={StyleSheet.absoluteFillObject} />
                <View style={styles.widgetShimmer} />
                <LinearGradient colors={['rgba(255,255,255,0.32)', 'rgba(255,255,255,0.10)']} style={styles.halfIcon}>
                  <Ionicons name="document-attach-outline" size={20} color="#FFF" />
                </LinearGradient>
                <Text style={styles.halfTitle}>PDF → MCQs</Text>
                <Text style={styles.halfDesc}>From your PDFs</Text>
                <View style={styles.halfDecorArea}>
                  <View style={styles.docLines}>
                    {[90, 70, 80, 55].map((w, i) => (
                      <View key={i} style={[styles.docLine, { width: `${w}%`, backgroundColor: `rgba(255,255,255,${i === 0 ? 0.65 : i === 1 ? 0.40 : i === 2 ? 0.52 : 0.28})` }]} />
                    ))}
                  </View>
                </View>
                <LinearGradient colors={['rgba(255,255,255,0.50)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.widgetBar} />
              </TouchableOpacity>

              {/* Mains Eval */}
              <TouchableOpacity activeOpacity={0.82} style={styles.halfWidget}
                onPress={() => navigation.navigate('Essay')}>
                <LinearGradient colors={['#FF8C38', '#E06000']} style={StyleSheet.absoluteFillObject} />
                <View style={styles.widgetShimmer} />
                <LinearGradient colors={['rgba(255,255,255,0.32)', 'rgba(255,255,255,0.10)']} style={styles.halfIcon}>
                  <Ionicons name="document-text-outline" size={20} color="#FFF" />
                </LinearGradient>
                <Text style={styles.halfTitle}>Mains Eval</Text>
                <Text style={styles.halfDesc}>Answer writing</Text>
                <View style={styles.halfDecorArea}>
                  <View style={styles.scoreWrap}>
                    <View style={styles.scoreTrack}>
                      <LinearGradient
                        colors={['rgba(255,255,255,0.92)', 'rgba(255,255,255,0.55)']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={[styles.scoreFill, { width: '72%' }]}
                      />
                    </View>
                    <Text style={styles.scoreLabel}>72%</Text>
                  </View>
                </View>
                <LinearGradient colors={['rgba(255,255,255,0.50)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.widgetBar} />
              </TouchableOpacity>
            </View>

            {/* ── Row 4: My Notes (WIDE) ───────────────────────────────── */}
            <TouchableOpacity activeOpacity={0.82} style={styles.wideWidget}
              onPress={() => navigation.navigate('Notes')}>
              <LinearGradient colors={['#2A7DEB', '#5EC7B2']} style={StyleSheet.absoluteFillObject} />
              <View style={styles.widgetShimmer} />
              <View style={styles.wideLeft}>
                <LinearGradient colors={['rgba(255,255,255,0.32)', 'rgba(255,255,255,0.10)']} style={styles.wideIcon}>
                  <Ionicons name="journal-outline" size={22} color="#FFF" />
                </LinearGradient>
                <Text style={styles.wideTitle}>My Notes</Text>
                <Text style={styles.wideDesc}>Create & organise</Text>
              </View>
              <View style={styles.wideRight}>
                <View style={styles.noteStackWrap}>
                  <View style={[styles.noteStackCard, { backgroundColor: 'rgba(255,255,255,0.22)', borderColor: 'rgba(255,255,255,0.30)', top: 0, left: 8, transform: [{ rotate: '6deg' }] }]}>
                    <View style={styles.noteStackLine} />
                    <View style={[styles.noteStackLine, { width: '70%' }]} />
                  </View>
                  <View style={[styles.noteStackCard, { backgroundColor: 'rgba(255,255,255,0.16)', borderColor: 'rgba(255,255,255,0.22)', top: 6, left: 3, transform: [{ rotate: '2deg' }] }]}>
                    <View style={styles.noteStackLine} />
                    <View style={[styles.noteStackLine, { width: '55%' }]} />
                  </View>
                  <View style={[styles.noteStackCard, { backgroundColor: 'rgba(255,255,255,0.32)', borderColor: 'rgba(255,255,255,0.46)', top: 12, left: 0 }]}>
                    <View style={styles.noteStackLine} />
                    <View style={[styles.noteStackLine, { width: '80%' }]} />
                  </View>
                </View>
              </View>
              <LinearGradient colors={['rgba(255,255,255,0.50)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.widgetBar} />
            </TouchableOpacity>

            {/* ── Row 4b: Saved Articles (WIDE) ────────────────────────── */}
            <TouchableOpacity activeOpacity={0.82} style={styles.wideWidget}
              onPress={() => navigation.navigate('SavedArticles')}>
              <LinearGradient colors={['#F472B6', '#DB2777']} style={StyleSheet.absoluteFillObject} />
              <View style={styles.widgetShimmer} />
              <View style={styles.wideLeft}>
                <LinearGradient colors={['rgba(255,255,255,0.32)', 'rgba(255,255,255,0.10)']} style={styles.wideIcon}>
                  <Ionicons name="bookmark-outline" size={22} color="#FFF" />
                </LinearGradient>
                <Text style={styles.wideTitle}>Saved Articles</Text>
                <Text style={styles.wideDesc}>Your clipped URLs</Text>
              </View>
              <View style={styles.wideRight}>
                <View style={styles.noteStackWrap}>
                  <View style={[styles.noteStackCard, { backgroundColor: 'rgba(255,255,255,0.22)', borderColor: 'rgba(255,255,255,0.30)', top: 0, left: 8, transform: [{ rotate: '-4deg' }] }]}>
                    <View style={styles.noteStackLine} />
                    <View style={[styles.noteStackLine, { width: '60%' }]} />
                  </View>
                  <View style={[styles.noteStackCard, { backgroundColor: 'rgba(255,255,255,0.32)', borderColor: 'rgba(255,255,255,0.46)', top: 10, left: 0 }]}>
                    <View style={styles.noteStackLine} />
                    <View style={[styles.noteStackLine, { width: '75%' }]} />
                  </View>
                </View>
              </View>
              <LinearGradient colors={['rgba(255,255,255,0.50)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.widgetBar} />
            </TouchableOpacity>

            {/* ── Row 5: AI Notes + Question Bank ─────────────────────── */}
            <View style={styles.bentoRow}>
              {/* AI Notes Maker */}
              <TouchableOpacity activeOpacity={0.82} style={styles.halfWidget}
                onPress={() => navigation.navigate('AINotesMaker')}>
                <LinearGradient colors={['#34D399', '#059669']} style={StyleSheet.absoluteFillObject} />
                <View style={styles.widgetShimmer} />
                <LinearGradient colors={['rgba(255,255,255,0.32)', 'rgba(255,255,255,0.10)']} style={styles.halfIcon}>
                  <Ionicons name="sparkles-outline" size={20} color="#FFF" />
                </LinearGradient>
                <Text style={styles.halfTitle}>AI Notes</Text>
                <Text style={styles.halfDesc}>Smart summaries</Text>
                <View style={styles.halfDecorArea}>
                  <View style={styles.waveformWrap}>
                    {[18, 28, 40, 22, 32, 19, 29].map((h, i) => (
                      <LinearGradient
                        key={i}
                        colors={['rgba(255,255,255,0.92)', 'rgba(255,255,255,0.38)']}
                        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                        style={[styles.wavBar, { height: h }]}
                      />
                    ))}
                  </View>
                </View>
                <LinearGradient colors={['rgba(255,255,255,0.50)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.widgetBar} />
              </TouchableOpacity>

              {/* Question Bank */}
              <TouchableOpacity activeOpacity={0.82} style={styles.halfWidget}
                onPress={() => navigation.navigate('QuestionSetList')}>
                <LinearGradient colors={['#F6A30E', '#D4890B']} style={StyleSheet.absoluteFillObject} />
                <View style={styles.widgetShimmer} />
                <LinearGradient colors={['rgba(255,255,255,0.32)', 'rgba(255,255,255,0.10)']} style={styles.halfIcon}>
                  <Ionicons name="library-outline" size={20} color="#FFF" />
                </LinearGradient>
                <Text style={styles.halfTitle}>Question Bank</Text>
                <Text style={styles.halfDesc}>Practice questions</Text>
                <View style={styles.halfDecorArea}>
                  <Text style={styles.qBankNum}>500+</Text>
                  <Text style={styles.qBankLabel}>Questions</Text>
                </View>
                <LinearGradient colors={['rgba(255,255,255,0.50)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.widgetBar} />
              </TouchableOpacity>
            </View>

            {/* ── Row 6: Progress (WIDE) ───────────────────────────────── */}
            <TouchableOpacity activeOpacity={0.82} style={styles.wideWidget}
              onPress={() => navigation.navigate('Progress')}>
              <LinearGradient colors={['#4ADE80', '#16A34A']} style={StyleSheet.absoluteFillObject} />
              <View style={styles.widgetShimmer} />
              <View style={styles.wideLeft}>
                <LinearGradient colors={['rgba(255,255,255,0.32)', 'rgba(255,255,255,0.10)']} style={styles.wideIcon}>
                  <Ionicons name="bar-chart-outline" size={22} color="#FFF" />
                </LinearGradient>
                <Text style={styles.wideTitle}>Progress</Text>
                <Text style={styles.wideDesc}>Charts & analytics</Text>
              </View>
              <View style={styles.wideRight}>
                <View style={styles.barChart}>
                  {[{ h: 55, l: 'M' }, { h: 80, l: 'T' }, { h: 45, l: 'W' }, { h: 90, l: 'T' }, { h: 65, l: 'F' }].map(({ h, l }, i) => (
                    <View key={i} style={styles.barChartCol}>
                      <LinearGradient
                        colors={['rgba(255,255,255,0.92)', 'rgba(255,255,255,0.38)']}
                        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                        style={[styles.barChartBar, { height: Math.round(h * 0.55) }]}
                      />
                      <Text style={styles.barChartLabel}>{l}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <LinearGradient colors={['rgba(255,255,255,0.50)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.widgetBar} />
            </TouchableOpacity>

            {/* ── Row 7: Study Roadmap (WIDE) ─────────────────────────── */}
            <TouchableOpacity activeOpacity={0.82} style={[styles.wideWidget, { opacity: 0.85 }]}
              onPress={() => navigation.navigate('ComingSoon', { featureName: 'Study Roadmap' })}>
              <LinearGradient colors={['#3D565E', '#2A7DEB']} style={StyleSheet.absoluteFillObject} />
              <View style={styles.widgetShimmer} />
              <View style={styles.soonBadge}><Text style={styles.soonText}>SOON</Text></View>
              <View style={styles.wideLeft}>
                <LinearGradient colors={['rgba(255,255,255,0.32)', 'rgba(255,255,255,0.10)']} style={styles.wideIcon}>
                  <Ionicons name="map-outline" size={22} color="#FFF" />
                </LinearGradient>
                <Text style={styles.wideTitle}>Study Roadmap</Text>
                <Text style={styles.wideDesc}>Full UPSC syllabus map</Text>
                <View style={[styles.livePill, { marginTop: 10 }]}>
                  <View style={[styles.liveDot, { backgroundColor: '#A3E4D7' }]} />
                  <Text style={[styles.liveText, { color: '#A3E4D7' }]}>Coming Soon</Text>
                </View>
              </View>
              <View style={styles.wideRight}>
                <View style={styles.mapGridWrap}>
                  {MAP_DOT_OPACITIES.map((op, i) => (
                    <View key={i} style={[styles.mapDot, { backgroundColor: `rgba(255,255,255,${op})` }]} />
                  ))}
                </View>
              </View>
              <LinearGradient colors={['rgba(255,255,255,0.50)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.widgetBar} />
            </TouchableOpacity>

          </View>

          {/* ══════════════════════════════════════════════════════════════
              POPULAR TOPICS
          ══════════════════════════════════════════════════════════════ */}
          <View style={[styles.sectionHeaderRow, { paddingHorizontal: PAD }]}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Popular Topics</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.topicsRow, { paddingHorizontal: PAD }]}
            style={{ marginBottom: 28 }}
          >
            {TOPICS.map((t) => (
              <TouchableOpacity
                key={t.label}
                activeOpacity={0.75}
                style={[
                  styles.topicChip,
                  {
                    backgroundColor: isDark ? `${t.color}22` : `${t.color}18`,
                    borderColor: isDark ? `${t.color}55` : `${t.color}44`,
                  },
                ]}
                onPress={() => navigation.navigate('Config', { topic: t.label })}
              >
                <View style={[styles.topicIconDot, { backgroundColor: t.color }]}>
                  <Ionicons name={t.icon} size={11} color="#FFF" />
                </View>
                <Text style={[styles.topicLabel, { color: t.color }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ══════════════════════════════════════════════════════════════
              FLASH CARDS
          ══════════════════════════════════════════════════════════════ */}
          <View style={[styles.sectionHeaderRow, { paddingHorizontal: PAD }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>Flash Cards</Text>
              <Text style={[styles.flashSectionSub, { color: textMuted }]}>Quick revision from your notes</Text>
            </View>
            {flashCards.length > 0 && (
              <TouchableOpacity
                style={[styles.shuffleBtn, { backgroundColor: isDark ? 'rgba(42,125,235,0.18)' : 'rgba(42,125,235,0.08)' }]}
                onPress={handleShuffle}
              >
                <Ionicons name="shuffle-outline" size={14} color="#2A7DEB" />
                <Text style={styles.shuffleBtnText}>Shuffle</Text>
              </TouchableOpacity>
            )}
          </View>

          {flashCards.length === 0 ? (
            <View style={[styles.flashEmptyCard, { backgroundColor: 'transparent', marginHorizontal: PAD }]}>
              <LinearGradient
                colors={isDark ? ['rgba(42,125,235,0.22)', 'rgba(42,125,235,0.14)'] : ['rgba(94,199,178,0.18)', 'rgba(94,199,178,0.10)']}
                style={styles.flashEmptyIcon}
              >
                <Ionicons name="layers-outline" size={30} color={isDark ? 'rgba(255,255,255,0.50)' : '#8B7FF0'} />
              </LinearGradient>
              <Text style={[styles.flashEmptyTitle, { color: textPrimary }]}>No Flash Cards Yet</Text>
              <Text style={[styles.flashEmptyDesc, { color: textMuted }]}>
                Create notes to see them appear here as revision cards.
              </Text>
              <TouchableOpacity
                style={styles.flashEmptyCta}
                onPress={() => navigation.navigate('Notes')}
              >
                <LinearGradient
                  colors={['#5EC7B2', '#3DA897']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.flashEmptyCtaInner}
                >
                  <Ionicons name="add-outline" size={17} color="#FFF" />
                  <Text style={styles.flashEmptyCtaText}>Create a Note</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.flashCarouselContent, { paddingHorizontal: PAD }]}
              style={{ marginBottom: 28 }}
            >
              {flashCards.map((card) => {
                const isLearned = learnedIds.has(card.id);
                const src = SOURCE_TYPE_CONFIG[card.sourceType] || SOURCE_TYPE_CONFIG.manual;
                return (
                  <TouchableOpacity
                    key={card.id}
                    activeOpacity={0.82}
                    style={[
                      styles.flashCard,
                      {
                        backgroundColor: isDark ? glassBg : '#FEFEFE',
                        borderColor: isDark ? glassBorder : 'rgba(0,0,0,0.04)',
                        opacity: isLearned ? 0.55 : 1,
                        shadowColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(100,100,140,0.12)',
                      },
                    ]}
                    onPress={() => navigation.navigate('NoteEditor', { noteId: card.id })}
                    onLongPress={() => handleMarkLearned(card.id)}
                  >
                    <View style={[styles.flashAccentBar, { backgroundColor: src.color }]} />
                    <View style={styles.flashTopRow}>
                      <Text style={[styles.flashSourceLabel, { color: src.color }]}>
                        {card.sourceType === 'current_affairs' ? 'CURRENT AFFAIRS' : (card.sourceType || 'manual').toUpperCase()}
                      </Text>
                      {isLearned && (
                        <View>
                          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                        </View>
                      )}
                    </View>
                    <Text style={[styles.flashTitle, { color: textPrimary }]} numberOfLines={2}>
                      {card.title}
                    </Text>
                    <Text style={[styles.flashSummary, { color: textMuted }]} numberOfLines={3}>
                      {card.summary}
                    </Text>
                    {card.tags.length > 0 && (
                      <View style={styles.flashTagsRow}>
                        {card.tags.map(tag => (
                          <View key={tag.id} style={[styles.flashTagChip, { backgroundColor: `${tag.color}14` }]}>
                            <Text style={[styles.flashTagText, { color: tag.color }]}>{tag.name}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    <View style={styles.flashDateRow}>
                      <Ionicons name="time-outline" size={11} color={textMuted} />
                      <Text style={[styles.flashDateText, { color: textMuted }]}>
                        {formatFlashDate(card.updatedAt)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Add More Notes card */}
              <TouchableOpacity
                activeOpacity={0.82}
                style={[
                  styles.flashCard,
                  styles.flashAddCard,
                  {
                    backgroundColor: isDark ? 'rgba(42,125,235,0.10)' : 'rgba(42,125,235,0.05)',
                    borderColor: isDark ? 'rgba(42,125,235,0.25)' : 'rgba(42,125,235,0.15)',
                    borderStyle: 'dashed',
                  },
                ]}
                onPress={() => navigation.navigate('Notes')}
              >
                <View style={styles.flashAddIconWrap}>
                  <Ionicons name="add-circle-outline" size={32} color="#5EC7B2" />
                </View>
                <Text style={[styles.flashAddTitle, { color: isDark ? '#A3E4D7' : '#2A7DEB' }]}>Add More Notes</Text>
                <Text style={[styles.flashAddDesc, { color: textMuted }]}>
                  Create notes to generate more flash cards
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* ══════════════════════════════════════════════════════════════
              MOTIVATIONAL CARD
          ══════════════════════════════════════════════════════════════ */}
          <View style={{ paddingHorizontal: PAD }}>
            <LinearGradient
              colors={isDark ? ['#0C2D5E', '#0E2478', '#0A1850'] : ['#2A7DEB', '#5EC7B2']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.motivationCard}
            >
              {/* Top shimmer */}
              <View style={styles.motivationShimmer} />
              {/* Decorative circle */}
              <View style={styles.motivationCircle} />

              <Text style={styles.bigQuoteMark}>"</Text>
              <Text style={styles.quoteBody}>
                Success is not final, failure is not fatal: it is the courage to continue that counts.
              </Text>
              <View style={styles.quoteFooter}>
                <View style={styles.quoteLine} />
                <Text style={styles.quoteAuthor}>Winston Churchill</Text>
              </View>
            </LinearGradient>
          </View>

        </ScrollView>
      </SafeAreaView>

      {/* ══════════════════════════════════════════════════════════════════════
          KNOWLEDGE RADAR MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={showNotifications}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNotifications(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[
            styles.modalSheet,
            {
              backgroundColor: isDark ? 'rgba(10,12,36,0.98)' : 'rgba(252,252,255,0.98)',
              borderColor: glassBorder,
            },
          ]}>
            <View style={styles.modalPull} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: textPrimary }]}>Knowledge Radar</Text>
                <Text style={[styles.modalSub, { color: textMuted }]}>News matching your study tags</Text>
              </View>
              <View style={styles.modalHeaderRight}>
                <TouchableOpacity
                  style={[styles.circleBtn, { backgroundColor: 'rgba(42,125,235,0.18)' }]}
                  onPress={async () => {
                    setLoadingMatches(true);
                    setNewsMatches(await forceRefreshMatches());
                    setLoadingMatches(false);
                  }}
                >
                  <Ionicons name="refresh" size={16} color="#2A7DEB" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.circleBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
                  onPress={() => setShowNotifications(false)}
                >
                  <Ionicons name="close" size={17} color={isDark ? '#FFF' : '#333'} />
                </TouchableOpacity>
              </View>
            </View>

            {loadingMatches ? (
              <View style={styles.emptyState}>
                <LinearGradient colors={['#2A7DEB', '#4A90D9']} style={styles.loadingBubble}>
                  <Ionicons name="sync" size={26} color="#FFF" />
                </LinearGradient>
                <Text style={[styles.emptyText, { color: textMuted }]}>Scanning news for your topics…</Text>
              </View>
            ) : (
              <FlatList
                data={newsMatches}
                keyExtractor={(item, i) => `${item.articleId}-${i}`}
                contentContainerStyle={{ paddingBottom: 40 }}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <View style={[styles.emptyIconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)' }]}>
                      <Ionicons name="telescope-outline" size={36} color={isDark ? 'rgba(255,255,255,0.35)' : '#C0C0C0'} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: textPrimary }]}>No Matches Yet</Text>
                    <Text style={[styles.emptyText, { color: textMuted }]}>
                      Create notes or add tags to topics. We'll alert you when related news appears.
                    </Text>
                    <TouchableOpacity
                      style={styles.goNotesBtn}
                      onPress={() => { setShowNotifications(false); navigation.navigate('Notes'); }}
                    >
                      <LinearGradient
                        colors={['#2A7DEB', '#4A90D9']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={styles.goNotesBtnInner}
                      >
                        <Text style={styles.goNotesText}>Go to Notes</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.matchCard,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.055)' : 'rgba(0,0,0,0.025)',
                        borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)',
                      },
                    ]}
                    onPress={async () => {
                      await markMatchAsRead(item.articleId);
                      setShowNotifications(false);
                      navigation.navigate('ArticleDetail', { articleId: item.articleId });
                    }}
                  >
                    <View style={[styles.matchTag, { backgroundColor: item.tagColor || '#2A7DEB' }]}>
                      <Ionicons name="pricetag" size={9} color="#FFF" />
                      <Text style={styles.matchTagText}>{item.matchedTag || 'Topic Match'}</Text>
                    </View>
                    <Text style={[styles.matchTitle, { color: textPrimary }]} numberOfLines={2}>
                      {item.articleTitle}
                    </Text>
                    {item.articleSummary && (
                      <Text style={[styles.matchSummary, { color: textMuted }]} numberOfLines={2}>
                        {item.articleSummary}
                      </Text>
                    )}
                    <View style={styles.matchFooter}>
                      {item.articleSource && (
                        <Text style={[styles.matchSource, { color: isDark ? 'rgba(255,255,255,0.3)' : '#C0C0C0' }]}>
                          {item.articleSource}
                        </Text>
                      )}
                      <View style={styles.readRow}>
                        <Text style={styles.readText}>Read Article</Text>
                        <Ionicons name="arrow-forward" size={13} color="#2A7DEB" />
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  // Background orbs
  orbTopRight: {
    position: 'absolute', width: 380, height: 380, borderRadius: 190,
    top: -120, right: -100,
  },
  orbBottomLeft: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    bottom: 160, left: -80,
  },
  orbMidRight: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    top: '45%', right: -50,
  },

  // ── Hero ───────────────────────────────────────────────────────────────────
  hero: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 0,                  // no bottom padding — stats overlap
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
  },

  // Hero inner decorative circles
  heroCircleLarge: {
    position: 'absolute',
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(255,255,255,0.055)',
    top: -60, right: -70,
  },
  heroCircleSmall: {
    position: 'absolute',
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: 30, left: -30,
  },
  heroCircleTiny: {
    position: 'absolute',
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: 20, left: '45%',
  },

  // Shimmer top line
  heroShimmer: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },

  // Top row: logo + actions
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },

  // Logo — frosted glass backdrop so logo is always visible
  logoGlow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexShrink: 1,
  },
  logoImage: {
    width: 110,
    height: 44,
  },

  heroActions: { flexDirection: 'row', alignItems: 'center', flexShrink: 0, marginLeft: 10 },
  heroIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.30)',
    justifyContent: 'center', alignItems: 'center',
    position: 'relative',
    marginLeft: 10,
  },
  notifDot: {
    position: 'absolute', top: -2, right: -2,
    backgroundColor: '#FF4757',
    minWidth: 17, height: 17, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: 'rgba(15,10,60,0.85)',
  },
  notifDotText: { color: '#FFF', fontSize: 9, fontWeight: '800' },

  // Greeting row
  greetingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  greetingLeft: { flex: 1 },

  greetingChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    marginBottom: 10,
  },
  greetingChipDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#4ADE80' },
  greetingChipText: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '600', letterSpacing: 0.2 },

  greetingName: { fontSize: 34, color: '#FFF', fontWeight: '800', letterSpacing: -1.1, marginBottom: 4 },
  greetingTagline: { fontSize: 13, color: 'rgba(255,255,255,0.60)', fontWeight: '400' },

  avatarGlass: {
    width: 58, height: 58, borderRadius: 29,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.45)',
    justifyContent: 'center', alignItems: 'center',
    marginLeft: 12, position: 'relative',
  },
  avatarText: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  avatarActiveDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#4ADE80',
    borderWidth: 2, borderColor: 'rgba(30,20,100,0.8)',
  },

  // Pills row
  heroPillsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 0 },
  streakPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.30)',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 24, gap: 6,
  },
  streakFire: { fontSize: 16 },
  streakPillText: { fontSize: 13, color: '#FFF', fontWeight: '700', letterSpacing: -0.2 },
  examPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 24,
  },
  examPillText: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },

  // ── Stats (overlapping hero) ───────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: -28,       // pulls cards up into the hero
    marginBottom: 28,
    zIndex: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    paddingTop: 0,
    paddingBottom: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 14,
    gap: 6,
  },
  statTopBar: { height: 4, width: '100%', marginBottom: 14 },
  statIconBubble: {
    width: 40, height: 40, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 2,
  },
  statValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.7 },
  statLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center', letterSpacing: 0.1 },

  // ── Section headers ───────────────────────────────────────────────────────
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.4 },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  countBadgeText: { fontSize: 11, fontWeight: '700', color: '#5EC7B2', letterSpacing: 0.2 },

  // ── Feature grid ──────────────────────────────────────────────────────────
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP, marginBottom: 28 },
  featureCard: {
    borderRadius: 22, padding: 16, paddingBottom: 0,
    borderWidth: 1, overflow: 'hidden', position: 'relative',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  featureCardSoon: { opacity: 0.62 },
  featureIconBubble: {
    width: 52, height: 52, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  soonBadge: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  soonText: { color: '#FFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  featureTitle: { fontSize: 14, fontWeight: '700', letterSpacing: -0.3, marginBottom: 3 },
  featureDesc: { fontSize: 12, fontWeight: '400', marginBottom: 14 },
  cardAccentBar: { height: 4, borderRadius: 2, marginHorizontal: -16 },

  // ── Flash Cards ──────────────────────────────────────────────────────────
  flashSectionSub: { fontSize: 12, fontWeight: '400', marginTop: 2 },
  flashCarouselContent: { gap: 0, paddingBottom: 4 },
  flashCard: {
    width: 270, minHeight: 190, borderRadius: 22,
    padding: 18, paddingLeft: 24, marginRight: 14, borderWidth: 1,
    overflow: 'hidden', justifyContent: 'space-between',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 20, elevation: 4,
  },
  flashAccentBar: {
    position: 'absolute', left: 0, top: 16, bottom: 16,
    width: 3, borderRadius: 1.5,
  },
  flashSourceLabel: {
    fontSize: 10, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase',
  },
  flashTopRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  flashTitle: { fontSize: 16, fontWeight: '600', letterSpacing: -0.3, lineHeight: 22 },
  flashSummary: { fontSize: 12, lineHeight: 18, flex: 1 },
  flashTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  flashTagChip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, borderWidth: 0 },
  flashTagText: { fontSize: 10, fontWeight: '600' },
  flashDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  flashDateText: { fontSize: 11, fontWeight: '500' },
  shuffleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
  },
  shuffleBtnText: { fontSize: 11, fontWeight: '700', color: '#2A7DEB', letterSpacing: 0.2 },
  flashAddCard: {
    alignItems: 'center', justifyContent: 'center',
  },
  flashAddIconWrap: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(42,125,235,0.10)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  flashAddTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6, letterSpacing: -0.2 },
  flashAddDesc: { fontSize: 12, textAlign: 'center', lineHeight: 17, paddingHorizontal: 12 },
  flashEmptyCard: {
    borderRadius: 24, padding: 32, borderWidth: 0,
    alignItems: 'center', marginBottom: 28,
  },
  flashEmptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    justifyContent: 'center', alignItems: 'center', marginBottom: 18,
  },
  flashEmptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8, letterSpacing: -0.3 },
  flashEmptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 22, paddingHorizontal: 16 },
  flashEmptyCta: { borderRadius: 50, overflow: 'hidden' },
  flashEmptyCtaInner: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 28, paddingVertical: 14,
  },
  flashEmptyCtaText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  // ── Topics ────────────────────────────────────────────────────────────────
  topicsRow: { gap: 10, paddingBottom: 4 },
  topicChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 24, gap: 8, borderWidth: 1,
  },
  topicIconDot: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  topicLabel: { fontSize: 13, fontWeight: '700', letterSpacing: -0.2 },

  // ── Motivation ────────────────────────────────────────────────────────────
  motivationCard: { borderRadius: 26, padding: 26, marginBottom: 8, overflow: 'hidden' },
  motivationShimmer: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  motivationCircle: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.04)',
    top: -60, right: -40,
  },
  bigQuoteMark: { fontSize: 72, color: 'rgba(255,255,255,0.18)', fontWeight: '900', lineHeight: 62, marginBottom: 4 },
  quoteBody: { fontSize: 16, color: '#FFF', fontWeight: '500', lineHeight: 26, letterSpacing: -0.3 },
  quoteFooter: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 },
  quoteLine: { width: 28, height: 2, backgroundColor: 'rgba(255,255,255,0.45)', borderRadius: 1 },
  quoteAuthor: { fontSize: 13, color: 'rgba(255,255,255,0.72)', fontWeight: '600' },

  // ── Modal ─────────────────────────────────────────────────────────────────
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.70)', justifyContent: 'flex-end' },
  modalSheet: {
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    padding: 20, maxHeight: '84%', borderWidth: 1,
  },
  modalPull: {
    width: 38, height: 4, backgroundColor: 'rgba(140,140,170,0.4)',
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  modalTitle: { fontSize: 22, fontWeight: '800', marginBottom: 3, letterSpacing: -0.5 },
  modalSub: { fontSize: 13 },
  modalHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  circleBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  emptyState: { alignItems: 'center', paddingVertical: 44, gap: 12 },
  loadingBubble: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.4 },
  emptyText: { textAlign: 'center', fontSize: 14, lineHeight: 20, paddingHorizontal: 20 },
  goNotesBtn: { marginTop: 16, borderRadius: 14, overflow: 'hidden' },
  goNotesBtnInner: { paddingHorizontal: 30, paddingVertical: 14 },
  goNotesText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  matchCard: { borderRadius: 18, padding: 16, marginBottom: 10, borderWidth: 1 },
  matchTag: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, marginBottom: 9, gap: 4,
  },
  matchTagText: { color: '#FFF', fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  matchTitle: { fontSize: 15, fontWeight: '600', marginBottom: 5, lineHeight: 22 },
  matchSummary: { fontSize: 13, marginBottom: 10, lineHeight: 19 },
  matchFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  matchSource: { fontSize: 12 },
  readRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  readText: { fontSize: 13, fontWeight: '700', color: '#2A7DEB' },

  // ── Bento widget grid ──────────────────────────────────────────────────────
  bentoGrid: { marginBottom: 28 },
  bentoRow: { flexDirection: 'row', gap: CARD_GAP, marginBottom: CARD_GAP, alignItems: 'stretch' },

  // Wide widget (full row)
  wideWidget: {
    flexDirection: 'row',
    borderRadius: 24,
    overflow: 'hidden',
    height: 155,
    marginBottom: CARD_GAP,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 22,
    elevation: 12,
  },
  widgetShimmer: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.32)', zIndex: 1,
  },
  wideLeft: {
    flex: 1, padding: 18, paddingBottom: 22, justifyContent: 'center',
  },
  wideRight: {
    width: 118, paddingVertical: 14, paddingHorizontal: 10,
    justifyContent: 'center', alignItems: 'center',
    borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.14)',
  },
  wideIcon: {
    width: 46, height: 46, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  wideTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5, color: '#FFF', marginBottom: 3 },
  wideDesc: { fontSize: 12, fontWeight: '400', color: 'rgba(255,255,255,0.65)' },

  // Half widget
  halfWidget: {
    flex: 1, borderRadius: 24, overflow: 'hidden',
    padding: 14, paddingBottom: 20,
    minHeight: 200,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45, shadowRadius: 22, elevation: 12,
  },
  halfWidgetFiller: { flex: 1 },
  halfIcon: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  halfTitle: { fontSize: 15, fontWeight: '800', letterSpacing: -0.4, color: '#FFF', marginBottom: 3 },
  halfDesc: { fontSize: 11, fontWeight: '400', color: 'rgba(255,255,255,0.65)', marginBottom: 8 },
  halfDecorArea: { flex: 1, justifyContent: 'flex-end' },

  // Accent bar at the bottom of every widget
  widgetBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 4,
  },

  // News Feed decorations
  livePill: { flexDirection: 'row', alignItems: 'center', marginTop: 9, gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#FF4757' },
  liveText: { fontSize: 9, fontWeight: '900', color: '#FF4757', letterSpacing: 0.9 },
  sourceChipsWrap: { flexDirection: 'column', gap: 7, alignItems: 'center' },
  sourceChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.30)',
  },
  sourceChipText: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.94)', letterSpacing: 0.5 },

  // AI MCQs topic tags
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  miniTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  miniTagText: { fontSize: 9, fontWeight: '700', color: '#FFF', letterSpacing: 0.2 },

  // AI Mind Map network graph
  netGraphWrap: { width: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 0 },
  netCenterNode: { width: 18, height: 18, borderRadius: 9 },
  netSatNode: { width: 11, height: 11, borderRadius: 5.5 },
  netConnector: { width: 22, height: 1.5, backgroundColor: 'rgba(255,255,255,0.48)' },

  // PDF MCQs document lines
  docLines: { gap: 6 },
  docLine: { height: 3, borderRadius: 2 },

  // Mains Eval score bar
  scoreWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden' },
  scoreFill: { height: '100%', borderRadius: 3 },
  scoreLabel: { fontSize: 13, fontWeight: '800', color: '#FFF' },

  // My Notes stacked cards
  noteStackWrap: { width: 84, height: 78, position: 'relative' },
  noteStackCard: {
    position: 'absolute', width: 72, height: 52,
    borderRadius: 10, padding: 9, gap: 8, borderWidth: 1,
  },
  noteStackLine: { width: '100%', height: 3, backgroundColor: 'rgba(255,255,255,0.45)', borderRadius: 2 },

  // AI Notes waveform bars
  waveformWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 44, overflow: 'hidden' },
  wavBar: { width: 9, borderRadius: 4 },

  // Question Bank big number
  qBankNum: { fontSize: 30, fontWeight: '800', color: '#FFF', letterSpacing: -0.8 },
  qBankLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.72)', marginTop: 2 },

  // Progress bar chart
  barChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 5 },
  barChartCol: { alignItems: 'center', gap: 4 },
  barChartBar: { width: 14, borderRadius: 5 },
  barChartLabel: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.80)' },

  // Study Roadmap map dots
  mapGridWrap: { flexDirection: 'row', flexWrap: 'wrap', width: 54, gap: 6 },
  mapDot: { width: 8, height: 8, borderRadius: 2 },
});
