var LevelData = {
  levelList:[
    '0-1',
    '0-2',
    '0-3'
  ],
  currentLevel: 0
};

var Load = function () {};
Load.prototype.preload = function () {
  this.game.load.image('sheetmap', 'asset/img/sheet.png');

  this.game.load.spritesheet('sheet', 'asset/img/sheet.png', 16, 16);

  // crisp pixel upscaling
  this.game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
  this.game.scale.refresh();

  this.game.scale.pageAlignHorizontally = true;
  this.game.scale.pageAlignVertically = true;

  this.game.stage.smoothed = false;

  // enable crisp rendering
  this.game.renderer.renderSession.roundPixels = true;  
  Phaser.Canvas.setImageRenderingCrisp(this.game.canvas)

  PIXI.scaleModes.DEFAULT = PIXI.scaleModes.NEAREST; //for WebGL

  this.game.input.gamepad.start();
};
Load.prototype.create = function () {
  this.game.state.start('Gameplay', true, false, LevelData.levelList[LevelData.currentLevel]);
};

var Gameplay = function () {
  this.player = null;
  this.playerRunSpeed = 100;

  this.map = null;
};
Gameplay.prototype.init = function (levelName) {
  this.levelName = levelName;
};
Gameplay.prototype.preload = function () {
  this.game.load.tilemap(this.levelName, 'asset/map/' + this.levelName + '.json', undefined, Phaser.Tilemap.TILED_JSON);
};
Gameplay.prototype.create = function () {

  this.game.physics.arcade.gravity.y = 550;

  this.map = this.game.add.tilemap(this.levelName);
  this.map.addTilesetImage('terrain', 'sheetmap', 16, 16);

  this.background = this.map.createLayer('background');
  
  this.foreground = this.map.createLayer('foreground');
  this.foreground.resizeWorld();

  this.map.setCollisionBetween(0, 256, true, this.foreground);

  var playerPost = { x: 32, y: 32 };
  this.goal = null;

  if (this.map.objects.gameplay) {
    this.map.objects.gameplay.forEach(function (obj) {
      if (obj.name === 'Player') {
        playerPost.x = obj.x + 16;
        playerPost.y = obj.y + 16;
      }

      if (obj.name === 'Goal') {
        this.goal = this.game.add.sprite(obj.x, obj.y, 'sheet', 61);
        this.game.physics.enable(this.goal, Phaser.Physics.ARCADE);
        this.goal.animations.add('spin', [61, 62], 8, true);
        this.goal.animations.play('spin');
        this.goal.body.allowGravity = false;
      }
    }, this);
  }

  this.player = this.game.add.sprite(playerPost.x, playerPost.y, 'sheet', 0);
  this.player.animations.add('runRight', [32, 33], 8, true);
  this.player.animations.add('runLeft', [48, 49], 8, true);
  this.player.animations.add('holdRight', [34, 35], 8, true);
  this.player.animations.add('holdLeft', [50, 51], 8, true);
  this.player.anchor.set(0.5, 0.5);
  this.game.physics.enable(this.player, Phaser.Physics.ARCADE);
  this.player.body.maxVelocity.y = 150;
  this.player.body.setSize(8, 16);
  this.player.facingRight = true;
  this.player.tilegraphic = this.game.add.sprite(0, -24, 'sheet', 8);
  this.player.tilegraphic.anchor.set(0.5, 0);
  this.player.tilegraphic.renderable = false;
  this.player.addChild(this.player.tilegraphic);

  this.grabKey = this.game.input.keyboard.addKey(Phaser.KeyCode.C);
  this.grabKey.onDown.add(function () {
    var tl = this.map.getTile(~~(this.player.x / 16) + (this.player.facingRight ? 1 : -1), ~~(this.player.y / 16) + (this.game.input.keyboard.isDown(Phaser.KeyCode.DOWN) ? 1 : (this.game.input.keyboard.isDown(Phaser.KeyCode.UP) ? -1 : 0)), this.foreground);

    if (tl !== null && this.player.tilegraphic.renderable === false && (tl.index === 9 || tl.index === 10 || tl.index === 25 || tl.index === 26)) {
      this.player.tilegraphic.renderable = true;
      this.player.tilegraphic.frame = tl.index - 1;

      this.map.removeTile(~~(this.player.x / 16) + (this.player.facingRight ? 1 : -1), ~~(this.player.y / 16) + (this.game.input.keyboard.isDown(Phaser.KeyCode.DOWN) ? 1 : (this.game.input.keyboard.isDown(Phaser.KeyCode.UP) ? -1 : 0)), this.foreground);
    } else if (tl === null && this.player.tilegraphic.renderable === true) {
      this.player.tilegraphic.renderable = false;

      this.map.putTile(this.player.tilegraphic.frame + 1, ~~(this.player.x / 16) + (this.player.facingRight ? 1 : -1), ~~(this.player.y / 16) + (this.game.input.keyboard.isDown(Phaser.KeyCode.DOWN) ? 1 : (this.game.input.keyboard.isDown(Phaser.KeyCode.UP) ? -1 : 0)) , this.foreground);
    }
  }, this);
};
Gameplay.prototype.update = function () {

  this.game.physics.arcade.collide(this.player, this.foreground);
  this.game.physics.arcade.overlap(this.player, this.goal, function () {}, function () { LevelData.currentLevel = (LevelData.currentLevel + 1) % LevelData.levelList.length; this.game.state.start('Gameplay', true, false, LevelData.levelList[LevelData.currentLevel]); return false; }, this);

  // poll keyboard keys
  if (this.game.input.keyboard.isDown(Phaser.KeyCode.RIGHT)) {
    this.player.body.velocity.x = this.playerRunSpeed;
    this.player.facingRight = true;
  } else if (this.game.input.keyboard.isDown(Phaser.KeyCode.LEFT)) {
    this.player.body.velocity.x = -1 * this.playerRunSpeed;
    this.player.facingRight = false;
  } else {
    this.player.body.velocity.x = 0;
  }

  // update animations
  this.player.animations.play(this.player.facingRight ? (this.player.tilegraphic.renderable ? 'holdRight' : 'runRight') : (this.player.tilegraphic.renderable ? 'holdLeft' : 'runLeft'));

  if (this.game.input.keyboard.isDown(Phaser.KeyCode.X) && this.player.body.blocked.down) {
    this.player.body.velocity.y = -200;
  }
};
Gameplay.prototype.shutdown = function () {
  this.game.cache.removeTilemap(this.levelName);
};

var main = function () {
  var game = new Phaser.Game(256, 224);

  game.state.add('Load', Load, false);
  game.state.add('Gameplay', Gameplay, false);
  game.state.start('Load');
};
