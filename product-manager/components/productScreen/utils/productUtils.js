// Hàm xử lý dữ liệu biểu đồ theo period
export const processChartData = (allData, currentPeriod, setChartData) => {
  if (!allData || allData.length === 0) {
    setChartData(null);
    return null;
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
    return null;
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
    return null;
  }

  // Tạo labels và values cho biểu đồ
  const labels = sortedProducts.map(([name]) => {
    // Rút ngắn tên sản phẩm nếu quá dài
    return name.length > 8 ? name.substring(0, 8) + '...' : name;
  });
  const values = sortedProducts.map(([, qty]) => qty);

  const chartDataResult = {
    labels,
    datasets: [{ data: values }],
    fullLabels: sortedProducts.map(([name]) => name), // Lưu tên đầy đủ để hiển thị
  };

  setChartData(chartDataResult);
  return chartDataResult;
};

// Kiểm tra dữ liệu biểu đồ hợp lệ
export const hasValidChartData = (chartData) => {
  return chartData && 
         chartData.datasets && 
         chartData.datasets[0] && 
         chartData.datasets[0].data && 
         chartData.datasets[0].data.length > 0 && 
         chartData.datasets[0].data.some(val => val > 0);
};

// Format timestamp
export const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'Không có thời gian';
  
  if (timestamp.toDate) {
    return timestamp.toDate().toLocaleString('vi-VN');
  } else if (typeof timestamp === 'string') {
    return new Date(timestamp).toLocaleString('vi-VN');
  }
  
  return timestamp;
};

