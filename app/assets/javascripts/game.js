
function Game (player) {
  this.player = player;
  this.players = {};
}

Game.prototype = {
  start: function () {
    this.network = new Network(WEBSOCKET_URL.replace("USERNAME", encodeURIComponent(this.player.name)), _.bind(this.onServerMessage, this), _.bind(this.onServerError, this));
    return this.network.connect().then(_.bind(function (network) {
      return this;
    }, this));
  },

  handles: {
    join: function (args, username) {
      if (username != this.player.name) {
        var player = new Player(username, "yellow");
        player.move(Vec2.duck(args.position));
        this.players[username] = player;
      }
    },
    quit: function (a, username) {
      delete this.players[username];
    },
    init: function (args) {
      for (var username in args.players) {
        var playerData = args.players[username];
        var position = Vec2.duck(playerData.position);
        var player = new Player(username, "yellow");
        player.move(position);
        player.score = playerData.score;
        this.players[username] = player;
      }
    },
    touched: function (username) {
      var player = this.playerByName(username);
      player.lastTouch = +new Date();
    },
    player: function (data, username) {
      var position = Vec2.duck(data.position);
      var player = this.playerByName(username);
      player.score = data.score;
      console.log(player.score);
      if (this.player.name != username) {
        player.move(position);
      }
    }
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
    var time = +new Date() - TOUCH_INTERVAL;
    _.each(this.players, function (player) {
      var lastTouch = player.lastTouch || 0;
      if (lastTouch < time) {
        player.color = "cyan";
      }
      else {
        player.color = "yellow";
      }
    });
  },

  movePlayer: function (x, y) {
    var self = this;
    var W = window.innerWidth, H = window.innerHeight;
    var player = this.player;
    var p = new Vec2(x / W, y / H);
    this.network.send("move", p);
    player.move(p);
    var size2 = player.size(); size2 *= size2;
    var playerRealPosition = new Vec2(x, y);
    _(this.players)
      .filter(function (p) {
        if (p.lastTouch >  +new Date() - TOUCH_INTERVAL) return false;
        var realPosition = new Vec2(p.position.x*W, p.position.y*H);
        return realPosition.dist2(playerRealPosition) < CIRCLE_DIST2*H*H;
      })
      .each(function (p) {
        self.network.send("touch", p.name);
      })
      .value();
  },

  render: function (ctx) {
    var w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.save();
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    _.each(this.players, function (player) {
      player.render(ctx);
    });
    this.player.render(ctx);
  }
};
