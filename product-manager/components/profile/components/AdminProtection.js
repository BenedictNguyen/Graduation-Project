import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles';

export default function AdminProtection({ userInfo }) {
  if (userInfo?.role !== 'admin' || !userInfo?.adminProtectionCode) {
    return null;
  }

  return (
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
  );
}

