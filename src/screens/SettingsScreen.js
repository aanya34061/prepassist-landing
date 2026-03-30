/**
 * SettingsScreen – Glassmorphic Redesign
 * UI: Gradient hero header · glass section cards · premium visual hierarchy
 */
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getSettings, updateSettings, clearAllData } from '../utils/storage';
import {
  scheduleDailyReminder,
  cancelAllReminders,
  requestNotificationPermissions,
} from '../utils/notifications';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../features/Reference/theme/ThemeContext';
import { useWebStyles } from '../components/WebContainer';

export default function SettingsScreen({ navigation }) {
  const { user, signOut, deleteAccount } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { horizontalPadding } = useWebStyles();
  const [settings, setSettings] = useState({
    reminderEnabled: false,
    reminderTime: '09:00',
    language: 'English',
  });
  const [loading, setLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    const data = await getSettings();
    setSettings(data);
    setLoading(false);
  };

  const handleReminderToggle = async (value) => {
    if (value) {
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        Alert.alert('Permission Required',
          'Please enable notifications in your device settings to receive daily reminders.',
          [{ text: 'OK' }]);
        return;
      }
      const [hour, minute] = settings.reminderTime.split(':').map(Number);
      const success = await scheduleDailyReminder(hour, minute);
      if (success) {
        setSettings({ ...settings, reminderEnabled: true });
        Alert.alert('Reminder Set! 🔔', `You'll receive a daily reminder at ${settings.reminderTime}`, [{ text: 'Great!' }]);
      }
    } else {
      await cancelAllReminders();
      setSettings({ ...settings, reminderEnabled: false });
    }
  };

  const handleTimeChange = async (time) => {
    setSettings({ ...settings, reminderTime: time });
    await updateSettings({ reminderTime: time });
    if (settings.reminderEnabled) {
      const [hour, minute] = time.split(':').map(Number);
      await scheduleDailyReminder(hour, minute);
    }
  };


  const handleClearData = () => {
    Alert.alert('Clear All Data',
      'This will delete all your progress, saved questions, and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: async () => {
          const success = await clearAllData();
          if (success) { Alert.alert('Done', 'All data has been cleared.'); loadSettings(); }
        }},
      ]
    );
  };

  const handleSignOut = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) {
        try { setIsSigningOut(true); await signOut(); } catch { /* ignore */ }
        setIsSigningOut(false);
      }
      return;
    }
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        try { setIsSigningOut(true); await signOut(); } catch { /* ignore */ }
        setIsSigningOut(false);
      }},
    ]);
  };

  const handleDeleteAccount = async () => {
    const doDelete = async () => {
      try {
        setIsDeletingAccount(true);
        await deleteAccount();
        // deleteAccount sets user to null, which triggers navigation to login screen
      } catch (e) {
        setIsDeletingAccount(false);
        if (Platform.OS === 'web') {
          window.alert('Failed to delete account. Please try again.');
        } else {
          Alert.alert('Error', 'Failed to delete account. Please try again.');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('This will permanently delete your account and all associated data. This action cannot be undone.')) {
        if (window.confirm('Are you absolutely sure? All your progress, saved questions, and settings will be permanently deleted.')) {
          await doDelete();
        }
      }
      return;
    }
    Alert.alert('Delete Account',
      'This will permanently delete your account and all associated data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {
          Alert.alert('Are you absolutely sure?',
            'All your progress, saved questions, and settings will be permanently deleted.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Yes, Delete My Account', style: 'destructive', onPress: doDelete },
            ]
          );
        }},
      ]
    );
  };

  const getProviderIcon = (size = 15) => {
    switch (user?.provider) {
      case 'google': return <Ionicons name="logo-google" size={size} color="#EA4335" />;
      case 'apple':  return <Ionicons name="logo-apple"  size={size} color={isDark ? '#FFF' : '#000'} />;
      case 'guest':  return <Ionicons name="person-outline" size={size} color="#9CA3AF" />;
      default:       return <Ionicons name="mail-outline"   size={size} color="#2A7DEB" />;
    }
  };

  const getProviderName = () => {
    switch (user?.provider) {
      case 'google': return 'Google'; case 'apple': return 'Apple';
      case 'guest':  return 'Guest Account'; default: return 'Email';
    }
  };

  const timeOptions = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','18:00','19:00','20:00','21:00'];

  const formatTime = (time) => {
    const [hour, minute] = time.split(':');
    const h = parseInt(hour);
    return `${h % 12 || 12}:${minute} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  // ── Theme helpers ──────────────────────────────────────────────────────────
  const PAD       = horizontalPadding || 20;
  const bgColor   = isDark ? '#07091A' : '#F5F1EB';
  const glassBg   = isDark ? 'rgba(255,255,255,0.065)' : 'rgba(255,255,255,0.80)';
  const glassBdr  = isDark ? 'rgba(255,255,255,0.135)' : 'rgba(255,255,255,0.95)';
  const textMain  = isDark ? '#F0F0FF' : '#333333';
  const textSub   = isDark ? 'rgba(240,240,255,0.55)' : '#3D565E';
  const divColor  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: bgColor }]}>
        <LinearGradient colors={isDark ? ['#07091A', '#0F1335'] : ['#F5F1EB', '#E6D1B5']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#2A7DEB" />
          <Text style={[styles.loadingText, { color: textSub }]}>Loading settings…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: bgColor }]}>
      {/* Background gradient */}
      <LinearGradient
        colors={isDark ? ['#07091A', '#0F1335', '#080E28'] : ['#F5F1EB', '#E6D1B5', '#F0EAE0']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Subtle orb */}
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={isDark ? ['rgba(42,125,235,0.28)', 'transparent'] : ['rgba(42,125,235,0.22)', 'transparent']}
          style={styles.settingsOrb}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: PAD }]}
        >

          {/* ── Hero Header ─────────────────────────────────────────────── */}
          <LinearGradient
            colors={isDark ? ['#0C2D5E', '#0E2478', '#0A1850'] : ['#2A7DEB', '#3B9AFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroHeader}
          >
            <View style={styles.heroShimmer} />
            <View style={styles.heroRow}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.9)" />
              </TouchableOpacity>
              <View style={styles.heroTitleBlock}>
                <Text style={styles.heroTitle}>Settings</Text>
                <Text style={styles.heroSubtitle}>Customize your experience</Text>
              </View>
              <LinearGradient colors={['rgba(255,255,255,0.32)', 'rgba(255,255,255,0.14)']} style={styles.heroAvatar}>
                <Text style={styles.heroAvatarText}>
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </LinearGradient>
            </View>
          </LinearGradient>

          {/* ── Account Card ─────────────────────────────────────────────── */}
          <Text style={[styles.sectionLabel, { color: textSub }]}>ACCOUNT</Text>
          <View style={[styles.glassCard, { backgroundColor: glassBg, borderColor: glassBdr }]}>
            <View style={styles.cardShimmer} />
            <View style={styles.profileRow}>
              <LinearGradient
                colors={['#2A7DEB', '#5EC7B2']}
                style={styles.profileAvatar}
              >
                <Text style={styles.profileInitial}>
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </LinearGradient>
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: textMain }]} numberOfLines={1}>
                  {user?.name || 'UPSC Aspirant'}
                </Text>
                <View style={styles.providerRow}>
                  {getProviderIcon(13)}
                  <Text style={[styles.providerText, { color: textSub }]}>
                    {user?.isGuest ? 'Guest Mode' : `Signed in via ${getProviderName()}`}
                  </Text>
                </View>
                {user?.email && !user?.isGuest && (
                  <Text style={[styles.profileEmail, { color: textSub }]} numberOfLines={1}>{user.email}</Text>
                )}
              </View>
            </View>
          </View>

          {user?.isGuest && (
            <View style={styles.guestBanner}>
              <LinearGradient colors={['rgba(245,158,11,0.18)', 'rgba(245,158,11,0.10)']} style={StyleSheet.absoluteFillObject} />
              <View style={styles.guestBannerBorder} />
              <Ionicons name="alert-circle" size={20} color="#F59E0B" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.guestBannerTitle}>Limited Access</Text>
                <Text style={styles.guestBannerText}>
                  Sign in with Google or Apple to sync your progress across devices.
                </Text>
              </View>
            </View>
          )}

          {/* ── Appearance ───────────────────────────────────────────────── */}
          <Text style={[styles.sectionLabel, { color: textSub }]}>APPEARANCE</Text>
          <View style={[styles.glassCard, { backgroundColor: glassBg, borderColor: glassBdr }]}>
            <View style={styles.cardShimmer} />
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <LinearGradient
                  colors={isDark ? ['#312E81', '#1A5DB8'] : ['#FFF3C4', '#FFE082']}
                  style={styles.iconBubble}
                >
                  <Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color={isDark ? '#5EC7B2' : '#F59E0B'} />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingTitle, { color: textMain }]}>Dark Mode</Text>
                  <Text style={[styles.settingDesc, { color: textSub }]}>
                    {isDark ? 'Dark theme active' : 'Light theme active'}
                  </Text>
                </View>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: isDark ? 'rgba(255,255,255,0.15)' : '#E5E5EA', true: '#2A7DEB' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={isDark ? 'rgba(255,255,255,0.15)' : '#E5E5EA'}
              />
            </View>
          </View>

          {/* ── Notifications ────────────────────────────────────────────── */}
          <Text style={[styles.sectionLabel, { color: textSub }]}>NOTIFICATIONS</Text>
          <View style={[styles.glassCard, { backgroundColor: glassBg, borderColor: glassBdr }]}>
            <View style={styles.cardShimmer} />
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <LinearGradient colors={['#FF4757', '#FF6B81']} style={styles.iconBubble}>
                  <Ionicons name="notifications" size={18} color="#FFF" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingTitle, { color: textMain }]}>Daily Reminder</Text>
                  <Text style={[styles.settingDesc, { color: textSub }]}>Get notified to practice daily</Text>
                </View>
              </View>
              <Switch
                value={settings.reminderEnabled}
                onValueChange={handleReminderToggle}
                trackColor={{ false: isDark ? 'rgba(255,255,255,0.15)' : '#E5E5EA', true: '#10B981' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={isDark ? 'rgba(255,255,255,0.15)' : '#E5E5EA'}
              />
            </View>

            {settings.reminderEnabled && (
              <>
                <View style={[styles.rowDivider, { backgroundColor: divColor }]} />
                <View style={styles.timePicker}>
                  <Text style={[styles.timePickerLabel, { color: textSub }]}>Reminder Time</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeScroll}>
                    {timeOptions.map((time) => {
                      const isActive = settings.reminderTime === time;
                      return (
                        <TouchableOpacity
                          key={time}
                          onPress={() => handleTimeChange(time)}
                          style={[
                            styles.timeChip,
                            {
                              backgroundColor: isActive
                                ? isDark ? 'rgba(42,125,235,0.3)' : 'rgba(42,125,235,0.12)'
                                : isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                              borderColor: isActive
                                ? '#2A7DEB'
                                : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                            },
                          ]}
                        >
                          <Text style={[
                            styles.timeChipText,
                            { color: isActive ? '#5EC7B2' : textSub },
                          ]}>
                            {formatTime(time)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </>
            )}
          </View>

          {/* ── Offline info ─────────────────────────────────────────────── */}
          <Text style={[styles.sectionLabel, { color: textSub }]}>OFFLINE MODE</Text>
          <View style={styles.infoBanner}>
            <LinearGradient colors={['rgba(75,75,75,0.14)', 'rgba(75,75,75,0.07)']} style={StyleSheet.absoluteFillObject} />
            <View style={[styles.infoBannerBorder, { backgroundColor: 'rgba(100,100,100,0.35)' }]} />
            <LinearGradient colors={['#4B5563', '#374151']} style={styles.infoBannerIcon}>
              <Ionicons name="cloud-offline" size={19} color="#FFF" />
            </LinearGradient>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.infoTitle, { color: isDark ? '#D1D5DB' : '#374151' }]}>Works Offline!</Text>
              <Text style={[styles.infoText, { color: textSub }]}>
                Your saved questions in the Question Bank are available offline.
                Save questions while online to practice anytime.
              </Text>
            </View>
          </View>

          {/* ── Data Management ──────────────────────────────────────────── */}
          <Text style={[styles.sectionLabel, { color: textSub }]}>DATA MANAGEMENT</Text>
          <View style={[styles.glassCard, { backgroundColor: glassBg, borderColor: glassBdr }]}>
            <View style={styles.cardShimmer} />
            <TouchableOpacity style={styles.actionRow} onPress={handleClearData}>
              <LinearGradient colors={['#EF4444', '#B91C1C']} style={styles.iconBubble}>
                <Ionicons name="trash" size={18} color="#FFF" />
              </LinearGradient>
              <View style={styles.actionInfo}>
                <Text style={[styles.settingTitle, { color: '#EF4444' }]}>Clear All Data</Text>
                <Text style={[styles.settingDesc, { color: textSub }]}>Delete all progress and saved data</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={isDark ? 'rgba(255,255,255,0.3)' : '#C0C0C0'} />
            </TouchableOpacity>
          </View>

          {/* ── About ────────────────────────────────────────────────────── */}
          <Text style={[styles.sectionLabel, { color: textSub }]}>ABOUT</Text>
          <View style={[styles.glassCard, { backgroundColor: glassBg, borderColor: glassBdr }]}>
            <View style={styles.cardShimmer} />
            <View style={styles.aboutRow}>
              <Text style={[styles.aboutLabel, { color: textMain }]}>App Version</Text>
              <View style={[styles.versionBadge, { backgroundColor: isDark ? 'rgba(42,125,235,0.2)' : 'rgba(42,125,235,0.1)' }]}>
                <Text style={styles.versionText}>1.0.0</Text>
              </View>
            </View>
            <View style={[styles.rowDivider, { backgroundColor: divColor }]} />
            <View style={styles.aboutRow}>
              <Text style={[styles.aboutLabel, { color: textMain }]}>Platform</Text>
              <Text style={[styles.aboutValue, { color: textSub }]}>
                {Platform.OS === 'ios' ? 'iOS' : 'Android'}
              </Text>
            </View>
          </View>

          {/* ── Account Actions ───────────────────────────────────────────── */}
          <Text style={[styles.sectionLabel, { color: textSub }]}>ACCOUNT ACTIONS</Text>
          <View style={[styles.glassCard, { backgroundColor: glassBg, borderColor: glassBdr }]}>
            <View style={styles.cardShimmer} />

            {/* Sign out */}
            <TouchableOpacity style={styles.actionRow} onPress={handleSignOut} disabled={isSigningOut}>
              <LinearGradient colors={['#3B82F6', '#1D4ED8']} style={styles.iconBubble}>
                <Ionicons name="log-out" size={18} color="#FFF" />
              </LinearGradient>
              <View style={styles.actionInfo}>
                <Text style={[styles.settingTitle, { color: textMain }]}>Sign Out</Text>
                <Text style={[styles.settingDesc, { color: textSub }]}>Sign out of your account</Text>
              </View>
              {isSigningOut
                ? <ActivityIndicator size="small" color="#2A7DEB" />
                : <Ionicons name="chevron-forward" size={18} color={isDark ? 'rgba(255,255,255,0.3)' : '#C0C0C0'} />
              }
            </TouchableOpacity>

            <View style={[styles.rowDivider, { backgroundColor: divColor, marginVertical: 8 }]} />

            {/* Delete account */}
            <TouchableOpacity style={styles.actionRow} onPress={handleDeleteAccount} disabled={isDeletingAccount}>
              <LinearGradient colors={['#EF4444', '#B91C1C']} style={styles.iconBubble}>
                <Ionicons name="warning" size={18} color="#FFF" />
              </LinearGradient>
              <View style={styles.actionInfo}>
                <Text style={[styles.settingTitle, { color: '#EF4444' }]}>Delete Account</Text>
                <Text style={[styles.settingDesc, { color: textSub }]}>Permanently delete your account</Text>
              </View>
              {isDeletingAccount
                ? <ActivityIndicator size="small" color="#EF4444" />
                : <Ionicons name="chevron-forward" size={18} color={isDark ? 'rgba(255,255,255,0.3)' : '#C0C0C0'} />
              }
            </TouchableOpacity>
          </View>

          {/* ── Pro Tips ─────────────────────────────────────────────────── */}
          <View style={styles.tipsBanner}>
            <LinearGradient colors={['rgba(245,158,11,0.16)', 'rgba(245,158,11,0.08)']} style={StyleSheet.absoluteFillObject} />
            <View style={styles.tipsBannerBorder} />
            <View style={styles.tipsHeader}>
              <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.tipsIconBubble}>
                <Ionicons name="bulb" size={15} color="#FFF" />
              </LinearGradient>
              <Text style={styles.tipsTitle}>Pro Tips</Text>
            </View>
            {[
              'Practice daily to maintain your streak',
              'Save important questions for revision',
              'Use tags to organize your Question Bank',
              'Enable reminders to stay consistent',
            ].map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <View style={styles.tipDot} />
                <Text style={[styles.tipText, { color: textSub }]}>{tip}</Text>
              </View>
            ))}
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  settingsOrb: {
    position: 'absolute', width: 340, height: 340, borderRadius: 170,
    top: -80, right: -80,
  },

  loadingState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 },
  loadingText: { fontSize: 15, fontWeight: '500' },

  scrollContent: { paddingTop: 0, paddingBottom: 48 },

  // Hero
  heroHeader: {
    paddingTop: 16, paddingHorizontal: 20, paddingBottom: 24,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    marginBottom: 24, overflow: 'hidden',
  },
  heroShimmer: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 1,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)',
    justifyContent: 'center', alignItems: 'center',
  },
  heroTitleBlock: { flex: 1 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#FFF', letterSpacing: -0.8 },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  heroAvatar: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.42)',
    justifyContent: 'center', alignItems: 'center',
  },
  heroAvatarText: { fontSize: 20, fontWeight: '800', color: '#FFF' },

  // Section labels
  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.2,
    marginBottom: 10, marginTop: 20, marginLeft: 4,
  },

  // Glass card
  glassCard: {
    borderRadius: 22, borderWidth: 1, overflow: 'hidden',
    shadowColor: 'rgba(42,125,235,0.2)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 8,
    marginBottom: 4,
  },
  cardShimmer: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 1,
  },

  // Profile
  profileRow: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14 },
  profileAvatar: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
  },
  profileInitial: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '700', letterSpacing: -0.4, marginBottom: 4 },
  providerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  providerText: { fontSize: 13, fontWeight: '500' },
  profileEmail: { fontSize: 12, marginTop: 1 },

  // Guest banner
  guestBanner: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 16, borderRadius: 18, marginBottom: 4,
    overflow: 'hidden', position: 'relative',
  },
  guestBannerBorder: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1.5,
    backgroundColor: 'rgba(245,158,11,0.35)',
  },
  guestBannerTitle: { fontSize: 14, fontWeight: '700', color: '#F59E0B', marginBottom: 2 },
  guestBannerText: { fontSize: 12, color: 'rgba(245,158,11,0.8)', lineHeight: 17 },

  // Settings row
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 14 },
  settingTitle: { fontSize: 16, fontWeight: '600', letterSpacing: -0.3, marginBottom: 2 },
  settingDesc: { fontSize: 12, fontWeight: '400' },

  iconBubble: {
    width: 40, height: 40, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center',
  },

  rowDivider: { height: 1, marginHorizontal: 18 },

  // Time picker
  timePicker: { padding: 16 },
  timePickerLabel: { fontSize: 13, fontWeight: '600', marginBottom: 12, letterSpacing: 0.1 },
  timeScroll: { marginHorizontal: -16, paddingHorizontal: 16 },
  timeChip: {
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 12, marginRight: 8,
    borderWidth: 1.5,
  },
  timeChipText: { fontSize: 13, fontWeight: '600' },

  // Action rows
  actionRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  actionInfo: { flex: 1 },

  // Info banner
  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 18, borderRadius: 20, marginBottom: 4,
    overflow: 'hidden', position: 'relative',
  },
  infoBannerBorder: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1.5,
    backgroundColor: 'rgba(42,125,235,0.4)',
  },
  infoBannerIcon: {
    width: 40, height: 40, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  infoTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  infoText: { fontSize: 13, lineHeight: 19 },

  // About
  aboutRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  aboutLabel: { fontSize: 16, fontWeight: '500' },
  aboutValue: { fontSize: 15, fontWeight: '400' },
  versionBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  versionText: { fontSize: 13, fontWeight: '700', color: '#5EC7B2' },

  // Tips
  tipsBanner: {
    padding: 20, borderRadius: 22, marginTop: 4, marginBottom: 8,
    overflow: 'hidden', position: 'relative',
  },
  tipsBannerBorder: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1.5,
    backgroundColor: 'rgba(245,158,11,0.35)',
  },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  tipsIconBubble: {
    width: 32, height: 32, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  tipsTitle: { fontSize: 16, fontWeight: '700', color: '#F59E0B' },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  tipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F59E0B', marginTop: 6 },
  tipText: { fontSize: 14, lineHeight: 21, flex: 1 },
});
