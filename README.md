Ludum Dare 26, "Minimalism"
=====================================

For this game jam, I've decided to make a minimalist multiplayer exploration game.

The game
--------

[WIP ideas]

Explore alone or with your team in a destructible top-down view world and find the portal of the map.

At the beginning, the map is full of earth, the player can dig the ground to explore more and find some galleries.

When the portal is found, the player gain some experience and is teleported on a new map while the old map is about to be destroyed (~ 1 minutes, other player can still reach the portal before the end of the map, otherwise they will not gain power).

Player experience will make the player more stronger and faster to dig the ground.

Collaborating with other players is essential in the game and will help you to progress faster.

Technology
-------

The game is a web application with:

* CSS + HTML + Canvas (Javascript)
* Play framework 2.1.1 (Scala)
* WebSocket

Target
-----

**Desktop, Mobile and Tablets !**

ROADMAP
=======

[ ] Bootstrap client-side (viewport, bootstrap classes, update/render loop)
[ ] Make basic designs
[ ] Make basic move

Bootstrap Server-side & Client-side:
------

[ ] Make Game()
[ ] Make Player(x, y, angle, power)
[ ] Make basic Camera(player) & Renderer : defined a ratio and make it scalable to the page
[ ] Make Chunk (x, y, w, h, tiles), a crop view of the world which contains tiles.

Tile types:
[ ] Block(x, y, weight)
[ ] Empty(x, y): an explored empty space
[ ] Portal(x, y)

Game Features
-----

[ ] player has an id, a name, a randomly affected color
[ ] player spawn at a spawn point (server send player position)
[ ] player can move (player send its position & angle, first version will override the position)
[ ] create new chunk on move + lazy loading game chunks
[ ] player collides with blocks (basic collision, "stop")
[ ] the spawn point area has some TileEmpty
[ ] blocks are destructible (player send "destructing x y" multiple time, then server send "destructed x y") 
[ ] player connect (x, y) / disconnect event
[ ] player move (x, y, angle, speed) event
[ ] the portal is initialized in a room
[ ] player can reach the portal, gain power, go to a new map
[ ] "portal reached" event received by other players with (remainingSeconds)
[ ] "world end" event when world is destroyed
[ ] some gallery are generated procedurally (make the portal area connected)
[ ] Improve the player move (don't send & override the position)

Bonus
-----

[ ] Players can chat (top of their head)
[ ] glsl post-processing
[ ] Some stats like connected players, ...
[ ] Using a database instead of memory
[ ] Save your player stats
[ ] multiple Game() so there can be multiple games at the same time
