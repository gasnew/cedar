import Ajv from 'ajv';
import { validateSchema } from 'feathers-hooks-common';

export default {
  before: {
    all: [],
    find: [],
    get: [],
    create: validateSchema(
      {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1 },
        },
      },
      Ajv
    ),
    update: [],
    patch: [],
    remove: [],
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: [],
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: [],
  },
};
