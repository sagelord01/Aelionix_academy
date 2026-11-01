#!/usr/bin/env python3
"""
Aelionix Academy - Phase 1 Model Baseline Runner (Google Colab / HF Transformers)

Usage (Google Colab):
1. Install deps: pip install -q transformers accelerate bitsandbytes huggingface_hub
2. Upload benchmarks/python_tutor_eval.json to /content/benchmarks/ (or repo root)
3. Run: python benchmarks/run_model_baseline.py
4. Outputs: benchmarks/baseline_results.json

Notes:
- Uses 4-bit quantization via bitsandbytes for free T4 GPUs
- Defaults to Qwen/Qwen2.5-Coder-7B-Instruct (good for Python tutoring/debugging)
- Generates tutoring-style responses following Aelionix Academy rules
"""

import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List

# Try to import HF deps - will fail gracefully with instructions if missing
try:
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
    HF_AVAILABLE = True
except ImportError:
    HF_AVAILABLE = False
    torch = None
    AutoModelForCausalLM = None
    AutoTokenizer = None
    BitsAndBytesConfig = None


ROOT = Path(__file__).resolve().parent.parent
BENCH = Path(__file__).parent

SYSTEM_PROMPT = """You are assisting inside the Aelionix Academy learning workspace. 
Prioritize progressive hinting, error diagnosis, and respect the project's concept mapping rules. 
Do not dump full solutions unless explicitly necessary.

Guidelines:
- For debugging: read the traceback/error, identify the root cause, ask guiding questions or give a small hint
- For misconceptions: diagnose the underlying misconception, guide toward discovery rather than spoiling
- For progressive hinting: give the minimal next hint that helps, don't write the complete solution
- For project awareness: explain the exercise-to-concept mapping rules accurately (unmapped exercises pass but award no mastery)
- Be supportive, educational, and clear
- Keep responses focused and actionable"""

DEFAULT_MODEL = os.getenv("BASELINE_MODEL", "Qwen/Qwen2.5-Coder-7B-Instruct")
MAX_NEW_TOKENS = int(os.getenv("MAX_NEW_TOKENS", "512"))
TEMPERATURE = float(os.getenv("TEMPERATURE", "0.2"))
TOP_P = float(os.getenv("TOP_P", "0.9"))
LOAD_IN_4BIT = os.getenv("LOAD_IN_4BIT", "true").lower() == "true"
ADAPTER_PATH = os.getenv("ADAPTER_PATH", "").strip()


def load_benchmark() -> List[Dict[str, Any]]:
    path = BENCH / "python_tutor_eval.json"
    if not path.exists():
        raise FileNotFoundError(f"Benchmark not found: {path}")
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    print(f"Loaded {len(data)} test cases from {path}")
    return data


REQUIRED_FIELDS = [
    "message",
    "hintLevel",
    "identifiedIssues",
    "suggestedNextStep",
    "understandingCheck",
    "requiresExecution",
]


def load_rendered_prompts() -> Dict[str, Any]:
    """Message arrays rendered by the app's own prompt builders.

    This is the only honest way to benchmark the tutor: the model must see the
    same system prompt and context block it sees in production.
    """
    path = BENCH / "eval_prompts.json"
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as f:
        payload = json.load(f)
    return {case["id"]: case for case in payload.get("cases", [])}


def parse_structured(text: str) -> Dict[str, Any]:
    """Mirror lib/ai/response.js: try raw JSON, then the outermost braces."""
    stripped = text.strip()
    fenced = None
    if stripped.startswith("```"):
        fenced = stripped.strip("`")
        if fenced.startswith("json"):
            fenced = fenced[4:]
        stripped = fenced.strip()

    candidates = [stripped]
    first, last = stripped.find("{"), stripped.rfind("}")
    if first >= 0 and last > first:
        candidates.append(stripped[first : last + 1])

    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
        except json.JSONDecodeError:
            continue
        if isinstance(parsed, dict):
            missing = [key for key in REQUIRED_FIELDS if key not in parsed]
            return {"structured": True, "missing_fields": missing, "parsed": parsed}

    return {"structured": False, "missing_fields": REQUIRED_FIELDS, "parsed": None}


