import json

from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
import tornado
import pynvml
import time

try:
    pynvml.nvmlInit()
except pynvml.nvml.NVMLError_LibraryNotFound:
    ngpus = 0
    gpu_handles = []
else:
    ngpus = pynvml.nvmlDeviceGetCount()
    gpu_handles = [pynvml.nvmlDeviceGetHandleByIndex(i) for i in range(ngpus)]
    try:
        nvlink_ver = pynvml.nvmlDeviceGetNvLinkVersion(gpu_handles[0], 0)
    except (IndexError, pynvml.nvml.NVMLError_NotSupported):
        nvlink_ver = None
    try:
        pci_gen = pynvml.nvmlDeviceGetMaxPcieLinkGeneration(gpu_handles[0])
    except (IndexError, pynvml.nvml.NVMLError_NotSupported):
        pci_gen = None


class GPUUtilizationHandler(APIHandler):
    @tornado.web.authenticated
    def get(self):
        gpu_utilization = [
            pynvml.nvmlDeviceGetUtilizationRates(gpu_handles[i]).gpu
            for i in range(ngpus)
        ]
        self.finish(json.dumps({"gpu_utilization": gpu_utilization}))


class GPUUsageHandler(APIHandler):
    @tornado.web.authenticated
    def get(self):
        memory_usage = [
            pynvml.nvmlDeviceGetMemoryInfo(handle).used
            for handle in gpu_handles
        ]

        total_memory = [
            pynvml.nvmlDeviceGetMemoryInfo(handle).total
            for handle in gpu_handles
        ]

        self.finish(
            json.dumps(
                {"memory_usage": memory_usage, "total_memory": total_memory}
            )
        )


class GPUResourceHandler(APIHandler):
    @tornado.web.authenticated
    def get(self):
        now = time.time()
        stats = {
            "time": now * 1000,
            "gpu_utilization_total": 0,
            "gpu_memory_total": 0,
            "rx_total": 0,
            "tx_total": 0,
            "gpu_devices": [],
        }
        for i in range(ngpus):
            gpu = pynvml.nvmlDeviceGetUtilizationRates(gpu_handles[i]).gpu
            mem = pynvml.nvmlDeviceGetMemoryInfo(gpu_handles[i]).used
            stats["gpu_utilization_total"] += gpu
            stats["gpu_memory_total"] += mem / (1024 * 1024)

            if pci_gen is not None:
                tx = (
                    pynvml.nvmlDeviceGetPcieThroughput(
                        gpu_handles[i], pynvml.NVML_PCIE_UTIL_TX_BYTES
                    )
                    * 1024
                )
                rx = (
                    pynvml.nvmlDeviceGetPcieThroughput(
                        gpu_handles[i], pynvml.NVML_PCIE_UTIL_RX_BYTES
                    )
                    * 1024
                )
                stats["rx_total"] += rx
                stats["tx_total"] += tx

            stats["gpu_devices"].append(
                {
                    "gpu_" + str(i): gpu,
                    "memory_" + str(i): mem,
                }
            )
        self.set_header("Content-Type", "application/json")
        self.write(json.dumps(stats))


def setup_handlers(web_app):
    host_pattern = ".*$"
    base_url = web_app.settings["base_url"]

    # Prepend the base_url so that it works in a JupyterHub setting
    route_pattern_gpu_util = url_path_join(
        base_url, "GPUDashboard", "gpu_utilization"
    )
    route_pattern_gpu_usage = url_path_join(
        base_url, "GPUDashboard", "gpu_usage"
    )
    route_pattern_gpu_resource = url_path_join(
        base_url, "GPUDashboard", "gpu_resource"
    )
    handlers = [
        (route_pattern_gpu_util, GPUUtilizationHandler),
        (route_pattern_gpu_usage, GPUUsageHandler),
        (route_pattern_gpu_resource, GPUResourceHandler),
    ]
    web_app.add_handlers(host_pattern, handlers)
