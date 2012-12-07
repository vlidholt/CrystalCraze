require("GameBoard.js");

//
// MainScene class
//
var GameScene = function(){};

var kGemSize = 40;
var kBoardWidth = 8;
var kBoardHeight = 10;
var kNumTotalGems = kBoardWidth * kBoardHeight;
var kTimeBetweenGemAdds = 8;
var kTotalGameTime = 1000*60;
var kIntroTime = 1800;
var kNumRemovalFrames = 8;
var kDelayBeforeHint = 3000;

var kGameOverGemSpeed = 0.1;
var kGameOverGemAcceleration = 0.005;


var gFallingGems;
var gBoard;
var gBoardSprites;
var gNumGemsInColumn;
var gTimeSinceAddInColumn;
var gLastTakenGemTime;
var gNumConsecutiveGems;

var gGameLayer;
var gParticleLayer;
var gHintLayer;
var gShimmerLayer;

var gTimer;

var gStartTime;
var gLastMoveTime;
var gIsDisplayingHint;

var gBoardChangedSinceEvaluation;
var gPossibleMove;

var gIsGameOver;
var gGameOverGems;

function setupShimmer()
{
	for (var i = 0; i < 2; i++)
	{
		var sprt = cc.Sprite.create("gamescene/bg-shimmer-"+i+".png");

		var seqRot = null;
		var seqMov = null;
		var seqSca = null;

		for (var j = 0; j < 10; j++)
		{
			var time = Math.random()*10+5;
			var x = kBoardWidth*kGemSize/2;
			var y = Math.random()*kBoardHeight*kGemSize;
			var rot = Math.random()*180-90;
			var scale = Math.random()*3 + 3;

			var actionRot = cc.EaseInOut.create(cc.RotateTo.create(time, rot), 2);
			var actionMov = cc.EaseInOut.create(cc.MoveTo.create(time, cc.p(x,y)), 2);
			var actionSca = cc.ScaleTo.create(time, scale);

			if (!seqRot)
			{
				seqRot = actionRot;
				seqMov = actionMov;
				seqSca = actionSca;
			}
			else
			{
				seqRot = cc.Sequence.create(seqRot, actionRot);
				seqMov = cc.Sequence.create(seqMov, actionMov);
				seqSca = cc.Sequence.create(seqSca, actionSca);
			}
		}

		var x = kBoardWidth*kGemSize/2;
		var y = Math.random()*kBoardHeight*kGemSize;
		var rot = Math.random()*180-90;

		sprt.setPosition(cc.p(x,y));
		sprt.setRotation(rot);

		sprt.setPosition(cc.p(kBoardWidth*kGemSize/2, kBoardHeight*kGemSize/2));
		sprt.setBlendFunc(gl.SRC_ALPHA, gl.ONE);
		sprt.setScale(3);

		gShimmerLayer.addChild(sprt);
		sprt.setOpacity(0);
		sprt.runAction(cc.RepeatForever.create(seqRot));
		sprt.runAction(cc.RepeatForever.create(seqMov));
		sprt.runAction(cc.RepeatForever.create(seqSca));

		sprt.runAction(cc.FadeIn.create(2));
	}
}

function removeShimmer()
{
	var children = gShimmerLayer.getChildren();
	for (var i = 0; i < children.length; i++)
	{
		children[i].runAction(cc.FadeOut.create(1));
	}
}

function updateSparkle()
{
	if (Math.random() > 0.1) return;
	var idx = Math.floor(Math.random()*kBoardWidth*kBoardHeight);
	var gemSprite = gBoardSprites[idx];
	if (!gemSprite) return;

	if (gemSprite.getChildren().length > 0) return;

	sprite = cc.Sprite.create("gamescene/sparkle.png");
	sprite.runAction(cc.RepeatForever.create(cc.RotateBy.create(3, 360)));

	sprite.setOpacity(0);

	sprite.runAction(cc.Sequence.create(
		cc.FadeIn.create(0.5),
		cc.FadeOut.create(2),
		cc.CallFunc.create(onSparkleRemove, this)));

	sprite.setPosition(cc.p(kGemSize*(2/6), kGemSize*(4/6)));

	gemSprite.addChild(sprite);
}

function onSparkleRemove(node, value)
{
	node.getParent().removeChild(node, true);
}

GameScene.prototype.onDidLoadFromCCB = function()
{	
	// Setup board
	setupBoard();

	gIsGameOver = false;
	gIsDisplayingHint = false;
	
	// Forward relevant touch events to controller (this)
    this.rootNode.onTouchesBegan = function( touches, event) {
        this.controller.onTouchesBegan(touches, event);
        return true;
    };

    // Setup timer
    this.sprtTimer.setVisible(false);
    gTimer = cc.ProgressTimer.create(cc.Sprite.create("gamescene/timer.png"));
    gTimer.setPosition(this.sprtTimer.getPosition());
    gTimer.setPercentage(100);
    gTimer.setType(cc.PROGRESS_TIMER_TYPE_BAR);
    gTimer.setMidpoint(cc.p(0, 0.5));
    gTimer.setBarChangeRate(cc.p(1, 0));
    this.sprtHeader.addChild(gTimer);

    var d = new Date();
    gStartTime = d.getTime() + kIntroTime;
    gLastMoveTime = d.getTime();

    // Schedule callback
    this.rootNode.onUpdate = function(dt) {
        this.controller.onUpdate();
    };
    this.rootNode.schedule(this.rootNode.onUpdate);

    // TODO: Make into batch node
    gGameLayer = cc.Node.create();
    //gParticleLayer = cc.ParticleBatchNode.create("particles/taken-gem.png", 250);
    gParticleLayer = cc.Node.create();
    gHintLayer = cc.Node.create();
    gShimmerLayer = cc.Node.create();

    this.gameLayer.addChild(gShimmerLayer, -1);
    this.gameLayer.addChild(gParticleLayer, 1);
    this.gameLayer.addChild(gGameLayer, 0);
    this.gameLayer.addChild(gHintLayer, 2);
    //gGameLayer = this.gameLayer;

    // Setup callback for completed animations
	this.rootNode.animationManager.setCompletedAnimationCallback(this, this.onAnimationComplete);

	setupShimmer();
	//setupSparkle();
};

