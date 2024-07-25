import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

(() => {
  kintone.events.on('app.record.index.show', (event) => {
    const customView = Number(8253186); // 請替換成你的自定義視圖 ID
    if (event.viewId === customView) {
      let rootElement = document.querySelector('.root');
      if (!rootElement) {
        rootElement = document.createElement('div');
        rootElement.className = 'root';
        document.body.appendChild(rootElement);
      }
      ReactDOM.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>,
        rootElement
      );
    }
    return event;
  });
})();
