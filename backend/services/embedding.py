import os
import math
import hashlib
import time

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()

EMBEDDING_MODEL = "gemini-embedding-2"
EMBEDDING_DIMENSION = 768

client = None

if GEMINI_API_KEY and GEMINI_API_KEY != "YOUR_GEMINI_API_KEY_HERE":
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        print(f"[Embedding] Client đã sẵn sàng: {EMBEDDING_MODEL}")
    except Exception as e:
        print(f"[Embedding] Không thể khởi tạo Gemini client: {e}")
        client = None


import asyncio

def get_embedding(text: str) -> list[float]:
    """
    Tạo embedding cho câu hỏi tìm kiếm.
    Gemini Embedding 2 sử dụng task prefix cho retrieval query.
    """

    text = str(text or "").strip()

    if not text:
        return [0.0] * EMBEDDING_DIMENSION

    if client is None:
        return _create_fallback_embedding(text)

    try:
        query_text = f"task: search result | query: {text}"

        result = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=query_text,
            config=types.EmbedContentConfig(
                output_dimensionality=EMBEDDING_DIMENSION
            )
        )

        if result.embeddings:
            return result.embeddings[0].values

        print("[Embedding] Gemini không trả về vector.")
        return _create_fallback_embedding(text)

    except Exception as e:
        print(f"[Embedding Warning] {e}")
        return _create_fallback_embedding(text)

async def get_embedding_async(text: str) -> list[float]:
    """
    Chạy get_embedding() trong một thread pool riêng,
    không chặn event loop chính.
    """
    return await asyncio.to_thread(get_embedding, text)

def get_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """
    Tạo embedding riêng cho từng tài liệu.

    Gemini Embedding 2 sẽ tạo embedding tổng hợp nếu truyền
    trực tiếp list[str]. Vì vậy mỗi tài liệu được bọc trong
    một Content riêng để nhận một vector riêng.
    """

    if not texts:
        return []

    clean_texts = [
        str(text or "").strip()
        for text in texts
    ]

    if client is None:
        return [
            _create_fallback_embedding(text)
            for text in clean_texts
        ]

    try:
        BATCH_SIZE = 100  # Giới hạn của Gemini Embedding API
        all_embeddings = []

        for batch_start in range(0, len(clean_texts), BATCH_SIZE):
            batch = clean_texts[batch_start: batch_start + BATCH_SIZE]
            contents = []

            for text in batch:
                # Lấy tiêu đề từ dòng đầu tiên nếu có
                title = "none"

                if text.startswith("Tiêu đề:"):
                    first_line = text.split("\n", 1)[0]
                    title = first_line.replace(
                        "Tiêu đề:", ""
                    ).strip()

                document_text = (
                    f"title: {title} | text: {text}"
                )

                contents.append(
                    types.Content(
                        parts=[
                            types.Part.from_text(
                                text=document_text
                            )
                        ]
                    )
                )

            # Gọi API với retry khi bị 429 (quota)
            MAX_EMBED_RETRIES = 5
            for embed_attempt in range(1, MAX_EMBED_RETRIES + 1):
                try:
                    result = client.models.embed_content(
                        model=EMBEDDING_MODEL,
                        contents=contents,
                        config=types.EmbedContentConfig(
                            output_dimensionality=EMBEDDING_DIMENSION
                        )
                    )
                    break  # Thành công, thoát retry loop
                except Exception as embed_err:
                    err_str = str(embed_err)
                    if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                        # Tìm retryDelay từ message
                        import re as _re
                        delay_match = _re.search(r"retryDelay.*?(\d+)s", err_str)
                        wait_secs = int(delay_match.group(1)) + 5 if delay_match else 65
                        print(
                            f"[Embedding] Batch {batch_start // BATCH_SIZE + 1} bị rate limit. "
                            f"Chờ {wait_secs}s rồi thử lại (lần {embed_attempt}/{MAX_EMBED_RETRIES})..."
                        )
                        time.sleep(wait_secs)
                        if embed_attempt == MAX_EMBED_RETRIES:
                            raise
                    else:
                        raise

            batch_embeddings = [
                embedding.values
                for embedding in result.embeddings
            ]

            if len(batch_embeddings) != len(batch):
                raise ValueError(
                    f"Gemini trả về {len(batch_embeddings)} vector "
                    f"cho {len(batch)} tài liệu (batch {batch_start // BATCH_SIZE + 1})."
                )

            all_embeddings.extend(batch_embeddings)
            print(
                f"[Embedding] Batch {batch_start // BATCH_SIZE + 1}: "
                f"Đã embed {len(all_embeddings)}/{len(clean_texts)} documents."
            )

            # Chờ để tránh vượt rate limit của Gemini Embedding API (100 req/phút free tier)
            if batch_start + BATCH_SIZE < len(clean_texts):
                print("[Embedding] Chờ 65 giây để tránh vượt quota rate limit...")
                time.sleep(65)

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