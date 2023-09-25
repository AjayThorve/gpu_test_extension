from jupyter_server.utils import url_path_join
from . import apps


def setup_handlers(web_app):
    host_pattern = ".*$"
    base_url = web_app.settings["base_url"]
    handlers = []
    if apps.gpu.ngpus > 0:
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
        route_pattern_pci_stats = url_path_join(
            base_url, "GPUDashboard", "pci_stats"
        )
        route_pattern_nvlink_throughput = url_path_join(
            base_url, "GPUDashboard", "nvlink_throughput"
        )
        handlers += (
            [
                (route_pattern_gpu_util, apps.gpu.GPUUtilizationHandler),
                (route_pattern_gpu_usage, apps.gpu.GPUUsageHandler),
                (route_pattern_gpu_resource, apps.gpu.GPUResourceHandler),
                (route_pattern_pci_stats, apps.gpu.PCIStatsHandler),
                (
                    route_pattern_nvlink_throughput,
                    apps.gpu.NVLinkThroughputHandler,
                ),
            ]
        )

    route_pattern_cpu_resource = url_path_join(
        base_url, "GPUDashboard", "cpu_resource"
    )

    handlers += (
        [
            (route_pattern_cpu_resource, apps.cpu.CPUResourceHandler),
        ]
    )

    web_app.add_handlers(host_pattern, handlers)
