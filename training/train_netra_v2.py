#!/usr/bin/env python3
"""
NETRA V2 Training Engine:
- Architecture: EfficientNet-B4 + LinearNormHead (L2 Hyperspherical Projection)
- Training: Paired Supervised Contrastive + Cross-Entropy Loss
- Augmentations: JPEG (30-90), Blur, Resampling, Color Jitter
- Early Stopping: Monitored on Validation AUC-ROC
"""

import os
import sys
import time
import argparse
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from sklearn.metrics import roc_auc_score, accuracy_score, precision_recall_fscore_support

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(WORKSPACE, "netra"))
sys.path.insert(0, os.path.join(WORKSPACE, "netra", "training"))

from netra_v2 import NETRAv2, PairedSupConLoss
from augmentations import get_netra_v2_train_transforms, get_netra_v2_eval_transforms
from dataset_builder import PairedDeepfakeDataset, PairedBatchSampler

device = torch.device("mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu"))

def train_epoch(model, loader, optimizer, criterion, scaler=None):
    model.train()
    total_loss, total_ce, total_supcon = 0.0, 0.0, 0.0
    correct, total = 0, 0
    
    for batch in loader:
        images = batch["image"].to(device)
        labels = batch["label"].to(device)
        pair_ids = batch["identity_id"].to(device)
        
        optimizer.zero_grad()
        
        logits, features = model(images, return_features=True)
        loss, ce, supcon = criterion(logits, features, labels, pair_ids)
        
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()
        
        total_loss += loss.item() * len(labels)
        total_ce += ce * len(labels)
        total_supcon += supcon * len(labels)
        
        preds = torch.argmax(logits, dim=1)
        correct += (preds == labels).sum().item()
        total += len(labels)
        
    return total_loss / max(1, total), correct / max(1, total), total_ce / max(1, total), total_supcon / max(1, total)


def evaluate(model, loader):
    model.eval()
    all_preds, all_probs, all_targets = [], [], []
    
    with torch.no_grad():
        for batch in loader:
            images = batch["image"].to(device)
            labels = batch["label"].to(device)
            
            logits = model(images)
            probs = torch.softmax(logits, dim=1)[:, 1].cpu().numpy()
            preds = torch.argmax(logits, dim=1).cpu().numpy()
            
            all_probs.extend(probs)
            all_preds.extend(preds)
            all_targets.extend(labels.cpu().numpy())
            
    y_true = np.array(all_targets)
    y_pred = np.array(all_preds)
    y_prob = np.array(all_probs)
    
    acc = accuracy_score(y_true, y_pred) * 100
    try:
        auc_val = roc_auc_score(y_true, y_prob) * 100
    except Exception:
        auc_val = 50.0
        
    prec, rec, f1, _ = precision_recall_fscore_support(y_true, y_pred, average='binary', zero_division=0)
    
    return {
        "accuracy": acc,
        "auc_roc": auc_val,
        "precision": prec * 100,
        "recall": rec * 100,
        "f1_score": f1 * 100
    }


def main():
    parser = argparse.ArgumentParser(description="Train NETRA V2 Deepfake Detector")
    parser.add_argument("--epochs", type=int, default=20, help="Total training epochs")
    parser.add_argument("--batch_size", type=int, default=32, help="Batch size")
    parser.add_argument("--lr_head", type=float, default=3e-4, help="Learning rate for head")
    parser.add_argument("--lr_trunk", type=float, default=3e-5, help="Learning rate for unmasked trunk")
    parser.add_argument("--temperature", type=float, default=0.07, help="LinearNorm temperature")
    parser.add_argument("--save_path", type=str, default=os.path.join(WORKSPACE, "netra", "spatial_model_v2_best.pth"))
    args = parser.parse_args()

    print("=================================================================")
    print("                 NETRA V2 TRAINING ENGINE                        ")
    print("=================================================================")
    print(f"Device: {device}")
    print(f"Architecture: EfficientNet-B4 + LinearNormHead (T={args.temperature})")
    
    model = NETRAv2(freeze_backbone=True, temperature=args.temperature, pretrained=True).to(device)
    criterion = PairedSupConLoss(temperature=args.temperature, alpha=0.3, label_smoothing=0.05)
    
    # Differential learning rate setup
    head_params = list(model.head.parameters())
    trunk_params = [p for p in model.features.parameters() if p.requires_grad]
    
    optimizer = torch.optim.AdamW([
        {"params": head_params, "lr": args.lr_head, "weight_decay": 1e-4},
        {"params": trunk_params, "lr": args.lr_trunk, "weight_decay": 1e-4}
    ])
    
    print("\nModel Initialized and Differential Optimizers Configured.")
    print("Ready to ingest paired dataset.")

if __name__ == "__main__":
    main()
