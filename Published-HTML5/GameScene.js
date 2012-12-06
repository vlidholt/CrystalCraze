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
var kNumRemovalFrames = 15;

var gFallingGems;
var gBoard;
var gBoardSprites;
var gNumGemsInColumn;
var gTimeSinceAddInColumn;
var gGameLayer;
var gTimer;
var gStartTime;

function setupBoard()
{
	gBoard = new Array(kNumTotalGems);
	for (var i = 0; i < kNumTotalGems; i++)
	{
		gBoard[i] = -1;
	}
	gBoardSprites = new Array(kNumTotalGems);

	gNumGemsInColumn = new Array(kBoardWidth);
	gTimeSinceAddInColumn = new Array(kBoardWidth);
	for (var x = 0; x < kBoardWidth; x++)
	{
		gNumGemsInColumn[x] = 0;
		gTimeSinceAddInColumn[x] = 0;
	}

	// Setup falling pieces
	gFallingGems = new Array(kBoardWidth);
	for (var x = 0; x < kBoardWidth; x++)
	{
		gFallingGems[x] = new Array(0);
	}
}

function findConnectedGems_(x, y, arr, gemType)
{
	// Check for bounds
	if (x < 0 || x >= kBoardWidth) return;
	if (y < 0 || y >= kBoardHeight) return;

	var idx = x + y*kBoardWidth;

	// Make sure that the gems type match
	if (gBoard[idx] != gemType) return;


	// Check if idx is already visited
	for (var i = 0; i < arr.length; i++)
	{
		if (arr[i] == idx) return;
	}

	// Add idx to array
	arr.push(idx);

	// Visit neighbours
	findConnectedGems_(x+1, y, arr, gemType);
	findConnectedGems_(x-1, y, arr, gemType);
	findConnectedGems_(x, y+1, arr, gemType);
	findConnectedGems_(x, y-1, arr, gemType);
}

function findConnectedGems(x, y)
{
	var connected = new Array();
	if (gBoard[x + y*kBoardWidth] == -1) return connected;

	findConnectedGems_(x, y, connected, gBoard[x + y*kBoardWidth]);

	return connected;
}

function removeConnectedGems(x,y)
{
	// Check for bounds
	if (x < 0 || x >= kBoardWidth) return;
	if (y < 0 || y >= kBoardHeight) return;

	var connected = findConnectedGems(x,y);

	if (connected.length >= 3)
	{
		for (var i = 0; i < connected.length; i++)
		{
			var idx = connected[i];
			var gemX = idx % kBoardWidth;
			var gemY = Math.floor(idx/kBoardWidth);

			gBoard[idx] = -kNumRemovalFrames;
			gGameLayer.removeChild(gBoardSprites[idx], true);
			gBoardSprites[idx] = null;
			/*
			// Remove from board
			gBoard[idx] = -1;
			gGameLayer.removeChild(gBoardSprites[idx], true);
			gBoardSprites[idx] = null;
			gNumGemsInColumn[gemX]--;

			// Transorm any gem above this to a falling gem (if it isn't connected)
			for (var yAbove = gemY+1; yAbove < kBoardHeight; yAbove++)
			{
				var idxAbove = gemX + yAbove*kBoardWidth;
				var idxIsConnected = false;
				for (var idxConnected = 0; idxConnected < connected.length; idxConnected++)
				{
					if (connected[idxConnected] == idxAbove)
					{
						idxIsConnected = true;
						break;
					}
				}

				if (idxIsConnected || gBoard[idxAbove] == -1) continue;

				// The gem is not connected, make it into a falling gem
				var gemType = gBoard[idxAbove];
				var gemSprite = gBoardSprites[idxAbove];

				var gem = {gemType: gemType, sprite: gemSprite, yPos: yAbove, ySpeed: 0};
				gFallingGems[gemX].push(gem);

				// Remove from board
				gBoard[idxAbove] = -1;
				gBoardSprites[idxAbove] = null;

				gNumGemsInColumn[gemX]--;
			}
			*/
		}
	}
}

function removeMarkedCrystals()
{
	var changed = false;
	// Iterate through the board
	for (var x = 0; x < kBoardWidth; x++)
	{
		for (var y = 0; y < kBoardHeight; y++)
		{
			var i = x + y * kBoardWidth;

			if (gBoard[i] < -1)
			{
				changed = true;

				// Increase the count for negative crystal types
				gBoard[i]++;
				if (gBoard[i] == -1)
				{
					gNumGemsInColumn[x]--;

					// Transform any gem above this to a falling gem
					for (var yAbove = y+1; yAbove < kBoardHeight; yAbove++)
					{
						var idxAbove = x + yAbove*kBoardWidth;

						if (gBoard[idxAbove] < -1)
						{
							gNumGemsInColumn[x]--;
							gBoard[idxAbove] = -1;
						}
						if (gBoard[idxAbove] == -1) continue;

						// The gem is not connected, make it into a falling gem
						var gemType = gBoard[idxAbove];
						var gemSprite = gBoardSprites[idxAbove];

						var gem = {gemType: gemType, sprite: gemSprite, yPos: yAbove, ySpeed: 0};
						gFallingGems[x].push(gem);

						// Remove from board
						gBoard[idxAbove] = -1;
						gBoardSprites[idxAbove] = null;

						gNumGemsInColumn[x]--;

						cc.log("add gem type: "+gemType+" ("+x+","+yAbove+") inCol: "+gNumGemsInColumn[x]);
					}

				}
			}
		}
	}

	if (changed) debugPrintBoard();
}

function getGemType(x, y)
{
	if (x < 0 || x >= kBoardWidth) return -1;
	if (y < 0 || y >= kBoardHeight) return -1;

	return gBoard[x+y*kBoardWidth];
}

function setGemType(x, y, newType)
{
	// Check bounds
	if (x < 0 || x >= kBoardWidth) return;
	if (y < 0 || y >= kBoardHeight) return;

	// Get the type of the gem
	var idx = x + y*kBoardWidth;
	var gemType = gBoard[idx];

	// Make sure that it is a gem
	if (gemType < 0 || gemType >= 5) return;

	gBoard[idx] = newType;

	// Remove old gem and insert a new one
	gGameLayer.removeChild(gBoardSprites[idx], true);

	var gemSprite = cc.Sprite.create("crystals/"+newType+".png");
	gemSprite.setPosition(cc.p(x * kGemSize, y * kGemSize));
	gemSprite.setAnchorPoint(cc.p(0,0));

	gGameLayer.addChild(gemSprite);
	gBoardSprites[idx] = gemSprite;
}

function findMove()
{
	// Iterate through all places on the board
	for (var y = 0; y < kBoardHeight; y++)
	{
		for (var x = 0; x < kBoardWidth; x++)
		{
			var idx = x + y*kBoardWidth;
			var gemType = gBoard[idx];

			// Make sure that it is a gem
			if (gemType < 0 || gemType >= 5) continue;

			// Check surrounding tiles
			var numSimilar = 0;

			if (getGemType(x-1, y) == gemType) numSimilar++;
			if (getGemType(x+1, y) == gemType) numSimilar++;
			if (getGemType(x, y-1) == gemType) numSimilar++;
			if (getGemType(x, y+1) == gemType) numSimilar++;

			if (numSimilar >= 2) return idx;
		}
	}
	return -1;
}

function createRandomMove()
{
	// Find a random place in the lower part of the board
	var x = Math.floor(Math.random()*kBoardWidth-1);
	var y = Math.floor(Math.random()*kBoardHeight/2);

	// Make sure it is a gem that we found
	var gemType = gBoard[x+y*kBoardWidth];
	if (gemType == -1 || gemType >= 5) return;

	// Change the color of two surrounding gems
	setGemType(x+1, y, gemType);
	setGemType(x, y+1, gemType);
}

function debugPrintBoard()
{
	for (var y = kBoardHeight-1; y >= 0; y--)
	{
		var i = kBoardWidth*y;
		cc.log(""+gBoard[i]+gBoard[i+1]+gBoard[i+2]+gBoard[i+3]+gBoard[i+4]+gBoard[i+5]+gBoard[i+6]+gBoard[i+7]);
	}
	cc.log("--------");
	cc.log(""+gNumGemsInColumn[0]+" "+gNumGemsInColumn[1]+" "+gNumGemsInColumn[2]+" "+gNumGemsInColumn[3]+" "
		+gNumGemsInColumn[4]+" "+gNumGemsInColumn[5]+" "+gNumGemsInColumn[6]+" "+gNumGemsInColumn[7]);
}

GameScene.prototype.onDidLoadFromCCB = function()
{	
	// Setup board
	setupBoard();
	
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

    // Schedule callback
    this.rootNode.onUpdate = function(dt) {
        this.controller.onUpdate();
    };
    this.rootNode.schedule(this.rootNode.onUpdate);

    gGameLayer = this.gameLayer;
};

GameScene.prototype.onTouchesBegan = function(touches, event)
{
	var loc = touches[0].getLocation();

	var x = Math.floor(loc.x/kGemSize);
	var y = Math.floor(loc.y/kGemSize);

	removeConnectedGems(x,y);
};

// Game main loop
GameScene.prototype.onUpdate = function(dt)
{
	removeMarkedCrystals();

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

			this.gameLayer.addChild(gemSprite);

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

			gem.ySpeed += 0.03;
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
};

GameScene.prototype.onPauseClicked = function(dt)
{
	var scene = cc.BuilderReader.loadAsScene("MainScene.ccbi");
    cc.Director.getInstance().replaceScene(scene);	
};
