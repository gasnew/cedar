// Initializes the `users` service on path `/users`
import { Application } from '../../declarations';
import { Id, Params, ServiceMethods } from '@feathersjs/feathers';

interface Audio {
  musicianId: string;
  data: string[];
}

interface QueryParams {
  query: {
    roomId: string;
  };
}

// NOTE(gnewman): If we fail to implement any of the basic service functions
// (e.g., fetch, get, update, etc.), then Feathers will default it to emitting
// a NotImplemented error. We use Partial here so that we don't have to bother
// defining empty methods for the other endpoints.
// https://docs.feathersjs.com/api/services.html#service-methods
type AudioService = Partial<ServiceMethods<Audio>>;

const audio: AudioService = {
  find: async (params: QueryParams) => {
    const roomId = params.query;
    console.log(roomId);
    return [
      {
        musicianId: 'abcd',
        data: ['a', 'b', 'c'],
      },
    ];
  },
  patch: async (roomId: string, audio: Audio) => {
    return [
      {
        musicianId: 'abcd',
        data: ['a', 'b', 'c', ...audio.data],
      },
    ];
  },
};

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    audio: AudioService;
  }
}

export default function(app: Application) {
  // Initialize our service with any options it requires
  app.use('/audio', audio);
}
