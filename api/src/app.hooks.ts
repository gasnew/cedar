// Application hooks that run for every service
// Don't remove this comment. It's needed to format import lines nicely.

import _ from 'lodash';

import { HookContext } from '@feathersjs/feathers';
import { GeneralError } from '@feathersjs/errors';

// TODO(gnewman): Fix these--I don't think they're working right now.
function errorHandler(context: HookContext) {
  if (context.error) {
    const { error } = context;
    if (!error.code) {
      // NOTE(gnewman): I pass in error.stack here so we can get nice debugging
      // info when calling the API. We might want to reduce this to just the
      // error message someday (like when we have logging and error tracking
      // set up)
      const newError = new GeneralError(error.stack);
      console.error(`Server error: ${error.stack}`);
      context.error = newError;
      return context;
    }
    if (error.code === 404 || process.env.NODE_ENV === 'production') {
      error.stack = null;
    }
    return context;
  }
}
export default {
  before: {
    all: [],
    find: [],
    get: [],
    create: [],
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
    all: [errorHandler],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: [],
  },
};
