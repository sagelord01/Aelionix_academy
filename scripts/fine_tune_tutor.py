#!/usr/bin/env python3
"""
Aelionix Academy - QLoRA fine-tune for the tutor adapter.

Trains Qwen/Qwen2.5-Coder-7B-Instruct on data/traces/splits/{train,eval}.jsonl.

Why plain transformers.Trainer instead of trl.SFTTrainer:
  TRL's chunked log-prob kernel fails on Tesla T4 (bf16 gemm). This path uses
  torch fp16 with re-entrant-safe gradient checkpointing and works on free T4.

Usage (Google Colab, after cloning the repo):
    pip install -q transformers accelerate bitsandbytes peft datasets
    python scripts/fine_tune_tutor.py

Environment overrides:
    MODEL_NAME      base model (default Qwen/Qwen2.5-Coder-7B-Instruct)
    MAX_LENGTH      sequence cap (default 2048; must exceed your widest trace)
    EPOCHS          default 3
    ADAPTER_OUTPUT  where to save the adapter
    HF_REPO_ID      if set, upload the adapter to this Hub repo after training
"""

import json
import os
import sys
from pathlib import Path

import torch
from datasets import load_dataset
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    DataCollatorForSeq2Seq,
    Trainer,
    TrainingArguments,
)

MODEL_NAME = os.getenv("MODEL_NAME", "Qwen/Qwen2.5-Coder-7B-Instruct")
MAX_LENGTH = int(os.getenv("MAX_LENGTH", "2048"))
EPOCHS = float(os.getenv("EPOCHS", "3"))
ADAPTER_OUTPUT = os.getenv("ADAPTER_OUTPUT", "data/models/aelionix-tutor-qlora")
HF_REPO_ID = os.getenv("HF_REPO_ID", "").strip()

SPLIT_CANDIDATES = [
    "data/traces/splits/train.jsonl",
    "train.jsonl",
]


def find_root() -> Path:
    cwd = Path(os.getcwd()).resolve()
    for base in (cwd, cwd.parent, Path("/content")):
        for candidate in SPLIT_CANDIDATES:
            if (base / candidate).exists():
                return base
    raise FileNotFoundError(
        "Could not locate data/traces/splits/train.jsonl.\n"
        "Run `npm run traces:build` locally, commit the JSONL, then clone in Colab.\n"
        f"Looked under: {cwd} and /content"
    )


def find_split(root: Path, name: str) -> Path:
    for candidate in (f"data/traces/splits/{name}.jsonl", f"{name}.jsonl"):
        path = root / candidate
        if path.exists():
            return path
    raise FileNotFoundError(f"Missing {name}.jsonl under {root}")


def build_tokenize_fn(tokenizer):
    """
    Tokenize a chat example and mask the prompt so the loss only trains on the
    assistant's JSON reply. Without this the model mostly learns to reproduce
    the long system prompt.
    """

    def tokenize(example):
        messages = example["messages"]
        prompt_text = tokenizer.apply_chat_template(
            messages[:-1], tokenize=False, add_generation_prompt=True
        )
        full_text = tokenizer.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=False
        )

        prompt_ids = tokenizer(prompt_text, add_special_tokens=False)["input_ids"]
        full = tokenizer(full_text, add_special_tokens=False, truncation=True, max_length=MAX_LENGTH)
        input_ids = full["input_ids"]

        labels = list(input_ids)
        mask_len = min(len(prompt_ids), len(labels))
        for index in range(mask_len):
            labels[index] = -100

        # Nothing left to learn from once truncation eats the reply.
        if all(label == -100 for label in labels):
            labels[-1] = input_ids[-1]

        return {
            "input_ids": input_ids,
            "attention_mask": full["attention_mask"],
            "labels": labels,
        }

    return tokenize


