import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Modal,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
    createNote,
    updateNote,
    getAllNotes,
    getAllTags,
    LocalTag,
    LocalNote,
    NoteBlock,
} from '../services/localNotesStorage';
import { TagPicker } from '../components/TagPicker';
import { summarizeNoteContent } from '../services/aiSummarizer';
import { smartScrape, isValidUrl, extractDomain } from '../services/webScraper';
import { TypeWriterText } from '../../../components/TypeWriterText';
import { useTheme } from '../../../features/Reference/theme/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import useCredits from '../../../hooks/useCredits';
import { syncNoteToFirebase } from '../../../services/firebaseNotesSync';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

const OCR_API_KEY = 'K85553321788957';
const OCR_API_URL = 'https://api.ocr.space/parse/image';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CreateNoteScreenProps {
    navigation: any;
    route: {
        params?: {
            noteId?: number;
            initialNote?: Partial<LocalNote>;
            autoOpenCamera?: boolean;
        };
    };
}

// Multi-source support
interface NoteSource {
    id: string;
    type: 'text' | 'pdf' | 'camera' | 'link';
    label: string;
    content: string;
    fileName?: string;
    fileUri?: string;
    url?: string;
}

const SOURCE_ADD_OPTIONS = [
    { key: 'text', label: 'Text', icon: 'create-outline', color: '#3B82F6' },
    { key: 'pdf', label: 'PDF', icon: 'document-text-outline', color: '#EF4444' },
    { key: 'camera', label: 'Camera', icon: 'camera-outline', color: '#F97316' },
    { key: 'link', label: 'Web', icon: 'link-outline', color: '#10B981' },
];

// Source type options for note category
const SOURCE_TYPES = [
    { key: 'manual', label: 'My Note', icon: 'create-outline', color: '#2A7DEB' },
    { key: 'ncert', label: 'NCERT', icon: 'book-outline', color: '#10B981' },
    { key: 'book', label: 'Standard Book', icon: 'library-outline', color: '#2A7DEB' },
    { key: 'current_affairs', label: 'Current Affairs', icon: 'newspaper-outline', color: '#F59E0B' },
    { key: 'report', label: 'Report', icon: 'document-text-outline', color: '#EF4444' },
];

let sourceCounter = Date.now();
const generateSourceId = () => String(++sourceCounter);

