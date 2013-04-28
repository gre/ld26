(function () {

  var canvas = document.getElementById("viewport");
  var ctx = canvas.getContext("2d");

  var username = /*prompt("What is your username?") ||*/ "p"+Math.random().toFixed(2).substring(2);
  console.log("hello", username);
  var player = new Player(username);

  new Game(player).start().then(function (game) {

    // Game loop
    var startT = +new Date();
    var lastT = startT;
    function update () {
      var now = +new Date();
      var delta = now - lastT;
      var time = now - startT;
      lastT = now;
      game.update(time, delta);
    }

    function render () {
      game.render(ctx);
    }

    requestAnimationFrame(function loop () {
      requestAnimationFrame(loop, canvas);
      update();
      render();
    }, canvas);

    // Window resize
    function resize () {
      var w = window.innerWidth, h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    }
    resize();
    window.addEventListener("resize", resize, false);

    // User events

    function angleForPosition (x, y) {
      return Math.atan2(y, x);
    }

    function angleForRelativePosition (x, y) {
      x -= window.innerWidth/2;
      y -= window.innerHeight/2;
      return angleForPosition(x, y);
    }

    if ("ontouchstart" in document) {
      var currentTouch = null;
      window.addEventListener("touchstart", function (e) {
        e.preventDefault();
        if (currentTouch) return;
        var touch = currentTouch = e.changedTouches[0];
        var angle = angleForRelativePosition(touch.clientX, touch.clientY);
        game.movePlayer(angle);
      });
      window.addEventListener("touchmove", function (e) {
        if (!currentTouch) return;
        var touch = _.find(e.changedTouches, function (t) {
          return t.identifier == currentTouch.identifier;
        });
        if (touch) {
          game.movePlayer(touch.clientX, touch.clientY);
        }
      });
      window.addEventListener("touchend", function (e) {
        if (!currentTouch) return;
        var touch = _.find(e.changedTouches, function (t) {
          return t.identifier == currentTouch.identifier;
        });
        if (touch) {
          currentTouch = null;
        }
      });
      window.addEventListener("touchcancel", function (e) {
        if (!currentTouch) return;
        currentTouch = null;
      });
    }
    else {
      var mousedown = false;
      window.addEventListener("mousedown", function (e) {
        mousedown = true;
      });
      window.addEventListener("mousemove", function (e) {
        game.movePlayer(e.clientX, e.clientY);
      });
      window.addEventListener("mouseup", function (e) {
        if (!mousedown) return;
        mousedown = false;
      });


    }
  })
  .done();

}());
