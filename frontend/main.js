import { junctionDrawing } from "./junction.js";
import {
  makeCar,
  drawCar,
  moveForwardCar,
  moveLeftTurnCar,
  moveRightTurnCar
} from "./carMovement.js";
import { loadCarPngs, loadPedestrianPngs } from "./images.js";
import { getJunctionData, canvas2D, puffinCrossingStripeLength } from "./config.js";
import {
  drawNorthTrafficLight,
  drawEastTrafficLight,
  drawSouthTrafficLight,
  drawWestTrafficLight,
  drawNorthPuffinLight,
  drawEastPuffinLight,
  drawSouthPuffinLight,
  drawWestPuffinLight,
  drawNorthRightTurnLight,
  drawEastRightTurnLight,
  drawSouthRightTurnLight,
  drawWestRightTurnLight
} from "./trafficLights.js";

// Configuration
const SAFE_GAP = 5;           // Gap between cars
const PAUSE_DURATION = 5000;  // 5 seconds pause at stop line
const CAR_SPEED = 2;          // Car speed
const SPAWN_INTERVAL = 3000;  // Spawn new cars every 3s

// Global array for all cars (all directions)
let cars = [];

// Global main traffic light states.
const trafficLightStates = {
  north: { red: true, amber: false, green: false },
  east:  { red: true, amber: false, green: false },
  south: { red: true, amber: false, green: false },
  west:  { red: true, amber: false, green: false }
};

// Global right-turn light states.
const rightTurnLightStates = {
  north: { off: true, on: false },
  east:  { off: true, on: false },
  south: { off: true, on: false },
  west:  { off: true, on: false }
};

// Puffin lights remain off.
const puffinOff = { off: true, on: false };

/*==============================
  Canvas Resize
==============================*/
function updateCanvasSize() {
  const middleSection = document.getElementById("middle");
  const canvas = document.getElementById("junctionCanvas");
  canvas.width = middleSection.clientWidth;
  canvas.height = middleSection.clientHeight;
}

function drawTrafficLights() {
  drawNorthTrafficLight(trafficLightStates.north);
  drawEastTrafficLight(trafficLightStates.east);
  drawSouthTrafficLight(trafficLightStates.south);
  drawWestTrafficLight(trafficLightStates.west);

  drawNorthPuffinLight(puffinOff);
  drawEastPuffinLight(puffinOff);
  drawSouthPuffinLight(puffinOff);
  drawWestPuffinLight(puffinOff);

  drawNorthRightTurnLight(rightTurnLightStates.north);
  drawEastRightTurnLight(rightTurnLightStates.east);
  drawSouthRightTurnLight(rightTurnLightStates.south);
  drawWestRightTurnLight(rightTurnLightStates.west);
}

/*==============================
  Stop Line Drawing Functions
==============================*/
function drawStopLineNorth() {
  const { bottomHorizontal, leftVertical, canvasX } = getJunctionData();
  const widthOfPC = puffinCrossingStripeLength() + 5;
  const stopLine = bottomHorizontal + widthOfPC;
  canvas2D.strokeStyle = "white";
  canvas2D.lineWidth = 2;
  canvas2D.beginPath();
  canvas2D.moveTo(leftVertical, stopLine);
  canvas2D.lineTo(canvasX, stopLine);
  canvas2D.stroke();
}

function drawStopLineEast() {
  const { leftVertical, canvasY } = getJunctionData();
  const widthOfPC = puffinCrossingStripeLength() + 5;
  const stopLine = leftVertical - widthOfPC;
  canvas2D.strokeStyle = "white";
  canvas2D.lineWidth = 2;
  canvas2D.beginPath();
  canvas2D.moveTo(stopLine, canvasY);
  canvas2D.lineTo(stopLine, leftVertical);
  canvas2D.stroke();
}

function drawStopLineSouth() {
  const { canvasX, topHorizontal, rightVertical } = getJunctionData();
  const widthOfPC = puffinCrossingStripeLength() + 5;
  const stopLine = topHorizontal - widthOfPC;
  canvas2D.strokeStyle = "white";
  canvas2D.lineWidth = 2;
  canvas2D.beginPath();
  canvas2D.moveTo(canvasX, stopLine);
  canvas2D.lineTo(rightVertical, stopLine);
  canvas2D.stroke();
}

