import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { db, auth } from '../utils/firebaseConfig';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  updateDoc,
  doc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function NotificationCenter({ visible, onClose, userId }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const slideAnim = useState(new Animated.Value(SCREEN_HEIGHT))[0];

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  useEffect(() => {
    if (!userId || !visible) return;

    const notificationsRef = collection(db, 'notifications');
    // Query chỉ với userId để tránh cần composite index
    // Sắp xếp sẽ được thực hiện ở client-side
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notifs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        // Sắp xếp theo createdAt ở client-side
        notifs.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || a.createdAt || 0;
          const bTime = b.createdAt?.toMillis?.() || b.createdAt || 0;
          return bTime - aTime; // Descending order
        });
        setNotifications(notifs);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching notifications:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, visible]);

  const markAsRead = async (notificationId) => {
    try {
      const notifRef = doc(db, 'notifications', notificationId);
      await updateDoc(notifRef, { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const notifRef = doc(db, 'notifications', notificationId);
      await deleteDoc(notifRef);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifs = notifications.filter((n) => !n.read);
      const promises = unreadNotifs.map((n) => {
        const notifRef = doc(db, 'notifications', n.id);
        return updateDoc(notifRef, { read: true });
      });
      await Promise.all(promises);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    let date;
    if (timestamp instanceof Timestamp) {
      date = timestamp.toDate();
    } else if (timestamp.toDate) {
      date = timestamp.toDate();
    } else {
      date = new Date(timestamp);
    }

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getNotificationIcon = (type) => {
    const iconMap = {
      product_new: 'cube',
      product_out_of_stock: 'alert-circle',
      product_update: 'refresh',
      system: 'information-circle',
      milestone: 'trophy',
    };
    return iconMap[type] || 'notifications';
  };

  const getNotificationColor = (type) => {
    const colorMap = {
      product_new: ['#6366F1', '#8B5CF6'],
      product_out_of_stock: ['#EF4444', '#F87171'],
      product_update: ['#3B82F6', '#60A5FA'],
      system: ['#10B981', '#34D399'],
      milestone: ['#F59E0B', '#FBBF24'],
    };
    return colorMap[type] || ['#6366F1', '#8B5CF6'];
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={['#1E293B', '#0F172A']}
            style={styles.modalContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.headerTitle}>Thông báo</Text>
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount}</Text>
                  </View>
                )}
              </View>
              <View style={styles.headerRight}>
                {unreadCount > 0 && (
                  <TouchableOpacity
                    onPress={markAllAsRead}
                    style={styles.markAllButton}
                  >
                    <Text style={styles.markAllText}>Đánh dấu tất cả</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#CBD5E1" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Notifications List */}
            <ScrollView
              style={styles.notificationsList}
              showsVerticalScrollIndicator={false}
            >
              {loading ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>Đang tải...</Text>
                </View>
              ) : notifications.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="notifications-off-outline"
                    size={64}
                    color="#475569"
                  />
                  <Text style={styles.emptyText}>Chưa có thông báo</Text>
                  <Text style={styles.emptySubtext}>
                    Các thông báo mới sẽ xuất hiện ở đây
                  </Text>
                </View>
              ) : (
                notifications.map((notification) => {
                  const isUnread = !notification.read;
                  const colors = getNotificationColor(notification.type);
                  const icon = getNotificationIcon(notification.type);

                  return (
                    <TouchableOpacity
                      key={notification.id}
                      activeOpacity={0.7}
                      onPress={() => {
                        if (isUnread) {
                          markAsRead(notification.id);
                        }
                      }}
                    >
                      <LinearGradient
                        colors={
                          isUnread
                            ? ['rgba(99, 102, 241, 0.15)', 'rgba(139, 92, 246, 0.08)']
                            : ['rgba(30, 41, 59, 0.5)', 'rgba(15, 23, 42, 0.3)']
                        }
                        style={[
                          styles.notificationItem,
                          isUnread && styles.notificationItemUnread,
                        ]}
                      >
                        <View style={styles.notificationIconContainer}>
                          <LinearGradient colors={colors} style={styles.notificationIcon}>
                            <Ionicons name={icon} size={20} color="#FFFFFF" />
                          </LinearGradient>
                        </View>
                        <View style={styles.notificationContent}>
                          <View style={styles.notificationHeader}>
                            <Text
                              style={[
                                styles.notificationTitle,
                                isUnread && styles.notificationTitleUnread,
                              ]}
                            >
                              {notification.title}
                            </Text>
                            {isUnread && <View style={styles.unreadDot} />}
                          </View>
                          <Text style={styles.notificationBody}>
                            {notification.body}
                          </Text>
                          <Text style={styles.notificationTime}>
                            {formatTime(notification.createdAt)}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => deleteNotification(notification.id)}
                          style={styles.deleteButton}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color="#64748B"
                          />
                        </TouchableOpacity>
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    flex: 1,
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.85,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  modalContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 102, 241, 0.2)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  markAllText: {
    color: '#6366F1',
    fontSize: 13,
    fontWeight: '600',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationsList: {
    flex: 1,
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.1)',
  },
  notificationItemUnread: {
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  notificationIconContainer: {
    marginRight: 12,
  },
  notificationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
    gap: 4,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
    flex: 1,
  },
  notificationTitleUnread: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366F1',
  },
  notificationBody: {
    fontSize: 14,
    color: '#CBD5E1',
    lineHeight: 20,
    marginTop: 2,
  },
  notificationTime: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  deleteButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
});

