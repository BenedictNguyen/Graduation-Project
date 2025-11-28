import React, { useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import BottomTabBar from '../bottomTabBar';

// Components
import LoadingScreen from './components/LoadingScreen';
import Header from './components/Header';
import HistoryCard from './components/HistoryCard';
import EmptyState from './components/EmptyState';
import LcdControlPanel from './components/LcdControlPanel';

// Hooks
import { useProductData } from './hooks/useProductData';
import { useUserRole } from './hooks/useUserRole';
import { useLcdControl } from './hooks/useLcdControl';

// Styles
import { styles } from './styles';

export default function ProductScreen({ navigation }) {
  const [refreshing, setRefreshing] = useState(false);

  const userRole = useUserRole();
  const { latestProduct, loading } = useProductData(navigation);
  const {
    controlState,
    loading: lcdLoading,
    updating: lcdUpdating,
    error: lcdError,
    sendCommand,
  } = useLcdControl();

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
          <LcdControlPanel
            controlState={controlState}
            loading={lcdLoading}
            updating={lcdUpdating}
            error={lcdError}
            onSubmit={sendCommand}
            userRole={userRole}
          />

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

