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
to see how things are working. For example, this is how you would set up a room
and add a couple of musicians to it:

```
# Create the room, using jq to get the room ID
roomId=$(http POST localhost:3030/rooms name=test-room | jq -r .id)

# Check out the room you just made!
http localhost:3030/rooms/$roomId

# Add a couple musicians
http POST localhost:3030/musicians roomId==$roomId name="Sally Oboe"
http POST localhost:3030/musicians roomId==$roomId name="Bobby Tuba"

# Check out the musicians you just made!
http localhost:3030/musicians roomId==$roomId
```

## API Schema validation

TODO: Fill out this section. We use JSON schema.

## Redis key format

## Testing

Simply run `yarn test` and all your tests in the `test/` directory will be run.

## Help

For more information on all the things you can do with Feathers visit
[docs.feathersjs.com](http://docs.feathersjs.com).

## Known bugs

* Tedis does not reconnect to the Redis server when the Redis server dies :(
  (this is fine for dev work but is a deal-breaker for real prod stuff--should
  figure this out eventually). We may want to switch to something like
  [async-redis](https://www.npmjs.com/package/async-redis)
