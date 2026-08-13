import os
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision.models import efficientnet_b4, EfficientNet_B4_Weights

class LinearNormHead(nn.Module):
    """
    GenD-style Hyperspherical L2 Projection Head.
    Eliminates magnitude sensitivity (sharpness, brightness, contrast) by projecting
    both features and class prototype weights onto the unit hypersphere.
    """
    def __init__(self, in_dim: int = 1792, num_classes: int = 2, temperature: float = 0.07):
        super().__init__()
        self.in_dim = in_dim
        self.num_classes = num_classes
        self.temperature = temperature
        
        # Learnable class prototypes
        self.weight = nn.Parameter(torch.randn(num_classes, in_dim))
        nn.init.xavier_uniform_(self.weight)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # 1. Normalize feature representations to unit sphere
        x_norm = F.normalize(x, p=2, dim=1)
        # 2. Normalize class prototype weights to unit sphere
        w_norm = F.normalize(self.weight, p=2, dim=1)
        # 3. Scaled cosine similarity logits
        return (x_norm @ w_norm.t()) / self.temperature

    def get_normalized_features(self, x: torch.Tensor) -> torch.Tensor:
        return F.normalize(x, p=2, dim=1)


class NETRAv2(nn.Module):
    """
    NETRA V2 Spatial Biometric Detector
    Backbone: EfficientNet-B4 (Pretrained ImageNet-1K)
    Head: LinearNormHead (Cosine similarity metric projection)
    """
    def __init__(self, freeze_backbone: bool = True, temperature: float = 0.07, pretrained: bool = True):
        super().__init__()
        weights = EfficientNet_B4_Weights.IMAGENET1K_V1 if pretrained else None
        net = efficientnet_b4(weights=weights)
        self.features = net.features
        self.pool = net.avgpool
        self.head = LinearNormHead(in_dim=1792, num_classes=2, temperature=temperature)
        
        if freeze_backbone:
            self.freeze_trunk_except_top()

    def freeze_trunk_except_top(self):
        """Freeze early convolutional feature extractors; unfreeze top 2 MBConv blocks + all BatchNorm/LayerNorm."""
        for p in self.features.parameters():
            p.requires_grad = False
            
        # Unfreeze last 2 MBConv stages (stage 7 and 8)
        for m in list(self.features)[-2:]:
            for p in m.parameters():
                p.requires_grad = True
                
        # Unfreeze all normalization layers across the network to adapt running statistics
        for m in self.features.modules():
            if isinstance(m, (nn.BatchNorm2d, nn.LayerNorm)):
                for p in m.parameters():
                    p.requires_grad = True

    def unfreeze_all(self):
        """Unfreeze entire network for final fine-tuning phase."""
        for p in self.parameters():
            p.requires_grad = True

    def extract_features(self, x: torch.Tensor) -> torch.Tensor:
        feat = self.features(x)
        pooled = self.pool(feat).flatten(1)
        return self.head.get_normalized_features(pooled)

    def forward(self, x: torch.Tensor, return_features: bool = False):
        feat = self.features(x)
        pooled = self.pool(feat).flatten(1)
        logits = self.head(pooled)
        if return_features:
            return logits, self.head.get_normalized_features(pooled)
        return logits


class PairedSupConLoss(nn.Module):
    """
    Supervised Contrastive + Cross-Entropy Loss for paired (Real_i, Fake_i) samples.
    Forces the network to ignore identity and focus strictly on manipulation residuals.
    """
    def __init__(self, temperature: float = 0.07, alpha: float = 0.3, label_smoothing: float = 0.05):
        super().__init__()
        self.temperature = temperature
        self.alpha = alpha
        self.label_smoothing = label_smoothing

    def forward(self, logits: torch.Tensor, features: torch.Tensor, labels: torch.Tensor, pair_ids: torch.Tensor = None):
        # 1. Standard Cross-Entropy with label smoothing
        ce_loss = F.cross_entropy(logits, labels, label_smoothing=self.label_smoothing)
        
        if pair_ids is None or self.alpha <= 0.0:
            return ce_loss, ce_loss.item(), 0.0
            
        # 2. Supervised Contrastive Loss on Normalized Features
        # Positive pairs: same class label or identity-contrastive pairs
        batch_size = features.shape[0]
        if batch_size <= 1:
            return ce_loss, ce_loss.item(), 0.0
            
        similarity_matrix = torch.matmul(features, features.T) / self.temperature
        
        # Mask for identity pairs with different labels (Real vs Fake of same person)
        labels_eq = torch.eq(labels.unsqueeze(0), labels.unsqueeze(1)).float()
        pair_eq = torch.eq(pair_ids.unsqueeze(0), pair_ids.unsqueeze(1)).float()
        
        # Pull same class together, push (real_i, fake_i) apart strongly
        mask = labels_eq - torch.eye(batch_size, device=features.device)
        pos_counts = mask.sum(dim=1).clamp(min=1.0)
        
        exp_sim = torch.exp(similarity_matrix - torch.max(similarity_matrix, dim=1, keepdim=True)[0])
        log_prob = similarity_matrix - torch.log(exp_sim.sum(dim=1, keepdim=True) + 1e-7)
        
        supcon_loss = -(mask * log_prob).sum(dim=1) / pos_counts
        supcon_loss = supcon_loss.mean()
        
        total_loss = ce_loss + self.alpha * supcon_loss
        return total_loss, ce_loss.item(), supcon_loss.item()
