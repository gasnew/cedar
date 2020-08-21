# Cedar API

> An HTTP/WebSocket REST API for rapidly sending and receiving Cedar audio data

## About

This project uses [Feathers](http://feathersjs.com), an open source web
framework for building modern real-time applications that is touted as
transport-agnostic. This means we can define each REST endpoint once but get to
call into it using both HTTP (via [express](https://expressjs.com/)) and
WebSocket (via [Socket.io](https://socket.io/)). This repo was originally built
with the [Feathers
CLI](https://docs.feathersjs.com/guides/basics/generator.html), which can serve
other useful functions such as generating service templates and setting up
authentication.

This directory contains the Cedar backend, an HTTP/WebSocket API for running
CRUD operations on and hooking into events related to rooms, musicians, audio,
etc. We use Redis as a database because it is very fast and scalable, at the
expense of being extremely permissible DB-schema-wise. One goal of the layout
of this repo (namely using TypeScript and defining our own Redis client
interface) is to help us impose some structure on the data from the application
level.

## Getting started

1. Make sure you have [NodeJS](https://nodejs.org/),
   [yarn](https://yarnpkg.com/getting-started/install), and
   [redis](https://redis.io/) installed.

2. Install your dependencies

    ```
    cd path/to/cedar/api
    yarn install
    ```

3. Start the Redis (our in-memory database) server in the background. TODO:
   Make a single command that manages both the Redis and Node servers.

    ```
    redis-server > /dev/null 2>&1 &
    ```

4. Start your Feathers app in "dev mode." This will watch source files and
   recompile (TS -> JS) and restart the web server when any of them changes.

    ```
    yarn start
    ```

## Development process

I use [eslint](https://eslint.org/) in vim to catch TypeScript errors and
things as I type. We don't have autoformatting setup yet for this repo, so I
run [prettier](https://prettier.io/) from my editor to format as I go.

If there are a bunch of TypeScript/compilation errors to look at, just run
`yarn build` to see them all printed nicely in your terminal.

## Calling the API

I've been using [httpie](https://httpie.org/) for sending requests to the API
to see how things are working. For example, this is how you would set up a room,
add a couple of musicians to it, and start a recording:

```bash
# Create the room, using jq to get the room ID
roomId=$(http POST localhost:3030/rooms name=test-room | jq -r .id)

# Check out the room you just made!
http localhost:3030/rooms/$roomId

# Add a couple musicians
http POST localhost:3030/musicians roomId==$roomId name="Sally Oboe"
http POST localhost:3030/musicians roomId==$roomId name="Bobby Tuba"

# Check out the musicians you just made!
http localhost:3030/musicians roomId==$roomId

# Create a new recording
trackIds=($(http POST localhost:3030/recordings roomId==$roomId | jq -r ".trackIds[]"))

# Send some audio data to the tracks
cursor=$(http PATCH localhost:3030/tracks/${trackIds[1]} roomId==$roomId cursor= data:='["abc", "def"]' | jq -r .cursor)
cursor=$(http PATCH localhost:3030/tracks/${trackIds[1]} roomId==$roomId cursor=$cursor data:='["ghi"]' | jq -r .cursor)
http PATCH localhost:3030/tracks/${trackIds[2]} roomId==$roomId cursor= data:='["hello world"]'

# Fetch all audio from the tracks
http "localhost:3030/tracks?cursorsByTrack[${trackIds[1]}]=&cursorsByTrack[${trackIds[2]}]=" roomId==$roomId

# Send a little more data, and just fetch the new data
http PATCH localhost:3030/tracks/${trackIds[1]} roomId==$roomId cursor=$cursor data:='["some", "new", "data"]'
http "localhost:3030/tracks?cursorsByTrack[${trackIds[1]}]=$cursor" roomId==$roomId
```

## Audio streaming approach

In the above example, we created a new recording, which generates a track for
each musician in the room. Each track, then, corresponds one-to-one with what
is called a [Redis stream](https://redis.io/topics/streams-intro). Redis
streams are a streaming technology originally inspired by Kafka that lets us do
many amazing things with data, but for our purposes, we use it to append audio
data to a stream and read audio data from certain time points along the stream.
The main benefits this affords us is that Redis streams are optimized for
querying a range of data with `XRANGE`, and Redis can automatically free up
memory used by old data, so we can have streams with arbitrary duration. In
Cedar land, this means we can have recordings that can run arbitrarily long,
and we can minimize the amount of audio data being passed across the network. A
basic sequence of Redis commands in a Cedar room may look like this:

```bash
# Client 1 adds audio data
XADD room-1:track-1 * data-chunk-1
# -> 123-0

# Client 2 reads ALL client 1 audio data
XRANGE room-1:track-1 - +
# -> 123-0, data-chunk-1

# Client 1 adds some more audio data
XADD room-1:track-1 * data-chunk-2, data-chunk-3
# -> 201-0
XADD room-1:track-1 * data-chunk-4
# -> 202-0

# Client 2 reads client 1 audio data from the last time point (cursor)
XRANGE room-1:track-1 123-1 +
# -> 202-0, data-chunk-2, data-chunk-3, data-chunk-4
```

For more information about how we use Redis streams, see their documentation on
[entry IDs](https://redis.io/topics/streams-intro#entry-ids) and [querying by
range](https://redis.io/topics/streams-intro#querying-by-range-xrange-and-xrevrange).

## API Schema validation

TODO: Fill out this section. We use JSON schema.

## Redis key format

## Testing

Simply run `yarn test` and all your tests in the `test/` directory will be run.

## Help

For more information on all the things you can do with Feathers visit
[docs.feathersjs.com](http://docs.feathersjs.com).

## Known bugs

* **[FIXED]** Tedis does not reconnect to the Redis server when the Redis
  server dies :( (this is fine for dev work but is a deal-breaker for real prod
  stuff--should figure this out eventually). We may want to switch to something
  like [async-redis](https://www.npmjs.com/package/async-redis)
