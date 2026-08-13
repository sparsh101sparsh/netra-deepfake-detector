import os
import glob
import random
import torch
from torch.utils.data import Dataset, Sampler
from PIL import Image

class PairedDeepfakeDataset(Dataset):
    """
    Dataset yielding paired real/fake samples for Supervised Contrastive & Cross-Entropy training.
    """
    def __init__(self, samples: list, transform=None):
        """
        samples: list of dicts:
        {
            "path": str,
            "label": int (0 for Real, 1 for Fake),
            "identity_id": int,
            "figure_name": str
        }
        """
        self.samples = samples
        self.transform = transform

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        item = self.samples[idx]
        img = Image.open(item["path"]).convert("RGB")
        
        if self.transform:
            img = self.transform(img)
            
        return {
            "image": img,
            "label": torch.tensor(item["label"], dtype=torch.long),
            "identity_id": torch.tensor(item["identity_id"], dtype=torch.long),
            "figure_name": item["figure_name"],
            "path": item["path"]
        }


class PairedBatchSampler(Sampler):
    """
    Ensures that for each batch, both Real and Fake samples of the same identity
    are sampled together to compute identity-invariant contrastive loss.
    """
    def __init__(self, samples: list, batch_size: int = 32):
        self.samples = samples
        self.batch_size = batch_size
        
        # Group indices by identity
        self.identity_map = {}
        for idx, s in enumerate(samples):
            ident = s["identity_id"]
            label = s["label"]
            if ident not in self.identity_map:
                self.identity_map[ident] = {0: [], 1: []}
            self.identity_map[ident][label].append(idx)

    def __iter__(self):
        identities = list(self.identity_map.keys())
        random.shuffle(identities)
        
        batch = []
        for ident in identities:
            reals = self.identity_map[ident][0]
            fakes = self.identity_map[ident][1]
            
            if reals and fakes:
                r_idx = random.choice(reals)
                f_idx = random.choice(fakes)
                batch.extend([r_idx, f_idx])
            elif reals:
                batch.append(random.choice(reals))
            elif fakes:
                batch.append(random.choice(fakes))
                
            if len(batch) >= self.batch_size:
                yield batch[:self.batch_size]
                batch = batch[self.batch_size:]
                
        if len(batch) > 0:
            yield batch

    def __len__(self):
        return len(self.samples) // self.batch_size
