import { Application } from '../declarations';
import tracks from './tracks/tracks.service';
import musicians from './musicians/musicians.service'
import rooms from './rooms/rooms.service'

export default function (app: Application) {
  app.configure(rooms);
  app.configure(musicians);
  app.configure(tracks);
}
