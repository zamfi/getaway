// import GameView from './game_view.js';
// import Car from './car.js';
// import { request } from 'http';
import Road from './road.js';
import Life from './life.js';
import Util from './util.js';
import Obstacle from './obstacle.js';
import Physics from './physics.js';
import Cash from './cash.js';
import Car from './car.js';
import assets from './assets.js';

import speed from './physics.js'
const fs = require('fs'); 
const lifeImgFolder = "./assets/images/life/";
const obstacleImgFolder = "./assets/images/obstacle/";
const moneyImgFolder = "./assets/images/money/";
var ctr = 0;
const T_width = 80; //car width/2 + obstacle width/2 + small const: Used for avoiding obstacles
const R_l = 150; // road lb in x; //100 pixels on each side for dead zone?
const R_u = 350; // road ub in x;
const Kp_obs = 0.03; //Kp for x-tracker on car for obstacle avoidance
const Kp_getter = 0.01; //Kp for x-tracker on car to get life or cash
const obj_buf = 75+40; //constant for when object goes behind car (1/2 of car len) + buffer
const OBJECTTYPE = Object.freeze({ "obstacle": "O", "cash": "C", "life": "L" });
const QUERYTYPE = Object.freeze({ "attention": "A", "environment": "E"});

const MIN_BOX_DISTANCE_RATIO = 0.1; //It will get boxed at a maximum distance of 0.3*Canvas Height from start
const MAX_BOX_DISTANCE_RATIO = 0.4; //It will get boxed at a maximum distance of 0.3*Canvas Height from start
const NO_QUERY_TIME_WINDOW_FOR_ENV_QUERY = 3000;// in milliseconds
const ATT_QUERY_INTERVAL = 10000; // in milliseconds
const EXP_PROB_TIME_CONSTANT = 8500;// in milliseconds
const QUERY_TIMEOUT = 4000; // in milliseconds 
const OBJECT_CREATION_INTERVAL = 2500;

//Distractor task stuffs
const CONTROLLER_SAMPLING_TIME = 500;// in milliseconds
const DISTRACTOR_TASK_TIME = 5000; //Also the timeout for distractor tasl // in milliseconds
const DISTRACTOR_TASK_PAUSE = 1500;// in milliseconds
const GAME_TIME = 2 * 60000;// in milliseconds

const MIN_RES_WIDTH = 1280;
const MIN_RES_HEIGHT = 800;

var datalogWritten = false;
//Event types


// const EVENTTYPE = Object.freeze({
//   "CREATE_ASSET": 0,
//   "CORRECT_BOXED_RESPONSE": 1,
//   "WRONG_BOXED_RESPONSE": 2,
//   "TIMEOUT_BOXED_RESPONSE": 3,
//   "CORRECT_DIST_RESPONSE": 4,
//   "WRONG_DIST_RESPONSE": 5,
//   "TIMEOUT_DIST_RESPONSE": 6,
//   "RANDOMIZE_ICON": 7,
//   "ENV_QUERY_CREATED": 8,
//   "ATT_QUERY_CREATED": 9,
//   "ENV_QUERY_ACTIVE": 10,
//   "ATT_QUERY_ACTIVE": 11
// });

const EVENTTYPE = Object.freeze({
  "CREATE_ASSET": "CREATE_ASSET",
  "CORRECT_BOXED_RESPONSE": "CORRECT_BOXED_RESPONSE",
  "WRONG_BOXED_RESPONSE": "WRONG_BOXED_RESPONSE",
  "TIMEOUT_BOXED_RESPONSE": "TIMEOUT_BOXED_RESPONSE",
  "CORRECT_DIST_RESPONSE": "CORRECT_DIST_RESPONSE",
  "WRONG_DIST_RESPONSE": "WRONG_DIST_RESPONSE",
  "TIMEOUT_DIST_RESPONSE": "TIMEOUT_DIST_RESPONSE",
  "RANDOMIZE_ICON": "RANDOMIZE_ICON",
  "ENV_QUERY_CREATED": "ENV_QUERY_CREATED",
  "ATT_QUERY_CREATED": "ATT_QUERY_CREATED",
  "NEW_MAIN_QUERY": "NEW_MAIN_QUERY",
  "ASSET_PASSED_CANVAS": "ASSET_PASSED_CANVAS",
  "ASSET_CAR_COLLIDED": "ASSET_CAR_COLLIDED",
  "NEW_DIST_QUERY": "NEW_DIST_QUERY",
  "GAME_OVER": "GAME_OVER",
  "GAME_START":"GAME_START"
});

var prev_time = null;
var prev_object_y = null;
var max_time = 15;
function indexOfSmallest(a) {
 var lowest = 0;
 for (var i = 1; i < a.length; i++) {
  if (a[i] < a[lowest]) lowest = i;
 }
 return lowest;
}

class Game {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.gameOver = false;
    this.rocks = [];
    this.life = [];
    this.cash = [];
    this.boxed = [];
    this.assets = assets();
    this.animate = null;
    this.lifeImgSrc = "./assets/images/life/life (1).png";
    this.rockImgSrc = "./assets/images/obstacle/obstacle (1).png";
    this.moneyImgSrc = "./assets/images/money/money (1).png";
    this.lifeImgLists = [];
    this.moneyImgLists = [];
    this.obstacleImgLists = [];
    this.numImgs = 16;
    this.assetidCounter = -1;
    this.activeResponse = false;
    this.stopBlink = false;
    this.queryType = null;
    this.queryTimeElapsed = false;
    this.queryUserResponded = false;


    var d = new Date();

    this.timeOfLastEnvQuery = d.getTime();
    this.timeOfLastAttQuery = d.getTime();
    this.timeOfLastDistractorTask = d.getTime();
    this.timeOfEnvQueryPlanning = -1; //Time at which env query's random interval duration was defined
    this.randomIthObjectForEnvQuery = 100000000; //Some high value //Pick the ith object starting this object creation cycle (0 this one)
    this.objectCounterForEnvQuery = -1;
    this.startTime = GAME_TIME*2; // Some high value greater than game time
    this.num2 = 0; // An integer between 0 to 99
    this.num3 = 0; // An integer between 0 to 9
    this.num1 = 0;
    this.distractorTaskActive = true;

