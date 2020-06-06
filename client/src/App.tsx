import React, { useState } from 'react';

import logo from './logo.svg';
import { Counter } from './features/counter/Counter';
import { useCreate } from './features/feathers/Feathers';
import './App.css';

function App() {
  const [name, setName] = useState('default room name');
  const [createRoom, { called, loading, error, data }] = useCreate('rooms', {
    name,
  });
  const id = data && !Array.isArray(data) && data.id;
  console.log(data && data.name);


  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <Counter />
        <input value={name} onChange={e => setName(e.target.value)} />
        <button onClick={createRoom}>Create room!</button>
        <p>{!called ? 'no room created yet...' : loading ? 'loading...' : id}</p>
        {error && <i>{error.errors}</i>}
        <span>
          <span>Learn </span>
          <a
            className="App-link"
            href="https://reactjs.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            React
          </a>
          <span>, </span>
          <a
            className="App-link"
            href="https://redux.js.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Redux
          </a>
          <span>, </span>
          <a
            className="App-link"
            href="https://redux-toolkit.js.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Redux Toolkit
          </a>
          ,<span> and </span>
          <a
            className="App-link"
            href="https://react-redux.js.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            React Redux
          </a>
        </span>
      </header>
    </div>
  );
}

export default App;
