import React, { useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet, Alert, Modal, Text, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { RoadmapProvider } from './src/context/RoadmapContext';
import { VisualReferenceProvider } from './src/context/VisualReferenceContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { WebLayout } from './src/components/WebContainer';

// Auth Screens
import LandingScreen from './src/screens/LandingScreen';
import LoginScreen from './src/screens/LoginScreen';
import PricingScreen from './src/screens/PricingScreen';

// Main App Screens
import HomeScreen from './src/screens/HomeScreen';
import ConfigScreen from './src/screens/ConfigScreen';
import QuestionsListScreen from './src/screens/QuestionsListScreen';
import TestScreen from './src/screens/TestScreen';
import ResultScreen from './src/screens/ResultScreen';
import MainsAnswerEvaluationScreen from './src/screens/MainsAnswerEvaluationScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import NewsFeedScreen from './src/screens/NewsFeedScreen';
import ArticleDetailScreen from './src/screens/ArticleDetailScreen';

// Roadmap Screens
import RoadmapScreen from './src/screens/RoadmapScreen';
import TopicDetailScreen from './src/screens/TopicDetailScreen';
import DailyPlanScreen from './src/screens/DailyPlanScreen';
import UserPreferencesScreen from './src/screens/UserPreferencesScreen';

// Visual Reference Screens
import {
  ReferenceScreen,
  HistoryTimelineScreen,
  PolityFlowScreen,
  GeographyViewScreen,
  EconomyCardsScreen,
  EnvironmentCardsScreen,
  ScienceTechViewScreen,
  ThemeProvider as ReferenceThemeProvider,
} from './src/features/Reference';

// Mind Map Screens
import { MindMapScreen, MindMapListScreen, AIMindMapScreen, AIMindMapListScreen } from './src/features/MindMap';

// Notes Screens
import {
  NoteListScreen,
  NoteEditorScreen,
  NotePreviewScreen,
  UploadNotesScreen,
  WebClipperScreen,
  CreateNoteScreen,
  NoteDetailScreen,
  AINotesMakerScreen,
} from './src/features/Notes';

// PDF MCQ Screens
import { GenerateMCQsFromPDFScreen, PDFMCQListScreen, AIMCQsGenerateScreen, AIMCQListScreen } from './src/features/PDFMCQ';

// Coming Soon Screen
import ComingSoonScreen from './src/screens/ComingSoonScreen';

// Auth Callback Screen
import AuthCallbackScreen from './src/screens/AuthCallbackScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';

// Billing Screen
import BillingScreen from './src/screens/BillingScreen';

// API Test Screen
import ApiTestScreen from './src/screens/ApiTestScreen';

// New Home Screen (Firebase replica)
import NewHomeScreen from './src/screens/NewHomeScreen';
import QuestionBankScreen from './src/screens/QuestionBankScreen';
import QuestionSetListScreen from './src/screens/QuestionSetListScreen';
import QuestionPaperScreen from './src/screens/QuestionPaperScreen';

// Saved Articles Screen
import SavedArticlesScreen from './src/screens/SavedArticlesScreen';

const Stack = createNativeStackNavigator();

// Loading Screen
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#8E54E9" />
  </View>
);

// Auth Navigator (Landing + Login + Pricing)
const AuthNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Landing"
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Pricing" component={PricingScreen} />
      <Stack.Screen name="AuthCallback" component={AuthCallbackScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
};

