function Network (url, onMessage, onError) {
  this.buffer = [];
  this.url = url;
  this.reconnectionDelay = 500;
  this.pushRate = 100;
  this.eventHandler = onMessage;
  this.errorHandler = onError;
}

Network.prototype = {
  connect: function () {
    this.deferConnection = Q.defer();
    this.reconnectionDelay *= 1.5;
    try {
      this.socket = new WebSocket(this.url);
      this.socket.onopen = _.bind(this.onopen, this); 
      this.socket.onclose = _.bind(this.onclose, this);
      this.socket.onmessage = _.bind(this.onmessage, this);
      this.socket.onerror = _.bind(this.onerror, this);
    }
    catch (e) {
      document.getElementById("unsupported").style.display = "block";
    }
    return this.deferConnection.promise;
  },
  onopen: function (e) {
    this.deferConnection.resolve(this);
    this.connected = true;
  },
  onclose: function (e) {
    console.log("disconnected. trying to reconnect...");
    this.errorHandler("disconnected");
    this.connected = false;
    var reconnect = _.bind(this.connect, this);
    Q.delay(this.reconnectionDelay).then(reconnect);
  },
  onmessage: function (e) {
    var msg = JSON.parse(e.data);
    if (msg.error) {
      this.errorHandler(msg.error);
    }
    else {
      this.eventHandler(msg.k, msg.m, msg.u);
    }
  },
  onerror: function (e) {
    this.errorHandler(e.reason);
  },

  send: function (kind, msg) {
    if (this.connected) {
      this.socket.send(JSON.stringify({ k: kind, m: msg }));
    }
  }
};