function drawStopLineWest() {
  const { rightVertical, canvasY } = getJunctionData();
  const widthOfPC = puffinCrossingStripeLength() + 5;
  const stopLine = rightVertical + widthOfPC;
  canvas2D.strokeStyle = "white";
  canvas2D.lineWidth = 2;
  canvas2D.beginPath();
  canvas2D.moveTo(stopLine, canvasY);
  canvas2D.lineTo(stopLine, rightVertical);
  canvas2D.stroke();
}

function drawAllStopLines() {
  drawStopLineNorth();
  drawStopLineEast();
  drawStopLineSouth();
  drawStopLineWest();
}

/*==============================
  Update Functions (Queue Logic)
==============================*/

/**
 * Northbound update:
 * - Sort ascending by y (front = y - height/2).
 * - Stop line: bottomHorizontal + widthOfPC.
 */
function updateCarsNorth() {
  const data = getJunctionData();
  const widthOfPC = puffinCrossingStripeLength() + 5;
  const stopLine = data.bottomHorizontal + widthOfPC;

  const laneMap = {};
  const turningCars = [];
  // Distribute northbound cars
  for (let car of cars.filter(c => c.direction === "north")) {
    // Determine if car is actively turning:
    let isTurning = false;
    if (car.typeOfTurn === "left" && car.completedLeft) isTurning = true;
    else if (car.typeOfTurn === "right" && car.rightTurnPhase >= 1) isTurning = true;
    if (isTurning) turningCars.push(car);
    else {
      if (!laneMap[car.indexOfLane]) laneMap[car.indexOfLane] = [];
      laneMap[car.indexOfLane].push(car);
    }
    if (car.paused === undefined) { car.paused = false; car.pauseTime = 0; car.hasStopped = false; }
  }

  for (let lane in laneMap) {
    let laneCars = laneMap[lane].sort((a, b) => a.y - b.y);
    for (let i = 0; i < laneCars.length; i++) {
      let car = laneCars[i];
      // Safe gap
      if (i > 0) {
        let carAhead = laneCars[i-1];
        let desiredFront = (carAhead.y + carAhead.height/2) + SAFE_GAP;
        let currentFront = car.y - car.height/2;
        if (currentFront < desiredFront) {
          car.y = desiredFront + car.height/2;
        }
      }
      // Queue logic
      let front = car.y - car.height/2;
      if (!car.hasStopped && !car.paused && front <= stopLine) {
        car.y = stopLine + car.height/2;
        car.paused = true;
        car.pauseTime = Date.now();
      }
      if (car.paused && Date.now() - car.pauseTime >= PAUSE_DURATION) {
        car.paused = false;
        car.hasStopped = true;
      }
      if (!car.paused) {
        if (car.typeOfTurn === "forward") moveForwardCar(car);
        else if (car.typeOfTurn === "left") moveLeftTurnCar(car);
        else if (car.typeOfTurn === "right") moveRightTurnCar(car);
      }
    }
  }
  for (let car of turningCars) {
    if (car.paused && Date.now() - car.pauseTime >= PAUSE_DURATION) {
      car.paused = false;
      car.hasStopped = true;
    }
    if (!car.paused) {
      if (car.typeOfTurn === "left") moveLeftTurnCar(car);
      else if (car.typeOfTurn === "right") moveRightTurnCar(car);
      else moveForwardCar(car);
    }
  }
}

/**
 * Eastbound update:
 * - Sort descending by x (front = x + width/2).
 * - Stop line: leftVertical - widthOfPC.
 */
