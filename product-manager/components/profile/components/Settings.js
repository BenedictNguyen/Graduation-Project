import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles';

export default function Settings({ onAboutPress }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Cài đặt</Text>
      
      <TouchableOpacity 
        style={styles.settingItem}
        onPress={onAboutPress}
      >
        <View style={styles.settingLeft}>
          <View style={styles.settingIcon}>
            <Ionicons name="information-circle-outline" size={20} color="#6366F1" />
          </View>
          <Text style={styles.settingText}>Về ứng dụng</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#64748B" />
      </TouchableOpacity>
    </View>
  );
}

