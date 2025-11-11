import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { styles } from '../styles';

export default function AboutModal({ visible, onClose }) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
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
                onPress={onClose}
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
  );
}

