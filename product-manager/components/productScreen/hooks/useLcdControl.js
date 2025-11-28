import { useEffect, useState, useCallback } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { database, auth, db } from '../../../utils/firebaseConfig';

const CONTROL_PATH = 'lcd_control';

const defaultControlState = {
  mode: 'auto',
  customLine1: '',
  customLine2: '',
  updatedAt: null,
  updatedByName: '',
  updatedByEmail: '',
  updatedByUid: '',
  commandId: '',
};

export function useLcdControl() {
  const [controlState, setControlState] = useState(defaultControlState);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const controlRef = ref(database, CONTROL_PATH);
    const unsubscribe = onValue(
      controlRef,
      (snapshot) => {
        const value = snapshot.val();
        if (value) {
          setControlState({ ...defaultControlState, ...value });
        } else {
          setControlState(defaultControlState);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Failed to listen lcd_control node:', err);
        setError(err?.message || 'Không thể đồng bộ trạng thái LCD');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const sendCommand = useCallback(
    async (payload) => {
      if (!currentUser) {
        throw new Error('Bạn cần đăng nhập để điều khiển LCD');
      }

      // Kiểm tra quyền admin
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (!userDoc.exists()) {
          throw new Error('Không tìm thấy thông tin người dùng');
        }
        const userRole = userDoc.data().role || 'employee';
        if (userRole !== 'admin') {
          throw new Error('Chỉ Quản trị viên mới có quyền điều khiển LCD');
        }
      } catch (err) {
        if (err.message.includes('Quản trị viên')) {
          throw err;
        }
        throw new Error('Không thể kiểm tra quyền truy cập');
      }

      setUpdating(true);
      setError(null);

      const controlRef = ref(database, CONTROL_PATH);
      const commandId = `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const displayName =
        currentUser.displayName ||
        currentUser.email?.split('@')[0] ||
        currentUser.phoneNumber ||
        'user';

      try {
        await update(controlRef, {
          ...payload,
          commandId,
          updatedAt: new Date().toISOString(),
          updatedByUid: currentUser.uid,
          updatedByEmail: currentUser.email || '',
          updatedByName: displayName,
        });
      } catch (err) {
        console.error('Failed to update lcd_control node:', err);
        const message = err?.message || 'Không thể cập nhật hiển thị LCD';
        setError(message);
        throw new Error(message);
      } finally {
        setUpdating(false);
      }
    },
    [currentUser]
  );

  return {
    controlState,
    loading,
    updating,
    error,
    sendCommand,
  };
}


