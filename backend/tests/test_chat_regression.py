# -*- coding: utf-8 -*-
"""Test hoi quy Nhom A/B/C: router + fallback + circuit breaker + cache +
knowledge routing + status event + model config.
Mock hoan toan — chay nhanh, khong can API key.
Chay tu repo root:  python -m pytest backend/tests/test_chat_regression.py -v
"""
import asyncio
import sys
import time
from unittest.mock import AsyncMock, MagicMock

import pytest

sys.path.insert(0, "backend")


def _fresh_rag():
    import services.gemini as gemini_mod
    import services.embedding as emb_mod

    fake_client = MagicMock()
    gemini_mod.genai.Client = MagicMock(return_value=fake_client)
    emb_mod.client = MagicMock()
    emb_mod.get_embedding = lambda text: [1.0] + [0.0] * 767

    import importlib
    import services.rag as rag_mod
    importlib.reload(rag_mod)
    return rag_mod


# ---------- Nhom A ----------

def test_realtime_checked_before_chitchat():
    rag_mod = _fresh_rag()
    pipe = rag_mod.RAGPipeline()
    assert pipe.is_conversational_chitchat("hom nay the nao", []) is False
    assert pipe.is_conversational_chitchat("Thoi tiet hom nay the nao?", []) is False


def test_process_chat_routes_realtime_first():
    rag_mod = _fresh_rag()
    pipe = rag_mod.RAGPipeline()
    pipe.needs_realtime_data = lambda t: True
    pipe.is_conversational_chitchat = lambda t, h=None: True
    pipe.gemini.generate_response_with_tools = AsyncMock(return_value="TOOLS_ANS")
    res = asyncio.run(pipe.process_chat("gia ve tre em?", []))
    assert res["answer"] == "TOOLS_ANS"


def test_stream_empty_first_chunk_raises_not_silent():
    """A2: StopAsyncIteration o chunk dau -> khong return im lang."""
    import services.gemini as gemini_mod
    svc = gemini_mod.GeminiService.__new__(gemini_mod.GeminiService)
    svc.api_keys = ["k1"]
    svc.current_key_idx = 0
    svc.client = MagicMock()
    svc._circuit_failures = {}

    async def fake_stream(**kwargs):
        async def gen():
            if False:
                yield None
        return gen()
    svc.client.aio.models.generate_content_stream = fake_stream
    svc._fallback_response = lambda u, c="": "FALLBACK_MSG"
    svc._get_models_to_try = lambda: ["m1"]

    async def collect():
        out = []
        async for ch in svc._stream_with_fallback(contents="hi", config=MagicMock()):
            out.append(ch)
        return out

    with pytest.raises(Exception):
        asyncio.run(collect())


# ---------- Nhom B ----------

def test_knowledge_routing_skips_rag():
    """B4: cau kien thuc chung ro rang -> skipped=True, khong goi embed/Chroma."""
    rag_mod = _fresh_rag()
    assert rag_mod.is_general_knowledge_question("2+2 bang may?") is True
    assert rag_mod.is_general_knowledge_question("Thu do cua Phap la gi?") is True
    assert rag_mod.is_general_knowledge_question("Giai thich thuyet tuong doi") is True
    assert rag_mod.is_general_knowledge_question("Trong dong Dong Son o dau?") is False
    assert rag_mod.is_general_knowledge_question("Gia ve tre em bao nhieu?") is False

    pipe = rag_mod.RAGPipeline()
    pipe.vector_db.query_similar = MagicMock(side_effect=AssertionError("khong duoc goi Chroma"))
    ctx, sources, aids, min_dist, skipped = asyncio.run(
        pipe._retrieve_context("2+2 bang may?", []))
    assert skipped is True and ctx == "" and sources == []


def test_retrieve_context_uses_settings_threshold():
    """RAG doc nguong tu settings, min_dist duoc tinh that."""
    rag_mod = _fresh_rag()
    pipe = rag_mod.RAGPipeline()
    pipe.vector_db.query_similar = lambda *a, **k: [
        {"id": "d1", "content": "x" * 50, "metadata": {"title": "T", "source_table": "hien_vat",
         "source_id": "A1"}, "distance": 0.5},
        {"id": "d2", "content": "y" * 50, "metadata": {"title": "T2"}, "distance": 0.95},
    ]
    ctx, sources, aids, min_dist, skipped = asyncio.run(
        pipe._retrieve_context("Cho biet ve hien vat X trong bao tang?", []))
    assert skipped is False
    assert min_dist == 0.5
    assert len(sources) == 1 and aids == ["A1"]


def test_embed_cache_hit_avoids_recompute():
    """B5: goi 2 lan cung cau chi tinh embedding 1 lan."""
    rag_mod = _fresh_rag()
    calls = {"n": 0}

    async def fake_embed(text):
        calls["n"] += 1
        return [0.5] * 768

    rag_mod.cached_get_embedding.__globals__["get_embedding_async"] = fake_embed
    rag_mod._embed_cache.clear()
    asyncio.run(rag_mod.cached_get_embedding("2+2 bang may?"))
    asyncio.run(rag_mod.cached_get_embedding("  2+2 bang may?  "))
    assert calls["n"] == 1


