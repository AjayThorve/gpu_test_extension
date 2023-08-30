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

const GpuUtilizationChart = (): JSX.Element => {
  const [gpuUtilization, setGpuUtilization] = useState([]);

  useEffect(() => {
    async function fetchGPUUtilization() {
      const response = await requestAPI<any>('gpu_utilization');
      setGpuUtilization(response.gpu_utilization);
    }

    fetchGPUUtilization();
  }, []);

  useEffect(() => {
    async function fetchGPUUtilization() {
      const response = await requestAPI<any>('gpu_utilization');
      setGpuUtilization(response.gpu_utilization);
    }
    const intervalId = setInterval(() => {
      fetchGPUUtilization();
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const data = gpuUtilization.map((utilization, index) => ({
    name: `GPU ${index}`,
    utilization: utilization
  }));

  const colorScale = scaleThreshold<number, string>()
    .domain([25, 45, 70, 85])
    .range(['#2c7bb6', '#abd9e9', '#ffffbf', '#fdae61', '#d7191c']);

  return (
    <>
      <strong style={{ paddingLeft: '25px', fontSize: '1.5vmin' }}>
        GPU Utilization
      </strong>

      <ResponsiveContainer width="100%" height="98%">
        <BarChart layout="vertical" width={500} height={300} data={data}>
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={value => `${value}%`}
          />
          <YAxis type="category" dataKey="name" />
          <CartesianGrid strokeDasharray="3 3" />
          <Tooltip
            formatter={value => `${value}%`} // Tooltip format for bytes
            cursor={{ fill: 'transparent' }}
          />

          <Bar dataKey="utilization">
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colorScale(parseInt(entry.utilization)).toString()}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </>
  );
};

export class GpuUtilizationChartWidget extends ReactWidget {
  render(): JSX.Element {
    return <GpuUtilizationChart />;
  }
}
