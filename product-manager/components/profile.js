import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../utils/firebaseConfig';
import { getDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { clearUserSession } from '../utils/auth';
import BottomTabBar from './bottomTabBar';
import AvatarSelector from './AvatarSelector';
import { getAvatarById, getDefaultAvatar } from '../utils/avatars';

export default function ProfileScreen({ navigation }) {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [avatarSelectorVisible, setAvatarSelectorVisible] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    loadUserInfo();
    
    // Lắng nghe thay đổi avatar và tên hiển thị
    const user = auth.currentUser;
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          setUserInfo(prev => ({
            ...prev,
            avatarId: data.avatarId || null,
            displayName: data.displayName || null,
          }));
        }
      });
      
      return () => unsubscribe();
    }
  }, []);

  // Tạo mã khóa bảo vệ
  const generateProtectionCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const loadUserInfo = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          let userData = userDoc.data();
          
          // Nếu là Admin nhưng chưa có mã khóa bảo vệ, tạo mã mới
          if (userData.role === 'admin' && !userData.adminProtectionCode) {
            const newCode = generateProtectionCode();
            await updateDoc(userDocRef, {
              adminProtectionCode: newCode
            });
            userData.adminProtectionCode = newCode;
          }
          
          setUserInfo({
            uid: user.uid,
            email: user.email,
            ...userData,
          });
        }
      }
    } catch (error) {
      console.error('Error loading user info:', error);
    } finally {
      setLoading(false);
    }
  };

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
          {/* Avatar & Name Section */}
          <View style={styles.profileCard}>
            <LinearGradient
              colors={['rgba(99, 102, 241, 0.15)', 'rgba(139, 92, 246, 0.05)']}
              style={styles.profileCardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.avatarContainer}>
                <TouchableOpacity
                  onPress={() => setAvatarSelectorVisible(true)}
                  activeOpacity={0.8}
                >
                  {(() => {
                    const avatar = userInfo?.avatarId 
                      ? getAvatarById(userInfo.avatarId) 
                      : getDefaultAvatar();
                    return (
                      <LinearGradient
                        colors={avatar.colors}
                        style={styles.avatar}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Ionicons name={avatar.icon} size={32} color="#FFFFFF" />
                      </LinearGradient>
                    );
                  })()}
                  <View style={styles.avatarEditBadge}>
                    <Ionicons name="camera" size={14} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
                <View style={styles.roleBadgeProfile}>
                  <Ionicons 
                    name={userInfo?.role === 'admin' ? 'shield-checkmark' : 'person'} 
                    size={14} 
                    color={userInfo?.role === 'admin' ? '#FCD34D' : '#6366F1'} 
                  />
                  <Text style={[
                    styles.roleBadgeText,
                    { color: userInfo?.role === 'admin' ? '#FCD34D' : '#6366F1' }
                  ]}>
                    {userInfo?.role === 'admin' ? 'Admin' : 'Nhân viên'}
                  </Text>
                </View>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {userInfo?.displayName || userInfo?.email?.split('@')[0] || 'User'}
                </Text>
                <Text style={styles.profileEmail}>{userInfo?.email}</Text>
                <Text style={styles.profileId}>ID: {userInfo?.employeeId}</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Account Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin tài khoản</Text>
            
            <View style={styles.infoCard}>
              <TouchableOpacity 
                style={styles.infoItem}
                onPress={() => {
                  setDisplayName(userInfo?.displayName || userInfo?.email?.split('@')[0] || '');
                  setShowEditNameModal(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.infoLeft}>
                  <Ionicons name="person-outline" size={20} color="#6366F1" />
                  <Text style={styles.infoLabel}>Tên hiển thị</Text>
                </View>
                <View style={styles.infoRight}>
                  <Text style={styles.infoValue}>
                    {userInfo?.displayName || userInfo?.email?.split('@')[0] || 'User'}
                  </Text>
                  <Ionicons name="pencil" size={16} color="#6366F1" style={styles.editIcon} />
                </View>
              </TouchableOpacity>

              <View style={styles.infoDivider} />

              <View style={styles.infoItem}>
                <View style={styles.infoLeft}>
                  <Ionicons name="mail-outline" size={20} color="#6366F1" />
                  <Text style={styles.infoLabel}>Email</Text>
                </View>
                <Text style={styles.infoValue}>{userInfo?.email}</Text>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoItem}>
                <View style={styles.infoLeft}>
                  <Ionicons name="shield-checkmark-outline" size={20} color="#6366F1" />
                  <Text style={styles.infoLabel}>Vai trò</Text>
                </View>
                <Text style={styles.infoValue}>
                  {userInfo?.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}
                </Text>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoItem}>
                <View style={styles.infoLeft}>
                  <Ionicons name="card-outline" size={20} color="#6366F1" />
                  <Text style={styles.infoLabel}>Mã nhân viên</Text>
                </View>
                <Text style={styles.infoValue}>{userInfo?.employeeId}</Text>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoItem}>
                <View style={styles.infoLeft}>
                  <Ionicons name="calendar-outline" size={20} color="#6366F1" />
                  <Text style={styles.infoLabel}>Ngày tạo</Text>
                </View>
                <Text style={styles.infoValue}>
                  {userInfo?.createdAt ? new Date(userInfo.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                </Text>
              </View>
            </View>
          </View>

          {/* Permissions Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quyền hạn</Text>
            
            <View style={styles.infoCard}>
              {userInfo?.role === 'admin' ? (
                <>
                  <View style={styles.permissionItem}>
                    <View style={styles.permissionLeft}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      <Text style={styles.permissionText}>Toàn quyền truy cập</Text>
                    </View>
                  </View>
                  <View style={styles.infoDivider} />
                  <View style={styles.permissionItem}>
                    <View style={styles.permissionLeft}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      <Text style={styles.permissionText}>Xem tất cả dữ liệu</Text>
                    </View>
                  </View>
                  <View style={styles.infoDivider} />
                  <View style={styles.permissionItem}>
                    <View style={styles.permissionLeft}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      <Text style={styles.permissionText}>Quản lý người dùng</Text>
                    </View>
                  </View>
                  <View style={styles.infoDivider} />
                  <View style={styles.permissionItem}>
                    <View style={styles.permissionLeft}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      <Text style={styles.permissionText}>Xóa dữ liệu (nếu cần)</Text>
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.permissionItem}>
                    <View style={styles.permissionLeft}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      <Text style={styles.permissionText}>Xem dữ liệu sản phẩm</Text>
                    </View>
                  </View>
                  <View style={styles.infoDivider} />
                  <View style={styles.permissionItem}>
                    <View style={styles.permissionLeft}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      <Text style={styles.permissionText}>Xem thống kê</Text>
                    </View>
                  </View>
                  <View style={styles.infoDivider} />
                  <View style={styles.permissionItem}>
                    <View style={styles.permissionLeft}>
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                      <Text style={styles.permissionText}>Không thể chỉnh sửa dữ liệu</Text>
                    </View>
                  </View>
                  <View style={styles.infoDivider} />
                  <View style={styles.permissionItem}>
                    <View style={styles.permissionLeft}>
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                      <Text style={styles.permissionText}>Không thể xóa dữ liệu</Text>
                    </View>
                  </View>
                  <View style={styles.infoDivider} />
                  <View style={styles.permissionItem}>
                    <View style={styles.permissionLeft}>
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                      <Text style={styles.permissionText}>Không thể quản lý người dùng</Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Admin Protection Code Section */}
          {userInfo?.role === 'admin' && userInfo?.adminProtectionCode && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Mã khóa bảo vệ Admin</Text>
              
              <View style={styles.infoCard}>
                <View style={styles.protectionCodeContainer}>
                  <View style={styles.protectionCodeHeader}>
                    <Ionicons name="shield-checkmark" size={20} color="#FCD34D" />
                    <Text style={styles.protectionCodeLabel}>Mã khóa của bạn</Text>
                  </View>
                  <View style={styles.protectionCodeBox}>
                    <Text style={styles.protectionCodeText}>
                      {userInfo.adminProtectionCode}
                    </Text>
                  </View>
                  <Text style={styles.protectionCodeDescription}>
                    Mã này được dùng để đăng ký tài khoản Admin mới. Hãy giữ bí mật!
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Settings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cài đặt</Text>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => setShowAboutModal(true)}
            >
              <View style={styles.settingLeft}>
                <View style={styles.settingIcon}>
                  <Ionicons name="information-circle-outline" size={20} color="#6366F1" />
                </View>
                <Text style={styles.settingText}>Về ứng dụng</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Developer Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin nhà phát triển</Text>
            
            <View style={styles.infoCard}>
              <View style={styles.developerItem}>
                <View style={styles.developerAvatar}>
                  <LinearGradient
                    colors={['#6366F1', '#8B5CF6']}
                    style={styles.developerAvatarGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.developerAvatarText}>NĐA</Text>
                  </LinearGradient>
                </View>
                <View style={styles.developerInfo}>
                  <Text style={styles.developerName}>Nguyễn Đức Ân</Text>
                  <TouchableOpacity
                    onPress={() => Linking.openURL('mailto:nguyenducan1172003@gmail.com')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.emailContainer}>
                      <Ionicons name="mail-outline" size={16} color="#6366F1" />
                      <Text style={styles.developerEmail}>nguyenducan1172003@gmail.com</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.developerItem}>
                <View style={styles.developerAvatar}>
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    style={styles.developerAvatarGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.developerAvatarText}>ĐHĐH</Text>
                  </LinearGradient>
                </View>
                <View style={styles.developerInfo}>
                  <Text style={styles.developerName}>Đặng Hồ Đức Huy</Text>
                  <TouchableOpacity
                    onPress={() => Linking.openURL('mailto:hoduckhuy@gmail.com')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.emailContainer}>
                      <Ionicons name="mail-outline" size={16} color="#6366F1" />
                      <Text style={styles.developerEmail}>hoduckhuy@gmail.com</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

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
        onAvatarSelected={async (avatarId) => {
          await loadUserInfo();
        }}
      />

      {/* Edit Display Name Modal */}
      <Modal
        visible={showEditNameModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowEditNameModal(false)}
      >
        <View style={styles.editNameModalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowEditNameModal(false)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.editNameModalContainer}
          >
            <View style={styles.editNameModalContent}>
                <LinearGradient
                  colors={['#1E293B', '#0F172A']}
                  style={styles.editNameModalGradient}
                >
                  <View style={styles.editNameModalHeader}>
                    <Text style={styles.editNameModalTitle}>Chỉnh sửa tên hiển thị</Text>
                    <TouchableOpacity
                      onPress={() => setShowEditNameModal(false)}
                      style={styles.closeButton}
                    >
                      <Ionicons name="close" size={24} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.editNameModalBody}>
                    <Text style={styles.editNameLabel}>Tên hiển thị</Text>
                    <TextInput
                      style={styles.editNameInput}
                      value={displayName}
                      onChangeText={setDisplayName}
                      placeholder="Nhập tên hiển thị"
                      placeholderTextColor="#64748B"
                      maxLength={50}
                      autoFocus={true}
                    />
                    <Text style={styles.editNameHint}>
                      Tên này sẽ hiển thị trong ứng dụng
                    </Text>
                  </View>

                  <View style={styles.editNameModalFooter}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => setShowEditNameModal(false)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.cancelButtonText}>Hủy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.saveButton, savingName && styles.saveButtonDisabled]}
                      onPress={async () => {
                        if (savingName) return;
                        if (!displayName.trim()) {
                          Alert.alert('Lỗi', 'Vui lòng nhập tên hiển thị');
                          return;
                        }
                        
                        setSavingName(true);
                        try {
                          const user = auth.currentUser;
                          if (user) {
                            const userDocRef = doc(db, 'users', user.uid);
                            await updateDoc(userDocRef, {
                              displayName: displayName.trim(),
                            });
                            setUserInfo(prev => ({
                              ...prev,
                              displayName: displayName.trim(),
                            }));
                            setShowEditNameModal(false);
                            Alert.alert('Thành công', 'Đã cập nhật tên hiển thị');
                          }
                        } catch (error) {
                          console.error('Error updating display name:', error);
                          Alert.alert('Lỗi', 'Không thể cập nhật tên hiển thị: ' + error.message);
                        } finally {
                          setSavingName(false);
                        }
                      }}
                      activeOpacity={0.7}
                      disabled={savingName}
                    >
                      {savingName ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.saveButtonText}>Lưu</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* About App Modal */}
      <Modal
        visible={showAboutModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAboutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#1E293B', '#0F172A']}
              style={styles.modalGradient}
            >
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <LinearGradient
                    colors={['#6366F1', '#8B5CF6']}
                    style={styles.appIcon}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="cube" size={32} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={styles.appTitleContainer}>
                    <Text style={styles.appTitle}>Product AI</Text>
                    <Text style={styles.appSubtitle}>Quản lý sản phẩm thông minh</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setShowAboutModal(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.modalScrollView}
                showsVerticalScrollIndicator={false}
              >
                {/* Description */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Mô tả</Text>
                  <Text style={styles.modalDescription}>
                    Product AI là ứng dụng quản lý sản phẩm chuyên nghiệp, được thiết kế để giúp doanh nghiệp theo dõi và quản lý hàng tồn kho một cách hiệu quả. Với giao diện hiện đại và tính năng mạnh mẽ, ứng dụng giúp bạn nắm bắt thông tin sản phẩm trong thời gian thực, phân tích xu hướng và đưa ra quyết định kinh doanh thông minh.
                  </Text>
                </View>

                {/* Features */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Tính năng nổi bật</Text>
                  
                  <View style={styles.featureItem}>
                    <View style={styles.featureIcon}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    </View>
                    <View style={styles.featureContent}>
                      <Text style={styles.featureTitle}>Theo dõi thời gian thực</Text>
                      <Text style={styles.featureDescription}>
                        Cập nhật số lượng sản phẩm tự động, theo dõi mọi thay đổi ngay lập tức
                      </Text>
                    </View>
                  </View>

                  <View style={styles.featureItem}>
                    <View style={styles.featureIcon}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    </View>
                    <View style={styles.featureContent}>
                      <Text style={styles.featureTitle}>Thống kê trực quan</Text>
                      <Text style={styles.featureDescription}>
                        Biểu đồ và báo cáo chi tiết theo ngày, tuần, tháng giúp phân tích xu hướng
                      </Text>
                    </View>
                  </View>

                  <View style={styles.featureItem}>
                    <View style={styles.featureIcon}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    </View>
                    <View style={styles.featureContent}>
                      <Text style={styles.featureTitle}>Quản lý đa cấp</Text>
                      <Text style={styles.featureDescription}>
                        Hệ thống phân quyền linh hoạt cho Admin và Nhân viên với quyền truy cập phù hợp
                      </Text>
                    </View>
                  </View>

                  <View style={styles.featureItem}>
                    <View style={styles.featureIcon}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    </View>
                    <View style={styles.featureContent}>
                      <Text style={styles.featureTitle}>Bảo mật cao</Text>
                      <Text style={styles.featureDescription}>
                        Xác thực người dùng an toàn, mã hóa dữ liệu và bảo vệ thông tin nhạy cảm
                      </Text>
                    </View>
                  </View>

                  <View style={styles.featureItem}>
                    <View style={styles.featureIcon}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    </View>
                    <View style={styles.featureContent}>
                      <Text style={styles.featureTitle}>Giao diện hiện đại</Text>
                      <Text style={styles.featureDescription}>
                        Thiết kế Material Design với trải nghiệm người dùng mượt mà và trực quan
                      </Text>
                    </View>
                  </View>

                  <View style={styles.featureItem}>
                    <View style={styles.featureIcon}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    </View>
                    <View style={styles.featureContent}>
                      <Text style={styles.featureTitle}>Đồng bộ đám mây</Text>
                      <Text style={styles.featureDescription}>
                        Dữ liệu được lưu trữ an toàn trên Firebase, đồng bộ trên mọi thiết bị
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Technical Info */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Thông tin kỹ thuật</Text>
                  
                  <View style={styles.techInfoRow}>
                    <Text style={styles.techInfoLabel}>Phiên bản</Text>
                    <Text style={styles.techInfoValue}>1.0.0</Text>
                  </View>
                  
                  <View style={styles.techInfoRow}>
                    <Text style={styles.techInfoLabel}>Nền tảng</Text>
                    <Text style={styles.techInfoValue}>React Native</Text>
                  </View>
                  
                  <View style={styles.techInfoRow}>
                    <Text style={styles.techInfoLabel}>Cơ sở dữ liệu</Text>
                    <Text style={styles.techInfoValue}>Firebase Firestore</Text>
                  </View>
                  
                  <View style={styles.techInfoRow}>
                    <Text style={styles.techInfoLabel}>Xác thực</Text>
                    <Text style={styles.techInfoValue}>Firebase Authentication</Text>
                  </View>
                </View>

                {/* Developer Info */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Nhà phát triển</Text>
                  <Text style={styles.developerText}>
                    Ứng dụng được phát triển với mục tiêu mang lại giải pháp quản lý sản phẩm hiệu quả và dễ sử dụng cho các doanh nghiệp. Chúng tôi cam kết không ngừng cải thiện và cập nhật tính năng mới để đáp ứng nhu cầu ngày càng cao của người dùng.
                  </Text>
                </View>

                {/* Footer */}
                <View style={styles.modalFooter}>
                  <Text style={styles.modalFooterText}>
                    © 2024 Product AI. Tất cả quyền được bảo lưu.
                  </Text>
                </View>
              </ScrollView>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 36,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -1,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '500',
  },
  content: {
    padding: 20,
  },
  profileCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  profileCardGradient: {
    padding: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderRadius: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 4,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  roleBadgeProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  profileInfo: {
    alignItems: 'center',
    width: '100%',
  },
  profileName: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  profileEmail: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 4,
  },
  profileId: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'monospace',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 14,
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  infoCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    maxWidth: '50%',
    textAlign: 'right',
  },
  infoRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editIcon: {
    marginLeft: 4,
  },
  infoDivider: {
    height: 1,
    backgroundColor: 'rgba(71, 85, 105, 0.3)',
  },
  permissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  permissionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  permissionText: {
    fontSize: 14,
    color: '#E2E8F0',
    fontWeight: '500',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.3)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  logoutButton: {
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  logoutGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  versionText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#94A3B8',
  },
  developerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  developerAvatar: {
    marginRight: 16,
  },
  developerAvatarGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  developerAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  developerInfo: {
    flex: 1,
  },
  developerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  developerEmail: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '90%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  modalGradient: {
    flex: 1,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(71, 85, 105, 0.3)',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  appIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appTitleContainer: {
    flex: 1,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  appSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalSection: {
    marginTop: 24,
  },
  modalSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  modalDescription: {
    fontSize: 15,
    lineHeight: 24,
    color: '#E2E8F0',
    fontWeight: '400',
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  featureIcon: {
    marginTop: 2,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#94A3B8',
    fontWeight: '400',
  },
  techInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(71, 85, 105, 0.2)',
  },
  techInfoLabel: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  techInfoValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  developerText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#E2E8F0',
    fontWeight: '400',
  },
  modalFooter: {
    marginTop: 32,
    marginBottom: 40,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(71, 85, 105, 0.3)',
  },
  modalFooterText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '400',
  },
  protectionCodeContainer: {
    padding: 4,
  },
  protectionCodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  protectionCodeLabel: {
    fontSize: 14,
    color: '#FCD34D',
    fontWeight: '600',
  },
  protectionCodeBox: {
    backgroundColor: 'rgba(252, 211, 77, 0.1)',
    borderWidth: 2,
    borderColor: '#FCD34D',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  protectionCodeText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FCD34D',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  protectionCodeDescription: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  editNameModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editNameModalContainer: {
    width: '100%',
    maxWidth: 400,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editNameModalContent: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  editNameModalGradient: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  editNameModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(71, 85, 105, 0.3)',
  },
  editNameModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  editNameModalBody: {
    padding: 20,
  },
  editNameLabel: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 8,
  },
  editNameInput: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    marginBottom: 8,
  },
  editNameHint: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  editNameModalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.3)',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#6366F1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});