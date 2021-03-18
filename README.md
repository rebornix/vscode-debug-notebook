# vscode-debug-notebook

Early experiment of using native notebook in VS Code as the UI for debugging (and I don't what this really means at this very moment).

How it's implemented:

* Create a debug adapter tracker and listen to events on active debug session
* Use the active debug session as the execution engine (which is called Kernel in Jupyter's ecosystem)
* Once you run a cell
  * Send `evaluate` request to the debug session
  * Create a rich output for the cell, a `text/plain` one and a custom `application/data-structure` mimetype.
  * `application/data-structure` mimetype is rendered by a custom renderer, which is on top's `@hediet/visualization-bundle`