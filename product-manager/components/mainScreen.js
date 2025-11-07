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
import { onSnapshot } from 'firebase/firestore';
import { db, auth } from '../utils/firebaseConfig';
import { getDoc, doc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import BottomTabBar from './bottomTabBar';


const { width } = Dimensions.get('window');

export default function MainScreen({ navigation }) {
  const [latestData, setLatestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState('employee');
  const [userName, setUserName] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('waiting'); // 'waiting' or 'connected'
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');
  
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
        console.log('User not authenticated, redirecting to login...');
        navigation.replace('Login');
        setLoading(false);
        return;
      }

      // Đảm bảo user có document trong users collection
      try {
        await checkUserInfo();
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
          setLatestData(data);
          
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
        // Format tên: viết hoa chữ cái đầu của mỗi từ
        const name = data.name || data.email?.split('@')[0] || 'User';
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
              <LinearGradient
                colors={['#6366F1', '#8B5CF6']}
                style={styles.avatarContainer}
              >
                <Ionicons 
                  name="person" 
                  size={28} 
                  color="#FFFFFF" 
                />
              </LinearGradient>
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
            >
              <LinearGradient
                colors={['rgba(99, 102, 241, 0.2)', 'rgba(139, 92, 246, 0.1)']}
                style={styles.notificationButtonGradient}
              >
                <Ionicons name="notifications-outline" size={22} color="#CBD5E1" />
                <View style={styles.notificationDot} />
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
            {Object.entries(latestData.products).map(([name, qty], index) => {
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
                            name={getProductIcon(index)} 
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
    </View>
  );
}

const getProductIcon = (index) => {
  const icons = [
    'coffee', 'tea', 'bottle-soda', 'food-apple', 
    'food', 'glass-cocktail', 'fruit-cherries', 'cupcake'
  ];
  return icons[index % icons.length];
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
    paddingBottom: 32,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
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
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
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
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
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
    width: 52,
    height: 52,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  notificationButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#1E293B',
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
    padding: 20,
    borderRadius: 24,
    minHeight: 160,
    justifyContent: 'space-between',
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
    padding: 20,
    borderRadius: 24,
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
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -1,
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
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
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
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
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
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  productIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
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
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
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
    fontSize: 18,
    fontWeight: '800',
    color: '#6366F1',
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
    padding: 40,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 8,
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