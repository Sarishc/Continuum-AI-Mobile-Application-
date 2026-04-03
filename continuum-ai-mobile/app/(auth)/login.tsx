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
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../../hooks/useAuth';
import { AnimatedBackground } from '../../components/ui/AnimatedBackground';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/theme';

// ─── Eye icon ─────────────────────────────────────────────────────────────────

function EyeIcon({ visible, color }: { visible: boolean; color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      {visible ? (
        <>
          <Path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z"
            stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
            stroke={color} strokeWidth={1.8} />
        </>
      ) : (
        <>
          <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
            stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M1 1l22 22" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        </>
      )}
    </Svg>
  );
}

// ─── Floating label input ─────────────────────────────────────────────────────

interface FloatingInputProps {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'email-address' | 'default';
  autoCapitalize?: 'none' | 'words' | 'sentences';
  autoComplete?: 'email' | 'password' | 'name' | 'off';
  returnKeyType?: 'next' | 'done';
  onSubmitEditing?: () => void;
  inputRef?: React.RefObject<TextInput | null>;
}

function FloatingInput({
  label,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoComplete = 'off',
  returnKeyType = 'next',
  onSubmitEditing,
  inputRef,
}: FloatingInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;
  const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.parallel([
      Animated.timing(borderAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
      Animated.timing(labelAnim, { toValue: 1, duration: 150, useNativeDriver: false }),
    ]).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.parallel([
      Animated.timing(borderAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
      Animated.timing(labelAnim, { toValue: value ? 1 : 0, duration: 150, useNativeDriver: false }),
    ]).start();
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.rim, Colors.electric],
  });
  const labelColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.textTertiary, Colors.electric],
  });
  const glowOpacity = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const isSecure = secureTextEntry && !showPassword;

  return (
    <View style={inputStyles.wrapper}>
      {/* Focus glow */}
      <Animated.View
        style={[
          inputStyles.glow,
          { opacity: glowOpacity },
        ]}
        pointerEvents="none"
      />

      <Animated.View style={[inputStyles.container, { borderColor }]}>
        {/* Floating label */}
        <Animated.Text style={[inputStyles.floatLabel, { color: labelColor }]}>
          {label}
        </Animated.Text>

        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder=""
          placeholderTextColor="transparent"
          secureTextEntry={isSecure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={inputStyles.input}
          selectionColor={Colors.electric}
        />

        {/* Password toggle */}
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setShowPassword((v) => !v)}
            style={inputStyles.eyeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <EyeIcon visible={showPassword} color={isFocused ? Colors.electric : Colors.textMuted} />
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const inputStyles = StyleSheet.create({
  wrapper: { position: 'relative' },
  glow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    backgroundColor: Colors.electricMist,
    margin: -1,
  },
  container: {
    height: 56,
    backgroundColor: Colors.depth,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    overflow: 'hidden',
  },
  floatLabel: {
    position: 'absolute',
    left: Spacing[4],
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyMedium,
    pointerEvents: 'none',
  } as any,
  input: {
    flex: 1,
    height: '100%',
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textPrimary,
    paddingTop: 14,
  },
  eyeBtn: {
    padding: 4,
  },
});

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
      <AnimatedBackground />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 64, paddingBottom: insets.bottom + 48 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Logo ─────────────────────────────────────────────────────── */}
          <View style={styles.logoSection}>
            <Text style={styles.logoGlyph}>C</Text>
            <Text style={styles.wordmark}>CONTINUUM</Text>
            <Text style={styles.tagline}>Health Intelligence</Text>
          </View>

          {/* ── Form ─────────────────────────────────────────────────────── */}
          <View style={styles.formSection}>
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <FloatingInput
              label="Email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            <FloatingInput
              inputRef={passwordRef}
              label="Password"
              value={password}
              onChangeText={setPassword}
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

            {/* CTA */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={!canSubmit}
              activeOpacity={0.88}
              style={[styles.ctaWrap, !canSubmit && { opacity: 0.45 }]}
            >
              <LinearGradient
                colors={['#4F7EFF', '#3560E0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.ctaLabel}>Sign in</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing[6],
    gap: Spacing[6],
  },

  // Logo
  logoSection: {
    alignItems: 'center',
    gap: Spacing[1],
    marginBottom: Spacing[4],
  },
  logoGlyph: {
    fontSize: 80,
    fontFamily: FontFamily.displayExtraBold,
    color: Colors.electric,
    lineHeight: 86,
    ...Platform.select({
      ios: {
        textShadowColor: Colors.electricDeep,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 16,
      },
    }),
  },
  wordmark: {
    fontSize: 26,
    fontFamily: FontFamily.displayBold,
    color: Colors.textPrimary,
    letterSpacing: 8,
    marginTop: Spacing[1],
  },
  tagline: {
    fontSize: 13,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textTertiary,
    marginTop: 2,
  },

  // Form
  formSection: {
    gap: Spacing[3],
  },
  errorBanner: {
    backgroundColor: Colors.criticalGlow,
    borderWidth: 1,
    borderColor: 'rgba(255,79,107,0.3)',
    borderRadius: BorderRadius.md,
    padding: Spacing[3],
  },
  errorText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.critical,
    lineHeight: 19,
  },
  forgotContainer: {
    alignSelf: 'flex-end',
    marginTop: -Spacing[1],
  },
  forgotText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.electric,
  },
  ctaWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: Spacing[1],
    ...Platform.select({
      ios: {
        shadowColor: Colors.electric,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 20,
      },
      android: { elevation: 8 },
    }),
  },
  ctaGradient: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  ctaLabel: {
    fontSize: 16,
    fontFamily: FontFamily.displaySemiBold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    marginTop: Spacing[1],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.rim,
  },
  dividerText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textMuted,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
  },
  footerLink: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.displaySemiBold,
    color: Colors.electric,
  },
});
