#!/usr/bin/env python3
"""
Aelionix Academy - Colab Live Inference Server with Cloudflare Tunnel.

Spins up a lightweight OpenAI-compatible API on top of your fine-tuned
Qwen 2.5 Coder 7B adapter, and exposes a public HTTPS endpoint via
Cloudflare Tunnel for zero-cost local developer testing.

Usage (in Google Colab after fine-tuning):
    python scripts/serve_colab_tunnel.py
"""

import os
import re
import subprocess
import sys
import threading
import time
from pathlib import Path

import torch
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Any, Optional
from pydantic import BaseModel, ConfigDict
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

MODEL_NAME = os.getenv("MODEL_NAME", "Qwen/Qwen2.5-Coder-7B-Instruct")
ADAPTER_PATH = os.getenv("ADAPTER_OUTPUT", "data/models/aelionix-tutor-qlora")
PORT = int(os.getenv("PORT", "8000"))

app = FastAPI(title="Aelionix Tutor OpenAI-Compatible API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = None
tokenizer = None


class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="allow")
    role: str
    content: str


class ChatCompletionRequest(BaseModel):
    model_config = ConfigDict(extra="allow")
    model: str = "aelionix-tutor"
    messages: list[ChatMessage]
    temperature: float = 0.45
    max_tokens: int = 1200
    response_format: Optional[Any] = None


def load_model_and_tokenizer():
    global model, tokenizer
    print(f"\n[1/3] Loading base model: {MODEL_NAME} with 4-bit quantization...")
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
    )
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    base_model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        quantization_config=bnb_config,
        device_map="auto",
        torch_dtype=torch.float16,
        trust_remote_code=True,
    )

    adapter_candidate = Path(ADAPTER_PATH)
    if not adapter_candidate.exists():
        # check parent or current
        for candidate in [
            Path("/content") / ADAPTER_PATH,
            Path("aelionix-tutor-qlora"),
            Path("/content/aelionix-tutor-qlora"),
        ]:
            if candidate.exists():
                adapter_candidate = candidate
                break

    if adapter_candidate.exists():
        print(f"[2/3] Loading fine-tuned LoRA adapter from: {adapter_candidate}...")
        model = PeftModel.from_pretrained(base_model, str(adapter_candidate))
    else:
        print(f"[!] Warning: Adapter not found at {ADAPTER_PATH}. Serving base model.")
        model = base_model

    model.eval()
    if hasattr(model, "config"):
        model.config.use_cache = True
    print("[3/3] Model ready for inference!\n")


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_NAME}


@app.post("/v1/chat/completions")
@app.post("/chat/completions")
def chat_completions(req: ChatCompletionRequest):
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not initialized")

    formatted_messages = [{"role": m.role, "content": m.content} for m in req.messages]
    
    prompt = tokenizer.apply_chat_template(
        formatted_messages,
        tokenize=False,
        add_generation_prompt=True,
    )

    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

    with torch.no_grad():
        output_ids = model.generate(
            **inputs,
            max_new_tokens=min(req.max_tokens, 450),
            temperature=req.temperature,
            do_sample=req.temperature > 0.05,
            pad_token_id=tokenizer.pad_token_id,
            eos_token_id=tokenizer.eos_token_id,
            use_cache=True,
        )

    # Decode only the generated response tokens
    generated_ids = output_ids[0][inputs.input_ids.shape[1]:]
    response_text = tokenizer.decode(generated_ids, skip_special_tokens=True).strip()

    return {
        "id": f"chatcmpl-aelionix-{int(time.time())}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": req.model,
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": response_text},
                "finish_reason": "stop",
            }
        ],
        "usage": {
            "prompt_tokens": inputs.input_ids.shape[1],
            "completion_tokens": len(generated_ids),
            "total_tokens": inputs.input_ids.shape[1] + len(generated_ids),
        },
    }


def start_cloudflare_tunnel(port: int):
    # install cloudflared if missing
    if subprocess.call(["which", "cloudflared"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) != 0:
        print("Installing cloudflared binary...")
        os.system("wget -q -nc https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb")
        os.system("dpkg -i cloudflared-linux-amd64.deb > /dev/null 2>&1")

    log_path = Path("/content/tunnel.log") if Path("/content").exists() else Path("tunnel.log")
    if log_path.exists():
        log_path.unlink()

    print(f"\nStarting Cloudflare Tunnel to expose port {port}...")
    os.system(f"nohup cloudflared tunnel --url http://127.0.0.1:{port} --logfile {log_path} > /dev/null 2>&1 &")

    tunnel_url = None
    for _ in range(25):
        time.sleep(1)
        if log_path.exists():
            content = log_path.read_text(encoding="utf-8", errors="ignore")
            match = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", content)
            if match:
                tunnel_url = match.group(0)
                break

    if tunnel_url:
        print("\n" + "=" * 70)
        print("🎉 AELIONIX TUTOR LIVE INFERENCE SERVER IS READY!")
        print("=" * 70)
        print(f"Public API Base URL:  {tunnel_url}/v1")
        print("\nTo test inside your local app, put this in your .env.local:")
        print("---------------------------------------------------------")
        print("AI_PROVIDER=openai-compatible")
        print(f"AI_BASE_URL={tunnel_url}/v1")
        print("AI_MODEL=aelionix-tutor")
        print("AI_API_KEY=colab-tunnel")
        print("AI_SUPPORTS_JSON_MODE=true")
        print("=" * 70 + "\n")
    else:
        print("Warning: Could not extract Cloudflare Tunnel URL. Check process output.")
        if log_path.exists():
            print(log_path.read_text(encoding="utf-8", errors="ignore"))


def main():
    load_model_and_tokenizer()

    # Launch tunnel in background thread
    tunnel_thread = threading.Thread(target=start_cloudflare_tunnel, args=(PORT,), daemon=True)
    tunnel_thread.start()

    # Run FastAPI server
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="warning")


if __name__ == "__main__":
    main()