    this.dataLog = "";
    
    this.newDistractorTask();

    for (var i = 0; i < this.numImgs; i++) {
      this.lifeImgLists.push(lifeImgFolder + "life (" + (i + 1).toString() + ").png");
      this.moneyImgLists.push(moneyImgFolder + "money (" + (i + 1).toString() + ").png");
      this.obstacleImgLists.push(obstacleImgFolder + "obstacle (" + (i + 1).toString() + ").png");
    }
    document.getElementById("obstacle").style["background-image"] = "url(\'" + this.rockImgSrc + "\')";
    document.getElementById("money").style["background-image"] = "url(\'" + this.moneyImgSrc + "\')";
    document.getElementById("life").style["background-image"] = "url(\'" + this.lifeImgSrc + "\')";

    

  }

  


  holdCanvas(blinkDuration,color) {
    var interval = window.setInterval(function () {
      document.getElementById("canvas").style["border"] = "20px solid "+color;
    }, 5);

    setTimeout(function (y) {
      document.getElementById("canvas").style["border"] = "20px solid black";
      clearInterval(y);
    }, blinkDuration, interval);
  }
  
  holdDistractorCanvas(blinkDuration, color) {
    var interval = window.setInterval(function () {
      document.getElementById("distractortask").style["border"] = "20px solid " + color;
    }, 5);

    setTimeout(function (y) {
      document.getElementById("distractortask").style["border"] = "20px solid black";
      clearInterval(y);
    }, blinkDuration, interval);
  }

blinkCanvas(blinkRate, blinkDuration,color) {
  var interval = window.setInterval(function () {
    if (document.getElementById("canvas").style["border"] != "20px solid "+color) {
      document.getElementById("canvas").style["border"] = "20px solid "+color;
    } else {
      document.getElementById("canvas").style["border"] = "20px solid black";
    }
  }, blinkRate);

  setTimeout(function (y) {
    document.getElementById("canvas").style["border"] = "20px solid black";
    clearInterval(y);
  }, blinkDuration, interval);
}

