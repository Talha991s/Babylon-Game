import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import {Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, Mesh, MeshBuilder, Color4, FreeCamera}
from "@babylonjs/core";
import {AdvancedDynamicTexture,StackPanel,Button,Control} from "@babylonjs/gui";


//enum for states
enum State { START = 0, GAME = 1, LOSE = 2, CUTSCENE = 3 }

class App {
    // General Entire Application
    private _scene: Scene;
    private _canvas: HTMLCanvasElement;
    private _engine: Engine;

    //Scene - related
    private _state: number = 0;
    private _gamescene: Scene;
    private _cutScene: Scene;

    constructor() 
    {
        this._canvas = this._createCanvas();

        // initialize babylon scene and engine
        this._engine = new Engine(this._canvas, true);
        this._scene = new Scene(this._engine);

        var camera: ArcRotateCamera = new ArcRotateCamera("Camera", Math.PI / 2, Math.PI / 2, 2, Vector3.Zero(), this._scene);
        camera.attachControl(this._canvas, true);
        var light1: HemisphericLight = new HemisphericLight("light1", new Vector3(1, 1, 0), this._scene);
        var sphere: Mesh = MeshBuilder.CreateSphere("sphere", { diameter: 1 }, this._scene);

        // hide/show the Inspector
        window.addEventListener("keydown", (ev) => 
        {
            // Shift+Ctrl+Alt+I
            if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.keyCode === 73) 
            {
                if (this._scene.debugLayer.isVisible()) 
                {
                    this._scene.debugLayer.hide();
                } 
                else 
                {
                    this._scene.debugLayer.show();
                }
            }
        });

