import React from 'react';

interface ITooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

interface ITooltipOptions {
  formatter: (value: number) => string;
}

export function renderCustomTooltip(
  data: ITooltipProps,
  options: ITooltipOptions
): JSX.Element | null {
  if (data.active && data.payload && data.payload.length) {
    const { payload, label } = data;
    const yValue = payload[0].value;
    const formattedYValue = options.formatter(yValue);

    return (
      <div className="custom-tooltip">
        <div className="tooltip-title">{label}</div>
        <div className="tooltip-value">{formattedYValue}</div>
      </div>
    );
  }

  return null;
}
