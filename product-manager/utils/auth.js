// utils/auth.js (Firebase version)
import { auth, db } from "./firebaseConfig";
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut 
} from "firebase/auth";
import { 
  doc, setDoc, getDoc 
} from "firebase/firestore";

// === Đăng ký ===
export const handleSignup = async (email, password, role = "employee") => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Lưu thêm dữ liệu vào Firestore
    await setDoc(doc(db, "users", user.uid), {
      email,
      role,
      employeeId: role === "admin" ? "ADMIN" + Date.now() : "EMP" + Date.now(),
      createdAt: new Date().toISOString(),
    });

    return { success: true, user };
  } 
  catch (error) {
    return { success: false, message: error.message };
  }
};

// === Đăng nhập ===
export const handleLogin = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userDoc = await getDoc(doc(db, "users", user.uid));
    
    // Nếu user chưa có document, tạo một document mặc định
    if (!userDoc.exists()) {
      await setDoc(doc(db, "users", user.uid), {
        email: user.email || email,
        role: "employee",
        employeeId: "EMP" + Date.now(),
        createdAt: new Date().toISOString(),
      });
      return { success: true, user: { uid: user.uid, email: user.email || email, role: "employee" } };
    }

    const userData = userDoc.data();
    return { success: true, user: { uid: user.uid, ...userData } };
  } 
  catch (error) {
    let message = 'Bạn đã nhập sai tài khoản hoặc mật khẩu, vui lòng kiểm tra lại!';
    
    if (error.code === 'auth/invalid-email') {
      message = 'Địa chỉ email không hợp lệ!';
    } else if (error.code === 'auth/user-not-found') {
      message = 'Tài khoản không tồn tại!';
    } else if (error.code === 'auth/wrong-password') {
      message = 'Bạn đã nhập sai tài khoản hoặc mật khẩu, vui lòng kiểm tra lại!';
    } else if (error.code === 'auth/too-many-requests') {
      message = 'Bạn đã nhập sai quá nhiều lần, vui lòng thử lại sau!';
    }
    
    return { success: false, message };
  }
};

// === Đăng xuất ===
export const clearUserSession = async () => {
  await signOut(auth);
};

// === Session (Firestore thay vì global) ===
export const getUserSession = () => auth.currentUser;

// === Kiểm tra vai trò ===
export const isAdmin = async () => {
  const user = auth.currentUser;
  if (!user) return false;
  const docSnap = await getDoc(doc(db, "users", user.uid));
  return docSnap.exists() && docSnap.data().role === "admin";
};

// === Lấy thông tin role của user hiện tại ===
export const getUserRole = async () => {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    const docSnap = await getDoc(doc(db, "users", user.uid));
    if (docSnap.exists()) {
      return docSnap.data().role || "employee";
    }
    return "employee";
  } catch (error) {
    console.error("Error getting user role:", error);
    return "employee";
  }
};

// === Kiểm tra có phải employee không ===
export const isEmployee = async () => {
  const role = await getUserRole();
  return role === "employee";
};

// === Lấy thông tin user đầy đủ ===
export const getUserInfo = async () => {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    const docSnap = await getDoc(doc(db, "users", user.uid));
    if (docSnap.exists()) {
      return {
        uid: user.uid,
        email: user.email,
        ...docSnap.data(),
      };
    }
    return {
      uid: user.uid,
      email: user.email,
      role: "employee",
    };
  } catch (error) {
    console.error("Error getting user info:", error);
    return null;
  }
};
