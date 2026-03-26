import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Linking,
  ScrollView,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'react-native-calendars';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../features/Reference/theme/ThemeContext';
import { useWebStyles } from '../components/WebContainer';
import { LinearGradient } from 'expo-linear-gradient';
import { SmartTextInput } from '../components/SmartTextInput';
import * as WebBrowser from 'expo-web-browser';
import { useFocusEffect } from '@react-navigation/native';
import { getSavedArticles, deleteSavedArticle } from '../services/savedArticlesService';
import { supabase } from '../lib/supabase';

const FILTERS = {
  subjects: [
    'All',
    'Polity',
    'Economy',
    'Geography',
    'History',
    'Science & Technology',
    'Environment',
    'Current Affairs',
  ],
};

const SECTION_COLORS = {
  'Polity': '#2A7DEB',
  'Economy': '#10B981',
  'Geography': '#8B5CF6',
  'History': '#F59E0B',
  'Science & Technology': '#06B6D4',
  'Environment': '#22C55E',
  'Current Affairs': '#EF4444',
};

const SOURCE_NAMES = {
  'TH': 'The Hindu',
  'HT': 'Hindustan Times',
  'ET': 'Economic Times',
  'PIB': 'PIB',
  'CA': 'PrepAssist AI',
};

const SKIP_HEADINGS = new Set([
  'What Happened', 'Background & Context', 'Key Details',
  'Analysis & Significance', 'UPSC Relevance', 'Background',
  'Context', 'Analysis', 'Significance',
]);

const getFirstParagraph = (text) => {
  if (!text) return '';
  const lines = text.replace(/\*\*/g, '').split('\n');
  for (const line of lines) {
    const clean = line.replace(/^\s*[\*\-]\s+/, '').trim();
    if (!clean || clean.length < 25 || SKIP_HEADINGS.has(clean)) continue;
    return clean;
  }
  return text.replace(/\*\*/g, '').slice(0, 180).trim();
};