function updateCarsEast() {
  const data = getJunctionData();
  const widthOfPC = puffinCrossingStripeLength() + 5;
  const stopLine = data.leftVertical - widthOfPC;

  const laneMap = {};
  const turningCars = [];
  for (let car of cars.filter(c => c.direction === "east")) {
    let isTurning = false;
    if (car.typeOfTurn === "left" && car.completedLeft) isTurning = true;
    else if (car.typeOfTurn === "right" && car.rightTurnPhase >= 1) isTurning = true;
    if (isTurning) turningCars.push(car);
    else {
      if (!laneMap[car.indexOfLane]) laneMap[car.indexOfLane] = [];
      laneMap[car.indexOfLane].push(car);
    }
    if (car.paused === undefined) { car.paused = false; car.pauseTime = 0; car.hasStopped = false; }
  }
  for (let lane in laneMap) {
    // For east, sort descending by x (largest x is lead)
    let laneCars = laneMap[lane].sort((a, b) => b.x - a.x);
    for (let i = 0; i < laneCars.length; i++) {
      let car = laneCars[i];
      // Safe gap: front = x + width/2; desiredFront = (carAhead.x - carAhead.height/2) - SAFE_GAP.
      if (i > 0) {
        let carAhead = laneCars[i-1];
        let desiredFront = (carAhead.x - carAhead.height/2) - SAFE_GAP;
        let currentFront = car.x + car.height/2;
        if (currentFront > desiredFront) {
          car.x = desiredFront - car.height/2;
        }
      }
      // Queue logic
      let front = car.x + car.height/2;
      if (!car.hasStopped && !car.paused && front >= stopLine) {
        car.x = stopLine - car.height/2;
        car.paused = true;
        car.pauseTime = Date.now();
      }
      if (car.paused && Date.now() - car.pauseTime >= PAUSE_DURATION) {
        car.paused = false;
        car.hasStopped = true;
      }
      if (!car.paused) {
        if (car.typeOfTurn === "forward") moveForwardCar(car);
        else if (car.typeOfTurn === "left") moveLeftTurnCar(car);
        else if (car.typeOfTurn === "right") moveRightTurnCar(car);
      }
    }
  }
  for (let car of turningCars) {
    if (car.paused && Date.now() - car.pauseTime >= PAUSE_DURATION) {
      car.paused = false;
      car.hasStopped = true;
    }
    if (!car.paused) {
      if (car.typeOfTurn === "left") moveLeftTurnCar(car);
      else if (car.typeOfTurn === "right") moveRightTurnCar(car);
      else moveForwardCar(car);
    }
  }
}

/**
 * Southbound update:
 * - Sort descending by y (largest y is lead; front = y + height/2).
 * - Stop line: topHorizontal - widthOfPC.
 */
function updateCarsSouth() {
  const data = getJunctionData();
  const widthOfPC = puffinCrossingStripeLength() + 5;
  const stopLine = data.topHorizontal - widthOfPC;

  const laneMap = {};
  const turningCars = [];
  for (let car of cars.filter(c => c.direction === "south")) {
    let isTurning = false;
    if (car.typeOfTurn === "left" && car.completedLeft) isTurning = true;
    else if (car.typeOfTurn === "right" && car.rightTurnPhase >= 1) isTurning = true;
    if (isTurning) turningCars.push(car);
    else {
      if (!laneMap[car.indexOfLane]) laneMap[car.indexOfLane] = [];
      laneMap[car.indexOfLane].push(car);
    }
    if (car.paused === undefined) { car.paused = false; car.pauseTime = 0; car.hasStopped = false; }
  }
  for (let lane in laneMap) {
    // For south, sort descending by y (largest y is lead)
    let laneCars = laneMap[lane].sort((a, b) => b.y - a.y);
    for (let i = 0; i < laneCars.length; i++) {
      let car = laneCars[i];
      // Safe gap: front = y + height/2; desiredFront = (carAhead.y - carAhead.height/2) - SAFE_GAP.
      if (i > 0) {
        let carAhead = laneCars[i-1];
        let desiredFront = (carAhead.y - carAhead.height/2) - SAFE_GAP;
        let currentFront = car.y + car.height/2;
        if (currentFront > desiredFront) {
          car.y = desiredFront - car.height/2;
        }
      }
      // Queue logic
      let front = car.y + car.height/2;
      if (!car.hasStopped && !car.paused && front >= stopLine) {
        car.y = stopLine - car.height/2;
        car.paused = true;
        car.pauseTime = Date.now();
      }
      if (car.paused && Date.now() - car.pauseTime >= PAUSE_DURATION) {
        car.paused = false;
        car.hasStopped = true;
      }
      if (!car.paused) {
        if (car.typeOfTurn === "forward") moveForwardCar(car);
        else if (car.typeOfTurn === "left") moveLeftTurnCar(car);
        else if (car.typeOfTurn === "right") moveRightTurnCar(car);
      }
    }
  }
  for (let car of turningCars) {
    if (car.paused && Date.now() - car.pauseTime >= PAUSE_DURATION) {
      car.paused = false;
      car.hasStopped = true;
    }
    if (!car.paused) {
      if (car.typeOfTurn === "left") moveLeftTurnCar(car);
      else if (car.typeOfTurn === "right") moveRightTurnCar(car);
      else moveForwardCar(car);
    }
  }
}

