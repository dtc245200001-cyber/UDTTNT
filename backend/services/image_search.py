import torch
import torchvision.transforms as transforms
import torchvision.models as models
from PIL import Image
import numpy as np
import logging
import io
import ssl

ssl._create_default_https_context = ssl._create_unverified_context


logger = logging.getLogger(__name__)

class FeatureExtractor:
    def __init__(self):
        logger.info("[ImageSearch] Khởi tạo mô hình ResNet50...")
        # Tải mô hình ResNet50 (từ torchvision)
        self.model = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V1)
        self.model.eval() # Chế độ suy luận
        
        # Tiền xử lý ảnh đầu vào
        self.preprocess = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
        logger.info("[ImageSearch] Khởi tạo thành công.")

    def extract_feature(self, image_data):
        """
        Trích xuất đặc trưng từ dữ liệu ảnh (bytes hoặc object mở từ PIL)
        Trả về vector numpy 1 chiều (2048 phần tử)
        """
        try:
            if isinstance(image_data, str):
                img = Image.open(image_data).convert('RGB')
            elif isinstance(image_data, Image.Image):
                img = image_data.convert('RGB')
            else:
                img = Image.open(io.BytesIO(image_data)).convert('RGB')

            img_tensor = self.preprocess(img)
            img_batch = img_tensor.unsqueeze(0)
            
            with torch.no_grad():
                features = self.model.conv1(img_batch)
                features = self.model.bn1(features)
                features = self.model.relu(features)
                features = self.model.maxpool(features)
                features = self.model.layer1(features)
                features = self.model.layer2(features)
                features = self.model.layer3(features)
                features = self.model.layer4(features)
                features = self.model.avgpool(features)
                
                vector = features.flatten().numpy()
                # Có thể chuẩn hóa (L2 normalize) vector để cosine similarity tính chính xác hơn
                norm = np.linalg.norm(vector)
                if norm > 0:
                    vector = vector / norm
                return vector.tolist() # Trả về list để dễ serialize sang JSON
                
        except Exception as e:
            logger.error(f"[ImageSearch] Lỗi trích xuất đặc trưng: {e}")
            return None

# Khởi tạo instance toàn cục (lazy init có thể tốt hơn, nhưng giữ đơn giản cho minh họa)
# Chúng ta sẽ khởi tạo khi nào cần hoặc khởi tạo luôn ở đây
try:
    image_feature_extractor = FeatureExtractor()
except Exception as e:
    logger.error(f"Không thể khởi tạo mô hình Image Search: {e}")
    image_feature_extractor = None