// Main App Navigator
const MainNavigator = () => (
  <Stack.Navigator
    initialRouteName="NewHome"
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: '#F2F2F7' },
      animation: 'slide_from_right',
    }}
  >
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="Config" component={ConfigScreen} />
    <Stack.Screen name="QuestionsList" component={QuestionsListScreen} />
    <Stack.Screen name="Test" component={TestScreen} />
    <Stack.Screen name="Result" component={ResultScreen} />
    <Stack.Screen name="Essay" component={MainsAnswerEvaluationScreen} />
    <Stack.Screen name="Progress" component={ProgressScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="Roadmap" component={RoadmapScreen} />
    <Stack.Screen name="TopicDetail" component={TopicDetailScreen} />
    <Stack.Screen name="DailyPlan" component={DailyPlanScreen} />
    <Stack.Screen name="UserPreferences" component={UserPreferencesScreen} />
    {/* Visual Reference Screens */}
    <Stack.Screen name="Reference" component={ReferenceScreen} />
    <Stack.Screen name="HistoryTimeline" component={HistoryTimelineScreen} />
    <Stack.Screen name="PolityFlow" component={PolityFlowScreen} />
    <Stack.Screen name="GeographyView" component={GeographyViewScreen} />
    <Stack.Screen name="EconomyCards" component={EconomyCardsScreen} />
    <Stack.Screen name="EnvironmentCards" component={EnvironmentCardsScreen} />
    <Stack.Screen name="ScienceTechView" component={ScienceTechViewScreen} />
    {/* Articles Screens */}
    <Stack.Screen name="Articles" component={NewsFeedScreen} />
    <Stack.Screen name="ArticleDetail" component={ArticleDetailScreen} />
    <Stack.Screen name="SavedArticles" component={SavedArticlesScreen} />
    {/* Mind Map Screens */}
    <Stack.Screen name="MindMap" component={MindMapListScreen} />
    <Stack.Screen name="MindMapEditor" component={MindMapScreen} />
    {/* AI Mind Map Screens */}
    <Stack.Screen name="AIMindMap" component={AIMindMapListScreen} />
    <Stack.Screen name="AIMindMapEditor" component={AIMindMapScreen} />
    {/* Notes Screens */}
    <Stack.Screen name="Notes" component={UploadNotesScreen} />
    <Stack.Screen name="WebClipperScreen" component={WebClipperScreen} />
    <Stack.Screen name="CreateNoteScreen" component={CreateNoteScreen} />
    <Stack.Screen name="NoteDetailScreen" component={NoteDetailScreen} />
    <Stack.Screen name="NoteEditor" component={NoteEditorScreen} />
    <Stack.Screen name="NotePreview" component={NotePreviewScreen} />
    <Stack.Screen name="AINotesMaker" component={AINotesMakerScreen} />
    {/* PDF MCQ Generator */}
    <Stack.Screen name="PDFMCQGenerator" component={GenerateMCQsFromPDFScreen} />
    <Stack.Screen name="PDFMCQList" component={PDFMCQListScreen} />
    {/* AI MCQ Generator (without PDF upload) */}
    <Stack.Screen name="AIMCQGenerator" component={AIMCQsGenerateScreen} />
    <Stack.Screen name="AIMCQList" component={AIMCQListScreen} />
    {/* Question Bank */}
    <Stack.Screen name="QuestionBank" component={QuestionBankScreen} />
    <Stack.Screen name="QuestionSetList" component={QuestionSetListScreen} />
    <Stack.Screen name="QuestionPaper" component={QuestionPaperScreen} />
    {/* Coming Soon */}
    <Stack.Screen name="ComingSoon" component={ComingSoonScreen} />
    {/* Billing */}
    <Stack.Screen name="Billing" component={BillingScreen} />
    {/* API Test */}
    <Stack.Screen name="ApiTest" component={ApiTestScreen} />
    {/* New Home (Firebase replica) */}
    <Stack.Screen name="NewHome" component={NewHomeScreen} />
  </Stack.Navigator>
);

// Root Navigator
const RootNavigator = () => {
  const { isLoading, isAuthenticated } = useAuth();
  const [forceReady, setForceReady] = React.useState(false);

  // Safety net: if auth check hangs more than 6 seconds, proceed anyway
  React.useEffect(() => {
    const t = setTimeout(() => setForceReady(true), 6000);
    return () => clearTimeout(t);
  }, []);

  if (isLoading && !forceReady) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen
          name="Auth"
          component={AuthNavigator}
          options={{ animation: 'fade' }}
        />
      ) : (
        <Stack.Screen
          name="Main"
          component={MainNavigator}
          options={{ animation: 'fade' }}
        />
      )}
    </Stack.Navigator>
  );
};

import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { scheduleNewsNotification } from './src/utils/notifications';
import { LogBox } from 'react-native';

// Suppress known non-critical network errors from showing as red LogBox popups.
// These happen when the backend / Supabase is unreachable (e.g. offline, India DNS issue).
LogBox.ignoreLogs([
  'Network request failed',
  'AuthRetryableFetchError',
  'TypeError: Network request failed',
  'Fetch articles error',
  'Fetch article error',
  '[RoadmapAPI]',
  '[RoadmapContext]',
  '[ReferenceAPI]',
  '[VisualReferenceContext]',
  '[Notification] Fetch',
  '[Knowledge Radar]',
  '[Billing]',
  '[Dodo]',
  'Supabase error',
  'CHANNEL_ERROR',
  'Realtime status',
]);

const prefix = Linking.createURL('/');

