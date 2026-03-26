/**
 * NewHomeScreen – Clean minimal UI matching reference design
 * Data: Firebase Firestore with AsyncStorage fallback
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
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { getAllNotes, deleteNote } from '../features/Notes/services/localNotesStorage';
import { getItem, setItem } from '../features/Notes/services/storage';

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

// ── Warm icon color ───────────────────────────────────────────────────────────
const ICON_COLOR = '#C4956A';
const ICON_BG = '#FDF5EE';

// ── Feature Data ──────────────────────────────────────────────────────────────
const FEATURES = [
  { id: 'articles',      icon: 'newspaper-outline',       title: 'Daily Current Affairs', desc: 'Stay updated with daily news & analysis',       screen: 'Articles' },
  { id: 'essay',         icon: 'create-outline',          title: 'Mains Answer Evaluation', desc: 'Get your answers reviewed & scored',          screen: 'Essay' },
  { id: 'pdfmcq',        icon: 'grid-outline',            title: 'PDF to MCQ Quiz',       desc: 'Convert any PDF into practice quizzes',         screen: 'PDFMCQGenerator' },
  { id: 'notes',         icon: 'book-outline',            title: 'Notes',                 desc: 'Manage notes across all subjects',              screen: 'Notes' },
  { id: 'ainotesmaker',  icon: 'sparkles-outline',        title: 'AI Notes Maker',        desc: 'Auto-generate notes from any topic',            screen: 'AINotesMaker' },
  { id: 'questionbank',  icon: 'library-outline',         title: 'Question Bank',         desc: 'Your saved questions collection',               screen: 'QuestionBank' },
  { id: 'progress',      icon: 'trending-up-outline',     title: 'Progress',              desc: 'Track your preparation journey',                screen: 'Progress' },
  { id: 'roadmap',       icon: 'apps-outline',            title: 'Study Roadmap',         desc: 'Your personalized study plan',                  screen: 'ComingSoon', comingSoon: true },
  { id: 'savedarticles', icon: 'bookmark-outline',        title: 'Saved Articles',        desc: 'Your clipped URLs & bookmarks',                 screen: 'SavedArticles' },
  { id: 'aimcq',         icon: 'flash-outline',           title: 'AI MCQs Generate',      desc: 'Generate MCQs by any topic',                    screen: 'AIMCQGenerator' },
  { id: 'aimindmap',     icon: 'git-network-outline',     title: 'AI Mind Map',           desc: 'AI-powered visual diagrams',                    screen: 'AIMindMap' },
];

// ── Flash Cards helpers ───────────────────────────────────────────────────────
const FLASH_CARD_LIMIT = 15;
const LEARNED_CARDS_KEY = '@upsc_flash_learned';

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
    tags: note.tags.slice(0, 3).map(t => typeof t === 'string' ? t : t.name),
    updatedAt: note.updatedAt,
  }));
}

const SOURCE_TYPE_CONFIG = {
  manual:          { icon: 'create-outline',        color: '#2A7DEB' },
  institute:       { icon: 'school-outline',        color: '#3B82F6' },
  scraped:         { icon: 'globe-outline',         color: '#0EA5E9' },
  ncert:           { icon: 'book-outline',          color: '#84CC16' },
  book:            { icon: 'library-outline',       color: '#F59E0B' },
  current_affairs: { icon: 'newspaper-outline',     color: '#F43F5E' },
  report:          { icon: 'document-text-outline', color: '#A855F7' },
};

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

// ── Component ─────────────────────────────────────────────────────────────────
export default function NewHomeScreen({ navigation }) {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { horizontalPadding, isWeb } = useWebStyles();
  const { width } = useWindowDimensions();

  const [stats, setStats]   = useState({ totalTests: 0, correctAnswers: 0, totalQuestions: 0 });
  const [streak, setStreak] = useState({ currentStreak: 0 });
  const firstName = user?.name?.split(' ')[0] || 'Aspirant';
  const avgScore = stats.totalQuestions > 0
    ? Math.round((stats.correctAnswers / stats.totalQuestions) * 100) : 0;

  const { showOnboarding, setShowOnboarding } = useOnboarding();
  const creditsRef = useRef(null);
  const [creditsPosition, setCreditsPosition] = useState(null);

  const [newsMatches, setNewsMatches]             = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingMatches, setLoadingMatches]       = useState(false);
  const [seenMatchCount, setSeenMatchCount]       = useState(0);
  const [flashCards, setFlashCards]               = useState([]);
  const [learnedIds, setLearnedIds]               = useState(new Set());

  const PAD = horizontalPadding || 20;

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
    const [localStats, localStreak] = await Promise.all([getStats(), checkStreakStatus()]);
    const [fbStats, fbStreak] = await Promise.all([
      loadStatsFromFirebase(user?.id),
      loadStreakFromFirebase(user?.id),
    ]);
    // Prefer local stats (always up-to-date) unless Firebase has more data (e.g. from another device)
    const useFirebaseStats = fbStats && (fbStats.totalTests || 0) > (localStats.totalTests || 0);
    const useFirebaseStreak = fbStreak && (fbStreak.longestStreak || 0) > (localStreak.longestStreak || 0);
    setStats(useFirebaseStats ? fbStats : localStats);
    setStreak(useFirebaseStreak ? fbStreak : localStreak);

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

  const handleDeleteFlashCard = useCallback((noteId, title) => {
    const doDelete = async () => {
      try {
        await deleteNote(noteId);
        setFlashCards(prev => prev.filter(c => c.id !== noteId));
        setLearnedIds(prev => {
          const next = new Set(prev);
          next.delete(noteId);
          setItem(LEARNED_CARDS_KEY, JSON.stringify([...next]));
          return next;
        });
      } catch (e) {
        console.error('[FlashCards] delete error:', e);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Remove "${title || 'this note'}" from your flashcards?`)) {
        doDelete();
      }
    } else {
      Alert.alert(
        'Delete Flashcard',
        `Remove "${title || 'this note'}" from your flashcards?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  }, []);

  const isVideoUrl = (url) => {
    if (!url) return false;
    const u = url.toLowerCase();
    return u.includes('youtube.com') || u.includes('youtu.be');
  };

  const fetchMatches = async () => {
    setLoadingMatches(true);
    try {
      const matches = await checkNewsMatches();
      // Filter out video articles (YouTube links)
      setNewsMatches(matches.filter(m => !isVideoUrl(m.articleUrl || m.sourceUrl || '')));
    }
    catch (e) { console.error(e); }
    finally { setLoadingMatches(false); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>

      {/* AI Onboarding */}
      <AIOnboarding
        visible={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
        onNavigateToBilling={() => navigation.navigate('Billing')}
        creditsPosition={creditsPosition}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: PAD }]}
      >

        {/* ── Header ─────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.navigate('NewHome')} activeOpacity={0.8}>
              <Image
                source={require('../../assets/prepassist-logo.png')}
                style={styles.headerLogoSmall}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
          <View style={styles.headerRight}>
            <View ref={creditsRef} collapsable={false}>
              <CreditsBadge compact />
            </View>
            <TouchableOpacity
              style={[styles.bellButton, isDark && styles.bellButtonDark]}
              onPress={() => {
                setShowNotifications(true);
                setSeenMatchCount(newsMatches.length);
              }}
            >
              <Ionicons name="notifications-outline" size={22} color={isDark ? '#FFF' : '#374151'} />
              {newsMatches.length > seenMatchCount && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{newsMatches.length - seenMatchCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.settingsButton, isDark && styles.settingsButtonDark]}
              onPress={() => navigation.navigate('Settings')}
            >
              <Ionicons name="settings-outline" size={22} color={isDark ? '#FFF' : '#374151'} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.divider, isDark && styles.dividerDark]} />

        {/* ── Greeting ───────────────────────────────────────────────── */}
        <Text style={[styles.greeting, isDark && styles.textWhite]}>Hi, {firstName} 👋</Text>
        <Text style={[styles.greetingSub, isDark && styles.textMutedDark]}>Your daily preparation companion</Text>

        {/* ── Stat Cards ─────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          {[
            { label: 'Tests Taken', value: stats.totalTests, icon: 'clipboard-outline' },
            { label: 'Avg Score', value: `${avgScore}%`, icon: 'trophy-outline' },
            { label: 'Questions', value: stats.totalQuestions, icon: 'help-circle-outline' },
          ].map((s) => (
            <View key={s.label} style={[styles.statCard, isDark && styles.statCardDark]}>
              <Ionicons name={s.icon} size={20} color={ICON_COLOR} />
              <Text style={[styles.statValue, isDark && styles.textWhite]}>{s.value}</Text>
              <Text style={[styles.statLabel, isDark && styles.textMutedDark]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Streak Banner ──────────────────────────────────────────── */}
        {streak.currentStreak > 0 && (
          <TouchableOpacity
            style={styles.streakBanner}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Progress')}
          >
            <Text style={styles.streakFire}>🔥</Text>
            <Text style={styles.streakText}>{streak.currentStreak} Day Streak! Keep it going!</Text>
            <Ionicons name="chevron-forward" size={16} color="#92400E" />
          </TouchableOpacity>
        )}

        {/* ── Feature Grid ───────────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, isDark && styles.textWhite, { marginBottom: 14 }]}>Start Learning</Text>
        <View style={[styles.grid, (isWeb && width > 600) && styles.gridWeb]}>
          {FEATURES.map((feature) => (
            <TouchableOpacity
              key={feature.id}
              style={[
                styles.card,
                isDark && styles.cardDark,
                (isWeb && width > 600) && styles.cardWeb,
              ]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate(feature.screen, {
                type: feature.id,
                featureName: feature.title,
              })}
            >
              <View style={[styles.iconContainer, isDark && styles.iconContainerDark]}>
                <Ionicons name={feature.icon} size={26} color={isDark ? '#D4A574' : ICON_COLOR} />
              </View>
              <Text style={[styles.cardTitle, isDark && styles.textWhite]}>{feature.title}</Text>
              <Text style={[styles.cardDesc, isDark && styles.textMutedDark]}>{feature.desc}</Text>
              {feature.comingSoon && (
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonText}>Soon</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Flash Notes Cards ──────────────────────────────────────── */}
        <View style={styles.flashSection}>
          <View style={styles.flashHeader}>
            <Text style={[styles.sectionTitle, isDark && styles.textWhite]}>Quick Revision</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {flashCards.length > 0 && (
                <TouchableOpacity onPress={handleShuffle} style={styles.shuffleBtn}>
                  <Ionicons name="shuffle-outline" size={18} color={ICON_COLOR} />
                  <Text style={[styles.shuffleText, { color: ICON_COLOR }]}>Shuffle</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => navigation.navigate('CreateNoteScreen')} style={styles.addFlashBtn}>
                <Ionicons name="add-circle-outline" size={18} color={ICON_COLOR} />
                <Text style={[styles.shuffleText, { color: ICON_COLOR }]}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
          {flashCards.length > 0 ? (
            <FlatList
              horizontal
              data={flashCards}
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => {
                const srcCfg = SOURCE_TYPE_CONFIG[item.sourceType] || SOURCE_TYPE_CONFIG.manual;
                const isLearned = learnedIds.has(item.id);
                return (
                  <TouchableOpacity
                    style={[styles.flashCard, isDark && styles.flashCardDark, isLearned && styles.flashCardLearned]}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('NoteDetail', { noteId: item.id })}
                  >
                    <View style={styles.flashCardTop}>
                      <View style={[styles.flashSourceBadge, { backgroundColor: srcCfg.color + '18' }]}>
                        <Ionicons name={srcCfg.icon} size={12} color={srcCfg.color} />
                      </View>
                      <Text style={[styles.flashDate, isDark && styles.textMutedDark]}>{formatFlashDate(item.updatedAt)}</Text>
                    </View>
                    <Text style={[styles.flashTitle, isDark && styles.textWhite]} numberOfLines={2}>{item.title}</Text>
                    <Text style={[styles.flashSummary, isDark && styles.textMutedDark]} numberOfLines={3}>{item.summary}</Text>
                    <View style={styles.flashCardBottom}>
                      <View style={styles.flashTags}>
                        {item.tags.map((tag) => (
                          <View key={tag} style={[styles.flashTag, isDark && { backgroundColor: 'rgba(196,149,106,0.15)' }]}>
                            <Text style={[styles.flashTagText, { color: ICON_COLOR }]}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity onPress={() => handleMarkLearned(item.id)}>
                          <Ionicons name={isLearned ? 'checkmark-circle' : 'checkmark-circle-outline'} size={20} color={isLearned ? '#22C55E' : '#9CA3AF'} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteFlashCard(item.id, item.title)}>
                          <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          ) : (
            <TouchableOpacity
              style={[styles.flashEmptyCard, isDark && styles.cardDark]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Notes')}
            >
              <Ionicons name="document-text-outline" size={28} color={ICON_COLOR} />
              <Text style={[styles.flashEmptyTitle, isDark && styles.textWhite]}>No notes yet</Text>
              <Text style={[styles.flashEmptyDesc, isDark && styles.textMutedDark]}>Create notes to see flash cards for quick revision</Text>
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>

      {/* ── Notifications Modal ──────────────────────────────────────── */}
      <Modal
        visible={showNotifications}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowNotifications(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, isDark && styles.textWhite]}>
                  Knowledge Radar
                </Text>
                <Text style={[styles.modalSubtitle, isDark && styles.textMutedDark]}>
                  News matching your study tags
                </Text>
              </View>
              <View style={styles.modalHeaderActions}>
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={async () => {
                    setLoadingMatches(true);
                    const matches = await forceRefreshMatches();
                    setNewsMatches(matches.filter(m => !isVideoUrl(m.articleUrl || m.sourceUrl || '')));
                    setLoadingMatches(false);
                  }}
                >
                  <Ionicons name="refresh" size={18} color={ICON_COLOR} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowNotifications(false)}>
                  <Ionicons name="close" size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
                </TouchableOpacity>
              </View>
            </View>

            {loadingMatches ? (
              <View style={styles.emptyMatches}>
                <Ionicons name="sync" size={32} color={ICON_COLOR} />
                <Text style={[styles.emptyMatchesText, isDark && styles.textMutedDark]}>
                  Scanning news for your topics...
                </Text>
              </View>
            ) : (
              <FlatList
                data={newsMatches}
                keyExtractor={(item, index) => `${item.articleId}-${index}`}
                contentContainerStyle={styles.matchesList}
                ListEmptyComponent={
                  <View style={styles.emptyMatches}>
                    <View style={styles.emptyIconContainer}>
                      <Ionicons name="telescope-outline" size={40} color={isDark ? '#6B7280' : '#9CA3AF'} />
                    </View>
                    <Text style={[styles.emptyMatchesTitle, isDark && styles.textWhite]}>
                      No Matches Yet
                    </Text>
                    <Text style={[styles.emptyMatchesText, isDark && styles.textMutedDark]}>
                      Create notes or add tags to topics you're studying. We'll alert you when related news appears.
                    </Text>
                    <TouchableOpacity
                      style={styles.goToNotesButton}
                      onPress={() => {
                        setShowNotifications(false);
                        navigation.navigate('Notes');
                      }}
                    >
                      <Text style={styles.goToNotesText}>Go to Notes</Text>
                    </TouchableOpacity>
                  </View>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.matchCard, isDark && styles.matchCardDark]}
                    onPress={async () => {
                      await markMatchAsRead(item.articleId);
                      setShowNotifications(false);
                      navigation.navigate('ArticleDetail', { articleId: item.articleId });
                    }}
                  >
                    <View style={[styles.matchBadge, { backgroundColor: item.tagColor || ICON_COLOR }]}>
                      <Ionicons name="pricetag" size={10} color="#FFFFFF" />
                      <Text style={styles.matchBadgeText}>{item.matchedTag || 'Topic Match'}</Text>
                    </View>
                    <Text style={[styles.matchTitle, isDark && styles.textWhite]} numberOfLines={2}>
                      {item.articleTitle}
                    </Text>
                    {item.articleSummary && (
                      <Text style={[styles.matchSummary, isDark && styles.textMutedDark]} numberOfLines={2}>
                        {item.articleSummary}
                      </Text>
                    )}
                    <View style={styles.matchFooter}>
                      {item.articleSource && (
                        <Text style={[styles.matchSource, isDark && styles.textMutedDark]}>
                          {item.articleSource}
                        </Text>
                      )}
                      <View style={styles.readArticle}>
                        <Text style={[styles.tapToRead, { color: ICON_COLOR }]}>Read Article</Text>
                        <Ionicons name="arrow-forward" size={14} color={ICON_COLOR} />
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F7',
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 40,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButtonDark: {
    backgroundColor: '#1F2937',
  },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
  },
  headerLogo: {
    width: 170,
    height: 50,
  },
  headerLogoSmall: {
    width: 140,
    height: 40,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: '#9CA3AF',
    marginTop: 2,
  },
  headerRight: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bellButtonDark: {
    backgroundColor: '#1F2937',
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FAF9F7',
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 24,
  },
  dividerDark: {
    backgroundColor: '#374151',
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridWeb: {
    gap: 14,
    justifyContent: 'flex-start',
  },

  // Card
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F0EDE8',
    position: 'relative',
  },
  cardDark: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  cardWeb: {
    width: 200,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: ICON_BG,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconContainerDark: {
    backgroundColor: 'rgba(212,165,116,0.15)',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  cardDesc: {
    fontSize: 13,
    fontWeight: '400',
    color: '#9CA3AF',
    lineHeight: 18,
  },
  comingSoonBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  comingSoonText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },

  // Greeting
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  greetingSub: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 20,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0EDE8',
  },
  statCardDark: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9CA3AF',
    marginTop: 2,
  },

  // Streak
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  streakFire: {
    fontSize: 22,
    marginRight: 10,
  },
  streakText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },

  // Section title
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },

  // Flash Cards
  flashSection: {
    marginBottom: 24,
  },
  flashHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  shuffleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shuffleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  addFlashBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  flashCard: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#F0EDE8',
  },
  flashCardDark: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  flashCardLearned: {
    opacity: 0.6,
  },
  flashCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  flashSourceBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  flashTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
    lineHeight: 20,
  },
  flashSummary: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 17,
    marginBottom: 10,
  },
  flashCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flashTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    flex: 1,
  },
  flashTag: {
    backgroundColor: ICON_BG,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  flashTagText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Flash empty state
  flashEmptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0EDE8',
    borderStyle: 'dashed',
  },
  flashEmptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 10,
  },
  flashEmptyDesc: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
  },

  // Dark mode text helpers
  textWhite: {
    color: '#F9FAFB',
  },
  textMutedDark: {
    color: '#9CA3AF',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
  },
  modalContentDark: {
    backgroundColor: '#1F2937',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ICON_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  matchesList: {
    paddingBottom: 40,
  },
  matchCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  matchCardDark: {
    backgroundColor: '#111827',
    borderColor: '#374151',
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 10,
    gap: 5,
  },
  matchBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  matchTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
    lineHeight: 22,
  },
  matchSummary: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  matchFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchSource: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  readArticle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tapToRead: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyMatches: {
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyMatchesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  emptyMatchesText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  goToNotesButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
    backgroundColor: ICON_COLOR,
  },
  goToNotesText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});
