import React from 'react';
import { ILabShell, JupyterFrontEnd } from '@jupyterlab/application';
import { ReactWidget, Button } from '@jupyterlab/ui-components';
import { GpuUsageChartWidget, GpuUtilizationChartWidget } from './charts';
import { MainAreaWidget, WidgetTracker } from '@jupyterlab/apputils';

interface IControlProps {
  app: JupyterFrontEnd;
  labShell: ILabShell;
  tracker: WidgetTracker;
}

interface IWidgetInfo {
  label: string;
  instance: MainAreaWidget;
}

const Control: React.FC<IControlProps> = ({ app, labShell, tracker }) => {
  const openWidgets: IWidgetInfo[] = [];

  app.commands.addCommand('gpu-dashboard-widget:open', {
    label: 'Open GPU Dashboard Widget',
    execute: args => {
      const { label } = args as { label: string };
      const w = tracker.find(widget => widget.title.label === label);
      if (w) {
        if (!w.isAttached) {
          labShell.add(w, 'main');
        }
        labShell.activateById(w.id);
        return;
      }
      openWidgetByLabel(label);
    }
  });

  const openWidget = (widgetCreator: () => ReactWidget, label: string) => {
    // Check if a widget with the same label is already open
    const existingWidget = openWidgets.find(widget => widget.label === label);
    if (existingWidget) {
      // If widget is already open, bring it to the front
      labShell.activateById(existingWidget.instance.id);
      tracker.add(existingWidget.instance);
    } else {
      // If widget is not open, create and add it
      const content = widgetCreator();
      const widgetInstance = new MainAreaWidget({ content });
      widgetInstance.title.label = label;
      app.shell.add(widgetInstance, 'main');
      tracker.add(widgetInstance);
      console.log(tracker);
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

  const openWidgetByLabel = (label: string) => {
    openWidget(
      label === 'GPU Usage Widget'
        ? () => new GpuUsageChartWidget()
        : () => new GpuUtilizationChartWidget(),
      label
    );
  };

  return (
    <div className="gpu-dashboard-container">
      <div className="gpu-dashboard-header">GPU Dashboards</div>
      <hr className="gpu-dashboard-divider" />
      <Button
        className="gpu-dashboard-button"
        onClick={() => openWidgetByLabel('GPU Usage Widget')}
      >
        Open GPU Usage Widget
      </Button>
      <Button
        className="gpu-dashboard-button"
        onClick={() => openWidgetByLabel('GPU Utilization Widget')}
      >
        Open GPU Utilization Widget
      </Button>
    </div>
  );
};

export class ControlWidget extends ReactWidget {
  constructor(
    private app: JupyterFrontEnd,
    private labShell: ILabShell,
    private tracker: WidgetTracker
  ) {
    super();
    this.addClass('jp-ControlWidget');
    this.tracker = tracker;
  }

  render(): JSX.Element {
    return (
      <Control app={this.app} labShell={this.labShell} tracker={this.tracker} />
    );
  }
}
