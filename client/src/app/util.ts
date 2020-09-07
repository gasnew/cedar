import _ from 'lodash';
import { useEffect, useRef } from 'react';

import { BIRD_NAMES } from './resources/birdNames';

export function useInterval(callback: () => void, delay: number) {
  const savedCallback = useRef<() => void>();

  // Remember the latest callback.
  useEffect(
    () => {
      savedCallback.current = callback;
    },
    [callback]
  );

  // Set up the interval.
  useEffect(
    () => {
      function tick() {
        if (savedCallback.current) savedCallback.current();
      }
      if (delay !== null) {
        let id = setInterval(tick, delay);
        return () => clearInterval(id);
      }
    },
    [delay]
  );
}

export function randomBirdName() {
  return _.sample(BIRD_NAMES);
}

export function getEnv(variableName: string): string {
  const fullName = `REACT_APP_${variableName}`;
  const variable = process.env[fullName];
  if (!variable) throw new Error(`No environment variable called ${fullName}!`);
  if (!(typeof variable === 'string'))
    throw new Error(`Environment variable ${fullName} is not a string!`);

  return variable;
}
