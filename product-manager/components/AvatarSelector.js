import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../utils/firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { AVATARS } from '../utils/avatars';

export default function AvatarSelector({ visible, onClose, currentAvatarId, onAvatarSelected }) {
  const [selectedAvatarId, setSelectedAvatarId] = useState(currentAvatarId || null);
  const [saving, setSaving] = useState(false);

  // Cập nhật selectedAvatarId khi currentAvatarId thay đổi hoặc modal mở
  useEffect(() => {
    if (visible) {
      setSelectedAvatarId(currentAvatarId || null);
    }
  }, [visible, currentAvatarId]);

  const handleSelectAvatar = (avatarId) => {
    setSelectedAvatarId(avatarId);
  };

  const handleSave = async () => {
    if (!selectedAvatarId) {
      return;
    }

    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        return;
      }

      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        avatarId: selectedAvatarId,
      });

      if (onAvatarSelected) {
        onAvatarSelected(selectedAvatarId);
      }
      onClose();
    } catch (error) {
      console.error('Error saving avatar:', error);
    } finally {
      setSaving(false);
    }
  };

  const renderAvatar = (avatar) => {
    const isSelected = selectedAvatarId === avatar.id;
    
    return (
      <TouchableOpacity
        key={avatar.id}
        onPress={() => handleSelectAvatar(avatar.id)}
        activeOpacity={0.8}
        style={styles.avatarItem}
      >
        <View style={[styles.avatarWrapper, isSelected && styles.avatarWrapperSelected]}>
          <LinearGradient
            colors={avatar.colors}
            style={styles.avatarGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={avatar.icon} size={40} color="#FFFFFF" />
          </LinearGradient>
          {isSelected && (
            <View style={styles.selectedBadge}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            </View>
          )}
        </View>
        <Text style={styles.avatarName}>{avatar.name}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <LinearGradient
            colors={['#1E293B', '#0F172A']}
            style={styles.modalGradient}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Chọn Avatar</Text>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Nam */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Nam</Text>
                <View style={styles.avatarGrid}>
                  {AVATARS.filter(a => a.gender === 'male').map(renderAvatar)}
                </View>
              </View>

              {/* Nữ */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Nữ</Text>
                <View style={styles.avatarGrid}>
                  {AVATARS.filter(a => a.gender === 'female').map(renderAvatar)}
                </View>
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.saveButton, !selectedAvatarId && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={!selectedAvatarId || saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>Lưu</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '80%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  modalGradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(71, 85, 105, 0.3)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  avatarItem: {
    alignItems: 'center',
    width: '30%',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  avatarWrapperSelected: {
    transform: [{ scale: 1.1 }],
  },
  avatarGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  selectedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#0F172A',
    borderRadius: 12,
  },
  avatarName: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(71, 85, 105, 0.3)',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
  },
  saveButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#475569',
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

