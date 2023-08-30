import {
  ILabShell,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ControlWidget } from './launchWidget';

/**
 * Initialization data for the react-widget extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'react-widget',
  description: 'A minimal JupyterLab extension using a React Widget.',
  autoStart: true,
  optional: [ILabShell],
  activate: (app: JupyterFrontEnd, labShell: ILabShell) => {
    const controlWidget = new ControlWidget(app, labShell);
    controlWidget.id = 'gpu-dashboard';
    labShell.add(controlWidget, 'left', { rank: 200 });
  }
};

export default extension;
