/**
 * For better readability, you should rewrite the function
 * signature in a "natural language" way. You can refer to
 * each variable in any order using the $VARIABLE syntax.
 */

 enum botWalk {
  //% block="stop"
  stop,
  //% block="forward"
  forward,
  //% block="backward"
  backward,
  //% block="turn left"
  left,
  //% block="turn right"
  right,
  //% block="slide left"
  SlideLeft,
  //% block="slide right"
  SlideRight,
  //% block="shake left"
  ShakeLeft,
  //% block="shake right"
  ShakeRight,
}

//% color="#af1015" weight=200 block="Idea Kits Robot"
namespace IdeaKitsRobot {
  const PCA9685_ADDRESS = 0x40;
  const MODE1 = 0x00;
  const PRESCALE = 0xfe;
  const LED0_ON_L = 0x06;

  let _servoTrim = [0, 0, 0, 0];
  let _servoCurrent = [90, 90, 90, 90];
  let _servoMin = [75, 75, 60, 60];
  let _servoMax = [105, 105, 120, 120];

  let _servoStepStop = [[90, 90, 90, 90]];

  let _servoStepForward = [
    [105, 105, 110, 95],
    [75, 75, 110, 95],
    [75, 75, 85, 70],
    [105, 105, 85, 70],
  ];

  let _servoStepBackward = [
    [75, 75, 110, 95],
    [105, 105, 110, 95],
    [75, 75, 85, 70],
    [105, 105, 85, 70],
  ];

  let _servoStepLeft = [
    [93, 87, 115, 100],
    [87, 93, 115, 100],
    [87, 93, 80, 65],
    [93, 87, 80, 65],
  ];

  let _servoStepRight = [
    [87, 93, 115, 110],
    [93, 87, 115, 110],
    [93, 87, 80, 65],
    [87, 93, 80, 65],
  ];

  let _servoStepSlideLeft = [
    [90, 90, 90, 70],
    [90, 90, 120, 70],
    [90, 90, 120, 90],
    [90, 90, 90, 90],
  ];

  let _servoStepSlideRight = [
    [90, 90, 120, 90],
    [90, 90, 120, 70],
    [90, 90, 90, 70],
    [90, 90, 90, 90],
  ];

  let _servoStepShakeLeft = [
    [90, 90, 110, 110],
    [70, 90, 120, 110],
    [90, 90, 110, 110],
    [70, 90, 120, 110],
  ];

  let _servoStepShakeRight = [
    [90, 90, 70, 60],
    [90, 120, 70, 70],
    [90, 90, 70, 60],
    [90, 120, 70, 70],
  ];

  export enum Servos {
    S1 = 0x01,
    S2 = 0x02,
    S3 = 0x03,
    S4 = 0x04,
    S5 = 0x05,
    S6 = 0x06,
    S7 = 0x07,
    S8 = 0x08,
  }

  let initializedPCA9685 = false;

  function i2cwrite(addr: number, reg: number, value: number) {
    let buf = pins.createBuffer(2);
    buf[0] = reg;
    buf[1] = value;
    pins.i2cWriteBuffer(addr, buf);
  }

