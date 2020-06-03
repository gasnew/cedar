import { Application } from '../declarations';
import audio from './audio/audio.service';
import musicians from './musicians/musicians.service'
import rooms from './rooms/rooms.service'

export default function (app: Application) {
  app.configure(rooms);
  app.configure(audio);
  app.configure(musicians);
}
