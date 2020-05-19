import { Application } from '../declarations';
import users from './users/users.service';
import audio from './audio/audio.service';
import musicians from './musicians/musicians.service'
import rooms from './rooms/rooms.service'

export default function (app: Application) {
  app.configure(rooms);
  app.configure(users);
  app.configure(audio);
  app.configure(musicians);
}
