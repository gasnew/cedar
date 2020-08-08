import _ from 'lodash';
import React, { useEffect, useRef } from 'react';

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
