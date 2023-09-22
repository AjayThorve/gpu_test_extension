import json

from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
import tornado
import pynvml
import time
import psutil

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
            "gpu_memory_individual": [],
            "gpu_utilization_individual": [],
        }
        memory_list = [
            pynvml.nvmlDeviceGetMemoryInfo(handle).total / (1024 * 1024)
            for handle in gpu_handles
        ]
        gpu_mem_sum = sum(memory_list)

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
            stats["gpu_utilization_individual"].append(gpu)
            stats["gpu_memory_individual"].append(mem)

        stats["gpu_utilization_total"] /= ngpus
        stats["gpu_memory_total"] = round(
            (stats["gpu_memory_total"] / gpu_mem_sum) * 100, 2
        )
        self.set_header("Content-Type", "application/json")
        self.write(json.dumps(stats))


class PCIStatsHandler(APIHandler):
    @tornado.web.authenticated
    def get(self):
        pci_width = pynvml.nvmlDeviceGetMaxPcieLinkWidth(gpu_handles[0])
        pci_bw = {
            1: (250.0 * 1024 * 1024),
            2: (500.0 * 1024 * 1024),
            3: (985.0 * 1024 * 1024),
            4: (1969.0 * 1024 * 1024),
            5: (3938.0 * 1024 * 1024),
            6: (7877.0 * 1024 * 1024),
        }
        max_rxtx_tp = pci_width * pci_bw[pci_gen]

        pci_tx = [
            pynvml.nvmlDeviceGetPcieThroughput(
                gpu_handles[i], pynvml.NVML_PCIE_UTIL_TX_BYTES
            )
            * 1024
            for i in range(ngpus)
        ]

        pci_rx = [
            pynvml.nvmlDeviceGetPcieThroughput(
                gpu_handles[i], pynvml.NVML_PCIE_UTIL_RX_BYTES
            )
            * 1024
            for i in range(ngpus)
        ]

        stats = {
            "pci_tx": pci_tx,
            "pci_rx": pci_rx,
            "max_rxtx_tp": max_rxtx_tp,
        }

        self.set_header("Content-Type", "application/json")
        self.write(json.dumps(stats))


class CPUResourceHandler(APIHandler):
    @tornado.web.authenticated
    def get(self):
        now = time.time()
        stats = {
            "time": now * 1000,
            "cpu_utilization": psutil.cpu_percent(),
            "memory_usage": psutil.virtual_memory().used,
            "disk_read": psutil.disk_io_counters().read_bytes,
            "disk_write": psutil.disk_io_counters().write_bytes,
            "network_read": psutil.net_io_counters().bytes_recv,
            "network_write": psutil.net_io_counters().bytes_sent,
        }
        self.set_header("Content-Type", "application/json")
        self.write(json.dumps(stats))


class NVLinkThroughputHandler(APIHandler):
    @tornado.web.authenticated
    def get(self):
        throughput = [
            pynvml.nvmlDeviceGetFieldValues(
                handle,
                [
                    (pynvml.NVML_FI_DEV_NVLINK_THROUGHPUT_DATA_RX, scope_id)
                    for scope_id in range(pynvml.NVML_NVLINK_MAX_LINKS)
                ]
                + [
                    (pynvml.NVML_FI_DEV_NVLINK_THROUGHPUT_DATA_TX, scope_id)
                    for scope_id in range(pynvml.NVML_NVLINK_MAX_LINKS)
                ],
            )
            for handle in gpu_handles
        ]

        links = [
            getattr(pynvml, f"NVML_FI_DEV_NVLINK_SPEED_MBPS_L{i}", "")
            for i in range(pynvml.NVML_NVLINK_MAX_LINKS)
            if hasattr(pynvml, f"NVML_FI_DEV_NVLINK_SPEED_MBPS_L{i}")
        ]

        bandwidth = [
            pynvml.nvmlDeviceGetFieldValues(handle, links)
            for handle in gpu_handles
        ]

        # Maximum bandwidth is bidirectional, divide by two for separate RX and TX
        max_bw = max(
            sum(i.value.ullVal for i in bw) * 1024**2
            for bw in bandwidth
        ) / 2

        self.set_header("Content-Type", "application/json")
        self.write(
            json.dumps(
                {
                    "nvlink_rx": [
                        sum(
                            t[i].value.ullVal * 1024
                            for i in range(pynvml.NVML_NVLINK_MAX_LINKS)
                        )
                        for t in throughput
                    ],
                    "nvlink_tx": [
                        sum(
                            t[pynvml.NVML_NVLINK_MAX_LINKS + i].value.ullVal
                            * 1024
                            for i in range(pynvml.NVML_NVLINK_MAX_LINKS)
                        )
                        for t in throughput
                    ],
                    "max_rxtx_bw": max_bw,
                }
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
    route_pattern_gpu_resource = url_path_join(
        base_url, "GPUDashboard", "gpu_resource"
    )
    route_pattern_cpu_resource = url_path_join(
        base_url, "GPUDashboard", "cpu_resource"
    )
    route_pattern_pci_stats = url_path_join(
        base_url, "GPUDashboard", "pci_stats"
    )
    route_pattern_nvlink_throughput = url_path_join(
        base_url, "GPUDashboard", "nvlink_throughput"
    )
    handlers = [
        (route_pattern_gpu_util, GPUUtilizationHandler),
        (route_pattern_gpu_usage, GPUUsageHandler),
        (route_pattern_gpu_resource, GPUResourceHandler),
        (route_pattern_cpu_resource, CPUResourceHandler),
        (route_pattern_pci_stats, PCIStatsHandler),
        (route_pattern_nvlink_throughput, NVLinkThroughputHandler),
    ]
    web_app.add_handlers(host_pattern, handlers)
