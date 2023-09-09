import React, { useState, useEffect } from 'react';
import { ReactWidget, Button } from '@jupyterlab/ui-components';
import {
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Brush,
  LineChart
} from 'recharts';
import AutoSizer from 'react-virtualized-auto-sizer';
import { requestAPI } from '../handler';
import { format } from 'd3-format';
import { renderCustomTooltip } from '../components/tooltipUtils';

interface IGpuDeviceProps {
  date: number;
  utilization: number[];
  memory: number[];
}

interface IChartProps {
  time: number;
  gpu_utilization_total: number;
  gpu_memory_total: number;
  rx_total: number;
  tx_total: number;
  gpu_devices: IGpuDeviceProps[];
}

const GpuResourceChart = () => {
  const [gpuDeviceData, setGpuDeviceData] = useState<IGpuDeviceProps[]>([]);
  const [tempData, setTempData] = useState<IChartProps[]>([]);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    async function fetchGPUUsage() {
      const response = await requestAPI<any>('gpu_resource');
      const newGpuDeviceData = {
        date: new Date().getTime(),
        utilization: response.gpu_devices.map(
          (gpu: any) => gpu[Object.keys(gpu)[0]]
        ),
        memory: response.gpu_devices.map((gpu: any) => gpu[Object.keys(gpu)[1]])
      };
      if (!isPaused) {
        setGpuDeviceData(prevData => {
          // if (tempData.length > 1) {
          //   prevData = [...prevData, ...tempData.gpu_devices];
          // }
          const newData = [...prevData, newGpuDeviceData];
          return newData;
        });
        setTempData([]);
      } else {
        setTempData([...tempData, response]);
      }
    }

    const interval = setInterval(fetchGPUUsage, 1000);

    return () => clearInterval(interval);
  }, [isPaused, tempData]);

  const handlePauseClick = () => {
    setIsPaused(!isPaused);
  };
  const formatBytes = (value: number): string => {
    return `${format('.2s')(value)}B`;
  };

  const formatDate = (value: number): string => {
    return new Date(value).toLocaleTimeString();
  };

  return (
    <div className="gradient-background">
      <Button onClick={handlePauseClick}>
        {isPaused ? 'Resume' : 'Pause'}
      </Button>
      <AutoSizer>
        {({ height, width }: { height: number; width: number }) => (
          <div>
            <div style={{ width }}>
              <strong className="chart-title multi-chart-title">
                {' '}
                GPU Utilization (per Device) [%]
              </strong>
              <LineChart
                data={gpuDeviceData}
                width={width}
                syncId="gpu-resource-sync"
                height={(height - 25) / 3}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDate} />
                <YAxis domain={[0, 100]} tickFormatter={value => `${value}%`} />
                <Tooltip
                  content={(data: any) =>
                    renderCustomTooltip(data, {
                      labelFormatter: value =>
                        new Date(value as string).toLocaleTimeString(),
                      valueFormatter: value => `${value}%`
                    })
                  }
                />
                <Legend verticalAlign="top" align="right" />
                {gpuDeviceData[0] &&
                  Object.keys(gpuDeviceData[0].utilization).map(
                    (gpu: any, index: number) => (
                      <Line
                        key={index}
                        dataKey={`utilization[${index}]`}
                        name={`GPU ${index}`}
                        stroke={`hsl(${
                          (index * 360) / gpuDeviceData[0].utilization.length
                        }, 100%, 50%)`}
                        type="monotone"
                        isAnimationActive={false}
                      />
                    )
                  )}
                <Brush
                  height={0}
                  startIndex={Math.max(gpuDeviceData.length - 10, 0)}
                />
              </LineChart>
            </div>
            <div style={{ width }}>
              <strong className="chart-title multi-chart-title">
                {' '}
                GPU Utilization (per Device) [%]
              </strong>

              <LineChart
                data={gpuDeviceData}
                width={width}
                syncId="gpu-resource-sync"
                height={(height - 25) / 3}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDate} />
                <YAxis tickFormatter={formatBytes} />
                <Tooltip
                  content={(data: any) =>
                    renderCustomTooltip(data, {
                      labelFormatter: value =>
                        new Date(value as string).toLocaleTimeString(),
                      valueFormatter: formatBytes
                    })
                  }
                />
                <Legend verticalAlign="top" align="right" />
                {gpuDeviceData[0] &&
                  Object.keys(gpuDeviceData[0].memory).map(
                    (gpu: any, index: number) => (
                      <Line
                        key={index}
                        dataKey={`memory[${index}]]`}
                        name={`GPU ${index}`}
                        stroke={`hsl(${
                          (index * 360) / gpuDeviceData[0].memory.length
                        }, 100%, 50%)`}
                        type="monotone"
                        isAnimationActive={false}
                      />
                    )
                  )}
                <Brush
                  height={0}
                  startIndex={Math.max(gpuDeviceData.length - 10, 0)}
                />
              </LineChart>
              <LineChart
                data={gpuDeviceData}
                width={width}
                syncId="gpu-resource-sync"
                height={50}
              >
                <Brush
                  dataKey={'date'}
                  tickFormatter={formatDate}
                  startIndex={Math.max(gpuDeviceData.length - 10, 0)}
                />
              </LineChart>
            </div>
          </div>
        )}
      </AutoSizer>
    </div>
  );
};

export class GpuResourceChartWidget extends ReactWidget {
  render() {
    return <GpuResourceChart />;
  }
}