        // run the main render loop
        this._engine.runRenderLoop(() => 
        {
            this._scene.render();
        });
    }

    private _createCanvas():HTMLCanvasElement 
    {
        //Commented out for development
        document.documentElement.style["overflow"] = "hidden";
        document.documentElement.style.overflow = "hidden";
        document.documentElement.style.width = "100%";
        document.documentElement.style.height = "100%";
        document.documentElement.style.margin = "0";
        document.documentElement.style.padding = "0";
        document.body.style.overflow = "hidden";
        document.body.style.width = "100%";
        document.body.style.height = "100%";
        document.body.style.margin = "0";
        document.body.style.padding = "0";

        //create the canvas html element and attach it to the webpage
        this._canvas = document.createElement("canvas");
        this._canvas.style.width = "100%";
        this._canvas.style.height = "100%";
        this._canvas.id = "gameCanvas";
        document.body.appendChild(this._canvas);

        return this._canvas;
    }

    private async _main(): Promise<void>{
        await this._goToStart();

        //Register a render loop to reportedly render the scene
        this._engine.runRenderLoop(()=>{
            switch(this._state){
                case State.START:
                    this._scene.render();
                    break;
                case State.CUTSCENE:
                    this._scene.render();
                    break;
                case State.GAME:
                    this._scene.render();
                    break;
                case State.LOSE:
                    this._scene.render();
                    break;
                default:break;
            }
        });

        //resize if the screen is resized/rotated
        window.addEventListener('resize',() =>{
            this._engine.resize();
        });
    }

    //goToStart
    private async _goToStart(){
        this._engine.displayLoadingUI(); // make sure to wait for start to load.

        //Scene Setup
        //don't detect any inputs from this UI while the game is loading
        this._scene.detachControl();
        let scene = new Scene(this._engine);
        scene.clearColor = new Color4(0, 0, 0, 1);
        //creates and positions a free camera
        let camera = new FreeCamera("camera1",new Vector3(0,0,0),scene);
        camera.setTarget(Vector3.Zero()); //targets the camera to scene origin

        //--Sounds--

        //--GUI--
        //Creat a fullscreen ui for all of our GUI elements
        const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        guiMenu.idealHeight = 720; //fit our fullscreen ui to this height
        
        //create a simple button
        const startBtn = Button.CreateSimpleButton("start","PLAY");
        startBtn.width=0.2;
        startBtn.height = "40px";
        startBtn.color = "white";
        startBtn.top = "-14px";
        startBtn.thickness = 0;
        startBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        guiMenu.addControl(startBtn);

        //this handle interactions with the start button attached to the scene
        startBtn.onPointerDownObservable.add(()=>{
            this._goToCutScene();
            scene.detachControl(); //observables disabled.

        });

        //background image

        //Set up transition effect: modified version of https://www.babylonjs-playground.com/#2FGYE8#0

        // start button

        // Mobile

        //--SCENE FINISHED LOADING--
        await scene.whenReadyAsync();
        this._engine.hideLoadingUI();
        //lastly set the current state to the start state and set the scene to start scene.
        this._scene.dispose();
        this._scene = scene;
        this._state = State.START;    
    }

    private async _goToCutScene(){
        var finishedLoading = false;
        await this._setUpGame().then((res) =>{
            finishedLoading=true;
        });

        //--GUI--
        const cutScene = AdvancedDynamicTexture.CreateFullscreenUI("cutscene");

        //--Progress Dialogue--
        const next = Button.CreateSimpleButton("next", "NEXT");
        next.color = "white";
        next.thickness = 0;
        next.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        next.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        next.width = "64px";
        next.height = "64px";
        next.top = "-3%";
        next.left = "-12%";
        cutScene.addControl(next);

        next.onPointerUpObservable.add(() =>{
            this._goToGame();
        });

    }
    private async _goToGame() {
        //--SETUP SCENE--
        this._scene.detachControl();
        let scene = this._gamescene;
        scene.clearColor = new Color4(0.01568627450980392, 0.01568627450980392, 0.20392156862745098); // a color that fit the overall color scheme better
        let camera: ArcRotateCamera = new ArcRotateCamera("Camera", Math.PI/2,Math.PI/2,2,Vector3.Zero(),scene);
        camera.setTarget(Vector3.Zero());

        //--GUI----------------------------------
        const playerUI = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        //don't detect any input from this ui while the game is loading 
        scene.detachControl();

        //Create a simple button
        const loseBtn = Button.CreateSimpleButton("lose","LOSE");
        loseBtn.width = 0.2;
        loseBtn.height = "40px";
        loseBtn.color = "white";
        loseBtn.top = "-14px";
        loseBtn.thickness = 0;
        loseBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        playerUI.addControl(loseBtn);

        //this handles interactions with the start button attached to the scene. --
        loseBtn.onPointerDownObservable.add(()=>{
            this._goToLose();
            scene.detachControl(); //observables disabled
        });

        //temporary scene objects
        var light1: HemisphericLight = new HemisphericLight("light1", new Vector3(1,1,0), scene);
        var sphere: Mesh = MeshBuilder.CreateSphere("sphere", {diameter: 1}, scene);

        //get rid of start scene, switch to gamescene and change states
        this._scene.dispose();
        this._state = State.GAME;
        this._scene = scene; 
        this._engine.hideLoadingUI();
        
        //the game is ready, attach control back
        this._scene.attachControl();
    }

    private async _setUpGame() {
        let scene = new Scene(this._engine);
        this._gamescene = scene;

        //load assets
    }
    
    //other functions

    private async _goToLose() : Promise<void>{
        this._engine.displayLoadingUI();

        //--SCENE SETUP--
        this._scene.detachControl(); // remove control
        let scene = new Scene(this._engine);
        scene.clearColor = new Color4(0,0,0,1);
        let camera = new FreeCamera("camera1", new Vector3(0,0,0),scene);
        camera.setTarget(Vector3.Zero());

        //--GUI--
        const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        const mainBtn = Button.CreateSimpleButton("mainmenu","MAIN MENU");
        mainBtn.width = 0.2;
        mainBtn.height = "40px";
        mainBtn.color = "white";
        guiMenu.addControl(mainBtn);

        //this handles interactions with the start button attached to the scene

        mainBtn.onPointerUpObservable.add(() => {
            this._goToStart();
        });

        //--SCENE FINISHED LOADING--
        await scene.whenReadyAsync();
        this._engine.hideLoadingUI(); //When the scene is ready, hide loading
        //lastly set the current state to the lose state and set the scene to the lose scene
        this._scene.dispose();
        this._scene = scene;
        this._state = State.LOSE;
    }

}
new App();