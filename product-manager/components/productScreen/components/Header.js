import React from 'react';
import { Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { styles } from '../styles';

export default function Header() {
  return (
    <LinearGradient
      colors={['#1E293B', '#0F172A']}
      style={styles.header}
    >
      <Text style={styles.headerTitle}>Sản phẩm</Text>
      <Text style={styles.headerSubtitle}>Chi tiết sản phẩm từ AI</Text>
    </LinearGradient>
  );
}

