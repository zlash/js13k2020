import { buildAtlas } from "../core/renderer/atlas";
import { PI , PI_2, TWO_PI} from "../core/mathUtils";
import { m4 } from "../core/vector3";
import { renderSdfSpriteAnim } from "../core/renderer/sdf";
import * as C from "../core/constants";

const sdfBox = "1,1,1,B1.05,0.2,1.05,B20,S0,-20,0,ti0,1.2,0,t3,au4,a";
const sdfPlayerBall = "$S0$0t7a";
const sdfHalfCube = "1,0.5,1B0,-0.5,0t";
const sdfColumn = "1,1,1,B";
const sdfRamp = "1,1,0P1,1,1Bi$y3,a";
const sdfCornerRamp = "1,1,1,B1,1,1,P1,0,0,ti$y3,a";
const sdfCoin = "0.25,0.14,C0.25,0,0,e0.05,o0.5,px1,0,0,Pi0.07,0,0,t0.05,0.2,0.05,B2,au1.2,s1,a";
const sdfPlungerBox = "2,1,1,B0.18,o1,0,0,Pi0.2,1.25,C0,-0.07,0,t1,0.1,1,B0.15,o0,1,0,tu-0.5,px-0.75,0,0,t#0,0,tu0.5,0.5,0,t$y7a";
const sdfBumpyBeast = "0.5,0.5,1,B1,0.8,0.1,B0,0,1,tu0.1,0.4,0.1,B0.3,-0.7,0.85,tqu$y";
const sdfHalfRamp = "1,1,1,B";
const sdfCastleDoor = "2,0.2,2,B8,0.2,C6,0,-2,ti2,1,5,B2.5,0.95,0.1,B0,1,0,t3,10,10,0.75,fi0,0,-1.3,tb5,a0.05,0.25,U0.9,0.25,-1.3,t0.16,0.05,2,B0,0.23,0,t0.16,0.05,2,B1.7,0.23,0,tuu7,au-2,0,0,t-0.5,px0,0,-2,t$y0,0,4,tr";
const sdfFlipper = "0.4,0.4,1.8,B0,0,1.8,t$y7a";
const sdfPinballSideBlock = "6,1,4,B1,0,0,t-1,0,1,Pi0.2,o0,1,0,P0,-0.3,0,ti-3.5,0.7,-4,t1,1,$l";
const sdfRaiseBumper = "0,-1,0,P2,0.5,C0.5,0.5,3,B3,0.5,0.5,Bu0,0.52,0,tb0,0,0,t1.5,2,C0.4,0.65,3,B3,0.65,0.4,Bu0,0,0,tb0,-1.98,0,tu1.3,4,Cb0,$0,ti$y6,a";
const sdfPopper = "0.8,0.2,1,B0.7,0.2,C1.3,0,0,tu0.8,0,0,t0.15,m0.8,s$x-0.25,py7a";
const sdfAcolyte = "0.8,0.2,0.4,O0,0.8,0,t0.1,0.1,0.4,B0,0,0.2,tu$y";
const sdfTrapDoors = "0.3,2,2,B0,0,-2,t0.7,0.8,C1.2,0.5,C0.3,obu$y0.2,m0.95,s0,0,4,tr0.5,px0.5,py-1,-0.3,0,t7a";
const sdfCheckpoint = "0.3,2,U0.09,o0.4,1.8,Ub0.8,S0,0,2,tb1,1,C7a0.1,o2,0.7,0.8,Bi$y0.5,px0,0,-2,tu$y1a";
const sdfCastleWall = "1,1,1,B0.05,0.12,0.25,B1,3,0.8,0.6,f1,-2,-2,t0.05,0.12,0.25,B1,3,0.8,0.6,f1,-2.35,-3,tui1,1,1,B0.95,su6,a";
const sdfCastleWallCap = "1,0.98,1,B0.5,0.5,2,B0,0.7,0,t2,0.5,0.5,B0,0.7,0,tub0.1,m0.9,s6,a";

export const Cube = 0;
export const CubeFramesPerDimension = [1];
export const CubeTotalFrames = 1;
export const RampN = 1;
export const RampNFramesPerDimension = [1];
export const RampNTotalFrames = 1;
export const RampE = 2;
export const RampEFramesPerDimension = [1];
export const RampETotalFrames = 1;
export const RampS = 3;
export const RampSFramesPerDimension = [1];
export const RampSTotalFrames = 1;
export const RampW = 4;
export const RampWFramesPerDimension = [1];
export const RampWTotalFrames = 1;
export const CornerRampNE = 5;
export const CornerRampNEFramesPerDimension = [1];
export const CornerRampNETotalFrames = 1;
export const CornerRampSE = 6;
export const CornerRampSEFramesPerDimension = [1];
export const CornerRampSETotalFrames = 1;
export const CornerRampSW = 7;
export const CornerRampSWFramesPerDimension = [1];
export const CornerRampSWTotalFrames = 1;
export const CornerRampNW = 8;
export const CornerRampNWFramesPerDimension = [1];
export const CornerRampNWTotalFrames = 1;
export const HalfCube = 9;
export const HalfCubeFramesPerDimension = [1];
export const HalfCubeTotalFrames = 1;
export const CastleWallCap = 10;
export const CastleWallCapFramesPerDimension = [1];
export const CastleWallCapTotalFrames = 1;
export const CastleWall = 11;
export const CastleWallFramesPerDimension = [1];
export const CastleWallTotalFrames = 1;
export const PlayerBall = 12;
export const PlayerBallFramesPerDimension = [1];
export const PlayerBallTotalFrames = 1;
export const Coin = 13;
export const CoinFramesPerDimension = [1];
export const CoinTotalFrames = 1;
export const CastleDoor = 14;
export const CastleDoorFramesPerDimension = [1];
export const CastleDoorTotalFrames = 1;
export const Plunger = 15;
export const PlungerFramesPerDimension = [2,8];
export const PlungerTotalFrames = 16;
export const BumpyBeast = 31;
export const BumpyBeastFramesPerDimension = [18];
export const BumpyBeastTotalFrames = 18;
export const Flipper = 49;
export const FlipperFramesPerDimension = [2,8];
export const FlipperTotalFrames = 16;
export const PinballSideBlock = 65;
export const PinballSideBlockFramesPerDimension = [2,1];
export const PinballSideBlockTotalFrames = 2;
export const RaiseBumper = 67;
export const RaiseBumperFramesPerDimension = [1,6];
export const RaiseBumperTotalFrames = 6;
export const Popper = 73;
export const PopperFramesPerDimension = [1,5];
export const PopperTotalFrames = 5;
export const Acolyte = 78;
export const AcolyteFramesPerDimension = [2];
export const AcolyteTotalFrames = 2;
export const TrapDoors = 80;
export const TrapDoorsFramesPerDimension = [8];
export const TrapDoorsTotalFrames = 8;
export const Checkpoint = 88;
export const CheckpointFramesPerDimension = [16];
export const CheckpointTotalFrames = 16;

