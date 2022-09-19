import { ArcRotateCamera, Mesh, Quaternion, Ray, Scene, ShadowGenerator, TransformNode, UniversalCamera, Vector3 } from "@babylonjs/core";


export class Player extends TransformNode{

    public camera;
    public scene: Scene;
    private _input;

    //Player
    public mesh: Mesh; //outer collisionbox of player

    //Camera
    private _camRoot: TransformNode;  // _camRoot is our root parent that handles the overall positioning of our camera. it's in charge of updating its position to follow the player's position and is location at the center of the player
    private _yTilt: TransformNode; //_yTilt is the rotation along the x-axis of our camera. If we need to tilt the camera up/down, this will handle those rotations. 
    
    //const values
    private static readonly ORIGINAL_TILT: Vector3 = new Vector3(0.5934119456780721, 0, 0);
    private static readonly PLAYER_SPEED: number = 0.45;
    private static  readonly GRAVITY: number = -2.8;
    private static readonly  JUMP_FORCE: number = 0.80;

    //Player Movement Var
    private _h: number;
    private _v:number;

    private _moveDirection: Vector3 = new Vector3();
    private _deltaTime: number =0;
    private _inputAmt: number;
    
    

    //gravity, ground detection, jumping
    private _gravity: Vector3 = new Vector3();
    private _grounded: boolean;
    private _lastGroundPos: Vector3 = Vector3.Zero(); // keep track of the last grounded position. 
    

    constructor(assets, scene: Scene, shadowGenerator:ShadowGenerator,input?){
        super("player", scene);
        this.scene = scene;
        this._setupPlayerCamera();

        this.mesh = assets.mesh;
        this.mesh.parent = this;

        shadowGenerator.addShadowCaster(assets.mesh); //the player mesh will cast shadows

        this._input = input; //inputs we will get from inputController.ts
    }

    private _updateFromControls():void{
        this._deltaTime = this.scene.getEngine().getDeltaTime()/1000.0;


        this._moveDirection = Vector3.Zero(); // vector that holds movement information 
        this._h = this._input.horizontal; // x axis
        this._v = this._input.vertical; // zAxis

        //--MOVEMENT BASED ON CAMERA (as it rotates)--
        let fwd = this._camRoot.forward;
        let right= this._camRoot.right;
        let correctedVertical = fwd.scaleInPlace(this._v);
        let correctedHorizontal = right.scaleInPlace(this._h);

        //movement based off of camera's view
        let move = correctedHorizontal.addInPlace(correctedVertical);

        //clear y so that the character doesn't fly up, normalize for next step. 
        this._moveDirection = new Vector3((move).normalize().x,0,(move).normalize().z);

        //clamp the input value so that diagonal movement isn't twice as fast
        let inputMag = Math.abs(this._h) + Math.abs(this._v);
        if(inputMag<0) {
            this._inputAmt = 0;
        }else if (inputMag > 1){
            this._inputAmt = 1;
        }else{
            this._inputAmt = inputMag; //he magnitude of what our combined horizontal and vertical movements give us and clamp it to be a maximum of 1 since we don't want to move faster if we're moving diagonally.
        }

        //final movement that takes into consideration the inputs
        this._moveDirection = this._moveDirection.scaleInPlace(this._inputAmt*Player.PLAYER_SPEED);

        //Rotation
        //check if there is movement to determine if rotation is needed
        let input = new Vector3(this._input.horizontalAxis, 0, this._input.verticalAxis); //along which axis is the direction
        if(input.length()==0){
            // if there is no input detected, prevent rotation and keep player in same rotation
            return;
        }

        //rotation based on input & Camera angle.
        let angle = Math.atan2(this._input.horizontalAxis,this._input.verticalAxis);
        angle += this._camRoot.rotation.y;
        let targ = Quaternion.FromEulerAngles(0, angle,0);
        this.mesh.rotationQuaternion = Quaternion.Slerp(this.mesh.rotationQuaternion, targ, 10*this._deltaTime);

    }

    //Raycast
    private _floorRaycast(offsetx:number, offsetz:number, raycastlen:number):Vector3{
        let raycastFloorPos = new Vector3(this.mesh.position.x + offsetx, this.mesh.position.y +0.5, this.mesh.position.z + offsetz);
        let ray = new Ray(raycastFloorPos, Vector3.Up().scale(-1),raycastlen);

        let predicate = function(mesh){
            return mesh.isPickable && mesh.isEnabled();
        }
        let pick = this.scene.pickWithRay(ray, predicate);

        if(pick.hit){
            return pick.pickedPoint;
        }else{
            return Vector3.Zero();
        }

    }

    //Grounded
    private _isGrounded(): boolean{
        if(this._floorRaycast(0,0,0.6).equals(Vector3.Zero())){   //0.6 so that the player detect the ground before reaching the point
            return false;
        }else{
            return true;
        }

    }

    //Gravity
    private _updateGroundDetection(): void{
        if(!this._isGrounded()){
            this._gravity = this._gravity.addInPlace(Vector3.Up().scale(this._deltaTime*Player.GRAVITY));
        }
        this._grounded =false;

        //limit the speed of gravity to the negative of the jump power
        if(this._gravity.y < -Player.JUMP_FORCE) {
            this._gravity.y = -Player.JUMP_FORCE;
        }
        this.mesh.moveWithCollisions(this._moveDirection.addInPlace(this._gravity));

        if(this._isGrounded()){
            this._gravity.y =0;
            this._grounded = true;
            this._lastGroundPos.copyFrom(this.mesh.position);
        }
    }

    //update character and activate our player
    public activatePlayerCamera(): UniversalCamera{
        this.scene.registerBeforeRender(() =>{
            this._beforeRenderUpdate(); // character update function
            this._updateCamera();
        })
        return this.camera;
    }
    private _beforeRenderUpdate() : void {
        this._updateFromControls();
        this._updateGroundDetection();
        //move our mesh
       // this.mesh.moveWithCollisions(this._moveDirection);
    }
    
    private _setupPlayerCamera() : UniversalCamera {

        //this was the temporary camera we were using 
        //var camera4 = new ArcRotateCamera("arc", -Math.PI/2, Math.PI/2, 40, new Vector3(0,3,0), this.scene);  
        
        //this camera is going to follow the player
        // creating a camera hierarchy
    
        //root camera parent that handles positioning of the camera to follow the player
        this._camRoot = new TransformNode("root");
        this._camRoot.position = new Vector3(0,0,0); //initialized at (0,0,0)
        
        // to face the player from behind (180 degree)
        this._camRoot.rotation = new Vector3(0,Math.PI,0);

        //rotations along the x-axis (up/down tilting)
        let yTilt = new TransformNode("ytilt");
        
        //adjustment to camera view to point down at out player
        yTilt.rotation = Player.ORIGINAL_TILT;
        this._yTilt = yTilt;
        yTilt.parent = this._camRoot;

        //our actual camera that's pointing at our root's position
        this.camera = new UniversalCamera("cam", new Vector3(0,0,-50), this.scene);
        this.camera.lockedTarget = this._camRoot.position;
        this.camera.fov =  0.47350045992678597;
        this.camera.parent = yTilt;

        this.scene.activeCamera = this.camera;
        return this.camera;

    }

    //update camera
    private _updateCamera(): void{
        let centerPlayer = this.mesh.position.y+2;
        this._camRoot.position = Vector3.Lerp(this._camRoot.position, 
        new Vector3(this.mesh.position.x, centerPlayer,this.mesh.position.z),0.4);
    }
}