/**
 * Westbound update:
 * - Sort ascending by x (smallest x is lead; front = x - width/2).
 * - Stop line: rightVertical + widthOfPC.
 */
function updateCarsWest() {
  const data = getJunctionData();
  const widthOfPC = puffinCrossingStripeLength() + 5;
  const stopLine = data.rightVertical + widthOfPC;

  const laneMap = {};
  const turningCars = [];
  for (let car of cars.filter(c => c.direction === "west")) {
    let isTurning = false;
    if (car.typeOfTurn === "left" && car.completedLeft) isTurning = true;
    else if (car.typeOfTurn === "right" && car.rightTurnPhase >= 1) isTurning = true;
    if (isTurning) turningCars.push(car);
    else {
      if (!laneMap[car.indexOfLane]) laneMap[car.indexOfLane] = [];
      laneMap[car.indexOfLane].push(car);
    }
    if (car.paused === undefined) { car.paused = false; car.pauseTime = 0; car.hasStopped = false; }
  }
  for (let lane in laneMap) {
    // For west, sort ascending by x (smallest x is lead)
    let laneCars = laneMap[lane].sort((a, b) => a.x - b.x);
    for (let i = 0; i < laneCars.length; i++) {
      let car = laneCars[i];
      // Safe gap: front = x - width/2; desiredFront = (carAhead.x + carAhead.height/2) + SAFE_GAP.
      if (i > 0) {
        let carAhead = laneCars[i-1];
        let desiredFront = (carAhead.x + carAhead.height/2) + SAFE_GAP;
        let currentFront = car.x - car.height/2;
        if (currentFront < desiredFront) {
          car.x = desiredFront + car.height/2;
        }
      }
      // Queue logic
      let front = car.x - car.height/2;
      if (!car.hasStopped && !car.paused && front <= stopLine) {
        car.x = stopLine + car.height/2;
        car.paused = true;
        car.pauseTime = Date.now();
      }
      if (car.paused && Date.now() - car.pauseTime >= PAUSE_DURATION) {
        car.paused = false;
        car.hasStopped = true;
      }
      if (!car.paused) {
        if (car.typeOfTurn === "forward") moveForwardCar(car);
        else if (car.typeOfTurn === "left") moveLeftTurnCar(car);
        else if (car.typeOfTurn === "right") moveRightTurnCar(car);
      }
    }
  }
  for (let car of turningCars) {
    if (car.paused && Date.now() - car.pauseTime >= PAUSE_DURATION) {
      car.paused = false;
      car.hasStopped = true;
    }
    if (!car.paused) {
      if (car.typeOfTurn === "left") moveLeftTurnCar(car);
      else if (car.typeOfTurn === "right") moveRightTurnCar(car);
      else moveForwardCar(car);
    }
  }
}

/*==============================
  Combined Update
==============================*/
function updateAllCars() {
  updateCarsNorth();
  updateCarsEast();
  updateCarsSouth();
  updateCarsWest();
}

/*==============================
  Main Animation Loop
==============================*/
function animate() {
  updateCanvasSize();
  junctionDrawing();
  drawTrafficLights();
  drawStopLineNorth();
  drawStopLineEast();
  drawStopLineSouth();
  drawStopLineWest();
  updateAllCars();
  for (let car of cars) {
    drawCar(car);
  }
  requestAnimationFrame(animate);
}

/*==============================
  Spawning
==============================*/
function spawnCar() {
  // North: lane 0 = left-turn, lanes 1-3 = forward, lane 4 = right-turn.
  cars.push(makeCar("north", 0, CAR_SPEED, "left"));
  cars.push(makeCar("north", 1, CAR_SPEED, "forward"));
  cars.push(makeCar("north", 2, CAR_SPEED, "forward"));
  cars.push(makeCar("north", 3, CAR_SPEED, "forward"));
  cars.push(makeCar("north", 4, CAR_SPEED, "right"));

  /* // East
  cars.push(makeCar("east", 0, CAR_SPEED, "left"));
  cars.push(makeCar("east", 1, CAR_SPEED, "forward"));
  cars.push(makeCar("east", 2, CAR_SPEED, "forward"));
  cars.push(makeCar("east", 3, CAR_SPEED, "forward"));
  cars.push(makeCar("east", 4, CAR_SPEED, "right")); */

  /* // South
  cars.push(makeCar("south", 0, CAR_SPEED, "left"));
  cars.push(makeCar("south", 1, CAR_SPEED, "forward"));
  cars.push(makeCar("south", 2, CAR_SPEED, "forward"));
  cars.push(makeCar("south", 3, CAR_SPEED, "forward"));
  cars.push(makeCar("south", 4, CAR_SPEED, "right")); */

  /* // West
  cars.push(makeCar("west", 0, CAR_SPEED, "left"));
  cars.push(makeCar("west", 1, CAR_SPEED, "forward"));
  cars.push(makeCar("west", 2, CAR_SPEED, "forward"));
  cars.push(makeCar("west", 3, CAR_SPEED, "forward"));
  cars.push(makeCar("west", 4, CAR_SPEED, "right")); */
}

