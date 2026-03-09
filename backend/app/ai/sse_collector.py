"""SSE 收集器 — 流式输出的同时收集完整响应文本，用于持久化。"""

import json
import logging
from collections.abc import AsyncIterator, Awaitable, Callable

logger = logging.getLogger(__name__)


class SSECollector:
    """Wraps an SSE async generator, collecting content while streaming.

    Usage::

        collector = SSECollector(stream, on_complete=save_to_db)
        return StreamingResponse(collector, media_type="text/event-stream")
    """

    def __init__(
        self,
        stream: AsyncIterator[str],
        on_complete: Callable[[str], Awaitable[None]],
    ) -> None:
        self._stream = stream
        self._on_complete = on_complete
        self._chunks: list[str] = []

    async def __aiter__(self):  # noqa: ANN204
        try:
            async for chunk in self._stream:
                yield chunk
                self._parse_chunk(chunk)

            full_text = "".join(self._chunks)
            try:
                await self._on_complete(full_text)
            except Exception:
                logger.exception("SSECollector on_complete callback failed")
        except Exception:
            logger.exception("SSECollector stream error")
            raise

    # ------------------------------------------------------------------

    def _parse_chunk(self, raw: str) -> None:
        """Extract content delta from an SSE chunk.

        Expected format::

            event: content
            data: {"delta": "some text"}

        """
        event_type = ""
        for line in raw.strip().split("\n"):
            if line.startswith("event: "):
                event_type = line[7:].strip()
            elif line.startswith("data: ") and event_type == "content":
                try:
                    data = json.loads(line[6:])
                    if "delta" in data:
                        self._chunks.append(data["delta"])
                except (json.JSONDecodeError, KeyError):
                    pass
