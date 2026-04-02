import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../hooks/useAuth';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { BorderRadius, Spacing, Shadow } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Animated Input ────────────────────────────────────────────────────────────

interface AnimatedInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: 'email-address' | 'default';
  autoCapitalize?: 'none' | 'words' | 'sentences';
  autoComplete?: 'email' | 'password' | 'name' | 'off';
  returnKeyType?: 'next' | 'done';
  onSubmitEditing?: () => void;
  inputRef?: React.RefObject<TextInput | null>;
}

function AnimatedInput({
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoComplete = 'off',
  returnKeyType = 'next',
  onSubmitEditing,
  inputRef,
}: AnimatedInputProps) {
  const borderAnim = useRef(new Animated.Value(0)).current;
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(borderAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(borderAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.border, Colors.borderActive],
  });

  const shadowOpacity = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.35],
  });

  return (
    <Animated.View
      style={[
        styles.inputWrapper,
        {
          borderColor,
          shadowColor: Colors.primary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity,
          shadowRadius: 8,
          elevation: isFocused ? 4 : 0,
        },
      ]}
    >
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={styles.input}
        selectionColor={Colors.primary}
      />
    </Animated.View>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    clearError();
    await login({ email: email.trim(), password });
  };

  const handleSignupNav = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(auth)/signup');
  };

  const canSubmit = email.trim().length > 0 && password.length >= 6 && !isLoading;

  return (
    <View style={styles.root}>
      {/* Deep-space radial glow behind logo */}
      <View style={styles.glowContainer} pointerEvents="none">
        <View style={styles.glow} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Logo & Branding ───────────────────────────────────────────── */}
          <View style={styles.brandSection}>
            <View style={styles.logoRing}>
              <LinearGradient
                colors={Colors.gradientBlue}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoGradient}
              >
                <Text style={styles.logoLetter}>C</Text>
              </LinearGradient>
            </View>

            <Text style={styles.wordmark}>Continuum</Text>
            <Text style={styles.tagline}>Your health, understood.</Text>
          </View>

          {/* ── Form ─────────────────────────────────────────────────────── */}
          <View style={styles.formSection}>
            <Text style={styles.formTitle}>Sign in</Text>

            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <AnimatedInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            <AnimatedInput
              inputRef={passwordRef}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />

            <TouchableOpacity
              style={styles.forgotContainer}
              onPress={() => {}}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Primary CTA */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={!canSubmit}
              activeOpacity={0.85}
              style={[styles.ctaWrapper, !canSubmit && styles.ctaDisabled, Shadow.blue]}
            >
              <LinearGradient
                colors={Colors.gradientBlue}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGradient}
              >
                <Text style={styles.ctaLabel}>
                  {isLoading ? 'Signing in…' : 'Sign in'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* ── Footer ───────────────────────────────────────────────────── */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={handleSignupNav} activeOpacity={0.7}>
              <Text style={styles.footerLink}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const LOGO_SIZE = 88;
const GLOW_SIZE = SCREEN_WIDTH * 1.2;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  glowContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    overflow: 'hidden',
  },
  glow: {
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    backgroundColor: 'rgba(31, 111, 235, 0.07)',
    marginTop: -GLOW_SIZE * 0.4,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing[6],
  },

  // ── Branding ──────────────────────────────────────────────────────────────
  brandSection: {
    alignItems: 'center',
    marginBottom: Spacing[10],
  },
  logoRing: {
    width: LOGO_SIZE + 4,
    height: LOGO_SIZE + 4,
    borderRadius: (LOGO_SIZE + 4) / 2,
    borderWidth: 1,
    borderColor: 'rgba(56, 139, 253, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[5],
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 24,
      },
      android: { elevation: 8 },
    }),
  },
  logoGradient: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    fontSize: 44,
    fontFamily: FontFamily.display,
    color: '#FFFFFF',
    lineHeight: 52,
  },
  wordmark: {
    fontSize: FontSize['3xl'],
    fontFamily: FontFamily.display,
    color: Colors.textPrimary,
    letterSpacing: 0.5,
    marginBottom: Spacing[2],
  },
  tagline: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
    letterSpacing: 0.3,
  },

  // ── Form ──────────────────────────────────────────────────────────────────
  formSection: {
    gap: Spacing[3],
  },
  formTitle: {
    fontSize: FontSize['2xl'],
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textPrimary,
    marginBottom: Spacing[1],
  },
  errorBanner: {
    backgroundColor: 'rgba(248, 81, 73, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248, 81, 73, 0.3)',
    borderRadius: BorderRadius.md,
    padding: Spacing[3],
  },
  errorText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.critical,
    lineHeight: 20,
  },
  inputWrapper: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  input: {
    height: 52,
    paddingHorizontal: Spacing[4],
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textPrimary,
  },
  forgotContainer: {
    alignSelf: 'flex-end',
    marginTop: -Spacing[1],
  },
  forgotText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.primary,
  },
  ctaWrapper: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginTop: Spacing[2],
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaGradient: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.bodySemiBold,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing[8],
  },
  footerText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
  },
  footerLink: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.primary,
  },
});
