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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../hooks/useAuth';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { BorderRadius, Spacing, Shadow } from '../../constants/theme';

interface AnimatedInputProps {
  value: string;
  onChangeText: (t: string) => void;
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

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signup, isLoading, error, clearError } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const handleSignup = async () => {
    setLocalError(null);
    clearError();
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters.');
      return;
    }
    await signup({ name: name.trim(), email: email.trim(), password });
  };

  const displayError = localError ?? error;
  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 8 &&
    confirmPassword.length > 0 &&
    !isLoading;

  return (
    <View style={styles.root}>
      <View style={styles.glowContainer} pointerEvents="none">
        <View style={styles.glow} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          {/* Brand */}
          <View style={styles.brandSection}>
            <LinearGradient
              colors={Colors.gradientBlue}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoGradient}
            >
              <Text style={styles.logoLetter}>C</Text>
            </LinearGradient>
            <Text style={styles.wordmark}>Continuum</Text>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formTitle}>Create account</Text>
            <Text style={styles.formSubtitle}>
              Start understanding your health.
            </Text>

            {displayError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{displayError}</Text>
              </View>
            )}

            <AnimatedInput
              value={name}
              onChangeText={setName}
              placeholder="Full name"
              autoCapitalize="words"
              autoComplete="name"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />

            <AnimatedInput
              inputRef={emailRef}
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            <AnimatedInput
              inputRef={passwordRef}
              value={password}
              onChangeText={setPassword}
              placeholder="Password (min 8 characters)"
              secureTextEntry
              autoComplete="password"
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
            />

            <AnimatedInput
              inputRef={confirmRef}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm password"
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSignup}
            />

            <TouchableOpacity
              onPress={handleSignup}
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
                  {isLoading ? 'Creating account…' : 'Create account'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.footerLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  glowContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    overflow: 'hidden',
  },
  glow: {
    width: 600,
    height: 600,
    borderRadius: 300,
    backgroundColor: 'rgba(31, 111, 235, 0.07)',
    marginTop: -240,
  },
  scrollContent: { flexGrow: 1, paddingHorizontal: Spacing[6] },
  backButton: { marginBottom: Spacing[6] },
  backText: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.primary,
  },
  brandSection: { alignItems: 'center', marginBottom: Spacing[8] },
  logoGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[3],
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
      },
      android: { elevation: 8 },
    }),
  },
  logoLetter: {
    fontSize: 36,
    fontFamily: FontFamily.display,
    color: '#FFFFFF',
    lineHeight: 44,
  },
  wordmark: {
    fontSize: FontSize['2xl'],
    fontFamily: FontFamily.display,
    color: Colors.textPrimary,
  },
  formSection: { gap: Spacing[3] },
  formTitle: {
    fontSize: FontSize['2xl'],
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textPrimary,
  },
  formSubtitle: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bodyRegular,
    color: Colors.textSecondary,
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
  ctaWrapper: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginTop: Spacing[2],
  },
  ctaDisabled: { opacity: 0.5 },
  ctaGradient: { height: 54, alignItems: 'center', justifyContent: 'center' },
  ctaLabel: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.bodySemiBold,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
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