GameScene.prototype.onTouchesBegan = function(touches, event)
{
	var loc = touches[0].getLocation();

	loc = cc.pSub(loc, this.gameLayer.getPosition());

	var x = Math.floor(loc.x/kGemSize);
	var y = Math.floor(loc.y/kGemSize);

	if (!gIsGameOver)
	{
		gHintLayer.removeAllChildren(true);
		gIsDisplayingHint = false;

		removeConnectedGems(x,y);
	}
};

// Game main loop
GameScene.prototype.onUpdate = function(dt)
{
	if (!gIsGameOver)
	{
		removeMarkedGems();

		// Add falling gems
		for (var x = 0; x < kBoardWidth; x++)
		{
			if (gNumGemsInColumn[x] + gFallingGems[x].length < kBoardHeight
				&& gTimeSinceAddInColumn[x] >= kTimeBetweenGemAdds)
			{
				// A gem should be added to this column!
				var gemType = Math.floor(Math.random()*5);
				var gemSprite = cc.Sprite.create("crystals/"+gemType+".png");
				gemSprite.setPosition(cc.p(x * kGemSize, kBoardHeight * kGemSize));
				gemSprite.setAnchorPoint(cc.p(0,0));

				var gem = {gemType: gemType, sprite: gemSprite, yPos: kBoardHeight, ySpeed: 0};
				gFallingGems[x].push(gem);

				gGameLayer.addChild(gemSprite);

				gTimeSinceAddInColumn[x] = 0;
			}

			gTimeSinceAddInColumn[x]++;
		}

		// Move falling gems
		for (var x = 0; x < kBoardWidth; x++)
		{
			var column = gFallingGems[x];
			var numFallingGems = gFallingGems[x].length;
			for (var i = numFallingGems-1; i >= 0; i--)
			{
				var gem = column[i];

				gem.ySpeed += 0.06;
				gem.ySpeed *= 0.99;
				gem.yPos -= gem.ySpeed;

				if (gem.yPos <= gNumGemsInColumn[x])
				{
					// The gem hit the ground or a fixed gem
					column.splice(i, 1);

					// Insert into board
					var y = gNumGemsInColumn[x];
					gBoard[x + y*kBoardWidth] = gem.gemType;
					gBoardSprites[x + y*kBoardWidth] = gem.sprite;

					// Update fixed position
					gem.sprite.setPosition(cc.p(x*kGemSize, y*kGemSize));
					gNumGemsInColumn[x] ++;

					gBoardChangedSinceEvaluation = true;
				}
				else
				{
					// Update the falling gems position
					gem.sprite.setPosition(cc.p(x*kGemSize, gem.yPos*kGemSize));
				}
			}
		}

		// Check if there are possible moves and no gems falling
		var isFallingGems = false;
		for (var x = 0; x < kBoardWidth; x++)
		{
			if (gNumGemsInColumn[x] != kBoardHeight)
			{
				isFallingGems = true;
				break;
			}
		}

		if (!isFallingGems)
		{
			var possibleMove = findMove();
			if (possibleMove == -1)
			{
				// Create a possible move
				createRandomMove();
			}
		}

		// Update timer
		var d = new Date();
		var currentTime = d.getTime();
		var elapsedTime = (currentTime - gStartTime)/kTotalGameTime;
		var timeLeft = (1 - elapsedTime)*100;
		if (timeLeft < 0) timeLeft = 0;
		if (timeLeft > 99.9) timeLeft = 99.9;

		gTimer.setPercentage(timeLeft);

		// Update sparkles
		updateSparkle();

		// Check for game over
		if (timeLeft == 0)
		{
			createGameOver();
			this.rootNode.animationManager.runAnimationsForSequenceNamed("Outro");
			gIsGameOver = true;
		}
		else if (currentTime - gLastMoveTime > kDelayBeforeHint && !gIsDisplayingHint)
		{
			displayHint();
		}
	}
	else
	{
		// It's game over
		updateGameOver();
	}
};

GameScene.prototype.onAnimationComplete = function()
{
	if (gIsGameOver)
	{
		var scene = cc.BuilderReader.loadAsScene("MainScene.ccbi");
    	cc.Director.getInstance().replaceScene(scene);
    }
};

GameScene.prototype.onPauseClicked = function(dt)
{
	createGameOver();
	this.rootNode.animationManager.runAnimationsForSequenceNamed("Outro");
	gIsGameOver = true;
};
