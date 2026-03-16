import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    TextInput,
    Dimensions,
    Platform,
    Modal,
    ScrollView,
    Alert,
    Animated,
    ActivityIndicator,
    KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../features/Reference/theme/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import InsightSupportModal from '../../../components/InsightSupportModal';
import { InsightAgent } from '../../../services/InsightAgent';
import {
    getAllNotes,
    getAllTags,
    createNote,
    deleteNote,
    createTag,
    deleteTag,
    searchNotes,
    updateNote,
    LocalNote,
    LocalTag,
} from '../services/localNotesStorage';
import { useAuth } from '../../../context/AuthContext';
import useCredits from '../../../hooks/useCredits';
import { fetchNotesFromFirebase, syncNoteToFirebase, deleteNoteFromFirebase } from '../../../services/firebaseNotesSync';
import { checkNewsMatches, getMatchesByNoteId, markNoteMatchesAsRead } from '../../../services/NewsMatchService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// Modern vibrant colors
const CARD_COLORS = [
    { bg: '#FFF3E0', accent: '#FF9800', icon: '#E65100' },
    { bg: '#E3F2FD', accent: '#2196F3', icon: '#1565C0' },
    { bg: '#F3E5F5', accent: '#9C27B0', icon: '#6A1B9A' },
    { bg: '#E8F5E9', accent: '#4CAF50', icon: '#2E7D32' },
    { bg: '#FCE4EC', accent: '#E91E63', icon: '#AD1457' },
    { bg: '#E0F7FA', accent: '#00BCD4', icon: '#00838F' },
    { bg: '#FFF8E1', accent: '#FFC107', icon: '#FF8F00' },
    { bg: '#EDE7F6', accent: '#673AB7', icon: '#4527A0' },
];

const getCardColors = (id: number) => CARD_COLORS[id % CARD_COLORS.length];

const TAG_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
];