/* ============================================================
   Traffic Light Sequencing
============================================================ */
// Vertical sequence (affects north and south). For speed=1, green lasts ~8 seconds; total cycle ~12 seconds.
function runVerticalSequence() {
  // t=0: main lights red; right-turn off.
  trafficLightStates.north = { red: true, amber: false, green: false };
  trafficLightStates.south = { red: true, amber: false, green: false };
  rightTurnLightStates.north = { off: true, on: false };
  rightTurnLightStates.south = { off: true, on: false };

  // t=0.5 sec: main lights become red+amber.
  setTimeout(() => {
    trafficLightStates.north = { red: true, amber: true, green: false };
    trafficLightStates.south = { red: true, amber: true, green: false };
  }, 500);

  // t=1 sec: main lights turn green.
  setTimeout(() => {
    trafficLightStates.north = { red: false, amber: false, green: true };
    trafficLightStates.south = { red: false, amber: false, green: true };
  }, 1000);

  // Remain green until t=9 sec.
  // t=9 sec: main lights turn amber and right-turn lights turn on.
  setTimeout(() => {
    trafficLightStates.north = { red: false, amber: true, green: false };
    trafficLightStates.south = { red: false, amber: true, green: false };
    rightTurnLightStates.north = { off: false, on: true };
    rightTurnLightStates.south = { off: false, on: true };
  }, 9000);

  // t=10 sec: main lights return to red.
  setTimeout(() => {
    trafficLightStates.north = { red: true, amber: false, green: false };
    trafficLightStates.south = { red: true, amber: false, green: false };
  }, 10000);

  // t=12 sec: wait until intersection clears (or 2 sec timeout) then turn off right-turn lights.
  setTimeout(() => {
    waitForIntersectionClearOrTimeout(2000, () => {
      rightTurnLightStates.north = { off: true, on: false };
      rightTurnLightStates.south = { off: true, on: false };
    });
  }, 10000);

  return 12000;
}

// Horizontal sequence (affects east and west); same timings.
function runHorizontalSequence() {
  trafficLightStates.east = { red: true, amber: false, green: false };
  trafficLightStates.west = { red: true, amber: false, green: false };
  rightTurnLightStates.east = { off: true, on: false };
  rightTurnLightStates.west = { off: true, on: false };

  setTimeout(() => {
    trafficLightStates.east = { red: true, amber: true, green: false };
    trafficLightStates.west = { red: true, amber: true, green: false };
  }, 500);

  setTimeout(() => {
    trafficLightStates.east = { red: false, amber: false, green: true };
    trafficLightStates.west = { red: false, amber: false, green: true };
  }, 1000);

  setTimeout(() => {
    trafficLightStates.east = { red: false, amber: true, green: false };
    trafficLightStates.west = { red: false, amber: true, green: false };
    rightTurnLightStates.east = { off: false, on: true };
    rightTurnLightStates.west = { off: false, on: true };
  }, 9000);

  setTimeout(() => {
    trafficLightStates.east = { red: true, amber: false, green: false };
    trafficLightStates.west = { red: true, amber: false, green: false };
  }, 10000);

  setTimeout(() => {
    waitForIntersectionClearOrTimeout(2000, () => {
      rightTurnLightStates.east = { off: true, on: false };
      rightTurnLightStates.west = { off: true, on: false };
    });
  }, 10000);

  return 12000;
}

function runLightSequences() {
  runVerticalSequence();
  setTimeout(() => {
    runHorizontalSequence();
    setTimeout(runLightSequences, 12000);
  }, 12000);
}

window.addEventListener("load", () => {
  loadCarPngs();
  loadPedestrianPngs();
  updateCanvasSize();
  runLightSequences();
  spawnCar();
  setInterval(spawnCar, SPAWN_INTERVAL);
  animate();
});
