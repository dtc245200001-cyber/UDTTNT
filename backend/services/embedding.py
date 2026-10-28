import os
import sys
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass
import math
import hashlib
import time

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

API_KEYS = [
    k.strip()
    for k in (os.getenv("GEMINI_API_KEYS", "") or os.getenv("GEMINI_API_KEY", "")).split(",")
    if k.strip() and k.strip() != "YOUR_GEMINI_API_KEY_HERE"
]

EMBEDDING_MODEL = "gemini-embedding-2"
EMBEDDING_DIMENSION = 768

clients = []
current_key_idx = 0

for k in API_KEYS:
    try:
        clients.append(genai.Client(api_key=k))
    except Exception as e:
        print(f"[Embedding] Lỗi tạo client cho key: {e}")

if clients:
    print(f"[Embedding] Đã sẵn sàng {len(clients)} Gemini API keys cho: {EMBEDDING_MODEL}")
else:
    print("[Embedding] Không có API key hợp lệ cho embedding.")

def _get_client():
    global current_key_idx
    if not clients:
        return None
    return clients[current_key_idx]

def _rotate_client():
    global current_key_idx
    if len(clients) > 1:
        current_key_idx = (current_key_idx + 1) % len(clients)
        print(f"[Embedding] Chuyển sang Gemini API Key #{current_key_idx + 1}/{len(clients)}")


import asyncio

TASK_RETRIEVAL_QUERY = "RETRIEVAL_QUERY"
TASK_RETRIEVAL_DOCUMENT = "RETRIEVAL_DOCUMENT"


def _embed_one(text: str, task_type: str, title: str | None = None) -> list[float]:
    """Embed 1 text voi task_type cho truoc. Ho tro tu dong xoay key khi gap 429."""
    text = str(text or "").strip()
    if not text:
        return [0.0] * EMBEDDING_DIMENSION
    if not clients:
        return _create_fallback_embedding(text)

    cfg = {"output_dimensionality": EMBEDDING_DIMENSION, "task_type": task_type}
    if title and task_type == TASK_RETRIEVAL_DOCUMENT:
        cfg["title"] = title[:500]

    max_tries = max(1, len(clients))
    for attempt in range(max_tries):
        cli = _get_client()
        try:
            result = cli.models.embed_content(
                model=EMBEDDING_MODEL,
                contents=text,
                config=types.EmbedContentConfig(**cfg),
            )
            if result.embeddings:
                return result.embeddings[0].values
            print("[Embedding] Gemini không trả về vector.")
            return _create_fallback_embedding(text)
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                print(f"[Embedding Warning] Key #{current_key_idx + 1} gặp 429 Quota.")
                _rotate_client()
                continue
            print(f"[Embedding Warning] {e}")
            return _create_fallback_embedding(text)

    return _create_fallback_embedding(text)


def embed_query(text: str) -> list[float]:
    """Embed cau hoi (RETRIEVAL_QUERY). Dung cho moi truy van RAG."""
    return _embed_one(text, TASK_RETRIEVAL_QUERY)


def embed_document(text: str, title: str | None = None) -> list[float]:
    """Embed tai lieu (RETRIEVAL_DOCUMENT + title). Dung khi index."""
    return _embed_one(text, TASK_RETRIEVAL_DOCUMENT, title)


def get_embedding(text: str) -> list[float]:
    """
    Tạo embedding cho câu hỏi tìm kiếm.
    GIỮ LẠI để tương thích ngược — ủy thác cho embed_query().
    """

    return embed_query(text)

async def get_embedding_async(text: str) -> list[float]:
    """
    Chạy get_embedding() trong một thread pool riêng,
    không chặn event loop chính.
    """
    return await asyncio.to_thread(get_embedding, text)

def get_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """
    Tạo embedding riêng cho từng tài liệu (dùng khi index hàng loạt).

    Gemini Embedding 2 sẽ tạo embedding tổng hợp nếu truyền
    trực tiếp list[str]. Vì vậy mỗi tài liệu được bọc trong
    một Content riêng để nhận một vector riêng, với
    task_type=RETRIEVAL_DOCUMENT + title (B1).
    """

    if not texts:
        return []

    clean_texts = [
        str(text or "").strip()
        for text in texts
    ]

    if not clients:
        return [
            _create_fallback_embedding(text)
            for text in clean_texts
        ]

    try:
        # B1: config chi nhan 1 object cho ca batch nen title rieng tung doc
        # khong kha thi — goi _embed_one cho tung doc (co title + retry rieng).
        # Voi ~600 docs va sleep chong quota hien co, tong ~7-10 phut/1 lan index.
        all_embeddings = []

        for idx, text in enumerate(clean_texts):
            title = "none"
            if text.startswith("Tiêu đề:"):
                title = text.split("\n", 1)[0].replace("Tiêu đề:", "").strip()

            MAX_EMBED_RETRIES = 5
            for embed_attempt in range(1, MAX_EMBED_RETRIES + 1):
                try:
                    all_embeddings.append(_embed_one(text, TASK_RETRIEVAL_DOCUMENT, title))
                    break
                except Exception as embed_err:
                    err_str = str(embed_err)
                    if ("429" in err_str or "RESOURCE_EXHAUSTED" in err_str
                            or "quota" in err_str.lower()):
                        import re as _re
                        delay_match = _re.search(r"retryDelay.*?(\d+)s", err_str)
                        wait_secs = int(delay_match.group(1)) + 5 if delay_match else 65
                        print(
                            f"[Embedding] Doc {idx + 1}/{len(clean_texts)} bi rate limit. "
                            f"Cho {wait_secs}s roi thu lai (lan {embed_attempt}/{MAX_EMBED_RETRIES})..."
                        )
                        time.sleep(wait_secs)
                        if embed_attempt == MAX_EMBED_RETRIES:
                            raise
                    else:
                        raise

            if (idx + 1) % 20 == 0 or (idx + 1) == len(clean_texts):
                print(f"[Embedding] Da embed {idx + 1}/{len(clean_texts)} documents.")

        print(
            f"[Embedding] Đã tạo thành công "
            f"{len(all_embeddings)} vector Gemini."
        )

        return all_embeddings

    except Exception as e:
        print(
            f"[Embedding Batch Error] {e}"
        )

        # Không âm thầm dùng fallback cho toàn bộ dữ liệu.
        # Báo lỗi rõ ràng để tránh nạp vector kém chất lượng.
        raise


def _create_fallback_embedding(
    text: str,
    dim: int = EMBEDDING_DIMENSION
) -> list[float]:
    """
    Fallback local chỉ dùng khi không có API key
    hoặc khi tạo embedding cho truy vấn bị lỗi.
    """

    words = text.lower().split()

    vec = [0.0] * dim

    if not words:
        return vec

    for word in words:
        index = (
            int(
                hashlib.md5(
                    word.encode("utf-8")
                ).hexdigest(),
                16
            ) % dim
        )

        vec[index] += 1.0

    norm = math.sqrt(
        sum(value * value for value in vec)
    )

    if norm > 0:
        vec = [
            value / norm
            for value in vec
        ]

    return vec