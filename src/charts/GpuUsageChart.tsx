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

  const formatBytes = format('.2s'); // Create a formatter for displaying bytes

  const colorScale = scaleThreshold<number, string>()
    .domain([0.25, 0.45, 0.6, 0.75])
    .range(['#2c7bb6', '#abd9e9', '#ffffbf', '#fdae61', '#d7191c']);

  const usageSum = data.reduce((sum, data) => sum + data.usage, 0);

  return (
    <>
      <strong style={{ paddingLeft: '25px', fontSize: '1.5vmin' }}>
        GPU Memory: {`${formatBytes(usageSum)}B`}{' '}
      </strong>
      <ResponsiveContainer width="100%" height="98%">
        <BarChart layout="vertical" width={500} height={300} data={data}>
          <XAxis
            type="number"
            domain={[0, Math.max(...gpuTotalMemory)]}
            tickFormatter={value => `${formatBytes(value as number)}B`}
          />
          <YAxis type="category" dataKey="name" />
          <CartesianGrid strokeDasharray="3 3" />
          <Tooltip
            formatter={value => `${formatBytes(value as number)}B`} // Tooltip format for bytes
            cursor={{ fill: 'transparent' }}
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
