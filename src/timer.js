
var timer = {

  clock: TWEEN,

  now: Date.now,

  interval: 5000,

  // One Day Resolution
  resolution: 1000 * 60 * 60 * 24,

  // Get an index based on day of the year.
  getIndex: function(limit) {
    var index = Math.floor(timer.now() / timer.resolution);
    if (limit) {
      index = index % limit;
    }
    return index;
  }

};
