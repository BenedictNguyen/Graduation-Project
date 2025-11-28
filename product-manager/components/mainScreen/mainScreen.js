import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../utils/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import BottomTabBar from '../bottomTabBar';
import NotificationCenter from '../NotificationCenter';

// Components
import Header from './components/Header';
import StatsCards from './components/StatsCards';
import StatusCard from './components/StatusCard';
import ProductList from './components/ProductList';

// Hooks
import { useProductData } from './hooks/useProductData';
import { useUserInfo } from './hooks/useUserInfo';
import { useNotifications } from './hooks/useNotifications';

// Utils
import { getGreeting, formatDate, formatTime } from './utils/dateUtils';
import { calculateTotal, getProductCount, getProductIcon } from './utils/productUtils';

// Styles
import { baseStyles } from './styles';

export default function MainScreen({ navigation }) {
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [userId, setUserId] = useState(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Custom hooks
  const { latestData, loading, connectionStatus } = useProductData(navigation);
  const { userRole, userName, userAvatarId, checkUserInfo } = useUserInfo(userId);
  const { unreadNotificationCount } = useNotifications(userId);

  // Set userId on mount
  useEffect(() => {
    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          await checkUserInfo();
          setUserId(user.uid);
        } catch (error) {
          console.error('Error checking user info:', error);
        }
      }
    });

    return () => authUnsubscribe();
  }, [checkUserInfo]);

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

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  if (loading) {
    return (
      <View style={baseStyles.container}>
        <View style={baseStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={baseStyles.loadingText}>Đang tải dữ liệu...</Text>
        </View>
      </View>
    );
  }

  const totalProducts = calculateTotal(latestData?.products);
  const productTypes = getProductCount(latestData?.products);
  
  // Calculate percentage for progress indicators
  const maxProducts = Math.max(...(latestData?.products ? Object.values(latestData.products) : [1]), 1);

  return (
    <View style={baseStyles.container}>
      <ScrollView
        style={baseStyles.scrollView}
        contentContainerStyle={baseStyles.scrollContent}
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
        <Header
          greeting={greeting}
          userName={userName}
          userRole={userRole}
          userAvatarId={userAvatarId}
          currentTime={currentTime}
          unreadNotificationCount={unreadNotificationCount}
          onNotificationPress={() => setNotificationModalVisible(true)}
          fadeAnim={fadeAnim}
          slideAnim={slideAnim}
        />

        <Animated.View 
          style={[
            baseStyles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={baseStyles.statsContainer}>
            <StatsCards
              totalProducts={totalProducts}
              productTypes={productTypes}
              onProductTypesPress={() => navigation.navigate('ProductTypes')}
              scaleAnim={scaleAnim}
            />

            <StatusCard
              latestData={latestData}
              connectionStatus={connectionStatus}
              scaleAnim={scaleAnim}
              fadeAnim={fadeAnim}
              onRefresh={onRefresh}
            />
          </View>

          <View style={baseStyles.sectionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={baseStyles.sectionTitle}>Chi tiết sản phẩm</Text>
              <Text style={baseStyles.sectionSubtitle}>
                {latestData?.products ? Object.keys(latestData.products).length : 0} sản phẩm đang có trên kệ
              </Text>
            </View>
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Product')}
            >
              <View style={baseStyles.seeAllButton}>
                <Text style={baseStyles.seeAll}>Xem tất cả</Text>
                <Ionicons name="arrow-forward" size={16} color="#6366F1" />
              </View>
            </TouchableOpacity>
          </View>

          <ProductList
            products={latestData?.products}
            maxProducts={maxProducts}
            fadeAnim={fadeAnim}
            slideAnim={slideAnim}
          />
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

