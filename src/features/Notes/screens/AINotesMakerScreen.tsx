import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Modal,
    Platform,
    ActivityIndicator,
    Alert,
    Share,
    Dimensions,
    KeyboardAvoidingView,
    Animated,
    Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../features/Reference/theme/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { File as ExpoFile, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
    getAllTags,
    getAllNotes,
    createNote,
    createTag,
    updateNote,
    deleteNote,
    LocalTag,
    LocalNote,
} from '../services/localNotesStorage';
import {
    generateAISummary,
    getAllSummaries,
    deleteSummary,
    exportSummaryAsText,
    getTagBasedAlerts,
    createNotebook,
    getAllNotebooks,
    deleteNotebook,
    AISummary,
    AINotebook,
} from '../services/aiNotesService';
import { fetchCurrentAffairs, Article } from '../services/currentAffairsService';
import { summarizeNoteContent } from '../services/aiSummarizer';
import { smartScrape, isValidUrl, extractDomain } from '../services/webScraper';
import { useAuth } from '../../../context/AuthContext';
import { syncNoteToFirebase, deleteNoteFromFirebase } from '../../../services/firebaseNotesSync';
import { OPENROUTER_API_KEY } from '../../../utils/secureKey';
import { ACTIVE_MODELS, OPENROUTER_BASE_URL, SITE_CONFIG } from '../../../config/aiModels';
import { checkNewsMatches, MatchedArticle, getMatchesByNoteId, checkPDFCrossReferences, PDFCrossRef } from '../../../services/NewsMatchService';
import { FlatList, RefreshControl } from 'react-native';
import InsightSupportModal from '../../../components/InsightSupportModal';
import { InsightAgent } from '../../../services/InsightAgent';
import useCredits from '../../../hooks/useCredits'; // Corrected path
import PayWallPopup from '../../../components/PayWallPopup';
import { LowCreditBanner } from '../../../hooks/useAIFeature';
// AI disclaimer now rendered inline as compact one-liner

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const TOUR_SEEN_KEY = '@upsc_ai_notes_tour_seen';

// Source type configuration
const SOURCE_TYPES = {
    manual: { label: 'My Notes', color: '#3B82F6', icon: 'create-outline', description: 'Your personal study notes' },
    institute: { label: 'Institute Notes', color: '#2A7DEB', icon: 'school-outline', description: 'Vision IAS, IASBaba, etc.' },
    current_affairs: { label: 'Current Affairs', color: '#10B981', icon: 'newspaper-outline', description: 'Daily/Monthly CA' },
};

type SourceType = keyof typeof SOURCE_TYPES;

// Multi-source support
interface NoteSource {
    id: string;
    type: 'text' | 'pdf' | 'camera' | 'link';
    label: string;
    content: string;
    fileName?: string;
    fileUri?: string;
    noteId?: number;
    url?: string;
}

const SOURCE_ADD_OPTIONS = [
    { key: 'text', label: 'Type / Paste Text', icon: 'create-outline', color: '#3B82F6' },
    { key: 'pdf', label: 'Upload PDF', icon: 'document-text-outline', color: '#EF4444' },
    { key: 'camera', label: 'Snap Notes', icon: 'camera-outline', color: '#F97316' },
    { key: 'link', label: 'Web Extraction', icon: 'link-outline', color: '#10B981' },
];

