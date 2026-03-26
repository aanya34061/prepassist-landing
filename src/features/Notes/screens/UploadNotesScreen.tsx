import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    TextInput,
    ActivityIndicator,
    Alert,
    Animated,
    RefreshControl,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
    getAllNotes,
    getAllTags,
    searchNotes,
    deleteNote,
    getNotesStats,
    LocalNote,
    LocalTag,
} from '../services/localNotesStorage';
import { checkNewsMatches, MatchedArticle, getMatchesByNoteId } from '../../../services/NewsMatchService';
import { Modal } from 'react-native';
import InsightSupportModal from '../../../components/InsightSupportModal';
import { InsightAgent } from '../../../services/InsightAgent';
import { useTheme } from '../../../features/Reference/theme/ThemeContext';
import { LowCreditBanner } from '../../../hooks/useAIFeature';
import useCredits from '../../../hooks/useCredits';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface UPSCNotesScreenProps {
    navigation: any;
}

// Source type icons and colors
const SOURCE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
    manual: { icon: 'create-outline', color: '#2A7DEB', label: 'Manual' },
    scraped: { icon: 'link-outline', color: '#06B6D4', label: 'Web Article' },
    ncert: { icon: 'book-outline', color: '#10B981', label: 'NCERT' },
    book: { icon: 'library-outline', color: '#2A7DEB', label: 'Book' },
    current_affairs: { icon: 'newspaper-outline', color: '#F59E0B', label: 'Current Affairs' },
    report: { icon: 'document-text-outline', color: '#EF4444', label: 'Report' },
};

// Tabs for filtering
const TABS = [
    { key: 'all', label: 'All Notes', icon: 'documents-outline' },
    { key: 'scraped', label: 'Web Clips', icon: 'link-outline' },
    { key: 'manual', label: 'My Notes', icon: 'create-outline' },
    { key: 'current_affairs', label: 'Current Affairs', icon: 'newspaper-outline' },
];

const FREE_NOTE_LIMIT = 3;

