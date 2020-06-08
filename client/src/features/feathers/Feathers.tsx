import feathers, {
  Application as FeathersApp,
  ServiceMethods,
  Service,
} from '@feathersjs/feathers';
import { FeathersError, GeneralError } from '@feathersjs/errors';
import feathersSocketIO from '@feathersjs/socketio-client';
import React, { createContext, useContext, useState } from 'react';
import socketIO from 'socket.io-client';
import { ServiceTypes } from '../../../../api/src/declarations';

export const FeathersContext = createContext<FeathersApp<ServiceTypes>>(
  feathers()
);

export function FeathersProvider({ children }: { children: React.ReactNode }) {
  // Set up Socket.io client with the socket
  const app: FeathersApp<ServiceTypes> = feathers();
  app.configure(feathersSocketIO(socketIO('http://localhost:3030')));

  return (
    <FeathersContext.Provider value={app}>{children}</FeathersContext.Provider>
  );
}

interface Result<Data> {
  loading: boolean;
  error: FeathersError | null;
  data: Data | Data[] | null;
}

type ExtractData<Service> = Service extends Partial<ServiceMethods<infer T>>
  ? T
  : never;
//export function useService<T extends keyof ServiceTypes>(
//serviceName: T,
//method: keyof ServiceMethods<any>,
//requestData: Partial<ExtractData<ServiceTypes[T]>>
//): Result<ExtractData<ServiceTypes[T]>> {
////type Data = ExtractData<ServiceTypes[keyof ServiceTypes]>;
//const app = useContext(FeathersContext);
//const [loading, setLoading] = useState<boolean>(true);
//const [error, setError] = useState<FeathersError | null>(null);
////const [data, setData] = useState<Data | Data[] | null>(null);
//const [data, setData] = useState<any>(null);

//useEffect(
//() => {
//const callService = async () => {
//console.log('huh');
//const service = app.service(serviceName);
//try {
//const data = await app.service(serviceName).create!(requestData);
//setLoading(false);
//setData(data);
//} catch (error) {
//setLoading(false);
//setError(error);
//}
//};

//callService();
//},
//[app, roomId]
//);

//return { loading, error, data };
//}

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
