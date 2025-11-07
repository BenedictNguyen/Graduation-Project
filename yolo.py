"""
YOLOv11 Product Detection + Firebase Integration
Phiên bản cải tiến với config file và error handling tốt hơn
"""
from ultralytics import YOLO
import cv2
import time
from collections import Counter
import firebase_admin
from firebase_admin import credentials, firestore
import os
from pathlib import Path
import json

# ============================================================================
# CONFIGURATION - Tách riêng để dễ quản lý
# ============================================================================

class Config:
    """Cấu hình hệ thống - có thể load từ file config.json"""
    
    # Firebase
    FIREBASE_CRED_PATH = "graduationproject-8fc97-firebase-adminsdk-fbsvc-b8be2051cd.json"
    FIREBASE_COLLECTION = "product_counts"
    
    # YOLO Model
    MODEL_PATH = "D:/DO_AN_TN/App/Graduation-Project-master/Graduation-Project-master/best .pt"
    CONFIDENCE_THRESHOLD = 0.5
    
    # Camera
    CAMERA_INDEX = 1  # Thay đổi thành 0 nếu webcam mặc định
    CAMERA_WIDTH = 1280  # Resolution
    CAMERA_HEIGHT = 720
    
    # Data sending
    SEND_INTERVAL = 5  # Giây (tăng từ 5 lên 30 để giảm số lượng documents)
    UPDATE_MODE = True  # True: Update document "latest", False: Tạo document mới
    MIN_CHANGE_THRESHOLD = 0  # Chỉ update nếu tổng số sản phẩm thay đổi >= threshold này
    
    # Display
    WINDOW_NAME = "YOLOv11 Product Detection"
    DISPLAY_FPS = True
    
    @classmethod
    def load_from_file(cls, config_path='config.json'):
        """Load config từ file JSON (nếu tồn tại)"""
        if Path(config_path).exists():
            with open(config_path, 'r', encoding='utf-8') as f:
                config_data = json.load(f)
                for key, value in config_data.items():
                    if hasattr(cls, key):
                        setattr(cls, key, value)
            print(f"✅ Loaded config from {config_path}")
        else:
            print(f"⚠️  Config file not found: {config_path}, using defaults")

# ============================================================================
# FIREBASE SETUP
# ============================================================================

def init_firebase():
    """Khởi tạo Firebase với error handling"""
    try:
        # Kiểm tra file credential
        if not Path(Config.FIREBASE_CRED_PATH).exists():
            raise FileNotFoundError(f"Firebase credential not found: {Config.FIREBASE_CRED_PATH}")
        
        # Khởi tạo Firebase (chỉ 1 lần)
        if not firebase_admin._apps:
            cred = credentials.Certificate(Config.FIREBASE_CRED_PATH)
            firebase_admin.initialize_app(cred)
            print("✅ Firebase initialized successfully")
        
        db = firestore.client()
        return db
    
    except Exception as e:
        print(f"❌ Firebase initialization failed: {e}")
        print("⚠️  Continuing without Firebase (data won't be sent)")
        return None

# ============================================================================
# YOLO MODEL SETUP
# ============================================================================

def init_model():
    """Khởi tạo YOLO model với error handling"""
    try:
        # Kiểm tra file model
        if not Path(Config.MODEL_PATH).exists():
            raise FileNotFoundError(f"Model file not found: {Config.MODEL_PATH}")
        
        print(f"📦 Loading YOLO model: {Config.MODEL_PATH}")
        model = YOLO(Config.MODEL_PATH)
        
        # Lấy class names
        names = model.names
        print(f"✅ Model loaded successfully")
        print(f"📋 Detected classes: {list(names.values())}")
        
        return model, names
    
    except Exception as e:
        print(f"❌ Model loading failed: {e}")
        raise

# ============================================================================
# CAMERA SETUP
# ============================================================================

def init_camera():
    """Khởi tạo camera với auto-detect và error handling"""
    
    # Thử camera index từ config
    cap = cv2.VideoCapture(Config.CAMERA_INDEX)
    
    if not cap.isOpened():
        print(f"⚠️  Camera {Config.CAMERA_INDEX} không mở được, thử camera 0...")
        cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        # Thử các index khác
        for idx in range(5):
            cap = cv2.VideoCapture(idx)
            if cap.isOpened():
                print(f"✅ Found camera at index {idx}")
                Config.CAMERA_INDEX = idx
                break
    
    if not cap.isOpened():
        raise RuntimeError("❌ Không thể mở bất kỳ camera nào! Kiểm tra kết nối camera.")
    
    # Set resolution
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, Config.CAMERA_WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, Config.CAMERA_HEIGHT)
    
    # Lấy resolution thực tế
    actual_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    actual_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    print(f"✅ Camera initialized: {actual_width}x{actual_height}")
    
    return cap

