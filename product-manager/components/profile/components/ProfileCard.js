import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getAvatarById, getDefaultAvatar } from '../../../utils/avatars';
import { styles } from '../styles';

export default function ProfileCard({ userInfo, onAvatarPress }) {
  const avatar = userInfo?.avatarId 
    ? getAvatarById(userInfo.avatarId) 
    : getDefaultAvatar();

  return (
    <View style={styles.profileCard}>
      <LinearGradient
        colors={['rgba(99, 102, 241, 0.15)', 'rgba(139, 92, 246, 0.05)']}
        style={styles.profileCardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.avatarContainer}>
          <TouchableOpacity
            onPress={onAvatarPress}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={avatar.colors}
              style={styles.avatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name={avatar.icon} size={32} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.avatarEditBadge}>
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <View style={styles.roleBadgeProfile}>
            <Ionicons 
              name={userInfo?.role === 'admin' ? 'shield-checkmark' : 'person'} 
              size={14} 
              color={userInfo?.role === 'admin' ? '#FCD34D' : '#6366F1'} 
            />
            <Text style={[
              styles.roleBadgeText,
              { color: userInfo?.role === 'admin' ? '#FCD34D' : '#6366F1' }
            ]}>
              {userInfo?.role === 'admin' ? 'Admin' : 'Nhân viên'}
            </Text>
          </View>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>
            {userInfo?.displayName || userInfo?.email?.split('@')[0] || 'User'}
          </Text>
          <Text style={styles.profileEmail}>{userInfo?.email}</Text>
          <Text style={styles.profileId}>ID: {userInfo?.employeeId}</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