export const NoteListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { theme, isDark } = useTheme();
    const { user } = useAuth();
    const { isFreePlan } = useCredits();

    const FREE_NOTE_LIMIT = 3;
    const [showInsightSupport, setShowInsightSupport] = useState(false);
    const [aiInsightStatus, setAiInsightStatus] = useState<'none' | 'updates'>('none');
    const [notes, setNotes] = useState<LocalNote[]>([]);
    const [tags, setTags] = useState<LocalTag[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
    const [showTagModal, setShowTagModal] = useState(false);
    const [showCreateTagModal, setShowCreateTagModal] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
    const [activeTab, setActiveTab] = useState<'all' | 'pinned'>('all');
    const [noteUpdatesMap, setNoteUpdatesMap] = useState<Record<number, number>>({});

    const fadeAnim = useRef(new Animated.Value(0)).current;

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    useEffect(() => {
        if (!loading) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }).start();
        }
    }, [loading]);

    useEffect(() => {
        if (searchQuery || selectedTagIds.length > 0) {
            filterNotes();
        } else {
            loadNotes();
        }
    }, [searchQuery, selectedTagIds]);

    const loadData = async () => {
        setLoading(true);
        fadeAnim.setValue(0);
        await Promise.all([loadNotes(), loadTags()]);

        // AI Insight background check (Silent)
        InsightAgent.checkNoteStatus().then(res => {
            if (res.status === 'updates_available') {
                setAiInsightStatus('updates');
            } else {
                setAiInsightStatus('none');
            }
        }).catch(e => console.log('[NoteList] Background check failed', e));

        // News match: load cached immediately, then refresh in background
        getMatchesByNoteId().then(map => setNoteUpdatesMap(map)).catch(() => {});
        checkNewsMatches().then(async () => {
            const map = await getMatchesByNoteId();
            setNoteUpdatesMap(map);
        }).catch(() => {});

        setLoading(false);
    };

    const loadNotes = async () => {
        const allNotes = await getAllNotes();
        setNotes(allNotes.filter(n => !n.isArchived));

        // Merge notes from Firestore (restores notes on new device)
        if (user?.id) {
            setSyncing(true);
            try {
                const serverNotes = await fetchNotesFromFirebase(user.id);
                const localMap = new Map(allNotes.map(n => [n.id, n]));
                let merged = false;

                // Pull: restore/update notes from Firebase → local
                for (const sNote of serverNotes) {
                    const local = localMap.get(sNote.id);
                    if (!local) {
                        await createNote({ ...sNote, id: sNote.id });
                        merged = true;
                    } else if (sNote.updatedAt > local.updatedAt) {
                        await updateNote(local.id, sNote);
                        merged = true;
                    }
                }

                // Push: sync local-only notes → Firebase
                const serverIdSet = new Set(serverNotes.map(n => n.id));
                for (const localNote of allNotes) {
                    if (!serverIdSet.has(localNote.id)) {
                        syncNoteToFirebase(user.id, localNote);
                    }
                }

                if (merged) {
                    const refreshed = await getAllNotes();
                    setNotes(refreshed.filter(n => !n.isArchived));
                }
            } catch (e) {
                console.warn('[NoteList] Firebase merge failed:', e);
            } finally {
                setSyncing(false);
            }
        }
    };

    const loadTags = async () => {
        const allTags = await getAllTags();
        setTags(allTags);
    };

    const filterNotes = async () => {
        const filtered = await searchNotes(searchQuery, selectedTagIds);
        setNotes(filtered);
    };

    const handleCreateNote = async () => {
        // Check note limit for free users
        if (isFreePlan) {
            const allNotes = await getAllNotes();
            if (allNotes.length >= FREE_NOTE_LIMIT) {
                Alert.alert(
                    'Note Limit Reached',
                    `Free users can create up to ${FREE_NOTE_LIMIT} notes.\n\nGet the Cloud Storage plan at just ₹199/month for unlimited notes, PDF storage & cloud sync.`,
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Get Subscription', onPress: () => navigation.navigate('Billing') },
                    ]
                );
                return;
            }
        }

        const newNote = await createNote({ title: '', content: '' });
        if (newNote && user?.id) syncNoteToFirebase(user.id, newNote);
        navigation.navigate('NoteEditor', { noteId: newNote.id, isNew: true });
    };

    const handleDeleteNote = (noteId: number, noteTitle: string) => {
        Alert.alert('Delete Note', `Delete "${noteTitle || 'Untitled'}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    await deleteNote(noteId);
                    if (user?.id) deleteNoteFromFirebase(user.id, noteId);
                    loadNotes();
                },
            },
        ]);
    };

    const handleTogglePin = async (note: LocalNote) => {
        const updated = await updateNote(note.id, { isPinned: !note.isPinned });
        if (updated && user?.id) syncNoteToFirebase(user.id, updated);
        loadNotes();
    };

    const handleCreateTag = async () => {
        if (!newTagName.trim()) return;
        await createTag(newTagName.trim(), newTagColor, 'custom');
        setNewTagName('');
        setShowCreateTagModal(false);
        loadTags();
    };

    const handleDeleteTag = async (tagId: number) => {
        await deleteTag(tagId);
        loadTags();
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        if (mins < 1) return 'Now';
        if (mins < 60) return `${mins}m`;
        if (hours < 24) return `${hours}h`;
        if (days < 7) return `${days}d`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getPreview = (content: string) => {
        return content.replace(/^[#\-*>\[\]]+\s*/gm, '').replace(/\n+/g, ' ').trim().slice(0, 80) || 'Tap to add content...';
    };

    const displayNotes = activeTab === 'pinned'
        ? notes.filter(n => n.isPinned)
        : notes;

    const pinnedCount = notes.filter(n => n.isPinned).length;

    const renderNoteCard = (note: LocalNote, index: number) => {
        const colors = getCardColors(note.id);

        return (
            <TouchableOpacity
                key={note.id}
                style={[styles.noteCard, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FEFEFE',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                }]}
                onPress={() => {
                    if (noteUpdatesMap[note.id] > 0) {
                        markNoteMatchesAsRead(note.id).then(() => {
                            setNoteUpdatesMap(prev => { const next = { ...prev }; delete next[note.id]; return next; });
                        });
                    }
                    navigation.navigate('NoteEditor', { noteId: note.id });
                }}
                onLongPress={() => handleDeleteNote(note.id, note.title)}
                activeOpacity={0.8}
            >
                {/* Accent Bar */}
                <View style={[styles.noteAccentBar, { backgroundColor: colors.accent }]} />

                {/* Top Row */}
                <View style={styles.cardTop}>
                    <View style={[styles.noteIcon, { backgroundColor: colors.accent + '30' }]}>
                        <Ionicons name="document-text" size={16} color={colors.icon} />
                    </View>
                    {(noteUpdatesMap[note.id] || 0) > 0 && (
                        <View style={styles.updateBadge}>
                            <Ionicons name="alert-circle" size={11} color="#FFF" />
                            <Text style={styles.updateBadgeText}>New Updates</Text>
                        </View>
                    )}
                    <TouchableOpacity
                        onPress={() => handleTogglePin(note)}
                        style={styles.pinBtn}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <Ionicons
                            name={note.isPinned ? 'bookmark' : 'bookmark-outline'}
                            size={18}
                            color={note.isPinned ? colors.icon : '#9CA3AF'}
                        />
                    </TouchableOpacity>
                </View>

                {/* Title */}
                <Text style={[styles.noteTitle, { color: isDark ? '#F3F4F6' : colors.icon }]} numberOfLines={2}>
                    {note.title || 'Untitled'}
                </Text>

                {/* Preview */}
                <Text style={[styles.notePreview, { color: isDark ? '#9CA3AF' : '#6B7280' }]} numberOfLines={3}>
                    {getPreview(note.content)}
                </Text>

                {/* Bottom */}
                <View style={styles.cardBottom}>
                    <Text style={[styles.noteDate, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>{formatDate(note.updatedAt)}</Text>
                    {note.tags.length > 0 && (
                        <View style={styles.tagCount}>
                            <Ionicons name="pricetag" size={10} color="#6B7280" />
                            <Text style={styles.tagCountText}>{note.tags.length}</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#07091A' : '#FFFFFF' }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF' }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6' }]}>
                    <Ionicons name="chevron-back" size={24} color={isDark ? '#E5E7EB' : '#111827'} />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <Text style={[styles.pageTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>Notes</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.noteCount, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>{notes.length} notes</Text>
                        {syncing && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <ActivityIndicator size="small" color="#2A7DEB" />
                                <Text style={{ fontSize: 11, color: '#2A7DEB', fontWeight: '500' }}>Syncing...</Text>
                            </View>
                        )}
                    </View>
                </View>

                <TouchableOpacity onPress={() => setShowTagModal(true)} style={styles.menuBtn}>
                    <Ionicons name="ellipsis-vertical" size={20} color="#6B7280" />
                </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={[styles.searchRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF' }]}>
                <View style={[styles.searchBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F3F4F6' }]}>
                    <Ionicons name="search" size={18} color="#9CA3AF" />
                    <TextInput
                        style={[styles.searchInput, { color: isDark ? '#F3F4F6' : '#111827' }]}
                        placeholder="Search notes..."
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Tabs */}
            <View style={[styles.tabsRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF' }]}>
                <TouchableOpacity
                    style={[styles.tab, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6' }, activeTab === 'all' && styles.tabActive]}
                    onPress={() => setActiveTab('all')}
                >
                    <Text style={[styles.tabText, { color: isDark ? '#9CA3AF' : '#6B7280' }, activeTab === 'all' && styles.tabTextActive]}>
                        All Notes
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6' }, activeTab === 'pinned' && styles.tabActive]}
                    onPress={() => setActiveTab('pinned')}
                >
                    <Text style={[styles.tabText, { color: isDark ? '#9CA3AF' : '#6B7280' }, activeTab === 'pinned' && styles.tabTextActive]}>
                        Pinned
                    </Text>
                    {pinnedCount > 0 && (
                        <View style={styles.tabBadge}>
                            <Text style={styles.tabBadgeText}>{pinnedCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Tag Filters - Show user-created tags */}
            {tags.length > 0 && (
                <View style={[styles.tagFilterSection, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF' }]}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.tagFilterScroll}
                    >
                        {/* All button */}
                        <TouchableOpacity
                            style={[
                                styles.tagFilterPill,
                                selectedTagIds.length === 0 && styles.tagFilterPillActive,
                            ]}
                            onPress={() => setSelectedTagIds([])}
                        >
                            <Text style={[
                                styles.tagFilterText,
                                selectedTagIds.length === 0 && styles.tagFilterTextActive,
                            ]}>
                                All
                            </Text>
                        </TouchableOpacity>

                        {/* Custom tags first */}
                        {tags.filter(t => t.category === 'custom').map(tag => {
                            const isSelected = selectedTagIds.includes(tag.id);
                            return (
                                <TouchableOpacity
                                    key={tag.id}
                                    style={[
                                        styles.tagFilterPill,
                                        isSelected && { backgroundColor: tag.color, borderColor: tag.color },
                                    ]}
                                    onPress={() => {
                                        setSelectedTagIds(ids =>
                                            ids.includes(tag.id)
                                                ? ids.filter(id => id !== tag.id)
                                                : [...ids, tag.id]
                                        );
                                    }}
                                >
                                    <View style={[styles.tagFilterDot, { backgroundColor: isSelected ? '#fff' : tag.color }]} />
                                    <Text style={[styles.tagFilterText, isSelected && { color: '#fff' }]}>
                                        {tag.name}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}

                        {/* Separator if there are both custom and default tags */}
                        {tags.filter(t => t.category === 'custom').length > 0 &&
                            tags.filter(t => t.category !== 'custom').length > 0 && (
                                <View style={styles.tagFilterSeparator} />
                            )}

                        {/* Default/built-in tags */}
                        {tags.filter(t => t.category !== 'custom').slice(0, 5).map(tag => {
                            const isSelected = selectedTagIds.includes(tag.id);
                            return (
                                <TouchableOpacity
                                    key={tag.id}
                                    style={[
                                        styles.tagFilterPill,
                                        isSelected && { backgroundColor: tag.color, borderColor: tag.color },
                                    ]}
                                    onPress={() => {
                                        setSelectedTagIds(ids =>
                                            ids.includes(tag.id)
                                                ? ids.filter(id => id !== tag.id)
                                                : [...ids, tag.id]
                                        );
                                    }}
                                >
                                    <View style={[styles.tagFilterDot, { backgroundColor: isSelected ? '#fff' : tag.color }]} />
                                    <Text style={[styles.tagFilterText, isSelected && { color: '#fff' }]}>
                                        {tag.name}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Clear filters */}
                    {selectedTagIds.length > 0 && (
                        <TouchableOpacity
                            style={styles.clearFiltersBtn}
                            onPress={() => setSelectedTagIds([])}
                        >
                            <Ionicons name="close-circle" size={16} color="#2A7DEB" />
                            <Text style={styles.clearFiltersText}>Clear</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Notes */}
            {loading ? (
                <View style={styles.loadingState}>
                    <Ionicons name="hourglass-outline" size={40} color="#9CA3AF" />
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            ) : displayNotes.length === 0 ? (
                <View style={styles.emptyState}>
                    <View style={styles.emptyIllustration}>
                        <View style={styles.emptyCircle1}>
                            <View style={styles.emptyCircle2}>
                                <Ionicons name="document-outline" size={36} color="#2A7DEB" />
                            </View>
                        </View>
                    </View>
                    <Text style={[styles.emptyTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>
                        {activeTab === 'pinned' ? 'No pinned notes' :
                            searchQuery ? 'No results' : 'No notes yet'}
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                        {activeTab === 'pinned' ? 'Pin important notes to find them quickly' :
                            searchQuery ? 'Try different keywords' : 'Create your first note to get started'}
                    </Text>
                    {!searchQuery && activeTab === 'all' && (
                        <TouchableOpacity style={styles.createBtn} onPress={handleCreateNote}>
                            <Ionicons name="add" size={20} color="#fff" />
                            <Text style={styles.createBtnText}>New Note</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <Animated.ScrollView
                    style={[styles.scrollView, { opacity: fadeAnim }]}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.notesGrid}>
                        {displayNotes.map((note, i) => renderNoteCard(note, i))}
                    </View>
                </Animated.ScrollView>
            )}

            {/* FAB */}
            <TouchableOpacity style={styles.fab} onPress={handleCreateNote} activeOpacity={0.9}>
                <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>

            {/* Tag Modal */}
            <Modal
                visible={showTagModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowTagModal(false)}
            >
                <SafeAreaView style={[styles.modalSafe, { backgroundColor: isDark ? '#07091A' : '#FAFAFA' }]}>
                    <View style={[styles.modalHeader, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#fff' }]}>
                        <Text style={[styles.modalTitle, { color: isDark ? '#F9FAFB' : '#111827' }]}>Manage Tags</Text>
                        <TouchableOpacity onPress={() => setShowTagModal(false)}>
                            <Ionicons name="close" size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.addTagRow}
                        onPress={() => setShowCreateTagModal(true)}
                    >
                        <View style={styles.addTagIcon}>
                            <Ionicons name="add" size={18} color="#2A7DEB" />
                        </View>
                        <Text style={styles.addTagText}>Create new tag</Text>
                    </TouchableOpacity>

                    <ScrollView style={styles.tagList}>
                        {tags.map(tag => (
                            <View key={tag.id} style={styles.tagItem}>
                                <View style={styles.tagItemLeft}>
                                    <View style={[styles.tagDot, { backgroundColor: tag.color }]} />
                                    <Text style={styles.tagItemName}>{tag.name}</Text>
                                </View>
                                <View style={styles.tagItemRight}>
                                    <Text style={styles.tagItemCount}>{tag.usageCount}</Text>
                                    {tag.category === 'custom' && (
                                        <TouchableOpacity onPress={() => handleDeleteTag(tag.id)}>
                                            <Ionicons name="trash-outline" size={16} color="#EF4444" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            {/* Create Tag Modal */}
            <Modal
                visible={showCreateTagModal}
                animationType="fade"
                transparent
                onRequestClose={() => setShowCreateTagModal(false)}
            >
                <View style={styles.createOverlay}>
                    <View style={styles.createModal}>
                        <Text style={styles.createTitle}>New Tag</Text>

                        <TextInput
                            style={styles.createInput}
                            placeholder="Tag name"
                            placeholderTextColor="#9CA3AF"
                            value={newTagName}
                            onChangeText={setNewTagName}
                            autoFocus
                        />

                        <View style={styles.colorGrid}>
                            {TAG_COLORS.map(color => (
                                <TouchableOpacity
                                    key={color}
                                    style={[
                                        styles.colorCircle,
                                        { backgroundColor: color },
                                        newTagColor === color && styles.colorSelected,
                                    ]}
                                    onPress={() => setNewTagColor(color)}
                                >
                                    {newTagColor === color && (
                                        <Ionicons name="checkmark" size={14} color="#fff" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.createActions}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => setShowCreateTagModal(false)}
                            >
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.saveBtn, !newTagName.trim() && styles.saveBtnDisabled]}
                                onPress={handleCreateTag}
                                disabled={!newTagName.trim()}
                            >
                                <Text style={styles.saveText}>Create</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* AI Insight Support Modal */}
            <InsightSupportModal
                visible={showInsightSupport}
                onClose={() => setShowInsightSupport(false)}
            />

            {/* Floating AI Support Button */}
            <TouchableOpacity
                style={[styles.floatingAiButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => setShowInsightSupport(true)}
            >
                <LinearGradient
                    colors={[theme.colors.primary, theme.colors.primary + 'CC']}
                    style={styles.floatingAiGradient}
                >
                    <Ionicons name="sparkles" size={24} color="#FFF" />
                    {aiInsightStatus === 'updates' && <View style={styles.aiBadge} />}
                </LinearGradient>
            </TouchableOpacity>
        </SafeAreaView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#fff',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flex: 1,
        marginLeft: 16,
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#111827',
    },
    noteCount: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },
    menuBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchRow: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#111827',
        ...(Platform.OS === 'web' && { outlineStyle: 'none' as any }),
    },
    tabsRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        gap: 8,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        gap: 6,
    },
    tabActive: {
        backgroundColor: '#2A7DEB',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    tabTextActive: {
        color: '#fff',
    },
    tabBadge: {
        backgroundColor: '#2A7DEB',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    tabBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#fff',
    },
    tagFilterSection: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
    },
    tagFilterScroll: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 60,
        gap: 8,
    },
    tagFilterPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        borderWidth: 0,
        borderColor: '#E5E7EB',
        gap: 6,
    },
    tagFilterPillActive: {
        backgroundColor: '#111827',
        borderColor: '#111827',
    },
    tagFilterDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    tagFilterText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
    },
    tagFilterTextActive: {
        color: '#fff',
    },
    tagFilterSeparator: {
        width: 1,
        height: 20,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 4,
    },
    clearFiltersBtn: {
        position: 'absolute',
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0EAE0',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 14,
        gap: 4,
    },
    clearFiltersText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#2A7DEB',
    },
    loadingState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    loadingText: {
        fontSize: 15,
        color: '#6B7280',
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 48,
    },
    emptyIllustration: {
        marginBottom: 28,
    },
    emptyCircle1: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F0EAE0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyCircle2: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#C7D2FE',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    createBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2A7DEB',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 14,
        gap: 8,
    },
    createBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
    },
    notesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -6,
    },
    noteCard: {
        width: isWeb ? '31%' : '48%',
        margin: 6,
        borderRadius: 20,
        padding: 18,
        paddingLeft: 22,
        minHeight: 180,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 20,
        elevation: 4,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.04)',
    },
    noteAccentBar: {
        position: 'absolute',
        left: 0,
        top: 14,
        bottom: 14,
        width: 3,
        borderRadius: 1.5,
    },
    cardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    noteIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pinBtn: {
        padding: 4,
    },
    updateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F97316',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 10,
        gap: 3,
    },
    updateBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#FFF',
        letterSpacing: 0.2,
    },
    noteTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 8,
        lineHeight: 22,
    },
    notePreview: {
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 19,
        flex: 1,
    },
    cardBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
    },
    noteDate: {
        fontSize: 12,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    tagCount: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    tagCountText: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
    },
    fab: {
        position: 'absolute',
        bottom: 28,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 22,
        backgroundColor: '#2A7DEB',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#2A7DEB',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.20,
        shadowRadius: 16,
        elevation: 10,
    },
    modalSafe: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 18,
        backgroundColor: '#fff',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
    },
    addTagRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        margin: 16,
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 0,
        borderColor: '#E5E7EB',
    },
    addTagIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#F0EAE0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addTagText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#2A7DEB',
    },
    tagList: {
        flex: 1,
        paddingHorizontal: 16,
    },
    tagItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        borderRadius: 14,
        marginBottom: 8,
    },
    tagItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    tagDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
    },
    tagItemName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
    },
    tagItemRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    tagItemCount: {
        fontSize: 13,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    createOverlay: {
        flex: 1,
        backgroundColor: 'rgba(17, 24, 39, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    createModal: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 360,
    },
    createTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 20,
        textAlign: 'center',
    },
    createInput: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 14,
        paddingHorizontal: 18,
        paddingVertical: 14,
        fontSize: 16,
        color: '#111827',
        marginBottom: 20,
    },
    colorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'center',
        marginBottom: 24,
    },
    colorCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    colorSelected: {
        borderWidth: 2,
        borderColor: '#111827',
    },
    createActions: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
    },
    cancelText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6B7280',
    },
    saveBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#2A7DEB',
        alignItems: 'center',
    },
    saveBtnDisabled: {
        opacity: 0.5,
    },
    saveText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },
    floatingAiButton: {
        position: 'absolute',
        bottom: 100, // Above the regular FAB
        right: 20,
        width: 50,
        height: 50,
        borderRadius: 25,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 14,
    },
    floatingAiGradient: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    aiBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FF3B30',
        borderWidth: 1.5,
        borderColor: '#FFF',
    },
});

export default NoteListScreen;