# ============================================================================
# FIREBASE OPERATIONS
# ============================================================================

def send_to_firestore(db, product_counts, previous_total=None):
    """Gửi dữ liệu lên Firestore với error handling và merge logic
    
    Logic merge:
    - Cập nhật số lượng cho các sản phẩm được phát hiện trong frame hiện tại
    - Giữ lại các sản phẩm không được phát hiện (không xóa khỏi danh sách)
    - Sản phẩm đã được nhận diện sẽ không bị xóa khi AI không phát hiện
    
    Args:
        db: Firestore client
        product_counts: Dictionary chứa số lượng sản phẩm được phát hiện trong frame hiện tại
        previous_total: Tổng số sản phẩm lần trước (để so sánh)
    
    Returns:
        tuple: (success: bool, current_total: int)
    """
    if db is None:
        return False, 0
    
    try:
        if Config.UPDATE_MODE:
            # Đọc dữ liệu hiện tại từ Firebase để merge
            doc_ref = db.collection(Config.FIREBASE_COLLECTION).document("latest")
            doc_snapshot = doc_ref.get()
            
            # Lấy dữ liệu cũ (nếu có)
            existing_products = {}
            if doc_snapshot.exists:
                existing_data = doc_snapshot.to_dict()
                existing_products = existing_data.get("products", {})
            
            # Merge logic: 
            # - Cập nhật số lượng cho các sản phẩm được phát hiện trong frame hiện tại
            # - Đặt số lượng = 0 cho các sản phẩm không được phát hiện (nhưng vẫn giữ trong danh sách)
            # - Giữ lại tất cả sản phẩm đã được nhận diện (không xóa)
            
            merged_products = {}
            
            # Bước 1: Đặt số lượng = 0 cho tất cả sản phẩm đã có (nếu không được phát hiện)
            for product_name in existing_products.keys():
                merged_products[product_name] = 0
            
            # Bước 2: Cập nhật số lượng cho các sản phẩm được phát hiện trong frame hiện tại
            for product_name, detected_qty in product_counts.items():
                merged_products[product_name] = detected_qty
            
            current_total = sum(merged_products.values())
            
            # Kiểm tra nếu có thay đổi đáng kể
            if previous_total is not None:
                change = abs(current_total - previous_total)
                if change < Config.MIN_CHANGE_THRESHOLD and merged_products == existing_products:
                    # Không có thay đổi gì, bỏ qua
                    return False, current_total
            
            timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
            data = {
                "timestamp": timestamp,
                "products": merged_products,
                "total": current_total
            }
            
            # Cập nhật document "latest"
            doc_ref.set(data)
            
            # Log thông tin chi tiết
            detected_str = ", ".join([f"{k}: {v}" for k, v in product_counts.items()]) if product_counts else "không có"
            print(f"📤 Updated Firestore document 'latest':")
            print(f"   - Detected in frame: {detected_str}")
            print(f"   - Total products in list: {len(merged_products)}")
            print(f"   - Total quantity: {current_total}")
            if len(merged_products) > 0:
                merged_str = ", ".join([f"{k}: {v}" for k, v in merged_products.items()])
                print(f"   - All products: {merged_str}")
            
            return True, current_total
        else:
            # Mode cũ: Tạo document mới (không merge)
            current_total = sum(product_counts.values())
            
            if previous_total is not None and current_total > 0:
                change = abs(current_total - previous_total)
                if change < Config.MIN_CHANGE_THRESHOLD:
                    print(f"⏭️  Skip update (change: {change} < threshold: {Config.MIN_CHANGE_THRESHOLD})")
                    return False, current_total
            
            timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
            data = {
                "timestamp": timestamp,
                "products": product_counts,
                "total": current_total
            }
            
            db.collection(Config.FIREBASE_COLLECTION).add(data)
            print(f"📤 Sent to Firestore: {data}")
            
            return True, current_total
    
    except Exception as e:
        print(f"❌ Failed to send to Firestore: {e}")
        import traceback
        traceback.print_exc()
        return False, 0

# ============================================================================
# FPS COUNTER
# ============================================================================

class FPSCounter:
    """Đếm FPS để monitor performance"""
    
    def __init__(self, avg_frames=30):
        self.frame_times = []
        self.avg_frames = avg_frames
    
    def update(self):
        self.frame_times.append(time.time())
        if len(self.frame_times) > self.avg_frames:
            self.frame_times.pop(0)
    
    def get_fps(self):
        if len(self.frame_times) < 2:
            return 0
        
        time_diff = self.frame_times[-1] - self.frame_times[0]
        if time_diff > 0:
            return len(self.frame_times) / time_diff
        return 0

# ============================================================================
# MAIN DETECTION LOOP
# ============================================================================

