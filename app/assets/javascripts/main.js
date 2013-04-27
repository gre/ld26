(function () {

  var canvas = document.getElementById("viewport");
  var ctx = canvas.getContext("2d");

  var username = /*prompt("What is your username?") ||*/ "p"+Math.random().toFixed(2).substring(2);
  var player = new Player(username);
  var camera = new Camera();

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
      game.render(ctx, camera);
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

    if ("ontouchstart" in document) {
      window.addEventListener("touchstart", function (e) {
      });
      window.addEventListener("touchmove", function (e) {
      });
      window.addEventListener("touchend", function (e) {
      });
      window.addEventListener("touchcancel", function (e) {
      });
    }
    else {
      window.addEventListener("mousedown", function (e) {
      });
      window.addEventListener("mousemove", function (e) {
      });
      window.addEventListener("mouseup", function (e) {
      });

      var pressed = {
        left: false, 
        right: false, 
        up: false, 
        down: false
      };

      function syncAngle () {
        with (pressed) {
          var x = (left && !right) ? -1 : (right && !left) ? 1 : 0;
          var y = (down && !up) ? 1 : (up && !down) ? -1 : 0;
          if (x || y) {
            var angle = Math.atan2(y, x);
            game.movePlayer(angle);
          }
          else {
            game.stopPlayer();
          }
        }
      }

      window.addEventListener("keydown", function (e) {
        var noChange = false;
        switch (e.keyCode) {
          case 37: // left
            pressed.left = true;
            break;

          case 38: // up
            pressed.up = true;
            break;

          case 39: // right
            pressed.right = true;
            break;

          case 40: // down
            pressed.down = true;
            break;

          default:
            noChange = true;
        }
        if (!noChange) {
          e.preventDefault();
          syncAngle();
        }
      });
      window.addEventListener("keyup", function (e) {
        var noChange = false;
        switch (e.keyCode) {
          case 37: // left
            pressed.left = false;
            break;

          case 38: // up
            pressed.up = false;
            break;

          case 39: // right
            pressed.right = false;
            break;

          case 40: // down
            pressed.down = false;
            break;

          default:
            noChange = true;
        }
        if (!noChange) {
          e.preventDefault();
          syncAngle();
        }
      });
    }
  })
  .done();

}());
