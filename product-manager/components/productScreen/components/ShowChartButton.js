import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { styles } from '../styles';

export default function ShowChartButton({ showChart, onToggle }) {
  return (
    <TouchableOpacity 
      style={styles.showChartButton}
      onPress={onToggle}
    >
      <LinearGradient
        colors={showChart ? ['#6366F1', '#8B5CF6'] : ['rgba(99, 102, 241, 0.1)', 'rgba(139, 92, 246, 0.1)']}
        style={styles.showChartButtonGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons 
          name={showChart ? "stats-chart" : "analytics-outline"} 
          size={24} 
          color={showChart ? "#FFFFFF" : "#6366F1"} 
        />
        <Text style={[styles.showChartButtonText, showChart && styles.showChartButtonTextActive]}>
          {showChart ? "Ẩn thống kê" : "Xem thống kê"}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

