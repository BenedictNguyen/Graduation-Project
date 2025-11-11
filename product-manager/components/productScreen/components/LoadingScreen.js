import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { styles } from '../styles';

export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      </View>
    </View>
  );
}

