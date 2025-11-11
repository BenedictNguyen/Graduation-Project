import React from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getAvatarById, getDefaultAvatar } from '../../../utils/avatars';
import { formatDate, formatTime } from '../utils/dateUtils';
import { headerStyles } from '../styles';

export default function Header({
  greeting,
  userName,
  userRole,
  userAvatarId,
  currentTime,
  unreadNotificationCount,
  onNotificationPress,
  fadeAnim,
  slideAnim,
}) {
  const avatar = userAvatarId 
    ? getAvatarById(userAvatarId) 
    : getDefaultAvatar();

  return (
    <LinearGradient
      colors={['#1E293B', '#0F172A', '#0A0F1A']}
      style={headerStyles.header}
    >
      <Animated.View 
        style={[
          headerStyles.headerContent,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={headerStyles.headerTop}>
          <View style={headerStyles.userInfoContainer}>
            <LinearGradient
              colors={avatar.colors}
              style={headerStyles.avatarContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons 
                name={avatar.icon} 
                size={28} 
                color="#FFFFFF" 
              />
            </LinearGradient>
            <View style={headerStyles.userTextContainer}>
              <Text style={headerStyles.greetingText}>{greeting} 👋</Text>
              <Text style={headerStyles.userNameText}>{userName || 'User'}</Text>
              <Text style={headerStyles.userRoleText}>
                {userRole === 'admin' ? 'Quản trị viên' : 'Nhân viên'}
              </Text>
            </View>
          </View>
          <TouchableOpacity 
            style={headerStyles.notificationButton}
            activeOpacity={0.7}
            onPress={onNotificationPress}
          >
            <LinearGradient
              colors={['rgba(99, 102, 241, 0.2)', 'rgba(139, 92, 246, 0.1)']}
              style={headerStyles.notificationButtonGradient}
            >
              <Ionicons name="notifications-outline" size={22} color="#CBD5E1" />
              {unreadNotificationCount > 0 && (
                <View style={headerStyles.notificationBadge}>
                  <Text style={headerStyles.notificationBadgeText}>
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                  </Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        <View style={headerStyles.dateTimeContainer}>
          <View style={headerStyles.dateTimeRow}>
            <Ionicons name="calendar-outline" size={16} color="rgba(255, 255, 255, 0.6)" />
            <Text style={headerStyles.dateText}>{formatDate(currentTime)}</Text>
          </View>
          <View style={headerStyles.dateTimeRow}>
            <Ionicons name="time-outline" size={16} color="rgba(255, 255, 255, 0.6)" />
            <Text style={headerStyles.timeText}>{formatTime(currentTime)}</Text>
          </View>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

