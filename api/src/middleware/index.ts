import { Application } from '../declarations';
import trackActiveMusicians from './trackActiveMusicians';

export default function (app: Application) {
  app.configure(trackActiveMusicians);
}
