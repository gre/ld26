function Camera () {
  this.zoom = 1;
}

Camera.prototype = {
  tileSize: function () {
    return this.zoom * 50;
  }
};
