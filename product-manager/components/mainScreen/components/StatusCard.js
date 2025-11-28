import React, { useState, useEffect } from 'react';
import { View, Text, Animated, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { statusStyles } from '../styles';

// Format timestamp to relative time
const formatRelativeTime = (timestamp) => {
  if (!timestamp) return 'Chưa có dữ liệu';
  
  try {
    // Parse timestamp (format: "YYYY-MM-DD HH:MM:SS")
    const timestampDate = new Date(timestamp.replace(/(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})/, '$1T$2'));
    const now = new Date();
    const diffMs = now - timestampDate;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffSeconds < 10) return 'Vừa xong';
    if (diffSeconds < 60) return `${diffSeconds} giây trước`;
    if (diffMinutes < 60) return `${diffMinutes} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    
    // Format date if older than 24 hours
    const day = timestampDate.getDate();
    const month = timestampDate.getMonth() + 1;
    const hours = timestampDate.getHours().toString().padStart(2, '0');
    const minutes = timestampDate.getMinutes().toString().padStart(2, '0');
    return `${day}/${month} ${hours}:${minutes}`;
  } catch (error) {
    return timestamp;
  }
};

export default function StatusCard({ latestData, connectionStatus, scaleAnim, fadeAnim, onRefresh }) {
  const [relativeTime, setRelativeTime] = useState(formatRelativeTime(latestData?.timestamp));
  const [refreshAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));

  // Update relative time every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRelativeTime(formatRelativeTime(latestData?.timestamp));
    }, 10000);
    
    return () => clearInterval(interval);
  }, [latestData?.timestamp]);

  // Pulse animation for connected dot
  useEffect(() => {
    if (connectionStatus === 'connected') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.5,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [connectionStatus]);

  const handleRefresh = () => {
    if (onRefresh) {
      // Animate refresh icon
      Animated.sequence([
        Animated.timing(refreshAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(refreshAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      
      onRefresh();
    }
  };

  const refreshRotation = refreshAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const isConnected = connectionStatus === 'connected';

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale: scaleAnim }],
          opacity: fadeAnim,
        },
      ]}
    >
      <LinearGradient
        colors={[
          'rgba(30, 41, 59, 0.8)',
          'rgba(15, 23, 42, 0.7)',
          'rgba(30, 41, 59, 0.6)'
        ]}
        style={statusStyles.combinedStatusCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Refresh button - Top right */}
        {onRefresh && (
          <TouchableOpacity
            style={statusStyles.combinedStatusRefreshButton}
            onPress={handleRefresh}
            activeOpacity={0.7}
          >
            <Animated.View style={{ transform: [{ rotate: refreshRotation }] }}>
              <Ionicons name="refresh" size={16} color="rgba(148, 163, 184, 0.8)" />
            </Animated.View>
          </TouchableOpacity>
        )}
        
        {/* Cập nhật lần cuối - Left side */}
        <View style={statusStyles.combinedStatusLeft}>
          <LinearGradient
            colors={['rgba(16, 185, 129, 0.2)', 'rgba(5, 150, 105, 0.15)']}
            style={statusStyles.combinedStatusIconContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="time" size={20} color="#10B981" />
          </LinearGradient>
          <View style={statusStyles.combinedStatusTextContainer}>
            <Text style={statusStyles.combinedStatusLabel}>Cập nhật lần cuối</Text>
            <Text style={statusStyles.combinedStatusValue} numberOfLines={1}>
              {relativeTime}
            </Text>
            {latestData?.timestamp && (
              <Text style={statusStyles.combinedStatusSubtext} numberOfLines={1}>
                {latestData.timestamp}
              </Text>
            )}
          </View>
        </View>

        {/* Divider */}
        <View style={statusStyles.combinedStatusDivider} />

        {/* Trạng thái kệ - Right side */}
        <View style={statusStyles.combinedStatusRight}>
          <LinearGradient
            colors={
              isConnected
                ? ['rgba(16, 185, 129, 0.2)', 'rgba(5, 150, 105, 0.15)']
                : ['rgba(245, 158, 11, 0.2)', 'rgba(217, 119, 6, 0.15)']
            }
            style={[
              statusStyles.combinedStatusIconContainer,
              !isConnected && statusStyles.combinedStatusIconContainerWarning
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons 
              name={isConnected ? 'wifi' : 'wifi-outline'} 
              size={20} 
              color={isConnected ? '#10B981' : '#F59E0B'} 
            />
          </LinearGradient>
          <View style={statusStyles.combinedStatusTextContainer}>
            <Text style={statusStyles.combinedStatusLabel}>Trạng thái kệ</Text>
            <View style={statusStyles.combinedStatusRow}>
              <Animated.View
                style={[
                  statusStyles.combinedStatusDot,
                  isConnected && statusStyles.combinedStatusDotConnected,
                  {
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              />
              <Text style={[
                statusStyles.combinedStatusValue,
                isConnected && statusStyles.combinedStatusValueConnected
              ]}>
                {isConnected ? 'Đã kết nối' : 'Chờ kết nối'}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