def main():
    """Main detection loop"""
    
    print("\n" + "="*70)
    print("🚀 YOLOv11 PRODUCT DETECTION + FIREBASE")
    print("="*70)
    
    # Load config (nếu có)
    Config.load_from_file()
    
    # Initialize components
    print("\n📋 Initializing components...")
    
    try:
        model, names = init_model()
        db = init_firebase()
        cap = init_camera()
    except Exception as e:
        print(f"\n❌ Initialization failed: {e}")
        return
    
    # Setup
    fps_counter = FPSCounter()
    last_sent_time = 0  # Bắt đầu từ 0 để gửi ngay lần đầu
    frame_count = 0
    previous_total = None  # Lưu tổng số sản phẩm lần trước để so sánh
    
    # Gửi dữ liệu rỗng ngay khi khởi động để reset Firebase về 0
    if db and Config.UPDATE_MODE:
        print("🔄 Resetting Firebase document 'latest' to empty state...")
        empty_data = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "products": {},
            "total": 0
        }
        try:
            doc_ref = db.collection(Config.FIREBASE_COLLECTION).document("latest")
            doc_ref.set(empty_data)
            print("✅ Firebase reset to empty state (total: 0)")
        except Exception as e:
            print(f"⚠️  Failed to reset Firebase: {e}")
    
    print(f"\n✅ System ready!")
    print(f"📊 Confidence threshold: {Config.CONFIDENCE_THRESHOLD}")
    print(f"⏱️  Send interval: {Config.SEND_INTERVAL}s")
    print(f"🔄 Update mode: {'ON (update document \"latest\")' if Config.UPDATE_MODE else 'OFF (create new documents)'}")
    print(f"📈 Min change threshold: {Config.MIN_CHANGE_THRESHOLD}")
    print(f"🔥 Firebase: {'Enabled' if db else 'Disabled'}")
    print(f"\n🎥 Starting detection...")
    print("   Press 'q' to quit")
    print("   Press 's' to send data manually")
    print("   Press 'c' to clear console")
    print("="*70 + "\n")
    
    try:
        while True:
            # Read frame
            ret, frame = cap.read()
            if not ret:
                print("⚠️  Cannot read frame, retrying...")
                time.sleep(0.1)
                continue
            
            frame_count += 1
            
            # YOLO inference
            results = model(frame, conf=Config.CONFIDENCE_THRESHOLD, verbose=False)
            result = results[0]
            
            # Vẽ bounding boxes
            annotated_frame = result.plot()
            
            # Đếm sản phẩm
            product_list = []
            for box in result.boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                if conf >= Config.CONFIDENCE_THRESHOLD:
                    product_list.append(names[cls_id])
            
            product_counts = dict(Counter(product_list))
            
            # In ra console
            if product_counts:
                count_str = ", ".join([f"{k}: {v}" for k, v in product_counts.items()])
                print(f"[Frame {frame_count}] Detected: {count_str}")
            
            # Gửi dữ liệu định kỳ (luôn gửi kể cả khi không có sản phẩm để đảm bảo Firebase được cập nhật)
            current_time = time.time()
            if current_time - last_sent_time >= Config.SEND_INTERVAL:
                # Luôn gửi dữ liệu, kể cả khi product_counts rỗng (để hiển thị 0 khi không có sản phẩm)
                success, current_total = send_to_firestore(db, product_counts, previous_total)
                if success:
                    last_sent_time = current_time
                    previous_total = current_total
            
            # FPS counter
            fps_counter.update()
            fps = fps_counter.get_fps()
            
            # Display FPS
            if Config.DISPLAY_FPS:
                cv2.putText(annotated_frame, f"FPS: {fps:.1f}", (10, 30),
                           cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            
            # Display frame
            cv2.imshow(Config.WINDOW_NAME, annotated_frame) # <--- Dòng này CHÍNH LÀ LỆNH MỞ CỬA SỔ CAMERA
            
            # Keyboard controls
            key = cv2.waitKey(1) & 0xFF # <--- Dòng này bắt buộc phải có để cửa sổ hoạt động
            
            if key == ord('q'):
                print("\n👋 Quitting...")
                break
            
            elif key == ord('s'):
                # Manual send (luôn gửi kể cả khi không có sản phẩm)
                print("\n📤 Manual send triggered...")
                success, current_total = send_to_firestore(db, product_counts, previous_total)
                if success:
                    previous_total = current_total
            
            elif key == ord('c'):
                # Clear console
                os.system('cls' if os.name == 'nt' else 'clear')
    
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
    
    except Exception as e:
        print(f"\n❌ Error during detection: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Cleanup
        print("\n🧹 Cleaning up...")
        cap.release()
        cv2.destroyAllWindows()
        
        print(f"📊 Final stats:")
        print(f"   Total frames processed: {frame_count}")
        print(f"   Average FPS: {fps_counter.get_fps():.1f}")
        print("\n✅ Program terminated successfully")

# ============================================================================
# ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    main()