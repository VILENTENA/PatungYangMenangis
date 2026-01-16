import { DRACOLoader } from "../../libs/three.js-r132/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "../../libs/three.js-r132/examples/jsm/loaders/GLTFLoader.js";

const THREE = window.MINDAR.IMAGE.THREE;

// --- GLOBAL VARIABLES ---
let globalPause = false;      
let currentActiveAnchor = null; 
let isBgmEnabled = true; 
let currentLanguage = 'en'; // 'en', 'bm', 'kd'
const pageControllers = {};     

// --- Global Background Music ---
const bgm = new Audio("../../assets/sounds/melody-piano.mp3");
bgm.loop = true;
bgm.volume = 0.3; 

// Helper: Attempt to play BGM on first interaction
const enableBGM = () => {
  if (isBgmEnabled && currentActiveAnchor !== null) {
      bgm.play().catch(() => console.log("Waiting for user interaction to play BGM..."));
  }
  document.body.removeEventListener('click', enableBGM);
  document.body.removeEventListener('touchstart', enableBGM);
};
document.body.addEventListener('click', enableBGM);
document.body.addEventListener('touchstart', enableBGM);


// --- 1. INITIALIZATION HELPERS ---
const initializeMindAR = () => {
  return new window.MINDAR.IMAGE.MindARThree({
    container: document.body,
    imageTargetSrc: "../../assets/targets/group13.mind"
  });
};

const configureGLTFLoader = () => {
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("../../libs/draco/");
  loader.setDRACOLoader(dracoLoader);
  return loader;
};

const setupLighting = (scene) => {
  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  scene.add(light);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(0, 1, 1);
  scene.add(directionalLight);
};

const loadModel = async (path, scale, position) => {
  const loader = configureGLTFLoader();
  const model = await loader.loadAsync(path);
  model.scene.scale.set(scale.x, scale.y, scale.z);
  model.scene.position.set(position.x, position.y, position.z);
  return model;
};

// --- 2. USER INTERFACE ---
const style = document.createElement('style');
style.innerHTML = `
  /* --- DESKTOP / DEFAULT STYLES --- */
  
  /* Special Interaction Buttons (Bottom Left by default) */
  .special-button {
    position: fixed;
    bottom: 30px;
    left: 30px;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    border: 3px solid white;
    font-size: 24px;
    cursor: pointer;
    z-index: 10000;
    display: none;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 8px rgba(0,0,0,0.4);
    transition: background-color 0.3s, transform 0.1s;
  }
  .special-button:active { transform: scale(0.9); }

  /* General Playback Controls (Bottom Center) */
  #playback-controls {
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 15px; 
    z-index: 10000;
  }

  .control-button {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.9);
    border: 2px solid #333;
    font-size: 24px;
    color: #333;
    cursor: pointer;
    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .control-button:active { background-color: #ddd; transform: scale(0.95); }

  /* --- MOBILE RESPONSIVE TWEAKS (Max Width 600px) --- */
  @media (max-width: 600px) {
    /* Move special button UP so it doesn't overlap the main row */
    .special-button {
        bottom: 110px; 
        left: 20px;
        width: 50px;
        height: 50px;
        font-size: 20px;
    }

    /* Slightly smaller main controls to fit narrow screens */
    .control-button {
        width: 50px;
        height: 50px;
        font-size: 18px;
    }
    
    #playback-controls {
        gap: 10px;
        bottom: 20px;
    }
  }
`;
document.head.appendChild(style);

// Helper: Create Special Toggle Button (Left)
const createSpecialButton = (id, symbol, onClick) => {
  const btn = document.createElement("button");
  btn.id = id;
  btn.className = "special-button";
  btn.innerText = symbol;
  btn.style.backgroundColor = "#ff8585"; 
  
  btn.onclick = (e) => {
    e.stopPropagation(); 
    const isCurrentlyOff = btn.style.backgroundColor === "rgb(255, 133, 133)" || btn.style.backgroundColor === "#ff8585";
    if (isCurrentlyOff) {
        btn.style.backgroundColor = "#90ee90"; // ON
        onClick(true);
    } else {
        btn.style.backgroundColor = "#ff8585"; // OFF
        onClick(false);
    }
  };
  document.body.appendChild(btn);
  return btn;
};

