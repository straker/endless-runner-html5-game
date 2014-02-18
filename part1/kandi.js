(function () {
  // define variables
  var canvas = document.getElementById('canvas');
  var ctx = canvas.getContext('2d');
  var player = {};
  var ground = [];
  var platformWidth = 32;
  var platformHeight = canvas.height - platformWidth * 4;

  /**
   * Asset pre-loader object. Loads all images
   */
  var assetLoader = (function() {
    // images dictionary
    this.imgs        = {
      'bg'            : 'imgs/bg.png',
      'sky'           : 'imgs/sky.png',
      'backdrop'      : 'imgs/backdrop.png',
      'backdrop2'     : 'imgs/backdrop_ground.png',
      'grass'         : 'imgs/grass.png',
      'avatar_normal' : 'imgs/normal_walk.png'
    };

    var assetsLoaded = 0;                                // how many assets have been loaded
    var numImgs      = Object.keys(this.imgs).length;    // total number of image assets
    this.totalAssest = numImgs;                          // total number of assets

    /**
     * Ensure all assets are loaded before using them
     * @param {number} dic  - Dictionary name ('imgs', 'sounds', 'fonts')
     * @param {number} name - Asset name in the dictionary
     */
    function assetLoaded(dic, name) {
      // don't count assets that have already loaded
      if (this[dic][name].status !== 'loading') {
        return;
      }

      this[dic][name].status = 'loaded';
      assetsLoaded++;

      // finished callback
      if (assetsLoaded === this.totalAssest && typeof this.finished === 'function') {
        this.finished();
      }
    }

    /**
     * Create assets, set callback for asset loading, set asset source
     */
    this.downloadAll = function() {
      var _this = this;
      var src;

      // load images
      for (var img in this.imgs) {
        if (this.imgs.hasOwnProperty(img)) {
          src = this.imgs[img];

          // create a closure for event binding
          (function(_this, img) {
            _this.imgs[img] = new Image();
            _this.imgs[img].status = 'loading';
            _this.imgs[img].name = img;
            _this.imgs[img].onload = function() { assetLoaded.call(_this, 'imgs', img) };
            _this.imgs[img].src = src;
          })(_this, img);
        }
      }
    }

    return {
      imgs: this.imgs,
      totalAssest: this.totalAssest,
      downloadAll: this.downloadAll
    };
  })();

  assetLoader.finished = function() {
    startGame();
  }

  /**
   * Creates a Spritesheet
   * @param {string} - Path to the image.
   * @param {number} - Width (in px) of each frame.
   * @param {number} - Height (in px) of each frame.
   */
  function SpriteSheet(path, frameWidth, frameHeight) {
    this.image = new Image();
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;

    // calculate the number of frames in a row after the image loads
    var self = this;
    this.image.onload = function() {
      self.framesPerRow = Math.floor(self.image.width / self.frameWidth);
    };

    this.image.src = path;
  }

  /**
   * Creates an animation from a spritesheet.
   * @param {SpriteSheet} - The spritesheet used to create the animation.
   * @param {number}      - Number of frames to wait for before transitioning the animation.
   * @param {array}       - Range or sequence of frame numbers for the animation.
   * @param {boolean}     - Repeat the animation once completed.
   */
  function Animation(spritesheet, frameSpeed, startFrame, endFrame) {

    var animationSequence = [];  // array holding the order of the animation
    var currentFrame = 0;        // the current frame to draw
    var counter = 0;             // keep track of frame rate

    // start and end range for frames
    for (var frameNumber = startFrame; frameNumber <= endFrame; frameNumber++)
      animationSequence.push(frameNumber);

    /**
     * Update the animation
     */
    this.update = function() {

      // update to the next frame if it is time
      if (counter == (frameSpeed - 1))
        currentFrame = (currentFrame + 1) % animationSequence.length;

      // update the counter
      counter = (counter + 1) % frameSpeed;
    };

    /**
     * Draw the current frame
     * @param {integer} x - X position to draw
     * @param {integer} y - Y position to draw
     */
    this.draw = function(x, y) {
      // get the row and col of the frame
      var row = Math.floor(animationSequence[currentFrame] / spritesheet.framesPerRow);
      var col = Math.floor(animationSequence[currentFrame] % spritesheet.framesPerRow);

      ctx.drawImage(
        spritesheet.image,
        col * spritesheet.frameWidth, row * spritesheet.frameHeight,
        spritesheet.frameWidth, spritesheet.frameHeight,
        x, y,
        spritesheet.frameWidth, spritesheet.frameHeight);
    };
  }

  /**
   * Create a parallax background
   */
  var background = (function() {
    var sky   = {};
    var backdrop = {};
    var backdrop2 = {};

    /**
     * Draw the backgrounds to the screen at different speeds
     */
    this.draw = function() {
      ctx.drawImage(assetLoader.imgs.bg, 0, 0);

      // Pan background
      sky.x -= sky.speed;
      backdrop.x -= backdrop.speed;
      backdrop2.x -= backdrop2.speed;

      // draw images side by side to loop
      ctx.drawImage(assetLoader.imgs.sky, sky.x, sky.y);
      ctx.drawImage(assetLoader.imgs.sky, sky.x + canvas.width, sky.y);

      ctx.drawImage(assetLoader.imgs.backdrop, backdrop.x, backdrop.y);
      ctx.drawImage(assetLoader.imgs.backdrop, backdrop.x + canvas.width, backdrop.y);

      ctx.drawImage(assetLoader.imgs.backdrop2, backdrop2.x, backdrop2.y);
      ctx.drawImage(assetLoader.imgs.backdrop2, backdrop2.x + canvas.width, backdrop2.y);

      // If the image scrolled off the screen, reset
      if (sky.x + assetLoader.imgs.sky.width <= 0)
        sky.x = 0;
      if (backdrop.x + assetLoader.imgs.backdrop.width <= 0)
        backdrop.x = 0;
      if (backdrop2.x + assetLoader.imgs.backdrop2.width <= 0)
        backdrop2.x = 0;
    };

    /**
     * Reset background to zero
     */
    this.reset = function()  {
      sky.x = 0;
      sky.y = 0;
      sky.speed = 0.2;

      backdrop.x = 0;
      backdrop.y = 0;
      backdrop.speed = 0.4;

      backdrop2.x = 0;
      backdrop2.y = 0;
      backdrop2.speed = 0.6;
    }

    return {
      draw: this.draw,
      reset: this.reset
    };
  })();

  /**
   * Game loop
   */
  function animate() {
    requestAnimFrame( animate );

    background.draw();

    for (i = 0; i < ground.length; i++) {
      ground[i].x -= player.speed;
      ctx.drawImage(assetLoader.imgs.grass, ground[i].x, ground[i].y);
    }

    if (ground[0].x <= -platformWidth) {
      ground.shift();
      ground.push({'x': ground[ground.length-1].x + platformWidth, 'y': platformHeight});
    }

    player.anim.update();
    player.anim.draw(64, 260);
  }

  /**
   * Request Animation Polyfill
   */
  var requestAnimFrame = (function(){
    return  window.requestAnimationFrame       ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            window.oRequestAnimationFrame      ||
            window.msRequestAnimationFrame     ||
            function(callback, element){
              window.setTimeout(callback, 1000 / 60);
            };
  })();

  /**
   * Start the game - reset all variables and entities, spawn platforms and water.
   */
  function startGame() {
    // setup the player
    player.width  = 60;
    player.height = 96;
    player.speed  = 6;
    player.sheet  = new SpriteSheet('imgs/normal_walk.png', player.width, player.height);
    player.anim   = new Animation(player.sheet, 4, 0, 15);

    // create the ground tiles
    for (i = 0, length = Math.floor(canvas.width / platformWidth) + 2; i < length; i++) {
      ground[i] = {'x': i * platformWidth, 'y': platformHeight};
    }

    background.reset();

    animate();
  }

  assetLoader.downloadAll();
})();