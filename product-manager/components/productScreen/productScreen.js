import React, { useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import BottomTabBar from '../bottomTabBar';

// Components
import LoadingScreen from './components/LoadingScreen';
import Header from './components/Header';
import ShowChartButton from './components/ShowChartButton';
import ChartCard from './components/ChartCard';
import HistoryCard from './components/HistoryCard';
import EmptyState from './components/EmptyState';

// Hooks
import { useProductData } from './hooks/useProductData';
import { useUserRole } from './hooks/useUserRole';

// Styles
import { styles } from './styles';

export default function ProductScreen({ navigation }) {
  const [refreshing, setRefreshing] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [period, setPeriod] = useState('day'); // 'day', 'week', 'month'

  const userRole = useUserRole();
  const { latestProduct, chartData, loading } = useProductData(navigation, showChart, period);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  if (loading) {
    return <LoadingScreen />;
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
        <Header />

        <View style={styles.content}>
          <ShowChartButton 
            showChart={showChart} 
            onToggle={() => setShowChart(!showChart)} 
          />

          {showChart && (
            <ChartCard 
              chartData={chartData} 
              period={period} 
              onPeriodChange={setPeriod} 
            />
          )}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Lịch sử cập nhật</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Mới nhất</Text>
            </View>
          </View>

          <View style={styles.historyList}>
            {latestProduct ? (
              <HistoryCard latestProduct={latestProduct} userRole={userRole} />
            ) : (
              <EmptyState type="history" />
            )}
          </View>
        </View>
      </ScrollView>
      <BottomTabBar navigation={navigation} currentRoute="Product" />
    </View>
  );
}

