import React, { useEffect, useState } from 'react';
import { requestAPI } from '../handler';
import { ReactWidget } from '@jupyterlab/ui-components';
import {
  BarChart,
  Bar,
  Cell,
  YAxis,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { scaleThreshold } from 'd3-scale';
import { renderCustomTooltip } from '../components/tooltipUtils';
import { format } from 'd3-format';

const GpuUsageChart = (): JSX.Element => {
  const [gpuUsage, setGpuUsage] = useState([]);
  const [gpuTotalMemory, setGpuTotalMemory] = useState([]);

  useEffect(() => {
    async function fetchGPUUsage() {
      const response = await requestAPI<any>('gpu_usage');
      setGpuUsage(response.memory_usage);
      // set gpuTotalMemory to max of total memory array returned from API
      setGpuTotalMemory(response.total_memory);
    }

    fetchGPUUsage();
  }, []);

  useEffect(() => {
    async function fetchGPUUsage() {
      const response = await requestAPI<any>('gpu_usage');
      setGpuUsage(response.memory_usage);
      setGpuTotalMemory(response.total_memory);
    }
    const intervalId = setInterval(() => {
      fetchGPUUsage();
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const data = gpuUsage.map((usage, index) => ({
    name: `GPU ${index}`,
    usage: usage,
    totalMemory: gpuTotalMemory[index]
  }));

  // Create a formatter for displaying bytes

  const colorScale = scaleThreshold<number, string>()
    .domain([0.25, 0.5, 0.75])
    .range(['#A7D95A', '#76B900', '#4D8500', '#FF5733']);

  const usageSum = data.reduce((sum, data) => sum + data.usage, 0);
  const formatBytes = (value: number): string => {
    return `${format('.2s')(value)}B`;
  };

  return (
    <>
      <strong className="chart-title">
        {' '}
        GPU Memory: {formatBytes(usageSum)}
      </strong>
      <ResponsiveContainer width="100%" height="98%">
        <BarChart layout="vertical" width={500} height={300} data={data}>
          <XAxis
            type="number"
            domain={[0, Math.max(...gpuTotalMemory)]}
            tickFormatter={formatBytes}
          />
          <YAxis type="category" dataKey="name" />
          <CartesianGrid strokeDasharray="3 3" />
          <Tooltip
            cursor={{ fill: 'transparent' }}
            content={(data: any) =>
              renderCustomTooltip(data, { formatter: formatBytes })
            }
          />
          <Bar dataKey="usage">
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colorScale(
                  parseFloat(entry.usage) / parseFloat(entry.totalMemory)
                ).toString()}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </>
  );
};

export class GpuUsageChartWidget extends ReactWidget {
  render(): JSX.Element {
    return <GpuUsageChart />;
  }
}
