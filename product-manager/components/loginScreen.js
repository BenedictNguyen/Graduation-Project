import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import {
  MaterialCommunityIcons,
  Feather,
  Ionicons,
} from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { handleLogin } from '../utils/auth';
import { useResponsive } from '../utils/responsive';

const REMEMBER_EMAIL_KEY = '@remembered_email';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  const r = useResponsive();

  // Load email đã lưu khi component mount
  useEffect(() => {
    loadRememberedEmail();
  }, []);

  const loadRememberedEmail = async () => {
    try {
      const savedEmail = await AsyncStorage.getItem(REMEMBER_EMAIL_KEY);
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch (error) {
      console.error('Error loading remembered email:', error);
    }
  };

  const saveRememberedEmail = async (emailToSave) => {
    try {
      if (rememberMe && emailToSave) {
        await AsyncStorage.setItem(REMEMBER_EMAIL_KEY, emailToSave);
      } else {
        await AsyncStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
    } catch (error) {
      console.error('Error saving remembered email:', error);
    }
  };

  const onLogin = async () => {
    if (!email || !password) {
      alert('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    setLoading(true);
    try {
      const result = await handleLogin(email, password);

      if (result.success) {
        // Lưu email nếu checkbox "Nhớ tài khoản" được chọn
        await saveRememberedEmail(email);
        navigation.replace('Main');
      } else {
        alert(result.message || 'Đăng nhập thất bại');
      }
    } catch (error) {
      alert('Lỗi đăng nhập: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#0F172A',
    },
    content: {
      flex: 1,
      paddingHorizontal: r.containerPadding.horizontal,
      justifyContent: 'center',
    },
    gradientBackground: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 300,
      opacity: 0.3,
    },
    glowCircle1: {
      position: 'absolute',
      top: -100,
      right: -50,
      width: 250,
      height: 250,
      borderRadius: 125,
      backgroundColor: '#6366F1',
      opacity: 0.2,
    },
    glowCircle2: {
      position: 'absolute',
      top: 100,
      left: -80,
      width: 200,
      height: 200,
      borderRadius: 100,
      backgroundColor: '#EC4899',
      opacity: 0.15,
    },
    headerContainer: {
      alignItems: 'center',
      marginBottom: r.spacing.lg,
    },
    logoIconContainer: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      borderWidth: 2,
      borderColor: 'rgba(99, 102, 241, 0.3)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: r.spacing.sm,
    },
    logoImage: {
      width: "100%",
      height: "100%",
      resizeMode: 'contain',
      tintColor: '#6366F1',
    },
    brandTitle: {
      fontSize: r.fontSize.xxl,
      fontWeight: '800',
      color: '#FFFFFF',
      marginBottom: 4,
      textAlign: 'center',
      letterSpacing: -1,
    },
    brandSubtitle: {
      fontSize: r.fontSize.sm,
      color: '#94A3B8',
      textAlign: 'center',
      fontWeight: '500',
      marginTop: 4,
    },
    formContainer: {
      backgroundColor: 'rgba(30, 41, 59, 0.7)',
      borderRadius: 24,
      padding: r.spacing.xl,
      borderWidth: 1,
      borderColor: 'rgba(99, 102, 241, 0.25)',
      maxWidth: 420,
      alignSelf: 'center',
      width: '100%',
      ...Platform.select({
        ios: {
          shadowColor: '#6366F1',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
        },
        android: {
          elevation: 8,
        },
      }),
    },
    welcomeText: {
      fontSize: r.fontSize.xxl,
      fontWeight: '800',
      color: '#FFFFFF',
      marginBottom: 6,
      letterSpacing: -0.5,
    },
    subText: {
      fontSize: r.fontSize.base,
      color: '#94A3B8',
      marginBottom: r.spacing.lg,
      lineHeight: 20,
    },
    inputWrapper: {
      marginBottom: r.spacing.md,
    },
    inputLabel: {
      fontSize: r.fontSize.sm,
      fontWeight: '600',
      color: '#CBD5E1',
      marginBottom: 8,
      marginLeft: 4,
    },
    passwordHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: r.spacing.xs,
    },
    forgotPasswordText: {
      fontSize: r.fontSize.xs,
      fontWeight: '600',
      color: '#6366F1',
      marginRight: 4,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      borderRadius: 14,
      borderWidth: 1.5,
      paddingHorizontal: r.spacing.md,
      height: 52,
    },
    inputFocused: {
      borderColor: '#6366F1',
      backgroundColor: 'rgba(99, 102, 241, 0.05)',
    },
    inputUnfocused: {
      borderColor: 'rgba(148, 163, 184, 0.2)',
    },
    inputIconContainer: {
      marginRight: r.spacing.xs,
    },
    textInput: {
      flex: 1,
      fontSize: r.fontSize.base,
      color: '#FFFFFF',
      outlineStyle: 'none',
      paddingVertical: 0,
    },
    eyeButton: {
      padding: r.spacing.xs,
    },
    rememberMeContainer: {
      marginTop: r.spacing.xs,
      marginBottom: r.spacing.sm,
    },
    checkboxContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: r.spacing.xs,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: 'rgba(148, 163, 184, 0.4)',
      backgroundColor: 'rgba(15, 23, 42, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxChecked: {
      backgroundColor: '#6366F1',
      borderColor: '#6366F1',
    },
    rememberMeText: {
      fontSize: r.fontSize.sm,
      color: '#CBD5E1',
      fontWeight: '500',
    },
    loginButton: {
      height: 52,
      borderRadius: 14,
      overflow: 'hidden',
      marginTop: r.spacing.md,
    },
    loginGradient: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: r.spacing.xs,
    },
    loginButtonText: {
      fontSize: r.fontSize.base,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    dividerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: r.spacing.md,
    },
    divider: {
      flex: 1,
      height: 1,
      backgroundColor: 'rgba(148, 163, 184, 0.2)',
    },
    dividerText: {
      marginHorizontal: r.spacing.sm,
      fontSize: r.fontSize.xs,
      color: '#64748B',
      fontWeight: '500',
    },
    signupContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    signupText: {
      fontSize: r.fontSize.sm,
      color: '#94A3B8',
    },
    signupLink: {
      fontSize: r.fontSize.sm,
      color: '#6366F1',
      fontWeight: '700',
    },
    featureContainer: {
      marginTop: r.spacing.lg,
      gap: 10,
      paddingTop: r.spacing.md,
      borderTopWidth: 1,
      borderTopColor: 'rgba(148, 163, 184, 0.1)',
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    featureText: {
      fontSize: r.fontSize.sm,
      color: '#94A3B8',
      fontWeight: '500',
    },
  });

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.gradientBackground} />
      <View style={styles.glowCircle1} />
      <View style={styles.glowCircle2} />
      
      <View style={styles.content}>
        <View style={styles.headerContainer}>
          <View style={styles.logoIconContainer}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.logoImage}
            />
          </View>
          <Text style={styles.brandTitle}>SMART SHELF</Text>
          <Text style={styles.brandSubtitle}>Quản lý thông minh với AI</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.welcomeText}>Chào mừng trở lại</Text>
          <Text style={styles.subText}>Đăng nhập để tiếp tục quản lý</Text>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Email</Text>
            <View style={[
              styles.inputContainer,
              emailFocused ? styles.inputFocused : styles.inputUnfocused
            ]}>
              <View style={styles.inputIconContainer}>
                <MaterialCommunityIcons 
                  name="email-outline" 
                  size={18} 
                  color={emailFocused ? '#6366F1' : '#64748B'} 
                />
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="your@email.com"
                placeholderTextColor="#475569"
                onChangeText={setEmail}
                value={email}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>
          </View>

          <View style={styles.inputWrapper}>
            <View style={styles.passwordHeader}>
              <Text style={styles.inputLabel}>Mật khẩu</Text>
              <TouchableOpacity 
                onPress={() => navigation.navigate('ForgotPassword')}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
              </TouchableOpacity>
            </View>
            <View style={[
              styles.inputContainer,
              passwordFocused ? styles.inputFocused : styles.inputUnfocused
            ]}>
              <View style={styles.inputIconContainer}>
                <Feather 
                  name="lock" 
                  size={18} 
                  color={passwordFocused ? '#6366F1' : '#64748B'} 
                />
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="••••••••"
                placeholderTextColor="#475569"
                onChangeText={setPassword}
                value={password}
                secureTextEntry={secureText}
                editable={!loading}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
              <TouchableOpacity 
                style={styles.eyeButton}
                onPress={() => setSecureText(!secureText)}
              >
                <Feather
                  name={secureText ? 'eye-off' : 'eye'}
                  size={16}
                  color="#64748B"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.rememberMeContainer}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={async () => {
                const newRememberMe = !rememberMe;
                setRememberMe(newRememberMe);
                // Nếu bỏ chọn, xóa email đã lưu ngay lập tức
                if (!newRememberMe) {
                  try {
                    await AsyncStorage.removeItem(REMEMBER_EMAIL_KEY);
                  } catch (error) {
                    console.error('Error removing remembered email:', error);
                  }
                }
              }}
              activeOpacity={0.7}
            >
              <View style={[
                styles.checkbox,
                rememberMe && styles.checkboxChecked
              ]}>
                {rememberMe && (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                )}
              </View>
              <Text style={styles.rememberMeText}>Nhớ tài khoản</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.loginButton, loading && styles.buttonDisabled]}
            onPress={onLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.loginGradient}
            >
              <Text style={styles.loginButtonText}>
                {loading ? 'Đang xử lý...' : 'Đăng nhập'}
              </Text>
              {!loading && <Ionicons name="arrow-forward" size={16} color="#fff" />}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>hoặc</Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Chưa có tài khoản? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.signupLink}>Đăng ký ngay</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.featureContainer}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#6366F1" />
              <Text style={styles.featureText}>Nhận diện sản phẩm bằng AI</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#6366F1" />
              <Text style={styles.featureText}>Thống kê realtime</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#6366F1" />
              <Text style={styles.featureText}>Bảo mật cao</Text>
            </View>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}