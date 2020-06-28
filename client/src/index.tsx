import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import { store } from './app/store';
import { Provider } from 'react-redux';
import { FeathersProvider } from './features/feathers/FeathersProvider';
import * as serviceWorker from './serviceWorker';

// TODO(gnewman): Let's find a time to revisit React.StrictMode. It should help
// us catch bugs before they hit production. For now, though, it just catches
// an annoying BlueprintJS issue where they use a deprecated React feature.
// There's nothing we can do about this until BlueprintJS releases a new
// version where they resolve the issue:
// https://github.com/palantir/blueprint/issues/3979
ReactDOM.render(
  <Provider store={store}>
    <FeathersProvider>
      <App />
    </FeathersProvider>
  </Provider>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
