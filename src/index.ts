import {
  ILabShell,
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ControlWidget } from './launchWidget';
import { MainAreaWidget, WidgetTracker } from '@jupyterlab/apputils';

/**
 * Initialization data for the react-widget extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'react-widget',
  description: 'A minimal JupyterLab extension using a React Widget.',
  autoStart: true,
  requires: [ILabShell],
  optional: [ILayoutRestorer],
  activate: (
    app: JupyterFrontEnd,
    labShell: ILabShell,
    restorer: ILayoutRestorer | null
  ) => {
    const tracker = new WidgetTracker<MainAreaWidget>({
      namespace: 'gpu-dashboard-widgets'
    });
    const controlWidget = new ControlWidget(app, labShell, tracker);
    controlWidget.id = 'gpu-dashboard';
    if (restorer) {
      restorer.add(controlWidget, 'gpu-dashboard');
      restorer.restore(tracker, {
        command: 'gpu-dashboard-widget:open',
        args: widget => ({ label: widget.title.label }),
        name: widget => widget.title.label
      });
    }

    labShell.add(controlWidget, 'left', { rank: 200 });
  }
};

export default extension;
