import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles';

export default function Permissions({ userInfo }) {
  const isAdmin = userInfo?.role === 'admin';

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quyền hạn</Text>
      
      <View style={styles.infoCard}>
        {isAdmin ? (
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
  );
}

