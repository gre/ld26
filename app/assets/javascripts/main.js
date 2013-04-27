(function () {

  var canvas = document.getElementById("viewport");
  var ctx = canvas.getContext("2d");

  function draw () {
    ctx.fillStyle = "white";
    ctx.font = Math.round(0.1*canvas.width)+"px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Coming soon...", canvas.width/2, canvas.height/2);
  }

  function resize () {
    var w = window.innerWidth, h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;
    draw();
  }

  resize();

  window.addEventListener("resize", resize, false);

}());