def test_circuit_breaker_skips_unhealthy_model():
    """B1: model loi N lan lien tiep -> bi bo qua ngay (circuit OPEN)."""
    import services.gemini as gemini_mod
    svc = gemini_mod.GeminiService.__new__(gemini_mod.GeminiService)
    svc.api_keys = ["k1"]
    svc.current_key_idx = 0
    svc.client = MagicMock()
    svc._circuit_failures = {}
    svc._get_models_to_try = lambda: ["bad-model"]

    async def boom(**kwargs):
        raise RuntimeError("503 UNAVAILABLE overloaded")
    svc.client.aio.models.generate_content = boom

    async def run():
        try:
            await svc._execute_with_fallback(contents="hi")
        except Exception:
            pass

    asyncio.run(run())
    asyncio.run(run())
    asyncio.run(run())
    assert svc._circuit_open("bad-model") is True
    t0 = time.perf_counter()
    with pytest.raises(Exception):
        asyncio.run(svc._execute_with_fallback(contents="hi"))
    assert time.perf_counter() - t0 < 2.0


def test_execute_budget_caps_total_time():
    """B2: tong thoi gian thu moi (model,key) bi tran boi LLM_TOTAL_BUDGET_S."""
    import services.gemini as gemini_mod
    from core.config import settings
    svc = gemini_mod.GeminiService.__new__(gemini_mod.GeminiService)
    svc.api_keys = ["k1"]
    svc.current_key_idx = 0
    svc.client = MagicMock()
    svc._circuit_failures = {}
    svc._get_models_to_try = lambda: ["m1"]

    async def slow(**kwargs):
        await asyncio.sleep(60)
    svc.client.aio.models.generate_content = slow
    old_budget = settings.LLM_TOTAL_BUDGET_S
    settings.LLM_TOTAL_BUDGET_S = 3.0
    try:
        t0 = time.perf_counter()
        with pytest.raises(Exception):
            asyncio.run(svc._execute_with_fallback(contents="hi"))
        assert time.perf_counter() - t0 < 10.0
    finally:
        settings.LLM_TOTAL_BUDGET_S = old_budget


# ---------- Nhom C ----------

def test_generate_response_minimal_retry_on_empty():
    """C1/C2: response rong (khong exception) -> thu minimal retry, dung cau do."""
    import services.gemini as gemini_mod
    svc = gemini_mod.GeminiService.__new__(gemini_mod.GeminiService)
    svc.api_keys = ["k1"]
    svc.current_key_idx = 0
    svc.client = MagicMock()
    svc._circuit_failures = {}

    class EmptyResp:
        text = ""
    svc._execute_with_fallback = AsyncMock(return_value=EmptyResp())
    svc._minimal_retry_answer = AsyncMock(return_value="Cau tra loi rut gon")
    svc._fallback_response = lambda u, c="": "FALLBACK_TECH"
    out = asyncio.run(svc.generate_response("2+2 bang may?", "", [], False))
    assert out == "Cau tra loi rut gon"


def test_generate_response_client_none_is_tech_error():
    """C2: client None -> fallback ky thuat, co log."""
    import services.gemini as gemini_mod
    svc = gemini_mod.GeminiService.__new__(gemini_mod.GeminiService)
    svc.client = None
    svc._fallback_response = lambda u, c="": "TECH_ERR"
    out = asyncio.run(svc.generate_response("hello", "", [], True))
    assert out == "TECH_ERR"


def test_stream_status_event_when_slow_first_token():
    """C3: first token cham hon STREAM_STATUS_DELAY_S -> co event status truoc."""
    import sys as _sys
    from unittest.mock import MagicMock as _MM
    _sys.modules.setdefault("services.live_data_tools", _MM())
    import services.gemini as gemini_mod
    from core.config import settings
    svc = gemini_mod.GeminiService.__new__(gemini_mod.GeminiService)
    svc.api_keys = ["k1"]
    svc.current_key_idx = 0
    svc.client = MagicMock()
    svc._circuit_failures = {}
    old_delay = settings.STREAM_STATUS_DELAY_S
    settings.STREAM_STATUS_DELAY_S = 0.2
    try:
        async def fake_stream(**kwargs):
            class Chunk:
                text = "hello"
            async def gen():
                await asyncio.sleep(0.6)
                yield Chunk()
            return gen()
        svc.client.aio.models.generate_content_stream = fake_stream
        svc._fallback_response = lambda u, c="": "FB"
        svc._minimal_retry_answer = AsyncMock(return_value="")

        async def collect():
            out = []
            async for item in svc.generate_response_stream("hi", "", [], False, False):
                out.append(item)
            return out

        out = asyncio.run(collect())
        assert out and isinstance(out[0], dict) and out[0].get("status") == "processing"
        assert "hello" in out
    finally:
        settings.STREAM_STATUS_DELAY_S = old_delay


def test_single_config_source_for_models():
    """A1: model chain doc tu settings, khong con default cung 3.8-flash."""
    import services.gemini as gemini_mod
    from core.config import settings
    assert gemini_mod.MODEL_NAME == settings.GEMINI_MODEL_NAME
    assert settings.GEMINI_MODEL_NAME == "gemini-3.5-flash"
    assert "gemini-3.8-flash" not in settings.GEMINI_FALLBACK_MODELS
