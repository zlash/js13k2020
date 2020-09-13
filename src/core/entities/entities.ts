import { Checkpoint, updateCheckpoint, createCheckpoint } from "./checkpoint";
import { TrapDoors, updateTrapDoors, createTrapDoors } from "./trapDoors";
import { Coins, updateCoins, createCoins } from "./coins";
import { Acolyte, updateAcolyte, createAcolyte } from "./acolyte";
import { Popper, updatePopper, createPopper } from "./popper";
import { RaiseBumpersSet, updateRaiseBumpersSet, createRaiseBumpersSet } from "./raiseBumpersSet";
import { RaiseBumper, updateRaiseBumper, createRaiseBumper } from "./raiseBumper";
import { PinballDoor, updatePinballDoor, createPinballDoor } from "./pinballDoor";
import { PlayerBall, updatePlayerBall, createPlayerBall } from "./playerBall";
import { Plunger, updatePlunger, createPlunger } from "./plunger";
import { BumpyBeast, updateBumpyBeast, createBumpyBeast } from "./bumpyBeast";
import { Flipper, updateFlipper, createFlipper } from "./flipper";
import { Solid, updateSolid, createSolid } from "./solid";
import { InputStatus } from "../../core/entrypoint";
import { Ingame } from "../../core/ingame";

export const EntityPlunger: 0 = 0;
export const EntityBumpyBeast: 1 = 1;
export const EntityFlipper: 2 = 2;
export const EntitySolid: 3 = 3;
export const EntityPlayerBall: 4 = 4;
export const EntityPinballDoor: 5 = 5;
export const EntityRaiseBumper: 6 = 6;
export const EntityRaiseBumpersSet: 7 = 7;
export const EntityPopper: 8 = 8;
export const EntityAcolyte: 9 = 9;
export const EntityCoins: 10 = 10;
export const EntityTrapDoors: 11 = 11;
export const EntityCheckpoint: 12 = 12;
// Maker for new entities

export type Entity = Plunger | BumpyBeast | Flipper | Solid |
    PlayerBall | PinballDoor | RaiseBumper | RaiseBumpersSet |
    Popper | Acolyte | Coins | TrapDoors | Checkpoint;

export const entitiesUpdate: { [k: number]: (e: any, i: InputStatus, dt: number, ingame: Ingame) => void; } = {
    [EntityCheckpoint]: updateCheckpoint,
    [EntityTrapDoors]: updateTrapDoors,
    [EntityCoins]: updateCoins,
    [EntityAcolyte]: updateAcolyte,
    [EntityPopper]: updatePopper,
    [EntityRaiseBumpersSet]: updateRaiseBumpersSet,
    [EntityRaiseBumper]: updateRaiseBumper,
    [EntityPinballDoor]: updatePinballDoor,
    [EntityPlayerBall]: updatePlayerBall,
    [EntityPlunger]: updatePlunger,
    [EntityBumpyBeast]: updateBumpyBeast,
    [EntityFlipper]: updateFlipper,
    [EntitySolid]: updateSolid,
};

export const entitiesCreate: { [k: number]: (ingame: Ingame, x: number, y: number, z: number, ...params: any[]) => Entity; } = {
    [EntityCheckpoint]: createCheckpoint,
    [EntityTrapDoors]: createTrapDoors,
    [EntityCoins]: createCoins,
    [EntityAcolyte]: createAcolyte,
    [EntityPopper]: createPopper,
    [EntityRaiseBumpersSet]: createRaiseBumpersSet,
    [EntityRaiseBumper]: createRaiseBumper,
    [EntityPinballDoor]: createPinballDoor,
    [EntityPlayerBall]: createPlayerBall,
    [EntityPlunger]: createPlunger,
    [EntityBumpyBeast]: createBumpyBeast,
    [EntityFlipper]: createFlipper,
    [EntitySolid]: createSolid,
};