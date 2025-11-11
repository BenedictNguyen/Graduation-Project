import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { clearUserSession } from '../../utils/auth';
import BottomTabBar from '../bottomTabBar';
import AvatarSelector from '../AvatarSelector';

// Components
import ProfileCard from './components/ProfileCard';
import AccountInfo from './components/AccountInfo';
import Permissions from './components/Permissions';
import AdminProtection from './components/AdminProtection';
import Settings from './components/Settings';
import DeveloperInfo from './components/DeveloperInfo';
import EditNameModal from './components/EditNameModal';
import AboutModal from './components/AboutModal';

// Hooks
import { useUserInfo } from './hooks/useUserInfo';
import { useProfileData } from './hooks/useProfileData';

// Styles
import { styles } from './styles';

export default function ProfileScreen({ navigation }) {
  const { userInfo, loading, loadUserInfo, setUserInfo } = useUserInfo();
  const {
    showAboutModal,
    setShowAboutModal,
    avatarSelectorVisible,
    setAvatarSelectorVisible,
    showEditNameModal,
    setShowEditNameModal,
    displayName,
    setDisplayName,
    savingName,
    setSavingName,
  } = useProfileData();

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất?',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearUserSession();
              navigation.replace('Login');
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể đăng xuất: ' + error.message);
            }
          },
        },
      ]
    );
  };

  const handleEditNamePress = () => {
    setDisplayName(userInfo?.displayName || userInfo?.email?.split('@')[0] || '');
    setShowEditNameModal(true);
  };

  const handleSaveNameSuccess = (newDisplayName) => {
    setUserInfo(prev => ({
      ...prev,
      displayName: newDisplayName,
    }));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <LinearGradient
          colors={['#1E293B', '#0F172A']}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Tài khoản</Text>
          <Text style={styles.headerSubtitle}>Quản lý thông tin cá nhân</Text>
        </LinearGradient>

        <View style={styles.content}>
          <ProfileCard 
            userInfo={userInfo} 
            onAvatarPress={() => setAvatarSelectorVisible(true)}
          />

          <AccountInfo 
            userInfo={userInfo} 
            onEditNamePress={handleEditNamePress}
          />

          <Permissions userInfo={userInfo} />

          <AdminProtection userInfo={userInfo} />

          <Settings onAboutPress={() => setShowAboutModal(true)} />

          <DeveloperInfo />

          {/* Logout Button */}
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#EF4444', '#DC2626']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.logoutGradient}
            >
              <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
              <Text style={styles.logoutText}>Đăng xuất</Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>

      <BottomTabBar navigation={navigation} currentRoute="Profile" />

      {/* Avatar Selector Modal */}
      <AvatarSelector
        visible={avatarSelectorVisible}
        onClose={() => setAvatarSelectorVisible(false)}
        currentAvatarId={userInfo?.avatarId || null}
        onAvatarSelected={async () => {
          await loadUserInfo();
        }}
      />

      {/* Edit Display Name Modal */}
      <EditNameModal
        visible={showEditNameModal}
        onClose={() => setShowEditNameModal(false)}
        displayName={displayName}
        setDisplayName={setDisplayName}
        savingName={savingName}
        setSavingName={setSavingName}
        onSaveSuccess={handleSaveNameSuccess}
      />

      {/* About App Modal */}
      <AboutModal
        visible={showAboutModal}
        onClose={() => setShowAboutModal(false)}
      />
    </View>
  );
}

