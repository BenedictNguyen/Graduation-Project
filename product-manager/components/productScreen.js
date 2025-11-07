import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BarChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../utils/firebaseConfig';
import { getDoc, doc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import BottomTabBar from './bottomTabBar';

const screenWidth = Dimensions.get('window').width;

export default function ProductScreen({ navigation }) {
  const [latestProduct, setLatestProduct] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('employee');
  const [showChart, setShowChart] = useState(false);
  const [period, setPeriod] = useState('day'); // 'day', 'week', 'month'

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

      try {
        await checkUserRole();
      } catch (error) {
        console.error('Error checking user role:', error);
      }

      // Query cho bản ghi mới nhất (lịch sử cập nhật)
      const latestQuery = query(
        collection(db, 'product_counts'),
        orderBy('timestamp', 'desc'),
        limit(1)
      );

      // Query cho biểu đồ (lấy nhiều bản ghi để xử lý theo period)
      const chartQuery = query(
        collection(db, 'product_counts'),
        orderBy('timestamp', 'desc'),
        limit(500) // Lấy nhiều bản ghi để đảm bảo có đủ dữ liệu cho tháng
      );

      // Lắng nghe bản ghi mới nhất
      const latestUnsubscribe = onSnapshot(latestQuery, (snapshot) => {
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          setLatestProduct({
            id: doc.id,
            ...doc.data(),
          });
        } else {
          setLatestProduct(null);
        }
      }, (error) => {
        console.error('Error listening to latest product:', error);
        setLatestProduct(null);
      });

      // Lắng nghe dữ liệu cho biểu đồ (chỉ lưu listener, không xử lý ngay)
      const chartUnsubscribe = onSnapshot(chartQuery, (snapshot) => {
        // Chỉ xử lý dữ liệu khi showChart = true
        // Dữ liệu sẽ được xử lý trong useEffect riêng khi showChart thay đổi
        setLoading(false);
      }, (error) => {
        console.error('Error listening to chart product data:', error);
        setLoading(false);
        setChartData(null);
      });

      firestoreUnsubscribe = () => {
        latestUnsubscribe();
        chartUnsubscribe();
      };
    });

    return () => {
      authUnsubscribe();
      if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
      }
    };
  }, [navigation]);

  const checkUserRole = async () => {
    const user = auth.currentUser;
    if (user) {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setUserRole(userDoc.data().role || 'employee');
      }
    }
  };

  // Hàm xử lý dữ liệu biểu đồ theo period
  const processChartData = (allData, currentPeriod = period) => {
    if (!allData || allData.length === 0) {
      setChartData(null);
      return;
    }

    // Lọc dữ liệu theo period
    let startDate;
    const now = new Date();
    
    if (currentPeriod === 'day') {
      // Hôm nay
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (currentPeriod === 'week') {
      // 7 ngày gần nhất
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (currentPeriod === 'month') {
      // 30 ngày gần nhất
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const filteredData = allData.filter((record) => {
      let recordDate;
      if (record.timestamp) {
        if (record.timestamp.toDate) {
          recordDate = record.timestamp.toDate();
        } else if (typeof record.timestamp === 'string') {
          recordDate = new Date(record.timestamp);
        } else {
          return false;
        }
      } else {
        return false;
      }
      return recordDate >= startDate;
    });

    if (filteredData.length === 0) {
      setChartData(null);
      return;
    }

    // Tính tổng số lượng cho từng sản phẩm
    const productTotals = {};
    
    filteredData.forEach((record) => {
      const products = record.products || {};
      Object.entries(products).forEach(([productName, qty]) => {
        const quantity = Number(qty) || 0;
        if (productTotals[productName]) {
          productTotals[productName] += quantity;
        } else {
          productTotals[productName] = quantity;
        }
      });
    });

    // Sắp xếp theo số lượng giảm dần và lấy top 10
    const sortedProducts = Object.entries(productTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    if (sortedProducts.length === 0) {
      setChartData(null);
      return;
    }

    // Tạo labels và values cho biểu đồ
    const labels = sortedProducts.map(([name]) => {
      // Rút ngắn tên sản phẩm nếu quá dài
      return name.length > 8 ? name.substring(0, 8) + '...' : name;
    });
    const values = sortedProducts.map(([, qty]) => qty);

    setChartData({
      labels,
      datasets: [{ data: values }],
      fullLabels: sortedProducts.map(([name]) => name), // Lưu tên đầy đủ để hiển thị
    });
  };

  // useEffect để xử lý lại dữ liệu khi period thay đổi
  useEffect(() => {
    if (showChart) {
      // Lấy lại dữ liệu từ Firestore để xử lý
      const chartQuery = query(
        collection(db, 'product_counts'),
        orderBy('timestamp', 'desc'),
        limit(500)
      );
      
      const unsubscribe = onSnapshot(chartQuery, (snapshot) => {
        const allData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        processChartData(allData, period);
      }, (error) => {
        console.error('Error listening to chart data:', error);
      });

      return () => unsubscribe();
    }
  }, [period, showChart]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const hasValidChartData = () => {
    return chartData && 
           chartData.datasets && 
           chartData.datasets[0] && 
           chartData.datasets[0].data && 
           chartData.datasets[0].data.length > 0 && 
           chartData.datasets[0].data.some(val => val > 0);
  };

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

  return (
    <View style={styles.container}>
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          tintColor="#6366F1"
        />
      }
    >
      <LinearGradient
        colors={['#1E293B', '#0F172A']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Thống kê sản phẩm</Text>
        <Text style={styles.headerSubtitle}>Phân tích chi tiết từ AI</Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Nút hiển thị biểu đồ */}
        <TouchableOpacity 
          style={styles.showChartButton}
          onPress={() => setShowChart(!showChart)}
        >
          <LinearGradient
            colors={showChart ? ['#6366F1', '#8B5CF6'] : ['rgba(99, 102, 241, 0.1)', 'rgba(139, 92, 246, 0.1)']}
            style={styles.showChartButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons 
              name={showChart ? "stats-chart" : "analytics-outline"} 
              size={24} 
              color={showChart ? "#FFFFFF" : "#6366F1"} 
            />
            <Text style={[styles.showChartButtonText, showChart && styles.showChartButtonTextActive]}>
              {showChart ? "Ẩn thống kê" : "Xem thống kê"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Biểu đồ */}
        {showChart && (
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View style={styles.chartTitleContainer}>
                <Ionicons name="bar-chart" size={24} color="#6366F1" />
                <Text style={styles.chartTitle}>Thống kê sản phẩm</Text>
              </View>
            </View>

            {/* Tabs chuyển đổi period */}
            <View style={styles.periodTabs}>
              <TouchableOpacity
                style={[styles.periodTab, period === 'day' && styles.periodTabActive]}
                onPress={() => setPeriod('day')}
              >
                <Text style={[styles.periodTabText, period === 'day' && styles.periodTabTextActive]}>
                  Ngày
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.periodTab, period === 'week' && styles.periodTabActive]}
                onPress={() => setPeriod('week')}
              >
                <Text style={[styles.periodTabText, period === 'week' && styles.periodTabTextActive]}>
                  Tuần
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.periodTab, period === 'month' && styles.periodTabActive]}
                onPress={() => setPeriod('month')}
              >
                <Text style={[styles.periodTabText, period === 'month' && styles.periodTabTextActive]}>
                  Tháng
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.chartInfo}>
              <Text style={styles.chartInfoText}>
                {period === 'day' && 'Số lượng sản phẩm hôm nay'}
                {period === 'week' && 'Tổng số lượng sản phẩm trong 7 ngày gần nhất'}
                {period === 'month' && 'Tổng số lượng sản phẩm trong 30 ngày gần nhất'}
              </Text>
            </View>

            {hasValidChartData() ? (
              <BarChart
                data={chartData}
                width={screenWidth - 60}
                height={320}
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={{
                  backgroundColor: 'transparent',
                  backgroundGradientFrom: '#1E293B',
                  backgroundGradientTo: '#1E293B',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(203, 213, 225, ${opacity})`,
                  style: {
                    borderRadius: 16,
                  },
                  propsForBackgroundLines: {
                    strokeWidth: 1,
                    stroke: 'rgba(71, 85, 105, 0.3)',
                    strokeDasharray: '0',
                  },
                  propsForLabels: {
                    fontSize: 9,
                  },
                  barPercentage: 0.6,
                  fillShadowGradient: '#6366F1',
                  fillShadowGradientOpacity: 0.8,
                }}
                style={{
                  marginVertical: 8,
                  borderRadius: 16,
                }}
                showValuesOnTopOfBars={true}
                fromZero={true}
                withInnerLines={true}
                withOuterLines={true}
                withVerticalLabels={true}
                withHorizontalLabels={true}
              />
            ) : (
              <View style={styles.emptyChart}>
                <Ionicons name="analytics-outline" size={64} color="#475569" />
                <Text style={styles.emptyText}>Chưa có dữ liệu</Text>
                <Text style={styles.emptySubtext}>
                  Dữ liệu sẽ được hiển thị khi có sản phẩm được phát hiện
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Lịch sử cập nhật</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Mới nhất</Text>
          </View>
        </View>

        <View style={styles.historyList}>
          {latestProduct ? (
            <View style={styles.historyCard}>
              <LinearGradient
                colors={['rgba(99, 102, 241, 0.15)', 'rgba(139, 92, 246, 0.05)']}
                style={styles.historyCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.latestBadge}>
                  <Ionicons name="flash" size={12} color="#FCD34D" />
                  <Text style={styles.latestText}>Mới nhất</Text>
                </View>
                
                <View style={styles.historyHeader}>
                  <View style={styles.timeContainer}>
                    <Ionicons name="time-outline" size={18} color="#6366F1" />
                    <Text style={styles.timeText}>
                      {latestProduct.timestamp ? (
                        latestProduct.timestamp.toDate ? 
                          latestProduct.timestamp.toDate().toLocaleString('vi-VN') :
                          latestProduct.timestamp
                      ) : 'Không có thời gian'}
                    </Text>
                  </View>
                  {userRole === 'admin' && (
                    <TouchableOpacity style={styles.moreButton}>
                      <Ionicons name="ellipsis-horizontal" size={20} color="#64748B" />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.productsGrid}>
                  {latestProduct.products && Object.entries(latestProduct.products)
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
                    .map(([name, qty]) => (
                    <View key={name} style={styles.productItem}>
                      <View style={styles.productItemLeft}>
                        <View style={styles.productDot} />
                        <Text style={styles.productItemName}>{name}</Text>
                      </View>
                      <View style={styles.productQtyBadge}>
                        <Text style={styles.productItemQty}>{qty}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {userRole === 'admin' && (
                  <View style={styles.adminInfo}>
                    <Ionicons name="key-outline" size={12} color="#64748B" />
                    <Text style={styles.adminInfoText}>
                      ID: {latestProduct.id.substring(0, 12)}...
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={64} color="#475569" />
              <Text style={styles.emptyText}>Chưa có lịch sử</Text>
              <Text style={styles.emptySubtext}>
                Dữ liệu sẽ được cập nhật khi AI phát hiện sản phẩm
              </Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
    <BottomTabBar navigation={navigation} currentRoute="Product" />
    </View>
  );
}

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
  headerTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -1,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '500',
  },
  content: {
    padding: 20,
  },
  showChartButton: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
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
  showChartButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 28,
    gap: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  showChartButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6366F1',
  },
  showChartButtonTextActive: {
    color: '#FFFFFF',
  },
  chartCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.3)',
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
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 14,
    padding: 5,
    marginBottom: 16,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
  },
  periodTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodTabActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  periodTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  periodTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  chartInfo: {
    marginBottom: 12,
  },
  chartInfoText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  chartButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChart: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 20,
    padding: 60,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.3)',
  },
  emptyText: {
    fontSize: 16,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  badge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6366F1',
  },
  historyList: {
    gap: 12,
  },
  historyCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  historyCardGradient: {
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    borderRadius: 20,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  latestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(252, 211, 77, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginBottom: 12,
  },
  latestText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FCD34D',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  moreButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(71, 85, 105, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productsGrid: {
    gap: 10,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  productItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  productDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366F1',
  },
  productItemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#E2E8F0',
    flex: 1,
  },
  productQtyBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 50,
    alignItems: 'center',
  },
  productItemQty: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6366F1',
  },
  adminInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(71, 85, 105, 0.3)',
  },
  adminInfoText: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: 'monospace',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
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