/**
 * SavedArticlesScreen – Glassmorphic UI
 * Shows all saved/clipped articles with AI-generated summaries.
 */
import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Alert,
  Linking,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { useTheme } from '../features/Reference/theme/ThemeContext';
import { getSavedArticles, deleteSavedArticle } from '../services/savedArticlesService';

// ── Article Card ─────────────────────────────────────────────────────────────
const ArticleCard = ({ article, dark, onDelete }) => {
  const handlePress = () => {
    if (article.url) Linking.openURL(article.url);
  };

  const handleDelete = () => {
    Alert.alert('Delete Article', `Remove "${article.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => onDelete(article.id),
      },
    ]);
  };

  const savedDate = new Date(article.savedAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      style={[styles.card, { backgroundColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)', borderColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
    >
      {/* Header row: domain + date + delete */}
      <View style={styles.cardHeader}>
        <View style={styles.domainRow}>
          <Ionicons name="globe-outline" size={13} color={dark ? '#5EC7B2' : '#4AB09D'} />
          <Text style={[styles.domainText, { color: dark ? '#5EC7B2' : '#4AB09D' }]} numberOfLines={1}>
            {article.domain || 'unknown'}
          </Text>
        </View>
        <View style={styles.cardActions}>
          <Text style={[styles.dateText, { color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }]}>
            {savedDate}
          </Text>
          <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="trash-outline" size={17} color={dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Title */}
      <Text style={[styles.cardTitle, { color: dark ? '#FFFFFF' : '#1F2937' }]} numberOfLines={2}>
        {article.title || 'Untitled'}
      </Text>

      {/* Summary */}
      {article.summary ? (
        <Text style={[styles.cardSummary, { color: dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)' }]} numberOfLines={3}>
          {article.summary}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
};

// ── Empty State ──────────────────────────────────────────────────────────────
const EmptyState = ({ dark }) => (
  <View style={styles.emptyContainer}>
    <Ionicons name="bookmark-outline" size={64} color={dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'} />
    <Text style={[styles.emptyTitle, { color: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)' }]}>
      No saved articles yet
    </Text>
    <Text style={[styles.emptySubtitle, { color: dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }]}>
      Share URLs from any app or tap the + button to clip a webpage
    </Text>
  </View>
);

// ── Main Screen ──────────────────────────────────────────────────────────────
const SavedArticlesScreen = ({ navigation }) => {
  const { isDark } = useTheme();
  const dark = isDark;
  const insets = useSafeAreaInsets();

  const [articles, setArticles] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadArticles = useCallback(async () => {
    const data = await getSavedArticles();
    setArticles(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadArticles();
    }, [loadArticles])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadArticles();
    setRefreshing(false);
  }, [loadArticles]);

  const handleDelete = useCallback(async (id) => {
    const success = await deleteSavedArticle(id);
    if (success) {
      setArticles((prev) => prev.filter((a) => a.id !== id));
    }
  }, []);

  const BG = dark ? ['#0F0B1E', '#1A103A', '#0F0B1E'] : ['#F8F7FF', '#EDE9FE', '#F8F7FF'];

  return (
    <View style={styles.flex}>
      <LinearGradient colors={BG} style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={['top']}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={dark ? '#FFFFFF' : '#1F2937'} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: dark ? '#FFFFFF' : '#1F2937' }]}>
              Saved Articles
            </Text>
            <View style={styles.headerRight}>
              <Text style={[styles.countBadge, { backgroundColor: dark ? 'rgba(42,125,235,0.2)' : 'rgba(42,125,235,0.1)', color: dark ? '#5EC7B2' : '#4AB09D' }]}>
                {articles.length}
              </Text>
            </View>
          </View>

          {/* Article List */}
          <FlatList
            data={articles}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <ArticleCard article={item} dark={dark} onDelete={handleDelete} />
            )}
            contentContainerStyle={[styles.listContent, articles.length === 0 && styles.emptyList]}
            ListEmptyComponent={<EmptyState dark={dark} />}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={dark ? '#5EC7B2' : '#4AB09D'}
              />
            }
            showsVerticalScrollIndicator={false}
          />

          {/* FAB - Add URL */}
          <TouchableOpacity
            style={[styles.fab, { bottom: insets.bottom + 20 }]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('WebClipperScreen')}
          >
            <LinearGradient colors={['#2A7DEB', '#1A5DB8']} style={styles.fabGradient}>
              <Ionicons name="add" size={28} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countBadge: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    overflow: 'hidden',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  domainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  domainText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateText: {
    fontSize: 11,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  cardSummary: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    right: 20,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4AB09D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default SavedArticlesScreen;
