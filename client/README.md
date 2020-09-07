# Cedar Client

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

### `yarn dist`

Builds executables and installers for MacOS and Windows in the `dist` folder
using [electron-builder](https://www.electron.build/). In the future, I'm
planning to add a GitHub action to bump the Cedar version, build new
distributables, and upload them as a
[release](https://docs.github.com/en/github/administering-a-repository/managing-releases-in-a-repository).
This should also dovetail with automatic updates via electron-builder.

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

## App design

### Opus audio encoding

We use the [Opus codec](https://opus-codec.org/) to encode and decode audio
data. It is way too fast, audio quality remains very high, and it reduces
space/bandwidth requirements by ~10x. We currently run encoding and decoding in
a worker thread using a compiled file from
[webopus](https://github.com/srikumarks/webopus).

### Web Audio API

TODO: Link to diagrams of how Cedar uses the Web Audio API.

The most difficult-to-understand parts of the Cedar client are the parts
involving the Web Audio API, which is used for piping data from audio input
devices to the Cedar backend and playing audio from the Cedar backend through
the speakers. The [MDN Web Audio
API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) page
provides a useful intro to the concepts, and Google has a great overview of Web
Audio API best practices in [their Audio Worklet Design Pattern
article](https://developers.google.com/web/updates/2018/06/audio-worklet-design-pattern).

#### Debugging web audio

Web audio is notoriously difficult to troubleshoot, unfortunately, but there
are some great resources out there:

* [Web Audio API performance and debugging notes](https://padenot.github.io/web-audio-perf/)
* [Profiling Web Audio apps in Chrome](https://web.dev/profiling-web-audio-apps-in-chrome/)

#### Future work

The current implementation of the Cedar client is far from perfect. Here are
some potential optimizations:
* We currently copy audio data buffers across threads, which can be costly (but
  hasn't been yet in my small-scale tests). Still, one optimization here would
  be to use the
  [SharedArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer),
  on which we could perform atomic operations across threads.
* If we need our AudioWorkletProcessors to be more performant (and perhaps more
  importantly not get blocked by garbage collection now and then), we should
  rewrite them in WebAssembly.
* Generally, there are good tips and best-practice examples on [Google's Audio
  Worklet examples
  page](https://googlechromelabs.github.io/web-audio-samples/audio-worklet/)
* Integration tests! By far the hardest part of this app to test is making sure
  audio stays synced across multiple clients. This means the microphone and
  speaker data need to start moving at the same time (delta some loopback
  delay), sample count needs to match progression of time one-to-one, etc. This
  is a pain to test manually and is a critical failure if an update breaks this
  feature. I'll be doing more thinking about how to automate testing this.

### React

React! React everywhere! When things look sluggish, don't hesitate to use the
React Dev Tools.

Tips:
* Debugging hook-related renders: Sometimes hooks cause a bajillion re-renders,
  but the dev tools don't give us much insight into this. However, a good way
  to see what hooks are being troublesome, you can do something like this:
  1. Inspect the component in the React Dev Tools
  2. Copy the hooks state JSON into a file
  3. Repeat step 2 after state has updated
  4. Diff the two files
