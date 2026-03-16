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
  Image,
  Linking,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../features/Reference/theme/ThemeContext';
import { useWebStyles } from '../components/WebContainer';
import { LinearGradient } from 'expo-linear-gradient';
import { SmartTextInput } from '../components/SmartTextInput';
import { getMobileApiEndpoint } from '../config/api';
import { getSavedArticles, deleteSavedArticle } from '../services/savedArticlesService';
import { supabase } from '../lib/supabase';

const FILTERS = {
  sources: ['The Hindu', 'The Economic Times', 'Press Information Bureau'],
  sourceShort: {
    'The Hindu': 'TH',
    'The Economic Times': 'ET',
    'Press Information Bureau': 'PIB'
  },
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

const SOURCE_LOGOS = {
  'The Hindu': require('../../assets/logos/the_hindu.png'),
  'The Economic Times': require('../../assets/logos/economic_times.png'),
  'Press Information Bureau': require('../../assets/logos/pib.png'),
  'TH': require('../../assets/logos/the_hindu.png'),
  'ET': require('../../assets/logos/economic_times.png'),
  'PIB': require('../../assets/logos/pib.png'),
};

export default function NewsFeedScreen({ navigation, route }) {
  const { theme, isDark } = useTheme();
  const { horizontalPadding } = useWebStyles();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSource, setSelectedSource] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' or 'asc'
  const [activeTab, setActiveTab] = useState('feed'); // 'feed' or 'saved'
  const [savedArticles, setSavedArticles] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);

  const handleDateChange = (event, dateOrString) => {
    setShowDatePicker(false);

    // On Web, dateOrString might be a string from TextInput onChange
    // On Mobile, it's a Date object
    if (dateOrString instanceof Date) {
      const year = dateOrString.getFullYear();
      const month = String(dateOrString.getMonth() + 1).padStart(2, '0');
      const day = String(dateOrString.getDate()).padStart(2, '0');
      setSelectedDate(`${year}-${month}-${day}`);
    } else if (typeof dateOrString === 'string') {
      setSelectedDate(dateOrString);
    }
  };

  const clearDateFilter = () => {
    setSelectedDate('');
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
        .limit(50);

      if (selectedSource) {
        const sourceShortMap = { 'The Hindu': 'TH', 'The Economic Times': 'ET', 'Press Information Bureau': 'PIB' };
        query = query.eq('gs_paper', sourceShortMap[selectedSource] || selectedSource);
      }
      if (selectedSubject && selectedSubject !== 'All') {
        query = query.ilike('subject', `%${selectedSubject}%`);
      }
      if (selectedDate) {
        query = query.gte('published_date', `${selectedDate}T00:00:00`)
                     .lte('published_date', `${selectedDate}T23:59:59`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const fetchedArticles = (data || []).map(a => ({
        ...a,
        gsPaper: a.gs_paper,
        sourceUrl: a.source_url,
        publishedDate: a.published_date,
        createdAt: a.created_at,
        isPublished: a.is_published,
        tags: typeof a.tags === 'string' ? JSON.parse(a.tags) : a.tags,
      }));

      console.log(`[Articles] Fetched ${fetchedArticles.length} articles from Supabase`);
      setArticles(fetchedArticles);
    } catch (err) {
      setError('Failed to load articles. Please try again.');
      console.warn('[Articles] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedSource, selectedSubject, selectedDate]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // Handle navigation param to open Saved tab directly
  useEffect(() => {
    if (route?.params?.initialTab === 'saved') {
      setActiveTab('saved');
    }
  }, [route?.params?.initialTab]);

  useEffect(() => {
    if (activeTab === 'saved') loadSavedArticles();
  }, [activeTab]);

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
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getSourceShort = (source) => {
    if (source === 'The Hindu') return 'TH';
    if (source === 'The Economic Times') return 'ET';
    if (source === 'Press Information Bureau') return 'PIB';
    return source;
  };

  const SOURCE_BADGE_COLORS = {
    TH: ['#3B9AFF', '#2A7DEB'],
    ET: ['#3B82F6', '#1D4ED8'],
    PIB: ['#10B981', '#047857'],
  };

  const cardBg     = isDark ? 'rgba(255,255,255,0.072)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.10)'  : theme.colors.border;

  const renderArticleCard = ({ item }) => (
    <TouchableOpacity
      style={[styles.articleCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
      activeOpacity={0.78}
      onPress={() => navigation.navigate('ArticleDetail', { articleId: item.id })}
    >
      <View style={styles.articleContent}>
        <View style={styles.articleHeader}>
          {item.gsPaper && (
            <LinearGradient
              colors={SOURCE_BADGE_COLORS[getSourceShort(item.gsPaper)] || ['#3B9AFF', '#2A7DEB']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.paperBadge}
            >
              <Text style={styles.paperBadgeText}>{getSourceShort(item.gsPaper)}</Text>
            </LinearGradient>
          )}
          {item.subject && (
            <View style={[styles.subjectBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : theme.colors.primaryLight, borderColor: isDark ? 'rgba(255,255,255,0.18)' : theme.colors.borderStrong }]}>
              <Text style={[styles.subjectBadgeText, { color: isDark ? 'rgba(255,255,255,0.75)' : theme.colors.primary }]}>{item.subject}</Text>
            </View>
          )}
        </View>

        <Text style={[styles.articleTitle, { color: theme.colors.text }]} numberOfLines={2}>{item.title}</Text>

        {item.summary && (
          <Text style={[styles.articleSummary, { color: theme.colors.textSecondary }]} numberOfLines={3}>{item.summary}</Text>
        )}

        <View style={styles.articleFooter}>
          {item.author && (
            <View style={styles.authorInfo}>
              <Ionicons name="person-outline" size={13} color={theme.colors.textTertiary} />
              <Text style={[styles.authorText, { color: theme.colors.textTertiary }]}>{item.author}</Text>
            </View>
          )}
          <Text style={[styles.dateText, { color: theme.colors.textTertiary }]}>{formatDate(item.publishedDate || item.createdAt)}</Text>
        </View>

        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {(typeof item.tags === 'string' ? JSON.parse(item.tags) : item.tags).slice(0, 3).map((tag, index) => (
              <View key={index} style={[styles.tag, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : theme.colors.backgroundAlt, borderColor: cardBorder }]}>
                <Text style={[styles.tagText, { color: theme.colors.textSecondary }]}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderSourceCard = (source) => {
    const isSelected = selectedSource === source;
    const logo = SOURCE_LOGOS[source];

    return (
      <TouchableOpacity
        key={source}
        style={[styles.sourceCard, {
          backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#D9CFC2',
        }, isSelected && styles.sourceCardSelected]}
        activeOpacity={0.78}
        onPress={() => setSelectedSource(isSelected ? null : source)}
      >
        {isSelected && (
          <LinearGradient
            colors={['rgba(42,125,235,0.22)', 'rgba(42,125,235,0.12)']}
            style={StyleSheet.absoluteFillObject}
          />
        )}
        {logo && <Image source={logo} style={styles.sourceLogo} resizeMode="contain" />}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : theme.colors.backgroundAlt }]}>
        <Ionicons name="newspaper-outline" size={42} color={theme.colors.textTertiary} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Articles Found</Text>
      <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>{error || 'Try adjusting your filters or check back later.'}</Text>
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
    </View>
  );

  const renderSavedArticleCard = (item) => (
    <View key={item.id} style={[styles.articleCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      <View style={styles.articleContent}>
        <View style={styles.articleHeader}>
          <LinearGradient
            colors={['#10B981', '#047857']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.paperBadge}
          >
            <Text style={styles.paperBadgeText}>SAVED</Text>
          </LinearGradient>
          {item.domain ? (
            <View style={[styles.subjectBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : theme.colors.primaryLight, borderColor: isDark ? 'rgba(255,255,255,0.18)' : theme.colors.borderStrong }]}>
              <Text style={[styles.subjectBadgeText, { color: isDark ? 'rgba(255,255,255,0.75)' : theme.colors.primary }]}>{item.domain}</Text>
            </View>
          ) : null}
        </View>

        <Text style={[styles.articleTitle, { color: theme.colors.text }]} numberOfLines={2}>{item.title}</Text>

        {item.summary ? (
          <Text style={[styles.articleSummary, { color: theme.colors.textSecondary }]} numberOfLines={4}>{item.summary}</Text>
        ) : null}

        <View style={styles.articleFooter}>
          <Text style={[styles.dateText, { color: theme.colors.textTertiary }]}>{formatDate(item.savedAt)}</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={() => Linking.openURL(item.url)}>
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

          {/* Source Filters */}
          <View style={[styles.sourceFilters]}>
            {FILTERS.sources.map(source => renderSourceCard(source))}
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
            <DateTimePicker
              value={selectedDate ? new Date(selectedDate) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
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
              <Text style={[styles.loadingText, { color: isDark ? 'rgba(255,255,255,0.50)' : '#7A8A91' }]}>Loading articles…</Text>
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

  // Source cards
  sourceFilters: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  sourceCard: { flex: 1, height: 64, borderRadius: 16, justifyContent: 'center', alignItems: 'center', padding: 8, borderWidth: 1, overflow: 'hidden' },
  sourceCardSelected: { borderColor: '#3B9AFF', borderWidth: 2 },
  sourceLogo: { width: '80%', height: 38 },

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

  // Articles
  articlesList: { gap: 12 },
  articleCard: { borderRadius: 20, padding: 18, marginBottom: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', overflow: 'hidden' },
  articleContent: { flex: 1 },
  articleHeader: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  paperBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  paperBadgeText: { fontSize: 11, fontWeight: '800', color: '#FFF', letterSpacing: 0.3 },
  subjectBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  subjectBadgeText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.80)' },
  articleTitle: { fontSize: 16, fontWeight: '700', color: '#FFF', lineHeight: 23, marginBottom: 8, letterSpacing: -0.3 },
  articleSummary: { fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 20, marginBottom: 12 },
  articleFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  authorInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  authorText: { fontSize: 12, color: 'rgba(255,255,255,0.40)' },
  dateText: { fontSize: 12, color: 'rgba(255,255,255,0.38)' },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.10)' },
  tagText: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.55)' },

  // Empty state
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyIconWrap: { width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(255,255,255,0.07)', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#FFF', letterSpacing: -0.4 },
  emptyText: { fontSize: 13, color: 'rgba(255,255,255,0.48)', textAlign: 'center', lineHeight: 20, paddingHorizontal: 30 },
  retryButton: { borderRadius: 14, overflow: 'hidden', marginTop: 6 },
  retryButtonInner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 13 },
  retryButtonText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
