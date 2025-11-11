import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from '../styles';

export default function PeriodTabs({ period, onPeriodChange }) {
  return (
    <View style={styles.periodTabs}>
      <TouchableOpacity
        style={[styles.periodTab, period === 'day' && styles.periodTabActive]}
        onPress={() => onPeriodChange('day')}
      >
        <Text style={[styles.periodTabText, period === 'day' && styles.periodTabTextActive]}>
          Ngày
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.periodTab, period === 'week' && styles.periodTabActive]}
        onPress={() => onPeriodChange('week')}
      >
        <Text style={[styles.periodTabText, period === 'week' && styles.periodTabTextActive]}>
          Tuần
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.periodTab, period === 'month' && styles.periodTabActive]}
        onPress={() => onPeriodChange('month')}
      >
        <Text style={[styles.periodTabText, period === 'month' && styles.periodTabTextActive]}>
          Tháng
        </Text>
      </TouchableOpacity>
    </View>
  );
}

