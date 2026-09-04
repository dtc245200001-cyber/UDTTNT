import os
import math
import hashlib

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
        contents = []

        for text in clean_texts:
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

        result = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=contents,
            config=types.EmbedContentConfig(
                output_dimensionality=EMBEDDING_DIMENSION
            )
        )

        embeddings = [
            embedding.values
            for embedding in result.embeddings
        ]

        if len(embeddings) != len(clean_texts):
            raise ValueError(
                f"Gemini trả về {len(embeddings)} vector "
                f"cho {len(clean_texts)} tài liệu."
            )

        print(
            f"[Embedding] Đã tạo thành công "
            f"{len(embeddings)} vector Gemini."
        )

        return embeddings

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