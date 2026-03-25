import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  Platform,
  Easing,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isDesktop = isWeb && width > 768;
const isTablet = isWeb && width > 600;

// ─── PrepAssist Logo ───────────────────────────────────────────
const PrepAssistLogo = ({ small }) => (
  <View style={styles.logoRow}>
    <Image
      source={require('../../assets/icon.png')}
      style={{ width: small ? 24 : 32, height: small ? 24 : 32, borderRadius: small ? 6 : 8 }}
      resizeMode="contain"
    />
    <Text style={[styles.logoText, small && { fontSize: 14 }]}>
      Prep<Text style={styles.logoTextLight}>Assist</Text>
    </Text>
  </View>
);

// ─── Animated Counter ──────────────────────────────────────────
const AnimatedCounter = ({ end, suffix = '', duration = 2000 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [end, duration]);

  return (
    <Text style={styles.statNumber}>
      {count.toLocaleString()}{suffix}
    </Text>
  );
};

// ─── Feature Card ──────────────────────────────────────────────
const FeatureCard = ({ icon, title, description, iconBg }) => {
  const bgColor = iconBg === 'orange' ? 'rgba(245,166,35,0.1)' : iconBg === 'green' ? 'rgba(16,185,129,0.1)' : 'rgba(33,150,243,0.1)';
  const iconColor = iconBg === 'orange' ? '#F5A623' : iconBg === 'green' ? '#10B981' : '#2196F3';

  return (
    <View style={styles.featureCard}>
      <View style={[styles.featureIconBox, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDesc}>{description}</Text>
    </View>
  );
};

// ─── Testimonial Card ──────────────────────────────────────────
const TestimonialCard = ({ name, role, content }) => (
  <View style={styles.testimonialCard}>
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map(i => (
        <Ionicons key={i} name="star" size={14} color="#FACC15" />
      ))}
    </View>
    <Text style={styles.testimonialContent}>"{content}"</Text>
    <View style={styles.testimonialAuthor}>
      <View style={styles.testimonialAvatar}>
        <Text style={styles.testimonialInitials}>
          {name.split(' ').map(n => n[0]).join('')}
        </Text>
      </View>
      <View>
        <Text style={styles.testimonialName}>{name}</Text>
        <Text style={styles.testimonialRole}>{role}</Text>
      </View>
    </View>
  </View>
);

// ─── Phone Mockup ──────────────────────────────────────────────
const PhoneMockup = () => {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -15, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.phoneContainer, { transform: [{ translateY: floatAnim }] }]}>
      <View style={styles.phoneMockup}>
        <View style={styles.phoneScreen}>
          {/* Dynamic Island */}
          <View style={styles.dynamicIsland}>
            <View style={styles.dynamicIslandPill} />
          </View>

          {/* App Header */}
          <View style={styles.phoneHeader}>
            <Ionicons name="chevron-back" size={14} color="#94A3B8" />
            <Text style={styles.phoneSubject}>Modern History</Text>
            <Text style={styles.phoneBadgeText}>12/20</Text>
          </View>

          {/* Question */}
          <View style={styles.phoneQuestion}>
            <Text style={styles.phoneQLabel}>QUESTION 13</Text>
            <Text style={styles.phoneQText}>Which of the following introduced the principle of communal representation in India?</Text>
          </View>

          {/* Options */}
          <View style={styles.phoneOptions}>
            <View style={styles.phoneOption}>
              <View style={styles.phoneOptBadge}>
                <Text style={styles.phoneOptBadgeText}>A</Text>
              </View>
              <Text style={styles.phoneOptText}>Indian Councils Act, 1892</Text>
            </View>
            <View style={[styles.phoneOption, styles.phoneOptionCorrect]}>
              <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
              <Text style={[styles.phoneOptText, { color: '#065F46', fontWeight: '600' }]}>Indian Councils Act, 1909</Text>
            </View>
            <View style={styles.phoneOption}>
              <View style={styles.phoneOptBadge}>
                <Text style={styles.phoneOptBadgeText}>C</Text>
              </View>
              <Text style={styles.phoneOptText}>Government of India Act, 1919</Text>
            </View>
          </View>

          {/* Next Button */}
          <View style={styles.phoneNextBtn}>
            <Text style={styles.phoneNextBtnText}>Next Question</Text>
          </View>
        </View>
      </View>

      {/* Floating Notifications */}
      <View style={[styles.notifPopup, { top: 60, right: -20 }]}>
        <View style={[styles.notifIcon, { backgroundColor: '#FFF7ED' }]}>
          <Ionicons name="trophy" size={14} color="#F97316" />
        </View>
        <View>
          <Text style={styles.notifTitle}>Streak Maintained!</Text>
          <Text style={styles.notifSub}>12 days in a row</Text>
        </View>
      </View>

      <View style={[styles.notifPopup, { bottom: 100, left: -20 }]}>
        <View style={[styles.notifIcon, { backgroundColor: '#F0FDF4' }]}>
          <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
        </View>
        <View>
          <Text style={styles.notifTitle}>AI Analysis Ready</Text>
          <Text style={styles.notifSub}>Evaluation complete</Text>
        </View>
      </View>
    </Animated.View>
  );
};

