
function Game (player) {
  this.player = player;
  this.players = {};
  this.particles = [];
}

Game.prototype = {
  addParticles: function (x, y) {
    var p = new cParticleSystem();
    var H = window.innerHeight;
    p.position = Vector.create(x-H/30, y-H/20);
    p.startColourRandom = [ 255, 255, 255, 1 ];
    p.endColourRandom = [ 255, 255, 255, 1 ];
    p.duration = 500;
    p.maxParticles = 20;
    p.lifeSpan = 300;
    p.lifeSpanRandom = 100;
    
    p.gravity = Vector.create(H/10000, H/800);
    p.positionRandom = Vector.create(H/100, H/100);
    p.size = 0.08*H;
    p.sizeRandom = p.size / 2;
    p.speed = 0.01*H;
    p.speedRandom = p.speed / 2;
    p.init();
    this.particles.push(p);
  },

  updateParticles: function () {
    this.particles = _.filter(this.particles, function (p) {
      return p.particleCount > 0;
    });
    console.log(this.particles.length);
  },

  start: function () {
    this.network = new Network(WEBSOCKET_URL.replace("USERNAME", encodeURIComponent(this.player.name)), _.bind(this.onServerMessage, this), _.bind(this.onServerError, this));
    return this.network.connect().then(_.bind(function (network) {
      return this;
    }, this));
  },

  displayAloneMessage: function () {
    document.getElementById("alone").style.display = "block";
  },

  hideAloneMessage: function () {
    document.getElementById("alone").style.display = "none";
  },

  handles: {
    join: function (args, username) {
      if (username != this.player.name) {
        if (!this.nbPlayers) this.hideAloneMessage();
        var player = new Player(username, "yellow");
        player.move(Vec2.duck(args.position));
        this.players[username] = player;
        this.nbPlayers ++;
      }
    },
    quit: function (a, username) {
      this.nbPlayers --;
      if (!this.nbPlayers) this.displayAloneMessage();
      delete this.players[username];
    },
    init: function (args) {
     this.nbPlayers = 0; 
      for (var username in args.players) {
        var playerData = args.players[username];
        var position = Vec2.duck(playerData.position);
        var player = new Player(username, "yellow");
        player.move(position);
        player.score = playerData.score;
        this.players[username] = player;
        this.nbPlayers ++;
      }
      if (!this.nbPlayers) this.displayAloneMessage();
    },
    touched: function (username) {
      var player = this.playerByName(username);
      if (player !== this.player) {
        this.addParticles(player.position.x*window.innerWidth, player.position.y*window.innerHeight);
      }
      player.lastTouch = +new Date();
    },
    player: function (data, username) {
      var position = Vec2.duck(data.position);
      var player = this.playerByName(username);
      player.score = data.score;
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
    var color = 50*(1-Math.min(2000, +new Date() - (this.player.lastTouch || 0))/2000)
    this.player.color = "hsl("+color+", 100%, 50%)";
    _.each(this.particles, function (p) {
      p.update(delta);
    });
    if (this.particles.length)
      this.updateParticles();
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
    var light = 50*(1-Math.min(200, +new Date() - (this.player.lastTouch || 0))/200);
    ctx.fillStyle = "hsl(0, 0%, "+light+"%)";
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    _.each(this.particles, function (p) {
      p.render(ctx);
    });
    ctx.restore();

    _.each(this.players, function (player) {
      player.render(ctx);
    });
    this.player.render(ctx);
  }
};