export const UploadNotesScreen: React.FC<UPSCNotesScreenProps> = ({ navigation }) => {
    const { isFreePlan } = useCredits();
    // State
    const [notes, setNotes] = useState<LocalNote[]>([]);
    const [tags, setTags] = useState<LocalTag[]>([]);
    const [filteredNotes, setFilteredNotes] = useState<LocalNote[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [selectedTags, setSelectedTags] = useState<number[]>([]);
    const [stats, setStats] = useState({ totalNotes: 0, pinnedNotes: 0, scrapedNotes: 0 });
    const [showTagFilter, setShowTagFilter] = useState(false);
    const [newsMatches, setNewsMatches] = useState<MatchedArticle[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showInsightSupport, setShowInsightSupport] = useState(false);
    const [aiInsightStatus, setAiInsightStatus] = useState<'none' | 'updates'>('none');
    const [noteUpdatesMap, setNoteUpdatesMap] = useState<Record<number, number>>({});
    const { theme, isDark } = useTheme();

    // Reload data on focus
    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    // Live Heartbeat: Auto-scan for news every 5 mins while focused
    useEffect(() => {
        const interval = setInterval(() => {
            console.log('[Heartbeat] Proactive background scan starting...');
            checkNewsMatches().then(matches => {
                setNewsMatches(matches);
                console.log(`[Heartbeat] Scan complete. ${matches.length} active updates.`);
            });
            InsightAgent.checkNoteStatus().then(res => {
                if (res.status === 'updates_available') setAiInsightStatus('updates');
            });
        }, 60 * 1000); // 60 SECONDS (1 Minute Cycle)
        return () => clearInterval(interval);
    }, []);

    // Filter notes when search/tab/tags change
    useEffect(() => {
        filterNotes();
    }, [notes, searchQuery, activeTab, selectedTags]);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [notesData, tagsData, statsData] = await Promise.all([
                getAllNotes(),
                getAllTags(),
                getNotesStats(),
            ]);
            setNotes(notesData);
            setTags(tagsData);
            setStats(statsData);

            // Check for news matches
            try {
                console.log('[UPSCNotes] Starting Knowledge Radar scan...');
                const matches = await checkNewsMatches();
                setNewsMatches(matches);
                const updatesMap = await getMatchesByNoteId();
                setNoteUpdatesMap(updatesMap);
                console.log(`[UPSCNotes] Scan complete. Found ${matches.length} matches.`);
            } catch (err) {
                console.error("Failed to check news matches", err);
            }

            // AI Insight background check (Silent)
            InsightAgent.checkNoteStatus().then(res => {
                console.log('[UPSCNotes] AI Insight status:', res.status, res.message);
                if (res.status === 'updates_available') {
                    setAiInsightStatus('updates');
                } else {
                    setAiInsightStatus('none');
                }
            }).catch(e => console.log('[UPSCNotes] Background check failed', e));
        } catch (error) {
            console.error('Error loading notes:', error);
            Alert.alert('Error', 'Failed to load notes');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadData();
        setIsRefreshing(false);
    };

    const filterNotes = useCallback(async () => {
        let filtered = [...notes];

        // Filter by tab (source type)
        if (activeTab !== 'all') {
            filtered = filtered.filter(note => note.sourceType === activeTab);
        }

        // Filter by search query
        if (searchQuery.trim()) {
            filtered = filtered.filter(note =>
                note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                note.summary?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Filter by selected tags
        if (selectedTags.length > 0) {
            filtered = filtered.filter(note =>
                selectedTags.some(tagId => note.tags.some(t => t.id === tagId))
            );
        }

        // Exclude archived
        filtered = filtered.filter(note => !note.isArchived);

        // Sort: pinned first, then by date
        filtered.sort((a, b) => {
            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });

        setFilteredNotes(filtered);
    }, [notes, searchQuery, activeTab, selectedTags]);

    const handleDeleteNote = (noteId: number) => {
        Alert.alert(
            'Delete Note',
            'Are you sure you want to delete this note?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteNote(noteId);
                        loadData();
                    },
                },
            ]
        );
    };

    const toggleTag = (tagId: number) => {
        setSelectedTags(prev =>
            prev.includes(tagId)
                ? prev.filter(id => id !== tagId)
                : [...prev, tagId]
        );
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    const renderNoteCard = ({ item: note }: { item: LocalNote }) => {
        const sourceConfig = SOURCE_CONFIG[note.sourceType || 'manual'];

        return (
            <TouchableOpacity
                style={[styles.noteCard, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.072)' : '#FFFFFF',
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.10)' : '#E4E6F0',
                }]}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('NoteDetailScreen', { noteId: note.id })}
                onLongPress={() => handleDeleteNote(note.id)}
            >
                {/* Pin indicator */}
                {note.isPinned && (
                    <View style={styles.pinnedBadge}>
                        <Ionicons name="pin" size={12} color="#F59E0B" />
                    </View>
                )}

                {/* Source indicator */}
                <View style={[styles.sourceIndicator, { backgroundColor: sourceConfig.color + '20' }]}>
                    <Ionicons name={sourceConfig.icon as any} size={14} color={sourceConfig.color} />
                    <Text style={[styles.sourceLabel, { color: sourceConfig.color }]}>
                        {sourceConfig.label}
                    </Text>
                </View>

                {/* Title + Update Badge */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <Text style={[styles.noteTitle, { color: isDark ? '#F0F0FF' : '#333333', flex: 1, marginBottom: 0 }]} numberOfLines={2}>
                        {note.title}
                    </Text>
                    {noteUpdatesMap[note.id] > 0 && (
                        <View style={{ backgroundColor: '#F97316', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                            <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>
                                {noteUpdatesMap[note.id]} update{noteUpdatesMap[note.id] > 1 ? 's' : ''}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Summary or content preview */}
                <Text style={[styles.notePreview, { color: isDark ? 'rgba(255,255,255,0.55)' : '#3D565E' }]} numberOfLines={3}>
                    {note.summary || note.content.slice(0, 150)}
                </Text>

                {/* Tags */}
                {note.tags.length > 0 && (
                    <View style={styles.tagsRow}>
                        {note.tags.slice(0, 3).map(tag => (
                            <TouchableOpacity
                                key={tag.id}
                                style={[styles.tagChip, { backgroundColor: tag.color + '20' }]}
                                onPress={() => toggleTag(tag.id)}
                            >
                                <Text style={[styles.tagText, { color: tag.color }]}>
                                    #{tag.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                        {note.tags.length > 3 && (
                            <Text style={styles.moreTagsText}>+{note.tags.length - 3}</Text>
                        )}
                    </View>
                )}

                {/* Footer */}
                <View style={styles.noteFooter}>
                    <Text style={[styles.noteDate, { color: isDark ? 'rgba(255,255,255,0.35)' : '#9CA3AF' }]}>{formatDate(note.updatedAt)}</Text>
                    {note.sourceUrl && (
                        <Ionicons name="link" size={14} color="#9CA3AF" />
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F3F4F6' }]}>
                <Ionicons name="document-text-outline" size={64} color={isDark ? 'rgba(255,255,255,0.25)' : '#D1D5DB'} />
            </View>
            <Text style={[styles.emptyTitle, { color: isDark ? '#F0F0FF' : '#1F2937' }]}>
                {searchQuery ? 'No notes found' : 'Start Your UPSC Notes'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: isDark ? 'rgba(255,255,255,0.55)' : '#6B7280' }]}>
                {searchQuery
                    ? 'Try different search terms or tags'
                    : 'Create notes from web articles, books, or your own insights'}
            </Text>
            {!searchQuery && (
                <TouchableOpacity
                    style={styles.emptyButton}
                    onPress={() => navigation.navigate('CreateNoteScreen')}
                >
                    <Text style={styles.emptyButtonText}>Create Your First Note</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    const renderHeader = () => (
        <View style={styles.headerContent}>
            {/* Stats Cards */}
            <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(42,125,235,0.15)' : '#F0EAE0' }]}>
                    <Ionicons name="documents-outline" size={20} color="#2A7DEB" />
                    <Text style={[styles.statNumber, { color: isDark ? '#F0F0FF' : '#1F2937' }]}>{stats.totalNotes}</Text>
                    <Text style={[styles.statLabel, { color: isDark ? 'rgba(255,255,255,0.55)' : '#6B7280' }]}>Total Notes</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#FEF3C7' }]}>
                    <Ionicons name="pin-outline" size={20} color="#F59E0B" />
                    <Text style={[styles.statNumber, { color: isDark ? '#F0F0FF' : '#1F2937' }]}>{stats.pinnedNotes}</Text>
                    <Text style={[styles.statLabel, { color: isDark ? 'rgba(255,255,255,0.55)' : '#6B7280' }]}>Pinned</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(6,182,212,0.15)' : '#CFFAFE' }]}>
                    <Ionicons name="link-outline" size={20} color="#06B6D4" />
                    <Text style={[styles.statNumber, { color: isDark ? '#F0F0FF' : '#1F2937' }]}>{stats.scrapedNotes}</Text>
                    <Text style={[styles.statLabel, { color: isDark ? 'rgba(255,255,255,0.55)' : '#6B7280' }]}>Web Clips</Text>
                </View>
            </View>

            {/* Search Bar */}
            <View style={[styles.searchContainer, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.14)' : '#E5E7EB',
            }]}>
                <Ionicons name="search-outline" size={20} color={isDark ? 'rgba(255,255,255,0.45)' : '#9CA3AF'} />
                <TextInput
                    style={[styles.searchInput, { color: isDark ? '#F0F0FF' : '#1F2937' }]}
                    placeholder="Search notes, tags..."
                    placeholderTextColor={isDark ? 'rgba(255,255,255,0.30)' : '#9CA3AF'}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={20} color={isDark ? 'rgba(255,255,255,0.45)' : '#9CA3AF'} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                {TABS.map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.tab, {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
                            borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#E5E7EB',
                        }, activeTab === tab.key && styles.activeTab]}
                        onPress={() => setActiveTab(tab.key)}
                    >
                        <Ionicons
                            name={tab.icon as any}
                            size={16}
                            color={activeTab === tab.key ? '#2A7DEB' : (isDark ? 'rgba(255,255,255,0.45)' : '#9CA3AF')}
                        />
                        <Text style={[
                            styles.tabText,
                            { color: isDark ? 'rgba(255,255,255,0.55)' : '#6B7280' },
                            activeTab === tab.key && styles.activeTabText
                        ]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Tag Filter Toggle */}
            <TouchableOpacity
                style={styles.tagFilterToggle}
                onPress={() => setShowTagFilter(!showTagFilter)}
            >
                <Ionicons name="pricetag-outline" size={16} color={isDark ? 'rgba(255,255,255,0.45)' : '#6B7280'} />
                <Text style={[styles.tagFilterText, { color: isDark ? 'rgba(255,255,255,0.55)' : '#6B7280' }]}>
                    {selectedTags.length > 0 ? `${selectedTags.length} tags selected` : 'Filter by tags'}
                </Text>
                <Ionicons
                    name={showTagFilter ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={isDark ? 'rgba(255,255,255,0.45)' : '#6B7280'}
                />
            </TouchableOpacity>

            {/* Tag Filter Pills */}
            {showTagFilter && (
                <View style={styles.tagFilterContainer}>
                    {tags.slice(0, 15).map(tag => (
                        <TouchableOpacity
                            key={tag.id}
                            style={[
                                styles.filterTagChip,
                                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6' },
                                selectedTags.includes(tag.id) && { backgroundColor: tag.color + '30' },
                            ]}
                            onPress={() => toggleTag(tag.id)}
                        >
                            <Text style={[
                                styles.filterTagText,
                                { color: isDark ? 'rgba(255,255,255,0.55)' : '#6B7280' },
                                selectedTags.includes(tag.id) && { color: tag.color, fontWeight: '600' },
                            ]}>
                                #{tag.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Results count */}
            <Text style={[styles.resultsCount, { color: isDark ? 'rgba(255,255,255,0.35)' : '#9CA3AF' }]}>
                {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}
            </Text>
        </View>
    );

    if (isLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: isDark ? '#07091A' : '#FFFFFF' }}>
                <LinearGradient colors={isDark ? ['#07091A', '#0F0A2E', '#080E28'] : ['#FFFFFF', '#FFFFFF', '#FFFFFF']} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
                <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: 'transparent' }]}>
                    <View style={styles.loadingContainer}>
                        <LinearGradient colors={['#1A5DB8', '#2A7DEB']} style={styles.loadingBubble}>
                            <ActivityIndicator size="large" color="#FFF" />
                        </LinearGradient>
                        <Text style={[styles.loadingText, { color: isDark ? 'rgba(255,255,255,0.55)' : '#6B7280' }]}>Loading notes...</Text>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1, backgroundColor: isDark ? '#07091A' : '#FFFFFF' }}>
            <LinearGradient colors={isDark ? ['#07091A', '#0F0A2E', '#080E28'] : ['#FFFFFF', '#FFFFFF', '#FFFFFF']} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
                {isDark && (
                <View pointerEvents="none" style={{ position: 'absolute', width: 300, height: 300, borderRadius: 150, top: -70, right: -70, overflow: 'hidden' }}>
                <LinearGradient colors={['rgba(42,125,235,0.24)', 'transparent']} style={{ flex: 1 }} />
            </View>
                )}
            <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: 'transparent' }]}>
            {/* Glassmorphic Header */}
            <LinearGradient
                colors={['#1A5DB8', '#3730A3', '#312E81']}
                start={{ x: 0, y: 0 }} end={{ x: 1.2, y: 1 }}
                style={styles.header}
            >
                {/* Shimmer line */}
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, backgroundColor: 'rgba(255,255,255,0.28)' }} />
                {/* Decorative circles */}
                <View style={{ position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.055)', top: -60, right: -50 }} />
                <View style={{ position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.07)', bottom: 10, left: -20 }} />

                <View style={styles.heroRow}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                    >
                        <Ionicons name="arrow-back" size={20} color="#FFF" />
                    </TouchableOpacity>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                        <Text style={styles.headerTitle}>My Notes</Text>
                        <Text style={styles.headerSubtitle}>Create & organize your notes</Text>
                    </View>
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('WebClipperScreen')}
                            style={styles.headerIconBtn}
                        >
                            <Ionicons name="globe-outline" size={19} color="#FFF" />
                        </TouchableOpacity>
                        {/* Notification Bell */}
                        <TouchableOpacity
                            style={styles.headerIconBtn}
                            onPress={() => setShowNotifications(true)}
                        >
                            <Ionicons
                                name={newsMatches.length > 0 ? "notifications" : "notifications-outline"}
                                size={19}
                                color={newsMatches.length > 0 ? "#FCD34D" : "#FFF"}
                            />
                            {newsMatches.length > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{newsMatches.length}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </LinearGradient>

            {/* Notifications Modal */}
            <Modal
                visible={showNotifications}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowNotifications(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, {
                        backgroundColor: isDark ? 'rgba(10,8,40,0.98)' : '#FFFFFF',
                        borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#E4E6F0',
                        borderWidth: 1,
                    }]}>
                        {/* Pull handle */}
                        <View style={{ width: 38, height: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: isDark ? '#F0F0FF' : '#1F2937' }]}>
                                {newsMatches.length > 0 ? `News Matches (${newsMatches.length})` : 'Knowledge Radar'}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowNotifications(false)}
                                style={[styles.modalCloseBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : '#F3F4F6' }]}
                            >
                                <Ionicons name="close" size={18} color={isDark ? 'rgba(255,255,255,0.80)' : '#3D565E'} />
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.modalSubtitle, { color: isDark ? 'rgba(255,255,255,0.50)' : '#6B7280' }]}>
                            Current affairs related to your notes
                        </Text>

                        {newsMatches.length > 0 ? (
                            <FlatList
                                data={newsMatches}
                                keyExtractor={(item) => item.articleId.toString()}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[styles.matchItem, {
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.055)' : '#F9FAFB',
                                            borderColor: isDark ? 'rgba(255,255,255,0.10)' : '#F3F4F6',
                                        }]}
                                        onPress={() => {
                                            setShowNotifications(false);
                                            navigation.navigate('ArticleDetailScreen', { articleId: item.articleId });
                                        }}
                                    >
                                        <View style={styles.matchHeader}>
                                            <Ionicons name="newspaper-outline" size={16} color="#2A7DEB" />
                                            <Text style={styles.matchReason}>{item.matchReason}</Text>
                                        </View>
                                        <Text style={[styles.matchTitle, { color: isDark ? '#F0F0FF' : '#1F2937' }]} numberOfLines={2}>
                                            {item.articleTitle}
                                        </Text>
                                        <Text style={[styles.matchNoteLink, { color: isDark ? 'rgba(255,255,255,0.40)' : '#6B7280' }]}>
                                            Related to: {item.noteTitle}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                contentContainerStyle={styles.matchList}
                            />
                        ) : (
                            <View style={[styles.emptyState, { paddingVertical: 40 }]}>
                                <Ionicons name="checkmark-circle-outline" size={48} color="#10B981" />
                                <Text style={[styles.emptyTitle, { color: isDark ? '#F0F0FF' : '#1F2937' }]}>All Caught Up!</Text>
                                <Text style={[styles.emptySubtitle, { color: isDark ? 'rgba(255,255,255,0.50)' : '#6B7280' }]}>
                                    No new matches found between your notes and recent news.
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Credits Warning */}
            <LowCreditBanner isDark={isDark} />

            <FlatList
                data={filteredNotes}
                renderItem={renderNoteCard}
                keyExtractor={item => item.id.toString()}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmptyState}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        colors={['#2A7DEB']}
                    />
                }
            />

            {/* FAB for new note */}
            <TouchableOpacity
                style={styles.fab}
                onPress={async () => {
                    if (isFreePlan) {
                        const allNotes = await getAllNotes();
                        if (allNotes.length >= FREE_NOTE_LIMIT) {
                            if (Platform.OS === 'web') {
                                if (window.confirm(`Note Limit Reached\n\nFree users can create up to ${FREE_NOTE_LIMIT} notes.\n\nGet the Cloud Storage plan at just ₹199/month for unlimited notes, PDF storage & cloud sync.\n\nClick OK to view subscription options.`)) {
                                    navigation.navigate('Billing');
                                }
                            } else {
                                Alert.alert(
                                    'Note Limit Reached',
                                    `Free users can create up to ${FREE_NOTE_LIMIT} notes.\n\nGet the Cloud Storage plan at just ₹199/month for unlimited notes, PDF storage & cloud sync.`,
                                    [
                                        { text: 'Cancel', style: 'cancel' },
                                        { text: 'Get Subscription', onPress: () => navigation.navigate('Billing') },
                                    ]
                                );
                            }
                            return;
                        }
                    }
                    navigation.navigate('CreateNoteScreen');
                }}
                activeOpacity={0.8}
            >
                <LinearGradient
                    colors={['#2A7DEB', '#2A7DEB']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.fabGradient}
                >
                    <Ionicons name="add" size={28} color="#FFFFFF" />
                </LinearGradient>
            </TouchableOpacity>

            {/* AI Insight Support Modal */}
            <InsightSupportModal
                visible={showInsightSupport}
                onClose={() => setShowInsightSupport(false)}
            />

            {/* Floating AI Support Button */}
            <TouchableOpacity
                style={[styles.floatingAiButton, { backgroundColor: theme.colors.primary, bottom: 90 }]}
                onPress={() => setShowInsightSupport(true)}
            >
                <LinearGradient
                    colors={[theme.colors.primary, theme.colors.primary + 'CC']}
                    style={styles.floatingAiGradient}
                >
                    <Ionicons name="sparkles" size={24} color="#FFF" />
                    {(aiInsightStatus === 'updates' || newsMatches.length > 0) && <View style={styles.aiBadge} />}
                </LinearGradient>
            </TouchableOpacity>
            </SafeAreaView>
        </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 14,
    },
    loadingBubble: {
        width: 68,
        height: 68,
        borderRadius: 34,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 14,
        color: '#6B7280',
    },
    // ── Header ──────────────────────────────────────────────────────────────
    header: {
        paddingTop: 16,
        paddingHorizontal: 16,
        paddingBottom: 24,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        overflow: 'hidden',
        marginBottom: 4,
    },
    heroRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.30)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.62)',
        marginTop: 2,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerIconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.28)',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    heroIconBubble: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
    },
    badge: {
        position: 'absolute',
        top: -3,
        right: -3,
        backgroundColor: '#EF4444',
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 3,
        borderWidth: 1.5,
        borderColor: 'rgba(50,46,130,0.85)',
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: '800',
    },
    // ── Modal ───────────────────────────────────────────────────────────────
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 20,
        paddingTop: 14,
        maxHeight: '82%',
    },
    modalCloseBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    modalSubtitle: {
        fontSize: 14,
        marginBottom: 16,
    },
    matchList: {
        paddingBottom: 20,
    },
    matchItem: {
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    matchHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        gap: 6,
    },
    matchReason: {
        fontSize: 12,
        color: '#2A7DEB',
        fontWeight: '600',
    },
    matchTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 6,
        lineHeight: 22,
    },
    matchNoteLink: {
        fontSize: 12,
        color: '#6B7280',
        fontStyle: 'italic',
    },
    listContent: {
        paddingBottom: 180,
    },
    headerContent: {
        padding: 16,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        marginTop: 4,
    },
    statLabel: {
        fontSize: 11,
        color: '#6B7280',
        marginTop: 2,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 15,
        color: '#1F2937',
    },
    tabsContainer: {
        flexDirection: 'row',
        marginBottom: 12,
        gap: 8,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        gap: 4,
    },
    activeTab: {
        backgroundColor: '#F0EAE0',
        borderColor: '#2A7DEB',
    },
    tabText: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
    },
    activeTabText: {
        color: '#2A7DEB',
        fontWeight: '600',
    },
    tagFilterToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
    },
    tagFilterText: {
        flex: 1,
        fontSize: 13,
        color: '#6B7280',
    },
    tagFilterContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
        marginBottom: 12,
    },
    filterTagChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 14,
        backgroundColor: '#F3F4F6',
    },
    filterTagText: {
        fontSize: 12,
        color: '#6B7280',
    },
    resultsCount: {
        fontSize: 13,
        color: '#9CA3AF',
        marginTop: 4,
    },
    noteCard: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    pinnedBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
    },
    sourceIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 4,
        marginBottom: 8,
    },
    sourceLabel: {
        fontSize: 11,
        fontWeight: '500',
    },
    noteTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 6,
        lineHeight: 22,
    },
    notePreview: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
        marginBottom: 10,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 10,
    },
    tagChip: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    tagText: {
        fontSize: 11,
        fontWeight: '500',
    },
    moreTagsText: {
        fontSize: 11,
        color: '#9CA3AF',
        alignSelf: 'center',
    },
    noteFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    noteDate: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 40,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    emptyButton: {
        backgroundColor: '#2A7DEB',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    emptyButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        borderRadius: 28,
        shadowColor: '#2A7DEB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    fabGradient: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    floatingAiButton: {
        position: 'absolute',
        bottom: 20,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    floatingAiGradient: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    aiBadge: {
        position: 'absolute',
        top: 14,
        right: 14,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FF3B30',
        borderWidth: 1.5,
        borderColor: '#FFF',
    },
});

export default UploadNotesScreen;
