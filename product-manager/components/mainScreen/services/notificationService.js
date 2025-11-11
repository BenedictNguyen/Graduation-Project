import { collection, addDoc, Timestamp, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../../utils/firebaseConfig';

// Hàm lấy tất cả userIds từ users collection
export const getAllUserIds = async (currentUserId) => {
  try {
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    const userIds = querySnapshot.docs.map(doc => doc.id);
    return userIds;
  } catch (error) {
    console.error('Error getting all user IDs:', error);
    // Nếu không lấy được danh sách users, trả về userId hiện tại
    return currentUserId ? [currentUserId] : [];
  }
};

// Hàm tạo thông báo cho một user
export const createNotification = async ({ userId, type, title, body }) => {
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

// Hàm kiểm tra user có phải admin không
const checkIsAdmin = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return false;
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    return userDoc.exists() && userDoc.data().role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

// Hàm tạo thông báo cho tất cả users
export const createNotificationForAllUsers = async ({ type, title, body }, currentUserId) => {
  try {
    const userIsAdmin = await checkIsAdmin();
    
    // Nếu không phải admin, chỉ tạo thông báo cho chính user hiện tại
    if (!userIsAdmin) {
      if (currentUserId) {
        await createNotification({ userId: currentUserId, type, title, body });
        console.log('✅ Created notification for current user only (not admin)');
      }
      return;
    }
    
    // Nếu là admin, tạo thông báo cho tất cả users
    const userIds = await getAllUserIds(currentUserId);
    const promises = userIds.map(userId => 
      createNotification({ userId, type, title, body })
    );
    await Promise.all(promises);
    console.log(`✅ Created notifications for ${userIds.length} users (admin)`);
  } catch (error) {
    console.error('Error creating notifications for all users:', error);
  }
};

// Tạo thông báo khi có thay đổi sản phẩm
export const checkProductChanges = async (previousProducts, currentProducts, uid) => {
  if (!previousProducts || !currentProducts || !uid) return;

  try {
    const previousKeys = Object.keys(previousProducts);
    const currentKeys = Object.keys(currentProducts);

    // Kiểm tra sản phẩm mới
    const newProducts = currentKeys.filter(key => !previousKeys.includes(key));
    for (const productName of newProducts) {
      await createNotificationForAllUsers({
        type: 'product_new',
        title: 'Sản phẩm mới được phát hiện',
        body: `Sản phẩm "${productName}" đã được thêm vào kệ với số lượng ${currentProducts[productName]}`,
      }, uid);
    }

    // Kiểm tra sản phẩm hết hàng
    for (const productName of previousKeys) {
      const previousQty = previousProducts[productName] || 0;
      const currentQty = currentProducts[productName] || 0;
      
      if (previousQty > 0 && currentQty === 0) {
        await createNotificationForAllUsers({
          type: 'product_out_of_stock',
          title: 'Sản phẩm hết hàng',
          body: `Sản phẩm "${productName}" đã hết hàng trên kệ`,
        }, uid);
      }
    }

    // Kiểm tra cập nhật số lượng đáng kể
    for (const productName of currentKeys) {
      const previousQty = previousProducts[productName] || 0;
      const currentQty = currentProducts[productName] || 0;
      const change = Math.abs(currentQty - previousQty);
      
      if (change >= 5 && previousQty > 0 && currentQty > 0) {
        const direction = currentQty > previousQty ? 'tăng' : 'giảm';
        await createNotificationForAllUsers({
          type: 'product_update',
          title: 'Cập nhật số lượng sản phẩm',
          body: `Sản phẩm "${productName}" ${direction} từ ${previousQty} lên ${currentQty} đơn vị`,
        }, uid);
      }
    }
  } catch (error) {
    console.error('Error checking product changes:', error);
  }
};

