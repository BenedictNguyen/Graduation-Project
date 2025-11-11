import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles';

export default function EmptyState({ type = 'history' }) {
  if (type === 'history') {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="folder-open-outline" size={64} color="#475569" />
        <Text style={styles.emptyText}>Chưa có lịch sử</Text>
        <Text style={styles.emptySubtext}>
          Dữ liệu sẽ được cập nhật khi AI phát hiện sản phẩm
        </Text>
      </View>
    );
  }

  return null;
}

