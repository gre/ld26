function Vec2 (x, y) {
  this.x = x;
  this.y = y;
}

Vec2.duck = function (o) {
  return new Vec2(o.x, o.y);
}

Vec2.prototype = {
  clone: function () {
    return new Vec2(this.x, this.y);
  },
  add: function (v) {
    this.x += v.x;
    this.y += v.y;
  },
  multiply: function (scalar) {
    this.x *= scalar;
    this.y *= scalar;
  },
  dist2: function (p) {
    var dx = p.x-this.x;
    var dy = p.y-this.y;
    return dx*dx+dy*dy;
  }
};

var Color = {
  darker: function (color, factor) {
    var c = document.createElement("canvas");
    c.width = 1;
    c.height = 1;
    var ctx = c.getContext("2d");
    ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1);
    var d = ctx.getImageData(0,0,1,1).data; 
    return "rgb("+[factor*d[0], factor*d[1], factor*d[2]].join(",")+")";
  }
}
