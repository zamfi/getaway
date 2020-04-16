import Sprite from './sprite';

const lifeImg = new Image();
//lifeImg.src = "./assets/images/turbo.png";

const redBox = new Image();
redBox.src = "./assets/images/redbox.png";

class Life {
  constructor(physics, imgSrc, marked,  distance = -1) {
    this.physics = physics;
    
    lifeImg.src = imgSrc;

    this.sprite = new Sprite(lifeImg, 50, 50, 1.0, 1.0);
    this.box = new Sprite(redBox, 40, 50, 1.0, 1.3)
    this.marked = marked;
    this.distance = distance;
  }

  updatesprite(imgSrc) {
    lifeImg.src = imgSrc;
    this.sprite = new Sprite(lifeImg, 50, 50, 1.0, 1.0);
  }

  move() {
    this.physics.dDown = this.physics.speed;
  }

  stop() {
    this.physics.dDown = 0;
  }
}

export default Life;