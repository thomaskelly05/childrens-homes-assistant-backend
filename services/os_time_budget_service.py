"""Time-budget helpers for OS dashboard section builds."""

from __future__ import annotations

import logging
import time
from concurrent.futures import Future, ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from dataclasses import dataclass, field
from typing import Any, Callable, TypeVar

logger = logging.getLogger("indicare.os_time_budget")

T = TypeVar("T")


@dataclass
class SectionResult:
    name: str
    value: Any
    timed_out: bool = False
    elapsed_ms: float = 0.0
    warning: str | None = None


@dataclass
class TimeBudgetReport:
    sections: list[SectionResult] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    total_ms: float = 0.0
    timeout_count: int = 0

    def add_warning(self, message: str) -> None:
        self.warnings.append(message)


class OsTimeBudgetService:
    """Run dashboard sections with per-section timeouts so one slow source cannot block all."""

    def __init__(self, *, max_workers: int = 8) -> None:
        self._max_workers = max(1, max_workers)

    def run_section(
        self,
        name: str,
        timeout_ms: int,
        fn: Callable[[], T],
        *,
        fallback: T,
        report: TimeBudgetReport | None = None,
    ) -> SectionResult:
        started = time.perf_counter()
        value: Any = fallback
        timed_out = False
        warning: str | None = None
        timeout_seconds = max(0.05, timeout_ms / 1000.0)

        with ThreadPoolExecutor(max_workers=1) as pool:
            future: Future[T] = pool.submit(fn)
            try:
                value = future.result(timeout=timeout_seconds)
            except FuturesTimeoutError:
                timed_out = True
                warning = f"{name} timed out after {timeout_ms}ms"
                if report is not None:
                    report.add_warning(warning)
                    report.timeout_count += 1
                logger.warning("os_time_budget section_timeout name=%s timeout_ms=%s", name, timeout_ms)
            except Exception as exc:
                warning = f"{name} failed: {type(exc).__name__}"
                if report is not None:
                    report.add_warning(warning)
                logger.warning("os_time_budget section_error name=%s error=%s", name, type(exc).__name__)

        elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
        result = SectionResult(
            name=name,
            value=value,
            timed_out=timed_out,
            elapsed_ms=elapsed_ms,
            warning=warning,
        )
        if report is not None:
            report.sections.append(result)
        return result

    def run_sections_parallel(
        self,
        sections: list[tuple[str, int, Callable[[], Any], Any]],
        *,
        total_timeout_ms: int | None = None,
        report: TimeBudgetReport | None = None,
    ) -> dict[str, Any]:
        started = time.perf_counter()
        outputs: dict[str, Any] = {}
        if report is None:
            report = TimeBudgetReport()

        with ThreadPoolExecutor(max_workers=min(self._max_workers, max(1, len(sections)))) as pool:
            futures: dict[str, tuple[Future[Any], int, Any]] = {}
            for name, timeout_ms, fn, fallback in sections:
                futures[name] = (pool.submit(self.run_section, name, timeout_ms, fn, fallback=fallback, report=report), fallback)

            deadline = None
            if total_timeout_ms is not None:
                deadline = started + max(0.05, total_timeout_ms / 1000.0)

            for name, (future, fallback) in futures.items():
                wait_seconds = None
                if deadline is not None:
                    wait_seconds = max(0.01, deadline - time.perf_counter())
                try:
                    section_result = future.result(timeout=wait_seconds)
                    outputs[name] = section_result.value
                except FuturesTimeoutError:
                    report.add_warning(f"{name} exceeded total budget")
                    report.timeout_count += 1
                    outputs[name] = fallback

        report.total_ms = round((time.perf_counter() - started) * 1000, 2)
        return outputs

    def elapsed_since(self, started: float) -> float:
        return round((time.perf_counter() - started) * 1000, 2)


os_time_budget_service = OsTimeBudgetService()
