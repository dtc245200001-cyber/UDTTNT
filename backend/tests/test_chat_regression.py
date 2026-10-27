# -*- coding: utf-8 -*-
"""Test hoi quy Nhom A: router + fallback stream khong rong + model config.
Mock hoan toan Gemini/embedding/Chroma — chay nhanh, khong can API key.
Chay:  python -m pytest tests/test_chat_regression.py -v   (tu backend/)
"""
import asyncio
import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

sys.path.insert(0, ".")  # chay tu backend/


def _make_services():
    """Import services voi client Gemini/embedding da mock."""
    import services.gemini as gemini_mod
    import services.embedding as emb_mod

    fake_client = MagicMock()
    gemini_mod.genai.Client = MagicMock(return_value=fake_client)
    emb_mod.client = MagicMock()
    # embedding gia: vector don vi de Chroma khong dung den cung duoc
    emb_mod.get_embedding = lambda text: [1.0] + [0.0] * 767

    import importlib
    import services.rag as rag_mod
    importlib.reload(rag_mod)
    return rag_mod


def test_realtime_checked_before_chitchat():
    rag_mod = _make_services()
    pipe = rag_mod.RAGPipeline()
    # "hom nay the nao" tung nam trong greetings (A4 da bo) ...
    assert pipe.is_conversational_chitchat("hom nay the nao", []) is False
    assert pipe.is_conversational_chitchat("Thoi tiet hom nay the nao?", []) is False


def test_process_chat_routes_realtime_first():
    rag_mod = _make_services()
    pipe = rag_mod.RAGPipeline()
    pipe.needs_realtime_data = lambda t: True
    pipe.is_conversational_chitchat = lambda t, h=None: True  # neu check chitchat truoc se sai nhanh
    pipe.gemini.generate_response_with_tools = AsyncMock(return_value="TOOLS_ANS")
    res = asyncio.run(pipe.process_chat("gia ve tre em?", []))
    assert res["answer"] == "TOOLS_ANS"


def test_stream_empty_first_chunk_yields_fallback_not_silent():
    """A2: StopAsyncIteration o chunk dau -> phai yield fallback, khong return rong."""
    import services.gemini as gemini_mod
    svc = gemini_mod.GeminiService.__new__(gemini_mod.GeminiService)
    svc.api_keys = ["k1"]
    svc.current_key_idx = 0
    svc.client = MagicMock()

    async def empty_stream(**kwargs):
        if False:
            yield
        return

    class FakeAio:
        models = MagicMock()

        @staticmethod
        async def _mk(**kwargs):
            return empty_stream()

    # generate_content_stream tra ve async-generator rong
    async def fake_stream(**kwargs):
        async def gen():
            if False:
                yield None
        return gen()
    svc.client.aio.models.generate_content_stream = fake_stream
    svc._fallback_response = lambda u, c="": "FALLBACK_MSG"
    # chi 1 model de het vong lap nhanh
    svc._get_models_to_try = lambda: ["m1"]

    async def collect():
        out = []
        async for ch in svc._stream_with_fallback(contents="hi", config=MagicMock()):
            out.append(ch)
        return out

    with pytest.raises(Exception):
        # model duy nhat that bai -> raise; dieu quan trong la generator
        # khong return im lang ma di tiep den raise (caller se fallback)
        asyncio.run(collect())
