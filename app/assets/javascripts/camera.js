function Camera () {
  this.zoom = 1;
  this.x = 0;
  this.y = 0;
}

Camera.prototype = {
  tileSize: function () {
    return this.zoom;
  },
  track: function (player) {
    this.trackObject = player;
  },
  update: function () {
    this.zoom = Math.round(window.innerHeight / 20);
    this.x = this.trackObject.x;
    this.y = this.trackObject.y;
  },
  applyContext: function (ctx) {
    ctx.translate(window.innerWidth/2, window.innerHeight/2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }
};