const linking = {
  prefixes: [prefix, 'upscprep://'],
  config: {
    screens: {
      Main: {
        screens: {
          Home: 'home',
          Notes: 'notes',
          WebClipperScreen: 'clip',
          CreateNoteScreen: 'create-note',
          NoteDetailScreen: 'note/:noteId',
          AINotesMaker: 'ai-notes-maker',
          Roadmap: 'roadmap',
          Essay: 'essay',
          Reference: 'reference',
          MindMap: 'mindmap',
          PDFMCQGenerator: 'pdf-mcq',
          AIMCQGenerator: 'ai-mcq',
          Progress: 'progress',
          Settings: 'settings',
          Articles: 'Articles',
          Billing: 'billing',
        },
      },
      Auth: {
        screens: {
          Login: 'login',
          Pricing: 'pricing',
          AuthCallback: {
            path: 'auth/callback',
          },
          ResetPassword: {
            path: 'auth/reset-password',
          },
        },
      },
    },
  },
};

import { saveArticle } from './src/services/savedArticlesService';

/**
 * Extract a URL from shared text.
 */
const extractUrlFromText = (text) => {
  if (!text) return null;
  const match = text.match(/https?:\/\/[^\s"'<>]+/i);
  return match ? match[0] : null;
};

/**
 * Check if a deep link is a shared URL from ACTION_SEND (converted by MainActivity).
 * Format: upscprep://shared?text=<encoded_text>
 */
const getSharedTextFromUrl = (url) => {
  if (!url) return null;
  try {
    if (url.includes('upscprep://shared')) {
      const match = url.match(/[?&]text=([^&]+)/);
      if (match) return decodeURIComponent(match[1]);
    }
  } catch (e) {}
  return null;
};

export default function App() {
  const navigationRef = useRef(null);
  const [savingArticle, setSavingArticle] = React.useState(false);
  const [savingStatus, setSavingStatus] = React.useState('');

  // Explicitly load icon fonts for release builds
  const [fontsLoaded] = useFonts({
    Ionicons: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
    'Material Design Icons': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf'),
    FontAwesome5_Solid: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Solid.ttf'),
    FontAwesome5_Regular: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Regular.ttf'),
    'Material Icons': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf'),
  });

  const handleSharedUrl = React.useCallback(async (sharedText) => {
    const articleUrl = extractUrlFromText(sharedText);
    if (!articleUrl) return;

    console.log('[App] Shared URL received:', articleUrl);

    setSavingArticle(true);
    setSavingStatus('Scraping article...');

    // Auto-save the article (scrape + summarize)
    const result = await saveArticle(articleUrl, (status) => setSavingStatus(status));

    setSavingArticle(false);
    setSavingStatus('');

    if (result.isDuplicate) {
      Alert.alert('Already Saved', 'This article is already in your saved list.');
    } else if (result.error) {
      Alert.alert('Save Failed', result.error);
    } else {
      Alert.alert('Article Saved', result.article?.title || 'Article saved with summary.');
    }

    // Navigate to News Feed → Saved tab
    if (navigationRef.current) {
      navigationRef.current.navigate('Main', {
        screen: 'Articles',
        params: { initialTab: 'saved' },
      });
    }
  }, []);

  React.useEffect(() => {
    // Check if app was opened via a shared URL
    Linking.getInitialURL().then((url) => {
      const sharedText = getSharedTextFromUrl(url);
      if (sharedText) handleSharedUrl(sharedText);
    });

    // Listen for shared URLs while app is running
    const sub = Linking.addEventListener('url', ({ url }) => {
      const sharedText = getSharedTextFromUrl(url);
      if (sharedText) handleSharedUrl(sharedText);
    });

    return () => sub.remove();
  }, [handleSharedUrl]);

  React.useEffect(() => {
    if (Platform.OS === 'web') return;

    // Schedule daily 8 AM news notification
    scheduleNewsNotification();

    // When user taps the news notification, navigate to Articles
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.type === 'daily-news' && navigationRef.current) {
        navigationRef.current.navigate('Main', { screen: 'Articles' });
      }
    });

    return () => sub.remove();
  }, []);

  if (!fontsLoaded) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NotificationProvider>
          <RoadmapProvider>
            <VisualReferenceProvider>
              <ReferenceThemeProvider>
                <WebLayout>
                  <NavigationContainer ref={navigationRef} linking={linking} fallback={<LoadingScreen />}>
                    <StatusBar style="dark" />
                    <RootNavigator />
                  </NavigationContainer>
                </WebLayout>
              </ReferenceThemeProvider>
            </VisualReferenceProvider>
          </RoadmapProvider>
        </NotificationProvider>
      </AuthProvider>

      {/* Saving Article Loader Overlay */}
      <Modal visible={savingArticle} transparent animationType="fade">
        <View style={styles.savingOverlay}>
          <View style={styles.savingCard}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.savingTitle}>Saving Article</Text>
            <Text style={styles.savingStatus}>{savingStatus}</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFBFF',
  },
  savingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  savingCard: {
    backgroundColor: '#1A1D3A',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 14,
    width: 260,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  savingTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  savingStatus: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    textAlign: 'center',
  },
});
