import io
import random
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
import torch
import torchvision.transforms as transforms
import torchvision.transforms.functional as TF

class RandomJPEGCompression:
    """Simulates social media recompression (WhatsApp/Twitter) by varying JPEG quality 30-90."""
    def __init__(self, quality_range=(30, 90), p=0.6):
        self.quality_range = quality_range
        self.p = p

    def __call__(self, img: Image.Image) -> Image.Image:
        if random.random() < self.p:
            q = random.randint(*self.quality_range)
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=q)
            buf.seek(0)
            return Image.open(buf).convert("RGB")
        return img


class RandomDownsampleUpsample:
    """Simulates low-resolution crop upscaling to destroy raw sensor pixel grids."""
    def __init__(self, scale_range=(0.4, 0.9), p=0.4):
        self.scale_range = scale_range
        self.p = p

    def __call__(self, img: Image.Image) -> Image.Image:
        if random.random() < self.p:
            w, h = img.size
            scale = random.uniform(*self.scale_range)
            low_w, low_h = max(32, int(w * scale)), max(32, int(h * scale))
            img_down = img.resize((low_w, low_h), resample=Image.BILINEAR)
            return img_down.resize((w, h), resample=Image.BICUBIC)
        return img


class RandomGaussianBlur:
    """Applies random Gaussian blur to prevent overfitting to camera focus sharpness."""
    def __init__(self, radius_range=(0.5, 2.0), p=0.3):
        self.radius_range = radius_range
        self.p = p

    def __call__(self, img: Image.Image) -> Image.Image:
        if random.random() < self.p:
            r = random.uniform(*self.radius_range)
            return img.filter(ImageFilter.GaussianBlur(radius=r))
        return img


def get_netra_v2_train_transforms(img_size: int = 224):
    """
    Robust training transforms that eliminate sharpness, contrast, and compression biases.
    """
    return transforms.Compose([
        transforms.Resize((img_size, img_size)),
        transforms.RandomHorizontalFlip(p=0.5),
        RandomJPEGCompression(quality_range=(30, 90), p=0.6),
        RandomDownsampleUpsample(scale_range=(0.5, 0.95), p=0.4),
        RandomGaussianBlur(radius_range=(0.4, 1.8), p=0.3),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.05),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])


def get_netra_v2_eval_transforms(img_size: int = 224):
    """
    Standard evaluation preprocessing.
    """
    return transforms.Compose([
        transforms.Resize((img_size, img_size)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
