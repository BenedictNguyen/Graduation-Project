import React from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { statsStyles } from '../styles';

export default function StatsCards({ totalProducts, productTypes, onProductTypesPress, scaleAnim }) {
  return (
    <Animated.View 
      style={[
        statsStyles.statsRow,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity 
        activeOpacity={0.9}
        style={statsStyles.statCardTouchable}
      >
        <LinearGradient
          colors={['#6366F1', '#8B5CF6', '#A78BFA']}
          style={statsStyles.statCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={statsStyles.statCardHeader}>
            <View style={statsStyles.statIconContainer}>
              <Ionicons name="cube" size={20} color="#FFFFFF" />
            </View>
            <View style={statsStyles.statCardBadge}>
              <Ionicons name="stats-chart" size={16} color="rgba(255, 255, 255, 0.7)" />
            </View>
          </View>
          <Text style={statsStyles.statValue}>{totalProducts}</Text>
          <Text style={statsStyles.statLabel}>Tổng sản phẩm</Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity 
        activeOpacity={0.9}
        style={statsStyles.statCardTouchable}
        onPress={onProductTypesPress}
      >
        <LinearGradient
          colors={['#EC4899', '#F472B6', '#F9A8D4']}
          style={statsStyles.statCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={statsStyles.statCardHeader}>
            <View style={statsStyles.statIconContainer}>
              <Ionicons name="albums" size={20} color="#FFFFFF" />
            </View>
            <View style={statsStyles.statCardBadge}>
              <Ionicons name="grid" size={16} color="rgba(255, 255, 255, 0.7)" />
            </View>
          </View>
          <Text style={statsStyles.statValue}>{productTypes}</Text>
          <Text style={statsStyles.statLabel}>Loại sản phẩm</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

