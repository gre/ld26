function Player (name) {
  this.name = name;
  this.color = "red";
  this.x = 0;
  this.y = 0;
  this.moving = false;
  this.angle = 0;
}

Player.prototype = {
  move: function (angle) {
    this.moving = true;
    this.angle = angle;
  },
  stop: function () {
    this.moving = false;
  },
  update: function (time, delta) {
    if (this.moving) {
      this.x += Math.cos(this.angle) * delta * 0.1;
      this.y += Math.sin(this.angle) * delta * 0.1;
    }
  },
  render: function (ctx, camera) {
    var playerSize = .8;
    ctx.save();
    camera.applyContext(ctx);
    ctx.fillStyle = this.color;
    ctx.fillRect(
      this.x-playerSize/2,
      this.y-playerSize/2,
      playerSize,
      playerSize
    );
    ctx.restore();
  },
  syncPosition: function (x, y) {
    this.x = x;
    this.y = y;
  }
};
