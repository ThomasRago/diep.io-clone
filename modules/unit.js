(function(){ "use strict";

var HpBar = require("../modules/hpbar");
var Motion = require("../modules/motion");
var Util = require("../modules/util");
var View = require("../modules/view");

function Unit(world, type, cfg)
{
    this.world = world;
    if (this.world.isLocal === false || this.world.started === true) {
        this.id = (++ this.world.unitBaseId);
    }
    this.type = type;
    this.cfg = cfg;
    this.motion = new Motion(this, this.cfg.velocity);
    if (world.isLocal === true) {
        this.view = new View(this);
    }
    this.rotation = 0;
    this.viewRotation = null;
    this.hp = this.cfg.hp;
    this.maxHp = this.cfg.hp;

    this.hpRegen = (this.cfg.hpRegen || 0);
    this.hpRegenFrame = this.world.frame;

    this.damage = (this.cfg.damage || 0);

    this.isDead = false;

    var pt = this.world.proto.PropType;
    this.props = {};
    this.props[pt.PT_HEALTH_REGEN] = 0;
    this.props[pt.PT_MAX_HEALTH] = 0;
    this.props[pt.PT_BODY_DAMAGE] = 0;
    this.props[pt.PT_BULLET_SPEED] = 0;
    this.props[pt.PT_BULLET_PENETRATION] = 0;
    this.props[pt.PT_BULLET_DAMAGE] = 0;
    this.props[pt.PT_RELOAD] = 0;
    this.props[pt.PT_MOVEMENT_SPEED] = 0;

    // private
    this._x = 0;
    this._y = 0;
}

Unit.prototype = {
    constructor: Unit,
};

Unit.prototype.addHpBar = function(name, visible)
{
    if (this.hpbar) {
        delete this.hpbar;
    }
    this.hpbar = new HpBar(this.world, name, this, visible);
};

Unit.prototype.addNameBar = function(name)
{
    if (this.view) {
        this.view.addNameBar(name);
    }
};

Unit.prototype.outOfBounds = function()
{
    if (this.x <= 0 || this.x >= this.world.w
        || this.y <= 0 || this.y >= this.world.h) {
        return true;
    }
    return false;
};

Unit.prototype.takeDamage = function(damage)
{
    this.hp -= damage;
    if (this.hp <= 0) {
        this.die();
    }
};

Unit.prototype.die = function()
{
    this.isDead = true;

    if (this.hpbar) {
        this.hpbar.die();
    }

    if (this.view) {
        this.view.onDie();
    }

    this.world.removeUnit(this);
};

Unit.prototype.update = function()
{
    var oldX = this.x;
    var oldY = this.y;

    var deltaMS = 1000.0 / this.world.cfg.configWorld.frame;
    this.motion.update(deltaMS);
    this.world.updateUnitGrid(this, {x: oldX, y: oldY});

    if (this.hpRegen > 0) {
        var hpRegenTime = (this.world.frame - this.hpRegenFrame) * deltaMS;
        this.hp += this.hpRegen * hpRegenTime / 1000;
        if (this.hp > this.maxHp) {
            this.hp = this.maxHp;
        }
        this.hpRegenFrame = this.world.frame;
    }

    if (this.view) {
        this.view.update();
    }

    if (this.isDead === false && this.hpbar) {
        this.hpbar.update(this.hp / this.maxHp);
    }
};

Unit.prototype.dump = function()
{
    var u = new this.world.proto.Unit();
    u.id = this.id;
    u.type = this.type;
    u.cfgName = this.cfg.alias;
    u.hp = this.hp;

    if (this.type == Util.unitType.bullet) {
        u.ownerid = this.owner.id;
        u.bornFrame = Math.floor(this.bornFrame);
        u.weaponName = this.weaponName;
    }

    if (this.type == Util.unitType.tank) {
        u.playerConnid = this.player ? this.player.connid : "";
        u.autoFire = this.autoFire;
        u.weaponFireFrame = [];
        for (var i in this.weapons) {
            u.weaponFireFrame.push(this.weapons[i].fireFrame);
        }
    }

    u.rotation = this.rotation;
    u.motion = new this.world.proto.Motion();
    u.motion.forceAngle = this.motion.forceAngle;
    u.motion.force = this.motion.force;
    u.motion.iv = new this.world.proto.Vector(this.motion.iv.x, this.motion.iv.y);
    u.motion.ev = new this.world.proto.Vector(this.motion.ev.x, this.motion.ev.y);
    u.motion.position = new this.world.proto.Vector(this.x, this.y);
    return u;
};

Unit.prototype.load = function(u)
{
    this.id = u.id;
    this.x = u.motion.position.x;
    this.y = u.motion.position.y;
    this.hp = u.hp;
    this.rotation = u.rotation;
    this.motion.iv.x = u.motion.iv.x;
    this.motion.iv.y = u.motion.iv.y;
    this.motion.ev.x = u.motion.ev.x;
    this.motion.ev.y = u.motion.ev.y;
    this.motion.forceAngle = u.motion.forceAngle;
    this.motion.force = u.motion.force;

    if (this.hpbar) {
        this.hpbar.update(this.hp / this.maxHp);
    }

    if (this.type == Util.unitType.bullet) {
        this.bornFrame = u.bornFrame;
        var weapon = this.owner.getWeaponByName(u.weaponName);
        weapon.fireBullet(this);
    }

    if (this.type == Util.unitType.tank) {
        this.autoFire = u.autoFire;
        var idx = 0;
        for (var i in this.weapons) {
            this.weapons[i].fireFrame = u.weaponFireFrame[idx++];
        }
    }
};

Unit.prototype.addProp = function(type)
{
    // add prop
    if (!this.props[type]) {
        Util.logError("prop[" + type + "] not found");
        return;
    }
    ++ this.props[type];

    var value = this.props[type];
    var add = this.world.cfg.configPropAdd[type][add];
    Util.logDebug("unit[" + this.id + "] prop[" + type + "]=" + value + " add=" + add);

    // hp regen
    if (type == this.world.proto.PropType.PT_HEALTH_REGEN) {
        this.hpRegen = this.cfg.hpRegen * (1.0 + add);
    }
    // max hp
    else if (type == this.world.proto.PropType.PT_MAX_HEALTH) {
        var oldMaxHp = this.maxHp;
        this.maxHp = this.cfg.hp * (1.0 + add);
        this.hp = this.hp * this.maxHp / oldMaxHp;
        if (this.hp > this.maxHp) {
            this.hp = this.maxHp;
        }
    }
};

Unit.prototype.toString = function()
{
    return "Unit[" + this.id + "] frame=" + this.world.frame + " hp=" + this.hp
        + " position[" + this.x + "," + this.y + "["
        + " iv[" + this.motion.iv.x + "," + this.motion.iv.y + "]"
        + " ev[" + this.motion.ev.x + "," + this.motion.ev.y + "]"
        + " force[" + this.motion.force + "," + this.motion.forceAngle + "]";
};

Object.defineProperties(Unit.prototype, {
    radius: {
        get: function() { return this.cfg.radius; }
    },
    m: {
        get: function() { return this.radius * this.radius * this.cfg.density; }
    },
    x: {
        get: function() { return this._x; },
        set: function(v) {
            if (this.hpbar) {
                this.hpbar.x += (v - this._x);
            }
            this._x = v;
        }
    },
    y: {
        get: function() { return this._y; },
        set: function(v) {
            if (this.hpbar) {
                this.hpbar.y += (v - this._y);
            }
            this._y = v;
        }
    },
});

module.exports = Unit;

})();
