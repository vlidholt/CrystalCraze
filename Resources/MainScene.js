//
// MainScene class
//
var MainScene = function(){};

MainScene.prototype.onDidLoadFromCCB = function()
{
	cc.log("MainScene did load");
};

// Create callback for button
MainScene.prototype.onPressButton = function()
{	
	cc.log("Clicked button");
	var scene = cc.BuilderReader.loadAsScene("GameScene.ccbi");
    cc.Director.getInstance().replaceScene(scene);
};