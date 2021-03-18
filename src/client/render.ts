/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

// We've set up this sample using CSS modules, which lets you import class
// names into JavaScript: https://github.com/css-modules/css-modules
// You can configure or change this in the webpack.config.js file.
import * as style from './style.css';
import { VisualizationView, Theme, globalVisualizationFactory } from "@hediet/visualization-core";
import "@hediet/visualization-bundle";
import type { NotebookRendererApi } from 'vscode-notebook-renderer';
import * as React from 'react';
import * as ReactDOM from 'react-dom';


interface IRenderInfo {
  container: HTMLElement;
  mimeType: string;
  data: any;
  notebookApi: NotebookRendererApi<unknown>;
}

// This function is called to render your contents.
export function render({ container, mimeType, data }: IRenderInfo) {
  const d = data;
  
  const visualizations = globalVisualizationFactory.getVisualizations(
    d,
    /* preferred visualization id */ undefined
  );
  console.log(visualizations, ReactDOM);
  container.style.height = '180px';
  ReactDOM.render(React.createElement(VisualizationView, { theme: Theme.light, visualization: visualizations.bestVisualization! } ), container);
}

if (module.hot) {
  module.hot.addDisposeHandler(() => {
    // In development, this will be called before the renderer is reloaded. You
    // can use this to clean up or stash any state.
  });
}