export const AINotesMakerScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { theme, isDark } = useTheme();
    const { user } = useAuth();
    const { credits, isFreePlan, useCredits: deductCredits, loading: parsingCredits } = useCredits();
    const [showPaywall, setShowPaywall] = useState(false);

    const FREE_NOTE_LIMIT = 3;

    // ========== ONBOARDING STATE ==========
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [onboardingStep, setOnboardingStep] = useState(0);
    const onboardingFade = useState(new Animated.Value(0))[0];
    const onboardingTranslate = useState(new Animated.Value(20))[0];

    const onboardingSteps = [
        {
            title: "Welcome Aspirant! 👋",
            text: "Let me show you how to build your UPSC Knowledge Graph in 3 simple steps.",
            tab: "topics" as const,
            buttonText: "Let's Start"
        },
        {
            title: "Step 1: Create Tags 🏷️",
            text: "First, create hashtags for different UPSC subjects like #Polity or #IR to organize your learning.",
            tab: "topics" as const,
            buttonText: "Got it, Next"
        },
        {
            title: "Step 2: Add Your Notes 📝",
            text: "Now, enter or paste your notes here. Tag them with the hashtags you created for easy retrieval.",
            tab: "notes" as const,
            buttonText: "I'll add notes"
        },
        {
            title: "Step 3: AI Summarize ⚡",
            text: "Finally, hit the AI Summarize button to combine all notes for a tag into a professional UPSC brief!",
            tab: "summaries" as const,
            buttonText: "Complete Tour"
        }
    ];

    useEffect(() => {
        // Show onboarding only on first visit
        const checkTourSeen = async () => {
            try {
                const seen = await AsyncStorage.getItem(TOUR_SEEN_KEY);
                if (!seen) {
                    setTimeout(() => {
                        setShowOnboarding(true);
                        setOnboardingStep(0);
                        setActiveTab(onboardingSteps[0].tab);
                        startOnboardingAnimation();
                    }, 800);
                }
            } catch (e) {
                // If AsyncStorage fails, show tour anyway
                setTimeout(() => {
                    setShowOnboarding(true);
                    setOnboardingStep(0);
                    setActiveTab(onboardingSteps[0].tab);
                    startOnboardingAnimation();
                }, 800);
            }
        };
        checkTourSeen();
    }, []);

    const skipOnboarding = () => {
        AsyncStorage.setItem(TOUR_SEEN_KEY, 'true').catch(() => {});
        Animated.timing(onboardingFade, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setShowOnboarding(false);
        });
    };

    const startOnboardingAnimation = () => {
        onboardingFade.setValue(0);
        onboardingTranslate.setValue(10);
        Animated.parallel([
            Animated.timing(onboardingFade, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.timing(onboardingTranslate, {
                toValue: 0,
                duration: 500,
                easing: Easing.out(Easing.back(1)),
                useNativeDriver: true,
            })
        ]).start();
    };

    const nextOnboardingStep = async () => {
        if (onboardingStep < onboardingSteps.length - 1) {
            const nextStep = onboardingStep + 1;
            setOnboardingStep(nextStep);
            setActiveTab(onboardingSteps[nextStep].tab);
            startOnboardingAnimation();
        } else {
            // End onboarding — mark as seen
            AsyncStorage.setItem(TOUR_SEEN_KEY, 'true').catch(() => {});
            Animated.timing(onboardingFade, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(() => {
                setShowOnboarding(false);
            });
        }
    };

    // Credit Check Helper
    const checkCreditBalance = (feature: 'summary' | 'mind_map' = 'summary') => {
        const cost = feature === 'mind_map' ? 2 : 1;
        if (credits < cost) {
            setShowPaywall(true);
            return false;
        }
        return true;
    };

    // ========== STATE ==========
    // View State
    const [activeTab, setActiveTab] = useState<'notes' | 'topics' | 'summaries'>('topics');

    // Tags/Topics State
    const [tags, setTags] = useState<LocalTag[]>([]);
    const [notes, setNotes] = useState<LocalNote[]>([]);
    const [summaries, setSummaries] = useState<AISummary[]>([]);
    const [alerts, setAlerts] = useState<{ tag: LocalTag; count: number }[]>([]);

    // Tag Management
    const [showCreateTag, setShowCreateTag] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState('#3B82F6');

    // Note Creation/Edit
    const [showNoteEditor, setShowNoteEditor] = useState(false);
    const [editingNote, setEditingNote] = useState<LocalNote | null>(null);
    const [noteTitle, setNoteTitle] = useState('');
    const [noteContent, setNoteContent] = useState('');
    const [noteSourceType, setNoteSourceType] = useState<SourceType>('manual');
    const [noteSourceUrl, setNoteSourceUrl] = useState('');
    const [noteSummary, setNoteSummary] = useState('');
    const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
    const [isScraping, setIsScraping] = useState(false);

    // Multi-source state
    const [noteSources, setNoteSources] = useState<NoteSource[]>([]);
    const [showAddSourceMenu, setShowAddSourceMenu] = useState(false);
    const [showNotePickerForSource, setShowNotePickerForSource] = useState(false);
    const [sourceLinkUrl, setSourceLinkUrl] = useState('');
    const [showSourceLinkInput, setShowSourceLinkInput] = useState(false);
    const [scrapingSourceId, setScrapingSourceId] = useState<string | null>(null);
    const [processingPdfIds, setProcessingPdfIds] = useState<Set<string>>(new Set());

    // Summary Generation
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [summaryStep, setSummaryStep] = useState<'select-notes' | 'configure'>('select-notes');
    const [summaryTagIds, setSummaryTagIds] = useState<number[]>([]);
    const [summarySourceTypes, setSummarySourceTypes] = useState<SourceType[]>(['manual', 'institute', 'current_affairs']);
    const [selectedNoteIds, setSelectedNoteIds] = useState<number[]>([]);
    const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>([]);
    const [currentAffairs, setCurrentAffairs] = useState<Article[]>([]);
    const [loadingArticles, setLoadingArticles] = useState(false);
    const [customPrompt, setCustomPrompt] = useState('');
    const [generating, setGenerating] = useState(false);
    const [generatingStatus, setGeneratingStatus] = useState('');

    // Summary Detail
    const [showSummaryDetail, setShowSummaryDetail] = useState<AISummary | null>(null);

    // Loading
    const [loading, setLoading] = useState(true);
    const [newsMatches, setNewsMatches] = useState<MatchedArticle[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notificationFilterTag, setNotificationFilterTag] = useState<string | null>(null);
    const [aiInsightStatus, setAiInsightStatus] = useState<'none' | 'updates'>('none');
    const [noteUpdatesMap, setNoteUpdatesMap] = useState<Record<number, number>>({});
    const [pdfCrossRefs, setPdfCrossRefs] = useState<PDFCrossRef[]>([]);

    // Filter states for summaries
    const [filterTagId, setFilterTagId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Group news matches by tag for per-tag alert cards
    const matchesByTag = useMemo(() => {
        const grouped: Record<string, MatchedArticle[]> = {};
        for (const m of newsMatches) {
            const key = m.matchedTag;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(m);
        }
        return grouped;
    }, [newsMatches]);

    // ========== DATA LOADING ==========
    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        setLoading(true);
        try {
            const [loadedTags, loadedNotes, loadedSummaries] = await Promise.all([
                getAllTags(),
                getAllNotes(),
                getAllSummaries(),
            ]);

            setTags(loadedTags);
            setNotes(loadedNotes);
            setSummaries(loadedSummaries);

            // Calculate alerts (tags with recent current affairs)
            const alertsData = await getTagBasedAlerts();
            setAlerts(alertsData.map(a => ({ tag: a.tag, count: a.newArticles.length })));

            // Check for news matches (NEW: Knowledge Radar)
            try {
                const matches = await checkNewsMatches();
                setNewsMatches(matches);
                const updatesMap = await getMatchesByNoteId();
                setNoteUpdatesMap(updatesMap);
                const crossRefs = await checkPDFCrossReferences();
                setPdfCrossRefs(crossRefs);
            } catch (err) {
                console.error("Failed to check news matches", err);
            }

            // AI Insight background check (Silent)
            InsightAgent.checkNoteStatus().then(res => {
                if (res.status === 'updates_available') {
                    setAiInsightStatus('updates');
                } else {
                    setAiInsightStatus('none');
                }
            }).catch(e => console.log('[AINotes] Background check failed', e));

        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Live Heartbeat: Auto-scan for news every 5 mins
    useEffect(() => {
        const interval = setInterval(() => {
            console.log('[AINotes-Heartbeat] Proactive scan cycle...');
            checkNewsMatches().then(matches => setNewsMatches(matches));
            InsightAgent.checkNoteStatus().then(res => {
                if (res.status === 'updates_available') setAiInsightStatus('updates');
            });
        }, 60 * 1000); // 60 SECONDS (1 Minute Cycle)
        return () => clearInterval(interval);
    }, []);

    const [showInsightSupport, setShowInsightSupport] = useState(false);

    // ========== TAG MANAGEMENT ==========
    const handleCreateTag = async () => {
        if (!newTagName.trim()) {
            Alert.alert('Error', 'Please enter a tag name');
            return;
        }

        const tagName = newTagName.trim();

        try {
            await createTag(
                tagName.toLowerCase().replace(/\s+/g, '').replace(/^#+/, ''),
                newTagColor
            );
            setNewTagName('');
            setShowCreateTag(false);
            await loadData();
            Alert.alert('Success', `Tag "${tagName}" created!`);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to create tag');
        }
    };

    const toggleTagSelection = (tagId: number) => {
        setSelectedTagIds(prev =>
            prev.includes(tagId)
                ? prev.filter(id => id !== tagId)
                : [...prev, tagId]
        );
    };

    // ========== NOTE MANAGEMENT ==========
    const openNoteEditor = async (note?: LocalNote) => {
        if (note) {
            // Editing existing note - always allowed
            setEditingNote(note);
            setNoteTitle(note.title);
            setNoteContent(note.content);
            setNoteSourceType((note.sourceType as SourceType) || 'manual');
            setNoteSourceUrl(note.sourceUrl || '');
            setNoteSummary(note.summary || '');
            setSelectedTagIds(note.tags.map(t => t.id));
        } else {
            // Creating new note - check limit for free users
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
            setEditingNote(null);
            setNoteTitle('');
            setNoteContent('');
            setNoteSourceType('manual');
            setNoteSourceUrl('');
            setNoteSummary('');
            setSelectedTagIds([]);
        }
        setShowNoteEditor(true);
    };

    const handleSaveNote = async () => {
        console.log('[AINotes] handleSaveNote called');
        console.log('[AINotes] noteTitle:', noteTitle);
        console.log('[AINotes] noteContent length:', noteContent.length);
        console.log('[AINotes] selectedTagIds:', selectedTagIds);

        if (!noteTitle.trim()) {
            Alert.alert('Missing Title', 'Please enter a title for your note');
            return;
        }

        const hasSources = noteSources.some(s => s.content.trim().length > 0);
        const hasContent = noteContent.trim().length > 0;
        if (!hasContent && !hasSources) {
            Alert.alert('Missing Content', 'Please add at least one source with content');
            return;
        }

        if (selectedTagIds.length === 0) {
            Alert.alert('No Tags Selected', 'Please select at least one hashtag to organize your note');
            return;
        }

        try {
            const noteTags = tags.filter(t => selectedTagIds.includes(t.id));
            console.log('[AINotes] noteTags:', noteTags.map(t => t.name));

            // Build blocks from main content + sources
            const blocks: any[] = [];
            let blockId = 1;
            if (noteContent.trim()) {
                blocks.push({ id: String(blockId++), type: 'paragraph' as const, content: noteContent.trim() });
            }
            for (const source of noteSources) {
                if (source.type === 'pdf' && source.fileUri) {
                    blocks.push({
                        id: String(blockId++),
                        type: 'pdf' as const,
                        content: '',
                        metadata: { fileName: source.fileName, url: source.fileUri },
                    });
                }
                if (source.content.trim()) {
                    blocks.push({ id: String(blockId++), type: 'paragraph' as const, content: source.content.trim() });
                }
            }

            // Combine all content for the flat content field
            let fullContent = noteContent.trim();
            for (const source of noteSources) {
                if (source.content.trim()) {
                    fullContent += `\n\n--- ${source.label} ---\n${source.content.trim()}`;
                }
            }

            const notePayload = {
                title: noteTitle.trim(),
                content: fullContent,
                sourceType: noteSourceType,
                sourceUrl: noteSourceUrl?.trim() || undefined,
                summary: noteSummary?.trim() || undefined,
                tags: noteTags,
                blocks: blocks.length > 0 ? blocks : [{ id: '1', type: 'paragraph' as const, content: '' }],
            };

            console.log('[AINotes] Saving note with payload:', JSON.stringify(notePayload, null, 2));

            if (editingNote) {
                const result = await updateNote(editingNote.id, notePayload);
                if (result && user?.id) syncNoteToFirebase(user.id, result);
                console.log('[AINotes] Note updated:', result);
                Alert.alert('Success', 'Note updated successfully!');
            } else {
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

                const result = await createNote(notePayload);
                if (result && user?.id) syncNoteToFirebase(user.id, result);
                console.log('[AINotes] Note created:', result);
                if (Platform.OS === 'web') {
                    window.alert('Note saved successfully!');
                } else {
                    Alert.alert('Success', 'Note saved successfully!');
                }
            }

            setShowNoteEditor(false);
            setNoteTitle('');
            setNoteContent('');
            setNoteSourceUrl('');
            setNoteSummary('');
            setSelectedTagIds([]);
            setEditingNote(null);
            setNoteSources([]);

            await loadData();
            console.log('[AINotes] Data reloaded after save');
        } catch (error: any) {
            console.error('[AINotes] Error saving note:', error);
            Alert.alert('Save Error', error.message || 'Failed to save note. Please try again.');
        }
    };

    const handleGenerateNoteSummary = async () => {
        // Check if any PDFs are still being processed
        if (processingPdfIds.size > 0) {
            Alert.alert('PDF Processing', 'Please wait for PDF extraction to finish before generating a summary.');
            return;
        }

        // Filter out failed PDF/OCR sources that have no real content
        const isFailedSource = (c: string) => /^\[.*(?:failed|could not).*\]$/i.test(c.trim());
        const hasContent = noteContent.trim().length > 0;
        const hasSources = noteSources.some(s => s.content.trim().length > 0 && !isFailedSource(s.content));

        if (!hasContent && !hasSources) {
            Alert.alert('No Content', 'Please add some content or sources to summarize. PDF text extraction may have failed — try pasting text manually.');
            return;
        }

        // Feature Gate: Credits
        if (!checkCreditBalance()) return;

        setGenerating(true);
        setGeneratingStatus('Summarizing...');

        try {
            // Combine main note content with all sources
            let fullContent = noteContent.trim();

            if (noteSources.length > 0) {
                for (const source of noteSources) {
                    if (source.content.trim() && !isFailedSource(source.content)) {
                        const sourceLabel = source.type === 'pdf' ? `PDF: ${source.label}` :
                            source.type === 'camera' ? `Camera: ${source.label}` :
                            source.type === 'link' ? `Link: ${source.label}` :
                            `Text: ${source.label}`;
                        fullContent += `\n\n--- Source: ${sourceLabel} ---\n${source.content}`;
                    }
                }
            }

            const response = await summarizeNoteContent(fullContent);
            if (response.error) {
                throw new Error(response.error);
            }

            // Deduct credits only after successful generation
            await deductCredits('summary');

            setNoteSummary(response.summary);
            Alert.alert('Success', 'Summary generated from all sources!');
        } catch (error: any) {
            console.error('[AINotes] Error generating individual summary:', error);
            Alert.alert('Error', error.message || 'Failed to generate summary');
        } finally {
            setGenerating(false);
            setGeneratingStatus('');
        }
    };

    // ── Multi-Source Handlers ──────────────────────────────────────────
    const OCR_API_KEY = process.env.EXPO_PUBLIC_OCR_API_KEY || '';
    const OCR_API_URL = 'https://api.ocr.space/parse/image';

    const handleAddPdfSource = async () => {
        try {
            setShowAddSourceMenu(false);
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });
            if (result.canceled || !result.assets?.[0]) return;

            const asset = result.assets[0];
            const sourceId = String(Date.now());

            // Add source immediately with loading label
            const newSource: NoteSource = {
                id: sourceId,
                type: 'pdf',
                label: asset.name || 'PDF Document',
                content: '',
                fileName: asset.name,
                fileUri: asset.uri,
            };
            setNoteSources(prev => [...prev, newSource]);

            // Mark this PDF as processing
            setProcessingPdfIds(prev => new Set(prev).add(sourceId));

            // Run OCR
            try {
                const base64Data = await FileSystem.readAsStringAsync(asset.uri, {
                    encoding: FileSystem.EncodingType.Base64,
                });

                if (!base64Data) {
                    throw new Error('Could not read PDF file.');
                }

                // Check file size (~1MB limit for OCR.space free tier)
                const fileSizeKB = (base64Data.length * 3) / 4 / 1024;
                if (fileSizeKB > 1024) {
                    Alert.alert('Large PDF', 'This PDF is large and may take longer to process. For best results, use PDFs under 1 MB.');
                }

                const formData = new FormData();
                formData.append('base64Image', 'data:application/pdf;base64,' + base64Data);
                formData.append('apikey', OCR_API_KEY);
                formData.append('language', 'eng');
                formData.append('isOverlayRequired', 'false');
                formData.append('filetype', 'PDF');
                formData.append('detectOrientation', 'true');
                formData.append('scale', 'true');
                formData.append('OCREngine', '2');
                formData.append('isTable', 'true');

                const response = await fetch(OCR_API_URL, {
                    method: 'POST',
                    body: formData,
                    headers: { 'Accept': 'application/json' },
                });

                if (!response.ok) {
                    throw new Error(`OCR service returned ${response.status}`);
                }

                const ocrResult = await response.json();

                if (ocrResult.OCRExitCode === 1 && ocrResult.ParsedResults?.length > 0) {
                    const extractedText = ocrResult.ParsedResults
                        .map((page: any) => page.ParsedText || '')
                        .join('\n\n')
                        .trim();

                    if (extractedText.length > 0) {
                        setNoteSources(prev => prev.map(s =>
                            s.id === sourceId ? { ...s, content: extractedText } : s
                        ));
                    } else {
                        // OCR returned empty text - possibly a scanned image PDF
                        setNoteSources(prev => prev.map(s =>
                            s.id === sourceId ? { ...s, content: '[PDF text could not be extracted. The PDF may contain only images.]' } : s
                        ));
                        Alert.alert('PDF Notice', 'Could not extract text from this PDF. It may contain only images or scanned content that is not readable.');
                    }
                } else {
                    const errorMsg = ocrResult.ErrorMessage?.[0] || ocrResult.ParsedResults?.[0]?.ErrorMessage || 'Unknown OCR error';
                    console.error('[AINotes] OCR error:', errorMsg);
                    setNoteSources(prev => prev.map(s =>
                        s.id === sourceId ? { ...s, content: `[PDF extraction failed: ${errorMsg}]` } : s
                    ));
                    Alert.alert('PDF Error', `Could not extract text: ${errorMsg}`);
                }
            } catch (ocrError: any) {
                console.error('[AINotes] PDF OCR error:', ocrError);
                setNoteSources(prev => prev.map(s =>
                    s.id === sourceId ? { ...s, content: '[PDF extraction failed]' } : s
                ));
                Alert.alert('PDF Error', ocrError.message || 'Failed to extract text from PDF. Please try a smaller file.');
            } finally {
                // Remove from processing set
                setProcessingPdfIds(prev => {
                    const next = new Set(prev);
                    next.delete(sourceId);
                    return next;
                });
            }
        } catch (error) {
            console.error('[AINotes] PDF pick error:', error);
            Alert.alert('Error', 'Failed to pick PDF document.');
        }
    };

    const handleAddTextSource = () => {
        setShowAddSourceMenu(false);
        const newSource: NoteSource = {
            id: String(Date.now()),
            type: 'text',
            label: `Text Source ${noteSources.filter(s => s.type === 'text').length + 1}`,
            content: '',
        };
        setNoteSources(prev => [...prev, newSource]);
    };

    const handleAddCameraSource = () => {
        setShowAddSourceMenu(false);
        navigation.navigate('CreateNoteScreen', { autoOpenCamera: true });
    };

    const handleAddLinkSource = async () => {
        if (!sourceLinkUrl.trim() || !isValidUrl(sourceLinkUrl)) {
            Alert.alert('Invalid URL', 'Please enter a valid URL starting with http:// or https://');
            return;
        }

        setShowSourceLinkInput(false);
        const sourceId = String(Date.now());
        const domain = extractDomain(sourceLinkUrl);

        const newSource: NoteSource = {
            id: sourceId,
            type: 'link',
            label: domain || 'Web Link',
            content: '',
            url: sourceLinkUrl.trim(),
        };
        setNoteSources(prev => [...prev, newSource]);
        setScrapingSourceId(sourceId);

        try {
            const result = await smartScrape(sourceLinkUrl.trim());
            if (!result.error && (result.contentBlocks.length > 0 || result.content)) {
                const text = result.content || result.contentBlocks.map((b: any) => b.content).join('\n\n');
                setNoteSources(prev => prev.map(s =>
                    s.id === sourceId ? { ...s, content: text, label: result.title || domain || 'Web Link' } : s
                ));
            }
        } catch (error) {
            console.error('[AINotes] Link scrape error:', error);
        } finally {
            setScrapingSourceId(null);
            setSourceLinkUrl('');
        }
    };

    const handleRemoveSource = (sourceId: string) => {
        setNoteSources(prev => prev.filter(s => s.id !== sourceId));
    };

    const handleScrapeUrl = async () => {
        if (!noteSourceUrl.trim()) {
            Alert.alert('Missing URL', 'Please enter a URL to scrape content from');
            return;
        }

        if (!isValidUrl(noteSourceUrl)) {
            Alert.alert('Invalid URL', 'Please enter a valid URL starting with http:// or https://');
            return;
        }

        setIsScraping(true);
        try {
            const result = await smartScrape(noteSourceUrl.trim());

            if (result.error || (result.contentBlocks.length === 0 && !result.content)) {
                throw new Error(result.error || 'Could not extract content from this URL.');
            }

            // Set title if empty
            if (!noteTitle.trim() && result.title) {
                setNoteTitle(result.title);
            }

            // Format scraped content
            let extractedText = '';

            if (result.contentBlocks && result.contentBlocks.length > 0) {
                extractedText = result.contentBlocks.map(block => {
                    if (block.type === 'heading') return `\n${'#'.repeat(block.level || 2)} ${block.content}\n`;
                    if (block.type === 'bullet') return block.items?.map(item => `• ${item}`).join('\n') || '';
                    if (block.type === 'numbered') return block.items?.map((item, idx) => `${idx + 1}. ${item}`).join('\n') || '';
                    if (block.type === 'quote') return `> ${block.content}`;
                    return block.content;
                }).join('\n\n');
            } else {
                extractedText = result.content || '';
            }

            // Append or replace? Let's prepend with a header
            const domain = extractDomain(noteSourceUrl);
            const header = `\n--- SOURCE: ${domain} ---\n\n`;
            setNoteContent(prev => prev ? `${prev}\n\n${header}${extractedText}` : `${extractedText}`);

            Alert.alert('Success', `Content extracted from ${domain}`);
        } catch (error: any) {
            console.error('[AINotes] Scrape error:', error);
            Alert.alert('Scraping Failed', error.message || 'Failed to extract content. This may be due to CORS restrictions on web.');
        } finally {
            setIsScraping(false);
        }
    };

    const handleDeleteNote = async (noteId: number) => {
        Alert.alert(
            'Delete Note',
            'Are you sure you want to delete this note?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteNote(noteId);
                            if (user?.id) deleteNoteFromFirebase(user.id, noteId);
                            await loadData();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete note');
                        }
                    },
                },
            ]
        );
    };

    // ========== SUMMARY GENERATION ==========
    const openSummaryGenerator = async () => {
        console.log('[AINotes] Opening summary generator...');
        setSummaryStep('select-notes');
        setSummaryTagIds([]);
        setSummarySourceTypes(['manual', 'institute', 'current_affairs']);
        setCustomPrompt('');
        setShowSummaryModal(true);

        // Auto-select all notes by default
        const allNoteIds = notes.map(n => n.id);
        setSelectedNoteIds(allNoteIds);
        console.log('[AINotes] Auto-selected', allNoteIds.length, 'notes');

        // Reset article selection
        setSelectedArticleIds([]);

        // Fetch Current Affairs
        setLoadingArticles(true);
        try {
            const articles = await fetchCurrentAffairs(30);
            setCurrentAffairs(articles);
            console.log('[AINotes] Loaded', articles.length, 'current affairs articles');
        } catch (error) {
            console.error('[AINotes] Error loading articles:', error);
            setCurrentAffairs([]);
        } finally {
            setLoadingArticles(false);
        }
    };

    const toggleSummaryTag = (tagId: number) => {
        setSummaryTagIds(prev =>
            prev.includes(tagId)
                ? prev.filter(id => id !== tagId)
                : [...prev, tagId]
        );
    };

    const toggleSummarySource = (source: SourceType) => {
        setSummarySourceTypes(prev =>
            prev.includes(source)
                ? prev.filter(s => s !== source)
                : [...prev, source]
        );
    };

    const toggleNoteSelection = (noteId: number) => {
        setSelectedNoteIds(prev =>
            prev.includes(noteId)
                ? prev.filter(id => id !== noteId)
                : [...prev, noteId]
        );
    };

    const toggleArticleSelection = (articleId: string) => {
        setSelectedArticleIds(prev =>
            prev.includes(articleId)
                ? prev.filter(id => id !== articleId)
                : [...prev, articleId]
        );
    };

    const selectAllNotes = () => {
        const allIds = notes.map(n => n.id);
        setSelectedNoteIds(allIds);
    };

    const selectAllArticles = () => {
        const allIds = currentAffairs.map(a => a.id);
        setSelectedArticleIds(allIds);
    };

    const handleGenerateSummary = async () => {
        console.log('[AINotes] Starting summary generation...');
        console.log('[AINotes] API Key present:', !!OPENROUTER_API_KEY);
        console.log('[AINotes] Selected note IDs:', selectedNoteIds);
        console.log('[AINotes] Selected article IDs:', selectedArticleIds);

        // Check API key first
        if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY.length < 10) {
            Alert.alert('Error', 'API key not configured. Please check setup.');
            return;
        }

        // Feature Gate: Credits
        if (!checkCreditBalance()) return;

        // Get notes to summarize
        let notesToSummarize = notes;
        if (selectedNoteIds.length > 0) {
            notesToSummarize = notes.filter(n => selectedNoteIds.includes(n.id));
        }

        // Get articles to summarize
        const articlesToSummarize = currentAffairs.filter(a => selectedArticleIds.includes(a.id));

        console.log('[AINotes] Notes to summarize:', notesToSummarize.length);
        console.log('[AINotes] Articles to summarize:', articlesToSummarize.length);

        if (notesToSummarize.length === 0 && articlesToSummarize.length === 0) {
            Alert.alert('No Content', 'Please select notes or current affairs articles to summarize.');
            return;
        }

        setGenerating(true);
        setGeneratingStatus('Preparing content...');

        try {
            // BUILD MERGED CONTENT FROM NOTES + ARTICLES
            let allContent = '';

            // Add notes content
            if (notesToSummarize.length > 0) {
                allContent += '\n=== YOUR NOTES ===\n';
                notesToSummarize.forEach((note, i) => {
                    allContent += `\n[Note ${i + 1}] ${note.title}\n${note.content}\n`;
                });
            }

            // Add current affairs articles content
            if (articlesToSummarize.length > 0) {
                allContent += '\n=== CURRENT AFFAIRS ARTICLES ===\n';
                articlesToSummarize.forEach((article, i) => {
                    allContent += `\n[Article ${i + 1}] ${article.title}\n${article.content}\n`;
                });
            }

            console.log('[AINotes] Total content length:', allContent.length);
            setGeneratingStatus('Calling AI...');

            // Build prompt - NO MARKDOWN, NO EMOJIS
            const prompt = `You are a UPSC exam expert. Create a comprehensive summary combining all the provided notes and current affairs articles.

STRICT RULES:
- DO NOT use any markdown (no #, ##, **, __, etc.)
- DO NOT use any emojis or special symbols
- Use simple bullet points with - or • 
- Use PLAIN TEXT ONLY
- Use clear section headers in UPPERCASE
- Combine information from all sources into one cohesive summary

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:

TOPIC OVERVIEW
- Brief introduction about the topic
- Context and background

KEY POINTS
- Important point 1
- Important point 2
- Important point 3
(continue as needed)

IMPORTANT FACTS AND FIGURES
- Key dates to remember
- Important numbers and statistics
- Names and places

EXAM RELEVANCE
- How this can be asked in Prelims
- Mains answer writing points
- Essay connection points

QUICK REVISION
- Main takeaway 1
- Main takeaway 2
- Main takeaway 3

CONTENT TO SUMMARIZE:
${allContent}

${customPrompt ? `ADDITIONAL INSTRUCTIONS: ${customPrompt}` : ''}

Generate a professional, exam-oriented summary. NO emojis, NO markdown.`;

            console.log('[AINotes] Sending request to OpenRouter...');

            const response = await fetch(OPENROUTER_BASE_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': SITE_CONFIG.url,
                    'X-Title': SITE_CONFIG.name,
                },
                body: JSON.stringify({
                    model: ACTIVE_MODELS.NOTES,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.7,
                    max_tokens: 4000,
                }),
            });

            console.log('[AINotes] Response status:', response.status);

            if (!response.ok) {
                const errText = await response.text();
                console.error('[AINotes] API Error:', errText);
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            console.log('[AINotes] Response received');

            const summaryText = data.choices?.[0]?.message?.content;
            if (!summaryText) {
                throw new Error('No content in response');
            }

            console.log('[AINotes] Summary length:', summaryText.length);
            setGeneratingStatus('Saving...');

            // Create title
            const summaryTitle = notesToSummarize.length > 0
                ? `${notesToSummarize[0].title} Summary`
                : 'Current Affairs Summary';

            // Save to localStorage
            const { getItem, setItem } = await import('../services/storage');

            const existingSummaries = JSON.parse(await getItem('@upsc_ai_summaries') || '[]');
            const counter = parseInt(await getItem('@upsc_summary_counter') || '0') + 1;
            await setItem('@upsc_summary_counter', String(counter));

            const newSummary: AISummary = {
                id: counter,
                title: summaryTitle,
                summary: summaryText,
                sources: [
                    ...notesToSummarize.map(n => ({ noteId: n.id, noteTitle: n.title, sourceType: n.sourceType || 'manual' })),
                    ...articlesToSummarize.map(a => ({ noteId: 0, noteTitle: a.title, sourceType: 'current_affairs' })),
                ],
                tags: notesToSummarize.flatMap(n => n.tags).filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i),
                tagIds: [...new Set(notesToSummarize.flatMap(n => n.tags.map(t => t.id)))],
                wordCount: summaryText.split(/\s+/).length,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            existingSummaries.unshift(newSummary);
            await setItem('@upsc_ai_summaries', JSON.stringify(existingSummaries));

            // ALSO save as a regular note so it's persistent and visible in UPSC Note Maker
            try {
                // Determine source type and tags
                const summaryTags = newSummary.tags && newSummary.tags.length > 0
                    ? newSummary.tags
                    : tags.filter(t => summaryTagIds.includes(t.id));

                const summaryAsNote = {
                    title: `[AI] ${summaryTitle}`,
                    content: summaryText,
                    sourceType: 'current_affairs' as const,
                    tags: summaryTags,
                    blocks: [{ id: `ai-sum-${Date.now()}`, type: 'paragraph' as const, content: summaryText }],
                    isPinned: true // Auto-pin AI summaries for visibility
                };

                const savedNote = await createNote(summaryAsNote);
                if (savedNote && user?.id) syncNoteToFirebase(user.id, savedNote);
                console.log('[AINotes] Also saved summary as a regular study note:', savedNote.id);
            } catch (noteErr) {
                console.error('[AINotes] Failed to save summary as regular note:', noteErr);
            }

            console.log('[AINotes] Summary saved!');

            // Deduct credits only after successful generation
            await deductCredits('summary');

            setShowSummaryModal(false);
            await loadData();

            Alert.alert(
                '✅ Summary Ready!',
                `Created from ${notesToSummarize.length} notes${articlesToSummarize.length > 0 ? ` and ${articlesToSummarize.length} articles` : ''}.`,
                [
                    { text: 'View Now', onPress: () => setShowSummaryDetail(newSummary) },
                    { text: 'OK' }
                ]
            );

        } catch (error: any) {
            console.error('[AINotes] Error:', error);
            Alert.alert('Generation Failed', error.message || 'Something went wrong. Try again.');
        } finally {
            setGenerating(false);
            setGeneratingStatus('');
        }
    };

    // ========== EXPORT - BULLETPROOF VERSION ==========

    /**
     * Force download a file in browser
     */
    const forceDownload = (filename: string, content: string, mimeType: string): boolean => {
        try {
            console.log('[Export] Starting download:', filename);

            // Create blob
            const blob = new Blob([content], { type: mimeType });

            // Create download URL
            const downloadUrl = URL.createObjectURL(blob);

            // Create hidden link
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            link.style.display = 'none';
            link.style.visibility = 'hidden';

            // Add to DOM
            document.body.appendChild(link);

            // Force click
            link.click();

            // Cleanup after short delay
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(downloadUrl);
                console.log('[Export] Download complete:', filename);
            }, 100);

            return true;
        } catch (error) {
            console.error('[Export] Download error:', error);
            return false;
        }
    };

    /**
     * Export summary in chosen format
     */
    const handleExportSummary = async (summary: AISummary, format: 'txt' | 'doc' | 'pdf') => {
        console.log('[Export] Starting export:', format);

        // Create safe filename
        const safeTitle = summary.title
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 40) || 'Summary';

        const dateStr = new Date(summary.createdAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });

        // Clean content - remove any emojis
        const cleanContent = summary.summary
            .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
            .trim();

        // ===== TEXT FORMAT =====
        if (format === 'txt') {
            const textContent = [
                summary.title.toUpperCase(),
                '='.repeat(50),
                '',
                `Generated: ${dateStr}`,
                '',
                '='.repeat(50),
                '',
                cleanContent,
                '',
                '='.repeat(50),
                'Generated by PrepAssist AI Notes Maker',
                'https://prepassist.in'
            ].join('\n');

            if (isWeb) {
                const success = forceDownload(`${safeTitle}.txt`, textContent, 'text/plain;charset=utf-8');
                if (success) {
                    Alert.alert('Success', 'Text file downloaded!');
                } else {
                    Alert.alert('Error', 'Download failed. Try again.');
                }
            } else {
                try {
                    const file = new ExpoFile(Paths.cache, `${safeTitle}.txt`);
                    file.write(textContent);
                    await Sharing.shareAsync(file.uri, { mimeType: 'text/plain', dialogTitle: 'Save Notes' });
                } catch (e) {
                    console.error('[Export] TXT error:', e);
                    Alert.alert('Error', 'Failed to export text file.');
                }
            }
        }

        // ===== WORD FORMAT =====
        else if (format === 'doc') {
            const wordHtml = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
<meta charset="utf-8">
<title>${summary.title}</title>
<style>
body { font-family: Calibri, Arial, sans-serif; font-size: 12pt; line-height: 1.6; margin: 40px; color: #333; }
h1 { font-size: 18pt; color: #1a365d; border-bottom: 2px solid #2563eb; padding-bottom: 8px; margin-bottom: 16px; }
.date { color: #666; font-size: 10pt; margin-bottom: 20px; }
.content { white-space: pre-wrap; }
.footer { margin-top: 40px; text-align: center; color: #999; font-size: 9pt; border-top: 1px solid #ccc; padding-top: 10px; }
</style>
</head>
<body>
<h1>${summary.title}</h1>
<p class="date">Generated: ${dateStr}</p>
<div class="content">${cleanContent.replace(/\n/g, '<br>')}</div>
<p class="footer">Generated by PrepAssist AI Notes Maker | prepassist.in</p>
</body>
</html>`;

            if (isWeb) {
                const success = forceDownload(`${safeTitle}.doc`, wordHtml, 'application/msword');
                if (success) {
                    Alert.alert('Success', 'Word document downloaded! Open with MS Word or Google Docs.');
                } else {
                    Alert.alert('Error', 'Download failed. Try again.');
                }
            } else {
                try {
                    const file = new ExpoFile(Paths.cache, `${safeTitle}.doc`);
                    file.write(wordHtml);
                    await Sharing.shareAsync(file.uri, { mimeType: 'application/msword', dialogTitle: 'Save as Word Document' });
                } catch (e) {
                    console.error('[Export] DOC error:', e);
                    Alert.alert('Error', 'Failed to export document.');
                }
            }
        }

        // ===== PDF FORMAT (via Print) =====
        else if (format === 'pdf') {
            const pdfHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${summary.title}</title>
<style>
@page { size: A4; margin: 20mm; }
@media print { 
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { 
    font-family: 'Segoe UI', Tahoma, Arial, sans-serif; 
    font-size: 11pt; 
    line-height: 1.7; 
    color: #222; 
    padding: 40px;
    max-width: 800px;
    margin: 0 auto;
}
h1 { 
    font-size: 20pt; 
    color: #1a365d; 
    border-bottom: 3px solid #3b82f6; 
    padding-bottom: 12px; 
    margin-bottom: 16px; 
}
.date { 
    color: #555; 
    font-size: 10pt; 
    margin-bottom: 24px;
    padding-bottom: 12px;
    border-bottom: 1px solid #eee;
}
.content { 
    white-space: pre-wrap; 
    font-size: 11pt;
    line-height: 1.8;
}
.footer { 
    margin-top: 50px; 
    text-align: center; 
    color: #888; 
    font-size: 9pt; 
    padding-top: 16px; 
    border-top: 1px solid #ddd; 
}
.print-btn {
    position: fixed;
    top: 20px;
    right: 20px;
    background: #3b82f6;
    color: white;
    border: none;
    padding: 12px 24px;
    font-size: 14px;
    border-radius: 8px;
    cursor: pointer;
}
.print-btn:hover { background: #2563eb; }
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">Save as PDF</button>
<h1>${summary.title}</h1>
<p class="date">Generated: ${dateStr}</p>
<div class="content">${cleanContent}</div>
<p class="footer">Generated by PrepAssist AI Notes Maker | prepassist.in</p>
<script>
// Auto print after 1 second
setTimeout(function() {
    window.print();
}, 1000);
</script>
</body>
</html>`;

            if (isWeb) {
                // Open in new window
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                    printWindow.document.write(pdfHtml);
                    printWindow.document.close();
                    console.log('[Export] PDF print window opened');
                } else {
                    // Popup blocked - show instructions
                    Alert.alert(
                        'Popup Blocked',
                        'Your browser blocked the print window. Please allow popups for this site, or download as Text/Word format instead.'
                    );
                }
            } else {
                try {
                    const file = new ExpoFile(Paths.cache, `${safeTitle}.txt`);
                    file.write(cleanContent);
                    await Sharing.shareAsync(file.uri, { mimeType: 'text/plain', dialogTitle: 'Save Notes' });
                } catch (e) {
                    console.error('[Export] PDF fallback error:', e);
                    Alert.alert('Error', 'Failed to export.');
                }
            }
        }
    };

    /**
     * Show export format options
     */
    const showExportOptions = (summary: AISummary) => {
        Alert.alert(
            'Download Summary',
            'Choose your preferred format:',
            [
                {
                    text: 'Text File (.txt)',
                    onPress: () => handleExportSummary(summary, 'txt')
                },
                {
                    text: 'Word Document (.doc)',
                    onPress: () => handleExportSummary(summary, 'doc')
                },
                {
                    text: 'PDF (Print Dialog)',
                    onPress: () => handleExportSummary(summary, 'pdf')
                },
                {
                    text: 'Cancel',
                    style: 'cancel'
                },
            ]
        );
    };

    const handleShareSummary = async (summary: AISummary) => {
        try {
            await Share.share({
                title: summary.title,
                message: `${summary.title}\n\nTags: ${summary.tags.map(t => t.name).join(' ')}\n\n${summary.summary}`,
            });
        } catch (error) {
            console.error('Share error:', error);
        }
    };

    const handleDeleteSummary = async (summaryId: number) => {
        Alert.alert('Delete Summary', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    await deleteSummary(summaryId);
                    await loadData();
                },
            },
        ]);
    };

    // ========== RENDER FUNCTIONS ==========

    // Render Topics/Tags Tab
    const renderTopicsTab = () => (
        <ScrollView style={styles.tabContent} contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
            {/* Stats Bar — scrolls with content */}
            <View style={[styles.statsBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderBottomColor: isDark ? 'rgba(255,255,255,0.10)' : '#E2E8F0' }]}>
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: isDark ? '#F0F0FF' : '#0F172A' }]}>{tags.length}</Text>
                    <Text style={[styles.statLabel, { color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B' }]}>Tags</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: isDark ? '#F0F0FF' : '#0F172A' }]}>{notes.length}</Text>
                    <Text style={[styles.statLabel, { color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B' }]}>Notes</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: isDark ? '#F0F0FF' : '#0F172A' }]}>{summaries.length}</Text>
                    <Text style={[styles.statLabel, { color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B' }]}>Summaries</Text>
                </View>
            </View>
            <LowCreditBanner isDark={isDark} />

            {/* Snap Your Notes - Prominent Action */}
            <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => navigation.navigate('CreateNoteScreen', { autoOpenCamera: true })}
                style={{ marginBottom: 14 }}
            >
                <LinearGradient
                    colors={['#F97316', '#EA580C']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}
                >
                    <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.22)', justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name="camera" size={26} color="#FFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 17, fontWeight: '800', color: '#FFF', letterSpacing: -0.3 }}>Snap Your Notes</Text>
                        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.80)', marginTop: 2 }}>Take a photo of handwritten notes & upload instantly</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.70)" />
                </LinearGradient>
            </TouchableOpacity>

            {/* Compact Update Indicator */}
            {Object.keys(matchesByTag).length > 0 && (
                <TouchableOpacity
                    style={{
                        flexDirection: 'row', alignItems: 'center', gap: 8,
                        backgroundColor: isDark ? 'rgba(245,158,11,0.10)' : '#FFFBEB',
                        borderRadius: 10, padding: 12, marginBottom: 12,
                        borderWidth: 1, borderColor: isDark ? 'rgba(245,158,11,0.20)' : '#FEF3C7',
                    }}
                    onPress={() => setShowNotifications(true)}
                    activeOpacity={0.7}
                >
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B' }} />
                    <Text style={{ fontSize: 13, color: isDark ? '#FCD34D' : '#92400E', flex: 1, fontWeight: '500' }}>
                        {Object.keys(matchesByTag).length} topic{Object.keys(matchesByTag).length > 1 ? 's' : ''} have new current affairs updates
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={isDark ? '#FCD34D' : '#92400E'} />
                </TouchableOpacity>
            )}

            {/* PDF Cross-Reference - compact */}
            {pdfCrossRefs.length > 0 && (
                <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 8,
                    backgroundColor: isDark ? 'rgba(42,125,235,0.08)' : '#EFF6FF',
                    borderRadius: 10, padding: 12, marginBottom: 12,
                    borderWidth: 1, borderColor: isDark ? 'rgba(42,125,235,0.15)' : '#DBEAFE',
                }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B82F6' }} />
                    <Text style={{ fontSize: 13, color: isDark ? '#93C5FD' : '#1E40AF', flex: 1, fontWeight: '500' }}>
                        {pdfCrossRefs.length} cross-reference{pdfCrossRefs.length > 1 ? 's' : ''} found in your PDFs
                    </Text>
                </View>
            )}


            {/* Create Tag Button */}
            <TouchableOpacity style={[styles.createTagBtn, { backgroundColor: isDark ? 'rgba(59,130,246,0.10)' : '#EFF6FF', borderColor: isDark ? 'rgba(59,130,246,0.30)' : '#BFDBFE' }]} onPress={() => setShowCreateTag(true)}>
                <Ionicons name="add-circle" size={24} color="#3B82F6" />
                <Text style={styles.createTagBtnText}>Create New Hashtag</Text>
            </TouchableOpacity>

            {/* Tags Grid */}
            <View style={styles.tagsGrid}>
                {tags.map(tag => {
                    const tagNotes = notes.filter(n => n.tags.some(t => t.id === tag.id));
                    const alert = alerts.find(a => a.tag.id === tag.id);

                    return (
                        <TouchableOpacity
                            key={tag.id}
                            style={[
                                styles.tagCard,
                                {
                                    backgroundColor: tag.color + '12', // More saturated background tint
                                    borderColor: tag.color + '60',     // Bolder, more colorful border
                                }
                            ]}
                            onPress={() => {
                                setSummaryTagIds([tag.id]);
                                setActiveTab('notes');
                            }}
                            activeOpacity={0.8}
                        >
                            {/* Artistic Background Mirror Icon - Increased Visibility */}
                            <View style={styles.mirrorIcon}>
                                <Ionicons name="pricetag" size={84} color={tag.color} style={{ opacity: 0.12 }} />
                            </View>

                            <View style={[styles.tagCardAccent, { backgroundColor: tag.color }]} />

                            <View style={styles.tagCardContent}>
                                <View style={styles.tagCardHeader}>
                                    <View style={[styles.tagIconWrapper, { backgroundColor: tag.color + '25' }]}>
                                        <Ionicons name="pricetag" size={16} color={tag.color} />
                                    </View>
                                    {alert && alert.count > 0 && (
                                        <View style={styles.alertBadge}>
                                            <Text style={styles.alertBadgeText}>{alert.count}</Text>
                                        </View>
                                    )}
                                </View>

                                <Text style={[styles.tagName, { color: isDark ? '#F0F0FF' : '#1E293B' }]} numberOfLines={1}>
                                    {tag.name.replace(/^#+/, '')}
                                </Text>

                                <View style={[styles.tagNoteCountContainer, { backgroundColor: tag.color + '25' }]}>
                                    <Text style={[styles.tagNoteCount, { color: tag.color }]}>{tagNotes.length} notes</Text>
                                </View>

                                {/* Source breakdown */}
                                <View style={styles.sourceBreakdown}>
                                    {Object.entries(SOURCE_TYPES).map(([key, config]) => {
                                        const count = tagNotes.filter(n => n.sourceType === key).length;
                                        if (count === 0) return null;
                                        return (
                                            <View key={key} style={[styles.sourceBadge, { backgroundColor: config.color + '15' }]}>
                                                <Ionicons name={config.icon as any} size={10} color={config.color} />
                                                <Text style={[styles.sourceBadgeText, { color: config.color }]}>{count}</Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {tags.length === 0 && (
                <View style={styles.emptyState}>
                    <Ionicons name="pricetag-outline" size={48} color={isDark ? 'rgba(255,255,255,0.20)' : '#CBD5E1'} />
                    <Text style={[styles.emptyStateTitle, { color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B' }]}>No Hashtags Yet</Text>
                    <Text style={[styles.emptyStateText, { color: isDark ? 'rgba(255,255,255,0.35)' : '#94A3B8' }]}>
                        Create hashtags like #MughalHistory, #ArtAndCulture to organize your notes
                    </Text>
                </View>
            )}
        </ScrollView>
    );

    // Render Notes Tab
    const renderNotesTab = () => {
        // Filter notes by selected tags if any
        const filteredNotes = summaryTagIds.length > 0
            ? notes.filter(n => n.tags.some(t => summaryTagIds.includes(t.id)))
            : notes;

        return (
            <ScrollView style={styles.tabContent} contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                {/* Stats Bar — scrolls with content */}
                <View style={[styles.statsBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderBottomColor: isDark ? 'rgba(255,255,255,0.10)' : '#E2E8F0' }]}>
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: isDark ? '#F0F0FF' : '#0F172A' }]}>{tags.length}</Text>
                        <Text style={[styles.statLabel, { color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B' }]}>Tags</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: isDark ? '#F0F0FF' : '#0F172A' }]}>{notes.length}</Text>
                        <Text style={[styles.statLabel, { color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B' }]}>Notes</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: isDark ? '#F0F0FF' : '#0F172A' }]}>{summaries.length}</Text>
                        <Text style={[styles.statLabel, { color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B' }]}>Summaries</Text>
                    </View>
                </View>

                {/* Filter by Tags */}
                {summaryTagIds.length > 0 && (
                    <View style={[styles.activeFilter, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}>
                        <Text style={[styles.activeFilterLabel, { color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B' }]}>Filtering by:</Text>
                        {tags.filter(t => summaryTagIds.includes(t.id)).map(tag => (
                            <TouchableOpacity
                                key={tag.id}
                                style={[styles.filterTag, { backgroundColor: tag.color + '20' }]}
                                onPress={() => setSummaryTagIds(prev => prev.filter(id => id !== tag.id))}
                            >
                                <Text style={[styles.filterTagText, { color: tag.color }]}>{tag.name}</Text>
                                <Ionicons name="close" size={14} color={tag.color} />
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity onPress={() => setSummaryTagIds([])}>
                            <Text style={styles.clearFilterText}>Clear All</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Add Note Button */}
                <TouchableOpacity style={styles.addNoteBtn} onPress={() => openNoteEditor()}>
                    <Ionicons name="add" size={24} color="#FFF" />
                    <Text style={styles.addNoteBtnText}>Add New Note</Text>
                </TouchableOpacity>

                {/* Source Type Filter */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sourceFilter}>
                    {Object.entries(SOURCE_TYPES).map(([key, config]) => (
                        <TouchableOpacity
                            key={key}
                            style={[
                                styles.sourceFilterBtn,
                                {
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
                                    borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0',
                                },
                                summarySourceTypes.includes(key as SourceType) && { backgroundColor: config.color + '20', borderColor: config.color }
                            ]}
                            onPress={() => toggleSummarySource(key as SourceType)}
                        >
                            <Ionicons name={config.icon as any} size={16} color={config.color} />
                            <Text style={[styles.sourceFilterText, { color: config.color }]}>{config.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Notes List */}
                {filteredNotes.map(note => {
                    const sourceConfig = SOURCE_TYPES[note.sourceType as SourceType] || SOURCE_TYPES.manual;

                    return (
                        <TouchableOpacity
                            key={note.id}
                            style={[styles.premiumNoteCard, {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.072)' : '#FFFFFF',
                                borderColor: isDark ? 'rgba(255,255,255,0.10)' : '#E2E8F0',
                            }]}
                            onPress={() => openNoteEditor(note)}
                        >
                            <View style={styles.noteCardTopRow}>
                                <View style={[styles.sourceBadgeTiny, { backgroundColor: sourceConfig.color + '15' }]}>
                                    <Ionicons name={sourceConfig.icon as any} size={12} color={sourceConfig.color} />
                                    <Text style={[styles.sourceBadgeTinyText, { color: sourceConfig.color }]}>
                                        {sourceConfig.label.toUpperCase()}
                                    </Text>
                                </View>
                                <Text style={[styles.noteCardDate, { color: isDark ? 'rgba(255,255,255,0.35)' : '#94A3B8' }]}>{new Date(note.updatedAt).toLocaleDateString()}</Text>
                            </View>

                            <View style={styles.noteCardMainContent}>
                                <View style={styles.noteCardHeaderFixed}>
                                    <Text style={[styles.premiumNoteTitle, { color: isDark ? '#F0F0FF' : '#0F172A' }]} numberOfLines={1}>{note.title}</Text>
                                    {noteUpdatesMap[note.id] > 0 && (
                                        <View style={{ backgroundColor: '#F97316', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8 }}>
                                            <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>
                                                {noteUpdatesMap[note.id]} update{noteUpdatesMap[note.id] > 1 ? 's' : ''}
                                            </Text>
                                        </View>
                                    )}
                                    <TouchableOpacity
                                        style={styles.deleteNoteBtnSmall}
                                        onPress={() => handleDeleteNote(note.id)}
                                    >
                                        <Ionicons name="trash-outline" size={16} color="#94A3B8" />
                                    </TouchableOpacity>
                                </View>

                                <Text style={[styles.premiumNotePreview, { color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B' }]} numberOfLines={2}>{note.content}</Text>

                                {note.summary && (
                                    <View style={styles.premiumSummaryPreview}>
                                        <Ionicons name="sparkles" size={14} color="#2A7DEB" />
                                        <Text style={styles.premiumSummaryText} numberOfLines={2}>
                                            {note.summary}
                                        </Text>
                                    </View>
                                )}

                                <View style={styles.noteCardFooter}>
                                    <View style={styles.noteCardTagsList}>
                                        {note.tags.slice(0, 3).map(tag => (
                                            <View key={tag.id} style={[styles.tinyTag, { backgroundColor: tag.color + '15' }]}>
                                                <Text style={[styles.tinyTagText, { color: tag.color }]}>{tag.name.replace(/^#+/, '')}</Text>
                                            </View>
                                        ))}
                                        {note.tags.length > 3 && (
                                            <Text style={[styles.moreTagsTextSmall, { color: isDark ? 'rgba(255,255,255,0.35)' : '#94A3B8' }]}>+{note.tags.length - 3}</Text>
                                        )}
                                    </View>
                                    {note.sourceUrl && (
                                        <Ionicons name="link" size={12} color="#94A3B8" />
                                    )}
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                })}

                {filteredNotes.length === 0 && (
                    <View style={styles.emptyState}>
                        <Ionicons name="document-text-outline" size={48} color={isDark ? 'rgba(255,255,255,0.20)' : '#CBD5E1'} />
                        <Text style={[styles.emptyStateTitle, { color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B' }]}>No Notes Yet</Text>
                        <Text style={[styles.emptyStateText, { color: isDark ? 'rgba(255,255,255,0.35)' : '#94A3B8' }]}>
                            Add notes from your studies, institute materials, or current affairs
                        </Text>
                    </View>
                )}
            </ScrollView>
        );
    };

    // Render Summaries Tab
    const renderSummariesTab = () => {
        // Filter summaries based on selected tag and search
        const filteredSummaries = summaries.filter(s => {
            const matchesTag = !filterTagId || s.tags.some(t => t.id === filterTagId);
            const matchesSearch = !searchQuery ||
                s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.summary.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesTag && matchesSearch;
        });

        // Get all unique tags from summaries
        const allTags = Array.from(new Set(summaries.flatMap(s => s.tags.map(t => JSON.stringify(t)))))
            .map(t => JSON.parse(t));

        return (
            <ScrollView style={styles.tabContent} contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                {/* Stats Bar — scrolls with content */}
                <View style={[styles.statsBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderBottomColor: isDark ? 'rgba(255,255,255,0.10)' : '#E2E8F0' }]}>
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: isDark ? '#F0F0FF' : '#0F172A' }]}>{tags.length}</Text>
                        <Text style={[styles.statLabel, { color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B' }]}>Tags</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: isDark ? '#F0F0FF' : '#0F172A' }]}>{notes.length}</Text>
                        <Text style={[styles.statLabel, { color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B' }]}>Notes</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: isDark ? '#F0F0FF' : '#0F172A' }]}>{summaries.length}</Text>
                        <Text style={[styles.statLabel, { color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B' }]}>Summaries</Text>
                    </View>
                </View>

                {/* Generate Summary Button */}
                <TouchableOpacity style={styles.generateBtn} onPress={openSummaryGenerator}>
                    <Ionicons name="sparkles" size={24} color="#FFF" />
                    <View>
                        <Text style={styles.generateBtnText}>Generate AI Summary</Text>
                        <Text style={styles.generateBtnSubtext}>Combine notes by hashtags</Text>
                    </View>
                </TouchableOpacity>

                {/* Search Bar */}
                <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9', borderRadius: 12, padding: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0' }}>
                    <Ionicons name="search" size={20} color={isDark ? 'rgba(255,255,255,0.45)' : '#64748B'} />
                    <TextInput
                        style={{ flex: 1, marginLeft: 10, fontSize: 15, color: isDark ? '#F0F0FF' : '#0F172A' }}
                        placeholder="Search summaries..."
                        placeholderTextColor={isDark ? 'rgba(255,255,255,0.30)' : '#94A3B8'}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery ? (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color={isDark ? 'rgba(255,255,255,0.45)' : '#94A3B8'} />
                        </TouchableOpacity>
                    ) : null}
                </View>

                {/* Tag Filter Chips */}
                {allTags.length > 0 && (
                    <View style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B', marginBottom: 8 }}>Filter by Tag:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <TouchableOpacity
                                onPress={() => setFilterTagId(null)}
                                style={{
                                    paddingHorizontal: 14,
                                    paddingVertical: 8,
                                    borderRadius: 20,
                                    backgroundColor: filterTagId === null ? '#3B82F6' : (isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'),
                                    marginRight: 8,
                                }}
                            >
                                <Text style={{ color: filterTagId === null ? '#FFF' : (isDark ? 'rgba(255,255,255,0.65)' : '#475569'), fontWeight: '600', fontSize: 13 }}>
                                    All
                                </Text>
                            </TouchableOpacity>
                            {allTags.map((tag: any) => (
                                <TouchableOpacity
                                    key={tag.id}
                                    onPress={() => setFilterTagId(filterTagId === tag.id ? null : tag.id)}
                                    style={{
                                        paddingHorizontal: 14,
                                        paddingVertical: 8,
                                        borderRadius: 20,
                                        backgroundColor: filterTagId === tag.id ? tag.color : (isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'),
                                        marginRight: 8,
                                    }}
                                >
                                    <Text style={{
                                        color: filterTagId === tag.id ? '#FFF' : tag.color,
                                        fontWeight: '600',
                                        fontSize: 13
                                    }}>
                                        {tag.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Summaries List */}
                <Text style={[styles.sectionTitle, { color: isDark ? '#F0F0FF' : '#0F172A' }]}>
                    {filterTagId || searchQuery
                        ? `Filtered Summaries (${filteredSummaries.length})`
                        : `Your Summaries (${summaries.length})`}
                </Text>

                {filteredSummaries.map(summary => (
                    <View key={summary.id} style={[styles.summaryCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.065)' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)' }]}>
                        <View style={[styles.summaryCardHeader, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(59,130,246,0.03)' }]}>
                            <Text style={[styles.summaryTitle, { color: isDark ? '#F0F0FF' : '#0F172A' }]}>{summary.title}</Text>
                            <Text style={[styles.summaryDate, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: isDark ? 'rgba(255,255,255,0.45)' : '#94A3B8' }]}>
                                {new Date(summary.createdAt).toLocaleDateString()}
                            </Text>
                        </View>

                        <View style={styles.summaryTags}>
                            {summary.tags.map(tag => (
                                <Text key={tag.id} style={[styles.summaryTag, { color: tag.color }]}>{tag.name}</Text>
                            ))}
                        </View>

                        <Text style={[styles.summaryPreview, { color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B' }]} numberOfLines={3}>{summary.summary}</Text>

                        <View style={[styles.summaryActions, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                            <TouchableOpacity style={styles.summaryAction} onPress={() => setShowSummaryDetail(summary)}>
                                <Ionicons name="eye-outline" size={18} color="#3B82F6" />
                                <Text style={styles.summaryActionText}>View</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.summaryAction} onPress={async () => {
                                const safeTitle = summary.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30) || 'Summary';
                                const dateStr = new Date(summary.createdAt).toLocaleDateString('en-IN');
                                const content = `${summary.title}\n\nGenerated: ${dateStr}\n\n${'='.repeat(50)}\n\n${summary.summary}\n\n${'='.repeat(50)}\n\nGenerated by PrepAssist AI Notes`;

                                try {
                                    if (isWeb) {
                                        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `${safeTitle}.txt`;
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                        URL.revokeObjectURL(url);
                                    } else {
                                        const file = new ExpoFile(Paths.cache, `${safeTitle}.txt`);
                                        file.write(content);
                                        await Sharing.shareAsync(file.uri, { mimeType: 'text/plain', dialogTitle: 'Save Notes' });
                                    }
                                } catch (e) {
                                    console.error('Download error:', e);
                                    Alert.alert('Error', 'Failed to export file.');
                                }
                            }}>
                                <Ionicons name="document-text-outline" size={18} color="#10B981" />
                                <Text style={[styles.summaryActionText, { color: '#10B981' }]}>TXT</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.summaryAction} onPress={async () => {
                                const s = summary;
                                const safeTitle = s.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30) || 'Summary';
                                const dateStr = new Date(s.createdAt).toLocaleDateString('en-IN');

                                if (isWeb) {
                                    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${s.title}</title><style>
body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto;line-height:1.8;color:#222;}
h1{color:#1a365d;border-bottom:3px solid #3b82f6;padding-bottom:12px;}
.date{color:#666;font-size:12px;margin-bottom:20px;}
.content{white-space:pre-wrap;}
.footer{margin-top:40px;text-align:center;color:#999;font-size:10px;border-top:1px solid #ddd;padding-top:15px;}
@media print{body{padding:20px;}}
</style></head><body>
<h1>${s.title}</h1>
<p class="date">Generated: ${dateStr}</p>
<div class="content">${s.summary}</div>
<p class="footer">Generated by PrepAssist AI Notes Maker</p>
</body></html>`;
                                    const w = window.open('', '_blank');
                                    if (w) {
                                        w.document.write(html);
                                        w.document.close();
                                        setTimeout(() => w.print(), 500);
                                    }
                                } else {
                                    try {
                                        const content = `${s.title}\n\nGenerated: ${dateStr}\n\n${'='.repeat(50)}\n\n${s.summary}\n\n${'='.repeat(50)}\n\nGenerated by PrepAssist AI Notes`;
                                        const file = new ExpoFile(Paths.cache, `${safeTitle}.txt`);
                                        file.write(content);
                                        await Sharing.shareAsync(file.uri, { mimeType: 'text/plain', dialogTitle: 'Save Notes' });
                                    } catch (e) {
                                        console.error('PDF error:', e);
                                        Alert.alert('Error', 'Failed to export.');
                                    }
                                }
                            }}>
                                <Ionicons name="print-outline" size={18} color="#F59E0B" />
                                <Text style={[styles.summaryActionText, { color: '#F59E0B' }]}>PDF</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.summaryAction} onPress={() => handleShareSummary(summary)}>
                                <Ionicons name="share-outline" size={18} color="#2A7DEB" />
                                <Text style={[styles.summaryActionText, { color: '#2A7DEB' }]}>Share</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.summaryAction} onPress={() => handleDeleteSummary(summary.id)}>
                                <Ionicons name="trash-outline" size={18} color="#D97706" />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}

                {filteredSummaries.length === 0 && (
                    <View style={styles.emptyState}>
                        <Ionicons name="sparkles-outline" size={48} color={isDark ? 'rgba(255,255,255,0.20)' : '#CBD5E1'} />
                        <Text style={[styles.emptyStateTitle, { color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B' }]}>
                            {searchQuery || filterTagId ? 'No Matching Summaries' : 'No Summaries Yet'}
                        </Text>
                        <Text style={[styles.emptyStateText, { color: isDark ? 'rgba(255,255,255,0.35)' : '#94A3B8' }]}>
                            {searchQuery || filterTagId
                                ? 'Try a different search or filter'
                                : 'Generate AI summaries by combining notes with matching hashtags'}
                        </Text>
                    </View>
                )}
            </ScrollView>
        );
    };

    // ========== MODALS ==========

    // Create Tag Modal
    const renderCreateTagModal = () => (
        <Modal visible={showCreateTag} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: isDark ? '#0F1335' : '#FFFFFF', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#E4E6F0' }]}>
                    <Text style={[styles.modalTitle, { color: isDark ? '#F0F0FF' : '#0F172A' }]}>Create Hashtag</Text>

                    <TextInput
                        style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9', borderColor: isDark ? 'rgba(255,255,255,0.14)' : '#E2E8F0', color: isDark ? '#F0F0FF' : '#0F172A' }]}
                        placeholder="#MughalHistory"
                        placeholderTextColor={isDark ? 'rgba(255,255,255,0.30)' : '#7A8A91'}
                        value={newTagName}
                        onChangeText={setNewTagName}
                        autoCapitalize="none"
                    />

                    <Text style={[styles.inputLabel, { color: isDark ? 'rgba(255,255,255,0.65)' : '#374151' }]}>Color</Text>
                    <View style={styles.colorPicker}>
                        {['#3B82F6', '#10B981', '#2A7DEB', '#F59E0B', '#EF4444', '#EC4899'].map(color => (
                            <TouchableOpacity
                                key={color}
                                style={[
                                    styles.colorOption,
                                    { backgroundColor: color },
                                    newTagColor === color && styles.colorOptionSelected
                                ]}
                                onPress={() => setNewTagColor(color)}
                            />
                        ))}
                    </View>

                    <View style={styles.modalActions}>
                        <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowCreateTag(false)}>
                            <Text style={[styles.modalCancelText, { color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B' }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleCreateTag}>
                            <Text style={styles.modalConfirmText}>Create</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    // Note Editor Modal
    const renderNoteEditorModal = () => (
        <Modal visible={showNoteEditor} animationType="slide">
            <SafeAreaView style={[styles.editorContainer, { backgroundColor: isDark ? '#07091A' : '#FFFFFF' }]}>
                <View style={[styles.editorHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.10)' : '#E2E8F0', backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF' }]}>
                    <TouchableOpacity onPress={() => setShowNoteEditor(false)}>
                        <Ionicons name="close" size={24} color={isDark ? 'rgba(255,255,255,0.55)' : '#64748B'} />
                    </TouchableOpacity>
                    <Text style={[styles.editorTitle, { color: isDark ? '#F0F0FF' : '#0F172A' }]}>{editingNote ? 'Edit Note' : 'Add Note'}</Text>
                    <TouchableOpacity onPress={handleSaveNote}>
                        <Text style={styles.saveBtn}>Save</Text>
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        style={styles.editorBody}
                        contentContainerStyle={{ paddingBottom: 40 }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Section 1: Title View */}
                        <View style={[styles.editorSectionCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.10)' : '#F1F5F9' }]}>
                            <View style={styles.sectionHeader}>

                                <Text style={[styles.sectionLabel, { color: isDark ? 'rgba(255,255,255,0.45)' : '#64748B' }]}>NOTE TITLE</Text>
                            </View>
                            <TextInput
                                style={[styles.premiumTitleInput, { color: isDark ? '#F0F0FF' : '#0F172A', borderBottomColor: isDark ? 'rgba(255,255,255,0.10)' : '#F1F5F9' }]}
                                placeholder="What's this note about?"
                                placeholderTextColor={isDark ? 'rgba(255,255,255,0.30)' : '#94A3B8'}
                                value={noteTitle}
                                onChangeText={setNoteTitle}
                            />
                        </View>

                        {/* Tags - compact row */}
                        <View style={[styles.editorSectionCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.10)' : '#F1F5F9', paddingVertical: 10 }]}>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                                {tags.map(tag => (
                                    <TouchableOpacity
                                        key={tag.id}
                                        style={[
                                            styles.tagSelectorItem,
                                            { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0' },
                                            selectedTagIds.includes(tag.id) && { backgroundColor: tag.color + '20', borderColor: tag.color }
                                        ]}
                                        onPress={() => toggleTagSelection(tag.id)}
                                    >
                                        <Text style={[styles.tagSelectorText, { color: tag.color }]}>{tag.name.replace(/^#+/, '')}</Text>
                                        {selectedTagIds.includes(tag.id) && <Ionicons name="checkmark-circle" size={14} color={tag.color} />}
                                    </TouchableOpacity>
                                ))}
                                <TouchableOpacity style={styles.addTagSmallBtn} onPress={() => setShowCreateTag(true)}>
                                    <Ionicons name="add" size={16} color="#3B82F6" />
                                    <Text style={styles.addTagSmallText}>New Tag</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Section 2: Sources */}
                        <View style={[styles.editorSectionCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.10)' : '#F1F5F9' }]}>

                            {/* Rendered Sources */}
                            {noteSources.map((source, idx) => (
                                <View key={source.id} style={{ marginBottom: 12 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                        <View style={{
                                            width: 24, height: 24, borderRadius: 6,
                                            backgroundColor: source.type === 'pdf' ? '#EF444415' : source.type === 'camera' ? '#F9731615' : source.type === 'link' ? '#10B98115' : '#3B82F615',
                                            justifyContent: 'center', alignItems: 'center', marginRight: 8,
                                        }}>
                                            <Ionicons
                                                name={source.type === 'pdf' ? 'document-text' : source.type === 'camera' ? 'camera' : source.type === 'link' ? 'link' : 'create'}
                                                size={13}
                                                color={source.type === 'pdf' ? '#EF4444' : source.type === 'camera' ? '#F97316' : source.type === 'link' ? '#10B981' : '#3B82F6'}
                                            />
                                        </View>
                                        <Text style={{ fontSize: 13, fontWeight: '600', color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B', flex: 1 }}>
                                            Source {idx + 1} — {source.type === 'pdf' ? 'PDF' : source.type === 'camera' ? 'Camera' : source.type === 'link' ? 'Web' : 'Text'}
                                            {source.type === 'pdf' ? `: ${source.fileName || 'document.pdf'}` : ''}
                                        </Text>
                                        {(scrapingSourceId === source.id || processingPdfIds.has(source.id)) && <ActivityIndicator size="small" color={processingPdfIds.has(source.id) ? '#EF4444' : '#3B82F6'} style={{ marginRight: 6 }} />}
                                        <TouchableOpacity onPress={() => handleRemoveSource(source.id)} style={{ padding: 4 }}>
                                            <Ionicons name="close-circle" size={18} color={isDark ? 'rgba(255,255,255,0.25)' : '#D1D5DB'} />
                                        </TouchableOpacity>
                                    </View>
                                    {source.type === 'text' ? (
                                        <TextInput
                                            style={{
                                                minHeight: 100, borderRadius: 10, padding: 12,
                                                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
                                                borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.10)' : '#E2E8F0',
                                                color: isDark ? '#F0F0FF' : '#0F172A', fontSize: 14, lineHeight: 22,
                                                textAlignVertical: 'top',
                                            }}
                                            placeholder="Type or paste your notes here..."
                                            placeholderTextColor={isDark ? 'rgba(255,255,255,0.25)' : '#94A3B8'}
                                            value={source.content}
                                            onChangeText={(text) => setNoteSources(prev => prev.map(s => s.id === source.id ? { ...s, content: text } : s))}
                                            multiline
                                        />
                                    ) : source.type === 'pdf' && processingPdfIds.has(source.id) ? (
                                        <View style={{ padding: 14, alignItems: 'center', backgroundColor: isDark ? 'rgba(239,68,68,0.05)' : '#FEF2F2', borderRadius: 10 }}>
                                            <ActivityIndicator size="small" color="#EF4444" style={{ marginBottom: 6 }} />
                                            <Text style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.45)' : '#94A3B8' }}>Extracting text from PDF...</Text>
                                        </View>
                                    ) : source.type === 'link' && !source.content && scrapingSourceId === source.id ? (
                                        <View style={{ padding: 14, alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FAFAFA', borderRadius: 10 }}>
                                            <Text style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.35)' : '#94A3B8' }}>Extracting content from {source.url}...</Text>
                                        </View>
                                    ) : source.content ? (
                                        <View style={{
                                            borderRadius: 10, padding: 12, maxHeight: 120,
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
                                            borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                                        }}>
                                            <Text style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.60)' : '#4B5563', lineHeight: 20 }} numberOfLines={5}>
                                                {source.content}
                                            </Text>
                                        </View>
                                    ) : (
                                        <View style={{ padding: 14, alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FAFAFA', borderRadius: 10 }}>
                                            <Text style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.35)' : '#94A3B8' }}>Processing...</Text>
                                        </View>
                                    )}
                                </View>
                            ))}

                            {/* Link URL Input */}
                            {showSourceLinkInput && (
                                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                                    <TextInput
                                        style={{
                                            flex: 1, height: 42, borderRadius: 8, paddingHorizontal: 12,
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F8FAFC',
                                            borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.14)' : '#E2E8F0',
                                            color: isDark ? '#F0F0FF' : '#334155', fontSize: 14,
                                        }}
                                        placeholder="Paste URL here..."
                                        placeholderTextColor={isDark ? 'rgba(255,255,255,0.30)' : '#94A3B8'}
                                        value={sourceLinkUrl}
                                        onChangeText={setSourceLinkUrl}
                                        autoCapitalize="none"
                                        keyboardType="url"
                                        autoFocus
                                    />
                                    <TouchableOpacity
                                        style={{ backgroundColor: '#10B981', paddingHorizontal: 14, borderRadius: 8, justifyContent: 'center' }}
                                        onPress={handleAddLinkSource}
                                    >
                                        <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 13 }}>Add</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={{ justifyContent: 'center' }} onPress={() => { setShowSourceLinkInput(false); setSourceLinkUrl(''); }}>
                                        <Ionicons name="close" size={20} color={isDark ? 'rgba(255,255,255,0.45)' : '#94A3B8'} />
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Add Source Buttons Row */}
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {SOURCE_ADD_OPTIONS.map(opt => (
                                    <TouchableOpacity
                                        key={opt.key}
                                        style={{
                                            flexDirection: 'row', alignItems: 'center', gap: 6,
                                            paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F8FAFC',
                                            borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.10)' : '#E2E8F0',
                                        }}
                                        onPress={() => {
                                            if (opt.key === 'text') handleAddTextSource();
                                            else if (opt.key === 'pdf') handleAddPdfSource();
                                            else if (opt.key === 'camera') handleAddCameraSource();
                                            else if (opt.key === 'link') { setShowSourceLinkInput(true); }
                                        }}
                                    >
                                        <Ionicons name={opt.icon as any} size={16} color={opt.color} />
                                        <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? 'rgba(255,255,255,0.65)' : '#64748B' }}>{opt.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {noteSources.length === 0 && (
                                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                                    <Text style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.25)' : '#94A3B8' }}>
                                        Add sources to start building your notes
                                    </Text>
                                </View>
                            )}

                            {/* AI Summarization Feature (Inside the second card) */}
                            <View style={[styles.aiSummarizationGroup, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9' }]}>
                                <View style={styles.aiSummarizationHeader}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Ionicons name="sparkles" size={18} color="#2A7DEB" />
                                        <Text style={styles.aiSummarizationTitle}>AI Summarization</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={[
                                            styles.summarizeBtn,
                                            ((!noteContent.trim() && !noteSources.some(s => s.content.trim())) || generating) && { opacity: 0.5 }
                                        ]}
                                        onPress={handleGenerateNoteSummary}
                                        disabled={(!noteContent.trim() && !noteSources.some(s => s.content.trim())) || generating}
                                    >
                                        {generating && generatingStatus === 'Summarizing...' ? (
                                            <ActivityIndicator size="small" color="#FFF" />
                                        ) : (
                                            <>
                                                <Ionicons name="flash" size={16} color="#FFF" />
                                                <Text style={styles.summarizeBtnText}>Summarize</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>

                                {noteSummary ? (
                                    <View style={[styles.summaryResultBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFF', borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#E9D5FF' }]}>
                                        <Text style={styles.summaryResultTitle}>Summary:</Text>
                                        <Text style={[styles.summaryResultText, { color: isDark ? 'rgba(255,255,255,0.70)' : '#4B5563' }]}>{noteSummary}</Text>
                                        <TouchableOpacity
                                            style={styles.clearSummaryBtn}
                                            onPress={() => setNoteSummary('')}
                                        >
                                            <Text style={styles.clearSummaryBtnText}>Clear Summary</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View style={styles.summaryPlaceholder}>
                                        <Text style={styles.summaryPlaceholderText}>
                                            Click summarize to generate AI bullet points based on your content.
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 12, marginBottom: 8, gap: 6 }}>
                            <Ionicons name="information-circle-outline" size={14} color={isDark ? 'rgba(255,255,255,0.35)' : '#94A3B8'} />
                            <Text style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.35)' : '#94A3B8', flex: 1 }}>
                                AI-generated summaries may be inaccurate. Notes are synced to Firebase cloud.
                            </Text>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Modal>
    );

    // Summary Generator Modal with Note Selection
    const renderSummaryModal = () => (
        <Modal visible={showSummaryModal} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { maxHeight: '90%', width: isWeb ? Math.min(width * 0.9, 700) : '95%', backgroundColor: isDark ? '#0F1335' : '#FFFFFF', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#E4E6F0' }]}>
                    <Text style={[styles.modalTitle, { color: isDark ? '#F0F0FF' : '#0F172A' }]}>
                        {summaryStep === 'select-notes' ? ' Select Content to Summarize' : '⚡ Configure Summary'}
                    </Text>

                    {summaryStep === 'select-notes' ? (
                        <ScrollView style={{ maxHeight: 500 }}>
                            {/* My Notes Section */}
                            <View style={{ marginBottom: 20 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                    <Text style={[styles.inputLabel, { marginBottom: 0 }]}> Your Notes ({notes.length})</Text>
                                    <TouchableOpacity onPress={selectAllNotes} style={{ padding: 5 }}>
                                        <Text style={{ color: '#3B82F6', fontSize: 12 }}>Select All</Text>
                                    </TouchableOpacity>
                                </View>

                                {notes.length === 0 ? (
                                    <View style={{ padding: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F8FAFC', borderRadius: 10, alignItems: 'center' }}>
                                        <Ionicons name="document-outline" size={32} color={isDark ? 'rgba(255,255,255,0.25)' : '#94A3B8'} />
                                        <Text style={{ color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B', marginTop: 10 }}>No notes yet. Add notes first!</Text>
                                    </View>
                                ) : (
                                    notes.map(note => (
                                        <TouchableOpacity
                                            key={note.id}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                padding: 12,
                                                backgroundColor: selectedNoteIds.includes(note.id) ? (isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF') : (isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC'),
                                                borderRadius: 10,
                                                marginBottom: 8,
                                                borderWidth: selectedNoteIds.includes(note.id) ? 2 : 1,
                                                borderColor: selectedNoteIds.includes(note.id) ? '#3B82F6' : (isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0'),
                                            }}
                                            onPress={() => toggleNoteSelection(note.id)}
                                        >
                                            <View style={{
                                                width: 24, height: 24, borderRadius: 6,
                                                backgroundColor: selectedNoteIds.includes(note.id) ? '#3B82F6' : (isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0'),
                                                justifyContent: 'center', alignItems: 'center', marginRight: 12
                                            }}>
                                                {selectedNoteIds.includes(note.id) && <Ionicons name="checkmark" size={16} color="#FFF" />}
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontWeight: '600', color: isDark ? '#F0F0FF' : '#0F172A', marginBottom: 2 }} numberOfLines={1}>
                                                    {note.title}
                                                </Text>
                                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                                                    <Text style={{
                                                        fontSize: 10, color: SOURCE_TYPES[note.sourceType as SourceType]?.color || '#64748B',
                                                        backgroundColor: (SOURCE_TYPES[note.sourceType as SourceType]?.color || '#64748B') + '20',
                                                        paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4
                                                    }}>
                                                        {SOURCE_TYPES[note.sourceType as SourceType]?.label || 'Note'}
                                                    </Text>
                                                    {note.tags.slice(0, 2).map(t => (
                                                        <Text key={t.id} style={{
                                                            fontSize: 10, color: t.color,
                                                            backgroundColor: t.color + '20',
                                                            paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4
                                                        }}>{t.name.replace(/^#+/, '')}</Text>
                                                    ))}
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    ))
                                )}
                            </View>

                            {/* Current Affairs Section */}
                            <View style={{ marginBottom: 20 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                    <Text style={[styles.inputLabel, { marginBottom: 0 }]}> Current Affairs ({currentAffairs.length})</Text>
                                    <TouchableOpacity onPress={selectAllArticles} style={{ padding: 5 }}>
                                        <Text style={{ color: '#10B981', fontSize: 12 }}>Select All</Text>
                                    </TouchableOpacity>
                                </View>

                                {loadingArticles ? (
                                    <View style={{ padding: 20, alignItems: 'center' }}>
                                        <ActivityIndicator color="#10B981" />
                                        <Text style={{ color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B', marginTop: 10 }}>Loading Current Affairs...</Text>
                                    </View>
                                ) : currentAffairs.length === 0 ? (
                                    <View style={{ padding: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F8FAFC', borderRadius: 10, alignItems: 'center' }}>
                                        <Ionicons name="newspaper-outline" size={32} color={isDark ? 'rgba(255,255,255,0.25)' : '#94A3B8'} />
                                        <Text style={{ color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B', marginTop: 10 }}>No current affairs available</Text>
                                    </View>
                                ) : (
                                    currentAffairs.map(article => (
                                        <TouchableOpacity
                                            key={article.id}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                padding: 12,
                                                backgroundColor: selectedArticleIds.includes(article.id) ? (isDark ? 'rgba(16,185,129,0.15)' : '#ECFDF5') : (isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC'),
                                                borderRadius: 10,
                                                marginBottom: 8,
                                                borderWidth: selectedArticleIds.includes(article.id) ? 2 : 1,
                                                borderColor: selectedArticleIds.includes(article.id) ? '#10B981' : (isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0'),
                                            }}
                                            onPress={() => toggleArticleSelection(article.id)}
                                        >
                                            <View style={{
                                                width: 24, height: 24, borderRadius: 6,
                                                backgroundColor: selectedArticleIds.includes(article.id) ? '#10B981' : (isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0'),
                                                justifyContent: 'center', alignItems: 'center', marginRight: 12
                                            }}>
                                                {selectedArticleIds.includes(article.id) && <Ionicons name="checkmark" size={16} color="#FFF" />}
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontWeight: '600', color: isDark ? '#F0F0FF' : '#0F172A', marginBottom: 2 }} numberOfLines={2}>
                                                    {article.title}
                                                </Text>
                                                <Text style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B' }}>
                                                    {article.source} • {new Date(article.date).toLocaleDateString()}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))
                                )}
                            </View>

                            {/* Selection Summary */}
                            <View style={{
                                backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : '#F0FDF4', padding: 15, borderRadius: 10, marginBottom: 10,
                                borderWidth: 1, borderColor: isDark ? 'rgba(16,185,129,0.30)' : '#BBF7D0'
                            }}>
                                <Text style={{ fontWeight: '600', color: isDark ? '#6EE7B7' : '#166534', marginBottom: 5 }}> Selected Content</Text>
                                <Text style={{ color: isDark ? '#34D399' : '#15803D' }}>
                                    {selectedNoteIds.length} notes + {selectedArticleIds.length} current affairs articles
                                </Text>
                            </View>

                            {/* Custom Prompt */}
                            <Text style={[styles.inputLabel, { color: isDark ? 'rgba(255,255,255,0.65)' : '#374151' }]}>Custom Instructions (optional)</Text>
                            <TextInput
                                style={[styles.input, { height: 60, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9', borderColor: isDark ? 'rgba(255,255,255,0.14)' : '#E2E8F0', color: isDark ? '#F0F0FF' : '#0F172A' }]}
                                placeholder="E.g., Focus on UPSC Prelims relevant points, include dates and facts"
                                placeholderTextColor={isDark ? 'rgba(255,255,255,0.30)' : '#7A8A91'}
                                value={customPrompt}
                                onChangeText={setCustomPrompt}
                                multiline
                            />
                        </ScrollView>
                    ) : null}

                    {generating && (
                        <View style={{ padding: 30, alignItems: 'center' }}>
                            <ActivityIndicator color="#3B82F6" size="large" />
                            <Text style={{ color: '#3B82F6', marginTop: 15, fontWeight: '600' }}>{generatingStatus}</Text>
                            <Text style={{ color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B', marginTop: 5, fontSize: 12 }}>This may take a minute...</Text>
                        </View>
                    )}

                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            style={styles.modalCancelBtn}
                            onPress={() => setShowSummaryModal(false)}
                            disabled={generating}
                        >
                            <Text style={[styles.modalCancelText, { color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B' }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.modalConfirmBtn,
                                (generating || (selectedNoteIds.length === 0 && selectedArticleIds.length === 0)) && { opacity: 0.5 }
                            ]}
                            onPress={handleGenerateSummary}
                            disabled={generating || (selectedNoteIds.length === 0 && selectedArticleIds.length === 0)}
                        >
                            {generating ? (
                                <ActivityIndicator color="#FFF" size="small" />
                            ) : (
                                <>
                                    <Ionicons name="sparkles" size={18} color="#FFF" style={{ marginRight: 8 }} />
                                    <Text style={styles.modalConfirmText}>Generate AI Summary</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    // Summary Detail Modal
    const renderSummaryDetailModal = () => {
        if (!showSummaryDetail) return null;

        return (
            <Modal visible={true} animationType="slide">
                <SafeAreaView style={[styles.detailContainer, { backgroundColor: isDark ? '#07091A' : '#FFFFFF' }]}>
                    <View style={[styles.detailHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.10)' : '#E2E8F0', backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF' }]}>
                        <TouchableOpacity onPress={() => setShowSummaryDetail(null)}>
                            <Ionicons name="arrow-back" size={24} color={isDark ? '#F0F0FF' : '#0F172A'} />
                        </TouchableOpacity>
                        <Text style={[styles.detailTitle, { color: isDark ? '#F0F0FF' : '#0F172A' }]} numberOfLines={1}>{showSummaryDetail.title}</Text>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity onPress={async () => {
                                const s = showSummaryDetail;
                                const safeTitle = s.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30) || 'Summary';
                                const dateStr = new Date(s.createdAt).toLocaleDateString('en-IN');
                                const content = `${s.title}\n\nGenerated: ${dateStr}\n\n${'='.repeat(50)}\n\n${s.summary}\n\n${'='.repeat(50)}\n\nGenerated by PrepAssist AI Notes`;
                                try {
                                    if (isWeb) {
                                        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `${safeTitle}.txt`;
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                        URL.revokeObjectURL(url);
                                    } else {
                                        const file = new ExpoFile(Paths.cache, `${safeTitle}.txt`);
                                        file.write(content);
                                        await Sharing.shareAsync(file.uri, { mimeType: 'text/plain', dialogTitle: 'Save Notes' });
                                    }
                                } catch (e) { console.error(e); }
                            }}>
                                <Ionicons name="document-text-outline" size={24} color="#10B981" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={async () => {
                                const s = showSummaryDetail;
                                const safeTitle = s.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30) || 'Summary';
                                const dateStr = new Date(s.createdAt).toLocaleDateString('en-IN');
                                if (isWeb) {
                                    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${s.title}</title><style>
body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto;line-height:1.8;color:#222;}
h1{color:#1a365d;border-bottom:3px solid #3b82f6;padding-bottom:12px;}
.date{color:#666;font-size:12px;margin-bottom:20px;}
.content{white-space:pre-wrap;}
.footer{margin-top:40px;text-align:center;color:#999;font-size:10px;border-top:1px solid #ddd;padding-top:15px;}
@media print{body{padding:20px;}}
</style></head><body>
<h1>${s.title}</h1>
<p class="date">Generated: ${dateStr}</p>
<div class="content">${s.summary}</div>
<p class="footer">Generated by PrepAssist AI Notes Maker</p>
</body></html>`;
                                    const w = window.open('', '_blank');
                                    if (w) {
                                        w.document.write(html);
                                        w.document.close();
                                        setTimeout(() => w.print(), 500);
                                    }
                                } else {
                                    try {
                                        const content = `${s.title}\n\nGenerated: ${dateStr}\n\n${'='.repeat(50)}\n\n${s.summary}\n\n${'='.repeat(50)}\n\nGenerated by PrepAssist AI Notes`;
                                        const file = new ExpoFile(Paths.cache, `${safeTitle}.txt`);
                                        file.write(content);
                                        await Sharing.shareAsync(file.uri, { mimeType: 'text/plain', dialogTitle: 'Save Notes' });
                                    } catch (e) {
                                        console.error(e);
                                        Alert.alert('Error', 'Failed to export.');
                                    }
                                }
                            }}>
                                <Ionicons name="print-outline" size={24} color="#F59E0B" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView style={styles.detailBody}>
                        <View style={styles.detailTags}>
                            {showSummaryDetail.tags.map(tag => (
                                <Text key={tag.id} style={[styles.detailTag, { color: tag.color }]}>{tag.name}</Text>
                            ))}
                        </View>

                        <Text style={[styles.detailDate, { color: isDark ? 'rgba(255,255,255,0.35)' : '#94A3B8' }]}>
                            Generated on {new Date(showSummaryDetail.createdAt).toLocaleString()}
                        </Text>

                        <Text style={[styles.detailContent, { color: isDark ? 'rgba(255,255,255,0.80)' : '#334155' }]}>{showSummaryDetail.summary}</Text>

                        {showSummaryDetail.sources && showSummaryDetail.sources.length > 0 && (
                            <View style={[styles.detailSources, { borderTopColor: isDark ? 'rgba(255,255,255,0.10)' : '#E2E8F0' }]}>
                                <Text style={[styles.detailSourcesTitle, { color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B' }]}>Sources Used:</Text>
                                {showSummaryDetail.sources.map((source, i) => (
                                    <Text key={i} style={[styles.detailSource, { color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B' }]}>• {source.noteTitle}</Text>
                                ))}
                            </View>
                        )}
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        );
    };

    // ========== MAIN RENDER ==========
    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: isDark ? '#07091A' : '#FFFFFF' }}>
                <LinearGradient colors={isDark ? ['#07091A', '#0A2A1A', '#080E28'] : ['#FFFFFF', '#FFFFFF', '#FFFFFF']} style={StyleSheet.absoluteFillObject} />
                <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#10B981" />
                        <Text style={[styles.loadingText, { color: isDark ? 'rgba(255,255,255,0.55)' : '#3D565E' }]}>Loading...</Text>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#07091A' : '#FFFFFF' }}>
            <LinearGradient colors={isDark ? ['#07091A', '#0A2A1A', '#080E28'] : ['#FFFFFF', '#FFFFFF', '#FFFFFF']} style={StyleSheet.absoluteFillObject} />
            {isDark && (
            <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
                <LinearGradient
                    colors={['rgba(16,185,129,0.22)', 'transparent']}
                    style={{ position: 'absolute', width: 340, height: 340, borderRadius: 170, top: -80, right: -80 }}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                />
                <LinearGradient
                    colors={['rgba(4,120,87,0.14)', 'transparent']}
                    style={{ position: 'absolute', width: 220, height: 220, borderRadius: 110, bottom: 120, left: -60 }}
                    start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }}
                />
            </View>
            )}

        <SafeAreaView style={styles.container}>
            {/* Header */}
            <LinearGradient
                colors={['#10B981', '#059669', '#047857']}
                start={{ x: 0, y: 0 }} end={{ x: 1.2, y: 1 }}
                style={styles.header}
            >
                {/* Shimmer top line */}
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, backgroundColor: 'rgba(255,255,255,0.28)' }} />
                {/* Decorative circle */}
                <View style={{ position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.06)', top: -50, right: -40 }} />

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.30)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}
                    >
                        <Ionicons name="arrow-back" size={20} color="#FFF" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerTitle}>AI Notes Maker</Text>
                        <Text style={styles.headerSubtitle}>Organize & Summarize by Hashtags</Text>
                    </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <TouchableOpacity
                        onPress={() => setShowNotifications(true)}
                        style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', justifyContent: 'center', alignItems: 'center', position: 'relative' }}
                    >
                        <Ionicons
                            name={newsMatches.length > 0 ? "notifications" : "notifications-outline"}
                            size={20}
                            color="#FFF"
                        />
                        {newsMatches.length > 0 && (
                            <View style={{
                                position: 'absolute',
                                top: -4,
                                right: -4,
                                backgroundColor: '#EF4444',
                                borderRadius: 8,
                                minWidth: 16,
                                height: 16,
                                justifyContent: 'center',
                                alignItems: 'center',
                                paddingHorizontal: 3,
                                borderWidth: 1.5,
                                borderColor: '#FFF'
                            }}>
                                <Text style={{ color: '#FFF', fontSize: 8, fontWeight: '700' }}>
                                    {newsMatches.length}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={loadData} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name="refresh" size={20} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* DAP Onboarding Overlay */}
            {showOnboarding && (
                <View style={styles.onboardingOverlay} pointerEvents="box-none">
                    <Animated.View style={[
                        styles.onboardingCard,
                        {
                            opacity: onboardingFade,
                            transform: [{ translateY: onboardingTranslate }],
                            backgroundColor: theme.colors.surface || '#FFF'
                        }
                    ]}>
                        <LinearGradient
                            colors={['#3B82F6', '#2563EB']}
                            style={styles.onboardingHeaderStrip}
                        />
                        <View style={styles.onboardingContent}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                <Text style={[styles.onboardingTitle, { color: theme.colors.text || '#0F172A', flex: 1 }]}>
                                    {onboardingSteps[onboardingStep].title}
                                </Text>
                                <TouchableOpacity onPress={skipOnboarding} style={{ padding: 4 }}>
                                    <Ionicons name="close" size={24} color="#94A3B8" />
                                </TouchableOpacity>
                            </View>
                            <Text style={[styles.onboardingText, { color: theme.colors.textSecondary || '#64748B' }]}>
                                {onboardingSteps[onboardingStep].text}
                            </Text>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <TouchableOpacity
                                    style={styles.onboardingButton}
                                    onPress={nextOnboardingStep}
                                >
                                    <Text style={styles.onboardingButtonText}>
                                        {onboardingSteps[onboardingStep].buttonText}
                                    </Text>
                                    <Ionicons name="arrow-forward" size={16} color="#FFF" />
                                </TouchableOpacity>

                                <Text style={{ fontSize: 13, color: '#94A3B8', fontWeight: '700' }}>
                                    {onboardingStep + 1} / {onboardingSteps.length}
                                </Text>
                            </View>
                        </View>

                        {/* Pulse indicator */}
                        <View style={styles.pulseContainer}>
                            <View style={styles.pulseDot} />
                            <View style={styles.pulseRing} />
                        </View>
                    </Animated.View>
                </View>
            )}

            {/* AI Disclaimers & Storage Notice — moved inside each tab's ScrollView */}

            {/* Notifications Modal - Redesigned with "Update Needed" messaging */}
            <Modal
                visible={showNotifications}
                transparent={true}
                animationType="slide"
                onRequestClose={() => { setShowNotifications(false); setNotificationFilterTag(null); }}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    justifyContent: 'flex-end',
                }}>
                    <View style={{
                        backgroundColor: isDark ? '#0F1335' : '#FFFFFF',
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        padding: 20,
                        maxHeight: '85%',
                        borderTopWidth: 1,
                        borderLeftWidth: 1,
                        borderRightWidth: 1,
                        borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#E4E6F0',
                    }}>
                        {/* Pull handle */}
                        <View style={{ width: 38, height: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginBottom: 12 }} />
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 8,
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Ionicons name="alert-circle" size={22} color="#F97316" />
                                <Text style={{ fontSize: 20, fontWeight: '700', color: isDark ? '#F0F0FF' : '#1F2937' }}>
                                    {notificationFilterTag ? `Updates: "${notificationFilterTag}"` : 'Knowledge Radar'}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => { setShowNotifications(false); setNotificationFilterTag(null); }}>
                                <Ionicons name="close" size={24} color={isDark ? 'rgba(255,255,255,0.55)' : '#1F2937'} />
                            </TouchableOpacity>
                        </View>
                        <Text style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.50)' : '#6B7280', marginBottom: 16 }}>
                            Your notes need updating based on new information
                        </Text>

                        {/* Tag filter chips inside modal */}
                        {!notificationFilterTag && Object.keys(matchesByTag).length > 1 && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                                <TouchableOpacity
                                    style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: !notificationFilterTag ? '#F97316' : (isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6'), marginRight: 8 }}
                                    onPress={() => setNotificationFilterTag(null)}
                                >
                                    <Text style={{ color: !notificationFilterTag ? '#FFF' : (isDark ? 'rgba(255,255,255,0.55)' : '#6B7280'), fontSize: 12, fontWeight: '600' }}>All</Text>
                                </TouchableOpacity>
                                {Object.keys(matchesByTag).map(tag => (
                                    <TouchableOpacity
                                        key={tag}
                                        style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6', marginRight: 8 }}
                                        onPress={() => setNotificationFilterTag(tag)}
                                    >
                                        <Text style={{ color: isDark ? 'rgba(255,255,255,0.65)' : '#374151', fontSize: 12, fontWeight: '500' }}>{tag}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}

                        {(() => {
                            const filteredMatches = notificationFilterTag
                                ? newsMatches.filter(m => m.matchedTag === notificationFilterTag)
                                : newsMatches;

                            return filteredMatches.length > 0 || pdfCrossRefs.length > 0 ? (
                                <FlatList
                                    data={[
                                        ...filteredMatches.map(m => ({ type: 'news' as const, data: m })),
                                        ...(notificationFilterTag ? [] : pdfCrossRefs.map(p => ({ type: 'pdf' as const, data: p }))),
                                    ]}
                                    keyExtractor={(item, idx) => item.type === 'news' ? `news-${(item.data as MatchedArticle).articleId}` : `pdf-${idx}`}
                                    renderItem={({ item }) => {
                                        if (item.type === 'news') {
                                            const match = item.data as MatchedArticle;
                                            return (
                                                <TouchableOpacity
                                                    style={{
                                                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F9FAFB',
                                                        padding: 14,
                                                        borderRadius: 14,
                                                        marginBottom: 10,
                                                        borderWidth: 1,
                                                        borderColor: isDark ? 'rgba(255,255,255,0.10)' : '#F3F4F6',
                                                        borderLeftWidth: 3,
                                                        borderLeftColor: '#F97316',
                                                    }}
                                                    onPress={() => {
                                                        setShowNotifications(false);
                                                        setNotificationFilterTag(null);
                                                        navigation.navigate('ArticleDetailScreen', { articleId: match.articleId });
                                                    }}
                                                >
                                                    {/* Header */}
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 }}>
                                                        <Ionicons name="alert-circle" size={16} color="#F97316" />
                                                        <Text style={{ fontSize: 12, color: '#F97316', fontWeight: '700' }}>Update Needed</Text>
                                                        {match.articlePublishedDate && (
                                                            <Text style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.40)' : '#9CA3AF', marginLeft: 'auto' }}>
                                                                {new Date(match.articlePublishedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                            </Text>
                                                        )}
                                                    </View>
                                                    {/* Article title */}
                                                    <Text style={{ fontSize: 15, fontWeight: '600', color: isDark ? '#F0F0FF' : '#1F2937', marginBottom: 6, lineHeight: 21 }} numberOfLines={2}>
                                                        {match.articleTitle}
                                                    </Text>
                                                    {/* Match reason */}
                                                    <Text style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.55)' : '#6B7280', marginBottom: 6, lineHeight: 17 }} numberOfLines={2}>
                                                        {match.matchReason}
                                                    </Text>
                                                    {/* Tag & date footer */}
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: (match.tagColor || '#3B82F6') + '15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                                                            <Ionicons name="pricetag" size={10} color={match.tagColor || '#3B82F6'} />
                                                            <Text style={{ fontSize: 11, color: match.tagColor || '#3B82F6', fontWeight: '600' }}>{match.matchedTag}</Text>
                                                        </View>
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        } else {
                                            const ref = item.data as PDFCrossRef;
                                            return (
                                                <View
                                                    style={{
                                                        backgroundColor: isDark ? 'rgba(42,125,235,0.10)' : '#EFF6FF',
                                                        padding: 14,
                                                        borderRadius: 14,
                                                        marginBottom: 10,
                                                        borderWidth: 1,
                                                        borderColor: isDark ? 'rgba(42,125,235,0.20)' : '#DBEAFE',
                                                        borderLeftWidth: 3,
                                                        borderLeftColor: '#2A7DEB',
                                                    }}
                                                >
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 }}>
                                                        <Ionicons name="document-text" size={16} color="#2A7DEB" />
                                                        <Text style={{ fontSize: 12, color: '#2A7DEB', fontWeight: '700' }}>New Points Available</Text>
                                                    </View>
                                                    <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#F0F0FF' : '#1F2937', marginBottom: 4 }} numberOfLines={2}>
                                                        {ref.instituteNoteTitle}
                                                    </Text>
                                                    <Text style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.55)' : '#6B7280' }}>
                                                        {ref.reason}
                                                    </Text>
                                                </View>
                                            );
                                        }
                                    }}
                                    contentContainerStyle={{ paddingBottom: 20 }}
                                />
                            ) : (
                                <View style={{ alignItems: 'center', padding: 40 }}>
                                    <Ionicons name="checkmark-circle-outline" size={64} color="#10B981" />
                                    <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#F0F0FF' : '#1F2937', marginTop: 12 }}>All Caught Up!</Text>
                                    <Text style={{ fontSize: 14, color: isDark ? 'rgba(255,255,255,0.55)' : '#6B7280', textAlign: 'center', marginTop: 8 }}>
                                        No new matches found between your notes and recent news.
                                    </Text>
                                </View>
                            );
                        })()}
                    </View>
                </View>
            </Modal>

            {/* Tab Bar — stays fixed for navigation */}
            <View style={[styles.tabBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderBottomColor: isDark ? 'rgba(255,255,255,0.10)' : '#E2E8F0' }]}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'topics' && styles.activeTab]}
                    onPress={() => setActiveTab('topics')}
                >
                    <Ionicons name="pricetags" size={20} color={activeTab === 'topics' ? '#FFF' : (isDark ? 'rgba(255,255,255,0.45)' : '#64748B')} />
                    <Text style={[styles.tabText, { color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B' }, activeTab === 'topics' && styles.activeTabText]}>Topics</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'notes' && styles.activeTab]}
                    onPress={() => setActiveTab('notes')}
                >
                    <Ionicons name="documents" size={20} color={activeTab === 'notes' ? '#FFF' : (isDark ? 'rgba(255,255,255,0.45)' : '#64748B')} />
                    <Text style={[styles.tabText, { color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B' }, activeTab === 'notes' && styles.activeTabText]}>Notes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'summaries' && styles.activeTab]}
                    onPress={() => setActiveTab('summaries')}
                >
                    <Ionicons name="sparkles" size={20} color={activeTab === 'summaries' ? '#FFF' : (isDark ? 'rgba(255,255,255,0.45)' : '#64748B')} />
                    <Text style={[styles.tabText, { color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B' }, activeTab === 'summaries' && styles.activeTabText]}>Summaries</Text>
                </TouchableOpacity>
            </View>

            {/* Tab Content */}
            {activeTab === 'topics' && renderTopicsTab()}
            {activeTab === 'notes' && renderNotesTab()}
            {activeTab === 'summaries' && renderSummariesTab()}

            {/* Modals */}
            {renderCreateTagModal()}
            {renderNoteEditorModal()}
            {renderSummaryModal()}
            {renderSummaryDetailModal()}
            {/* AI Insight Support Modal */}
            <InsightSupportModal
                visible={showInsightSupport}
                onClose={() => setShowInsightSupport(false)}
                onCheckCredits={checkCreditBalance}
            />

            {/* Paywall Popup */}
            <PayWallPopup
                visible={showPaywall}
                onClose={() => setShowPaywall(false)}
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
                    {(aiInsightStatus === 'updates' || newsMatches.length > 0) && <View style={styles.aiBadge} />}
                </LinearGradient>
            </TouchableOpacity>

        </SafeAreaView>
        </View>
    );
};

// ========== STYLES ==========
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
    },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 18,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        overflow: 'hidden',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: -0.4,
    },
    headerSubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.65)',
        marginTop: 2,
    },
    refreshBtn: {
        padding: 8,
    },

    // Stats Bar
    statsBar: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: 12,
        marginTop: 2,
    },

    // Tab Bar
    tabBar: {
        flexDirection: 'row',
        paddingHorizontal: 16,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 6,
    },
    activeTab: {
        borderBottomWidth: 0,
        backgroundColor: '#3B82F6',
        borderRadius: 20,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '500',
    },
    activeTabText: {
        color: '#FFF',
        fontWeight: '600',
    },

    // Tab Content
    tabContent: {
        flex: 1,
        padding: 16,
    },

    // Alerts
    alertsSection: {
        backgroundColor: '#FEF3C7',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    alertsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    alertsTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    alertsSubtext: {
        fontSize: 13,
        marginTop: 4,
    },


    // Create Tag Button
    createTagBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 0,
    },
    createTagBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#3B82F6',
    },

    // Tags Grid
    tagsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 10,
    },
    tagCard: {
        width: '48.5%',
        borderRadius: 24, // Pill-shaped geometry
        borderWidth: 1,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 20,
        elevation: 4,
        overflow: 'hidden',
        flexDirection: 'row',
        position: 'relative',
    },
    mirrorIcon: {
        position: 'absolute',
        right: -20,
        bottom: -20,
        transform: [{ rotate: '-15deg' }],
        opacity: 0.04,
    },
    tagCardAccent: {
        width: 3,
        height: '100%',
    },
    tagCardContent: {
        flex: 1,
        padding: 12,
    },
    tagIconWrapper: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tagCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    alertBadge: {
        backgroundColor: '#EF4444',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 3,
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0,
        shadowRadius: 4,
        elevation: 0,
    },
    alertBadgeText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '800',
    },
    tagName: {
        fontSize: 16,
        fontWeight: '800',
        marginTop: 4,
    },
    tagNoteCountContainer: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        marginTop: 6,
    },
    tagNoteCount: {
        fontSize: 11,
        fontWeight: '700',
    },
    sourceBreakdown: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0, 0, 0, 0.05)',
    },
    sourceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 0,
    },
    sourceBadgeText: {
        fontSize: 10,
        fontWeight: '600',
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingVertical: 48,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
    },
    emptyStateText: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 32,
    },

    // Active Filter
    activeFilter: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
        padding: 12,
        borderRadius: 8,
    },
    activeFilterLabel: {
        fontSize: 13,
    },
    filterTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 16,
    },
    filterTagText: {
        fontSize: 13,
        fontWeight: '500',
    },
    clearFilterText: {
        fontSize: 13,
        color: '#D97706',
        fontWeight: '500',
    },

    // Add Note Button
    addNoteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#3B82F6',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    addNoteBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },

    // Source Filter
    sourceFilter: {
        marginBottom: 16,
    },
    sourceFilterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 0,
        marginRight: 8,
    },
    sourceFilterText: {
        fontSize: 13,
        fontWeight: '500',
    },

    // Note Card
    // Premium Note Card Styles
    premiumNoteCard: {
        borderRadius: 20,
        marginBottom: 16,
        borderWidth: 1,
        overflow: 'hidden',
        // Desktop glass effect
        ...(Platform.OS === 'web' ? {
            transition: 'all 0.3s ease',
            cursor: 'pointer',
        } : {}),
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 6,
    },
    noteCardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
    },
    sourceBadgeTiny: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    sourceBadgeTinyText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    noteCardDate: {
        fontSize: 11,
        fontWeight: '500',
    },
    noteCardMainContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    noteCardHeaderFixed: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    premiumNoteTitle: {
        flex: 1,
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    deleteNoteBtnSmall: {
        padding: 4,
        marginLeft: 8,
    },
    premiumNotePreview: {
        fontSize: 14,
        lineHeight: 22,
        marginBottom: 12,
    },
    premiumSummaryPreview: {
        flexDirection: 'row',
        gap: 10,
        backgroundColor: '#F5F1EB',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EDE9FE',
        marginBottom: 12,
    },
    premiumSummaryText: {
        flex: 1,
        fontSize: 13,
        color: '#1A5DB8',
        lineHeight: 18,
        fontWeight: '500',
    },
    noteCardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    noteCardTagsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 6,
    },
    tinyTag: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        borderWidth: 0,
    },
    tinyTagText: {
        fontSize: 11,
        fontWeight: '600',
    },
    moreTagsTextSmall: {
        fontSize: 11,
        fontWeight: '500',
    },

    // Generate Button
    generateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#2A7DEB',
        padding: 20,
        borderRadius: 16,
        marginBottom: 24,
    },
    generateBtnText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFF',
    },
    generateBtnSubtext: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
    },

    // Section Title
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 14,
        letterSpacing: 0.2,
    },

    // Summary Card
    summaryCard: {
        padding: 0,
        borderRadius: 16,
        marginBottom: 14,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        overflow: 'hidden',
    },
    summaryCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: 14,
        paddingBottom: 8,
        borderBottomWidth: 0,
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: '700',
        flex: 1,
        letterSpacing: 0.2,
    },
    summaryDate: {
        fontSize: 11,
        fontWeight: '500',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    summaryTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        paddingHorizontal: 14,
        paddingBottom: 10,
    },
    summaryTag: {
        fontSize: 12,
        fontWeight: '600',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    summaryPreview: {
        fontSize: 13,
        lineHeight: 20,
        paddingHorizontal: 14,
        paddingBottom: 14,
    },
    summaryActions: {
        flexDirection: 'row',
        gap: 0,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0, 0, 0, 0.03)',
        paddingTop: 0,
    },
    summaryAction: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        borderRightWidth: 1,
        borderRightColor: 'rgba(0, 0, 0, 0.05)',
    },
    summaryActionText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#3B82F6',
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        borderRadius: 16,
        padding: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 20,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 20,
    },
    modalCancelBtn: {
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    modalCancelText: {
        fontSize: 15,
        fontWeight: '500',
    },
    modalConfirmBtn: {
        backgroundColor: '#3B82F6',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    modalConfirmText: {
        fontSize: 15,
        color: '#FFF',
        fontWeight: '600',
    },

    // Input
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        borderRadius: 10,
        padding: 14,
        fontSize: 15,
        borderWidth: 1,
    },

    // Color Picker
    colorPicker: {
        flexDirection: 'row',
        gap: 12,
    },
    colorOption: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    colorOptionSelected: {
        borderWidth: 3,
        borderColor: '#0F172A',
    },

    // Editor
    editorContainer: {
        flex: 1,
    },
    editorHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    editorTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    saveBtn: {
        fontSize: 16,
        fontWeight: '600',
        color: '#3B82F6',
    },
    editorBody: {
        flex: 1,
        padding: 16,
    },

    // Source Type Selector
    sourceTypeSelector: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    sourceTypeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
    },
    sourceTypeBtnText: {
        fontSize: 14,
        fontWeight: '500',
    },

    // Tag Selector
    tagSelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tagSelectorItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    tagSelectorText: {
        fontSize: 14,
        fontWeight: '500',
    },

    // Content Input
    contentInput: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 16,
        fontSize: 15,
        color: '#0F172A',
        minHeight: 250,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        lineHeight: 22,
    },

    // AI Summarization Styles
    aiSummarizationSection: {
        marginTop: 20,
        padding: 16,
        backgroundColor: '#F3E8FF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#D8B4FE',
    },
    aiSummarizationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    aiSummarizationTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#4AB09D',
    },
    summarizeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#2A7DEB',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    summarizeBtnText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '600',
    },
    summaryPlaceholder: {
        padding: 12,
        backgroundColor: 'rgba(255,255,255,0.5)',
        borderRadius: 8,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#D8B4FE',
    },
    summaryPlaceholderText: {
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    summaryResultBox: {
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
    },
    summaryResultTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1A5DB8',
        marginBottom: 6,
    },
    summaryResultText: {
        fontSize: 14,
        lineHeight: 20,
    },
    clearSummaryBtn: {
        marginTop: 10,
        alignSelf: 'flex-end',
    },
    clearSummaryBtnText: {
        fontSize: 12,
        color: '#D97706',
        fontWeight: '600',
    },

    // Premium Editor Styles
    editorSectionCard: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        marginHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        borderWidth: 1,
    },
    sectionSubGroup: {
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
    },
    premiumTitleInput: {
        fontSize: 20,
        fontWeight: '700',
        paddingVertical: 8,
        borderBottomWidth: 1,
    },
    sourceUrlInput: {
        marginTop: 12,
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        borderWidth: 1,
    },
    divider: {
        height: 1,
        marginBottom: 20,
    },
    addTagSmallBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#3B82F6',
        backgroundColor: '#F0F7FF',
    },
    addTagSmallText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#3B82F6',
    },
    premiumContentInput: {
        borderRadius: 12,
        padding: 16,
        fontSize: 15,
        minHeight: 300,
        borderWidth: 1,
        lineHeight: 24,
        // Web fix for paste and selection
        ...(Platform.OS === 'web' ? {
            outlineStyle: 'none',
            userSelect: 'text',
            cursor: 'text',
            WebkitUserSelect: 'text',
            MozUserSelect: 'text',
            msUserSelect: 'text',
        } : {}) as any,
    },
    aiSummarizationGroup: {
        marginTop: 10,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },

    // Detail View
    detailContainer: {
        flex: 1,
    },
    detailHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    detailTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '600',
        marginHorizontal: 16,
    },
    detailBody: {
        flex: 1,
        padding: 20,
    },
    detailTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 12,
    },
    detailTag: {
        fontSize: 15,
        fontWeight: '600',
    },
    detailDate: {
        fontSize: 13,
        marginBottom: 20,
    },
    detailContent: {
        fontSize: 16,
        lineHeight: 26,
    },
    detailSources: {
        marginTop: 32,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    detailSourcesTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
    },
    detailSource: {
        fontSize: 14,
        marginBottom: 4,
    },
    floatingAiButton: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
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
        backgroundColor: '#F59E0B',
        borderWidth: 1.5,
        borderColor: '#FFF',
    },

    // ONBOARDING STYLES
    onboardingOverlay: {
        position: 'absolute',
        bottom: 120,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingHorizontal: 20,
        zIndex: 99999,
    },
    onboardingCard: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.10,
        shadowRadius: 14,
        elevation: 6,
    },
    onboardingHeaderStrip: {
        height: 6,
        width: '100%',
    },
    onboardingContent: {
        padding: 24,
    },
    onboardingTitle: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 10,
        letterSpacing: -0.5,
    },
    onboardingText: {
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 20,
    },
    onboardingButton: {
        backgroundColor: '#3B82F6',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        alignSelf: 'flex-start',
    },
    onboardingButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 15,
    },
    pulseContainer: {
        position: 'absolute',
        top: 20,
        right: 20,
        width: 12,
        height: 12,
    },
    pulseDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#EF4444',
        position: 'absolute',
        zIndex: 2,
    },
    pulseRing: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#EF4444',
        position: 'absolute',
        zIndex: 1,
        transform: [{ scale: 2 }],
        opacity: 0.3,
    },
});

export default AINotesMakerScreen;
