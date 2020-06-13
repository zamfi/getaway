import Sprite from "./sprite";

const cashImg = new Image();
//cashImg.src = "./assets/images/money.png";
const scale = 1.5;
const redBox = new Image();
redBox.src = "./assets/images/redbox.png";
class Cash {
  constructor(physics, imgSrc, marked, assetid, distance = -1) {
    
    this.physics = physics;
    cashImg.src = imgSrc;
    this.sprite = new Sprite(cashImg, 50, 50, 1.0 * scale, 1.0 * scale);
    this.box = new Sprite(redBox, 40, 50, 1 * scale, 1.3 * scale)
    this.marked = marked;
    this.assetid = assetid;
    this.distance = distance;
    //"U" for unrecognized, "O" for obstacle, "L" for life, "C" for points/cash/money
    this.recognizedType = this.marked? "U" : assetid[0];  
   
  }

  updatesprite(imgSrc) {
    cashImg.src = imgSrc;
    this.sprite = new Sprite(cashImg, 50, 50, 1.0 * scale, 1.0 * scale);
  }

  move() {
    this.physics.dDown = this.physics.speed;
  }

  stop() {
    this.physics.dDown = 0;
  }
}

export default Cash;
