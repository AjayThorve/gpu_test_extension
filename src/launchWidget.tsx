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

export interface IWidgetInfo {
  id: string;
  title: string;
  instance: MainAreaWidget;
}

// Control component for the GPU Dashboard, which contains buttons to open the GPU widgets
const Control: React.FC<IControlProps> = ({ app, labShell, tracker }) => {
  // Keep track of open widgets
  const openWidgets: IWidgetInfo[] = [];

  // Add command to open GPU Dashboard Widget
  app.commands.addCommand('gpu-dashboard-widget:open', {
    label: 'Open GPU Dashboard Widget',
    execute: args => {
      const { id, title } = args as { id: string; title: string };
      const w = tracker.find(widget => widget.id === id);
      if (w) {
        if (!w.isAttached) {
          labShell.add(w, 'main');
        }
        labShell.activateById(w.id);
        return;
      }
      openWidgetById(id, title);
    }
  });

  /* Function to create a widget by id and title and add it to the main area,
   or bring it to the front if it is already open */
  const openWidget = (
    widgetCreator: () => ReactWidget,
    id: string,
    title: string
  ) => {
    // Check if a widget with the same id is already open
    const existingWidget = openWidgets.find(widget => widget.id === id);
    if (existingWidget) {
      // If widget is already open, bring it to the front
      labShell.activateById(existingWidget.instance.id);
      tracker.add(existingWidget.instance);
    } else {
      // If widget is not open, create and add it
      const content = widgetCreator();
      const widgetInstance = new MainAreaWidget({ content });
      widgetInstance.title.label = title;
      // widgetInstance.title.icon = 'jp-GPU-icon';
      widgetInstance.id = id;
      app.shell.add(widgetInstance, 'main');
      tracker.add(widgetInstance);
      openWidgets.push({ id, title, instance: widgetInstance });

      // Remove the widget from openWidgets when it is closed
      widgetInstance.disposed.connect(() => {
        const index = openWidgets.findIndex(widget => widget.id === id);
        if (index !== -1) {
          openWidgets.splice(index, 1);
        }
      });
    }
  };

  // Function to open a widget by id and title (used by buttons)
  const openWidgetById = (id: string, title: string) => {
    openWidget(
      id === 'gpu-usage-widget'
        ? () => new GpuUsageChartWidget()
        : () => new GpuUtilizationChartWidget(),
      id,
      title
    );
  };

  return (
    <div className="gpu-dashboard-container">
      <div className="gpu-dashboard-header">GPU Dashboards</div>
      <hr className="gpu-dashboard-divider" />
      <Button
        className="gpu-dashboard-button"
        onClick={() => openWidgetById('gpu-usage-widget', 'GPU Usage Widget')}
      >
        Open GPU Usage Widget
      </Button>
      <Button
        className="gpu-dashboard-button"
        onClick={() =>
          openWidgetById('gpu-utilization-widget', 'GPU Utilization Widget')
        }
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
    // Keep track of open widgets in the tracker so they can be restored on reload
    this.tracker = tracker;
  }

  render(): JSX.Element {
    return (
      <Control app={this.app} labShell={this.labShell} tracker={this.tracker} />
    );
  }
}
