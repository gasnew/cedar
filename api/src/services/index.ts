import { Application } from '../declarations';
import users from './users/users.service';
import audio from './audio/audio.service';

export default function (app: Application) {
  app.configure(users);
  app.configure(audio);
}
