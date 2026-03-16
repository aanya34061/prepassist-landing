import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    Linking,
    Share,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
    getNoteById,
    updateNote,
    deleteNote,
    LocalNote,
    LocalTag,
    NoteBlock,
} from '../services/localNotesStorage';
import { analyzeForUPSC } from '../services/aiSummarizer';
import { useTheme } from '../../../features/Reference/theme/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { syncNoteToFirebase, deleteNoteFromFirebase } from '../../../services/firebaseNotesSync';
import { shareNotePdf, previewNotePdf } from '../services/notePdfService';
import * as FileSystem from 'expo-file-system/legacy';

const OCR_API_KEY = 'K85553321788957';
const OCR_API_URL = 'https://api.ocr.space/parse/image';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface NoteDetailScreenProps {
    navigation: any;
    route: {
        params: {
            noteId: number;
        };
    };
}

// Source config
const SOURCE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
    manual: { icon: 'create-outline', color: '#2A7DEB', label: 'My Note' },
    scraped: { icon: 'link-outline', color: '#06B6D4', label: 'Web Article' },
    ncert: { icon: 'book-outline', color: '#10B981', label: 'NCERT' },
    book: { icon: 'library-outline', color: '#2A7DEB', label: 'Book' },
    current_affairs: { icon: 'newspaper-outline', color: '#F59E0B', label: 'Current Affairs' },
    report: { icon: 'document-text-outline', color: '#EF4444', label: 'Report' },
};

