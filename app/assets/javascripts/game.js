
function Game (player) {
  this.player = player;
  this.players = {};
  this.chunks = [];
  this.subscriptions = [];
}

Game.prototype = {
  start: function () {
    this.network = new Network(WEBSOCKET_URL.replace("USERNAME", encodeURIComponent(this.player.name)), _.bind(this.onServerMessage, this), _.bind(this.onServerError, this));
    return this.network.connect().then(_.bind(function (network) {
      network.send("ready");
      return this;
    }, this));
  },

  chunkForPosition: function (p) {
    return new Vec2(p.x % CHUNK_SIZE, p.y % CHUNK_SIZE);
  },

  syncChunkSubscription: function () {
    var currentChunk = this.chunkForPosition(this.player.x, this.player.y);
    this.network.send("subscribe_chunk", currentChunk);
  },

  handles: {
    join: function (args, username) {
      if (username !== this.player.name) {
        console.log(args);
        console.log(username, "connected");
        var player = new Player(username, "yellow");
        player.x = args.x;
        player.y = args.y;
        this.players[username] = player;
      }
    },
    quit: function (a, username) {
      console.log(username, "quit");
      delete this.players[username];
    },
    init: function (args) {
      console.log("init", args);
      this.player.syncPosition(args.position.x, args.position.y);
      for (var username in args.players) {
        var p = args.players[username];
        var player = new Player(username, "yellow");
        player.x = p.x;
        player.y = p.y;
        this.players[username] = player;
      }
      this.syncChunkSubscription();
    },
    position: function (p, username) {
      var player = this.playerByName(username);
      if (!player) {
        console.error("player "+username+" is unknown.");
        return;
      }
      if (player === this.player) {
        // FIXME
      }
      else {
        player.syncPosition(p.x, p.y);
      }
    }
  },

  stopPlayer: function () {
    this.player.stop();
  },

  movePlayer: function (angle) {
    this.player.move(angle);
    this.network.send("move", {x:this.player.x, y:this.player.y, angle: angle});
  },

  playerByName: function (name) {
    return this.player.name == name ? 
      this.player : 
      this.players[name];
  },

  onServerMessage: function (kind, msg, username) {
    var handle = this.handles[kind];
    if (handle) {
      handle.call(this, msg, username);
    }
    else {
      console.log("unsupported: ", arguments);
    }
  },

  onServerError: function (error) {
    console.log("Server error: "+error);
  },

  update: function (time, delta) {
    this.player.update(time, delta);
  },

  render: function (ctx, camera) {
    var w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.save();
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, w, h);
    camera.applyContext(ctx);
    _.each(this.tiles, function (tile) {
    });
    ctx.restore();
    _.each(this.players, function (player) {
      player.render(ctx, camera);
    });
    this.player.render(ctx, camera);
  }
};
