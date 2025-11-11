import React from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../../../utils/firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { styles } from '../styles';

export default function EditNameModal({
  visible,
  onClose,
  displayName,
  setDisplayName,
  savingName,
  setSavingName,
  onSaveSuccess,
}) {
  const handleSave = async () => {
    if (savingName) return;
    if (!displayName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên hiển thị');
      return;
    }
    
    setSavingName(true);
    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
          displayName: displayName.trim(),
        });
        onSaveSuccess(displayName.trim());
        onClose();
        Alert.alert('Thành công', 'Đã cập nhật tên hiển thị');
      }
    } catch (error) {
      console.error('Error updating display name:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật tên hiển thị: ' + error.message);
    } finally {
      setSavingName(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.editNameModalOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.editNameModalContainer}
        >
          <View style={styles.editNameModalContent}>
            <LinearGradient
              colors={['#1E293B', '#0F172A']}
              style={styles.editNameModalGradient}
            >
              <View style={styles.editNameModalHeader}>
                <Text style={styles.editNameModalTitle}>Chỉnh sửa tên hiển thị</Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <View style={styles.editNameModalBody}>
                <Text style={styles.editNameLabel}>Tên hiển thị</Text>
                <TextInput
                  style={styles.editNameInput}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Nhập tên hiển thị"
                  placeholderTextColor="#64748B"
                  maxLength={50}
                  autoFocus={true}
                />
                <Text style={styles.editNameHint}>
                  Tên này sẽ hiển thị trong ứng dụng
                </Text>
              </View>

              <View style={styles.editNameModalFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, savingName && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  activeOpacity={0.7}
                  disabled={savingName}
                >
                  {savingName ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Lưu</Text>
                  )}
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

