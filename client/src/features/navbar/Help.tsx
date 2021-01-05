import _ from 'lodash';
import React, { useEffect, useState } from 'react';
import {
  Button,
  Callout,
  Classes,
  Colors,
  Divider,
  H4,
  Icon,
  Popover,
  ProgressBar,
} from '@blueprintjs/core';

import { getEnv } from '../../app/util';
import './Navbar.css';

// ipcRenderer is provided in public/preload.js
declare global {
  interface Window {
    ipcRenderer: any;
  }
}

const ipcRenderer = window!.ipcRenderer;

type UpdateState =
  | 'checking'
  | 'downloading'
  | 'downloaded'
  | 'notAvailable'
  | 'error';

interface EventListener {
  name: string;
  callback: () => void;
}

function createListeners(setState): EventListener[] {
  const listener = (eventName, callback) => ({
    name: eventName,
    callback,
  });
  return [
    listener('checking-for-update', () => setState('checking')),
    listener('update-not-available', () => setState('notAvailable')),
    listener('error', () => setState('error')),
    // NOTE(gnewman): download-progress may not fire when the differential
    // download is small
    // (https://github.com/electron-userland/electron-builder/issues/4919)
    listener('download-progress', () => setState('downloading')),
    listener('update-downloaded', () => setState('downloaded')),
  ];
}

function useUpdateState(): UpdateState {
  const [state, setState] = useState<UpdateState>('notAvailable');

  useEffect(() => {
    if (!ipcRenderer) {
      // We are debugging in the browser, so let's disable this stuff
      return;
    }

    const listeners = createListeners(setState);
    console.log(listeners);
    _.each(listeners, ({ name, callback }) => ipcRenderer.on(name, callback));

    ipcRenderer.send('check-for-updates');

    return () => {
      _.each(listeners, ({ name, callback }) =>
        ipcRenderer.removeListener(name, callback)
      );
    };
  }, []);

  return state;
}

function UpdateStatus({ state }: { state: UpdateState }) {
  return state === 'checking' ? (
    <Callout icon="automatic-updates" style={{ fontStyle: 'italic' }}>
      Checking for updates...
    </Callout>
  ) : state === 'downloading' ? (
    <Callout
      icon="automatic-updates"
      intent="success"
      style={{ display: 'flex' }}
    >
      <div style={{ position: 'relative', width: '100%', top: 6 }}>
        <ProgressBar intent="success" />
      </div>
      <span style={{ marginLeft: 4, fontStyle: 'italic' }}>Downloading...</span>
    </Callout>
  ) : state === 'downloaded' ? (
    <Callout icon="download" intent="success" style={{ display: 'flex' }}>
      Update downloaded successfully!{' '}
      <Button
        intent="success"
        minimal
        style={{ marginLeft: 'auto', minHeight: 'initial' }}
        onClick={() => ipcRenderer.send('quit-and-install')}
      >
        Install and quit
      </Button>
    </Callout>
  ) : state === 'notAvailable' ? (
    <Callout icon="automatic-updates" style={{ display: 'flex' }}>
      <span style={{ fontStyle: 'italic' }}>No updates available</span>{' '}
      <Button
        minimal
        intent="success"
        style={{ marginLeft: 'auto', minHeight: 'initial' }}
        onClick={() => ipcRenderer.send('check-for-updates')}
      >
        Check for updates
      </Button>
    </Callout>
  ) : state === 'error' ? (
    <Callout icon="error" intent="danger">
      An error occurred while downloading the update!
    </Callout>
  ) : (
    <span>Unknown update state...</span>
  );
}

export default function Help() {
  const updateState = useUpdateState();

  return (
    <Popover
      popoverClassName={Classes.POPOVER_CONTENT_SIZING + ' custom-boi'}
      modifiers={{
        arrow: { enabled: true },
        flip: { enabled: true },
        keepTogether: { enabled: true },
        preventOverflow: { enabled: true },
      }}
    >
      <Button minimal style={{ position: 'relative', padding: 5 }}>
        <Icon icon="help" />
        {updateState === 'downloaded' && (
          <>
            <Icon
              icon="dot"
              iconSize={20}
              style={{
                color: Colors.DARK_GRAY5,
                position: 'absolute',
                bottom: 11,
                right: 1,
              }}
            />
            <Icon
              icon="dot"
              style={{
                color: Colors.GREEN5,
                position: 'absolute',
                bottom: 13,
                right: 3,
              }}
            />
          </>
        )}
      </Button>
      <div>
        <div style={{ display: 'flex', flexDirection: 'row' }}>
          <H4>Welcome to Cedar!</H4>
          <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>
            v{getEnv('VERSION')}
          </span>
        </div>
        <Callout
          title="Development status"
          icon="updated"
          intent="success"
          style={{ marginBottom: 10 }}
        >
          Cedar is currently in the{' '}
          <span style={{ fontWeight: 'bold' }}>alpha</span> stage of
          development, which means it is not yet feature-complete and may
          contain some bugs. I am working hard to make Cedar the best it can be,
          but that takes lots of time and lots of testing. Thank you for helping
          me with this!
        </Callout>
        <Callout
          title="Report a bug"
          icon="issue"
          intent="warning"
          style={{ marginBottom: 10 }}
        >
          Bugs happen to the best of us. If you encounter one, I would greatly
          appreciate it if you would{' '}
          <a
            href="https://github.com/gasnew/cedar/issues/new"
            target="_blank"
            rel="noopener noreferrer"
          >
            file a bug report
          </a>. Writing a detailed bug report is one of the best ways you can
          help contribute to Cedar's development.
        </Callout>
        <Callout
          title="Support this project"
          icon="bank-account"
          intent="primary"
        >
          lalalalal
        </Callout>
        <Divider />
        <UpdateStatus state={updateState} />
      </div>
    </Popover>
  );
}