export default function NewsFeedScreen({ navigation, route }) {
  const { theme, isDark } = useTheme();
  const { horizontalPadding } = useWebStyles();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' or 'asc'
  const [activeTab, setActiveTab] = useState('feed'); // 'feed' or 'saved'
  const [savedArticles, setSavedArticles] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [availableDates, setAvailableDates] = useState({});
  const [showArchive, setShowArchive] = useState(false);
  const [archiveArticles, setArchiveArticles] = useState([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveSelectedMonth, setArchiveSelectedMonth] = useState('');

  const getArchiveMonths = () => {
    const months = [];
    // All months of 2025 in reverse (December → January)
    for (let m = 12; m >= 1; m--) {
      const d = new Date(2025, m - 1, 1);
      months.push({
        key: `2025-${String(m).padStart(2, '0')}`,
        label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
      });
    }
    return months;
  };

  const handleDateChange = (event, dateOrString) => {
    setShowDatePicker(false);
    if (event?.type === 'dismissed') return;

    let d = null;
    if (dateOrString instanceof Date && !isNaN(dateOrString)) {
      d = dateOrString;
    } else if (typeof event?.nativeEvent?.timestamp === 'number') {
      d = new Date(event.nativeEvent.timestamp);
    }

    if (d) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      setSelectedDate(`${year}-${month}-${day}`);
    } else if (typeof dateOrString === 'string' && dateOrString) {
      setSelectedDate(dateOrString);
    }
  };

  const clearDateFilter = () => {
    setSelectedDate(getTodayDate());
    setShowDatePicker(false);
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'));
  };

  const fetchArticles = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      console.log(`[Articles] Fetching from Supabase, date: ${selectedDate}`);

      let query = supabase
        .from('articles')
        .select('id, title, summary, subject, author, tags, gs_paper, source_url, published_date, created_at, is_published')
        .eq('is_published', true)
        .order('published_date', { ascending: false })
        .limit(60);

      if (selectedDate) {
        const [sy, sm, sd] = selectedDate.split('-').map(Number);
        const next = new Date(sy, sm - 1, sd + 1);
        const y = next.getFullYear();
        const m = String(next.getMonth() + 1).padStart(2, '0');
        const d = String(next.getDate()).padStart(2, '0');
        const nextDay = `${y}-${m}-${d}`;
        console.log(`[Articles] Query range: ${selectedDate} to ${nextDay}`);
        query = query
          .gte('published_date', selectedDate)
          .lt('published_date', nextDay);
      }

      let fetchedArticles = [];

      const mapArticles = (data) => (data || []).map(a => ({
        ...a,
        gsPaper: a.gs_paper,
        sourceUrl: a.source_url,
        publishedDate: a.published_date,
        createdAt: a.created_at,
        isPublished: a.is_published,
        tags: typeof a.tags === 'string' ? JSON.parse(a.tags) : a.tags,
      }));

      try {
        const { data, error: fetchError } = await query;
        if (fetchError) throw fetchError;

        fetchedArticles = mapArticles(data);
        console.log(`[Articles] Found ${fetchedArticles.length} for date ${selectedDate}`);

        // If no articles found for today, fall back to most recent ones
        if (fetchedArticles.length === 0 && selectedDate === getTodayDate()) {
          const { data: fallbackData } = await supabase
            .from('articles')
            .select('id, title, summary, subject, author, tags, gs_paper, source_url, published_date, created_at, is_published')
            .eq('is_published', true)
            .order('published_date', { ascending: false })
            .limit(60);
          fetchedArticles = mapArticles(fallbackData);
        }
      } catch (supaErr) {
        console.warn('[Articles] Supabase query failed:', supaErr);
        setError('Could not load articles. Please check your connection.');
      }

      console.log(`[Articles] ${fetchedArticles.length} articles from Supabase`);

      // Apply subject filter
      let filtered = fetchedArticles;
      if (selectedSubject && selectedSubject !== 'All') {
        filtered = filtered.filter(a =>
          a.subject?.toLowerCase().includes(selectedSubject.toLowerCase())
        );
      }

      setArticles(filtered);
    } catch (err) {
      setError('Failed to load articles. Please try again.');
      console.warn('[Articles] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedSubject, selectedDate]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // Fetch all dates that have articles (for calendar markers)
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('articles')
          .select('published_date')
          .eq('is_published', true);
        const marked = {};
        (data || []).forEach(a => {
          const d = (a.published_date || '').slice(0, 10);
          if (d) marked[d] = { marked: true, dotColor: '#10B981' };
        });
        setAvailableDates(marked);
        console.log(`[Dates] ${Object.keys(marked).length} dates with articles`);
      } catch (e) { console.warn('[Dates] fetch error:', e); }
    })();
  }, []);

  // Handle navigation param to open Saved tab directly
  useEffect(() => {
    if (route?.params?.initialTab === 'saved') {
      setActiveTab('saved');
    }
  }, [route?.params?.initialTab]);

  useEffect(() => {
    if (activeTab === 'saved') loadSavedArticles();
  }, [activeTab]);

  // Reload saved articles whenever the screen comes into focus
  useFocusEffect(useCallback(() => {
    if (activeTab === 'saved') loadSavedArticles();
  }, [activeTab]));

  const loadSavedArticles = async () => {
    setSavedLoading(true);
    const articles = await getSavedArticles();
    setSavedArticles(articles);
    setSavedLoading(false);
  };

  const handleDeleteSaved = (id) => {
    Alert.alert('Delete Article', 'Remove this saved article?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteSavedArticle(id);
          setSavedArticles(prev => prev.filter(a => a.id !== id));
        }
      },
    ]);
  };

  const handleRefresh = () => {
    fetchArticles(true);
  };

  const fetchArchiveMonth = async (monthKey, monthLabel) => {
    setArchiveLoading(true);
    setArchiveArticles([]);
    setArchiveSelectedMonth(monthLabel);
    setShowArchiveModal(true);
    try {
      const [year, month] = monthKey.split('-').map(Number);
      const nextMonth = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`;
      console.log(`[Archive] Fetching ${monthKey}-01 to ${nextMonth}-01`);
      const { data, error: fetchError } = await supabase
        .from('articles')
        .select('id, title, summary, subject, author, gs_paper, source_url, published_date')
        .eq('is_published', true)
        .gte('published_date', `${monthKey}-01`)
        .lt('published_date', `${nextMonth}-01`)
        .order('published_date', { ascending: false })
        .limit(30);
      if (fetchError) throw fetchError;
      console.log(`[Archive] Found ${(data || []).length} articles for ${monthLabel}`);
      setArchiveArticles(data || []);
    } catch (err) {
      console.warn('[Archive] Fetch error:', err);
      setArchiveArticles([]);
    } finally {
      setArchiveLoading(false);
    }
  };

  // Filter by search query
  const filteredArticles = articles.filter(article => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      article.title?.toLowerCase().includes(query) ||
      article.summary?.toLowerCase().includes(query) ||
      article.subject?.toLowerCase().includes(query)
    );
  });

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const renderArticleCard = ({ item }) => {
    const sectionColor = SECTION_COLORS[item.subject] || '#2A7DEB';
    const sourceName = SOURCE_NAMES[item.gsPaper] || item.gsPaper || 'News';
    const excerpt = getFirstParagraph(item.summary);
    let tags = item.tags ? (typeof item.tags === 'string' ? JSON.parse(item.tags) : item.tags) : [];
    // Auto-generate category tags from subject if none exist
    if (!tags || tags.length === 0) {
      const catTags = {
        'Polity': ['GS Paper 2', 'Polity & Governance'],
        'Economy': ['GS Paper 3', 'Indian Economy'],
        'Science & Technology': ['GS Paper 3', 'Science & Tech'],
        'Environment': ['GS Paper 3', 'Environment & Ecology'],
        'Current Affairs': ['GS Paper 2', 'Current Affairs'],
        'Geography': ['GS Paper 1', 'Indian Geography'],
        'History': ['GS Paper 1', 'Indian History'],
      };
      tags = catTags[item.subject] || [item.subject || 'Current Affairs'];
    }

    return (
      <TouchableOpacity
        style={[styles.articleCard, {
          backgroundColor: isDark ? '#12162A' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255,255,255,0.07)' : '#E8E2D9',
        }]}
        activeOpacity={0.75}
        onPress={() => navigation.navigate('ArticleDetail', {
          articleId: item.id,
        })}
      >
        {/* Colored left accent bar — section color like The Hindu */}
        <View style={[styles.cardAccent, { backgroundColor: sectionColor }]} />

        <View style={styles.cardInner}>
          {/* Section label + source */}
          <View style={styles.cardMetaTop}>
            <Text style={[styles.cardSection, { color: sectionColor }]}>
              {item.subject?.toUpperCase() || 'NEWS'}
            </Text>
            <Text style={[styles.cardSourceLabel, { color: isDark ? 'rgba(255,255,255,0.38)' : '#9E9E9E' }]}>
              {sourceName}
            </Text>
          </View>

          {/* Headline */}
          <Text style={[styles.cardHeadline, { color: isDark ? '#F0F0FF' : '#1A1A2E' }]} numberOfLines={3}>
            {item.title}
          </Text>

          {/* Lead paragraph excerpt */}
          {excerpt ? (
            <Text style={[styles.cardExcerpt, { color: isDark ? 'rgba(255,255,255,0.55)' : '#555E6B' }]} numberOfLines={2}>
              {excerpt}
            </Text>
          ) : null}

          {/* Byline + date */}
          <View style={styles.cardFooter}>
            {item.author ? (
              <Text style={[styles.cardAuthorText, { color: isDark ? 'rgba(255,255,255,0.40)' : '#7A8A91' }]}>
                {item.author}
              </Text>
            ) : <View />}
            <Text style={[styles.cardDateText, { color: isDark ? 'rgba(255,255,255,0.35)' : '#9E9E9E' }]}>
              {formatDate(item.publishedDate || item.createdAt)}
            </Text>
          </View>

          {/* Source badge */}
          {(item.gsPaper === 'TH' || item.gsPaper === 'HT') && (
            <View style={[styles.cardTagsRow, { marginTop: 6 }]}>
              <View style={[styles.cardTag, {
                backgroundColor: item.gsPaper === 'TH' ? 'rgba(42,125,235,0.12)' : 'rgba(239,68,68,0.12)',
                borderColor: item.gsPaper === 'TH' ? 'rgba(42,125,235,0.25)' : 'rgba(239,68,68,0.25)',
              }]}>
                <Text style={[styles.cardTagText, { color: item.gsPaper === 'TH' ? '#2A7DEB' : '#EF4444', fontWeight: '700' }]}>
                  {item.gsPaper === 'TH' ? 'The Hindu' : 'Hindustan Times'}
                </Text>
              </View>
            </View>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <View style={styles.cardTagsRow}>
              {tags.slice(0, 3).map((tag, index) => (
                <View key={index} style={[styles.cardTag, {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F0EDE8',
                  borderColor: isDark ? 'rgba(255,255,255,0.10)' : '#E0D8CC',
                }]}>
                  <Text style={[styles.cardTagText, { color: isDark ? 'rgba(255,255,255,0.55)' : '#6B7B8A' }]}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    const now = new Date();
    const isToday = selectedDate === getTodayDate();
    const isBefore8am = now.getHours() < 8;
    const emptyMsg = error
      ? error
      : isToday && isBefore8am
        ? "Today's news will be ready at 8:00 AM. Check back then!"
        : "No articles were published on this date. Try picking a different date from the calendar.";

    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : theme.colors.backgroundAlt }]}>
          <Ionicons name={isToday && isBefore8am ? 'time-outline' : 'newspaper-outline'} size={42} color={theme.colors.textTertiary} />
        </View>
        <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
          {isToday && isBefore8am ? 'News Updates at 8 AM' : 'No Articles Found'}
        </Text>
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>{emptyMsg}</Text>
        {!(isToday && isBefore8am) && (
          <TouchableOpacity style={styles.retryButton} activeOpacity={0.82} onPress={handleRefresh}>
            <LinearGradient
              colors={['#3B9AFF', '#2A7DEB']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.retryButtonInner}
            >
              <Ionicons name="refresh" size={16} color="#FFF" />
              <Text style={styles.retryButtonText}>Retry</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderSavedArticleCard = (item) => (
    <View key={item.id} style={[styles.articleCard, {
      backgroundColor: isDark ? '#12162A' : '#FFFFFF',
      borderColor: isDark ? 'rgba(255,255,255,0.07)' : '#E8E2D9',
    }]}>
      <View style={[styles.cardAccent, { backgroundColor: '#10B981' }]} />
      <View style={styles.cardInner}>
        <View style={styles.cardMetaTop}>
          <Text style={[styles.cardSection, { color: '#10B981' }]}>SAVED</Text>
          {item.domain ? (
            <Text style={[styles.cardSourceLabel, { color: isDark ? 'rgba(255,255,255,0.38)' : '#9E9E9E' }]}>
              {item.domain}
            </Text>
          ) : null}
        </View>

        <Text style={[styles.cardHeadline, { color: isDark ? '#F0F0FF' : '#1A1A2E' }]} numberOfLines={3}>
          {item.title}
        </Text>

        {item.summary ? (
          <Text style={[styles.cardExcerpt, { color: isDark ? 'rgba(255,255,255,0.55)' : '#555E6B' }]} numberOfLines={3}>
            {item.summary}
          </Text>
        ) : null}

        <View style={styles.cardFooter}>
          <Text style={[styles.cardDateText, { color: isDark ? 'rgba(255,255,255,0.35)' : '#9E9E9E' }]}>
            {formatDate(item.savedAt)}
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={() => Platform.OS === 'web' ? window.open(item.url, '_blank') : WebBrowser.openBrowserAsync(item.url)}>
              <Ionicons name="open-outline" size={18} color="#2A7DEB" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteSaved(item.id)}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  const renderSavedEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : theme.colors.backgroundAlt }]}>
        <Ionicons name="bookmark-outline" size={42} color={theme.colors.textTertiary} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Saved Articles</Text>
      <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>Share URLs from other apps (Chrome, news apps) to automatically save and summarize articles here.</Text>
    </View>
  );

  const PAD = horizontalPadding || 20;

  return (
    <View style={[styles.root, { backgroundColor: isDark ? '#07091A' : '#F5F1EB' }]}>
      <LinearGradient colors={isDark ? ['#07091A', '#0A1538', '#080E28'] : ['#F5F1EB', '#F0EAE0', '#F5F1EB']} style={StyleSheet.absoluteFillObject} />

      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={isDark ? ['rgba(42,125,235,0.26)', 'transparent'] : ['rgba(42,125,235,0.10)', 'transparent']}
          style={styles.orbTop}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />
        <LinearGradient
          colors={isDark ? ['rgba(42,125,235,0.16)', 'transparent'] : ['rgba(42,125,235,0.06)', 'transparent']}
          style={styles.orbBottom}
          start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }}
        />
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        {/* ── Hero header ─────────────────────────────────────────── */}
        <LinearGradient
          colors={['#2A7DEB', '#3B9AFF', '#2A7DEB']}
          start={{ x: 0, y: 0 }} end={{ x: 1.2, y: 1 }}
          style={[styles.hero, { paddingHorizontal: PAD }]}
        >
          <View style={styles.heroShimmer} />
          <View style={styles.heroCircleLarge} />
          <View style={styles.heroCircleSmall} />
          <View style={styles.heroRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color="#FFF" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.heroTitle}>News Feed</Text>
              <Text style={styles.heroSub}>Current affairs & analysis</Text>
            </View>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Tab Bar ─────────────────────────────────────────── */}
        <View style={[styles.tabBar, { paddingHorizontal: PAD }]}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'feed' && styles.tabItemActive]}
            onPress={() => setActiveTab('feed')}
          >
            <Ionicons name="newspaper-outline" size={16} color={activeTab === 'feed' ? '#FFF' : isDark ? 'rgba(255,255,255,0.50)' : '#7A8A91'} />
            <Text style={[styles.tabText, activeTab === 'feed' && styles.tabTextActive, activeTab !== 'feed' && { color: isDark ? 'rgba(255,255,255,0.50)' : '#7A8A91' }]}>Feed</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'saved' && styles.tabItemActive]}
            onPress={() => setActiveTab('saved')}
          >
            <Ionicons name="bookmark-outline" size={16} color={activeTab === 'saved' ? '#FFF' : isDark ? 'rgba(255,255,255,0.50)' : '#7A8A91'} />
            <Text style={[styles.tabText, activeTab === 'saved' && styles.tabTextActive, activeTab !== 'saved' && { color: isDark ? 'rgba(255,255,255,0.50)' : '#7A8A91' }]}>Saved</Text>
            {savedArticles.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{savedArticles.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingHorizontal: PAD, paddingTop: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={activeTab === 'feed' ? handleRefresh : loadSavedArticles} tintColor="#2A7DEB" />}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'feed' ? (
          <>
          {/* Disclaimer */}
          <View style={{
            backgroundColor: isDark ? 'rgba(42,125,235,0.08)' : 'rgba(42,125,235,0.06)',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(42,125,235,0.20)' : 'rgba(42,125,235,0.15)',
            borderRadius: 12, padding: 12, marginBottom: 12,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Ionicons name="information-circle-outline" size={16} color="#2A7DEB" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#2A7DEB' }}>How it works</Text>
            </View>
            <Text style={{ fontSize: 12, lineHeight: 18, color: isDark ? 'rgba(255,255,255,0.55)' : '#555E6B' }}>
              {'📅 '}Date selection covers the last 3 months. Only dates with articles (highlighted in green) are clickable — other dates are disabled.{'\n'}
              {'📚 '}For older news, use "Browse Archive" below to view major UPSC highlights month-wise. Select any month to see key events and analysis from that period.
            </Text>
          </View>

          {/* Search */}
          <View style={[styles.searchContainer, {
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F1EB',
            borderColor: isDark ? 'rgba(255,255,255,0.14)' : '#D9CFC2',
          }]}>
            <Ionicons name="search" size={20} color={isDark ? 'rgba(255,255,255,0.45)' : '#7A8A91'} />
            <SmartTextInput
              style={[styles.searchInput, { color: isDark ? '#F0F0FF' : '#333333' }]}
              placeholder="Search articles..."
              placeholderTextColor={isDark ? 'rgba(255,255,255,0.30)' : '#7A8A91'}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={isDark ? 'rgba(255,255,255,0.45)' : '#7A8A91'} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Date Picker Row */}
          <View style={styles.dateFilterRow}>
            {Platform.OS === 'web' ? (
              <TouchableOpacity
                style={[styles.dateButton, { flex: 1,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F5F1EB',
                  borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#D9CFC2',
                }]}
                onPress={() => {
                  // @ts-ignore
                  document.getElementById('web-date-picker')?.showPicker?.() || document.getElementById('web-date-picker')?.click();
                }}
              >
                <Ionicons name="calendar-outline" size={18} color="#5EC7B2" />
                <Text style={[styles.dateButtonText, { marginLeft: 8, color: isDark ? '#F0F0FF' : '#3D565E' }]}>
                  {selectedDate ? formatDate(selectedDate) : 'Pick Date'}
                </Text>
                <input
                  id="web-date-picker"
                  type="date"
                  value={selectedDate}
                  max={getTodayDate()}
                  min={(() => { const d = new Date(); d.setMonth(d.getMonth() - 6); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })()}
                  onChange={(e) => handleDateChange(e, e.target.value)}
                  style={{ position: 'absolute', width: 0, height: 0, opacity: 0 }}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.dateButton, { flex: 1,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F5F1EB',
                  borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#D9CFC2',
                }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color="#5EC7B2" />
                <Text style={[styles.dateButtonText, { marginLeft: 8, color: isDark ? '#F0F0FF' : '#3D565E' }]}>
                  {selectedDate ? formatDate(selectedDate) : 'Pick Date'}
                </Text>
              </TouchableOpacity>
            )}
            {selectedDate ? (
              <TouchableOpacity style={styles.clearDateBtn} onPress={clearDateFilter}>
                <Ionicons name="close-circle" size={24} color="#F87171" />
              </TouchableOpacity>
            ) : null}
          </View>

          {Platform.OS !== 'web' && showDatePicker && (
            <View style={[styles.archiveCalendarWrap, {
              backgroundColor: isDark ? '#12162A' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.07)' : '#E8E2D9',
            }]}>
              <Calendar
                current={selectedDate}
                maxDate={getTodayDate()}
                enableSwipeMonths={true}
                renderArrow={(direction) => (
                  <View style={{
                    width: 36, height: 36, borderRadius: 18,
                    backgroundColor: isDark ? 'rgba(42,125,235,0.15)' : 'rgba(42,125,235,0.10)',
                    justifyContent: 'center', alignItems: 'center',
                  }}>
                    <Ionicons
                      name={direction === 'left' ? 'chevron-back' : 'chevron-forward'}
                      size={20}
                      color="#2A7DEB"
                    />
                  </View>
                )}
                dayComponent={({ date }) => {
                  const ds = date?.dateString;
                  const hasArticles = ds && availableDates[ds];
                  const isSelected = ds === selectedDate;
                  const bg = isSelected ? '#2A7DEB' : hasArticles ? '#10B981' : 'transparent';
                  const textColor = isSelected ? '#FFF' : hasArticles ? '#FFF' : (isDark ? 'rgba(255,255,255,0.12)' : '#E0E0E0');
                  return (
                    <TouchableOpacity
                      disabled={!hasArticles}
                      activeOpacity={0.7}
                      onPress={() => { if (hasArticles) { setSelectedDate(ds); setShowDatePicker(false); } }}
                      style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: hasArticles ? '700' : '400', color: textColor }}>{date?.day}</Text>
                    </TouchableOpacity>
                  );
                }}
                theme={{
                  backgroundColor: 'transparent',
                  calendarBackground: 'transparent',
                  textSectionTitleColor: isDark ? '#A0A0B0' : '#555E6B',
                  monthTextColor: isDark ? '#F0F0FF' : '#1A1A2E',
                  arrowColor: '#2A7DEB',
                  'stylesheet.calendar.header': {
                    monthText: { fontSize: 18, fontWeight: '700', color: isDark ? '#F0F0FF' : '#1A1A2E' },
                  },
                }}
              />
              {/* Cancel button */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 6, paddingVertical: 12, borderTopWidth: 1,
                  borderTopColor: isDark ? 'rgba(255,255,255,0.07)' : '#E8E2D9',
                }}
                onPress={() => setShowDatePicker(false)}
              >
                <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#EF4444' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Archive toggle */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            <TouchableOpacity
              style={[styles.dateButton, {
                backgroundColor: showArchive ? '#2A7DEB' : (isDark ? 'rgba(255,255,255,0.07)' : '#F5F1EB'),
                borderColor: showArchive ? '#3B9AFF' : (isDark ? 'rgba(255,255,255,0.12)' : '#D9CFC2'),
              }]}
              onPress={() => setShowArchive(prev => !prev)}
            >
              <Ionicons name="archive-outline" size={16} color={showArchive ? '#FFF' : (isDark ? 'rgba(255,255,255,0.65)' : '#3D565E')} />
              <Text style={[styles.dateButtonText, { marginLeft: 8, color: showArchive ? '#FFF' : (isDark ? '#F0F0FF' : '#3D565E') }]}>
                {showArchive ? 'Archive' : 'Browse Archive (3+ months)'}
              </Text>
            </TouchableOpacity>
            {showArchive && (
              <TouchableOpacity
                style={[styles.dateButton, {
                  backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)',
                  borderColor: 'rgba(239,68,68,0.30)',
                }]}
                onPress={() => setShowArchive(false)}
              >
                <Ionicons name="arrow-back" size={16} color="#EF4444" />
                <Text style={[styles.dateButtonText, { marginLeft: 6, color: '#EF4444' }]}>Back to Current Affairs</Text>
              </TouchableOpacity>
            )}
          </View>

          {showArchive && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {getArchiveMonths().map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.subjectChip, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F1EB',
                    borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#D9CFC2',
                  }]}
                  onPress={() => fetchArchiveMonth(m.key, m.label)}
                >
                  <Text style={[styles.subjectChipText, { color: isDark ? 'rgba(255,255,255,0.65)' : '#3D565E' }]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Subject Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.subjectFilters}
            contentContainerStyle={styles.subjectFiltersContent}
          >
            {FILTERS.subjects.map(subject => (
              <TouchableOpacity
                key={subject}
                style={[styles.subjectChip, {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F1EB',
                  borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#D9CFC2',
                }, selectedSubject === subject && styles.subjectChipActive]}
                onPress={() => setSelectedSubject(subject)}
              >
                <Text style={[styles.subjectChipText, { color: isDark ? 'rgba(255,255,255,0.65)' : '#3D565E' }, selectedSubject === subject && styles.subjectChipTextActive]}>
                  {subject}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Articles */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <LinearGradient colors={['#3B9AFF', '#2A7DEB']} style={styles.loadingBubble}>
                <ActivityIndicator size="large" color="#FFF" />
              </LinearGradient>
              <Text style={[styles.loadingText, { color: isDark ? 'rgba(255,255,255,0.50)' : '#7A8A91' }]}>
                Loading articles…
              </Text>
            </View>
          ) : filteredArticles.length === 0 ? (
            renderEmptyState()
          ) : (
            <View style={styles.articlesList}>
              {filteredArticles.map(article => (
                <View key={article.id}>{renderArticleCard({ item: article })}</View>
              ))}
            </View>
          )}
          </>
          ) : (
          <>
            {/* Saved Articles Tab */}
            {savedLoading ? (
              <View style={styles.loadingContainer}>
                <LinearGradient colors={['#10B981', '#047857']} style={styles.loadingBubble}>
                  <ActivityIndicator size="large" color="#FFF" />
                </LinearGradient>
                <Text style={[styles.loadingText, { color: isDark ? 'rgba(255,255,255,0.50)' : '#7A8A91' }]}>Loading saved articles…</Text>
              </View>
            ) : savedArticles.length === 0 ? (
              renderSavedEmptyState()
            ) : (
              <View style={styles.articlesList}>
                {savedArticles.map(article => renderSavedArticleCard(article))}
              </View>
            )}
          </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
        {/* Archive Modal */}
        <Modal
          visible={showArchiveModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowArchiveModal(false)}
        >
          <View style={styles.archiveModalOverlay}>
            <View style={[styles.archiveModalContent, { backgroundColor: isDark ? '#12162A' : '#FFFFFF' }]}>
              <View style={[styles.cardFooter, { marginBottom: 16 }]}>
                <View>
                  <Text style={[styles.heroTitle, { color: isDark ? '#F0F0FF' : '#1A1A2E', fontSize: 18 }]}>
                    {archiveSelectedMonth || 'Archive'}
                  </Text>
                  <Text style={[styles.heroSub, { color: isDark ? 'rgba(255,255,255,0.50)' : '#7A8A91' }]}>
                    Major UPSC Highlights
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.dateButton, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F3F4F6',
                    borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#E5E7EB',
                  }]}
                  onPress={() => setShowArchiveModal(false)}
                >
                  <Ionicons name="close" size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
                  <Text style={[styles.dateButtonText, { marginLeft: 4, color: isDark ? '#9CA3AF' : '#6B7280' }]}>Close</Text>
                </TouchableOpacity>
              </View>

              {archiveLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#2A7DEB" />
                  <Text style={[styles.loadingText, { color: isDark ? 'rgba(255,255,255,0.50)' : '#7A8A91' }]}>Loading archive…</Text>
                </View>
              ) : archiveArticles.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="newspaper-outline" size={42} color={isDark ? 'rgba(255,255,255,0.25)' : '#9E9E9E'} />
                  <Text style={[styles.emptyTitle, { color: isDark ? '#F0F0FF' : '#1A1A2E' }]}>No highlights found for this month</Text>
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {archiveArticles.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.articleCard, {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9F7F4',
                        borderColor: isDark ? 'rgba(255,255,255,0.07)' : '#E8E2D9',
                        marginBottom: 10,
                      }]}
                      activeOpacity={0.75}
                      onPress={() => {
                        setShowArchiveModal(false);
                        navigation.navigate('ArticleDetail', { articleId: item.id });
                      }}
                    >
                      <View style={[styles.cardAccent, { backgroundColor: SECTION_COLORS[item.subject] || '#2A7DEB' }]} />
                      <View style={styles.cardInner}>
                        <View style={styles.cardMetaTop}>
                          <Text style={[styles.cardSection, { color: SECTION_COLORS[item.subject] || '#2A7DEB' }]}>
                            {item.subject?.toUpperCase() || 'NEWS'}
                          </Text>
                          <Text style={[styles.cardTagText, { color: '#2A7DEB', fontWeight: '700' }]}>
                            {SOURCE_NAMES[item.gs_paper] || item.gs_paper || 'News'}
                          </Text>
                        </View>
                        <Text style={[styles.cardHeadline, { color: isDark ? '#F0F0FF' : '#1A1A2E' }]} numberOfLines={3}>
                          {item.title}
                        </Text>
                        {item.summary ? (
                          <Text style={[styles.cardExcerpt, { color: isDark ? 'rgba(255,255,255,0.55)' : '#555E6B' }]} numberOfLines={2}>
                            {getFirstParagraph(item.summary)}
                          </Text>
                        ) : null}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                          <Ionicons name="reader-outline" size={14} color="#2A7DEB" />
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#2A7DEB' }}>Read Full Analysis</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollView: { flex: 1 },

  orbTop: { position: 'absolute', width: 380, height: 380, borderRadius: 190, top: -100, right: -80 },
  orbBottom: { position: 'absolute', width: 260, height: 260, borderRadius: 130, bottom: 80, left: -70 },

  // Hero header
  hero: {
    paddingTop: 16, paddingBottom: 24,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
    overflow: 'hidden', marginBottom: 4,
  },
  heroShimmer: { position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, backgroundColor: 'rgba(255,255,255,0.28)' },
  heroCircleLarge: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.055)', top: -70, right: -50 },
  heroCircleSmall: { position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.07)', bottom: 8, left: -20 },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.30)', justifyContent: 'center', alignItems: 'center' },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#FFF', letterSpacing: -0.5 },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.62)', marginTop: 2 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#FF4757' },
  liveText: { fontSize: 10, fontWeight: '800', color: '#FF4757', letterSpacing: 0.8 },

  // Tab bar
  tabBar: { flexDirection: 'row', gap: 8, paddingTop: 14, paddingBottom: 4 },
  tabItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24, backgroundColor: 'transparent' },
  tabItemActive: { backgroundColor: '#2A7DEB' },
  tabText: { fontSize: 14, fontWeight: '700' },
  tabTextActive: { color: '#FFF' },
  tabBadge: { backgroundColor: '#EF4444', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  tabBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },

  // Search
  searchContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, marginTop: 18, marginBottom: 14, gap: 10 },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },

  // Date filter
  dateFilterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  dateButton: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  dateButtonText: { fontSize: 14 },
  clearDateBtn: { padding: 4 },

  // Subject chips
  subjectFilters: { marginBottom: 18 },
  subjectFiltersContent: { gap: 8 },
  subjectChip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 22, marginRight: 6, borderWidth: 1 },
  subjectChipActive: { backgroundColor: '#2A7DEB', borderColor: '#3B9AFF' },
  subjectChipText: { fontSize: 13, fontWeight: '600' },
  subjectChipTextActive: { color: '#FFF' },

  // Loading
  loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 14 },
  loadingBubble: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 14 },

  // Articles — The Hindu editorial card style
  articlesList: { gap: 10 },
  articleCard: { borderRadius: 12, marginBottom: 4, borderWidth: 1, overflow: 'hidden', flexDirection: 'row' },
  cardAccent: { width: 4 },
  cardInner: { flex: 1, padding: 16 },
  cardMetaTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardSection: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  cardSourceLabel: { fontSize: 11 },
  cardHeadline: { fontSize: 17, fontWeight: '800', lineHeight: 24, marginBottom: 8, letterSpacing: -0.2 },
  cardExcerpt: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardAuthorText: { fontSize: 12, fontStyle: 'italic' },
  cardDateText: { fontSize: 12 },
  cardTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  cardTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  cardTagText: { fontSize: 10, fontWeight: '600' },

  // Empty state
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyIconWrap: { width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(255,255,255,0.07)', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#FFF', letterSpacing: -0.4 },
  emptyText: { fontSize: 13, color: 'rgba(255,255,255,0.48)', textAlign: 'center', lineHeight: 20, paddingHorizontal: 30 },
  retryButton: { borderRadius: 14, overflow: 'hidden', marginTop: 6 },
  retryButtonInner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 13 },
  retryButtonText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  // Archive
  archiveCalendarWrap: { borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginBottom: 14, padding: 4 },
  archiveModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  archiveModalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
});
