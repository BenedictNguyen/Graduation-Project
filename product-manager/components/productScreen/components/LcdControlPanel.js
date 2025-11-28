import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles';

const MODE_OPTIONS = [
  {
    key: 'auto',
    title: 'Tự động',
    description: 'Luân phiên toàn bộ thông tin hệ thống',
  },
  {
    key: 'summary',
    title: 'Tổng quan',
    description: 'LCD1: Tổng sản phẩm • LCD2: Trạng thái',
  },
  {
    key: 'top_products',
    title: 'Top sản phẩm',
    description: 'Ưu tiên 2 sản phẩm có số lượng cao nhất',
  },
  {
    key: 'custom_message',
    title: 'Tùy chỉnh',
    description: 'Nhập nội dung riêng hiển thị trên cả 2 LCD',
  },
];

const formatTimestamp = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('vi-VN', {
    hour12: false,
  });
};

export default function LcdControlPanel({
  controlState,
  loading,
  updating,
  error,
  onSubmit,
  userRole,
}) {
  const [selectedMode, setSelectedMode] = useState('auto');
  const [customLine1, setCustomLine1] = useState('');
  const [customLine2, setCustomLine2] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [localError, setLocalError] = useState(null);

  useEffect(() => {
    if (loading) {
      return;
    }

    setSelectedMode(controlState?.mode || 'auto');
    setCustomLine1(controlState?.customLine1 || '');
    setCustomLine2(controlState?.customLine2 || '');
  }, [loading, controlState]);

  const appliedModeLabel = useMemo(() => {
    const active = MODE_OPTIONS.find((option) => option.key === controlState?.mode);
    return active?.title || 'Chưa rõ';
  }, [controlState]);

  const handleApply = async () => {
    try {
      setLocalError(null);
      setStatusMessage('');

      const payload = { mode: selectedMode };
      if (selectedMode === 'custom_message') {
        // Luôn gửi chuỗi rỗng nếu để trống, không gửi undefined
        payload.customLine1 = customLine1.trim() || '';
        payload.customLine2 = customLine2.trim() || '';
      }

      await onSubmit(payload);

      setStatusMessage('Đã gửi yêu cầu cập nhật LCD');
      setTimeout(() => setStatusMessage(''), 4000);
    } catch (err) {
      setLocalError(err?.message || 'Không thể cập nhật LCD');
    }
  };

  const isApplyDisabled =
    updating ||
    loading ||
    (selectedMode === 'custom_message' &&
      !customLine1.trim() &&
      !customLine2.trim());

  // Chỉ hiển thị panel cho admin
  if (userRole !== 'admin') {
    return (
      <View style={styles.lcdCard}>
        <View style={styles.lcdHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.lcdTitle}>Điều khiển LCD</Text>
            <Text style={styles.lcdSubtitle}>
              Chức năng chỉ dành cho Quản trị viên
            </Text>
          </View>
          <View style={styles.lcdStatusBadge}>
            <Ionicons name="lock-closed" size={14} color="#EF4444" />
            <Text style={styles.lcdStatusBadgeText}>Khóa</Text>
          </View>
        </View>
        <View style={styles.lcdLoadingState}>
          <Ionicons name="shield-outline" size={32} color="#94A3B8" />
          <Text style={[styles.lcdLoadingText, { marginTop: 12, textAlign: 'center' }]}>
            Bạn cần quyền Quản trị viên để sử dụng chức năng này
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.lcdCard}>
      <View style={styles.lcdHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.lcdTitle}>Điều khiển LCD</Text>
          <Text style={styles.lcdSubtitle}>
            Tuỳ chỉnh nội dung cho 2 màn hình 16x2
          </Text>
        </View>
        <View style={styles.lcdStatusBadge}>
          <Ionicons name="hardware-chip" size={14} color="#22D3EE" />
          <Text style={styles.lcdStatusBadgeText}>{appliedModeLabel}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.lcdLoadingState}>
          <ActivityIndicator color="#6366F1" />
          <Text style={styles.lcdLoadingText}>Đang đồng bộ trạng thái LCD...</Text>
        </View>
      ) : (
        <>
          <View style={styles.lcdModeTabs}>
            {MODE_OPTIONS.map((option) => {
              const isActive = selectedMode === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.lcdModeTab,
                    isActive && styles.lcdModeTabActive,
                  ]}
                  onPress={() => setSelectedMode(option.key)}
                  activeOpacity={0.85}
                  disabled={updating}
                >
                  <Text
                    style={[
                      styles.lcdModeTabText,
                      isActive && styles.lcdModeTabTextActive,
                    ]}
                  >
                    {option.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          
          {selectedMode && (
            <Text style={styles.lcdModeDescription}>
              {MODE_OPTIONS.find(opt => opt.key === selectedMode)?.description}
            </Text>
          )}

          {selectedMode === 'custom_message' && (
            <View style={styles.lcdCustomArea}>
              <Text style={styles.lcdInputLabel}>
                Nội dung tùy chỉnh (tối đa 16 ký tự mỗi dòng)
              </Text>
              <TextInput
                style={styles.lcdInput}
                placeholder="Dòng 1"
                placeholderTextColor="#475569"
                value={customLine1}
                onChangeText={setCustomLine1}
                maxLength={16}
              />
              <TextInput
                style={styles.lcdInput}
                placeholder="Dòng 2"
                placeholderTextColor="#475569"
                value={customLine2}
                onChangeText={setCustomLine2}
                maxLength={16}
              />
            </View>
          )}

          {(localError || error) && (
            <Text style={styles.lcdErrorText}>{localError || error}</Text>
          )}

          {statusMessage ? (
            <Text style={styles.lcdSuccessText}>{statusMessage}</Text>
          ) : null}

          <TouchableOpacity
            style={[
              styles.lcdActionButton,
              isApplyDisabled && styles.lcdActionButtonDisabled,
            ]}
            onPress={handleApply}
            disabled={isApplyDisabled}
            activeOpacity={0.85}
          >
            {updating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.lcdActionButtonText}>Áp dụng cho LCD</Text>
            )}
          </TouchableOpacity>

          <View style={styles.lcdMetaRow}>
            <Ionicons name="time-outline" size={16} color="#94A3B8" />
            <Text style={styles.lcdMetaText}>
              {controlState?.updatedAt
                ? `Cập nhật cuối: ${formatTimestamp(controlState.updatedAt)}`
                : 'Chưa có lịch sử điều khiển'}
            </Text>
          </View>
          {controlState?.updatedByName ? (
            <Text style={styles.lcdMetaText}>
              Bởi: {controlState.updatedByName}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}


