(function(){ 'use strict';

var Util = require("../modules/util");

var cfg = {
    font: "16px Open Sans",
    align: "left",
    weight: "normal",
    fills: [
        "#f94b3c",
        "#e38e34",
        "#eeda3f",
        "#65737e",
        "#7d8b96",
        "#6c7f8c",
        "#5a7080",
        "#425d6f",
    ],
    selfbg: "#176687",
    selfbgAlpha: 0.3,
    selfbgRadius: 8,
    width: 220,
    nameWidth: 160,
    height: 18,
    paddingX: 12,
    paddingY: 3,
    updateFrame: 30,
};

function LeaderBoardUI(world)
{
    this.world = world;

    this.topCount = cfg.fills.length;
    this.lastUpdateFrame = 0;
    this.labels = {};
    this.expLabels = {};
    this.exps = {};

    this.ui = new PIXI.Container();
    this.ui.x = this.world.cw - cfg.width - cfg.paddingX;
    this.ui.y = 0;
    this.world.stage.addChild(this.ui);
}

LeaderBoardUI.prototype = {
    constructor: LeaderBoardUI
};

LeaderBoardUI.prototype.addLabel = function(player, rank)
{
    if (!player || rank < 0 || rank >= this.topCount) {
        Util.logError("invald player rank=" + rank + 1);
        return null;
    }
    var labelCfg = {
        fill: cfg.fills[rank],
        font: cfg.font,
        fontWeight: cfg.weight,
        align: cfg.align
    };

    var label = new PIXI.Container();

    if (player === this.world.getSelf()) {
        var graphics = new PIXI.Graphics();
        graphics.beginFill(cfg.selfbg);
        graphics.drawRoundedRect(0, 0, cfg.width - cfg.paddingX, cfg.height, cfg.selfbgRadius);
        graphics.endFill();
        var bgSprite = new PIXI.Sprite(graphics.generateTexture());
        bgSprite.alpha = cfg.selfbgAlpha;
        label.addChild(bgSprite);
    }

    var nameLabel = new PIXI.Text(String(Number(rank) + 1) + "  " + player.name, labelCfg);
    nameLabel.x = cfg.paddingX;
    label.addChild(nameLabel);

    var expLabel = new PIXI.Text(String(player.tank.exp), labelCfg);
    expLabel.x = cfg.nameWidth;
    label.addChild(expLabel);

    label.scale.x = 1;
    label.scale.y = cfg.height / label.height;

    this.labels[player.connid] = label;
    this.ui.addChild(label);
    return label;
};

LeaderBoardUI.prototype.update = function()
{
    if (this.world.playerCount <= 0) {
        return;
    }
    this.ui.visible = true;

    if (this.world.frame < this.lastUpdateFrame + cfg.updateFrame) {
        return;
    }
    this.lastUpdateFrame = this.world.frame;

    var label;
    for (var idx in this.labels) {
        label = this.labels[idx];
        if (label) {
            this.ui.removeChild(label);
        }
    }
    this.labels = [];

    for (var rank in this.world.rankPlayers) {
        var player = this.world.rankPlayers[rank];
        if (!player || !player.tank) {
            continue;
        }
        label = this.addLabel(player, rank);
        if (!label) {
            break;
        }
        label.x = cfg.paddingX;
        label.y = rank * (cfg.height + cfg.paddingY) + cfg.paddingY;
    }
};

module.exports = LeaderBoardUI;

})();