export const CreateNoteScreen: React.FC<CreateNoteScreenProps> = ({ navigation, route }) => {
    const initialNote = route.params?.initialNote;
    const { theme, isDark } = useTheme();
    const { user } = useAuth();
    const { isFreePlan } = useCredits();

    const FREE_NOTE_LIMIT = 3;

    // State
    const [title, setTitle] = useState(initialNote?.title || '');
    const [selectedTags, setSelectedTags] = useState<LocalTag[]>(initialNote?.tags || []);
    const [sourceType, setSourceType] = useState<LocalNote['sourceType']>(initialNote?.sourceType || 'manual');
    const [showSourcePicker, setShowSourcePicker] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Multi-source state
    const [noteSources, setNoteSources] = useState<NoteSource[]>(() => {
        // Pre-populate from initialNote if editing
        if (initialNote?.content) {
            return [{
                id: generateSourceId(),
                type: 'text',
                label: 'Note Content',
                content: initialNote.content,
            }];
        }
        return [];
    });
    const [processingPdfIds, setProcessingPdfIds] = useState<Set<string>>(new Set());
    const [scrapingSourceId, setScrapingSourceId] = useState<string | null>(null);
    const [showSourceLinkInput, setShowSourceLinkInput] = useState(false);
    const [sourceLinkUrl, setSourceLinkUrl] = useState('');
    const [cameraSourcePickerVisible, setCameraSourcePickerVisible] = useState(false);
    const [processingCameraIds, setProcessingCameraIds] = useState<Set<string>>(new Set());

    // AI Summarization state
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [generatedSummary, setGeneratedSummary] = useState('');

    // Auto-open camera if navigated with autoOpenCamera param
    useEffect(() => {
        if (route.params?.autoOpenCamera) {
            setTimeout(() => setCameraSourcePickerVisible(true), 500);
        }
    }, []);

    // ── Source Handlers ─────────────────────────────────────────────────────

    const handleAddTextSource = useCallback(() => {
        const newSource: NoteSource = {
            id: generateSourceId(),
            type: 'text',
            label: 'Text Note',
            content: '',
        };
        setNoteSources(prev => [...prev, newSource]);
    }, []);

    const handleAddPdfSource = useCallback(async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });

            if (result.canceled || !result.assets?.[0]) return;

            const asset = result.assets[0];
            const sourceId = generateSourceId();
            const newSource: NoteSource = {
                id: sourceId,
                type: 'pdf',
                label: asset.name || 'document.pdf',
                content: '',
                fileName: asset.name || 'document.pdf',
                fileUri: asset.uri,
            };
            setNoteSources(prev => [...prev, newSource]);

            // OCR the PDF in background
            setProcessingPdfIds(prev => new Set(prev).add(sourceId));
            try {
                const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
                const sizeInKB = (base64.length * 3) / 4 / 1024;
                if (sizeInKB > 1024) {
                    Alert.alert('PDF Too Large', 'PDF exceeds 1MB limit for OCR. The file has been attached but text could not be extracted.');
                    setProcessingPdfIds(prev => { const s = new Set(prev); s.delete(sourceId); return s; });
                    return;
                }

                const formData = new FormData();
                formData.append('base64Image', `data:application/pdf;base64,${base64}`);
                formData.append('apikey', OCR_API_KEY);
                formData.append('language', 'eng');
                formData.append('isOverlayRequired', 'false');
                formData.append('detectOrientation', 'true');
                formData.append('scale', 'true');
                formData.append('OCREngine', '2');
                formData.append('filetype', 'PDF');

                const response = await fetch(OCR_API_URL, {
                    method: 'POST',
                    body: formData,
                    headers: { 'Accept': 'application/json' },
                });
                const ocrResult = await response.json();

                if (ocrResult.OCRExitCode === 1 && ocrResult.ParsedResults?.length > 0) {
                    const fullText = ocrResult.ParsedResults
                        .map((page: any) => page.ParsedText || '')
                        .join('\n\n')
                        .trim();

                    setNoteSources(prev => prev.map(s =>
                        s.id === sourceId ? { ...s, content: fullText || '(No text extracted)' } : s
                    ));
                } else {
                    setNoteSources(prev => prev.map(s =>
                        s.id === sourceId ? { ...s, content: '(OCR failed — PDF attached without text)' } : s
                    ));
                }
            } catch (err) {
                console.error('PDF OCR error:', err);
                setNoteSources(prev => prev.map(s =>
                    s.id === sourceId ? { ...s, content: '(OCR error — PDF attached without text)' } : s
                ));
            } finally {
                setProcessingPdfIds(prev => { const s = new Set(prev); s.delete(sourceId); return s; });
            }
        } catch (error) {
            console.error('PDF picker error:', error);
            Alert.alert('Error', 'Failed to pick PDF document.');
        }
    }, []);

    const pickCameraForSource = useCallback(async (fromCamera: boolean) => {
        setCameraSourcePickerVisible(false);

        if (fromCamera) {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Camera access is needed to take photos.');
                return;
            }
        } else {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Gallery access is needed to pick photos.');
                return;
            }
        }

        const result = fromCamera
            ? await ImagePicker.launchCameraAsync({
                quality: 0.3,
                allowsEditing: true,
                aspect: [4, 3],
                presentationStyle: 'fullScreen' as any,
            })
            : await ImagePicker.launchImageLibraryAsync({
                quality: 0.3,
                allowsEditing: true,
                aspect: [4, 3],
                presentationStyle: 'fullScreen' as any,
            });

        if (result.canceled || !result.assets[0]) return;

        const imageUri = result.assets[0].uri;
        const sourceId = generateSourceId();
        const newSource: NoteSource = {
            id: sourceId,
            type: 'camera',
            label: fromCamera ? 'Camera Scan' : 'Gallery Image',
            content: '',
            fileUri: imageUri,
        };
        setNoteSources(prev => [...prev, newSource]);

        // OCR the image
        setProcessingCameraIds(prev => new Set(prev).add(sourceId));
        try {
            const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' });
            const sizeInKB = (base64.length * 3) / 4 / 1024;
            if (sizeInKB > 1024) {
                Alert.alert('Image Too Large', 'Image exceeds 1MB. Please crop smaller or take a closer photo.');
                setProcessingCameraIds(prev => { const s = new Set(prev); s.delete(sourceId); return s; });
                return;
            }

            const formData = new FormData();
            formData.append('base64Image', `data:image/jpeg;base64,${base64}`);
            formData.append('apikey', OCR_API_KEY);
            formData.append('language', 'eng');
            formData.append('isOverlayRequired', 'false');
            formData.append('detectOrientation', 'true');
            formData.append('scale', 'true');
            formData.append('OCREngine', '2');

            const response = await fetch(OCR_API_URL, {
                method: 'POST',
                body: formData,
                headers: { 'Accept': 'application/json' },
            });
            const ocrResult = await response.json();

            if (ocrResult.OCRExitCode === 1 && ocrResult.ParsedResults?.length > 0) {
                const fullText = ocrResult.ParsedResults
                    .map((page: any) => page.ParsedText || '')
                    .join('\n\n')
                    .trim();

                setNoteSources(prev => prev.map(s =>
                    s.id === sourceId ? { ...s, content: fullText || '(No text extracted from image)' } : s
                ));
                if (fullText) {
                    Alert.alert('Text Extracted', `${fullText.split('\n').filter((l: string) => l.trim()).length} lines extracted.`);
                }
            } else {
                const rawError = ocrResult.ErrorMessage || ocrResult.ParsedResults?.[0]?.ErrorMessage;
                const errorMsg = Array.isArray(rawError) ? rawError.join(', ') : (typeof rawError === 'string' ? rawError : 'OCR could not process the image');
                Alert.alert('OCR Failed', errorMsg);
                setNoteSources(prev => prev.map(s =>
                    s.id === sourceId ? { ...s, content: '(OCR failed)' } : s
                ));
            }
        } catch (err) {
            console.error('Camera OCR error:', err);
            setNoteSources(prev => prev.map(s =>
                s.id === sourceId ? { ...s, content: '(OCR error)' } : s
            ));
        } finally {
            setProcessingCameraIds(prev => { const s = new Set(prev); s.delete(sourceId); return s; });
        }
    }, []);

    const handleAddCameraSource = useCallback(() => {
        setCameraSourcePickerVisible(true);
    }, []);

    const handleAddLinkSource = useCallback(async () => {
        if (!sourceLinkUrl.trim()) {
            Alert.alert('Error', 'Please enter a URL');
            return;
        }
        if (!isValidUrl(sourceLinkUrl)) {
            Alert.alert('Invalid URL', 'Please enter a valid URL starting with http:// or https://');
            return;
        }

        const sourceId = generateSourceId();
        const domain = extractDomain(sourceLinkUrl);
        const newSource: NoteSource = {
            id: sourceId,
            type: 'link',
            label: domain,
            content: '',
            url: sourceLinkUrl.trim(),
        };
        setNoteSources(prev => [...prev, newSource]);
        setShowSourceLinkInput(false);
        setScrapingSourceId(sourceId);

        try {
            const result = await smartScrape(sourceLinkUrl.trim());

            if (result.error || result.contentBlocks.length === 0) {
                Alert.alert('Scraping Failed', result.error || 'Could not extract content from this URL.');
                setNoteSources(prev => prev.map(s =>
                    s.id === sourceId ? { ...s, content: '(Could not extract content)' } : s
                ));
            } else {
                // Set title if empty
                if (!title.trim() && result.title) {
                    setTitle(result.title);
                }

                // Aggregate all scraped text
                const textParts: string[] = [];
                for (const block of result.contentBlocks) {
                    if (block.type === 'heading' && block.content) {
                        textParts.push(block.content);
                    } else if (block.type === 'paragraph' && block.content) {
                        textParts.push(block.content);
                    } else if ((block.type === 'bullet' || block.type === 'numbered') && block.items) {
                        for (const item of block.items) {
                            textParts.push(`- ${item}`);
                        }
                    } else if (block.type === 'quote' && block.content) {
                        textParts.push(`> ${block.content}`);
                    }
                }

                const scrapedContent = textParts.join('\n\n');
                setNoteSources(prev => prev.map(s =>
                    s.id === sourceId ? { ...s, content: scrapedContent, label: result.title || domain } : s
                ));

                Alert.alert('Content Extracted', `${result.contentBlocks.length} blocks from ${domain}`);
            }
        } catch (error) {
            console.error('Scraping error:', error);
            Alert.alert('Error', 'Failed to scrape the article.');
            setNoteSources(prev => prev.map(s =>
                s.id === sourceId ? { ...s, content: '(Scrape error)' } : s
            ));
        } finally {
            setScrapingSourceId(null);
            setSourceLinkUrl('');
        }
    }, [sourceLinkUrl, title]);

    const handleRemoveSource = useCallback((sourceId: string) => {
        setNoteSources(prev => prev.filter(s => s.id !== sourceId));
    }, []);

    const handleSourceContentChange = useCallback((sourceId: string, newContent: string) => {
        setNoteSources(prev => prev.map(s =>
            s.id === sourceId ? { ...s, content: newContent } : s
        ));
    }, []);

    // ── AI Summarization ────────────────────────────────────────────────────

    const handleSummarize = async () => {
        const allContent = noteSources.map(s => s.content).filter(c => c.trim()).join('\n\n---\n\n');
        if (!allContent || allContent.trim().length === 0) {
            Alert.alert('No Content', 'Please add some sources with content to summarize.');
            return;
        }

        setIsSummarizing(true);
        try {
            const result = await summarizeNoteContent(allContent);
            if (result.error) {
                Alert.alert('AI Error', result.error);
            } else {
                setGeneratedSummary(result.summary);
                setShowSummaryModal(true);
            }
        } catch (error) {
            console.error('Summarize error:', error);
            Alert.alert('Error', 'Failed to generate summary.');
        } finally {
            setIsSummarizing(false);
        }
    };

    const applySummary = () => {
        if (!generatedSummary) return;
        const summarySource: NoteSource = {
            id: generateSourceId(),
            type: 'text',
            label: 'AI Summary',
            content: generatedSummary,
        };
        setNoteSources(prev => [summarySource, ...prev]);
        setShowSummaryModal(false);
        setGeneratedSummary('');
    };

    // ── Save ────────────────────────────────────────────────────────────────

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter a title');
            return;
        }

        setIsSaving(true);
        try {
            // Serialize all sources into content string
            const content = noteSources
                .map(s => s.content)
                .filter(c => c.trim())
                .join('\n\n');

            // Build blocks array for LocalNote compatibility
            const blocks: NoteBlock[] = [];
            for (const source of noteSources) {
                if (!source.content.trim()) continue;
                const lines = source.content.split('\n');
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed) {
                        blocks.push({
                            id: String(Date.now() + Math.random()),
                            type: 'paragraph',
                            content: trimmed,
                        });
                    }
                }
            }

            const noteData: Partial<LocalNote> = {
                title: title.trim(),
                content,
                blocks,
                tags: selectedTags,
                sourceType,
            };

            let savedNote: LocalNote | null = null;
            if (initialNote?.id) {
                savedNote = await updateNote(initialNote.id, noteData);
            } else {
                // Check note limit for free users
                if (isFreePlan) {
                    const existingNotes = await getAllNotes();
                    if (existingNotes.length >= FREE_NOTE_LIMIT) {
                        Alert.alert(
                            'Note Limit Reached',
                            `Free users can create up to ${FREE_NOTE_LIMIT} notes.\n\nGet the Cloud Storage plan at just ₹199/month for unlimited notes, PDF storage & cloud sync.`,
                            [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Get Subscription', onPress: () => navigation.navigate('Billing') },
                            ]
                        );
                        setIsSaving(false);
                        return;
                    }
                }

                savedNote = await createNote(noteData);
            }

            if (savedNote && user?.id) {
                syncNoteToFirebase(user.id, savedNote);
            }

            Alert.alert('Success', 'Note saved!', [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        } catch (error) {
            console.error('Error saving note:', error);
            Alert.alert('Error', 'Failed to save note');
        } finally {
            setIsSaving(false);
        }
    };

    // ── Source type icon helper ──────────────────────────────────────────────

    const getSourceIcon = (type: NoteSource['type']): string => {
        switch (type) {
            case 'text': return 'create-outline';
            case 'pdf': return 'document-text-outline';
            case 'camera': return 'camera-outline';
            case 'link': return 'link-outline';
            default: return 'document-outline';
        }
    };

    const getSourceColor = (type: NoteSource['type']): string => {
        switch (type) {
            case 'text': return '#3B82F6';
            case 'pdf': return '#EF4444';
            case 'camera': return '#F97316';
            case 'link': return '#10B981';
            default: return '#6B7280';
        }
    };

    // ── Render Source Card ──────────────────────────────────────────────────

    const renderSourceCard = (source: NoteSource, index: number) => {
        const isProcessing = processingPdfIds.has(source.id) || processingCameraIds.has(source.id) || scrapingSourceId === source.id;
        const color = getSourceColor(source.type);

        return (
            <View
                key={source.id}
                style={[styles.sourceCard, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB',
                    borderColor: isDark ? 'rgba(255,255,255,0.10)' : '#E5E7EB',
                }]}
            >
                {/* Source header */}
                <View style={styles.sourceCardHeader}>
                    <View style={[styles.sourceTypeIcon, { backgroundColor: color + '20' }]}>
                        <Ionicons name={getSourceIcon(source.type) as any} size={16} color={color} />
                    </View>
                    <Text
                        style={[styles.sourceLabel, { color: isDark ? '#F0F0FF' : '#374151' }]}
                        numberOfLines={1}
                    >
                        {source.label}
                    </Text>
                    {isProcessing && <ActivityIndicator size="small" color={color} style={{ marginLeft: 8 }} />}
                    <TouchableOpacity
                        style={styles.removeSourceBtn}
                        onPress={() => handleRemoveSource(source.id)}
                    >
                        <Ionicons name="close-circle" size={20} color={isDark ? 'rgba(255,255,255,0.30)' : '#D1D5DB'} />
                    </TouchableOpacity>
                </View>

                {/* Source content */}
                {source.type === 'text' ? (
                    <TextInput
                        style={[styles.sourceTextInput, {
                            color: isDark ? '#E8E8FF' : '#1F2937',
                            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB',
                        }]}
                        value={source.content}
                        onChangeText={(text) => handleSourceContentChange(source.id, text)}
                        placeholder="Type or paste your notes here..."
                        placeholderTextColor={isDark ? 'rgba(255,255,255,0.25)' : '#9CA3AF'}
                        multiline
                        textAlignVertical="top"
                    />
                ) : isProcessing ? (
                    <View style={styles.processingContainer}>
                        <ActivityIndicator size="small" color={color} />
                        <Text style={[styles.processingText, { color: isDark ? 'rgba(255,255,255,0.50)' : '#6B7280' }]}>
                            {source.type === 'pdf' ? 'Extracting text from PDF...' :
                                source.type === 'camera' ? 'Extracting text from image...' :
                                    'Scraping web content...'}
                        </Text>
                    </View>
                ) : source.content ? (
                    <Text
                        style={[styles.sourceContentPreview, { color: isDark ? 'rgba(255,255,255,0.65)' : '#4B5563' }]}
                        numberOfLines={6}
                    >
                        {source.content}
                    </Text>
                ) : (
                    <Text style={[styles.sourceContentPreview, { color: isDark ? 'rgba(255,255,255,0.30)' : '#9CA3AF', fontStyle: 'italic' }]}>
                        No content extracted
                    </Text>
                )}

                {source.url && (
                    <View style={styles.sourceUrlRow}>
                        <Ionicons name="link-outline" size={12} color={isDark ? 'rgba(255,255,255,0.30)' : '#9CA3AF'} />
                        <Text
                            style={[styles.sourceUrlText, { color: isDark ? 'rgba(255,255,255,0.30)' : '#9CA3AF' }]}
                            numberOfLines={1}
                        >
                            {source.url}
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#07091A' : '#FFFFFF' }}>
            <LinearGradient
                colors={isDark ? ['#07091A', '#0F0A2E', '#080E28'] : ['#FFFFFF', '#FFFFFF', '#FFFFFF']}
                style={StyleSheet.absoluteFill}
            />
            {isDark && (
                <View pointerEvents="none" style={{ position: 'absolute', width: 260, height: 260, borderRadius: 130, top: -50, right: -60, overflow: 'hidden' }}>
                    <LinearGradient colors={['rgba(42,125,235,0.18)', 'transparent']} style={{ flex: 1 }} />
                </View>
            )}

            <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: 'transparent' }}>
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    {/* Header */}
                    <LinearGradient
                        colors={['#1A5DB8', '#3730A3', '#312E81']}
                        start={{ x: 0, y: 0 }} end={{ x: 1.2, y: 1 }}
                        style={styles.header}
                    >
                        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, backgroundColor: 'rgba(255,255,255,0.28)' }} />
                        <View style={{ position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.045)', top: -50, right: -30 }} />
                        <View style={{ position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.06)', bottom: 8, left: -15 }} />

                        <View style={styles.headerRow}>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn}>
                                <Ionicons name="close" size={20} color="#FFF" />
                            </TouchableOpacity>

                            <View style={styles.headerCenter}>
                                <TouchableOpacity
                                    style={styles.sourceTypeButton}
                                    onPress={() => setShowSourcePicker(!showSourcePicker)}
                                >
                                    {(() => {
                                        const source = SOURCE_TYPES.find(s => s.key === sourceType) || SOURCE_TYPES[0];
                                        return (
                                            <>
                                                <Ionicons name={source.icon as any} size={14} color="#FFF" />
                                                <Text style={styles.sourceTypeText}>{source.label}</Text>
                                                <Ionicons name="chevron-down" size={14} color="rgba(255,255,255,0.60)" />
                                            </>
                                        );
                                    })()}
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                onPress={handleSave}
                                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <ActivityIndicator size="small" color="#1A5DB8" />
                                ) : (
                                    <Text style={styles.saveButtonText}>Save</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>

                    {/* Source Type Picker dropdown */}
                    {showSourcePicker && (
                        <View style={[styles.sourcePicker, {
                            backgroundColor: isDark ? '#333333' : '#FFFFFF',
                            borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6',
                        }]}>
                            {SOURCE_TYPES.map(source => (
                                <TouchableOpacity
                                    key={source.key}
                                    style={[
                                        styles.sourceOption,
                                        sourceType === source.key && {
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6',
                                        },
                                    ]}
                                    onPress={() => {
                                        setSourceType(source.key as LocalNote['sourceType']);
                                        setShowSourcePicker(false);
                                    }}
                                >
                                    <Ionicons name={source.icon as any} size={18} color={source.color} />
                                    <Text style={[styles.sourceOptionText, { color: isDark ? '#F0F0FF' : '#374151' }]}>{source.label}</Text>
                                    {sourceType === source.key && (
                                        <Ionicons name="checkmark" size={18} color="#10B981" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    <ScrollView
                        style={styles.content}
                        contentContainerStyle={styles.contentContainer}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Title */}
                        <TextInput
                            style={[styles.titleInput, { color: isDark ? '#FFFFFF' : '#1F2937' }]}
                            value={title}
                            onChangeText={setTitle}
                            placeholder="Note title..."
                            placeholderTextColor={isDark ? 'rgba(255,255,255,0.30)' : '#9CA3AF'}
                            multiline
                        />

                        {/* Tags */}
                        <View style={styles.tagsSection}>
                            <TagPicker
                                selectedTags={selectedTags}
                                onTagsChange={setSelectedTags}
                                maxTags={5}
                                placeholder="Add tags (e.g. History, Polity)..."
                            />
                        </View>

                        {/* Add a Note - 2x2 Grid */}
                        <View style={[styles.addNoteGridContainer, { backgroundColor: isDark ? '#1A1D2E' : '#EDEFFA' }]}>
                            <View style={styles.addNoteGridHeader}>
                                <Text style={[styles.addNoteGridTitle, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>Add a Note</Text>
                                <TouchableOpacity onPress={() => navigation.goBack()}>
                                    <Ionicons name="close" size={22} color={isDark ? '#9CA3AF' : '#6B7280'} />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.addNoteGrid}>
                                <TouchableOpacity
                                    style={[styles.addNoteGridCard, { backgroundColor: isDark ? '#252840' : '#FFFFFF', borderColor: isDark ? '#374160' : '#D4D8F0' }]}
                                    onPress={handleAddPdfSource}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="document-text-outline" size={36} color={isDark ? '#818CF8' : '#4F46E5'} />
                                    <Text style={[styles.addNoteGridCardTitle, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>Upload PDF</Text>
                                    <Text style={[styles.addNoteGridCardDesc, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>Import from a PDF</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.addNoteGridCard, { backgroundColor: isDark ? '#252840' : '#FFFFFF', borderColor: isDark ? '#374160' : '#D4D8F0' }]}
                                    onPress={() => setShowSourceLinkInput(true)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="globe-outline" size={36} color={isDark ? '#818CF8' : '#4F46E5'} />
                                    <Text style={[styles.addNoteGridCardTitle, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>From Web</Text>
                                    <Text style={[styles.addNoteGridCardDesc, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>Extract notes from a URL</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.addNoteGridCard, { backgroundColor: isDark ? '#252840' : '#FFFFFF', borderColor: isDark ? '#374160' : '#D4D8F0' }]}
                                    onPress={handleAddTextSource}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="text-outline" size={36} color={isDark ? '#818CF8' : '#4F46E5'} />
                                    <Text style={[styles.addNoteGridCardTitle, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>Write Text</Text>
                                    <Text style={[styles.addNoteGridCardDesc, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>Compose a new note</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.addNoteGridCard, { backgroundColor: isDark ? '#252840' : '#FFFFFF', borderColor: isDark ? '#374160' : '#D4D8F0' }]}
                                    onPress={handleAddCameraSource}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="camera-outline" size={36} color={isDark ? '#818CF8' : '#4F46E5'} />
                                    <Text style={[styles.addNoteGridCardTitle, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>Camera Snap</Text>
                                    <Text style={[styles.addNoteGridCardDesc, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>Photograph existing notes</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Divider */}
                        <View style={[styles.sectionDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6' }]} />

                        {/* Sources List */}
                        {noteSources.length === 0 ? (
                            <View style={styles.emptySourcesContainer}>
                                <Ionicons name="documents-outline" size={48} color={isDark ? 'rgba(255,255,255,0.15)' : '#D1D5DB'} />
                                <Text style={[styles.emptySourcesText, { color: isDark ? 'rgba(255,255,255,0.30)' : '#9CA3AF' }]}>
                                    No sources added yet
                                </Text>
                                <Text style={[styles.emptySourcesHint, { color: isDark ? 'rgba(255,255,255,0.20)' : '#D1D5DB' }]}>
                                    Tap a source type above to add content
                                </Text>
                            </View>
                        ) : (
                            noteSources.map((source, index) => renderSourceCard(source, index))
                        )}

                        {/* AI Summarize Button */}
                        {noteSources.length > 0 && (
                            <>
                                <View style={[styles.sectionDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6' }]} />
                                <TouchableOpacity
                                    style={styles.aiButton}
                                    onPress={handleSummarize}
                                    disabled={isSummarizing}
                                >
                                    <LinearGradient
                                        colors={isSummarizing ? ['#6B7280', '#9CA3AF'] : ['#2A7DEB', '#4AB09D']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.aiButtonContent}
                                    >
                                        {isSummarizing ? (
                                            <>
                                                <ActivityIndicator size="small" color="#FFFFFF" />
                                                <Text style={styles.aiButtonText}>Generating Summary...</Text>
                                            </>
                                        ) : (
                                            <>
                                                <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                                                <Text style={styles.aiButtonText}>AI Summarize All Sources</Text>
                                            </>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </>
                        )}
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>

            {/* Web Link Input Modal */}
            <Modal
                visible={showSourceLinkInput}
                transparent
                animationType="slide"
                onRequestClose={() => setShowSourceLinkInput(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.linkModal, {
                        backgroundColor: isDark ? '#333333' : '#FFFFFF',
                        borderWidth: isDark ? 1 : 0,
                        borderColor: 'rgba(255,255,255,0.10)',
                    }]}>
                        <View style={{ width: 38, height: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginBottom: 14 }} />

                        <View style={styles.linkModalHeader}>
                            <Text style={[styles.linkModalTitle, { color: isDark ? '#F0F0FF' : '#1F2937' }]}>Import from Web</Text>
                            <TouchableOpacity
                                onPress={() => { setShowSourceLinkInput(false); setSourceLinkUrl(''); }}
                                style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : '#F3F4F6', justifyContent: 'center', alignItems: 'center' }}
                            >
                                <Ionicons name="close" size={18} color={isDark ? 'rgba(255,255,255,0.70)' : '#6B7280'} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.linkModalSubtitle, { color: isDark ? 'rgba(255,255,255,0.50)' : '#6B7280' }]}>
                            Paste a URL to extract article content
                        </Text>

                        <View style={[styles.urlInputContainer, {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6',
                            borderWidth: isDark ? 1 : 0,
                            borderColor: 'rgba(255,255,255,0.10)',
                        }]}>
                            <Ionicons name="link-outline" size={20} color={isDark ? 'rgba(255,255,255,0.40)' : '#9CA3AF'} />
                            <TextInput
                                style={[styles.urlInput, { color: isDark ? '#F0F0FF' : '#1F2937' }]}
                                placeholder="https://thehindu.com/article..."
                                placeholderTextColor={isDark ? 'rgba(255,255,255,0.25)' : '#9CA3AF'}
                                value={sourceLinkUrl}
                                onChangeText={setSourceLinkUrl}
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="url"
                            />
                            {sourceLinkUrl.length > 0 && (
                                <TouchableOpacity onPress={() => setSourceLinkUrl('')}>
                                    <Ionicons name="close-circle" size={20} color={isDark ? 'rgba(255,255,255,0.40)' : '#9CA3AF'} />
                                </TouchableOpacity>
                            )}
                        </View>

                        <TouchableOpacity
                            style={[styles.extractButton, !sourceLinkUrl.trim() && styles.extractButtonDisabled]}
                            onPress={handleAddLinkSource}
                            disabled={!sourceLinkUrl.trim()}
                        >
                            <Ionicons name="download-outline" size={20} color="#FFFFFF" />
                            <Text style={styles.extractButtonText}>Extract Content</Text>
                        </TouchableOpacity>

                        <View style={[styles.hintContainer, {
                            backgroundColor: isDark ? 'rgba(16,185,129,0.10)' : '#F0FDF4',
                        }]}>
                            <Ionicons name="information-circle-outline" size={16} color={isDark ? '#34D399' : '#15803D'} />
                            <Text style={[styles.hintText, { color: isDark ? '#34D399' : '#15803D' }]}>
                                Content will be added as a new source
                            </Text>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Camera Picker Modal */}
            <Modal
                visible={cameraSourcePickerVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setCameraSourcePickerVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.linkModal, {
                        backgroundColor: isDark ? '#333333' : '#FFFFFF',
                        borderWidth: isDark ? 1 : 0,
                        borderColor: 'rgba(255,255,255,0.10)',
                    }]}>
                        <View style={{ width: 38, height: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginBottom: 14 }} />

                        <View style={styles.linkModalHeader}>
                            <Text style={[styles.linkModalTitle, { color: isDark ? '#F0F0FF' : '#1F2937' }]}>Snap Notes</Text>
                            <TouchableOpacity
                                onPress={() => setCameraSourcePickerVisible(false)}
                                style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : '#F3F4F6', justifyContent: 'center', alignItems: 'center' }}
                            >
                                <Ionicons name="close" size={18} color={isDark ? 'rgba(255,255,255,0.70)' : '#6B7280'} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.linkModalSubtitle, { color: isDark ? 'rgba(255,255,255,0.50)' : '#6B7280' }]}>
                            Capture handwritten notes or textbook pages — text will be extracted automatically
                        </Text>

                        <TouchableOpacity
                            style={[styles.cameraOptionBtn, {
                                backgroundColor: isDark ? 'rgba(42,125,235,0.12)' : '#F0EAE0',
                                borderWidth: 1,
                                borderColor: isDark ? 'rgba(42,125,235,0.25)' : '#C7D2FE',
                            }]}
                            onPress={() => pickCameraForSource(true)}
                        >
                            <View style={[styles.cameraOptionIcon, { backgroundColor: isDark ? 'rgba(42,125,235,0.20)' : '#DDD6FE' }]}>
                                <Ionicons name="camera" size={22} color="#2A7DEB" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.cameraOptionTitle, { color: isDark ? '#F0F0FF' : '#1F2937' }]}>Take Photo</Text>
                                <Text style={[styles.cameraOptionDesc, { color: isDark ? 'rgba(255,255,255,0.45)' : '#6B7280' }]}>Use camera to capture content</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={isDark ? 'rgba(255,255,255,0.30)' : '#D1D5DB'} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.cameraOptionBtn, {
                                backgroundColor: isDark ? 'rgba(42,125,235,0.10)' : '#F5F1EB',
                                borderWidth: 1,
                                borderColor: isDark ? 'rgba(42,125,235,0.22)' : '#DDD6FE',
                            }]}
                            onPress={() => pickCameraForSource(false)}
                        >
                            <View style={[styles.cameraOptionIcon, { backgroundColor: isDark ? 'rgba(42,125,235,0.20)' : '#EDE9FE' }]}>
                                <Ionicons name="images" size={22} color="#2A7DEB" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.cameraOptionTitle, { color: isDark ? '#F0F0FF' : '#1F2937' }]}>Pick from Gallery</Text>
                                <Text style={[styles.cameraOptionDesc, { color: isDark ? 'rgba(255,255,255,0.45)' : '#6B7280' }]}>Choose an existing photo</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={isDark ? 'rgba(255,255,255,0.30)' : '#D1D5DB'} />
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* AI Summary Modal */}
            <Modal
                visible={showSummaryModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowSummaryModal(false)}
            >
                <View style={[styles.modalOverlay, { justifyContent: 'center', alignItems: 'center' }]}>
                    <View style={[styles.summaryModal, {
                        backgroundColor: isDark ? '#333333' : '#FFFFFF',
                        borderWidth: isDark ? 1 : 0,
                        borderColor: 'rgba(255,255,255,0.12)',
                    }]}>
                        <View style={styles.summaryHeader}>
                            <View style={styles.summaryTitleRow}>
                                <Ionicons name="sparkles" size={20} color="#2A7DEB" />
                                <Text style={[styles.summaryTitle, { color: isDark ? '#F0F0FF' : '#1F2937' }]}>AI Summary</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setShowSummaryModal(false)}
                                style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : '#F3F4F6', justifyContent: 'center', alignItems: 'center' }}
                            >
                                <Ionicons name="close" size={18} color={isDark ? 'rgba(255,255,255,0.70)' : '#6B7280'} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.summaryContent}>
                            <TypeWriterText
                                style={[styles.summaryText, { color: isDark ? 'rgba(255,255,255,0.80)' : '#374151' }]}
                                text={generatedSummary}
                                speed={5}
                            />
                        </ScrollView>

                        <View style={styles.summaryFooter}>
                            <TouchableOpacity
                                style={styles.summaryCancelBtn}
                                onPress={() => setShowSummaryModal(false)}
                            >
                                <Text style={[styles.summaryCancelText, { color: isDark ? 'rgba(255,255,255,0.55)' : '#6B7280' }]}>Close</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.summaryApplyBtn}
                                onPress={applySummary}
                            >
                                <Text style={styles.summaryApplyText}>Add to Note</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    // ── Header ──────────────────────────────────────────────────────────────
    header: {
        paddingTop: 12,
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        overflow: 'hidden',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerBackBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.28)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    sourceTypeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.22)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 5,
    },
    sourceTypeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    saveButton: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 18,
        paddingVertical: 9,
        borderRadius: 12,
    },
    saveButtonDisabled: {
        opacity: 0.5,
    },
    saveButtonText: {
        color: '#1A5DB8',
        fontSize: 14,
        fontWeight: '700',
    },
    sourcePicker: {
        borderBottomWidth: 1,
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    sourceOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        gap: 10,
    },
    sourceOptionText: {
        flex: 1,
        fontSize: 14,
    },
    // ── Content ─────────────────────────────────────────────────────────────
    content: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 100,
    },
    titleInput: {
        fontSize: 26,
        fontWeight: '700',
        marginBottom: 12,
        lineHeight: 32,
    },
    tagsSection: {
        marginBottom: 16,
    },
    // ── Add Note Grid ─────────────────────────────────────────────────────
    addNoteGridContainer: {
        borderRadius: 18,
        padding: 18,
        marginBottom: 4,
        borderWidth: 1,
        borderColor: '#D4D8F0',
    },
    addNoteGridHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    addNoteGridTitle: {
        fontSize: 22,
        fontWeight: '700',
        fontStyle: 'italic',
    },
    addNoteGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 12,
    },
    addNoteGridCard: {
        width: '48%',
        borderRadius: 14,
        paddingVertical: 28,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
    },
    addNoteGridCardTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginTop: 10,
        textAlign: 'center',
    },
    addNoteGridCardDesc: {
        fontSize: 12,
        marginTop: 4,
        textAlign: 'center',
    },
    // ── Section Divider ─────────────────────────────────────────────────────
    sectionDivider: {
        height: 1,
        marginVertical: 16,
    },
    // ── Source Card ──────────────────────────────────────────────────────────
    sourceCard: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 14,
        marginBottom: 12,
    },
    sourceCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 8,
    },
    sourceTypeIcon: {
        width: 30,
        height: 30,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sourceLabel: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
    },
    removeSourceBtn: {
        padding: 4,
    },
    sourceTextInput: {
        fontSize: 15,
        lineHeight: 22,
        minHeight: 80,
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
    },
    processingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
    },
    processingText: {
        fontSize: 13,
    },
    sourceContentPreview: {
        fontSize: 14,
        lineHeight: 20,
    },
    sourceUrlRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 8,
    },
    sourceUrlText: {
        fontSize: 11,
        flex: 1,
    },
    // ── Empty State ─────────────────────────────────────────────────────────
    emptySourcesContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
    },
    emptySourcesText: {
        fontSize: 16,
        fontWeight: '500',
        marginTop: 12,
    },
    emptySourcesHint: {
        fontSize: 13,
        marginTop: 4,
    },
    // ── AI Button ───────────────────────────────────────────────────────────
    aiButton: {
        marginBottom: 16,
        borderRadius: 12,
        overflow: 'hidden',
    },
    aiButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 8,
    },
    aiButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    // ── Camera Modal ────────────────────────────────────────────────────────
    cameraOptionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 14,
        marginBottom: 12,
        gap: 12,
    },
    cameraOptionIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraOptionTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    cameraOptionDesc: {
        fontSize: 12,
    },
    // ── Modals ──────────────────────────────────────────────────────────────
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.60)',
        justifyContent: 'flex-end',
    },
    linkModal: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingTop: 14,
        paddingBottom: 40,
    },
    linkModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    linkModalTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    linkModalSubtitle: {
        fontSize: 14,
        marginBottom: 20,
    },
    urlInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 16,
        gap: 10,
    },
    urlInput: {
        flex: 1,
        fontSize: 15,
    },
    extractButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#10B981',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
        marginBottom: 16,
    },
    extractButtonDisabled: {
        opacity: 0.5,
    },
    extractButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    hintContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        borderRadius: 10,
    },
    hintText: {
        flex: 1,
        fontSize: 13,
    },
    // ── Summary Modal ───────────────────────────────────────────────────────
    summaryModal: {
        width: '90%',
        maxHeight: '80%',
        borderRadius: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    summaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    summaryTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    summaryTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    summaryContent: {
        marginBottom: 20,
    },
    summaryText: {
        fontSize: 15,
        lineHeight: 24,
    },
    summaryFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    summaryCancelBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    summaryCancelText: {
        fontSize: 15,
        fontWeight: '500',
    },
    summaryApplyBtn: {
        backgroundColor: '#2A7DEB',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 10,
    },
    summaryApplyText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
});

export default CreateNoteScreen;