askEnvironmentQueryBasedOnEnvironmentProbFunction_deprecated() {
    var d = new Date();

    // var a = Math.random();
    // var thresh = 1-Math.exp(-1 * (d.getTime() - this.timeOfLastAttQuery) / EXP_PROB_TIME_CONSTANT);
 if(this.timeOfEnvQueryPlanning<0 && 
  this.timeOfLastAttQuery>this.timeOfLastEnvQuery &&
  (d.getTime() - this.timeOfLastAttQuery) > 0.5 * NO_QUERY_TIME_WINDOW_FOR_ENV_QUERY ){ //If this is negative that means that we are yet to plan the environment query

   var durationLeft =  this.timeOfLastAttQuery + ATT_QUERY_INTERVAL - d.getTime() - 0.5 * NO_QUERY_TIME_WINDOW_FOR_ENV_QUERY;
   if(durationLeft >0 )
   {
      this.randomTimeIntervalEnvQuery = Math.random() * durationLeft; //Uniform sampling
      console.log("Random time interval is "+this.randomTimeIntervalEnvQuery*0.001+" seconds.");
      this.timeOfEnvQueryPlanning = d.getTime();
   }
    return(false);
 }

  if(d.getTime() - this.timeOfEnvQueryPlanning > this.randomTimeIntervalEnvQuery)
  {
      this.timeOfEnvQueryPlanning = -1;
      return(true);
  }
    
 }

 askEnvironmentQueryBasedOnEnvironmentProbFunction() {
  var d = new Date();

  // var a = Math.random();
  // var thresh = 1-Math.exp(-1 * (d.getTime() - this.timeOfLastAttQuery) / EXP_PROB_TIME_CONSTANT);
if(this.timeOfEnvQueryPlanning<0 && this.timeOfLastAttQuery>this.timeOfLastEnvQuery){ //If this is negative that means that we are yet to plan the environment query

  var NumObjectsBetweenWindows = floor((ATT_QUERY_INTERVAL - 2*QUERY_TIMEOUT)/OBJECT_CREATION_INTERVAL) ; //(d.getTime() - this.timeOfLastAttQuery) > 0.5 * NO_QUERY_TIME_WINDOW_FOR_ENV_QUERY 
  this.randomIthObjectForEnvQuery = floor(Math.random()*NumObjectsBetweenWindows)+1;
  this.timeOfEnvQueryPlanning = d.getTime();
  return(false);

}

if(d.getTime() - this.timeOfEnvQueryPlanning > this.randomIthObjectForEnvQuery*OBJECT_CREATION_INTERVAL - 200) //epsilon is 200 milliseconds
{
    this.timeOfEnvQueryPlanning = -1;
    return(true);
}
  
}
setRecognizedType(assetid,assetUserSpecifiedType){
  var assetActualType = assetid[0];
  var i;
  switch(assetActualType){
    case "O":
      
      for (i = 0; i < this.rocks.length; i++) {
        if(this.rocks[i].assetid == assetid){
          this.rocks[i].recognizedType = assetUserSpecifiedType;
          break;
        }
      }
      break;
    case "L":
      for (i = 0; i < this.life.length; i++) {
        if(this.life[i].assetid == assetid){
          this.life[i].recognizedType = assetUserSpecifiedType;
          break;
        }
      }
      break;
    case "C":
      for (i = 0; i < this.cash.length; i++) {
        if(this.cash[i].assetid == assetid){
          this.cash[i].recognizedType = assetUserSpecifiedType;
          break;
        }
      }
      break;
      default:
        console.log("Unrecognized asset type");
  }
  }

  newDistractorTask() {
    var d = new Date();
    this.num2 = Math.floor(Math.random() * 100); // An integer between 0 to 99
    this.num3 = Math.floor(Math.random() * 10); // An integer between 0 to 9
    this.num1 = this.num2 + this.num3;
    document.getElementById("num1").innerHTML = this.num1.toString();
    document.getElementById("num2").innerHTML = this.num2.toString();
    document.getElementById("num3").innerHTML = "???";
    this.timeOfLastDistractorTask = d.getTime();

    this.logEvent(EVENTTYPE.NEW_DIST_QUERY, this.num1.toString() + "-" + this.num2.toString() + " = ???");
  }

  checkDistractorTaskAnswer(i) {
    
    if(this.num3>=0){ // if num3 is greater than 0 then , then the distractor task is active
      if (i == this.num3) {
        this.holdDistractorCanvas(DISTRACTOR_TASK_PAUSE, "green");
        // Code to do things on correct answer to distractor task
        this.logEvent(EVENTTYPE.CORRECT_DIST_RESPONSE, this.num1.toString()+"-"+this.num2.toString()+"="+i.toString());
      }
      else {
        this.holdDistractorCanvas(DISTRACTOR_TASK_PAUSE, "red");
        this.logEvent(EVENTTYPE.WRONG_DIST_RESPONSE, this.num1.toString() + "-" + this.num2.toString() + "=" + i.toString());
        // Code to do things on wrong answer to distractor task
      }
      document.getElementById("num3").innerHTML = i.toString();
      //this.num3 = -1; // set to inactive
    }
    //this.newDistractorTask();
    this.distractorTaskActive = false;
    var _this = this;
    setTimeout(function () {
      _this.newDistractorTask();
      _this.distractorTaskActive = true;
    }, DISTRACTOR_TASK_PAUSE);
    //setTimeout(this.newDistractorTask, DISTRACTOR_TASK_TIMEOUT);
  }
  checkUserResponse(i) {

    if (this.boxed.length > 0 && this.activeResponse) {
      this.queryUserResponded = true;
          if (this.boxed[0][0] == i) {
              //Blink green
            //document.getElementById("canvas").style["border"] = "20px solid green";
            this.holdCanvas(2000, "green");
            // Write functions to do whatever has to be done when user enteres correct response
            this.activeResponse = false;
            this.setRecognizedType(this.boxed[0], i);
            this.logEvent(EVENTTYPE.CORRECT_BOXED_RESPONSE, i+"-"+this.boxed[0]);

          }
          else {
            //Blink red
            //document.getElementById("canvas").style["border"] = "20px solid red";
            this.holdCanvas(2000, "red");
            // Write functions to do whatever has to be done when user enteres wrong response
            this.activeResponse = false;
            this.setRecognizedType(this.boxed[0], i)
            this.logEvent(EVENTTYPE.WRONG_BOXED_RESPONSE, i + "-" + this.boxed[0]);
          }
      }
  }

  updateDistractorTimeBar() {

      var d = new Date();

    if (this.distractorTaskActive) {
      var time_bar_length = (DISTRACTOR_TASK_TIME - (d.getTime() - this.timeOfLastDistractorTask))/1000;
        
      var elem = document.getElementById("distractorBar");
      elem.style.width = ((time_bar_length / (DISTRACTOR_TASK_TIME*0.001)) * 100) + "%";
      document.getElementById("distractorBarTime").innerHTML = `${Math.floor((time_bar_length) * 10) / 10 + "s"}`;
      //console.log(Math.floor(time_bar_length*10)/10+"s");
      
      if (time_bar_length < 0.05) {
        this.holdDistractorCanvas(DISTRACTOR_TASK_PAUSE, "red");
        this.distractorTaskActive = false;
        this.logEvent(EVENTTYPE.TIMEOUT_DIST_RESPONSE, this.num1.toString()+"-"+this.num2.toString()+" = ???");
        

        var _this = this;
        setTimeout(function () {
          _this.newDistractorTask();
          _this.distractorTaskActive = true;
        }, DISTRACTOR_TASK_PAUSE);
      }
    }
    }


  updateTimeBar() {
    
    //Check if boxed is empty; if it is; disbale "What is boxed item?" and time bar and do nothing
    //else run everything below
    var boxEmpty = Array.isArray(this.boxed) && !this.boxed.length;

    if (boxEmpty || this.queryTimeElapsed || this.queryUserResponded)
    {
      //document.getElementById("myProgress").innerHTML = '';
      document.getElementById("myProgress").style.display = "none";
      document.getElementById("keyW").style.display = "none";
      document.getElementById("keyQ").style.display = "none";
      document.getElementById("keyE").style.display = "none";
      document.getElementById("maintaskQuestion").style.display = "none";
     }

    else //if (!boxEmpty && !this.queryTimeElapsed)
    {
      //document.getElementById("myProgress").innerHTML ='<div class ="time-bar-container">Time remaining: <div id="myBarTime"></div> </div > <div id="myBar"></div>';
      document.getElementById("myProgress").style.display = "block";
      document.getElementById("keyW").style.display = "flex";
      document.getElementById("keyQ").style.display = "flex";
      document.getElementById("keyE").style.display = "flex";
      document.getElementById("maintaskQuestion").style.display = "block";

      var objectType = this.closestObject(); // 0: cash, 1: rock, 2: life, 3: no spawned object ahead

      var object_y = null;
      var object_height = null;
      const car_y = this.assets.car.physics.y;
      const car_height = this.assets.car.physics.height ? this.assets.car.physics.height : this.assets.car.sprite.height*this.assets.car.sprite.height_scale;
      var speed = 0;
      var curr_time;
      if(objectType == 0){
        object_height = this.cash[0].physics.height ? this.cash[0].physics.height : this.cash[0].sprite.height*this.cash[0].sprite.height_scale;
        object_y = this.cash[0].physics.y;
        curr_time = (new Date()).getTime();
      }
      else if(objectType == 1){
        object_height = this.rocks[0].physics.height ? this.rocks[0].physics.height : this.rocks[0].sprite.height*this.rocks[0].sprite.height_scale;
        object_y = this.rocks[0].physics.y;
        curr_time = (new Date()).getTime();
      }
      else if(objectType == 2){
        object_height = this.life[0].physics.height ? this.life[0].physics.height : this.life[0].sprite.height*this.life[0].sprite.height_scale;
        object_y = this.life[0].physics.y;
        curr_time = (new Date()).getTime();
      }

      
      if(prev_time == null)
      {
        speed = null;
        prev_time = curr_time;
      }
      if(prev_object_y == null){
        speed = null;
        prev_object_y = object_y;
        prev_time = curr_time;
      }

      if(object_y == null)
      {
        speed = null;
      }

      if(object_y!=null && prev_object_y!=null){
          if(object_y < prev_object_y){
            speed = null;
            prev_object_y = object_y;
            prev_time = curr_time;
          }
      }

      if(speed!=null){
        var d = new Date();
        
        //speed = (object_y - prev_object_y) / (0.001*(curr_time - prev_time));
        speed = 24;
        max_time = car_y /speed;
        var time_bar_length = ((car_y) - (object_y+object_height))/speed;
        // console.log("Time bar length: "+Math.floor(time_bar_length) + ", Speed: "+speed
        //           + ", Car_y: "+car_y + ", Car_height: " +car_height
        //           + ", Object_y: "+object_y + ", Object_height: " +object_height
        //           + ", Prev_time: "+prev_time+ ", Prev_object_y: " +prev_object_y
        //           + ", Curr_time: "+curr_time+ ", Object_y: " +object_y);
        prev_object_y = object_y;
        prev_time = curr_time;
        var elem = document.getElementById("myBar");
        elem.style.width = (((time_bar_length-0.001*QUERY_TIMEOUT)/max_time)*100) + "%";
        document.getElementById("myBarTime").innerHTML = `${Math.floor((time_bar_length-0.001*QUERY_TIMEOUT)*10)/10+"s"}`;
        //console.log(Math.floor(time_bar_length*10)/10+"s");
        if (time_bar_length < 0.001*QUERY_TIMEOUT && time_bar_length > 0.1
          && !this.queryTimeElapsed
          && !this.queryUserResponded
        ) {
          if (this.queryType == QUERYTYPE.attention) {
            this.setRecognizedType(this.boxed[0], this.boxed[0][0]);
            // Makes the controller act SAFE
          }
          else if(this.queryType == QUERYTYPE.environment) {
            this.setRecognizedType(this.boxed[0], this.boxed[0][0] == OBJECTTYPE.obstacle ? OBJECTTYPE.life : OBJECTTYPE.obstacle); 
            // Makes the controller act EVIL
          }
          // Write code on what needs to be done after Query time is elapsed
          this.holdCanvas(2000, "red");
          this.activeResponse = false;
          this.queryTimeElapsed = true;
          this.logEvent(EVENTTYPE.TIMEOUT_BOXED_RESPONSE,  "U-"+this.boxed[0]);
        }
        }
    }

  }

  // hit detection for objects
  static checkCollision(car, object, array, assets,boxed,_this) {
    if (object instanceof Obstacle) {
      if (Util.collide_with_scale(car, object)) {
        car.hitObstacle();
        car.makeRed();
        array.splice(array.indexOf(object), 1);
        console.log("Before removing");
        console.log(boxed);
        console.log(object.assetid);
        if (boxed.indexOf(object.assetid) != -1) {
          boxed.splice(boxed.indexOf(object.assetid), 1);
          _this.logEvent(EVENTTYPE.ASSET_CAR_COLLIDED, object.assetid);
          
        }
        console.log("After removing");
        console.log(boxed);
        console.log(object.assetid);
      }
    }
    if (object instanceof Life) {
      if (Util.collide_with_scale(car, object)) {
        car.getLife();
        car.makeGreen();
        array.splice(array.indexOf(object), 1);
        console.log("Before removing");
        console.log(boxed);
        console.log(object.assetid);
        if (boxed.indexOf(object.assetid) != -1) {
          boxed.splice(boxed.indexOf(object.assetid), 1);
          _this.logEvent(EVENTTYPE.ASSET_CAR_COLLIDED, object.assetid);
          
        }
        console.log("After removing");
        console.log(boxed);
        console.log(object.assetid);
      }
    }
    if (object instanceof Cash) {
      if (Util.collide_with_scale(car, object)) {
        assets.road.score += 100;
        assets.road.makeGreen();
        array.splice(array.indexOf(object), 1);
        console.log("Before removing");
        console.log(boxed);
        console.log(object.assetid);
        if (boxed.indexOf(object.assetid) != -1) {
          boxed.splice(boxed.indexOf(object.assetid), 1);
          _this.logEvent(EVENTTYPE.ASSET_CAR_COLLIDED, object.assetid);
          
        }
        console.log("After removing");
        console.log(boxed);
        console.log(object.assetid);
      }
    }
  }
  obstacleProbablityFunction() {
    return (Math.random() > 0.5);
  }

  moneyProbablityFunction() {
    return (Math.random() > 0.5);
  }

  lifeProbablityFunction() {
    return (Math.random() > 0.5);
  }
  // obstacleBoxProbablityFunction() {
  //   return (Math.random() > 0.5);
  // }

  // moneyBoxProbablityFunction() {
  //   return (Math.random() > 0.5);
  // }

  // lifeBoxProbablityFunction() {
  //   return (Math.random() > 0.5);
  // }

  objectTypeProbablityFunction() {
    var a = Math.random();

    if (a > 0 && a < 0.33)
      return (OBJECTTYPE.obstacle);
    else if (a >= 0.33 && a < 0.66)
      return (OBJECTTYPE.life);
    else
      return (OBJECTTYPE.cash);
  }

  boxDistanceProbablityFunction() {
    // Uniform probablity between 0.1 and 0.4
    return (MIN_BOX_DISTANCE_RATIO+Math.random()*(MAX_BOX_DISTANCE_RATIO-MIN_BOX_DISTANCE_RATIO));
  }

  
  // checks if item passed canvas height to delete
  static checkCanvas(object, array, boxed,_this) {

    if (object instanceof Life) {
      
      if (object.physics.y > canvas.height) {
        array.splice(array.indexOf(object), 1);
        if (boxed.indexOf(object.assetid) != -1){
          boxed.splice(boxed.indexOf(object.assetid), 1);
          _this.logEvent(EVENTTYPE.ASSET_PASSED_CANVAS, object.assetid);
          
         }
      }
    }
    if (object instanceof Obstacle) {
      
      if (object.physics.y > canvas.height) {
        array.splice(array.indexOf(object), 1);
        if (boxed.indexOf(object.assetid) != -1) {
          boxed.splice(boxed.indexOf(object.assetid), 1);
          _this.logEvent(EVENTTYPE.ASSET_PASSED_CANVAS, object.assetid);
          
        }
      }
    }
    if (object instanceof Cash) {
      
      if (object.physics.y > canvas.height) {
        array.splice(array.indexOf(object), 1);
        if (boxed.indexOf(object.assetid) != -1) {
          boxed.splice(boxed.indexOf(object.assetid), 1);
          _this.logEvent(EVENTTYPE.ASSET_PASSED_CANVAS, object.assetid);
          
        }
      }
    }
    // console.log("After removing");
    // console.log(boxed);
  }

  drawAsset(asset) {
    const { physics, sprite, box, marked, distance } = asset;

    // redraw road
    if (asset instanceof Road && asset.physics.y >= 0) {
      if (sprite.height > canvas.height) {
        if (asset.physics.y > (canvas.height)) {
          asset.physics.y = canvas.height - sprite.height;
        }

        this.ctx.drawImage(sprite.img, 0, 0, sprite.width, sprite.height, asset.physics.x, asset.physics.y - sprite.height + 1, sprite.width, sprite.height);
      }
    }

    // draw more rocks
    if (asset instanceof Obstacle && asset.physics.y >= 0) {
      if (asset.physics.y > canvas.height) {
        this.ctx.drawImage(sprite.img, 0, 0, sprite.width, sprite.height, asset.physics.x, asset.physics.y - 900, sprite.width * sprite.width_scale, sprite.height * sprite.height_scale);
        //console.log("Drawing rock");

        // if(marked){
        //   //this.ctx.drawImage(box.img, 0, 0, box.width, box.height, asset.physics.x, asset.physics.y - 900, box.width*sprite.width_scale, box.height*sprite.height_scale);
        //   this.ctx.drawImage(box.img, 0, 0, box.width, box.height, asset.physics.x+0.5*(sprite.width*sprite.width_scale-box.width*sprite.width_scale), asset.physics.y - 900 + 0.5*(sprite.height*sprite.height_scale - box.height*box.height_scale), box.width*box.width_scale, box.height*box.height_scale);
        // }
      }
    }

    if (asset instanceof Car) {
      // this.ctx.drawImage(sprite.img,
      //   0, 0, sprite.width, sprite.height,
      //   physics.x, physics.y, sprite.width, sprite.height);
      asset.draw(this.ctx);
    } else {
      // draw everything else
      this.ctx.drawImage(sprite.img, 0, 0, sprite.width, sprite.height,
        physics.x, physics.y, sprite.width * sprite.width_scale, sprite.height * sprite.height_scale);
      if (marked &&  physics.y>distance*this.canvas.height) {

          //this.ctx.drawImage(box.img, 0, 0, box.width, box.height, physics.x, physics.y, box.width*sprite.width_scale, box.height*sprite.height_scale);
        
        //console.log("Boxed Object Reconized Type: "+asset.recognizedType);
       
            if (this.boxed.indexOf(asset.assetid) == -1) {
            // console.log("After adding");
              if (this.boxed.length == 0){ // Ensures that only one object is queried upon at a time, even if multiple objects are unrecognized
                this.boxed.push(asset.assetid);
                this.blinkCanvas(30, 300, "blue");
                this.activeResponse = true;
                this.queryTimeElapsed = false;
                this.queryUserResponded = false;
                this.logEvent(EVENTTYPE.NEW_MAIN_QUERY, asset.assetid);

              }
            // console.log(this.boxed);
            }
            else {
              this.ctx.drawImage(box.img, 0, 0, box.width, box.height, physics.x + 0.5 * (sprite.width * sprite.width_scale - box.width * box.width_scale), asset.physics.y + 0.5 * (sprite.height * sprite.height_scale - box.height * box.height_scale), box.width * box.width_scale, box.height * box.height_scale);
            }

        }
    }



    // update position of all objects
    if (this.assets.car.life != 0) {
      if (asset instanceof Car) {
        physics.boundedUpdate();
      } else {
        physics.updatePosition();
      }
    }
  }

  randomizesprite() {
    var rnd1 = Math.floor(Math.random() * Math.floor(this.numImgs));
    var rnd2 = Math.floor(Math.random() * Math.floor(this.numImgs));
    var rnd3 = Math.floor(Math.random() * Math.floor(this.numImgs));
    this.lifeImgSrc = this.lifeImgLists[rnd1];
    this.moneyImgSrc = this.moneyImgLists[rnd2];
    this.rockImgSrc = this.obstacleImgLists[rnd3];
    //console.log(this.lifeImgSrc);
    // this.rocks.forEach(el => {
    //   el.updatesprite(this.rockImgSrc);
    // })
    // this.life.forEach(el => {
    //   el.updatesprite(this.lifeImgSrc);
    // })
    // this.cash.forEach(el => {
    //   el.updatesprite(this.moneyImgSrc);
    // })
    //document.getElementById("obstacle").style["background-image"] = "url(+\'" +"../images/life/life (1).png"+"\')";
    document.getElementById("obstacle").style["background-image"] = "url(\'" + this.rockImgSrc + "\')";
    document.getElementById("money").style["background-image"] = "url(\'" + this.moneyImgSrc + "\')";
    document.getElementById("life").style["background-image"] = "url(\'" + this.lifeImgSrc + "\')";
    this.logEvent(EVENTTYPE.RANDOMIZE_ICON, this.lifeImgSrc + ":" + this.moneyImgSrc + ":" + this.rockImgSrc);
  }

  draw() {
    if (!this.gameOver) {
      const animate = () => {
        const assets = Object.values(this.assets);
        this.animate = requestAnimationFrame(animate);
        this.ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < assets.length; i++) {
          this.drawAsset(assets[i]);
        }

        // check collision for rocks
        this.rocks.forEach(el => {
          Game.checkCollision(this.assets.car, el, this.rocks,this.assets,this.boxed,this);
          Game.checkCanvas(el, this.rocks, this.boxed,this);
        })

        // check collision for life

        this.life.forEach(el => {
          Game.checkCollision(this.assets.car, el, this.life,this.assets,this.boxed,this);
          Game.checkCanvas(el, this.life,this.boxed,this);
        })

        // check collision for life
        this.cash.forEach(el => {
          Game.checkCollision(this.assets.car, el, this.cash, this.assets,this.boxed,this);
          Game.checkCanvas(el, this.cash,this.boxed,this);
        })

        this.life.forEach(el => {
          this.drawAsset(el);
          el.move();
        });

        this.rocks.forEach(el => {
          this.drawAsset(el);
          el.move();
        })

        this.cash.forEach(el => {
          this.drawAsset(el);
          el.move();
        })

        // render score and lives
        this.assets.road.addScore();
        // document.getElementById("score").innerHTML = `${this.assets.road.score}`;
        // document.getElementById("lives").innerHTML = `${this.assets.car.life}`;
        this.end();
      }

      animate();
    }
  }

  end() {
    var d = new Date();
    
    if (d.getTime() - this.startTime > GAME_TIME) { //  TODO:Termination condition
      this.logEvent(EVENTTYPE.GAME_OVER, "");
      this.gameOver = true;
      this.assets.road.stop();
      this.activeResponse = false;
      this.distractorTaskActive = false;
      this.draw();
      document.getElementById("slow").innerHTML = `Game Over!`;
      document.getElementById("how").style.visibility = "hidden";
      document.getElementById("welcome").style.display = null;
    }
    if (d.getTime() - this.startTime > GAME_TIME && !datalogWritten) {
      console.log(this.dataLog);
      datalogWritten = true;
      //Code to write to a server data log file goes here
    }
  }

  createRock(bool_marked) {

    var boxDist = this.boxDistanceProbablityFunction();
    this.rocks.push(new Obstacle(new Physics(
      Math.floor(Math.random() * 310) + 80,
      -20),this.rockImgSrc,bool_marked,(OBJECTTYPE.obstacle+(++this.assetidCounter).toString()), boxDist
    ));

    //DATA_LOG
    this.logEvent(EVENTTYPE.CREATE_ASSET, OBJECTTYPE.obstacle + this.assetidCounter.toString());
    if (this.queryType == QUERYTYPE.environment) {
      this.logEvent(EVENTTYPE.ENV_QUERY_CREATED, OBJECTTYPE.obstacle + this.assetidCounter.toString() + ":" + boxDist);
    }
    else if (this.queryType == QUERYTYPE.attention) {
      this.logEvent(EVENTTYPE.ATT_QUERY_CREATED, OBJECTTYPE.obstacle + this.assetidCounter.toString() + ":" + boxDist);
    }
  };

  createLife(bool_marked) {
    var boxDist = this.boxDistanceProbablityFunction();
    this.life.push(new Life(new Physics(
      Math.floor(Math.random() * 310) + 80,
      -20), this.lifeImgSrc, bool_marked, (OBJECTTYPE.life + (++this.assetidCounter).toString()), boxDist
    ));
    //DATA_LOG
    this.logEvent(EVENTTYPE.CREATE_ASSET, OBJECTTYPE.life + this.assetidCounter.toString());
    if (this.queryType == QUERYTYPE.environment) {
      this.logEvent(EVENTTYPE.ENV_QUERY_CREATED, OBJECTTYPE.life + this.assetidCounter.toString() + ":" + boxDist);
    }
    else if (this.queryType == QUERYTYPE.attention) {
      this.logEvent(EVENTTYPE.ATT_QUERY_CREATED, OBJECTTYPE.life + this.assetidCounter.toString() + ":" + boxDist);
    }
  };

  createCash(bool_marked) {
    var boxDist = this.boxDistanceProbablityFunction();
    this.cash.push(new Cash(new Physics(
      Math.floor(Math.random() * 310) + 80,
      -20), this.moneyImgSrc, bool_marked, (OBJECTTYPE.cash + (++this.assetidCounter).toString()), boxDist
    ));

    //DATA_LOG
    this.logEvent(EVENTTYPE.CREATE_ASSET, OBJECTTYPE.cash + this.assetidCounter.toString());
    if (this.queryType == QUERYTYPE.environment) {
      this.logEvent(EVENTTYPE.ENV_QUERY_CREATED, OBJECTTYPE.cash + this.assetidCounter.toString() + ":" + boxDist);
    }
    else if (this.queryType == QUERYTYPE.attention) {
      this.logEvent(EVENTTYPE.ATT_QUERY_CREATED, OBJECTTYPE.cash + this.assetidCounter.toString() + ":" + boxDist);
    }
    
  };

  cleanUp() {
    // clearInterval(this.create);
    window.cancelAnimationFrame(this.animate);
  }

  releaseControls() {
    // set controls to zero to mimic  key release (0-order hold)
    //console.info("Controls: Release")
    this.assets.car.physics.dLeft=0;
    this.assets.car.physics.dRight=0;
    this.assets.car.physics.dUp=0;
    this.assets.car.physics.dDown=0;
  }

  moveLeft(u) {
  //move car left by u
  this.assets.car.physics.dLeft=u;
  }

  moveRight(u) {
  //move car left by u
  this.assets.car.physics.dRight=u;
  }

  closestObject() {
    //returns type of object closest to car (in front)
    // 0: cash, 1: rock, 2: life, 3: no spawned object ahead

    var y_cash;
    var y_rocks;
    var y_life;
    //console.info("Trying to find closest obj type")
    if(this.cash && this.cash.length>0)// && this.cash[0].recognizedType != "U") //check Cash
    {      y_cash = this.cash[0].physics.y;     }//of the oldest cash created
      else {y_cash = -10000;} //a number that places it far away

    if(this.rocks && this.rocks.length>0)// && this.rocks[0].recognizedType != "U") //check Rock
    {          y_rocks = this.rocks[0].physics.y;     }
      else {y_rocks = -10000;} //a number that places it far away

    if(this.life && this.life.length>0)// && this.life[0].recognizedType != "U") //check life
    {          y_life = this.life[0].physics.y;     }
      else {y_life = -10000;} //a number that places it far away

    var y_car = this.assets.car.physics.y;
    var dists_y = [10000*((y_car-y_cash)<=-obj_buf)+(y_car-y_cash)*((y_car-y_cash)>-obj_buf),
                   10000*((y_car-y_rocks)<=-obj_buf)+(y_car-y_rocks)*((y_car-y_rocks)>-obj_buf),
                   10000*((y_car-y_life)<=-obj_buf)+(y_car-y_life)*((y_car-y_life)>-obj_buf),
                 ]; //if object is behind var, make this a large positive value
    var ix_min = indexOfSmallest(dists_y);
   //console.info("Controls: Closest type: ",ix_min);
   //console.info("Controls: Distance in y = ",dists_y[ix_min]);

    if(dists_y[ix_min]>10000) //no spawned object ahead
    {ix_min = 3; }
    return ix_min;
   
 } //end of closestObject

  closestObjectAndLocation() {
    //returns type of object closest to car (in front)
    // 0: cash, 1: rock, 2: life, 3: no spawned object ahead

    var y_cash;
    var y_rocks;
    var y_life;
    var object_x=0; //x coordinate of closest object
    var actual_type = 3;
    var identified_type =3;		
    //console.info("Trying to find closest obj type")
    if(this.cash && this.cash.length>0) //check Cash existence
    {      
        if(this.cash[0].recognizedType != "U") //and if recognized 
	{
        y_cash = this.cash[0].physics.y;     
	identified_type = (this.cash[0].recognizedType=="C")? 0 : ((this.cash[0].recognizedType=="O") ? 1 : 2);
	object_x = this.cash[0].physics.x;
	}
    }//of the oldest cash created
      else {y_cash = -10000;} //a number that places it far away

    if(this.rocks && this.rocks.length>0) //check Rock
    {          
        if(this.rocks[0].recognizedType != "U") //and if recognized
        {
	y_rocks = this.rocks[0].physics.y;
	identified_type = (this.rocks[0].recognizedType=="O")? 1 : ((this.rocks[0].recognizedType=="C") ? 0 : 2);
        object_x = this.rocks[0].physics.x;      
	}
    }
      else {y_rocks = -10000;} //a number that places it far away

    if(this.life && this.life.length>0) //check life
    {   
        //console.info("Closest is life");       
        if(this.life[0].recognizedType != "U") //and if recogd
        {
	y_life = this.life[0].physics.y;     
	identified_type = (this.life[0].recognizedType=="L")? 2 : ((this.life[0].recognizedType=="C") ? 0 : 1);
        object_x = this.life[0].physics.x; 
	}
    }
      else {y_life = -10000;} //a number that places it far away

    var y_car = this.assets.car.physics.y;
    var dists_y = [10000*((y_car-y_cash)<=-obj_buf)+(y_car-y_cash)*((y_car-y_cash)>-obj_buf),
                   10000*((y_car-y_rocks)<=-obj_buf)+(y_car-y_rocks)*((y_car-y_rocks)>-obj_buf),
                   10000*((y_car-y_life)<=-obj_buf)+(y_car-y_life)*((y_car-y_life)>-obj_buf),
                 ]; //if object is behind var, make this a large positive value
    var ix_min = indexOfSmallest(dists_y);
    actual_type = ix_min;	
   //console.info("Controls: Closest type: ",ix_min);
   //console.info("Controls: Distance in y = ",dists_y[ix_min]);

    if(dists_y[ix_min]>10000) //no spawned object ahead
    {ix_min = 3; object_x = 0;}//or whatever, not to be used }

    /*	not correct as even unidentified objects get a type to them!
    if(ix_min==0) //if closest object was a cash             
    { 
      identified_type = (this.cash[0].recognizedType=="C")? 0 : ((this.cash[0].recognizedType=="O") ? 1 : 2);
      object_x = this.cash[0].physics.x;
    }
    if(ix_min==1) //if closest object was a rock
    {
        
      identified_type = (this.rocks[0].recognizedType=="O")? 1 : ((this.rocks[0].recognizedType=="C") ? 0 : 2);
      object_x = this.rocks[0].physics.x;  
    }             
    if(ix_min==2) //if closest object was a life
    { 
      identified_type = (this.life[0].recognizedType=="L")? 2 : ((this.life[0].recognizedType=="C") ? 0 : 1);
      object_x = this.life[0].physics.x; 
      console.info("Sending life x");   
    }
	*/
	
    return [actual_type,identified_type,object_x];
   //if(dists_y[ix_min]>10000) //no spawned object ahead
   //{return 3;}
   //else {return ix_min;} //else return type of object ahead

 } //end of closestObjectAndLocation


