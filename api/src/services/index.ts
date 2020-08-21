import { Application } from '../declarations';
import musicians from './musicians/musicians.service'
import recordings from './recordings/recordings.service'
import rooms from './rooms/rooms.service'
import tracks from './tracks/tracks.service';

export default function (app: Application) {
  app.configure(musicians);
  app.configure(recordings);
  app.configure(rooms);
  app.configure(tracks);
}