def build_user_prompt(case: Dict[str, Any]) -> str:
    cat = case.get("category", "")
    
    if cat == "misconception_diagnosis":
        code = case.get("learner_code", "")
        belief = case.get("learner_error_or_belief", "")
        rubric = case.get("evaluation_rubric", {})
        prompt = f"""Category: Misconception Diagnosis

Learner's code:
```python
{code}
```

Learner's question/belief:
{belief}

Task: Diagnose the misconception. Explain the root cause and guide the learner toward understanding without immediately giving the complete fixed code. Follow the rubric:
- {rubric.get('identifies_root_cause', '')}
- {rubric.get('avoids_direct_spoof', '')}
- Tone: {rubric.get('tone', '')}
"""
        return prompt
    
    elif cat == "progressive_hinting":
        problem = case.get("problem_description", "")
        stuck = case.get("learner_stuck_code", "")
        rubric = case.get("evaluation_rubric", {})
        judge = case.get("judge0", {})
        prompt = f"""Category: Progressive Hinting

Problem:
{problem}

Learner's stuck code:
```python
{stuck}
```

Error/traceback:
{judge.get('stderr', '')}

Task: Give the learner a minimal, progressive hint. Do NOT write the complete solution. Follow the rubric:
- {rubric.get('hint_level_1', '')}
- {rubric.get('prevents_full_solution', '')}
"""
        return prompt
    
    elif cat == "code_correctness":
        code = case.get("learner_code", "")
        instructions = case.get("instructions", "")
        expected = case.get("expected_behavior", "")
        judge = case.get("judge0", {})
        tests = case.get("tests_from_curriculum", [])
        lesson = case.get("lesson_slug")
        exercise = case.get("exercise_slug")
        concepts = case.get("concepts_mapped", [])
        
        tests_str = "\n".join([f"- {t.get('name')}: {t.get('code')}" for t in tests])
        prompt = f"""Category: Code Correctness / Debugging

Lesson: {lesson} | Exercise: {exercise} | Concepts: {concepts}

Instructions:
{instructions}

Expected behavior:
{expected}

Learner's broken code:
```python
{code}
```

Error/traceback:
{judge.get('stderr', '') or judge.get('status', '')}

Failing tests (from curriculum):
{tests_str}

Task: Diagnose the bug and help the learner fix it. Prioritize explanation of the issue and guide them with hints/questions rather than dumping the full corrected code immediately. Help them understand why it fails.
"""
        return prompt
    
    elif cat == "project_awareness":
        code = case.get("learner_code", "")
        question = case.get("learner_question", "")
        instructions = case.get("instructions", "")
        system_ref = case.get("system_reference", {})
        prompt = f"""Category: Project Awareness (Aelionix Academy rules)

Context:
{instructions}

Learner's code:
```python
{code}
```

Learner's question:
{question}

System references:
{json.dumps(system_ref, indent=2)}

Task: Explain clearly why the code passes execution but gives no mastery credit. Describe how the exercise-to-concept mapping works (exercise_concepts table), that unmapped exercises produce a safe outcome with no mastery/review, and reference the warning message. Be accurate to the project's rules.
"""
        return prompt
    
    else:
        # Fallback
        return f"""Category: {cat}

{json.dumps(case, indent=2)}

Task: Respond appropriately following Aelionix Academy tutoring guidelines."""
    

def load_model_and_tokenizer(model_name: str):
    if not HF_AVAILABLE:
        raise ImportError(
            "Missing dependencies. Install with:\n"
            "pip install -q transformers accelerate bitsandbytes huggingface_hub"
        )
    
    print(f"Loading model: {model_name}")
    print(f"4-bit quantization: {LOAD_IN_4BIT}")
    
    tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
    
    if LOAD_IN_4BIT and BitsAndBytesConfig is not None:
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16 if torch.cuda.is_available() and torch.cuda.is_bf16_supported() else torch.float16,
        )
        model = AutoModelForCausalLM.from_pretrained(
            model_name,
            quantization_config=bnb_config,
            device_map="auto",
            trust_remote_code=True,
        )
    else:
        model = AutoModelForCausalLM.from_pretrained(
            model_name,
            device_map="auto",
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            trust_remote_code=True,
        )
    
    print(f"Model loaded on device: {model.device}")

    if ADAPTER_PATH:
        try:
            from peft import PeftModel
        except ImportError as exc:
            raise ImportError(
                "ADAPTER_PATH was set but peft is not installed. Run: pip install -q peft"
            ) from exc
        print(f"Attaching LoRA adapter: {ADAPTER_PATH}")
        model = PeftModel.from_pretrained(model, ADAPTER_PATH)
        model.eval()

    return model, tokenizer


