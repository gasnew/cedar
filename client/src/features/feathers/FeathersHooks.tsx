import { ServiceMethods } from '@feathersjs/feathers';
import { FeathersError } from '@feathersjs/errors';
import _ from 'lodash';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

import { FeathersContext } from './FeathersProvider';
import { ServiceTypes } from '../../../../api/src/declarations';
import { selectRoom } from '../../features/room/roomSlice';
import { useInterval } from '../../app/util';

// TODO: Reduce code duplication in this file

// Given a Cedar service (e.g., RoomService), get the Model (data) type (e.g.,
// RoomMeta). For example, this is the RoomService type declaration:
//   type RoomService = Partial<ServiceMethods<RoomMeta>>;
type ExtractData<Service> = Service extends Partial<ServiceMethods<infer T>>
  ? T
  : never;

/* ---- BEGIN CREATE HOOK ---- */
interface CreateResult<Data> {
  called: boolean;
  loading: boolean;
  error: FeathersError | null;
  data: Data | null;
}
type CreateResultTuple<Data> = [
  (
    Data?,
    object?
  ) => Promise<{ data: Data | null; error: FeathersError | null }>,
  CreateResult<Data>
];

/**
 * A hook for Cedar CREATE (POST) endpoints.
 *
 * @param serviceName  The service name in lowercase (usually corresponds to
 * API URI path), e.g., 'room'
 * @param requestData  The full object to create, e.g., RoomMeta object
 */
