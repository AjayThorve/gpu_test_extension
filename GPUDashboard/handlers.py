import json

from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
import tornado
import pynvml

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
    handlers = [
        (route_pattern_gpu_util, GPUUtilizationHandler),
        (route_pattern_gpu_usage, GPUUsageHandler),
    ]
    web_app.add_handlers(host_pattern, handlers)
