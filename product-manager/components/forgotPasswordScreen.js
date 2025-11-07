import React, { useState } from 'react';
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
import { handleForgotPassword } from '../utils/auth';
import { useResponsive } from '../utils/responsive';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const r = useResponsive();

  const onSendResetEmail = async () => {
    if (!email) {
      alert('Vui lòng nhập địa chỉ email');
      return;
    }

    setLoading(true);
    try {
      const result = await handleForgotPassword(email);

      if (result.success) {
        setSuccess(true);
      } else {
        alert(result.message || 'Gửi email thất bại');
      }
    } catch (error) {
      alert('Lỗi: ' + error.message);
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
    },
    formContainer: {
      backgroundColor: 'rgba(30, 41, 59, 0.6)',
      borderRadius: 20,
      padding: r.spacing.lg,
      borderWidth: 1,
      borderColor: 'rgba(99, 102, 241, 0.2)',
      maxWidth: 400,
      alignSelf: 'center',
      width: '90%',
    },
    welcomeText: {
      fontSize: r.fontSize.xl,
      fontWeight: '700',
      color: '#FFFFFF',
      marginBottom: 4,
    },
    subText: {
      fontSize: r.fontSize.sm,
      color: '#94A3B8',
      marginBottom: r.spacing.md,
    },
    inputWrapper: {
      marginBottom: r.spacing.md,
    },
    inputLabel: {
      fontSize: r.fontSize.xs,
      fontWeight: '600',
      color: '#CBD5E1',
      marginBottom: r.spacing.xs,
      marginLeft: 4,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(15, 23, 42, 0.5)',
      borderRadius: 12,
      borderWidth: 2,
      paddingHorizontal: r.spacing.sm,
      height: 48,
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
      fontSize: r.fontSize.sm,
      color: '#FFFFFF',
      outlineStyle: 'none',
    },
    sendButton: {
      height: 48,
      borderRadius: 12,
      overflow: 'hidden',
      marginTop: r.spacing.sm,
    },
    sendGradient: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: r.spacing.xs,
    },
    sendButtonText: {
      fontSize: r.fontSize.base,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    successContainer: {
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.3)',
      borderRadius: 12,
      padding: r.spacing.md,
      marginTop: r.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: r.spacing.sm,
    },
    successText: {
      flex: 1,
      fontSize: r.fontSize.sm,
      color: '#10B981',
      lineHeight: 20,
    },
    backToLoginContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: r.spacing.md,
    },
    backToLoginText: {
      fontSize: r.fontSize.sm,
      color: '#94A3B8',
    },
    backToLoginLink: {
      fontSize: r.fontSize.sm,
      color: '#6366F1',
      fontWeight: '700',
      marginLeft: 4,
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
          <Text style={styles.brandTitle}>Product AI</Text>
          <Text style={styles.brandSubtitle}>Quản lý thông minh với AI</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.welcomeText}>Quên mật khẩu?</Text>
          <Text style={styles.subText}>
            Nhập email của bạn để nhận link đặt lại mật khẩu
          </Text>

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
                editable={!loading && !success}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>
          </View>

          {success && (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.successText}>
                Email đặt lại mật khẩu đã được gửi! Vui lòng kiểm tra hộp thư của bạn.
              </Text>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.sendButton, (loading || success) && styles.buttonDisabled]}
            onPress={onSendResetEmail}
            disabled={loading || success}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.sendGradient}
            >
              <Text style={styles.sendButtonText}>
                {loading ? 'Đang gửi...' : success ? 'Đã gửi' : 'Gửi email đặt lại'}
              </Text>
              {!loading && !success && <Ionicons name="mail-outline" size={16} color="#fff" />}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.backToLoginContainer}>
            <Text style={styles.backToLoginText}>Nhớ mật khẩu? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backToLoginLink}>Quay lại đăng nhập</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