  function i2cread(addr: number, reg: number) {
    pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE);
    let val = pins.i2cReadNumber(addr, NumberFormat.UInt8BE);
    return val;
  }

  function initPCA9685(): void {
    i2cwrite(0x40, 0x00, 0x00);
    setFreq(50);
    for (let idx = 0; idx < 16; idx++) {
      setPwm(idx, 0, 0);
    }
    initializedPCA9685 = true;
  }
  function setFreq(freq: number): void {
    // Constrain the frequency
    let prescaleval = 25000000;
    prescaleval /= 4096;
    prescaleval /= freq;
    prescaleval -= 1;
    let prescale = prescaleval; //Math.Floor(prescaleval + 0.5);
    let oldmode = i2cread(PCA9685_ADDRESS, MODE1);
    let newmode = (oldmode & 0x7f) | 0x10; // sleep
    i2cwrite(PCA9685_ADDRESS, MODE1, newmode); // go to sleep
    i2cwrite(PCA9685_ADDRESS, PRESCALE, prescale); // set the prescaler
    i2cwrite(PCA9685_ADDRESS, MODE1, oldmode);
    control.waitMicros(5000);
    i2cwrite(PCA9685_ADDRESS, MODE1, oldmode | 0xa1);
  }

  function setPwm(channel: number, on: number, off: number): void {
    if (channel < 0 || channel > 15) return;
    //serial.writeValue("ch", channel)
    //serial.writeValue("on", on)
    //serial.writeValue("off", off)
    let buf = pins.createBuffer(5);
    buf[0] = LED0_ON_L + 4 * channel;
    buf[1] = on & 0xff;
    buf[2] = (on >> 8) & 0xff;
    buf[3] = off & 0xff;
    buf[4] = (off >> 8) & 0xff;
    pins.i2cWriteBuffer(PCA9685_ADDRESS, buf);
  }

  /**
   * Servo Execute
   * @param index Servo Channel; eg: S1
   * @param degree [0-180] degree of servo; eg: 0, 90, 180
   */
  //% blockId=robotmini_servo block="Servo|%index|degree %degree"
  //% weight=100
  //% degree.min=0 degree.max=180
  //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
  export function Servo(index: Servos, degree: number): void {
    if (!initializedPCA9685) {
      initPCA9685();
    }
    // 50hz: 20,000 us
    let v_us = (degree * 1800) / 180 + 600; // 0.6 ~ 2.4
    let value = (v_us * 4096) / 20000;
    setPwm(index + 7, 0, value);
  }

  //% block="Servos calibration|Left leg (S1) %s1|Right leg (S2) %s2|Left foot (S3) %s3|Right foot (S4) %s4"
  export function servoTrim(s1: number, s2: number, s3: number, s4: number) {
    _servoTrim[0] = s1;
    _servoTrim[1] = s2;
    _servoTrim[2] = s3;
    _servoTrim[3] = s4;
    ServoBot(Servos.S1, _servoCurrent[0] + _servoTrim[0]);
    ServoBot(Servos.S2, _servoCurrent[1] + _servoTrim[1]);
    ServoBot(Servos.S3, _servoCurrent[2] + _servoTrim[2]);
    ServoBot(Servos.S4, _servoCurrent[3] + _servoTrim[3]);
  }

  //% block="Set min servos degree|Left leg (S1) %s1|Right leg (S2) %s2|Left foot (S3) %s3|Right foot (S4) %s4" s1.defl=80 s2.defl=80 s3.defl=50 s4.defl=50
  export function servoMin(s1: number, s2: number, s3: number, s4: number) {
    _servoMin[0] = s1;
    _servoMin[1] = s2;
    _servoMin[2] = s3;
    _servoMin[3] = s4;
  }

  //% block="Set max servos degree|Left leg (S1) %s1|Right leg (S2) %s2|Left foot (S3) %s3|Right foot (S4) %s4" s1.defl=100 s2.defl=100 s3.defl=130 s4.defl=130
  export function servoMax(s1: number, s2: number, s3: number, s4: number) {
    _servoMax[0] = s1;
    _servoMax[1] = s2;
    _servoMax[2] = s3;
    _servoMax[3] = s4;
  }

  function ServoBot(index: Servos, degree: number): void {
    if (!initializedPCA9685) {
      initPCA9685();
    }
    // 50hz: 20,000 us
    let v_us = (degree * 1800) / 180 + 600; // 0.6 ~ 2.4
    let value = (v_us * 4096) / 20000;
    setPwm(index + 7, 0, value);
  }

  function servosRun(deltas: number[], delay: number) {
    if (deltas[0] > _servoMax[0]) deltas[0] = _servoMax[0];
    if (deltas[1] > _servoMax[1]) deltas[1] = _servoMax[1];
    if (deltas[2] > _servoMax[2]) deltas[2] = _servoMax[2];
    if (deltas[3] > _servoMax[3]) deltas[3] = _servoMax[3];

    if (deltas[0] < _servoMin[0]) deltas[0] = _servoMin[0];
    if (deltas[1] < _servoMin[1]) deltas[1] = _servoMin[1];
    if (deltas[2] < _servoMin[2]) deltas[2] = _servoMin[2];
    if (deltas[3] < _servoMin[3]) deltas[3] = _servoMin[3];

    let check = true;
    if (delay < 0) delay = 0;
    if (deltas != null) {
      while (check) {
        check = false;
        if (_servoCurrent[0] > deltas[0]) {
          _servoCurrent[0] = _servoCurrent[0] - 1;
          check = true;
        } else if (_servoCurrent[0] < deltas[0]) {
          _servoCurrent[0] = _servoCurrent[0] + 1;
          check = true;
        }

        if (_servoCurrent[1] > deltas[1]) {
          _servoCurrent[1] = _servoCurrent[1] - 1;
          check = true;
        } else if (_servoCurrent[1] < deltas[1]) {
          _servoCurrent[1] = _servoCurrent[1] + 1;
          check = true;
        }

        if (_servoCurrent[2] > deltas[2]) {
          _servoCurrent[2] = _servoCurrent[2] - 1;
          check = true;
        } else if (_servoCurrent[2] < deltas[2]) {
          _servoCurrent[2] = _servoCurrent[2] + 1;
          check = true;
        }

        if (_servoCurrent[3] > deltas[3]) {
          _servoCurrent[3] = _servoCurrent[3] - 1;
          check = true;
        } else if (_servoCurrent[3] < deltas[3]) {
          _servoCurrent[3] = _servoCurrent[3] + 1;
          check = true;
        }

        ServoBot(Servos.S1, _servoCurrent[0] + _servoTrim[0]);
        ServoBot(Servos.S2, _servoCurrent[1] + _servoTrim[1]);
        ServoBot(Servos.S3, _servoCurrent[2] + _servoTrim[2]);
        ServoBot(Servos.S4, _servoCurrent[3] + _servoTrim[3]);

        if (delay > 0) basic.pause(delay);
      }
    }
  }

  function _servosDeltaSeq(seq: number[][], delay: number) {
    for (let i = 0; i < seq.length; i++) {
      servosRun(seq[i], delay);
    }
  }

  //% block="Movement: %action|Delay: %delay" action.fieldEditor="gridpicker"
  export function bot_walk(action: botWalk, delay: number) {
    switch (action) {
      case botWalk.stop:
        _servosDeltaSeq(_servoStepStop, delay);
        break;
      case botWalk.forward:
        _servosDeltaSeq(_servoStepForward, delay);
        break;
      case botWalk.backward:
        _servosDeltaSeq(_servoStepBackward, delay);
        break;
      case botWalk.left:
        _servosDeltaSeq(_servoStepLeft, delay);
        break;
      case botWalk.right:
        _servosDeltaSeq(_servoStepRight, delay);
        break;
      case botWalk.SlideLeft:
        _servosDeltaSeq(_servoStepSlideLeft, delay);
        break;
      case botWalk.SlideRight:
        _servosDeltaSeq(_servoStepSlideRight, delay);
        break;
      case botWalk.ShakeLeft:
        _servosDeltaSeq(_servoStepShakeLeft, delay);
        break;
      case botWalk.ShakeRight:
        _servosDeltaSeq(_servoStepShakeRight, delay);
        break;
    }
  }

  //% block="Movement Template: %set|Delay: %delay"
  //% s.defl=[][]
  export function bot_template(set: number[][], delay: number) {
    _servosDeltaSeq(set, delay);
  }

  //% block="Ultrasonic distance (cm) trig %trig|echo %echo"
  export function sonarDistance(trig: DigitalPin, echo: DigitalPin): number {
    return sonar.ping(trig, echo, PingUnit.Centimeters);
  }

  //% block="PIR senser pin  %pin"
  export function PIR(pin: AnalogPin): number {
    return pins.analogReadPin(pin);
  }

  //% block="Smoke senser pin  %pin"
  export function smoke(pin: DigitalPin): number {
    return pins.digitalReadPin(pin) === 1 ? 0 : 1;
  }
}