export function useCreate<T extends keyof ServiceTypes>(
  serviceName: T,
  requestData: Partial<ExtractData<ServiceTypes[T]>>
): CreateResultTuple<ExtractData<ServiceTypes[T]>> {
  const app = useContext(FeathersContext);
  const room = useSelector(selectRoom);
  const [called, setCalled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<FeathersError | null>(null);
  const [data, setData] = useState<any>(null);

  const callCreate = async (
    trueRequestData: Partial<ExtractData<ServiceTypes[T]>> = {},
    queryData: object = {}
  ) => {
    setCalled(true);
    setLoading(true);
    try {
      const data = (await app.service(serviceName).create!(
        _.isEmpty(trueRequestData) ? requestData : trueRequestData,
        {
          query: {
            roomId: room.id,
            ...queryData,
          },
        }
      )) as ExtractData<ServiceTypes[T]>;
      setData(data);
      setError(null);
      setLoading(false);
      return { data, error: null };
    } catch (error) {
      setError(error);
      setLoading(false);
      return { data: null, error };
    }
  };

  return [callCreate, { called, loading, error, data }];
}
/* ---- END CREATE HOOK ---- */

/* ---- BEGIN PATCH HOOK ---- */
interface PatchResult<Data> {
  called: boolean;
  loading: boolean;
  error: FeathersError | null;
  data: Data | null;
}
type PatchResultTuple<Data> = [
  (string, Data) => Promise<{ data: Data | null; error: FeathersError | null }>,
  PatchResult<Data>
];

/**
 * A hook for Cedar PATCH endpoints.
 *
 * @param serviceName  The service name in lowercase (usually corresponds to
 * API URI path), e.g., 'room'
 * @param requestData  The full object to patch, e.g., RoomMeta object
 */
export function usePatch<T extends keyof ServiceTypes>(
  serviceName: T,
  id: string = '',
  requestData: Partial<ExtractData<ServiceTypes[T]>> = {},
  optimized: boolean = false
): PatchResultTuple<ExtractData<ServiceTypes[T]>> {
  const app = useContext(FeathersContext);
  const room = useSelector(selectRoom);
  const [called, setCalled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<FeathersError | null>(null);
  const [data, setData] = useState<any>(null);

  const callPatch = async (
    trueId: string = '',
    trueRequestData: Partial<ExtractData<ServiceTypes[T]>> = {}
  ) => {
    if (!optimized) {
      setCalled(true);
      setLoading(true);
    }
    try {
      const data = (await app.service(serviceName).patch!(
        trueId || id,
        _.isEmpty(trueRequestData) ? requestData : trueRequestData,
        { query: { roomId: room.id } }
      )) as ExtractData<ServiceTypes[T]>;
      if (!optimized) {
        setData(data);
        setError(null);
        setLoading(false);
      }
      return { data, error: null };
    } catch (error) {
      if (!optimized) {
        setError(error);
        setLoading(false);
      }
      return { data: null, error };
    }
  };

  return [callPatch, { called, loading, error, data }];
}
/* ---- END PATCH HOOK ---- */

/* ---- BEGIN LAZY GET HOOK ---- */
interface LazyGetResult<Data> {
  called: boolean;
  loading: boolean;
  error: FeathersError | null;
  data: Data | null;
}
type LazyGetResultTuple<Data> = [
  () => Promise<{ data: Data | null; error: FeathersError | null }>,
  LazyGetResult<Data>
];

/**
 * A hook for Cedar GET (GET) endpoints.
 *
 * @param serviceName  The service name in lowercase (usually corresponds to
 * API URI path), e.g., 'room'
 * @param id  The id for the object to get, e.g., 'abc-123'
 */
export function useLazyGet<T extends keyof ServiceTypes>(
  serviceName: T,
  id: number | string
): LazyGetResultTuple<ExtractData<ServiceTypes[T]>> {
  const app = useContext(FeathersContext);
  const room = useSelector(selectRoom);
  const [called, setCalled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<FeathersError | null>(null);
  const [data, setData] = useState<any>(null);

  const callGet = useCallback(
    async () => {
      setCalled(true);
      setLoading(true);
      try {
        const data = (await app.service(serviceName).get!(id, {
          query: { roomId: room.id },
        })) as ExtractData<ServiceTypes[T]>;
        setData(data);
        setError(null);
        setLoading(false);
        return { data, error: null };
      } catch (error) {
        setError(error);
        setLoading(false);
        return { data: null, error };
      }
    },
    [app, id, serviceName, room]
  );

  return [callGet, { called, loading, error, data }];
}
/* ---- END LAZY GET HOOK ---- */

/* ---- BEGIN GET HOOK ---- */
interface GetResult<Data> {
  loading: boolean;
  error: FeathersError | null;
  data: Data | null;
}
interface GetOptions<Data> {
  pollingInterval: number;
  onUpdate: (Data) => any;
}

/**
 * A hook for Cedar GET (GET) endpoints.
 *
 * @param serviceName  The service name in lowercase (usually corresponds to
 * API URI path), e.g., 'room'
 * @param id  The id for the object to get, e.g., 'abc-123'
 */
export function useGet<T extends keyof ServiceTypes>(
  serviceName: T,
  id: number | string,
  options: GetOptions<ExtractData<ServiceTypes[T]>> = {
    pollingInterval: 1000,
    onUpdate: _ => null,
  },
  optimized: boolean = false
): GetResult<ExtractData<ServiceTypes[T]>> {
  const app = useContext(FeathersContext);
  const room = useSelector(selectRoom);
  const [loading, setLoading] = useState<boolean>(false);
  // Used for when useGet is optimized
  const loadingRef = useRef<boolean>(false);
  const [error, setError] = useState<FeathersError | null>(null);
  const [data, setData] = useState<any>(null);

  useInterval(async () => {
    // Skip if we already have a request out
    if (loading || loadingRef.current) return;

    if (!optimized) setLoading(true);
    loadingRef.current = true;
    try {
      const newData = (await app.service(serviceName).get!(id, {
        query: { roomId: room.id },
      })) as ExtractData<ServiceTypes[T]>;
      if (options.onUpdate) options.onUpdate(newData);
      if (!optimized) {
        setData(newData);
        setError(null);
        setLoading(false);
      }
      loadingRef.current = false;
      return { data, error: null };
    } catch (error) {
      if (!optimized) {
        setError(error);
        setLoading(false);
      }
      loadingRef.current = false;
      return { data: null, error };
    }
  }, options.pollingInterval);

  return { loading, error, data };
}
/* ---- END GET HOOK ---- */

/* ---- BEGIN LAZY FIND HOOK ---- */
interface LazyFindResult<Data> {
  called: boolean;
  loading: boolean;
  error: FeathersError | null;
  data: Data | null;
}
type LazyFindResultTuple<Data> = [
  (
    queryData: object
  ) => Promise<{ data: Data | null; error: FeathersError | null }>,
  LazyFindResult<Data>
];

/**
 * A hook for Cedar "find" (GET) endpoints.
 *
 * @param serviceName  The service name in lowercase (usually corresponds to
 * API URI path), e.g., 'room'
 * @param id  The id for the object to get, e.g., 'abc-123'
 */
export function useLazyFind<T extends keyof ServiceTypes>(
  serviceName: T
): LazyFindResultTuple<ExtractData<ServiceTypes[T]>> {
  const app = useContext(FeathersContext);
  const room = useSelector(selectRoom);
  const [called] = useState<boolean>(false);
  const [loading] = useState<boolean>(false);
  const [error] = useState<FeathersError | null>(null);
  const [data] = useState<any>(null);

  const callFind = async (queryData: object = {}) => {
    try {
      const data = (await app.service(serviceName).find!({
        query: {
          roomId: room.id,
          ...queryData,
        },
      })) as ExtractData<ServiceTypes[T]>;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  return [callFind, { called, loading, error, data }];
}
/* ---- END LAZY FIND HOOK ---- */

/* ---- BEGIN FIND HOOK ---- */
interface FindResult<Data> {
  loading: boolean;
  error: FeathersError | null;
  data: Data | null;
}
interface FindOptions<Data> {
  pollingInterval: number;
  onUpdate: (Data) => any;
}

/**
 * A hook for Cedar FIND (GET) endpoints.
 *
 * @param serviceName  The service name in lowercase (usually corresponds to
 * API URI path), e.g., 'room'
 * @param id  The id for the object to find, e.g., 'abc-123'
 */
export function useFind<T extends keyof ServiceTypes>(
  serviceName: T,
  options: GetOptions<ExtractData<ServiceTypes[T]>> = {
    pollingInterval: 1000,
    onUpdate: _ => null,
  },
  optimized: boolean = false
): GetResult<ExtractData<ServiceTypes[T]>> {
  const app = useContext(FeathersContext);
  const room = useSelector(selectRoom);
  const [loading, setLoading] = useState<boolean>(false);
  const loadingRef = useRef<boolean>(false);
  const [error, setError] = useState<FeathersError | null>(null);
  const [data, setData] = useState<any>(null);

  useInterval(async () => {
    // Skip if we already have a request out
    if (loading || loadingRef.current) return;

    if (!optimized) {
      setLoading(true);
    }
    loadingRef.current = true;
    try {
      const newData = (await app.service(serviceName).find!({
        query: { roomId: room.id },
      })) as ExtractData<ServiceTypes[T]>;
      if (options.onUpdate) options.onUpdate(newData);
      if (!optimized) {
        setData(newData);
        setError(null);
        setLoading(false);
      }
      loadingRef.current = false;
      return { data, error: null };
    } catch (error) {
      if (!optimized) {
        setError(error);
        setLoading(false);
      }
      loadingRef.current = false;
      return { data: null, error };
    }
  }, options.pollingInterval);

  return { loading, error, data };
}
/* ---- END FIND HOOK ---- */

/* ---- BEGIN SUBSCRIBE HOOK ---- */
type OnUpdate<Data> = (Data) => any;

/**
 * A hook for subscribing to Cedar services.
 *
 * @param serviceName  The service name in lowercase (usually corresponds to
 * API URI path), e.g., 'room'
 */
export function useSubscription<T extends keyof ServiceTypes>(
  serviceName: T,
  event: 'created',
  onUpdate: OnUpdate<ExtractData<ServiceTypes[T]>>
): void {
  const app = useContext(FeathersContext);

  useEffect(
    () => {
      const service = app.service(serviceName);
      service.on(event, onUpdate);

      return () => {
        service.removeListener(event, onUpdate);
      }
    },
    [app, serviceName, event, onUpdate]
  );
}
/* ---- END SUBSCRIBE HOOK ---- */
