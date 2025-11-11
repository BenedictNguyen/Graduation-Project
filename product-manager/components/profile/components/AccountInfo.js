import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles';

export default function AccountInfo({ userInfo, onEditNamePress }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Thông tin tài khoản</Text>
      
      <View style={styles.infoCard}>
        <TouchableOpacity 
          style={styles.infoItem}
          onPress={onEditNamePress}
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
  );
}

