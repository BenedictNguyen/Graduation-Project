import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  onSnapshot, 
  collection, 
  addDoc, 
  Timestamp,
  getDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db, auth } from '../utils/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import BottomTabBar from './bottomTabBar';
import NotificationCenter from './NotificationCenter';
import { getAvatarById, getDefaultAvatar } from '../utils/avatars';


const { width } = Dimensions.get('window');

export default function MainScreen({ navigation }) {
  const [latestData, setLatestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState('employee');
  const [userName, setUserName] = useState('');
  const [userAvatarId, setUserAvatarId] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('waiting'); // 'waiting' or 'connected'
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [userId, setUserId] = useState(null);
  const previousProductsRef = useRef(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    let firestoreUnsubscribe = null;

    // Đợi auth state sẵn sàng trước khi đọc dữ liệu
    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      // Cleanup previous firestore listener nếu có
      if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
        firestoreUnsubscribe = null;
      }

      if (!user) {
        // Chỉ redirect nếu không đang ở Login screen để tránh vòng lặp
        const currentRoute = navigation.getState()?.routes[navigation.getState()?.index]?.name;
        if (currentRoute !== 'Login') {
          console.log('User not authenticated, redirecting to login...');
          navigation.replace('Login');
        }
        setLoading(false);
        return;
      }

      // Đảm bảo user có document trong users collection
      try {
        await checkUserInfo();
        setUserId(user.uid);
      } catch (error) {
        console.error('Error checking user info:', error);
      }
      
      // Đọc từ document "latest" thay vì query collection (hiệu quả hơn)
      const docRef = doc(db, 'product_counts', 'latest');

      firestoreUnsubscribe = onSnapshot(docRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = {
            id: docSnapshot.id,
            ...docSnapshot.data(),
          };
          
          // Kiểm tra thay đổi và tạo thông báo
          if (previousProductsRef.current) {
            checkProductChanges(previousProductsRef.current, data.products, user.uid);
          }
          
          setLatestData(data);
          previousProductsRef.current = data.products;
          
          // Kiểm tra trạng thái kết nối dựa trên timestamp
          checkConnectionStatus(data.timestamp);
        } else {
          // Nếu document "latest" chưa tồn tại, set null
          setLatestData(null);
          setConnectionStatus('waiting');
        }
        setLoading(false);
      }, (error) => {
        console.error('Error listening to latest data:', error);
        setLoading(false);
        setConnectionStatus('waiting');
      });
    });

    return () => {
      authUnsubscribe();
      if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
      }
    };
  }, [navigation]);

  // Lắng nghe số lượng thông báo chưa đọc
  useEffect(() => {
    if (!userId) return;

    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadNotificationCount(snapshot.size);
    }, (error) => {
      console.error('Error listening to notifications:', error);
    });

    return () => unsubscribe();
  }, [userId]);

  // Lắng nghe thay đổi avatar của user
  useEffect(() => {
    if (!userId) return;

    const userDocRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setUserAvatarId(data.avatarId || null);
        // Cập nhật các thông tin khác nếu cần
        if (data.role) setUserRole(data.role);
        // Ưu tiên displayName, sau đó name, cuối cùng là email
        if (data.displayName || data.name || data.email) {
          const name = data.displayName || data.name || data.email?.split('@')[0] || 'User';
          const formattedName = name
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
          setUserName(formattedName);
        }
      }
    }, (error) => {
      console.error('Error listening to user info:', error);
    });

    return () => unsubscribe();
  }, [userId]);

  // Tạo thông báo khi có thay đổi sản phẩm
  const checkProductChanges = async (previousProducts, currentProducts, uid) => {
    if (!previousProducts || !currentProducts || !uid) return;

    try {
      const previousKeys = Object.keys(previousProducts);
      const currentKeys = Object.keys(currentProducts);

      // Kiểm tra sản phẩm mới
      const newProducts = currentKeys.filter(key => !previousKeys.includes(key));
      for (const productName of newProducts) {
        await createNotification({
          userId: uid,
          type: 'product_new',
          title: 'Sản phẩm mới được phát hiện',
          body: `Sản phẩm "${productName}" đã được thêm vào kệ với số lượng ${currentProducts[productName]}`,
        });
      }

      // Kiểm tra sản phẩm hết hàng
      for (const productName of previousKeys) {
        const previousQty = previousProducts[productName] || 0;
        const currentQty = currentProducts[productName] || 0;
        
        if (previousQty > 0 && currentQty === 0) {
          await createNotification({
            userId: uid,
            type: 'product_out_of_stock',
            title: 'Sản phẩm hết hàng',
            body: `Sản phẩm "${productName}" đã hết hàng trên kệ`,
          });
        }
      }

      // Kiểm tra cập nhật số lượng đáng kể
      for (const productName of currentKeys) {
        const previousQty = previousProducts[productName] || 0;
        const currentQty = currentProducts[productName] || 0;
        const change = Math.abs(currentQty - previousQty);
        
        if (change >= 5 && previousQty > 0 && currentQty > 0) {
          const direction = currentQty > previousQty ? 'tăng' : 'giảm';
          await createNotification({
            userId: uid,
            type: 'product_update',
            title: 'Cập nhật số lượng sản phẩm',
            body: `Sản phẩm "${productName}" ${direction} từ ${previousQty} lên ${currentQty} đơn vị`,
          });
        }
      }
    } catch (error) {
      console.error('Error checking product changes:', error);
    }
  };

  // Hàm tạo thông báo
  const createNotification = async ({ userId, type, title, body }) => {
    try {
      await addDoc(collection(db, 'notifications'), {
        userId,
        type,
        title,
        body,
        read: false,
        createdAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  // Kiểm tra trạng thái kết nối dựa trên timestamp
  const checkConnectionStatus = (timestamp) => {
    if (!timestamp) {
      setConnectionStatus('waiting');
      return;
    }

    try {
      // Parse timestamp (format: "YYYY-MM-DD HH:MM:SS")
      const timestampDate = new Date(timestamp.replace(/(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})/, '$1T$2'));
      const now = new Date();
      const diffSeconds = (now - timestampDate) / 1000;

      // Nếu dữ liệu cập nhật trong vòng 10 giây thì coi như đã kết nối
      // (chương trình Python gửi mỗi 5 giây)
      if (diffSeconds <= 10) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('waiting');
      }
    } catch (error) {
      console.error('Error parsing timestamp:', error);
      setConnectionStatus('waiting');
    }
  };

  // Kiểm tra lại trạng thái kết nối định kỳ
  useEffect(() => {
    if (latestData?.timestamp) {
      const interval = setInterval(() => {
        checkConnectionStatus(latestData.timestamp);
      }, 3000); // Kiểm tra mỗi 3 giây

      return () => clearInterval(interval);
    }
  }, [latestData?.timestamp]);

  const checkUserInfo = async () => {
    const user = auth.currentUser;
    if (user) {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserRole(data.role || 'employee');
        setUserAvatarId(data.avatarId || null);
        // Format tên: viết hoa chữ cái đầu của mỗi từ
        // Ưu tiên displayName, sau đó name, cuối cùng là email
        const name = data.displayName || data.name || data.email?.split('@')[0] || 'User';
        const formattedName = name
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        setUserName(formattedName);
      }
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const calculateTotal = (products) => {
    if (!products) return 0;
    return Object.values(products).reduce((sum, qty) => sum + qty, 0);
  };

  const getProductCount = (products) => {
    if (!products) return 0;
    return Object.keys(products).length;
  };

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  // Format date
  const formatDate = (date) => {
    const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
    const months = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 
                    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
  };

  // Format time
  const formatTime = (date) => {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  // Update time and greeting
  useEffect(() => {
    setGreeting(getGreeting());
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timeInterval);
  }, []);

  // Animate on mount
  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading]);


  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
        </View>
      </View>
    );
  }

  const totalProducts = calculateTotal(latestData?.products);
  const productTypes = getProductCount(latestData?.products);
  
  // Calculate percentage for progress indicators
  const maxProducts = Math.max(...(latestData?.products ? Object.values(latestData.products) : [1]), 1);

  return (
    <View style={styles.container}>
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          tintColor="#6366F1"
          colors={['#6366F1']}
        />
      }
    >
      <LinearGradient
        colors={['#1E293B', '#0F172A', '#0A0F1A']}
        style={styles.header}
      >
        <Animated.View 
          style={[
            styles.headerContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
            <View style={styles.headerTop}>
              <View style={styles.userInfoContainer}>
                {(() => {
                  const avatar = userAvatarId 
                    ? getAvatarById(userAvatarId) 
                    : getDefaultAvatar();
                  return (
                    <LinearGradient
                      colors={avatar.colors}
                      style={styles.avatarContainer}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons 
                        name={avatar.icon} 
                        size={28} 
                        color="#FFFFFF" 
                      />
                    </LinearGradient>
                  );
                })()}
              <View style={styles.userTextContainer}>
                <Text style={styles.greetingText}>{greeting} 👋</Text>
                <Text style={styles.userNameText}>{userName || 'User'}</Text>
                <Text style={styles.userRoleText}>
                  {userRole === 'admin' ? 'Quản trị viên' : 'Nhân viên'}
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.notificationButton}
              activeOpacity={0.7}
              onPress={() => setNotificationModalVisible(true)}
            >
              <LinearGradient
                colors={['rgba(99, 102, 241, 0.2)', 'rgba(139, 92, 246, 0.1)']}
                style={styles.notificationButtonGradient}
              >
                <Ionicons name="notifications-outline" size={22} color="#CBD5E1" />
                {unreadNotificationCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
          
          <View style={styles.dateTimeContainer}>
            <View style={styles.dateTimeRow}>
              <Ionicons name="calendar-outline" size={16} color="rgba(255, 255, 255, 0.6)" />
              <Text style={styles.dateText}>{formatDate(currentTime)}</Text>
            </View>
            <View style={styles.dateTimeRow}>
              <Ionicons name="time-outline" size={16} color="rgba(255, 255, 255, 0.6)" />
              <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
            </View>
          </View>
        </Animated.View>
      </LinearGradient>

      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.statsContainer}>
          <Animated.View 
            style={[
              styles.statsRow,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <TouchableOpacity 
              activeOpacity={0.9}
              style={styles.statCardTouchable}
            >
              <LinearGradient
                colors={['#6366F1', '#8B5CF6', '#A78BFA']}
                style={styles.statCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.statCardHeader}>
                  <View style={styles.statIconContainer}>
                    <Ionicons name="cube" size={26} color="#FFFFFF" />
                  </View>
                  <View style={styles.statTrendContainer}>
                    <Ionicons name="trending-up" size={16} color="rgba(255, 255, 255, 0.8)" />
                  </View>
                </View>
                <Text style={styles.statValue}>{totalProducts}</Text>
                <Text style={styles.statLabel}>Tổng sản phẩm</Text>
                <View style={styles.statCardFooter}>
                  <View style={styles.statProgressBar}>
                    <View style={[styles.statProgressFill, { width: '100%' }]} />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              activeOpacity={0.9}
              style={styles.statCardTouchable}
              onPress={() => navigation.navigate('ProductTypes')}
            >
              <LinearGradient
                colors={['#EC4899', '#F472B6', '#F9A8D4']}
                style={styles.statCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.statCardHeader}>
                  <View style={styles.statIconContainer}>
                    <Ionicons name="albums" size={26} color="#FFFFFF" />
                  </View>
                  <View style={styles.statTrendContainer}>
                    <Ionicons name="layers" size={16} color="rgba(255, 255, 255, 0.8)" />
                  </View>
                </View>
                <Text style={styles.statValue}>{productTypes}</Text>
                <Text style={styles.statLabel}>Loại sản phẩm</Text>
                <View style={styles.statCardFooter}>
                  <View style={styles.statProgressBar}>
                    <View style={[styles.statProgressFill, { width: '100%' }]} />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View
            style={[
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <TouchableOpacity 
              activeOpacity={0.9}
              style={styles.statCardWideTouchable}
            >
              <LinearGradient
                colors={['#10B981', '#34D399', '#6EE7B7']}
                style={styles.statCardWide}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.statCardWideContent}>
                  <View style={styles.statIconContainer}>
                    <Ionicons name="time" size={26} color="#FFFFFF" />
                  </View>
                  <View style={styles.statCardWideText}>
                    <Text style={styles.statLabel}>Cập nhật lần cuối</Text>
                    <Text style={styles.statValueSmall}>
                      {latestData?.timestamp || 'Không có dữ liệu'}
                    </Text>
                    <View style={styles.lastUpdateIndicator}>
                      <View style={[
                        styles.updateDot,
                        connectionStatus === 'connected' && styles.updateDotActive
                      ]} />
                      <Text style={styles.updateStatusText}>
                        {connectionStatus === 'connected' ? 'Đang hoạt động' : 'Đang chờ'}
                      </Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Trạng thái kệ */}
        <Animated.View 
          style={[
            styles.statusSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={connectionStatus === 'connected' 
              ? ['rgba(16, 185, 129, 0.2)', 'rgba(52, 211, 153, 0.15)', 'rgba(110, 231, 183, 0.1)']
              : ['rgba(245, 158, 11, 0.2)', 'rgba(251, 191, 36, 0.15)', 'rgba(253, 224, 71, 0.1)']
            }
            style={styles.statusCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statusContent}>
              <View style={[
                styles.statusIconContainer,
                connectionStatus === 'connected' && styles.statusIconContainerConnected
              ]}>
                <LinearGradient
                  colors={connectionStatus === 'connected'
                    ? ['#10B981', '#34D399']
                    : ['#F59E0B', '#FBBF24']
                  }
                  style={styles.statusIconGradient}
                >
                  <Ionicons 
                    name={connectionStatus === 'connected' ? 'wifi' : 'wifi-outline'} 
                    size={26} 
                    color="#FFFFFF" 
                  />
                </LinearGradient>
              </View>
              <View style={styles.statusTextContainer}>
                <Text style={styles.statusLabel}>Trạng thái kệ</Text>
                <Text style={[
                  styles.statusValue,
                  connectionStatus === 'connected' && styles.statusValueConnected
                ]}>
                  {connectionStatus === 'connected' ? 'Đã kết nối' : 'Chờ kết nối'}
                </Text>
                <Text style={styles.statusSubtext}>
                  {connectionStatus === 'connected' 
                    ? 'Hệ thống đang hoạt động bình thường' 
                    : 'Đang chờ kết nối từ thiết bị'}
                </Text>
              </View>
              <View style={[
                styles.statusIndicator,
                connectionStatus === 'connected' && styles.statusIndicatorConnected
              ]}>
                {connectionStatus === 'connected' && (
                  <View style={styles.statusIndicatorPulse} />
                )}
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Chi tiết sản phẩm</Text>
            <Text style={styles.sectionSubtitle}>
              {latestData?.products ? Object.keys(latestData.products).length : 0} sản phẩm đang có
            </Text>
          </View>
          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Product')}
          >
            <View style={styles.seeAllButton}>
              <Text style={styles.seeAll}>Xem tất cả</Text>
              <Ionicons name="arrow-forward" size={16} color="#6366F1" />
            </View>
          </TouchableOpacity>
        </View>

        {latestData?.products && Object.keys(latestData.products).length > 0 ? (
          <Animated.View 
            style={[
              styles.productList,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            {Object.entries(latestData.products)
              .sort((a, b) => {
                const [, qtyA] = a;
                const [, qtyB] = b;
                const isInStockA = qtyA > 0;
                const isInStockB = qtyB > 0;
                
                // Sản phẩm còn hàng lên đầu
                if (isInStockA && !isInStockB) return -1;
                if (!isInStockA && isInStockB) return 1;
                
                // Nếu cả hai đều còn hàng hoặc cả hai đều hết hàng, sắp xếp theo số lượng giảm dần
                return qtyB - qtyA;
              })
              .map(([name, qty], index) => {
              const isOutOfStock = qty === 0;
              const progressPercentage = (qty / maxProducts) * 100;
              return (
                <Animated.View 
                  key={name} 
                  style={[
                    styles.productCard,
                    isOutOfStock && styles.productCardOutOfStock,
                    {
                      transform: [{ 
                        translateX: slideAnim.interpolate({
                          inputRange: [0, 50],
                          outputRange: [0, 50],
                        })
                      }],
                    },
                  ]}
                >
                  <TouchableOpacity activeOpacity={0.8}>
                    <LinearGradient
                      colors={isOutOfStock 
                        ? ['rgba(100, 116, 139, 0.08)', 'rgba(71, 85, 105, 0.04)']
                        : ['rgba(99, 102, 241, 0.12)', 'rgba(139, 92, 246, 0.08)', 'rgba(167, 139, 250, 0.04)']
                      }
                      style={styles.productCardGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={[styles.productIconContainer, isOutOfStock && styles.productIconContainerOutOfStock]}>
                        <LinearGradient
                          colors={isOutOfStock
                            ? ['rgba(100, 116, 139, 0.2)', 'rgba(71, 85, 105, 0.1)']
                            : ['rgba(99, 102, 241, 0.3)', 'rgba(139, 92, 246, 0.2)']
                          }
                          style={styles.productIconGradient}
                        >
                          <MaterialCommunityIcons 
                            name={getProductIcon(name)} 
                            size={30} 
                            color={isOutOfStock ? "#64748B" : "#6366F1"} 
                          />
                        </LinearGradient>
                      </View>
                      <View style={styles.productInfo}>
                        <View style={styles.productNameRow}>
                          <Text 
                            style={[styles.productName, isOutOfStock && styles.productNameOutOfStock]}
                            numberOfLines={1}
                          >
                            {name}
                          </Text>
                          {isOutOfStock && (
                            <View style={styles.outOfStockBadge}>
                              <Text style={styles.outOfStockText}>Hết hàng</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.productQtyRow}>
                          <Text style={[styles.productQtyInline, isOutOfStock && styles.productQtyInlineOutOfStock]}>
                            {qty}
                          </Text>
                          <Text style={[styles.productSubtext, isOutOfStock && styles.productSubtextOutOfStock]}>
                            {' '}đơn vị
                          </Text>
                        </View>
                        {!isOutOfStock && (
                          <View style={styles.productProgressContainer}>
                            <View style={styles.productProgressBar}>
                              <Animated.View 
                                style={[
                                  styles.productProgressFill,
                                  { 
                                    width: `${Math.min(progressPercentage, 100)}%`,
                                  }
                                ]} 
                              />
                            </View>
                          </View>
                        )}
                      </View>
                      <View style={styles.productArrow}>
                        <Ionicons 
                          name="chevron-forward" 
                          size={20} 
                          color={isOutOfStock ? "#64748B" : "#6366F1"} 
                        />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </Animated.View>
        ) : (
          <Animated.View 
            style={[
              styles.emptyState,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <LinearGradient
              colors={['rgba(99, 102, 241, 0.1)', 'rgba(139, 92, 246, 0.05)']}
              style={styles.emptyStateGradient}
            >
              <View style={styles.emptyIconContainer}>
                <Ionicons name="cube-outline" size={72} color="#6366F1" />
              </View>
              <Text style={styles.emptyText}>Chưa có dữ liệu sản phẩm</Text>
              <Text style={styles.emptySubtext}>
                Dữ liệu sẽ hiển thị khi AI phát hiện sản phẩm trên kệ
              </Text>
            </LinearGradient>
          </Animated.View>
        )}
      </Animated.View>
    </ScrollView>
    <BottomTabBar navigation={navigation} currentRoute="Main" />
    <NotificationCenter
      visible={notificationModalVisible}
      onClose={() => setNotificationModalVisible(false)}
      userId={userId}
    />
    </View>
  );
}

// Hàm mapping tên sản phẩm sang icon tượng trưng
const getProductIcon = (productName) => {
  const iconMap = {
    'erasable pen': 'pencil-remove', // Bút xóa được
    'ballpoint pen': 'pen', // Bút bi
    'glue': 'bottle-tonic', // Keo dán
    'black tea': 'cup', // Trà đen
    'noni tea': 'cup-outline', // Trà noni
  };
  
  // Trả về icon tương ứng hoặc icon mặc định
  return iconMap[productName.toLowerCase()] || 'cube-outline';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 36,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  headerContent: {
    gap: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  userTextContainer: {
    gap: 2,
    flex: 1,
  },
  greetingText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 2,
  },
  userNameText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  userRoleText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 4,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  timeText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  notificationButton: {
    width: 56,
    height: 56,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  notificationButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  content: {
    padding: 20,
  },
  statsContainer: {
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCardTouchable: {
    flex: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  statCard: {
    flex: 1,
    padding: 22,
    borderRadius: 26,
    minHeight: 170,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  statCardFooter: {
    marginTop: 8,
  },
  statTrendContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statProgressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  statProgressFill: {
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 2,
  },
  statCardWideTouchable: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  statCardWide: {
    padding: 22,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  statCardWideContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statCardWideText: {
    flex: 1,
    gap: 4,
  },
  lastUpdateIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  updateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  updateDotActive: {
    backgroundColor: '#FFFFFF',
  },
  updateStatusText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  statValue: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -1.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  statValueSmall: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
  },
  statusSection: {
    marginBottom: 24,
  },
  statusCard: {
    borderRadius: 22,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  statusIconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  statusIconContainerConnected: {
    // Gradient handled by statusIconGradient
  },
  statusTextContainer: {
    flex: 1,
    gap: 2,
  },
  statusLabel: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 2,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F59E0B',
    marginBottom: 2,
  },
  statusValueConnected: {
    color: '#10B981',
  },
  statusSubtext: {
    fontSize: 11,
    color: 'rgba(148, 163, 184, 0.7)',
    fontWeight: '400',
  },
  statusIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F59E0B',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 8,
      },
    }),
  },
  statusIndicatorConnected: {
    backgroundColor: '#10B981',
    ...Platform.select({
      ios: {
        shadowColor: '#10B981',
        shadowOpacity: 0.6,
      },
    }),
  },
  statusIndicatorPulse: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    opacity: 0.6,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  seeAll: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
  productList: {
    gap: 12,
  },
  productCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  productCardOutOfStock: {
    opacity: 0.6,
  },
  productCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    borderRadius: 22,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  productIconContainer: {
    width: 68,
    height: 68,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  productIconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  productIconContainerOutOfStock: {
    // Handled by gradient
  },
  productInfo: {
    flex: 1,
    gap: 6,
  },
  productArrow: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 8,
  },
  productProgressContainer: {
    marginTop: 4,
  },
  productProgressBar: {
    height: 3,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  productProgressFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 2,
  },
  productNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  productName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  productNameOutOfStock: {
    color: '#94A3B8',
  },
  outOfStockBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  outOfStockText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EF4444',
  },
  productQtyRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  productQtyInline: {
    fontSize: 20,
    fontWeight: '900',
    color: '#6366F1',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(99, 102, 241, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  productQtyInlineOutOfStock: {
    color: '#64748B',
  },
  productSubtext: {
    fontSize: 13,
    color: '#94A3B8',
  },
  productSubtextOutOfStock: {
    color: '#64748B',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    marginTop: 20,
  },
  emptyStateGradient: {
    width: '100%',
    padding: 44,
    borderRadius: 28,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  emptyIconContainer: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  emptyText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 10,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#94A3B8',
  },
});