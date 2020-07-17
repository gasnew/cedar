# Cedar Client

TODO: Think about whether to use [opus](https://opus-codec.org/) and, if so,
whether to use [this npm package](https://www.npmjs.com/package/opusscript)
)
https://stackoverflow.com/questions/41346699/how-to-stream-audio-chunks-using-web-audio-api-coming-from-web-socket
https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode
https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletNode

This project was bootstrapped with [Create React
App](https://github.com/facebook/create-react-app), using the
[Redux](https://redux.js.org/) and [Redux
Toolkit](https://redux-toolkit.js.org/) template.

## Getting started

1. Make sure you have [NodeJS](https://nodejs.org/) and
   [yarn](https://yarnpkg.com/getting-started/install).

2. Install your dependencies

    ```
    cd path/to/cedar/client
    yarn install
    ```

3. Start your React dev server, and start the Electron app when the React
   server is ready. The React server will watch source files and recompile (TS
   -> JS) and restart itself when any of them changes.

    ```
    yarn start
    ```

## Available Scripts

In the project directory, you can run:

### `yarn start`

Runs the app in the development mode.<br />
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br />
You will also see any lint errors in the console.

### `yarn test`

Launches the test runner in the interactive watch mode.<br />
See the section about [running
tests](https://facebook.github.io/create-react-app/docs/running-tests) for more
information.

### `yarn build`

Builds the app for production to the `build` folder.<br />
It correctly bundles React in production mode and optimizes the build for the
best performance.

The build is minified and the filenames include the hashes.<br />
Your app is ready to be deployed!

See the section about
[deployment](https://facebook.github.io/create-react-app/docs/deployment) for
more information.

### `yarn eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can
`eject` at any time. This command will remove the single build dependency from
your project.

Instead, it will copy all the configuration files and the transitive
dependencies (webpack, Babel, ESLint, etc) right into your project so you have
full control over them. All of the commands except `eject` will still work, but
they will point to the copied scripts so you can tweak them. At this point
you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for
small and middle deployments, and you shouldn’t feel obligated to use this
feature. However we understand that this tool wouldn’t be useful if you
couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App
documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here:
https://facebook.github.io/create-react-app/docs/code-splitting

### Analyzing the Bundle Size

This section has moved here:
https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size

### Making a Progressive Web App

This section has moved here:
https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app

### Advanced Configuration

This section has moved here:
https://facebook.github.io/create-react-app/docs/advanced-configuration

### Deployment

This section has moved here:
https://facebook.github.io/create-react-app/docs/deployment

### `yarn build` fails to minify

This section has moved here:
https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify
