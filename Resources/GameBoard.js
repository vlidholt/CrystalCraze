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

	gBoardChangedSinceEvaluation = true;
	gPossibleMove = -1;
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
	if (gBoard[x + y*kBoardWidth] <= -1) return connected;

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
		gBoardChangedSinceEvaluation = true;

		for (var i = 0; i < connected.length; i++)
		{
			var idx = connected[i];
			var gemX = idx % kBoardWidth;
			var gemY = Math.floor(idx/kBoardWidth);

			gBoard[idx] = -kNumRemovalFrames;
			gGameLayer.removeChild(gBoardSprites[idx], true);
			gBoardSprites[idx] = null;
			
			// Add particle effect
			var particle = cc.ParticleSystem.create("particles/taken-gem.plist");
			particle.setPosition(gemX * kGemSize+kGemSize/2, gemY*kGemSize+kGemSize/2);
			particle.setAutoRemoveOnFinish(true);
			gParticleLayer.addChild(particle);
		}
	}

	var d = new Date();
	gLastMoveTime = d.getTime();
}

function removeMarkedGems()
{
	// Iterate through the board
	for (var x = 0; x < kBoardWidth; x++)
	{
		for (var y = 0; y < kBoardHeight; y++)
		{
			var i = x + y * kBoardWidth;

			if (gBoard[i] < -1)
			{
				// Increase the count for negative crystal types
				gBoard[i]++;
				if (gBoard[i] == -1)
				{
					gNumGemsInColumn[x]--;
					gBoardChangedSinceEvaluation = true;

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
					}

				}
			}
		}
	}
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

	gBoardChangedSinceEvaluation = true;
}

function findMove()
{
	if (!gBoardChangedSinceEvaluation)
	{
		return gPossibleMove;
	}

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

			if (numSimilar >= 2)
			{
				gPossibleMove = idx;
				return idx;
			}
		}
	}
	gBoardChangedSinceEvaluation = false;
	gPossibleMove = -1;
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

	gBoardChangedSinceEvaluation = true;
}

function createGameOver()
{
	gGameOverGems = new Array();

	for (var x = 0; x < kBoardWidth; x++)
	{
		var column = gFallingGems[x];
		for (var i = 0; i < column.length; i++)
		{
			var gem = column[i];

			var ySpeed = (Math.random()*2-1)*kGameOverGemSpeed;
			var xSpeed = (Math.random()*2-1)*kGameOverGemSpeed;

			var gameOverGem = {sprite: gem.sprite, xPos: x, yPos: gem.yPos, ySpeed: ySpeed, xSpeed: xSpeed};
			gGameOverGems.push(gameOverGem);
		}
		
		for (var y = 0; y < kBoardHeight; y++)
		{
			var i = x + y * kBoardWidth;
			if (gBoardSprites[i])
			{
				var ySpeed = (Math.random()*2-1)*kGameOverGemSpeed;
				var xSpeed = (Math.random()*2-1)*kGameOverGemSpeed;

				var gameOverGem = {sprite: gBoardSprites[i], xPos:x, yPos: y, ySpeed: ySpeed, xSpeed: xSpeed};
				gGameOverGems.push(gameOverGem);
			}
		}
	}

	gHintLayer.removeAllChildren(true);

	removeShimmer();
}

function updateGameOver()
{
	for (var i = 0; i < gGameOverGems.length; i++)
	{
		var gem = gGameOverGems[i];

		gem.xPos = gem.xPos + gem.xSpeed;
		gem.yPos = gem.yPos + gem.ySpeed;
		gem.ySpeed -= kGameOverGemAcceleration;

		gem.sprite.setPosition(gem.xPos*kGemSize, gem.yPos*kGemSize);
	}
}

function displayHint()
{
	gIsDisplayingHint = true;

	var idx = findMove();
	var x = idx % kBoardWidth;
	var y = Math.floor(idx/kBoardWidth);

	var connected = findConnectedGems(x,y);

	for (var i = 0; i < connected.length; i++)
	{
		var idx = connected[i];
		var x = idx % kBoardWidth;
		var y = Math.floor(idx/kBoardWidth);

		var actionFadeIn = cc.FadeIn.create(0.5);
		var actionFadeOut = cc.FadeOut.create(0.5);
		var actionSeq = cc.Sequence.create(actionFadeIn, actionFadeOut);
		var action = cc.RepeatForever.create(actionSeq);

		var hintSprite = cc.Sprite.create("crystals/hint.png");
		hintSprite.setOpacity(0);
		hintSprite.setPosition(cc.p(x*kGemSize, y*kGemSize));
		hintSprite.setAnchorPoint(cc.p(0, 0));
		gHintLayer.addChild(hintSprite);
		hintSprite.runAction(action);
	}
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