rockAvoider(Ox) { //gets x coordinate of object to avoid
  var Cx = this.assets.car.physics.x;
  //var Ox = this.rocks[0].physics.x; //x of nearest rock
  var x_ref = Cx;
  if(Math.abs(Ox-Cx) >= T_width)
  {
    //don't move
    x_ref = Cx;
    //console.info("Decision: Not moving, obs diff x= ",Ox-Cx, "T_width=",T_width);
  }
  else { //got to move
    if(Ox>=Cx){ //obstacle on right
      if(Cx-R_l>=T_width-(Ox-Cx)){ //room on left?
        x_ref = Ox-T_width;
        //console.info("Decision: Obs right, Going from left of obstacle ");
      }
      else{ //no room on left
        x_ref = Ox+T_width;
        //console.info("Decision: Obs right, Going from right of obstacle ");
      }
    } //end if Ox>=Cx
    else //obstacle on left
    { //if Ox<Cx
      if(R_u-Cx > T_width-(Cx-Ox)) //room on right?
      {
        x_ref = Ox+T_width;
        //console.info("Decision: Obs left, Going from right of obstacle ");
      }
      else //no room on right
      {
        x_ref = Ox-T_width;
        //console.info("Decision: Obs left, Going from left of obstacle ");
      }
    } //end of else obstacle on left
  } //end of else got to move
// take action
var err_x = x_ref-Cx;
  if(err_x>0)
  {
      this.moveRight(Kp_obs*err_x);
      //console.info("Controls: Right, ref = ",x_ref, "err=",err_x);
  }
  else if(err_x<0) //0 is to not move
  {
      this.moveLeft(-Kp_obs*err_x);
      //console.info("Controls: Left, ref = ",x_ref, "err=",err_x);
  }

} //end of rock avoider