// Helper: Create Playback Controls (Center)
const createPlaybackControls = () => {
  const container = document.createElement("div");
  container.id = "playback-controls";

  // 1. Play/Pause Button
  const btnPlay = document.createElement("button");
  btnPlay.className = "control-button";
  btnPlay.innerText = "⏸"; 
  btnPlay.onclick = (e) => {
    e.stopPropagation();
    if (currentActiveAnchor !== null) {
        globalPause = !globalPause;
        const ctrl = pageControllers[currentActiveAnchor];
        if (ctrl) {
            if (globalPause) {
                ctrl.pause();
                bgm.pause(); 
                btnPlay.innerText = "▶"; 
            } else {
                ctrl.play();
                if(isBgmEnabled) bgm.play(); 
                btnPlay.innerText = "⏸"; 
            }
        }
    }
  };

  // 2. Replay Button
  const btnReplay = document.createElement("button");
  btnReplay.className = "control-button";
  btnReplay.innerText = "↺";
  btnReplay.onclick = (e) => {
    e.stopPropagation();
    if (currentActiveAnchor !== null) {
        const ctrl = pageControllers[currentActiveAnchor];
        if (ctrl) {
            globalPause = false; 
            btnPlay.innerText = "⏸"; 
            if(isBgmEnabled) bgm.play(); 
            ctrl.replay(); 
        }
    }
  };

  // 3. BGM Toggle Button
  const btnBgm = document.createElement("button");
  btnBgm.className = "control-button";
  btnBgm.innerText = "🎵";
  btnBgm.style.backgroundColor = "#90ee90"; 
  btnBgm.onclick = (e) => {
    e.stopPropagation();
    isBgmEnabled = !isBgmEnabled;
    if (isBgmEnabled) {
        btnBgm.style.backgroundColor = "#90ee90";
        if (currentActiveAnchor !== null && !globalPause) {
            bgm.play().catch(()=>{});
        }
    } else {
        btnBgm.style.backgroundColor = "#ff8585"; 
        bgm.pause();
    }
  };

  // 4. Language Cycle Button (NEW)
  const btnLang = document.createElement("button");
  btnLang.className = "control-button";
  btnLang.innerText = "EN"; // Default English
  btnLang.style.fontWeight = "bold";
  btnLang.onclick = (e) => {
    e.stopPropagation();
    // Cycle Language: EN -> BM -> KD -> EN
    if (currentLanguage === 'en') {
        currentLanguage = 'bm';
        btnLang.innerText = "BM";
    } else if (currentLanguage === 'bm') {
        currentLanguage = 'kd';
        btnLang.innerText = "KD";
    } else {
        currentLanguage = 'en';
        btnLang.innerText = "EN";
    }
    
    // Immediate Replay with new language if active
    if (currentActiveAnchor !== null) {
        const ctrl = pageControllers[currentActiveAnchor];
        if (ctrl) {
            globalPause = false;
            btnPlay.innerText = "⏸"; // Reset play icon
            ctrl.replay();
        }
    }
  };

  container.appendChild(btnPlay);
  container.appendChild(btnReplay);
  container.appendChild(btnBgm);
  container.appendChild(btnLang); // Add to container
  document.body.appendChild(container);
};

