"""
Benchmark module system collector — gathers details about hardware,
operating system, and software environment.
"""

import multiprocessing
import platform
import os
from typing import Any, Dict


def get_cpu_model() -> str:
    """Attempt to extract the detailed CPU model name (specifically on Linux)."""
    try:
        if os.path.exists("/proc/cpuinfo"):
            with open("/proc/cpuinfo", "r", encoding="utf-8") as f:
                for line in f:
                    if "model name" in line:
                        return line.split(":", 1)[1].strip()
    except Exception:
        pass
    return platform.processor() or "Unknown Processor"


def get_total_memory_gb() -> float:
    """Attempt to read the total physical RAM in GB (specifically on Linux)."""
    try:
        if os.path.exists("/proc/meminfo"):
            with open("/proc/meminfo", "r", encoding="utf-8") as f:
                for line in f:
                    if "MemTotal" in line:
                        mem_kb = int(line.split()[1])
                        # Convert Kilobytes to Gigabytes
                        return round(mem_kb / (1024 * 1024), 2)
    except Exception:
        pass
    return 0.0


def collect_system_info() -> Dict[str, Any]:
    """Collect hardware and system configuration data for benchmark metadata."""
    logical_cores = multiprocessing.cpu_count()
    cpu_model = get_cpu_model()
    total_mem = get_total_memory_gb()

    return {
        "cpu_model": cpu_model,
        "architecture": platform.machine(),
        "logical_cores": logical_cores,
        "total_memory_gb": total_mem,
        "operating_system": f"{platform.system()} {platform.release()}",
        "python_version": platform.python_version(),
    }
