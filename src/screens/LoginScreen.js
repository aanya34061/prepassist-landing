/**
 * LoginScreen – Theme-aware (light + dark glassmorphic)
 * Auth: Supabase email/password + forgot-password OTP flow  ← UNCHANGED
 */
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Animated,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { SmartTextInput } from '../components/SmartTextInput';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../features/Reference/theme/ThemeContext';

export default function LoginScreen({ navigation }) {
  // ── Auth (unchanged) ──────────────────────────────────────────────────────
  const { signInWithEmail, signUpWithEmail, sendPasswordOTP, verifyOTPAndResetPassword } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingType, setLoadingType] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(40))[0];

  // Forgot password states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [resetEmail, setResetEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // ── Theme ─────────────────────────────────────────────────────────────────
  const { theme, isDark } = useTheme();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Auth handlers (unchanged) ─────────────────────────────────────────────
  const showError = (message) => {
    setError(message);
    setTimeout(() => setError(''), 4000);
  };

  const handleEmailLogin = async () => {
    if (!email.trim()) { showError('Please enter your email'); return; }
    if (!password.trim()) { showError('Please enter your password'); return; }
    if (isSignUp && !name.trim()) { showError('Please enter your name'); return; }
    if (isSignUp && phone.trim() && !/^[+]?[0-9]{10,15}$/.test(phone.replace(/\s/g, ''))) {
      showError('Please enter a valid mobile number'); return;
    }
    try {
      setIsLoading(true);
      setLoadingType('email');
      setError('');
      if (isSignUp) {
        const result = await signUpWithEmail(email.trim().toLowerCase(), password, name.trim(), phone.trim());
        if (!result || !result.email_confirmed_at) {
          setSuccessMessage('Account created! Verification email sent.');
          Alert.alert('Verify Your Email', 'Please check your inbox and click the link to activate your account.',
            [{ text: 'OK', onPress: () => { setIsSignUp(false); setSuccessMessage(''); } }]);
        } else {
          setSuccessMessage('Successfully signed up! Logging you in...');
          if (Platform.OS === 'web') {
            navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Main' }] });
            return;
          }
        }
      } else {
        await signInWithEmail(email.trim().toLowerCase(), password);
        // On web, navigate to Main app after login since both stacks are always mounted
        if (Platform.OS === 'web') {
          navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Main' }] });
          return;
        }
      }
    } catch (err) {
      let errorMessage = err?.message || 'Authentication failed. Please check your credentials.';
      if (errorMessage.includes('database error')) errorMessage = 'This email might already be in use. Try logging in.';
      else if (errorMessage.includes('Redirect URL')) errorMessage = 'Configuration error. Please contact support.';
      setError(errorMessage);
      if (Platform.OS === 'web') alert('Auth Error: ' + errorMessage);
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsLoading(false);
      setLoadingType(null);
    }
  };

  const maskEmail = (emailStr) => {
    if (!emailStr) return '';
    const [localPart, domain] = emailStr.split('@');
    if (!domain) return emailStr;
    const visibleChars = Math.min(2, localPart.length);
    return `${localPart.slice(0, visibleChars)}****@${domain}`;
  };

  const openForgotPassword = async () => {
    if (!email.trim()) { Alert.alert('Email Required', 'Please enter your email address first.'); return; }
    setResetEmail(email.trim().toLowerCase());
    setForgotStep(2);
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotError('');
    setShowForgotModal(true);
    try {
      setForgotLoading(true);
      await sendPasswordOTP(email.trim().toLowerCase());
      Alert.alert('Code Sent', `A verification code has been sent to ${maskEmail(email.trim().toLowerCase())}`);
    } catch (err) {
      setForgotError(err.message || 'Failed to send verification code');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      setForgotLoading(true);
      setForgotError('');
      await sendPasswordOTP(resetEmail);
      Alert.alert('Code Sent', `A new verification code has been sent to ${maskEmail(resetEmail)}`);
    } catch (err) {
      setForgotError(err.message || 'Failed to send verification code');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyOTP = () => {
    if (!otpCode.trim() || otpCode.length < 6) { setForgotError('Please enter the 6-digit code from your email'); return; }
    setForgotError('');
    setForgotStep(3);
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim() || newPassword.length < 6) { setForgotError('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { setForgotError('Passwords do not match'); return; }
    try {
      setForgotLoading(true);
      setForgotError('');
      await verifyOTPAndResetPassword(resetEmail.trim().toLowerCase(), otpCode.trim(), newPassword);
      setShowForgotModal(false);
      Alert.alert('Success', 'Your password has been reset. Please login with your new password.');
    } catch (err) {
      setForgotError(err.message || 'Failed to reset password');
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setForgotStep(1);
    setForgotError('');
  };

  // ── Theme-derived values ──────────────────────────────────────────────────
  const bgColors  = isDark
    ? ['#07091A', '#11063A', '#070F30']
    : ['#F7F8FC', '#F0EAE0', '#F0F4FF'];

  const cardBg     = isDark ? 'rgba(255,255,255,0.07)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.14)' : '#E4E6F0';
  const cardShadow = isDark ? 'rgba(42,125,235,0.5)'   : 'rgba(79,70,229,0.12)';

  const inputBg     = isDark ? 'rgba(255,255,255,0.08)' : '#F7F8FC';
  const inputBorder = isDark ? 'rgba(255,255,255,0.16)' : '#C8CADB';
  const inputText   = isDark ? '#F0F0FF' : '#333333';
  const inputPlaceholder = isDark ? 'rgba(255,255,255,0.30)' : '#7A8A91';
  const inputIcon   = isDark ? 'rgba(255,255,255,0.5)' : '#7A8A91';

  const titleColor    = isDark ? '#F0F0FF'                : '#333333';
  const subtitleColor = isDark ? 'rgba(240,240,255,0.58)' : '#3D565E';
  const labelColor    = isDark ? 'rgba(240,240,255,0.72)' : '#3D565E';
  const optionalColor = isDark ? 'rgba(240,240,255,0.40)' : '#7A8A91';
  const switchLabelColor = isDark ? 'rgba(240,240,255,0.55)' : '#3D565E';
  const footerColor   = isDark ? 'rgba(240,240,255,0.35)' : '#7A8A91';
  const footerLinkColor = isDark ? 'rgba(240,240,255,0.55)' : '#3D565E';
  const linkColor     = isDark ? '#5EC7B2' : '#2A7DEB';

  const modalBg      = isDark ? 'rgba(15,10,50,0.96)' : '#FFFFFF';
  const modalBorder  = isDark ? 'rgba(255,255,255,0.14)' : '#E4E6F0';
  const modalTitleColor = isDark ? '#F0F0FF' : '#333333';
  const modalSubColor   = isDark ? 'rgba(240,240,255,0.58)' : '#3D565E';
  const closeBtnBg   = isDark ? 'rgba(255,255,255,0.1)' : '#F1F2F9';
  const closeBtnBorder = isDark ? 'rgba(255,255,255,0.15)' : '#E4E6F0';
  const closeIconColor = isDark ? 'rgba(255,255,255,0.8)' : '#3D565E';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: isDark ? '#07091A' : '#F7F8FC' }]}>
      {/* Background gradient */}
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

      {/* Decorative orbs */}
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={isDark ? ['rgba(42,125,235,0.50)', 'rgba(42,125,235,0.0)'] : ['rgba(79,70,229,0.14)', 'rgba(79,70,229,0.0)']}
          style={styles.orbTopLeft}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />
        <LinearGradient
          colors={isDark ? ['rgba(59,130,246,0.38)', 'rgba(59,130,246,0.0)'] : ['rgba(59,130,246,0.10)', 'rgba(59,130,246,0.0)']}
          style={styles.orbBottomRight}
          start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }}
        />
        <LinearGradient
          colors={isDark ? ['rgba(16,185,129,0.22)', 'rgba(16,185,129,0.0)'] : ['rgba(16,185,129,0.08)', 'rgba(16,185,129,0.0)']}
          style={styles.orbMid}
          start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }}
        />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

              {/* ── Logo ────────────────────────────────────────────── */}
              <View style={styles.logoSection}>
                <View style={styles.logoGlowWrap}>
                  <View style={[styles.logoGlow, {
                    backgroundColor: isDark ? 'rgba(42,125,235,0.35)' : 'rgba(79,70,229,0.08)',
                    shadowColor: isDark ? '#7B52F4' : '#2A7DEB',
                  }]} />
                  <Image
                    source={require('../../assets/prepassist-logo.png')}
                    style={styles.logoImage}
                    resizeMode="contain"
                    tintColor={isDark ? '#FFFFFF' : undefined}
                  />
                </View>
              </View>

              {/* ── Card ────────────────────────────────────────────── */}
              <View style={[styles.glassCard, {
                backgroundColor: cardBg,
                borderColor: cardBorder,
                shadowColor: cardShadow,
              }]}>
                {isDark && <View style={styles.cardShimmer} />}

                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: titleColor }]}>
                    {isSignUp ? 'Create account' : 'Welcome back'}
                  </Text>
                  <Text style={[styles.cardSubtitle, { color: subtitleColor }]}>
                    {isSignUp ? 'Start your preparation journey' : 'Sign in to continue learning'}
                  </Text>
                </View>

                {/* Error */}
                {!!error && (
                  <View style={styles.alertBox}>
                    <Ionicons name="alert-circle" size={17} color="#EF4444" />
                    <Text style={styles.alertText}>{error}</Text>
                  </View>
                )}
                {/* Success */}
                {!!successMessage && (
                  <View style={[styles.alertBox, styles.alertSuccess]}>
                    <Ionicons name="checkmark-circle" size={17} color="#10B981" />
                    <Text style={[styles.alertText, { color: '#10B981' }]}>{successMessage}</Text>
                  </View>
                )}

                {/* ── Form ──────────────────────────────────────────── */}
                <View style={styles.form}>
                  {isSignUp && (
                    <>
                      <View style={styles.fieldGroup}>
                        <Text style={[styles.fieldLabel, { color: labelColor }]}>Full Name</Text>
                        <View style={[styles.glassInput, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                          <Ionicons name="person-outline" size={18} color={inputIcon} style={styles.inputIcon} />
                          <SmartTextInput
                            style={[styles.inputText, { color: inputText }]}
                            placeholder="Enter your name"
                            placeholderTextColor={inputPlaceholder}
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                            editable={!isLoading}
                          />
                        </View>
                      </View>
                      <View style={styles.fieldGroup}>
                        <Text style={[styles.fieldLabel, { color: labelColor }]}>
                          Mobile Number{' '}
                          <Text style={[styles.optionalTag, { color: optionalColor }]}>(Optional)</Text>
                        </Text>
                        <View style={[styles.glassInput, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                          <Ionicons name="call-outline" size={18} color={inputIcon} style={styles.inputIcon} />
                          <SmartTextInput
                            style={[styles.inputText, { color: inputText }]}
                            placeholder="+91 9876543210"
                            placeholderTextColor={inputPlaceholder}
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                            autoCapitalize="none"
                            editable={!isLoading}
                          />
                        </View>
                      </View>
                    </>
                  )}

                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: labelColor }]}>Email Address</Text>
                    <View style={[styles.glassInput, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                      <Ionicons name="mail-outline" size={18} color={inputIcon} style={styles.inputIcon} />
                      <SmartTextInput
                        style={[styles.inputText, { color: inputText }]}
                        placeholder="you@example.com"
                        placeholderTextColor={inputPlaceholder}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!isLoading}
                      />
                    </View>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: labelColor }]}>Password</Text>
                    <View style={[styles.glassInput, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                      <Ionicons name="lock-closed-outline" size={18} color={inputIcon} style={styles.inputIcon} />
                      <SmartTextInput
                        style={[styles.inputText, { color: inputText }]}
                        placeholder="••••••••"
                        placeholderTextColor={inputPlaceholder}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!isLoading}
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                        <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={inputIcon} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Forgot password */}
                  {!isSignUp && (
                    <TouchableOpacity onPress={openForgotPassword} style={styles.forgotBtn} disabled={isLoading}>
                      <Text style={[styles.forgotText, { color: linkColor }]}>Forgot password?</Text>
                    </TouchableOpacity>
                  )}

                  {/* Submit */}
                  <TouchableOpacity onPress={handleEmailLogin} disabled={isLoading} activeOpacity={0.85} style={styles.submitBtnWrap}>
                    <LinearGradient
                      colors={['#2A7DEB', '#3B82F6']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={[styles.submitBtn, isLoading && { opacity: 0.7 }]}
                    >
                      {loadingType === 'email' ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <>
                          <Text style={styles.submitBtnText}>{isSignUp ? 'Create account' : 'Sign in'}</Text>
                          <Ionicons name="arrow-forward" size={18} color="#FFF" />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Switch mode */}
                  <View style={styles.switchRow}>
                    <Text style={[styles.switchLabel, { color: switchLabelColor }]}>
                      {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                    </Text>
                    <TouchableOpacity onPress={() => { setIsSignUp(!isSignUp); setError(''); }} disabled={isLoading}>
                      <Text style={[styles.switchLink, { color: linkColor }]}>
                        {isSignUp ? 'Sign in' : 'Sign up'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Footer */}
              <Text style={[styles.footerText, { color: footerColor }]}>
                By continuing, you agree to our{' '}
                <Text style={[styles.footerLink, { color: footerLinkColor }]}>Terms</Text>
                {' '}and{' '}
                <Text style={[styles.footerLink, { color: footerLinkColor }]}>Privacy Policy</Text>
              </Text>

            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* ── Forgot Password Modal ──────────────────────────────────────────── */}
      <Modal visible={showForgotModal} animationType="slide" transparent onRequestClose={closeForgotModal}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalGlassCard, { backgroundColor: modalBg, borderColor: modalBorder }]}>
            {isDark && <View style={styles.cardShimmer} />}

            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: modalTitleColor }]}>
                {forgotStep === 2 ? 'Enter Verification Code' : 'Set New Password'}
              </Text>
              <TouchableOpacity onPress={closeForgotModal} style={styles.modalCloseBtn}>
                <View style={[styles.closeBtnInner, { backgroundColor: closeBtnBg, borderColor: closeBtnBorder }]}>
                  <Ionicons name="close" size={18} color={closeIconColor} />
                </View>
              </TouchableOpacity>
            </View>

            {!!forgotError && (
              <View style={styles.alertBox}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.alertText}>{forgotError}</Text>
              </View>
            )}

            {/* Step 2: OTP */}
            {forgotStep === 2 && (
              <>
                <Text style={[styles.modalSub, { color: modalSubColor }]}>
                  OTP has been sent to{' '}
                  <Text style={{ color: linkColor, fontWeight: '700' }}>{maskEmail(resetEmail)}</Text>
                </Text>
                <View style={[styles.glassInput, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                  <Ionicons name="key-outline" size={18} color={inputIcon} style={styles.inputIcon} />
                  <SmartTextInput
                    style={[styles.inputText, { color: inputText }]}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor={inputPlaceholder}
                    value={otpCode}
                    onChangeText={setOtpCode}
                    keyboardType="number-pad"
                    maxLength={8}
                  />
                </View>
                <TouchableOpacity onPress={handleVerifyOTP} disabled={forgotLoading} style={styles.submitBtnWrap}>
                  <LinearGradient colors={['#2A7DEB', '#3B82F6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.submitBtn, forgotLoading && { opacity: 0.7 }]}>
                    <Text style={styles.submitBtnText}>Verify Code</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleResendOTP} disabled={forgotLoading}>
                  <Text style={[styles.resendText, { color: linkColor }]}>
                    {forgotLoading ? 'Sending…' : 'Resend Code'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Step 3: New password */}
            {forgotStep === 3 && (
              <>
                <Text style={[styles.modalSub, { color: modalSubColor }]}>Create a new password for your account.</Text>
                <View style={[styles.glassInput, { backgroundColor: inputBg, borderColor: inputBorder, marginBottom: 12 }]}>
                  <Ionicons name="lock-closed-outline" size={18} color={inputIcon} style={styles.inputIcon} />
                  <SmartTextInput
                    style={[styles.inputText, { color: inputText }]}
                    placeholder="New password"
                    placeholderTextColor={inputPlaceholder}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                  />
                </View>
                <View style={[styles.glassInput, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                  <Ionicons name="lock-closed-outline" size={18} color={inputIcon} style={styles.inputIcon} />
                  <SmartTextInput
                    style={[styles.inputText, { color: inputText }]}
                    placeholder="Confirm password"
                    placeholderTextColor={inputPlaceholder}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                  />
                </View>
                <TouchableOpacity onPress={handleResetPassword} disabled={forgotLoading} style={styles.submitBtnWrap}>
                  <LinearGradient colors={['#2A7DEB', '#3B82F6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.submitBtn, forgotLoading && { opacity: 0.7 }]}>
                    {forgotLoading
                      ? <ActivityIndicator size="small" color="#FFF" />
                      : <Text style={styles.submitBtnText}>Reset Password</Text>
                    }
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles (base — all color overrides applied inline above) ──────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  // Orbs
  orbTopLeft:    { position: 'absolute', width: 380, height: 380, borderRadius: 190, top: -130, left: -110 },
  orbBottomRight: { position: 'absolute', width: 320, height: 320, borderRadius: 160, bottom: -80, right: -90 },
  orbMid:        { position: 'absolute', width: 220, height: 220, borderRadius: 110, top: '40%', left: '30%' },

  // Layout
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingVertical: 32 },
  content:       { width: '100%', maxWidth: 420, alignSelf: 'center' },

  // Logo
  logoSection:   { alignItems: 'center', marginBottom: 32 },
  logoGlowWrap:  { alignItems: 'center', position: 'relative' },
  logoGlow: {
    position: 'absolute',
    width: 140, height: 80, borderRadius: 70,
    top: 10,
  },
  logoImage: { width: 200, height: 80 },

  // Card
  glassCard: {
    borderRadius: 28, borderWidth: 1,
    padding: 28,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 14,
    overflow: 'hidden',
    marginBottom: 24,
  },
  cardShimmer: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 1,
  },
  cardHeader:   { marginBottom: 22 },
  cardTitle:    { fontSize: 26, fontWeight: '800', letterSpacing: -0.7, marginBottom: 6 },
  cardSubtitle: { fontSize: 15, fontWeight: '400' },

  // Alerts
  alertBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.24)',
    borderRadius: 14, padding: 14, marginBottom: 18,
  },
  alertSuccess: { backgroundColor: 'rgba(16,185,129,0.10)', borderColor: 'rgba(16,185,129,0.24)' },
  alertText:    { color: '#EF4444', fontSize: 13, fontWeight: '500', flex: 1, lineHeight: 19 },

  // Form
  form:         { gap: 16 },
  fieldGroup:   { gap: 8 },
  fieldLabel:   { fontSize: 13, fontWeight: '700', letterSpacing: 0.1 },
  optionalTag:  { fontSize: 11, fontWeight: '400' },
  glassInput: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 16, height: 54, paddingHorizontal: 16,
  },
  inputIcon: { marginRight: 12 },
  inputText: { flex: 1, height: '100%', fontSize: 15 },
  eyeBtn:    { padding: 4 },

  forgotBtn:  { alignSelf: 'flex-end', paddingVertical: 2 },
  forgotText: { fontSize: 13, fontWeight: '600' },

  // Submit
  submitBtnWrap: { borderRadius: 16, overflow: 'hidden', marginTop: 6 },
  submitBtn: {
    height: 56, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10,
    shadowColor: '#2A7DEB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
  },
  submitBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },

  // Switch
  switchRow:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 4 },
  switchLabel: { fontSize: 14 },
  switchLink:  { fontSize: 14, fontWeight: '700' },

  // Footer
  footerText: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  footerLink: { fontWeight: '600' },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.60)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalGlassCard: {
    borderRadius: 24, padding: 26,
    width: '100%', maxWidth: 400,
    borderWidth: 1, overflow: 'hidden',
    shadowColor: 'rgba(79,70,229,0.4)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 28,
    elevation: 14,
  },
  modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:    { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  modalCloseBtn: { padding: 4 },
  closeBtnInner: {
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },
  modalSub:   { fontSize: 14, marginBottom: 18, lineHeight: 20 },
  resendText: { fontSize: 14, textAlign: 'center', marginTop: 10, fontWeight: '600' },
});
