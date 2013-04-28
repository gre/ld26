function Player (name, color) {
  this.name = name;
  this.color = color || "red";
  this.color2 = color || Color.darker(this.color, 0.8);
  this.position = null;
  this.score = 0;
}

var GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

Player.prototype = {
  move: function (position) {
    this.position = position;
  },
  size: function () {
    return window.innerHeight * CIRCLE_DIST;
  },
  render: function (ctx) {
    if (!this.position) return;
    var x = this.position.x * window.innerWidth;
    var y = this.position.y * window.innerHeight;
    ctx.save();
    var size = this.size();
    ctx.beginPath();
    ctx.fillStyle = this.color;
    ctx.arc(x, y, size, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.strokeStyle = "#000";
    ctx.lineWidth = size * 0.1;
    ctx.arc(x, y, size, 0, Math.PI*2);
    ctx.stroke();

    var scoreSize = size * 0.1;
    ctx.fillStyle = "#000";
    for (var s=1; s<=this.score; ++s) {
      var a = s * GOLDEN_ANGLE;
      var r = Math.sqrt(s/this.score)*size*0.8;
      var delta = new Vec2( Math.cos(a)*r, Math.sin(a)*r );
      ctx.beginPath();
      ctx.arc(x+delta.x, y+delta.y, scoreSize, 0, Math.PI*2);
      ctx.fill();
    }

    ctx.restore();
  }
};