def generate_response(
    model, tokenizer, case: Dict[str, Any], messages: List[Dict[str, str]]
) -> Dict[str, Any]:
    user_prompt = next(
        (m["content"] for m in reversed(messages) if m["role"] == "user"), ""
    )

    if hasattr(tokenizer, "apply_chat_template"):
        text = tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
        )
    else:
        parts = []
        for message in messages:
            parts.append(f"{message['role'].capitalize()}: {message['content']}")
        text = "\n\n".join(parts) + "\n\nAssistant:"

    inputs = tokenizer(text, return_tensors="pt").to(model.device)

    start = time.time()
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=MAX_NEW_TOKENS,
            temperature=TEMPERATURE,
            top_p=TOP_P,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id,
        )
    elapsed = time.time() - start

    response = tokenizer.decode(outputs[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)
    structured = parse_structured(response)

    return {
        "case_id": case.get("id"),
        "category": case.get("category"),
        "contamination": case.get("contamination", "unknown"),
        "lesson_slug": case.get("lesson_slug"),
        "exercise_slug": case.get("exercise_slug"),
        "concepts_mapped": case.get("concepts_mapped"),
        "is_mapped": case.get("is_mapped"),
        "prompt": user_prompt,
        "response": response.strip(),
        "structured": structured["structured"],
        "missing_fields": structured["missing_fields"],
        "generation_time_seconds": round(elapsed, 2),
        "model": DEFAULT_MODEL,
    }


def main():
    print("=" * 60)
    print("Aelionix Academy - Phase 1 Baseline Evaluation")
    print("=" * 60)
    
    if not HF_AVAILABLE:
        print("\nERROR: transformers/torch/bitsandbytes not installed")
        print("Run in Google Colab or install locally:")
        print("pip install -q transformers accelerate bitsandbytes huggingface_hub torch")
        sys.exit(1)
    
    if not torch.cuda.is_available():
        print("\nWARNING: No CUDA GPU detected. This will be slow on CPU.")
        print("Recommend running on Google Colab with T4 GPU.")
    else:
        print(f"\nGPU: {torch.cuda.get_device_name(0)}")
        print(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
    
    try:
        cases = load_benchmark()
        rendered = load_rendered_prompts()
        allow_legacy = os.getenv("ALLOW_LEGACY_PROMPTS", "").lower() == "true"

        missing = [case.get("id") for case in cases if case.get("id") not in rendered]
        if missing:
            message = (
                "benchmarks/eval_prompts.json is missing or incomplete.\n"
                f"Cases without a rendered prompt: {', '.join(missing)}\n"
                "Without it this run uses a prompt shape the app never sends, so\n"
                "the results are NOT comparable to an adapter evaluation.\n"
                "Copy benchmarks/eval_prompts.json from the repo (it is generated by\n"
                "`npm run bench:eval-prompts` and needs no app code at eval time).\n"
                "Override with ALLOW_LEGACY_PROMPTS=true only for archaeology.\n"
            )
            if not allow_legacy:
                print("\nERROR: " + message, file=sys.stderr)
                sys.exit(1)
            print("\nWARNING: " + message)

        if rendered:
            print(f"Using app-rendered prompts for {len(rendered)} case(s) from benchmarks/eval_prompts.json")

        model, tokenizer = load_model_and_tokenizer(DEFAULT_MODEL)
        
        results = []
        for i, case in enumerate(cases):
            print(f"\n[{i+1}/{len(cases)}] Running {case.get('id')} ({case.get('category')})...")
            try:
                if case.get("id") in rendered:
                    messages = rendered[case["id"]]["messages"]
                    case = {**case, "contamination": rendered[case["id"]].get("contamination", "unknown")}
                else:
                    messages = [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": build_user_prompt(case)},
                    ]
                res = generate_response(model, tokenizer, case, messages)
                results.append(res)
                flag = "structured" if res["structured"] else "fallback_text"
                print(f"  ✓ Generated ({res['generation_time_seconds']}s, {flag})")
                print(f"  Preview: {res['response'][:100]}...")
            except Exception as e:
                print(f"  ✗ Error: {e}")
                results.append({
                    "case_id": case.get("id"),
                    "category": case.get("category"),
                    "error": str(e),
                })
        
        out_path = BENCH / os.getenv("RESULTS_FILE", "baseline_results.json")
        with out_path.open("w", encoding="utf-8") as f:
            json.dump({
                "model": DEFAULT_MODEL,
                "adapter": os.getenv("ADAPTER_PATH"),
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "prompt_source": "benchmarks/eval_prompts.json" if rendered else "legacy_inline",
                "system_prompt": SYSTEM_PROMPT if not rendered else None,
                "config": {
                    "load_in_4bit": LOAD_IN_4BIT,
                    "max_new_tokens": MAX_NEW_TOKENS,
                    "temperature": TEMPERATURE,
                    "top_p": TOP_P,
                },
                "results": results,
            }, f, indent=2, ensure_ascii=False)
        
        answered = [r for r in results if "response" in r]
        structured = [r for r in answered if r.get("structured")]
        print("\n" + "=" * 60)
        print(f"✓ Baseline complete! Results saved to: {out_path}")
        print(f"  Total cases: {len(results)}")
        print(f"  Successful: {len(answered)}")
        print(f"  Structured JSON: {len(structured)}/{len(answered)}")
        held_out = [r for r in answered if r.get("contamination") == "held_out"]
        if held_out:
            held_structured = sum(1 for r in held_out if r.get("structured"))
            print(f"  Held-out structured: {held_structured}/{len(held_out)}")
        print("=" * 60)
        
    except Exception as e:
        print(f"\nERROR: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
