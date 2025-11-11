import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { styles } from '../styles';

export default function DeveloperInfo() {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Thông tin nhà phát triển</Text>
      
      <View style={styles.infoCard}>
        <View style={styles.developerItem}>
          <View style={styles.developerAvatar}>
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              style={styles.developerAvatarGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.developerAvatarText}>NĐA</Text>
            </LinearGradient>
          </View>
          <View style={styles.developerInfo}>
            <Text style={styles.developerName}>Nguyễn Đức Ân</Text>
            <TouchableOpacity
              onPress={() => Linking.openURL('mailto:nguyenducan1172003@gmail.com')}
              activeOpacity={0.7}
            >
              <View style={styles.emailContainer}>
                <Ionicons name="mail-outline" size={16} color="#6366F1" />
                <Text style={styles.developerEmail}>nguyenducan1172003@gmail.com</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoDivider} />

        <View style={styles.developerItem}>
          <View style={styles.developerAvatar}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.developerAvatarGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.developerAvatarText}>ĐHĐH</Text>
            </LinearGradient>
          </View>
          <View style={styles.developerInfo}>
            <Text style={styles.developerName}>Đặng Hồ Đức Huy</Text>
            <TouchableOpacity
              onPress={() => Linking.openURL('mailto:hoduckhuy@gmail.com')}
              activeOpacity={0.7}
            >
              <View style={styles.emailContainer}>
                <Ionicons name="mail-outline" size={16} color="#6366F1" />
                <Text style={styles.developerEmail}>hoduckhuy@gmail.com</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

