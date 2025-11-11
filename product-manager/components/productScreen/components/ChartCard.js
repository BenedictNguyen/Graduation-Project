import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import PeriodTabs from './PeriodTabs';
import { hasValidChartData } from '../utils/productUtils';
import { styles } from '../styles';

const screenWidth = Dimensions.get('window').width;

export default function ChartCard({ chartData, period, onPeriodChange }) {
  const getPeriodText = () => {
    if (period === 'day') return 'Số lượng sản phẩm hôm nay';
    if (period === 'week') return 'Tổng số lượng sản phẩm trong 7 ngày gần nhất';
    if (period === 'month') return 'Tổng số lượng sản phẩm trong 30 ngày gần nhất';
    return '';
  };

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <View style={styles.chartTitleContainer}>
          <Ionicons name="bar-chart" size={24} color="#6366F1" />
          <Text style={styles.chartTitle}>Thống kê sản phẩm</Text>
        </View>
      </View>

      <PeriodTabs period={period} onPeriodChange={onPeriodChange} />

      <View style={styles.chartInfo}>
        <Text style={styles.chartInfoText}>{getPeriodText()}</Text>
      </View>

      {hasValidChartData(chartData) ? (
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
  );
}