objectGetter(x_ref) { //directly gets x ref to go to in order to collect object
  /*if(o_type==0) //Cash
  {
    var x_ref = this.cash[0].physics.x;
  }
  else if(o_type==2) //life
  {
    var x_ref = this.life[0].physics.x;
  }*/
  var err_x = x_ref - this.assets.car.physics.x;
  if(err_x>=0)
      {
      //console.info("Controls: Going right");
      this.moveRight(Kp_getter*err_x);
      }
  else
      {
      //console.info("Controls: Going left");
      this.moveLeft(-Kp_getter*err_x);
      }


} //end of object getter

  
  logEvent(eventtype, eventdata) {
    if (!this.gameOver) {
      var d = new Date();
      this.dataLog += (d.getTime()).toString() + "," + eventtype + "," + eventdata + '\n';
    }
  
}  
  
moveRandom(step){
  //move randomly

     if(Math.random() >= 0.5)
     {
     //console.info("Controls: ","Random Left");
     this.moveLeft(step);
     }
     else
     {
     //console.info("Controls: ","Random Right");
     this.moveRight(step);
     }
} //end move random

  start() {

    var dstart = new Date();
    this.gameOver = false;
    this.startTime = dstart.getTime();
    document.getElementById("welcome").style.display = "none";
    this.assets.car.resetLife();
    this.logEvent(EVENTTYPE.GAME_START, "");
    console.log("Screen Res - Width:" + screen.width + "Height:" + screen.height);
    if (screen.width >= MIN_RES_WIDTH-1 && screen.height >= MIN_RES_HEIGHT-1) {
      setInterval(() => {
        if (!this.gameOver) {
          var d = new Date();
          var boxEmpty = Array.isArray(this.boxed) && !this.boxed.length;
          
          
          
          
          
          // var askEnvQuery = boxEmpty && ((d.getTime() - this.timeOfLastEnvQuery) > ENV_QUERY_INTERVAL);
          // if (askEnvQuery) {
          //   console.log("Asking Environment Query: " + (d.getTime() - this.timeOfLastEnvQuery).toString());
          //   this.timeOfLastEnvQuery = d.getTime();
          // }
          
        
          // var askAttQuery = boxEmpty // If no query is currently active
          //   && !askEnvQuery // if Env query is not selected
          //   && this.askAttentionQueryBasedOnAttentionProbFunction() // if we need to ask attention query based on probablity
          //   && (d.getTime() - this.timeOfLastEnvQuery) > 0.5 * NO_QUERY_TIME_WINDOW_FOR_ATT_QUERY // if we have crossed a time window since last env query
          //   && (this.timeOfLastEnvQuery + ENV_QUERY_INTERVAL - d.getTime()) > 0.5 * NO_QUERY_TIME_WINDOW_FOR_ATT_QUERY; // if we are far away from time window of future env query
          
          var askAttQuery = boxEmpty && ((d.getTime() - this.timeOfLastAttQuery) > ATT_QUERY_INTERVAL);
          
          
        
          var askEnvQuery = boxEmpty // If no query is currently active
            && !askAttQuery // if Env query is not selected
            && this.askEnvironmentQueryBasedOnEnvironmentProbFunction() // if we need to ask env query based on probablity
            && (d.getTime() - this.timeOfLastAttQuery) > 0.5 * NO_QUERY_TIME_WINDOW_FOR_ENV_QUERY // if we have crossed a time window since last env query
            && (this.timeOfLastAttQuery + ATT_QUERY_INTERVAL - d.getTime()) > 0.5 * NO_QUERY_TIME_WINDOW_FOR_ENV_QUERY; // if we are far away from time window of future env query
          
          
            if (askEnvQuery) {
              console.log("Asking Environment Query: " + (d.getTime() - this.timeOfLastEnvQuery).toString());
              this.timeOfLastEnvQuery = d.getTime();
            }

            if (askAttQuery) {
            console.log("Asking Attention Query:" + (d.getTime() - this.timeOfLastAttQuery).toString());
            this.timeOfLastAttQuery = d.getTime();
          }
        
          if (askAttQuery)
            this.queryType = QUERYTYPE.attention;
          else if (askEnvQuery)
            this.queryType = QUERYTYPE.environment;
          else
            this.queryType = null;
        
          switch (this.objectTypeProbablityFunction()) {
            case OBJECTTYPE.obstacle: this.createRock(askEnvQuery || askAttQuery);
              break;
            case OBJECTTYPE.life: this.createLife(askEnvQuery || askAttQuery);
              break;
            case OBJECTTYPE.cash: this.createCash(askEnvQuery || askAttQuery);
              break;
          }
          ctr++;
        }
      }, OBJECT_CREATION_INTERVAL); //20000

      setInterval(() => {
        this.randomizesprite();
      }, 84000); //what is the right interval for this?
    
      setInterval(() => {
        this.updateTimeBar();
      }, 50);
      setInterval(() => {
        this.updateDistractorTimeBar();
      }, 50);


      // setInterval(() => {
      //   console.log(this.dataLog);
      // }, 50000);

      //--------------------AI agent---------------------
      setInterval(() => { //controls
        this.releaseControls(); //zero-order hold (release key)
        var closestObjectType;
        //closestObjectType = this.closestObject(); //get type of object that is closest
        //console.info("Controls: Closest object type = ",closestObjectType);

        // test new closestObjectCode
        var returns;
        returns = this.closestObjectAndLocation();
        // console.info("True type of closest obj= ",returns[0]);
        // console.info("Id'd type of closest obj= ",returns[1]);
        // console.info("x coordinate of closest obj = ",returns[2]);	

    
        // control based on identified object
        if (returns[1] == 1) //id'd as obstacle
        {
          this.rockAvoider(returns[2]);
        }
        else if (returns[1] == 0 || returns[1] == 2) //id'd as an object to get
        {
          this.objectGetter(returns[2]);
        }
        else {
          //do nothing //this.moveRandom(0.5);
        }
	

    
        //rock  avoider
        /*if(closestObjectType==1) //obstacle
        {
          this.rockAvoider();
        }
        else if(closestObjectType==0 || closestObjectType==2) //object to get
        {
          this.objectGetter(closestObjectType);
        }
        else
        {
          this.moveRandom(0.5);
        }*/
      }, CONTROLLER_SAMPLING_TIME); //every 100ms

      //-----------------end AI agent code---------------

      this.draw();
      this.assets.road.move();

    }
    else {
      this.gameOver = true;
      document.getElementById("slow").innerHTML = `You need a minimum display resolution of 1280x800 to take part in this study`;
      document.getElementById("how").style.visibility = "hidden";
      document.getElementById("welcome").style.display = null;
    }
  }


}

export default Game;