// ─── Grid Background ───────────────────────────────────────────
const GridBackground = () => (
  <View style={styles.gridBg} pointerEvents="none">
    {[...Array(10)].map((_, i) => (
      <View key={`v${i}`} style={[styles.gridLineV, { left: `${(i + 1) * 9}%` }]} />
    ))}
    {[...Array(6)].map((_, i) => (
      <View key={`h${i}`} style={[styles.gridLineH, { top: `${(i + 1) * 14}%` }]} />
    ))}
  </View>
);

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function LandingScreen({ navigation }) {
  const { isAuthenticated } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollRef = useRef(null);
  const [featuresY, setFeaturesY] = useState(0);
  const [testimonialsY, setTestimonialsY] = useState(0);

  // If already logged in, go straight to app; otherwise go to login
  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigation.navigate('Main', { screen: 'NewHome' });
    } else {
      navigation.navigate('Login');
    }
  };

  const features = [
    { icon: 'hardware-chip-outline', title: 'Adaptive Question Engine', description: 'Our AI parses The Hindu, Indian Express, and NCERTs to generate exam-ready MCQs. It adapts difficulty based on your performance history.', iconBg: 'blue' },
    { icon: 'document-text-outline', title: 'Mains Evaluator', description: 'Get feedback on structure, vocabulary, and relevance in seconds. We grade against topper copies.', iconBg: 'orange' },
    { icon: 'flash-outline', title: 'Smart News Feed', description: 'Auto-tagged current affairs filtered specifically for syllabus relevance.', iconBg: 'blue' },
    { icon: 'map-outline', title: 'Dynamic Roadmap', description: "Missed a day? Our scheduler automatically adjusts your plan to keep you on track.", iconBg: 'orange' },
    { icon: 'stats-chart-outline', title: 'Progress Analytics', description: 'Track performance with beautiful dashboards, identify weak areas and optimize your study time.', iconBg: 'green' },
    { icon: 'bulb-outline', title: 'AI Study Assistant', description: 'Get instant explanations, summaries, and personalized study recommendations.', iconBg: 'blue' },
  ];

  const testimonials = [
    { name: 'Priya Sharma', role: 'UPSC CSE 2024 - AIR 47', content: 'This platform transformed my preparation. The AI-generated MCQs helped me identify weak areas I never knew existed.' },
    { name: 'Rahul Krishnan', role: 'UPSC CSE 2024 - AIR 156', content: 'The roadmap feature is a game-changer. I could finally see my entire preparation journey mapped out clearly.' },
    { name: 'Ananya Gupta', role: 'UPSC CSE 2024 - AIR 289', content: 'Daily current affairs with smart summaries saved me hours every day. Absolutely essential for serious aspirants.' },
  ];

  const stats = [
    { value: 15000, suffix: '+', label: 'Active Aspirants' },
    { value: 500, suffix: '+', label: 'Success Stories' },
    { value: 98, suffix: '%', label: 'Satisfaction Rate' },
    { value: 2, suffix: 'M+', label: 'MCQs Generated' },
  ];

  return (
    <View style={styles.container}>
      <GridBackground />

      {/* ── Navbar ─────────────────────────────────── */}
      <View style={styles.navbarOuter}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.navbar}>
            <PrepAssistLogo />

            {/* Desktop Links */}
            {isDesktop && (
              <View style={styles.navLinks}>
                <TouchableOpacity onPress={() => scrollRef.current?.scrollTo({ y: featuresY, animated: true })}>
                  <Text style={styles.navLink}>FEATURES</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => scrollRef.current?.scrollTo({ y: testimonialsY, animated: true })}>
                  <Text style={styles.navLink}>TESTIMONIALS</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('Billing')}>
                  <Text style={styles.navLink}>PRICING</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.navButtons}>
              {isDesktop && (
                <TouchableOpacity onPress={handleGetStarted}>
                  <Text style={styles.navLoginText}>Log in</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.navSignUpBtn} onPress={handleGetStarted}>
                <Text style={styles.navSignUpText}>Sign Up</Text>
              </TouchableOpacity>
              {!isDesktop && (
                <TouchableOpacity onPress={() => setMenuOpen(!menuOpen)} style={{ marginLeft: 8 }}>
                  <Ionicons name={menuOpen ? 'close' : 'menu'} size={24} color="#1A1F36" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Mobile Menu */}
          {menuOpen && !isDesktop && (
            <View style={styles.mobileMenu}>
              <TouchableOpacity onPress={() => { setMenuOpen(false); scrollRef.current?.scrollTo({ y: featuresY, animated: true }); }}>
                <Text style={styles.mobileMenuLink}>Features</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setMenuOpen(false); scrollRef.current?.scrollTo({ y: testimonialsY, animated: true }); }}>
                <Text style={styles.mobileMenuLink}>Testimonials</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setMenuOpen(false); navigation.navigate('Billing'); }}>
                <Text style={styles.mobileMenuLink}>Pricing</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mobileSignUpBtn} onPress={() => { setMenuOpen(false); handleGetStarted(); }}>
                <Text style={styles.mobileSignUpText}>Sign Up</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setMenuOpen(false); handleGetStarted(); }}>
                <Text style={[styles.mobileMenuLink, { textAlign: 'center', color: '#94A3B8' }]}>Log in</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </View>

      {/* ── Scrollable Content ─────────────────────── */}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Section ─────────────────────────── */}
        <View style={styles.heroSection}>
          <View style={[styles.heroRow, isDesktop && { flexDirection: 'row' }]}>
            {/* Left Content */}
            <View style={[styles.heroContent, isDesktop && { flex: 1, maxWidth: 460 }]}>
              {/* Badge */}
              <View style={styles.heroBadge}>
                <View style={styles.heroBadgeDot} />
                <Text style={styles.heroBadgeText}>NEW: MAINS AI EVALUATOR 2.0</Text>
              </View>

              {/* Headline */}
              <Text style={styles.heroTitle}>
                Crack UPSC Smarter{'\n'}
                <Text style={styles.heroTitleBlue}>With AI Powered Learning.</Text>
              </Text>

              {/* Subtitle */}
              <Text style={styles.heroSubtitle}>
                The only AI-powered operating system for serious aspirants. Generate quizzes from news, get instant answer feedback, and visualize your progress.
              </Text>

              {/* CTA Buttons */}
              <View style={styles.heroButtons}>
                <TouchableOpacity style={styles.btnPrimary} onPress={handleGetStarted}>
                  <Text style={styles.btnPrimaryText}>Start Learning Free</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnSecondary} onPress={() => navigation.navigate('Billing')}>
                  <Ionicons name="play" size={14} color="#1A1F36" />
                  <Text style={styles.btnSecondaryText}>Watch Demo</Text>
                </TouchableOpacity>
              </View>

              {/* Trust Indicators */}
              <View style={styles.trustRow}>
                <View style={styles.avatarStack}>
                  {['A', 'B', 'C', 'D'].map((letter, i) => (
                    <View key={i} style={[styles.avatarCircle, { marginLeft: i === 0 ? 0 : -8, zIndex: 4 - i }]}>
                      <Text style={styles.avatarEmoji}>
                        {['👩‍🎓', '👨‍💼', '👩‍💻', '👨‍🎓'][i]}
                      </Text>
                    </View>
                  ))}
                </View>
                <View>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <Ionicons key={i} name="star" size={12} color="#FACC15" />
                    ))}
                  </View>
                  <Text style={styles.trustText}>
                    <Text style={styles.trustBold}>15,000+</Text> aspirants trusting us
                  </Text>
                </View>
              </View>
            </View>

            {/* Right - Phone Mockup */}
            {isDesktop && (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <PhoneMockup />
              </View>
            )}
          </View>
        </View>

        {/* ── Stats Section ────────────────────────── */}
        <View style={styles.statsSection}>
          <View style={[styles.statsGrid, isTablet && { flexDirection: 'row' }]}>
            {stats.map((stat, i) => (
              <View key={i} style={styles.statItem}>
                <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Features Section ─────────────────────── */}
        <View
          style={styles.featuresSection}
          onLayout={(e) => setFeaturesY(e.nativeEvent.layout.y)}
        >
          <Text style={styles.sectionTitle}>
            A complete operating system{'\n'}
            <Text style={styles.sectionTitleLight}>for your preparation.</Text>
          </Text>
          <Text style={styles.sectionSubtitle}>
            We combined the best study tools into one cohesive platform. No more switching between apps.
          </Text>

          <View style={[styles.featuresGrid, isTablet && { flexDirection: 'row', flexWrap: 'wrap' }]}>
            {features.map((f, i) => (
              <View key={i} style={[styles.featureCardWrap, isTablet && { width: isDesktop ? '31%' : '48%' }]}>
                <FeatureCard {...f} />
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.viewAllLink} onPress={() => navigation.navigate('Billing')}>
            <Text style={styles.viewAllText}>View all features</Text>
            <Ionicons name="arrow-forward" size={14} color="#2196F3" />
          </TouchableOpacity>
        </View>

        {/* ── Testimonials Section ─────────────────── */}
        <View
          style={styles.testimonialsSection}
          onLayout={(e) => setTestimonialsY(e.nativeEvent.layout.y)}
        >
          <Text style={[styles.sectionTitle, { textAlign: 'center' }]}>
            Loved by India's{'\n'}
            <Text style={styles.heroTitleBlue}>top achievers</Text>
          </Text>
          <Text style={[styles.sectionSubtitle, { textAlign: 'center', alignSelf: 'center' }]}>
            Join thousands of aspirants who cleared UPSC with our platform.
          </Text>

          <View style={[styles.testimonialsGrid, isTablet && { flexDirection: 'row' }]}>
            {testimonials.map((t, i) => (
              <View key={i} style={[styles.testimonialWrap, isTablet && { flex: 1 }]}>
                <TestimonialCard {...t} />
              </View>
            ))}
          </View>
        </View>

        {/* ── CTA Section ──────────────────────────── */}
        <View style={styles.ctaOuter}>
          <View style={styles.ctaCard}>
            <Text style={styles.ctaTitle}>Ready to streamline your prep?</Text>
            <Text style={styles.ctaSubtitle}>
              Join thousands of serious aspirants using AI to clear the toughest exam in the world.
            </Text>
            <View style={styles.ctaButtons}>
              <TouchableOpacity style={styles.ctaPrimaryBtn} onPress={handleGetStarted}>
                <Text style={styles.ctaPrimaryText}>Get Started Free</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ctaSecondaryBtn} onPress={() => navigation.navigate('Billing')}>
                <Text style={styles.ctaSecondaryText}>View Pricing</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Footer ───────────────────────────────── */}
        <View style={styles.footer}>
          <View style={[styles.footerInner, isDesktop && { flexDirection: 'row' }]}>
            <PrepAssistLogo small />
            <Text style={styles.footerCopy}>© 2026 PrepAssist. All rights reserved. Built with ❤️ for aspirants.</Text>
            <View style={styles.footerLinks}>
              <Text style={styles.footerLink}>Privacy</Text>
              <Text style={styles.footerLink}>Terms</Text>
              <Text style={styles.footerLink}>Contact</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  // Grid background
  gridBg: {
    position: 'absolute', top: 0, left: 0, right: 0, height: '60%',
    overflow: 'hidden', zIndex: 0,
  },
  gridLineV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(0,0,0,0.03)' },
  gridLineH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(0,0,0,0.03)' },

  // Logo
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoIcon: { width: 32, height: 32, position: 'relative' },
  logoArrowOrange: {
    position: 'absolute', left: 2, top: 4,
    width: 0, height: 0,
    borderLeftWidth: 8, borderRightWidth: 8, borderBottomWidth: 20,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#F5A623',
    transform: [{ rotate: '180deg' }],
  },
  logoArrowBlue: {
    position: 'absolute', right: 2, top: 4,
    width: 0, height: 0,
    borderLeftWidth: 8, borderRightWidth: 8, borderBottomWidth: 20,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#2196F3',
  },
  logoText: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  logoTextLight: { fontWeight: '500', color: '#64748B' },

  // Navbar
  navbarOuter: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 6 : 10,
  },
  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)',
    ...Platform.select({
      web: { backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: '0 4px 30px rgba(0,0,0,0.05)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 4 },
    }),
  },
  navLinks: { flexDirection: 'row', gap: 28 },
  navLink: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  navButtons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navLoginText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  navSignUpBtn: { backgroundColor: '#2196F3', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  navSignUpText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  // Mobile Menu
  mobileMenu: {
    marginTop: 12, backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20, padding: 20, gap: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)',
    ...Platform.select({
      web: { backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' },
      default: {},
    }),
  },
  mobileMenuLink: { fontSize: 15, color: '#64748B', fontWeight: '500' },
  mobileSignUpBtn: { backgroundColor: '#2196F3', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  mobileSignUpText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  // Scroll
  scroll: { flex: 1, zIndex: 1 },
  scrollContent: { paddingTop: Platform.OS === 'ios' ? 110 : 90 },

  // Hero
  heroSection: { paddingHorizontal: 24, paddingTop: 30, paddingBottom: 40, maxWidth: 1100, alignSelf: 'center', width: '100%' },
  heroRow: { alignItems: 'center', gap: 30 },
  heroContent: {},
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(33,150,243,0.08)',
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 100, alignSelf: 'flex-start',
    borderWidth: 1, borderColor: 'rgba(33,150,243,0.2)',
    marginBottom: 24,
  },
  heroBadgeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2196F3' },
  heroBadgeText: { fontSize: 12, fontWeight: '600', color: '#2196F3' },
  heroTitle: {
    fontSize: isWeb ? 52 : 36, fontWeight: '800', color: '#0F172A',
    lineHeight: isWeb ? 58 : 44, letterSpacing: -1.5, marginBottom: 16,
  },
  heroTitleBlue: { color: '#2196F3' },
  heroSubtitle: { fontSize: 16, color: '#64748B', lineHeight: 26, marginBottom: 28, maxWidth: 480 },
  heroButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1A1F36', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12,
    ...Platform.select({
      web: { boxShadow: '0 4px 14px rgba(26,31,54,0.25)' },
      default: { shadowColor: '#1A1F36', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 4 },
    }),
  },
  btnPrimaryText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  btnSecondary: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'transparent', paddingVertical: 14, paddingHorizontal: 28,
    borderRadius: 12, borderWidth: 2, borderColor: '#E2E8F0',
  },
  btnSecondaryText: { fontSize: 15, fontWeight: '600', color: '#0F172A' },

  // Trust
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarStack: { flexDirection: 'row' },
  avatarCircle: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9',
    borderWidth: 2, borderColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 14 },
  starsRow: { flexDirection: 'row', gap: 1, marginBottom: 2 },
  trustText: { fontSize: 12, color: '#64748B' },
  trustBold: { fontWeight: '700', color: '#0F172A' },

  // Phone Mockup
  phoneContainer: { position: 'relative', alignItems: 'center' },
  phoneMockup: {
    width: 260, height: 520, backgroundColor: '#1A1F36',
    borderRadius: 36, padding: 10,
    ...Platform.select({
      web: { boxShadow: '0 50px 100px -20px rgba(0,0,0,0.25), 0 30px 60px -30px rgba(0,0,0,0.3)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 30 }, shadowOpacity: 0.25, shadowRadius: 50, elevation: 20 },
    }),
  },
  phoneScreen: { flex: 1, backgroundColor: '#FFF', borderRadius: 28, overflow: 'hidden', padding: 14 },
  dynamicIsland: { alignItems: 'center', marginBottom: 12 },
  dynamicIslandPill: { width: 70, height: 20, backgroundColor: '#000', borderRadius: 10 },
  phoneHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', marginBottom: 10,
  },
  phoneSubject: { fontSize: 11, fontWeight: '700', color: '#0F172A' },
  phoneBadgeText: { fontSize: 10, fontWeight: '700', color: '#2563EB', backgroundColor: '#EFF6FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  phoneQuestion: {
    backgroundColor: '#EFF6FF', borderRadius: 14, padding: 12, marginBottom: 10,
  },
  phoneQLabel: { fontSize: 9, fontWeight: '700', color: '#2563EB', marginBottom: 4 },
  phoneQText: { fontSize: 10, fontWeight: '600', color: '#0F172A', lineHeight: 14 },
  phoneOptions: { gap: 6 },
  phoneOption: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 8,
  },
  phoneOptionCorrect: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  phoneOptBadge: {
    width: 16, height: 16, borderRadius: 8, backgroundColor: '#F8FAFC',
    borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center',
  },
  phoneOptBadgeText: { fontSize: 7, fontWeight: '700', color: '#64748B' },
  phoneOptText: { fontSize: 9, color: '#475569', flex: 1 },
  phoneNextBtn: {
    backgroundColor: '#0F172A', borderRadius: 10, paddingVertical: 10,
    alignItems: 'center', marginTop: 12,
  },
  phoneNextBtnText: { color: '#FFF', fontSize: 10, fontWeight: '600' },

  // Floating Notifications
  notifPopup: {
    position: 'absolute', backgroundColor: '#FFF', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    ...Platform.select({
      web: { boxShadow: '0 10px 40px rgba(0,0,0,0.15)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
    }),
    zIndex: 20,
  },
  notifIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  notifTitle: { fontSize: 10, fontWeight: '700', color: '#0F172A' },
  notifSub: { fontSize: 9, color: '#94A3B8' },

  // Stats
  statsSection: { paddingVertical: 48, paddingHorizontal: 24, backgroundColor: '#F8FAFC' },
  statsGrid: { maxWidth: 1100, alignSelf: 'center', width: '100%', flexDirection: 'row', flexWrap: 'wrap' },
  statItem: { alignItems: 'center', width: '50%', paddingVertical: 12, ...(isTablet ? { flex: 1, width: 'auto' } : {}) },
  statNumber: { fontSize: isWeb ? 40 : 32, fontWeight: '800', color: '#0F172A', letterSpacing: -1 },
  statLabel: { fontSize: 13, color: '#64748B', marginTop: 4 },

  // Features
  featuresSection: { paddingVertical: 60, paddingHorizontal: 24, maxWidth: 1100, alignSelf: 'center', width: '100%' },
  sectionTitle: {
    fontSize: isWeb ? 40 : 28, fontWeight: '800', color: '#0F172A',
    lineHeight: isWeb ? 48 : 36, letterSpacing: -1, marginBottom: 12,
  },
  sectionTitleLight: { color: '#94A3B8' },
  sectionSubtitle: { fontSize: 15, color: '#64748B', lineHeight: 24, maxWidth: 500, marginBottom: 36 },
  featuresGrid: { gap: 14 },
  featureCardWrap: {},
  featureCard: {
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 20, padding: 20,
    ...Platform.select({
      web: { transition: 'all 0.3s ease' },
      default: {},
    }),
  },
  featureIconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  featureTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  featureDesc: { fontSize: 13, color: '#64748B', lineHeight: 20 },
  viewAllLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginTop: 28 },
  viewAllText: { fontSize: 14, fontWeight: '600', color: '#2196F3' },

  // Testimonials
  testimonialsSection: { paddingVertical: 60, paddingHorizontal: 24, backgroundColor: '#F8FAFC', maxWidth: 1100, alignSelf: 'center', width: '100%' },
  testimonialsGrid: { gap: 14, marginTop: 8 },
  testimonialWrap: {},
  testimonialCard: {
    backgroundColor: 'rgba(33,150,243,0.02)',
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 24, padding: 28,
  },
  testimonialContent: { fontSize: 14, color: '#475569', lineHeight: 22, marginTop: 12, marginBottom: 20 },
  testimonialAuthor: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  testimonialAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#2196F3', alignItems: 'center', justifyContent: 'center',
  },
  testimonialInitials: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  testimonialName: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  testimonialRole: { fontSize: 11, color: '#94A3B8' },

  // CTA
  ctaOuter: { paddingVertical: 60, paddingHorizontal: 24 },
  ctaCard: {
    backgroundColor: '#1A1F36', borderRadius: 32, padding: 48,
    alignItems: 'center', maxWidth: 700, alignSelf: 'center', width: '100%',
  },
  ctaTitle: {
    fontSize: isWeb ? 36 : 24, fontWeight: '800', color: '#FFF',
    textAlign: 'center', letterSpacing: -0.5, marginBottom: 12,
  },
  ctaSubtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginBottom: 24, maxWidth: 420 },
  ctaButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  ctaPrimaryBtn: {
    backgroundColor: '#FFF', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12,
  },
  ctaPrimaryText: { color: '#0F172A', fontSize: 14, fontWeight: '700' },
  ctaSecondaryBtn: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12,
  },
  ctaSecondaryText: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  // Footer
  footer: { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingVertical: 24, paddingHorizontal: 24 },
  footerInner: {
    maxWidth: 1100, alignSelf: 'center', width: '100%',
    alignItems: 'center', gap: 12,
  },
  footerCopy: { fontSize: 12, color: '#94A3B8', textAlign: 'center' },
  footerLinks: { flexDirection: 'row', gap: 20 },
  footerLink: { fontSize: 13, color: '#64748B' },
});
