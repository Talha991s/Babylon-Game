import { ArcRotateCamera, Mesh, Scene, ShadowGenerator, TransformNode, UniversalCamera, Vector3 } from "@babylonjs/core";


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

    constructor(assets, scene: Scene, shadowGenerator:ShadowGenerator,input?){
        super("player", scene);
        this.scene = scene;
        this._setupPlayerCamera();

        this.mesh = assets.mesh;
        this.mesh.parent = this;

        shadowGenerator.addShadowCaster(assets.mesh); //the player mesh will cast shadows

        this._input = input; //inputs we will get from inputController.ts
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
        this.camera = new UniversalCamera("cam", new Vector3(0,0,-70), this.scene);
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