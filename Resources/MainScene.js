var kMenuSelectionNone = 0;
var kMenuSelectionPlay = 1;
var kMenuSelectionAbout = 2;

//
// MainScene class
//
var MainScene = function(){};

MainScene.prototype.onDidLoadFromCCB = function()
{
	cc.log("MainScene did load");

	// Setup particles in background
	var starParticles = cc.ParticleSystem.create("particles/bg-stars.plist");
	this.starNode.addChild(starParticles);

	// Reset menu selection
	this.menuSelection = kMenuSelectionNone;

	// Setup callback for completed animations
	this.rootNode.animationManager.setCompletedAnimationCallback(this, this.onAnimationComplete);
};

// Create callback for button
MainScene.prototype.onPressPlay = function()
{	
	cc.log("Clicked button");

	this.menuSelection = kMenuSelectionPlay;
	this.rootNode.animationManager.runAnimationsForSequenceNamed("Outro");

	//var scene = cc.BuilderReader.loadAsScene("GameScene.ccbi");
    //cc.Director.getInstance().replaceScene(scene);
};

MainScene.prototype.onAnimationComplete = function()
{
	cc.log("Animation complete!");
	if (this.menuSelection == kMenuSelectionPlay)
	{
		var scene = cc.BuilderReader.loadAsScene("GameScene.ccbi");
    	cc.Director.getInstance().replaceScene(scene);
    }
};