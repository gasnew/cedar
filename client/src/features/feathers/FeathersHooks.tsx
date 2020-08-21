import { ServiceMethods } from '@feathersjs/feathers';
import { FeathersError } from '@feathersjs/errors';
import { useContext, useState } from 'react';

import { FeathersContext } from './FeathersProvider';
import { ServiceTypes } from '../../../../api/src/declarations';

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
  () => Promise<{ data: Data | null; error: FeathersError | null }>,
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
  const [called, setCalled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<FeathersError | null>(null);
  const [data, setData] = useState<any>(null);

  const callCreate = async () => {
    setCalled(true);
    setLoading(true);
    try {
      const data = (await app.service(serviceName).create!(
        requestData
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

/* ---- BEGIN GET HOOK ---- */
interface GetResult<Data> {
  called: boolean;
  loading: boolean;
  error: FeathersError | null;
  data: Data | null;
}
type LazyGetResultTuple<Data> = [
  () => Promise<{ data: Data | null; error: FeathersError | null }>,
  GetResult<Data>
];

/**
 * A hook for Cedar GET (GET) endpoints.
 *
 * @param serviceName  The service name in lowercase (usually corresponds to
 * API URI path), e.g., 'room'
 * @param id  The id for the objedt to get, e.g., 'abc-123'
 */
export function useLazyGet<T extends keyof ServiceTypes>(
  serviceName: T,
  id: number | string
): LazyGetResultTuple<ExtractData<ServiceTypes[T]>> {
  const app = useContext(FeathersContext);
  const [called, setCalled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<FeathersError | null>(null);
  const [data, setData] = useState<any>(null);

  const callGet = async () => {
    setCalled(true);
    setLoading(true);
    try {
      const data = (await app.service(serviceName).get!(id)) as ExtractData<
        ServiceTypes[T]
      >;
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

  return [callGet, { called, loading, error, data }];
}
/* ---- END GET HOOK ---- */