export const TexturesTotalFrames = 104;

export const generateBoundedTextures = (view: m4, invView: m4, depthOnly:number) => [ 
    renderSdfSpriteAnim(sdfBox, view, invView, depthOnly, CubeFramesPerDimension,[(t, f)=>0]),
    renderSdfSpriteAnim(sdfRamp, view, invView, depthOnly, RampNFramesPerDimension,[(t, f)=>0]),
    renderSdfSpriteAnim(sdfRamp, view, invView, depthOnly, RampEFramesPerDimension,[(t, f)=>PI_2]),
    renderSdfSpriteAnim(sdfRamp, view, invView, depthOnly, RampSFramesPerDimension,[(t, f)=>PI]),
    renderSdfSpriteAnim(sdfRamp, view, invView, depthOnly, RampWFramesPerDimension,[(t, f)=>-PI_2]),
    renderSdfSpriteAnim(sdfCornerRamp, view, invView, depthOnly, CornerRampNEFramesPerDimension,[(t, f)=>0]),
    renderSdfSpriteAnim(sdfCornerRamp, view, invView, depthOnly, CornerRampSEFramesPerDimension,[(t, f)=>PI_2]),
    renderSdfSpriteAnim(sdfCornerRamp, view, invView, depthOnly, CornerRampSWFramesPerDimension,[(t, f)=>PI]),
    renderSdfSpriteAnim(sdfCornerRamp, view, invView, depthOnly, CornerRampNWFramesPerDimension,[(t, f)=>-PI_2]),
    renderSdfSpriteAnim(sdfHalfCube, view, invView, depthOnly, HalfCubeFramesPerDimension,[(t, f)=>0]),
    renderSdfSpriteAnim(sdfCastleWallCap, view, invView, depthOnly, CastleWallCapFramesPerDimension,[(t, f)=>0]),
    renderSdfSpriteAnim(sdfCastleWall, view, invView, depthOnly, CastleWallFramesPerDimension,[(t, f)=>0]),
    renderSdfSpriteAnim(sdfPlayerBall, view, invView, depthOnly, PlayerBallFramesPerDimension,[(t, f)=>C.playerBallRad * 1.1]),
    renderSdfSpriteAnim(sdfCoin, view, invView, depthOnly, CoinFramesPerDimension,[(t, f)=>0]),
    renderSdfSpriteAnim(sdfCastleDoor, view, invView, depthOnly, CastleDoorFramesPerDimension,[(t, f)=>0]),
    renderSdfSpriteAnim(sdfPlungerBox, view, invView, depthOnly, PlungerFramesPerDimension,[(t, f)=>(f[0] ? PI : 0),(t, f)=>2*t[1]]),
    renderSdfSpriteAnim(sdfBumpyBeast, view, invView, depthOnly, BumpyBeastFramesPerDimension,[(t, f)=>t[0] * TWO_PI]),
    renderSdfSpriteAnim(sdfFlipper, view, invView, depthOnly, FlipperFramesPerDimension,[(t, f)=>f[0]*PI+(-(f[0]?(1-t[1]):t[1])*PI_2+PI_2/2)]),
    renderSdfSpriteAnim(sdfPinballSideBlock, view, invView, depthOnly, PinballSideBlockFramesPerDimension,[(t, f)=>f[0]?-1:1]),
    renderSdfSpriteAnim(sdfRaiseBumper, view, invView, depthOnly, RaiseBumperFramesPerDimension,[(t, f)=>4*t[1]]),
    renderSdfSpriteAnim(sdfPopper, view, invView, depthOnly, PopperFramesPerDimension,[(t, f)=>PI-t[1]*PI_2]),
    renderSdfSpriteAnim(sdfAcolyte, view, invView, depthOnly, AcolyteFramesPerDimension,[(t, f)=>t[0] * TWO_PI]),
    renderSdfSpriteAnim(sdfTrapDoors, view, invView, depthOnly, TrapDoorsFramesPerDimension,[(t, f)=>t[0] * PI_2 * 1.4]),
    renderSdfSpriteAnim(sdfCheckpoint, view, invView, depthOnly, CheckpointFramesPerDimension,[(t, f)=>t[0] * TWO_PI]),
];