// --- 3. GREEN SCREEN VIDEO HELPER ---
const createChromaKeyPlane = (videoPath) => {
  const video = document.createElement('video');
  video.src = videoPath;
  video.loop = true;
  video.muted = true; 
  video.playsInline = true;
  video.crossOrigin = "anonymous";
  video.load();

  const texture = new THREE.VideoTexture(video);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const chromaMaterial = new THREE.ShaderMaterial({
    uniforms: {
      textureMap: { value: texture },
      keyColor: { value: new THREE.Color(0x00ff00) }, 
      similarity: { value: 0.46 }, 
      smoothness: { value: 0.05 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `,
    fragmentShader: `
      uniform sampler2D textureMap;
      uniform vec3 keyColor;
      uniform float similarity;
      uniform float smoothness;
      varying vec2 vUv;
      void main() {
        vec4 texColor = texture2D( textureMap, vUv );
        float d = length(texColor.rgb - keyColor);
        float alpha = smoothstep(similarity, similarity + smoothness, d);
        gl_FragColor = vec4(texColor.rgb, texColor.a * alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthTest: false 
  });

  const geometry = new THREE.PlaneGeometry(1.77, 1); 
  const mesh = new THREE.Mesh(geometry, chromaMaterial);
  mesh.position.set(0, 0, 0.1); 
  mesh.scale.set(8, 8, 8); 
  mesh.renderOrder = 999; 
  mesh.visible = false; 

  return { mesh, video };
};

// --- 4. CORE LOGIC ---
const setupPage = async (mindarThree, config) => {
  // Accepted params updated to include all 3 languages
  const { modelPath, scale, position, anchorIndex, audioEn, audioBm, audioKd, audioEffect, specialType, audioExtra } = config;
  
  const model = await loadModel(modelPath, scale, position);
  const anchor = mindarThree.addAnchor(anchorIndex);
  anchor.group.add(model.scene);

  const mixer = new THREE.AnimationMixer(model.scene);
  const actions = model.animations.map(clip => {
    const action = mixer.clipAction(clip);
    action.play();
    return action;
  });

  // Load All 3 Languages
  const mainAudioEn = new Audio(audioEn);
  const mainAudioBm = new Audio(audioBm);
  const mainAudioKd = new Audio(audioKd);
  
  // Optional Effect Audio
  const effectAudio = audioEffect ? new Audio(audioEffect) : null;
  
  // Extra Audio (Clapping/Cling)
  let extraSound = null;
  if (audioExtra) {
      extraSound = new Audio(audioExtra);
  }
  
  let specialAudio = null;
  if (specialType === 'COUGH') specialAudio = new Audio("../../assets/sounds/man-coughing.mp3"); 
  if (specialType === 'RAIN') {
    specialAudio = new Audio("../../assets/sounds/raining-sound.mp3"); 
    specialAudio.loop = true;
  }

  let specialVideoObj = null;
  if (specialType === 'CONFETTI') {
     specialVideoObj = createChromaKeyPlane("../../assets/videos/confetti.mp4");
     anchor.group.add(specialVideoObj.mesh); 
  }

  const playSequence = () => {
    if (globalPause) return;
    
    // Select audio based on currentLanguage variable
    let activeAudio;
    if (currentLanguage === 'en') activeAudio = mainAudioEn;
    else if (currentLanguage === 'bm') activeAudio = mainAudioBm;
    else activeAudio = mainAudioKd; // kd

    activeAudio.play();
    activeAudio.onended = () => {
      if (globalPause) return;
      
      // Determine flow based on available audio
      if (effectAudio) {
          effectAudio.currentTime = 0;
          effectAudio.play();
          
          if (extraSound) {
              extraSound.currentTime = 0;
              extraSound.play();
          }
      } else if (extraSound) {
          extraSound.currentTime = 0;
          extraSound.play();
      }
    };
  };

  const controller = {
    modelScene: model.scene, 
    mixer,
    actions,
    pause: () => {
      actions.forEach(a => a.paused = true);
      // Pause ALL audio languages to be safe
      mainAudioEn.pause();
      mainAudioBm.pause();
      mainAudioKd.pause();
      
      if (effectAudio) effectAudio.pause();
      if (extraSound) extraSound.pause(); 
      if(specialAudio && specialType !== 'RAIN') specialAudio.pause();
      if(specialVideoObj) specialVideoObj.video.pause();
    },
    play: () => {
      actions.forEach(a => a.paused = false);
      
      // Check if any audio is currently playing
      const isEnPlaying = !mainAudioEn.paused;
      const isBmPlaying = !mainAudioBm.paused;
      const isKdPlaying = !mainAudioKd.paused;
      const isEffectPlaying = effectAudio && !effectAudio.paused;
      const isExtraPlaying = extraSound && !extraSound.paused;
      
      // Resume if nothing is currently playing
      if (!isEnPlaying && !isBmPlaying && !isKdPlaying && !isEffectPlaying && !isExtraPlaying) {
          playSequence();
      }
    },
    replay: () => {
        // Stop Everything
        mainAudioEn.pause(); mainAudioEn.currentTime = 0;
        mainAudioBm.pause(); mainAudioBm.currentTime = 0;
        mainAudioKd.pause(); mainAudioKd.currentTime = 0;
        
        if (effectAudio) {
            effectAudio.pause();
            effectAudio.currentTime = 0;
        }
        
        if (extraSound) {
            extraSound.pause();
            extraSound.currentTime = 0;
        }
        
        // Restart Animations
        actions.forEach(a => {
            a.stop(); 
            a.play();
        });

        // Restart Audio (will pick up new language automatically)
        playSequence();
    },
    specialType: specialType,
    specialAudio: specialAudio,
    specialVideoObj: specialVideoObj
  };

  pageControllers[anchorIndex] = controller;

  anchor.onTargetFound = () => {
    console.log("Found Target: " + anchorIndex);
    currentActiveAnchor = anchorIndex;
    model.scene.visible = true;
    
    // UI Button Logic
    const btnConfetti = document.getElementById("btn-confetti");
    const btnCough = document.getElementById("btn-cough");
    const btnRain = document.getElementById("btn-rain");

    if (btnConfetti) btnConfetti.style.display = (anchorIndex === 1) ? "flex" : "none";
    if (btnCough) btnCough.style.display = (anchorIndex === 2) ? "flex" : "none";
    if (btnRain) btnRain.style.display = (anchorIndex === 4) ? "flex" : "none";

    // Reset Play/Pause Button Icon
    const playBtn = document.querySelector("#playback-controls button");
    if(playBtn) playBtn.innerText = "⏸";

    globalPause = false; 
    
    // Play BGM only if enabled
    if (isBgmEnabled) {
        bgm.play().catch(() => {});
    }
    
    controller.replay();
  };

  anchor.onTargetLost = () => {
    if (currentActiveAnchor === anchorIndex) currentActiveAnchor = null;
    model.scene.visible = false;
    controller.pause();
    
    bgm.pause();

    document.querySelectorAll('.special-button').forEach(b => b.style.display = 'none');
    
    if (specialAudio) {
        specialAudio.pause();
        specialAudio.currentTime = 0;
    }
    if (specialVideoObj) {
        specialVideoObj.video.pause();
        specialVideoObj.mesh.visible = false; 
    }
  };

  return mixer;
};

// --- 5. INTERACTION ---
const enableGeneralInteraction = (camera, scene) => {
  let scaleFactor = 1.0;
  let isDragging = false;
  let previousPosition = { x: 0, y: 0 };
  let initialDistance = null;

  window.addEventListener("pointerdown", (e) => {
     if(e.target.tagName === 'BUTTON') return;
     isDragging = true;
     previousPosition = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener("pointermove", (e) => {
    if (!isDragging || currentActiveAnchor === null) return;
    const ctrl = pageControllers[currentActiveAnchor];
    if (ctrl && ctrl.modelScene) {
        const deltaX = e.clientX - previousPosition.x;
        const deltaY = e.clientY - previousPosition.y;
        ctrl.modelScene.rotation.y += deltaX * 0.01;
        ctrl.modelScene.rotation.x += deltaY * 0.01;
        previousPosition = { x: e.clientX, y: e.clientY };
    }
  });
  
  window.addEventListener("pointerup", () => isDragging = false);

  window.addEventListener("wheel", (event) => {
    if (currentActiveAnchor !== null) {
      const zoomSpeed = 0.0005;
      const zoomDelta = -event.deltaY * zoomSpeed; 
      scaleFactor = Math.min(Math.max(scaleFactor + zoomDelta, 0.5), 3.0);
      const ctrl = pageControllers[currentActiveAnchor];
      if(ctrl && ctrl.modelScene) {
         ctrl.modelScene.scale.set(scaleFactor, scaleFactor, scaleFactor);
      }
    }
  });

  window.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
       const dx = e.touches[0].clientX - e.touches[1].clientX;
       const dy = e.touches[0].clientY - e.touches[1].clientY;
       initialDistance = Math.sqrt(dx*dx + dy*dy);
    }
  });

  window.addEventListener("touchmove", (e) => {
    if (e.touches.length === 2 && initialDistance && currentActiveAnchor !== null) {
       const dx = e.touches[0].clientX - e.touches[1].clientX;
       const dy = e.touches[0].clientY - e.touches[1].clientY;
       const currentDistance = Math.sqrt(dx*dx + dy*dy);
       const zoomDelta = (currentDistance - initialDistance) * 0.005;
       scaleFactor = Math.min(Math.max(scaleFactor + zoomDelta, 0.5), 3.0);
       const ctrl = pageControllers[currentActiveAnchor];
       if(ctrl && ctrl.modelScene) {
         ctrl.modelScene.scale.set(scaleFactor, scaleFactor, scaleFactor);
       }
       initialDistance = currentDistance;
    }
  });
};

// --- 6. MAIN EXECUTION ---
document.addEventListener("DOMContentLoaded", () => {
  const start = async () => {
    const mindarThree = initializeMindAR();
    const { renderer, scene, camera } = mindarThree;
    renderer.clock = new THREE.Clock();
    setupLighting(scene);

    createPlaybackControls();

    createSpecialButton("btn-confetti", "🎉", (isActive) => { 
        const ctrl = pageControllers[1]; 
        if(ctrl && ctrl.specialVideoObj) {
            if (isActive) {
                ctrl.specialVideoObj.mesh.visible = true;
                ctrl.specialVideoObj.video.play();
            } else {
                ctrl.specialVideoObj.mesh.visible = false;
                ctrl.specialVideoObj.video.pause();
            }
        }
    });
    
    createSpecialButton("btn-cough", "🗣️", (isActive) => {
        const ctrl = pageControllers[2]; 
        if(ctrl && ctrl.specialAudio) isActive ? ctrl.specialAudio.play() : ctrl.specialAudio.pause();
    });

    createSpecialButton("btn-rain", "🌧️", (isActive) => {
        const ctrl = pageControllers[4]; 
        if(ctrl && ctrl.specialAudio) isActive ? ctrl.specialAudio.play() : ctrl.specialAudio.pause();
    });

    // --- PAGE CONFIGURATION ---
    const pages = [
      { idx: 0, model: "scene-1.glb", scale: 0.1, y: 0 },
      { idx: 1, model: "scene-2.glb", scale: 0.1, y: 0, special: "CONFETTI", extra: "../../assets/sounds/cheering-clapping.mp3" }, 
      { idx: 2, model: "scene-3.glb", scale: 0.1, y: 0, special: "COUGH" },    
      { idx: 3, model: "scene-4.glb", scale: 0.1, y: 0 },
      { idx: 4, model: "scene-5.glb", scale: 0.1, y: 0, special: "RAIN" },      
      { idx: 5, model: "scene-6.glb", scale: 0.1, y: 0 },
      { idx: 6, model: "scene-7.glb", scale: 0.1, y: 0 },
      { idx: 7, model: "scene-8.glb", scale: 0.1, y: 0, extra: "../../assets/sounds/cling-sound.mp3" }, 
      { idx: 8, model: "scene-9.glb", scale: 0.1, y: 0 },
      { idx: 9, model: "scene-10.glb",scale: 0.1, y: 0 },
      { idx: 10, model:"scene-11.glb",scale: 0.1, y: 0 },
    ];

    const mixers = [];

    for (const p of pages) {
      const audioNum = p.idx + 1;
      
      const mixer = await setupPage(mindarThree, {
        modelPath: `../../assets/models/${p.model}`,
        scale: { x: p.scale, y: p.scale, z: p.scale },
        position: { x: 0, y: p.y, z: 0 },
        anchorIndex: p.idx,
        // PASSING ALL 3 LANGUAGES
        audioEn: `../../assets/sounds/English/en${audioNum}.mp3`,
        audioBm: `../../assets/sounds/Bahasa Malaysia/bm${audioNum}.mp3`,
        audioKd: `../../assets/sounds/Bahasa Kadazandusun/kd${audioNum}.mp3`,
        
        specialType: p.special,
        audioExtra: p.extra 
      });
      mixers.push(mixer);
    }

    enableGeneralInteraction(camera, scene);
    await mindarThree.start();

    renderer.setAnimationLoop(() => {
      const delta = renderer.clock.getDelta();
      mixers.forEach(m => m.update(delta));
      renderer.render(scene, camera);
    });
  };

  start();
});