import os
from datetime import datetime
from pathlib import Path

import torch
from torch import nn
from torch.utils.data import DataLoader, random_split
from torchvision import datasets, transforms
import timm
import wandb


DATA_DIR = Path(os.environ.get("DATA_DIR", "training/data/images"))
MODEL_NAME = os.environ.get("MODEL_NAME", "efficientnetv2_s")
EPOCHS = int(os.environ.get("EPOCHS", "10"))
BATCH_SIZE = int(os.environ.get("BATCH_SIZE", "32"))
LR = float(os.environ.get("LR", "0.0005"))
OUTPUT_DIR = Path(os.environ.get("MODEL_OUT_DIR", "training/models"))


def main():
    if not DATA_DIR.exists():
        raise RuntimeError(f"DATA_DIR not found: {DATA_DIR}")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    transform = transforms.Compose(
        [
            transforms.Resize((240, 240)),
            transforms.RandomHorizontalFlip(),
            transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
            transforms.ToTensor()
        ]
    )

    dataset = datasets.ImageFolder(DATA_DIR, transform=transform)
    num_classes = len(dataset.classes)

    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_ds, val_ds = random_split(dataset, [train_size, val_size])

    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True, num_workers=2)
    val_loader = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=2)

    model = timm.create_model(MODEL_NAME, pretrained=True, num_classes=num_classes)
    model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=LR)

    run = wandb.init(project=os.environ.get("WANDB_PROJECT", "foodsnap"), config={
        "model": MODEL_NAME,
        "epochs": EPOCHS,
        "batch_size": BATCH_SIZE,
        "lr": LR,
        "classes": num_classes
    })

    for epoch in range(EPOCHS):
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0

        for inputs, targets in train_loader:
            inputs, targets = inputs.to(device), targets.to(device)
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()

            train_loss += loss.item() * inputs.size(0)
            train_correct += (outputs.argmax(1) == targets).sum().item()
            train_total += targets.size(0)

        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0
        with torch.no_grad():
            for inputs, targets in val_loader:
                inputs, targets = inputs.to(device), targets.to(device)
                outputs = model(inputs)
                loss = criterion(outputs, targets)
                val_loss += loss.item() * inputs.size(0)
                val_correct += (outputs.argmax(1) == targets).sum().item()
                val_total += targets.size(0)

        wandb.log({
            "epoch": epoch + 1,
            "train_loss": train_loss / train_total,
            "train_acc": train_correct / train_total,
            "val_loss": val_loss / val_total,
            "val_acc": val_correct / val_total
        })

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    model_path = OUTPUT_DIR / f"{timestamp}_{MODEL_NAME}.pth"
    latest_path = OUTPUT_DIR / "latest.pth"
    torch.save(model.state_dict(), model_path)
    torch.save(model.state_dict(), latest_path)
    print(f"Saved model to {model_path}")
    print(f"Saved model to {latest_path}")

    wandb.finish()


if __name__ == "__main__":
    main()