def main() -> None:
    print("=" * 60)
    print("Aelionix Academy - QLoRA Fine-Tuning")
    print("=" * 60)

    root = find_root()
    train_path = find_split(root, "train")
    eval_path = find_split(root, "eval")
    output_dir = Path(ADAPTER_OUTPUT)

    print(f"Project root : {root}")
    print(f"Train        : {train_path}")
    print(f"Eval         : {eval_path}")
    print(f"Output       : {output_dir}")
    print(f"Max length   : {MAX_LENGTH}")

    if not torch.cuda.is_available():
        sys.exit("No CUDA GPU. Training a 7B model on CPU is not practical.")

    print(f"GPU          : {torch.cuda.get_device_name(0)}")
    print(f"VRAM         : {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")

    print("\n[1/6] Loading tokenizer")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    print("[2/6] Loading model in 4-bit")
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_use_double_quant=True,
        bnb_4bit_compute_dtype=torch.float16,
    )
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True,
    )
    model = prepare_model_for_kbit_training(model, use_gradient_checkpointing=True)
    model.config.use_cache = False

    print("[3/6] Attaching LoRA adapter")
    lora_config = LoraConfig(
        r=16,
        lora_alpha=32,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    print("[4/6] Tokenizing dataset")
    dataset = load_dataset(
        "json",
        data_files={"train": str(train_path), "eval": str(eval_path)},
    )
    tokenize = build_tokenize_fn(tokenizer)
    tokenized = dataset.map(
        tokenize,
        remove_columns=dataset["train"].column_names,
        desc="tokenizing",
    )
    print(f"  train: {len(tokenized['train'])}  eval: {len(tokenized['eval'])}")

    over_length = sum(
        1 for row in tokenized["train"] if len(row["input_ids"]) >= MAX_LENGTH
    )
    if over_length:
        print(
            f"  WARNING: {over_length} train example(s) hit MAX_LENGTH={MAX_LENGTH} "
            "and were truncated. The reply may be partially cut."
        )

    print("[5/6] Configuring trainer")
    args = TrainingArguments(
        output_dir=str(output_dir / "checkpoints"),
        per_device_train_batch_size=1,
        per_device_eval_batch_size=1,
        gradient_accumulation_steps=4,
        learning_rate=2e-4,
        logging_steps=1,
        num_train_epochs=EPOCHS,
        save_strategy="epoch",
        eval_strategy="epoch",
        lr_scheduler_type="cosine",
        optim="paged_adamw_32bit",
        fp16=True,
        bf16=False,
        gradient_checkpointing=True,
        gradient_checkpointing_kwargs={"use_reentrant": False},
        report_to="none",
        remove_unused_columns=False,
    )

    collator = DataCollatorForSeq2Seq(
        tokenizer=tokenizer,
        model=model,
        padding=True,
        pad_to_multiple_of=8,
        label_pad_token_id=-100,
    )

    trainer = Trainer(
        model=model,
        args=args,
        train_dataset=tokenized["train"],
        eval_dataset=tokenized["eval"],
        data_collator=collator,
    )

    print("[6/6] Training")
    trainer.train()

    print("\nSaving adapter")
    output_dir.mkdir(parents=True, exist_ok=True)
    trainer.model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)

    summary = {
        "base_model": MODEL_NAME,
        "max_length": MAX_LENGTH,
        "epochs": EPOCHS,
        "train_examples": len(tokenized["train"]),
        "eval_examples": len(tokenized["eval"]),
        "metrics": trainer.state.log_history,
    }
    (output_dir / "training_summary.json").write_text(
        json.dumps(summary, indent=2), encoding="utf-8"
    )

    if HF_REPO_ID:
        print(f"\nUploading adapter to https://huggingface.co/{HF_REPO_ID}")
        trainer.model.push_to_hub(HF_REPO_ID)
        tokenizer.push_to_hub(HF_REPO_ID)

    print("\n" + "=" * 60)
    print(f"Done. Adapter at: {output_dir}")
    print("=" * 60)


if __name__ == "__main__":
    main()