export const NoteDetailScreen: React.FC<NoteDetailScreenProps> = ({ navigation, route }) => {
    const { noteId } = route.params;
    const { theme, isDark } = useTheme();
    const { user } = useAuth();

    const [note, setNote] = useState<LocalNote | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const [showActions, setShowActions] = useState(false);

    useEffect(() => {
        loadNote();
    }, [noteId]);

    const loadNote = async () => {
        setIsLoading(true);
        try {
            const noteData = await getNoteById(noteId);
            setNote(noteData);
        } catch (error) {
            console.error('Error loading note:', error);
            Alert.alert('Error', 'Failed to load note');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTogglePin = async () => {
        if (!note) return;
        try {
            const updated = await updateNote(note.id, { isPinned: !note.isPinned });
            setNote(prev => prev ? { ...prev, isPinned: !prev.isPinned } : null);
            if (updated && user?.id) syncNoteToFirebase(user.id, updated);
        } catch (error) {
            Alert.alert('Error', 'Failed to update note');
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Note',
            'Are you sure you want to delete this note? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteNote(noteId);
                            if (user?.id) deleteNoteFromFirebase(user.id, noteId);
                            navigation.goBack();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete note');
                        }
                    },
                },
            ]
        );
    };

    const handleShare = async () => {
        if (!note) return;
        try {
            await Share.share({
                title: note.title,
                message: `${note.title}\n\n${note.summary || note.content}`,
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    const handleExportPdf = async () => {
        if (!note) return;
        setIsExportingPdf(true);
        try {
            await shareNotePdf(note);
        } catch (error) {
            console.error('Error exporting PDF:', error);
            Alert.alert('Export Failed', 'Could not generate PDF. Please try again.');
        } finally {
            setIsExportingPdf(false);
        }
    };

    const handlePreviewPdf = async () => {
        if (!note) return;
        setIsExportingPdf(true);
        try {
            await previewNotePdf(note);
        } catch (error) {
            console.error('Error previewing PDF:', error);
            Alert.alert('Preview Failed', 'Could not generate PDF preview.');
        } finally {
            setIsExportingPdf(false);
        }
    };

    const extractPdfText = async (pdfBlock: NoteBlock): Promise<string> => {
        const fileUri = pdfBlock.metadata?.url || pdfBlock.metadata?.storagePath;
        if (!fileUri) return '';

        try {
            const fileInfo = await FileSystem.getInfoAsync(fileUri);
            if (!fileInfo.exists) return '';

            const base64Data = await FileSystem.readAsStringAsync(fileUri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            if (!base64Data || base64Data.length === 0) return '';

            const fileName = pdfBlock.metadata?.fileName || 'document.pdf';
            const isPDF = fileName.toLowerCase().endsWith('.pdf');
            const dataPrefix = isPDF
                ? 'data:application/pdf;base64,'
                : 'data:image/png;base64,';

            const formData = new FormData();
            formData.append('base64Image', dataPrefix + base64Data);
            formData.append('apikey', OCR_API_KEY);
            formData.append('language', 'eng');
            formData.append('isOverlayRequired', 'false');
            formData.append('filetype', isPDF ? 'PDF' : 'Auto');
            formData.append('detectOrientation', 'true');
            formData.append('scale', 'true');
            formData.append('OCREngine', '2');

            const response = await fetch(OCR_API_URL, {
                method: 'POST',
                body: formData,
                headers: { 'Accept': 'application/json' },
            });

            if (!response.ok) return '';

            const result = await response.json();

            if (result.OCRExitCode === 1 && result.ParsedResults?.length > 0) {
                return result.ParsedResults
                    .map((page: any) => page.ParsedText || '')
                    .join('\n\n');
            }

            return '';
        } catch (error) {
            console.error('[NoteDetail] PDF OCR error:', error);
            return '';
        }
    };

    const handleAnalyze = async () => {
        if (!note) return;

        setIsAnalyzing(true);
        try {
            // Collect text content from all blocks including PDFs
            let fullContent = note.content || '';

            const pdfBlocks = note.blocks?.filter(b => b.type === 'pdf') || [];
            if (pdfBlocks.length > 0) {
                for (const pdfBlock of pdfBlocks) {
                    const pdfText = await extractPdfText(pdfBlock);
                    if (pdfText.trim()) {
                        fullContent += `\n\n--- PDF: ${pdfBlock.metadata?.fileName || 'Document'} ---\n${pdfText}`;
                    }
                }
            }

            if (!fullContent.trim()) {
                Alert.alert('No Content', 'No text content found in this note or its attached PDFs.');
                return;
            }

            const analysis = await analyzeForUPSC(fullContent, note.title);

            if (analysis.error) {
                Alert.alert('Analysis Failed', analysis.error);
                return;
            }

            // Update note with analysis
            const updatedNote = await updateNote(note.id, {
                summary: analysis.summary,
            });

            if (updatedNote) {
                setNote(updatedNote);
                if (user?.id) syncNoteToFirebase(user.id, updatedNote);
                Alert.alert('Success', 'Note analyzed and summary added!');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to analyze note');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleEdit = () => {
        if (!note) return;
        navigation.navigate('CreateNoteScreen', { initialNote: note });
    };

    // Render block content
    const renderBlock = (block: NoteBlock, index: number) => {
        switch (block.type) {
            case 'h1':
                return (
                    <Text key={block.id} style={[styles.h1Text, { color: isDark ? '#FFFFFF' : '#1F2937' }]}>
                        {block.content}
                    </Text>
                );
            case 'h2':
                return (
                    <Text key={block.id} style={[styles.h2Text, { color: isDark ? '#F0F0FF' : '#1F2937' }]}>
                        {block.content}
                    </Text>
                );
            case 'h3':
                return (
                    <Text key={block.id} style={[styles.h3Text, { color: isDark ? '#E8E8FF' : '#374151' }]}>
                        {block.content}
                    </Text>
                );
            case 'bullet':
                return (
                    <View key={block.id} style={styles.bulletItem}>
                        <View style={[styles.bulletDot, { backgroundColor: isDark ? 'rgba(255,255,255,0.40)' : '#6B7280' }]} />
                        <Text style={[styles.bulletText, { color: isDark ? 'rgba(255,255,255,0.80)' : '#374151' }]}>{block.content}</Text>
                    </View>
                );
            case 'numbered':
                return (
                    <View key={block.id} style={styles.numberedItem}>
                        <Text style={[styles.numberedNumber, { color: isDark ? 'rgba(255,255,255,0.40)' : '#6B7280' }]}>{index + 1}.</Text>
                        <Text style={[styles.numberedText, { color: isDark ? 'rgba(255,255,255,0.80)' : '#374151' }]}>{block.content}</Text>
                    </View>
                );
            case 'quote':
                return (
                    <View key={block.id} style={styles.quoteBlock}>
                        <View style={styles.quoteBar} />
                        <Text style={[styles.quoteText, { color: isDark ? 'rgba(255,255,255,0.55)' : '#6B7280' }]}>{block.content}</Text>
                    </View>
                );
            case 'callout':
                return (
                    <View key={block.id} style={[styles.calloutBlock, {
                        backgroundColor: isDark ? 'rgba(245,158,11,0.12)' : '#FEF3C7',
                    }]}>
                        <Ionicons name="information-circle" size={18} color="#F59E0B" />
                        <Text style={[styles.calloutText, { color: isDark ? '#FCD34D' : '#78350F' }]}>{block.content}</Text>
                    </View>
                );
            case 'pdf':
                return (
                    <View key={block.id} style={[styles.pdfBlock, {
                        backgroundColor: isDark ? 'rgba(239,68,68,0.10)' : '#FEF2F2',
                        borderColor: isDark ? 'rgba(239,68,68,0.20)' : '#FECACA',
                    }]}>
                        <Ionicons name="document-text" size={24} color="#EF4444" />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={[styles.pdfFileName, { color: isDark ? '#FCA5A5' : '#991B1B' }]}>
                                {block.metadata?.fileName || 'PDF Document'}
                            </Text>
                            {block.metadata?.fileSize && (
                                <Text style={[styles.pdfFileSize, { color: isDark ? 'rgba(255,255,255,0.40)' : '#9CA3AF' }]}>
                                    {(block.metadata.fileSize / 1024).toFixed(0)} KB
                                </Text>
                            )}
                        </View>
                    </View>
                );
            case 'image':
                return block.metadata?.url ? (
                    <View key={block.id} style={styles.imageBlock}>
                        <Ionicons name="image-outline" size={20} color={isDark ? 'rgba(255,255,255,0.50)' : '#6B7280'} />
                        <Text style={[styles.imageLabel, { color: isDark ? 'rgba(255,255,255,0.50)' : '#6B7280' }]}>Image attached</Text>
                    </View>
                ) : null;
            case 'divider':
                return <View key={block.id} style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB' }]} />;
            default:
                return (
                    <Text key={block.id} style={[styles.paragraphText, { color: isDark ? 'rgba(255,255,255,0.80)' : '#374151' }]}>
                        {block.content}
                    </Text>
                );
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: isDark ? '#07091A' : '#FFFFFF' }}>
                <LinearGradient colors={isDark ? ['#07091A', '#0F0A2E', '#080E28'] : ['#FFFFFF', '#FFFFFF', '#FFFFFF']} style={StyleSheet.absoluteFill} />
                <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: 'transparent' }}>
                    <View style={styles.loadingContainer}>
                        <LinearGradient colors={['#1A5DB8', '#2A7DEB']} style={styles.loadingBubble}>
                            <ActivityIndicator size="large" color="#FFF" />
                        </LinearGradient>
                        <Text style={[styles.loadingText, { color: isDark ? 'rgba(255,255,255,0.55)' : '#6B7280' }]}>Loading note...</Text>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    // Not found state
    if (!note) {
        return (
            <View style={{ flex: 1, backgroundColor: isDark ? '#07091A' : '#FFFFFF' }}>
                <LinearGradient colors={isDark ? ['#07091A', '#0F0A2E', '#080E28'] : ['#FFFFFF', '#FFFFFF', '#FFFFFF']} style={StyleSheet.absoluteFill} />
                <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: 'transparent' }}>
                    <View style={styles.errorContainer}>
                        <View style={[styles.errorIconBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F3F4F6' }]}>
                            <Ionicons name="document-outline" size={56} color={isDark ? 'rgba(255,255,255,0.25)' : '#D1D5DB'} />
                        </View>
                        <Text style={[styles.errorTitle, { color: isDark ? '#F0F0FF' : '#4B5563' }]}>Note not found</Text>
                        <TouchableOpacity
                            style={styles.goBackButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={styles.goBackButtonText}>Go Back</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    const sourceConfig = SOURCE_CONFIG[note.sourceType || 'manual'];

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#07091A' : '#FFFFFF' }}>
            <LinearGradient
                colors={isDark ? ['#07091A', '#0F0A2E', '#080E28'] : ['#FFFFFF', '#FFFFFF', '#FFFFFF']}
                style={StyleSheet.absoluteFill}
            />
            {/* Decorative orbs - dark mode only */}
            {isDark && (
            <>
            <View pointerEvents="none" style={{ position: 'absolute', width: 280, height: 280, borderRadius: 140, top: -60, right: -70, overflow: 'hidden' }}>
                <LinearGradient colors={['rgba(42,125,235,0.20)', 'transparent']} style={{ flex: 1 }} />
            </View>
            <View pointerEvents="none" style={{ position: 'absolute', width: 180, height: 180, borderRadius: 90, bottom: 80, left: -60, overflow: 'hidden' }}>
                <LinearGradient colors={['rgba(42,125,235,0.12)', 'transparent']} style={{ flex: 1 }} />
            </View>
            </>
            )}

            <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: 'transparent' }}>
                {/* Gradient Header */}
                <LinearGradient
                    colors={['#1A5DB8', '#3730A3', '#312E81']}
                    start={{ x: 0, y: 0 }} end={{ x: 1.2, y: 1 }}
                    style={styles.header}
                >
                    {/* Shimmer line */}
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, backgroundColor: 'rgba(255,255,255,0.28)' }} />
                    {/* Decorative circles */}
                    <View style={{ position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.045)', top: -55, right: -40 }} />
                    <View style={{ position: 'absolute', width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.06)', bottom: 8, left: -18 }} />

                    <View style={styles.headerRow}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.headerBackBtn}
                        >
                            <Ionicons name="chevron-back" size={20} color="#FFF" />
                        </TouchableOpacity>

                        <View style={{ flex: 1 }} />

                        <View style={styles.headerActions}>
                            <TouchableOpacity
                                onPress={handleTogglePin}
                                style={styles.headerIconBtn}
                            >
                                <Ionicons
                                    name={note.isPinned ? 'pin' : 'pin-outline'}
                                    size={18}
                                    color={note.isPinned ? '#FCD34D' : '#FFF'}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleShare}
                                style={styles.headerIconBtn}
                            >
                                <Ionicons name="share-outline" size={18} color="#FFF" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setShowActions(!showActions)}
                                style={styles.headerIconBtn}
                            >
                                <Ionicons name="ellipsis-vertical" size={18} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </LinearGradient>

                {/* Actions Menu */}
                {showActions && (
                    <View style={[styles.actionsMenu, {
                        backgroundColor: isDark ? 'rgba(26,29,58,0.97)' : '#FFFFFF',
                        borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6',
                    }]}>
                        <TouchableOpacity
                            style={styles.actionItem}
                            onPress={() => {
                                setShowActions(false);
                                handleEdit();
                            }}
                        >
                            <View style={[styles.actionIconBg, { backgroundColor: isDark ? 'rgba(42,125,235,0.15)' : '#F0EAE0' }]}>
                                <Ionicons name="create-outline" size={18} color="#2A7DEB" />
                            </View>
                            <Text style={[styles.actionText, { color: isDark ? '#F0F0FF' : '#374151' }]}>Edit Note</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionItem}
                            onPress={() => {
                                setShowActions(false);
                                handleAnalyze();
                            }}
                        >
                            <View style={[styles.actionIconBg, { backgroundColor: isDark ? 'rgba(42,125,235,0.15)' : '#F5F1EB' }]}>
                                <Ionicons name="sparkles-outline" size={18} color="#2A7DEB" />
                            </View>
                            <Text style={[styles.actionText, { color: isDark ? '#A3E4D7' : '#2A7DEB' }]}>AI Analyze</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionItem}
                            onPress={() => {
                                setShowActions(false);
                                handleExportPdf();
                            }}
                            disabled={isExportingPdf}
                        >
                            <View style={[styles.actionIconBg, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF' }]}>
                                <Ionicons name="document-text-outline" size={18} color="#3B82F6" />
                            </View>
                            <Text style={[styles.actionText, { color: isDark ? '#93C5FD' : '#3B82F6' }]}>
                                {isExportingPdf ? 'Generating PDF...' : 'Export as PDF'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionItem}
                            onPress={() => {
                                setShowActions(false);
                                handleDelete();
                            }}
                        >
                            <View style={[styles.actionIconBg, { backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2' }]}>
                                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                            </View>
                            <Text style={[styles.actionText, { color: '#EF4444' }]}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Content */}
                <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.contentContainer}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Source indicator */}
                    <View style={[styles.sourceTag, { backgroundColor: sourceConfig.color + (isDark ? '20' : '15') }]}>
                        <Ionicons name={sourceConfig.icon as any} size={14} color={sourceConfig.color} />
                        <Text style={[styles.sourceLabel, { color: sourceConfig.color }]}>
                            {sourceConfig.label}
                        </Text>
                        {note.sourceUrl && (
                            <TouchableOpacity onPress={() => Linking.openURL(note.sourceUrl!)}>
                                <Ionicons name="open-outline" size={14} color={sourceConfig.color} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Title */}
                    <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#1F2937' }]}>{note.title}</Text>

                    {/* Meta info */}
                    <View style={styles.metaRow}>
                        <Text style={[styles.metaText, { color: isDark ? 'rgba(255,255,255,0.35)' : '#9CA3AF' }]}>
                            Created {new Date(note.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                            })}
                        </Text>
                        {note.updatedAt !== note.createdAt && (
                            <Text style={[styles.metaText, { color: isDark ? 'rgba(255,255,255,0.35)' : '#9CA3AF' }]}>
                                {' '}· Edited {new Date(note.updatedAt).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                })}
                            </Text>
                        )}
                    </View>

                    {/* Tags */}
                    {note.tags.length > 0 && (
                        <View style={styles.tagsRow}>
                            {note.tags.map(tag => (
                                <View
                                    key={tag.id}
                                    style={[styles.tagChip, { backgroundColor: tag.color + '20' }]}
                                >
                                    <Text style={[styles.tagText, { color: tag.color }]}>
                                        #{tag.name}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* AI Summary */}
                    {note.summary && (
                        <View style={[styles.summaryCard, {
                            backgroundColor: isDark ? 'rgba(42,125,235,0.10)' : '#F5F1EB',
                            borderWidth: isDark ? 1 : 0,
                            borderColor: 'rgba(42,125,235,0.20)',
                        }]}>
                            {/* Shimmer */}
                            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, backgroundColor: isDark ? 'rgba(42,125,235,0.25)' : 'rgba(42,125,235,0.12)', borderTopLeftRadius: 14, borderTopRightRadius: 14 }} />
                            <View style={styles.summaryHeader}>
                                <Ionicons name="sparkles" size={16} color="#2A7DEB" />
                                <Text style={[styles.summaryLabel, { color: isDark ? '#A3E4D7' : '#4AB09D' }]}>AI Summary</Text>
                            </View>
                            <Text style={[styles.summaryText, { color: isDark ? 'rgba(255,255,255,0.75)' : '#374151' }]}>{note.summary}</Text>
                        </View>
                    )}

                    {/* Divider */}
                    <View style={[styles.sectionDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6' }]} />

                    {/* Content blocks */}
                    <View style={styles.blocksContainer}>
                        {note.blocks && note.blocks.length > 0 ? (
                            note.blocks.map((block, index) => renderBlock(block, index))
                        ) : (
                            <Text style={[styles.paragraphText, { color: isDark ? 'rgba(255,255,255,0.80)' : '#374151' }]}>{note.content}</Text>
                        )}
                    </View>
                </ScrollView>

                {/* Bottom actions */}
                <SafeAreaView edges={['bottom']} style={{ backgroundColor: 'transparent' }}>
                    <View style={[styles.bottomBar, {
                        backgroundColor: isDark ? 'rgba(15,13,45,0.95)' : '#FFFFFF',
                        borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6',
                    }]}>
                        <TouchableOpacity
                            style={[styles.bottomButton, {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6',
                                borderWidth: isDark ? 1 : 0,
                                borderColor: 'rgba(255,255,255,0.10)',
                            }]}
                            onPress={handleEdit}
                        >
                            <Ionicons name="create-outline" size={20} color="#2A7DEB" />
                            <Text style={styles.bottomButtonText}>Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.bottomButton, {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6',
                                borderWidth: isDark ? 1 : 0,
                                borderColor: 'rgba(255,255,255,0.10)',
                            }]}
                            onPress={handleExportPdf}
                            disabled={isExportingPdf}
                        >
                            {isExportingPdf ? (
                                <ActivityIndicator size="small" color="#3B82F6" />
                            ) : (
                                <Ionicons name="document-text-outline" size={20} color="#3B82F6" />
                            )}
                            <Text style={[styles.bottomButtonText, { color: '#3B82F6' }]}>PDF</Text>
                        </TouchableOpacity>

                        {!note.summary && (
                            <TouchableOpacity
                                style={[styles.bottomButton, styles.analyzeButton]}
                                onPress={handleAnalyze}
                                disabled={isAnalyzing}
                            >
                                <LinearGradient
                                    colors={isAnalyzing ? ['#6B7280', '#9CA3AF'] : ['#4AB09D', '#2A7DEB']}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    style={styles.analyzeGradient}
                                >
                                    {isAnalyzing ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                        <>
                                            <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                                            <Text style={styles.analyzeButtonText}>AI Summarize</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        )}
                    </View>
                </SafeAreaView>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    // ── Loading & Error ─────────────────────────────────────────────────────
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
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    errorIconBg: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 24,
    },
    goBackButton: {
        backgroundColor: '#2A7DEB',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    goBackButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
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
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    headerIconBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    // ── Actions Menu ────────────────────────────────────────────────────────
    actionsMenu: {
        borderBottomWidth: 1,
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 11,
        gap: 12,
    },
    actionIconBg: {
        width: 34,
        height: 34,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionText: {
        fontSize: 15,
        fontWeight: '500',
    },
    // ── Content ─────────────────────────────────────────────────────────────
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
        paddingBottom: 100,
    },
    sourceTag: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 6,
        marginBottom: 14,
    },
    sourceLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        lineHeight: 36,
        marginBottom: 12,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    metaText: {
        fontSize: 13,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20,
    },
    tagChip: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    tagText: {
        fontSize: 12,
        fontWeight: '500',
    },
    // ── AI Summary Card ─────────────────────────────────────────────────────
    summaryCard: {
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
        overflow: 'hidden',
    },
    summaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    summaryLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    summaryText: {
        fontSize: 14,
        lineHeight: 22,
    },
    sectionDivider: {
        height: 1,
        marginVertical: 16,
    },
    // ── Content Blocks ──────────────────────────────────────────────────────
    blocksContainer: {
        gap: 8,
    },
    h1Text: {
        fontSize: 24,
        fontWeight: '700',
        lineHeight: 32,
        marginTop: 12,
        marginBottom: 8,
    },
    h2Text: {
        fontSize: 20,
        fontWeight: '600',
        lineHeight: 28,
        marginTop: 10,
        marginBottom: 6,
    },
    h3Text: {
        fontSize: 17,
        fontWeight: '600',
        lineHeight: 24,
        marginTop: 8,
        marginBottom: 4,
    },
    paragraphText: {
        fontSize: 16,
        lineHeight: 26,
    },
    bulletItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginVertical: 4,
    },
    bulletDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginTop: 9,
        marginRight: 12,
    },
    bulletText: {
        flex: 1,
        fontSize: 16,
        lineHeight: 26,
    },
    numberedItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginVertical: 4,
    },
    numberedNumber: {
        fontSize: 16,
        marginRight: 8,
        lineHeight: 26,
    },
    numberedText: {
        flex: 1,
        fontSize: 16,
        lineHeight: 26,
    },
    quoteBlock: {
        flexDirection: 'row',
        alignItems: 'stretch',
        marginVertical: 8,
    },
    quoteBar: {
        width: 4,
        backgroundColor: '#2A7DEB',
        borderRadius: 2,
        marginRight: 12,
    },
    quoteText: {
        flex: 1,
        fontSize: 16,
        fontStyle: 'italic',
        lineHeight: 26,
    },
    calloutBlock: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 12,
        borderRadius: 10,
        marginVertical: 8,
        gap: 10,
    },
    calloutText: {
        flex: 1,
        fontSize: 15,
        lineHeight: 22,
    },
    pdfBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        marginVertical: 8,
    },
    pdfFileName: {
        fontSize: 14,
        fontWeight: '600',
    },
    pdfFileSize: {
        fontSize: 12,
        marginTop: 2,
    },
    imageBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
    },
    imageLabel: {
        fontSize: 14,
    },
    divider: {
        height: 1,
        marginVertical: 16,
    },
    // ── Bottom Bar ──────────────────────────────────────────────────────────
    bottomBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderTopWidth: 1,
        gap: 12,
    },
    bottomButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 6,
    },
    bottomButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2A7DEB',
    },
    analyzeButton: {
        flex: 1,
        padding: 0,
        overflow: 'hidden',
    },
    analyzeGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 11,
        paddingHorizontal: 20,
        gap: 7,
        borderRadius: 12,
    },
    analyzeButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});

export default NoteDetailScreen;
