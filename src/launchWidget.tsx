import React from 'react';
import { ILabShell, JupyterFrontEnd } from '@jupyterlab/application';
import { ReactWidget, Button } from '@jupyterlab/ui-components';
import { GpuUsageChartWidget, GpuUtilizationChartWidget } from './charts';
import { MainAreaWidget } from '@jupyterlab/apputils';

interface IControlProps {
  app: JupyterFrontEnd;
  labShell: ILabShell;
}

interface IWidgetInfo {
  label: string;
  instance: MainAreaWidget;
}

const Control: React.FC<IControlProps> = ({ app, labShell }) => {
  const openWidgets: IWidgetInfo[] = [];

  const openWidget = (widgetCreator: () => ReactWidget, label: string) => {
    // Check if a widget with the same label is already open
    const existingWidget = openWidgets.find(widget => widget.label === label);

    if (existingWidget) {
      // If widget is already open, bring it to the front
      labShell.activateById(existingWidget.instance.id);
    } else {
      // If widget is not open, create and add it
      const content = widgetCreator();
      const widgetInstance = new MainAreaWidget({ content });
      widgetInstance.title.label = label;
      app.shell.add(widgetInstance, 'main');
      openWidgets.push({ label, instance: widgetInstance });

      // Remove the widget from openWidgets when it is closed
      widgetInstance.disposed.connect(() => {
        const index = openWidgets.findIndex(widget => widget.label === label);
        if (index !== -1) {
          openWidgets.splice(index, 1);
        }
      });
    }
  };

  const openGPUUsageWidget = () => {
    openWidget(() => new GpuUsageChartWidget(), 'GPU Usage Widget');
  };

  const openGPUUtilizationWidget = () => {
    openWidget(() => new GpuUtilizationChartWidget(), 'GPU Utilization Widget');
  };

  return (
    <div className="gpu-dashboard-container">
      <div className="gpu-dashboard-header">GPU Dashboards</div>
      <hr className="gpu-dashboard-divider" />
      <Button className="gpu-dashboard-button" onClick={openGPUUsageWidget}>
        Open GPU Usage Widget
      </Button>
      <Button
        className="gpu-dashboard-button"
        onClick={openGPUUtilizationWidget}
      >
        Open GPU Utilization Widget
      </Button>
    </div>
  );
};

export class ControlWidget extends ReactWidget {
  constructor(
    private app: JupyterFrontEnd,
    private labShell: ILabShell
  ) {
    super();
    this.addClass('jp-ControlWidget');
  }

  render(): JSX.Element {
    return <Control app={this.app} labShell={this.labShell} />;
  }
}
