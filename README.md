# Cedar

Cedar is Zoom for musicians. Zero latency. No click track. Just play!

1. **Create** a Cedar room, and invite your musician friends.
2. **Organize** musicians in the Cedar chain.
3. **Perform** live together over the internet!

## Supporting Cedar

Cedar's development is entirely funded by donations. If you like this project,
please consider [becoming a backer on
Patreon](https://www.patreon.com/garrettnewman)!

## Current and upcoming features

* :white_check_mark: Perform and/or rehearse live with musicians anywhere you can
have an internet connection.
* :white_check_mark: Mix room audio in real time.
* :white_large_square: Download recordings made in the Cedar room.
* :white_large_square: Stream multiple tracks for each musician.
* :white_large_square: Chat via voice and text.
* :white_large_square: Play an audio file or metronome as a track.

## Why another online collaboration tool?

There are several approaches to online musical collaboration already:

1. Record everyone separately at different times, then mix them together in
  editing software. A popular example of this is the [Hamilton cast Zoom
  performance](https://www.youtube.com/watch?v=cqvVL8IurMw&ab_channel=SomeGoodNews).
2. Send audio data between all musicians as fast as possible, such as what is
   possible with [JamKazam](https://www.jamkazam.com/).
3. Synchronize musicians to a specific meter, and play with the other
   musician's previous iteration through the set loop, such as with
   [Jamtaba](https://jamtaba-music-web-site.appspot.com/).

However, each has a set of drawbacks:

1. Recording musicians at different times by nature does not support live
   performance or rehearsals.
2. Latency is a big hurdle to overcome when trying to send data to everyone as
   fast as possible and is often insurmountable (more on that in [the "How it
   works" section](#how-it-works)).
3. This requires a metronome and limits song structure choice--i.e., this is
   only suitable for music that repeats over a set interval.

I encourage everyone to use the tool that is right for them, but for me, I
found the current options didn't allow me to make music with my friends the way
I wanted to--live with zero latency and no click track. Therefore, I built
Cedar to make this possible; the next section explains how.

## How it works

Using Cedar will be familiar to anyone who has used a video conferencing app
like Zoom or a VoIP app like Discord: Open up a virtual room for your
activity--in this case, playing music together--and invite people in. But what
sets Cedar apart is that it achieves **zero latency** in musical performance
without requiring a click track. That is where the Cedar musician **chain**
comes in.

Most video conferencing and live music performance/jamming applications send
audio data between all participants as fast as possible--or at least fast
enough that the latency is largely unnoticeable. Unfortunately, there are two
big problems with this approach:

1. [The human ear can distinguish audio latency down to about 10-15
   ms](http://whirlwindusa.com/support/tech-articles/opening-pandoras-box/).
2. [The speed of light is 300,000
   km/s](https://en.wikipedia.org/wiki/Speed_of_light).

As an example, if I live in Boston, and I want to play music with my friend in
Seattle, my audio data has to travel to him and his to me, ~4,000 km each way.
Assuming data travels at the speed of light, the data will take ~13 ms to
travel each leg of the journey. If my friend plays perfectly in-sync with what
he hears me playing, then what I hear is him playing along to what I played
two-times ~13 ms ago, which works out to ~27 ms. That is well above the
threshold where the human ear can start to distinguish latency and is thus a
non-starter for a live performance scenario and, in my opinion, rehearsal
scenarios.

**NOTE:** The above scenario is the ideal case; in reality, as of writing, the
round trip time between Boston and Seattle is ~70 ms [according to
WonderNetwork](https://wondernetwork.com/pings/Boston/Seattle), which is well
beyond the 10-15 ms limit. In fact, the only cities within that limit are less
than 600 km from Boston, which is pretty much just the United States' North
East.

All that to say, while Cedar doesn't solve the problem of how annoyingly slow
light can be, it doesn't attempt to send data **to** every musician **from**
every musician simultaneously. Instead, musicians are conceptually arranged in
a chain, where one person lays down the base track, and each subsequent
musician, in turn, hears a mix of all previous musicians and adds their own
audio to the music chain. The result of this arrangement is that latency
becomes a non-issue, and musicians can perform together in real time.

## Philosophy of development

Cedar is completely free and open source--you can use my app and my code in
pretty much any way you want. I made it this way by design because I want Cedar
to be available to anyone with a computer and an internet connection. This is
why I have a [Patreon](https://www.patreon.com/garrettnewman). It allows me to
realize my vision for the project without putting the app behind a paywall or
subscription or flooding it with ads. In other words, musicians are enabled to
work with Cedar creatively, and I am incentivized to create a valuable product.
Your money helps me pay the costs of running the Cedar service and buys me more
time to work on the project.

## More information

See the [Cedar
guide](https://docs.google.com/document/d/1PVJNlb559fR8R25e_IGvXknX7L8K01HqyJM_XQ0atr8/edit?usp=sharing)
for information on how to use Cedar.

Cedar is composed of two main modules: an API server
([Feathers](http://feathersjs.com) with a [Redis](https://redis.io/) backend)
and a client ([Electron](https://www.electronjs.org/) running a
[React](https://reactjs.org/) app). See the "Getting started" section of each
of the modules for information on how to start running the modules locally.
