
function Game (player) {
  this.player = player;
  this.players = {};
}

Game.prototype = {
  start: function () {
    this.network = new Network(WEBSOCKET_URL.replace("USERNAME", encodeURIComponent(this.player.name)), _.bind(this.onServerMessage, this), _.bind(this.onServerError, this));
    return this.network.connect().then(_.bind(function (network) {
      network.send("ready");
      return this;
    }, this));
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
    switch (kind) {
      case "init":
        console.log("TODO: init", msg);
        break;
      case "position":
        this.playerByName(username).syncPosition(msg.x, msg.y);
        break;
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
    ctx.restore();
    this.player.render(ctx, camera);
  }
};
