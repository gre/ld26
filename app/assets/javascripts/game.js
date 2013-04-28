
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
    join: function () {},
    init: function (args) {
      this.player.syncPosition(args.position.x, args.position.y);
      this.syncChunkSubscription();
    },
    position: function (p, username) {
      this.playerByName(username).syncPosition(p.x, p.y);
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
    console.log(this.tiles);
    _.each(this.tiles, function (tile) {
    });
    ctx.restore();
    this.player.render(ctx, camera);
  }
};
