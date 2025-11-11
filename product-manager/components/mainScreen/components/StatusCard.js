import React from 'react';
import { View, Text, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { statusStyles } from '../styles';

export default function StatusCard({ latestData, connectionStatus, scaleAnim, fadeAnim }) {
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
        colors={['rgba(30, 41, 59, 0.6)', 'rgba(15, 23, 42, 0.5)']}
        style={statusStyles.combinedStatusCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Badge góc trên bên phải */}
        <View style={statusStyles.combinedStatusBadge}>
          <Ionicons name="sync" size={14} color="rgba(148, 163, 184, 0.6)" />
        </View>
        
        {/* Cập nhật lần cuối - Left side */}
        <View style={statusStyles.combinedStatusLeft}>
          <View style={statusStyles.combinedStatusIconContainer}>
            <Ionicons name="time" size={18} color="#10B981" />
          </View>
          <View style={statusStyles.combinedStatusTextContainer}>
            <Text style={statusStyles.combinedStatusLabel}>Cập nhật lần cuối</Text>
            <Text style={statusStyles.combinedStatusValue} numberOfLines={1}>
              {latestData?.timestamp || 'Không có dữ liệu'}
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={statusStyles.combinedStatusDivider} />

        {/* Trạng thái kệ - Right side */}
        <View style={statusStyles.combinedStatusRight}>
          <View style={[
            statusStyles.combinedStatusIconContainer,
            connectionStatus === 'connected' && statusStyles.combinedStatusIconContainerConnected
          ]}>
            <Ionicons 
              name={connectionStatus === 'connected' ? 'wifi' : 'wifi-outline'} 
              size={18} 
              color={connectionStatus === 'connected' ? '#10B981' : '#F59E0B'} 
            />
          </View>
          <View style={statusStyles.combinedStatusTextContainer}>
            <Text style={statusStyles.combinedStatusLabel}>Trạng thái kệ</Text>
            <View style={statusStyles.combinedStatusRow}>
              <View style={[
                statusStyles.combinedStatusDot,
                connectionStatus === 'connected' && statusStyles.combinedStatusDotConnected
              ]} />
              <Text style={[
                statusStyles.combinedStatusValue,
                connectionStatus === 'connected' && statusStyles.combinedStatusValueConnected
              ]}>
                {connectionStatus === 'connected' ? 'Đã kết nối' : 'Chờ kết nối'}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

