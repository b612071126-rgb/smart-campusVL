// Future Smart Campus — Three.js single-dependency scene.
// If the primary CDN is unavailable, it automatically tries a second CDN.
async function loadThree() {
  try { return await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js'); }
  catch (firstError) {
    try { return await import('https://unpkg.com/three@0.160.0/build/three.module.js'); }
    catch (secondError) {
      throw new Error('Three.js 模块加载失败。\n请检查网络是否能访问 cdn.jsdelivr.net 或 unpkg.com，然后刷新页面。');
    }
  }
}

const statusEl = document.querySelector('#renderStatus');
const fatalEl = document.querySelector('#fatalError');
function showFatal(message) {
  fatalEl.hidden = false;
  fatalEl.textContent = message;
  statusEl.style.display = 'none';
}

try {
  const THREE = await loadThree();
  startCampus(THREE);
} catch (error) {
  console.error(error);
  showFatal(error?.message || String(error));
}

function startCampus(THREE) {
  const stage = document.querySelector('#stage');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#06182b');
  scene.fog = new THREE.Fog('#06182b', 58, 125);

  const camera = new THREE.PerspectiveCamera(39, innerWidth / innerHeight, 0.1, 240);
  camera.position.set(42, 29, 47);
  camera.lookAt(0, 6, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  stage.appendChild(renderer.domElement);

  // Small, self-contained orbit controls to avoid external add-on loading failures.
  let dragging = false, lastX = 0, lastY = 0, pointerMoved = false;
  let azimuth = Math.atan2(camera.position.x, camera.position.z);
  let polar = Math.acos((camera.position.y - 6) / Math.hypot(camera.position.x, camera.position.y - 6, camera.position.z));
  let distance = camera.position.distanceTo(new THREE.Vector3(0, 6, 0));
  const target = new THREE.Vector3(0, 6, 0);
  renderer.domElement.style.touchAction = 'none';
  renderer.domElement.addEventListener('pointerdown', e => { dragging = true; pointerMoved = true; lastX = e.clientX; lastY = e.clientY; renderer.domElement.setPointerCapture?.(e.pointerId); });
  renderer.domElement.addEventListener('pointermove', e => {
    if (!dragging) return;
    azimuth -= (e.clientX - lastX) * .006;
    polar = THREE.MathUtils.clamp(polar + (e.clientY - lastY) * .004, .43, 1.48);
    lastX = e.clientX; lastY = e.clientY;
  });
  renderer.domElement.addEventListener('pointerup', () => { dragging = false; });
  renderer.domElement.addEventListener('pointercancel', () => { dragging = false; });
  renderer.domElement.addEventListener('wheel', e => { distance = THREE.MathUtils.clamp(distance + e.deltaY * .035, 36, 95); }, { passive:true });

  const mat = (color, metalness=.25, roughness=.4, emissive=null, intensity=0) => new THREE.MeshStandardMaterial({
    color, metalness, roughness, emissive: emissive || '#000000', emissiveIntensity: intensity
  });
  const materials = {
    floor: mat('#b5cbd1', .46, .3),
    edge: mat('#e4f8fa', .42, .28, '#58e8f5', .32),
    glass: new THREE.MeshPhysicalMaterial({ color:'#328ca9', metalness:.25, roughness:.19, transparent:true, opacity:.86, clearcoat:1, side:THREE.DoubleSide }),
    glassLight: mat('#86c9d6', .3, .22, '#3cbed4', .22),
    frame: mat('#e1f5f6', .55, .27),
    dark: mat('#16394f', .5, .28),
    dark2: mat('#0b2a42', .35, .32),
    gold: mat('#f3cf87', .45, .25, '#ffbd4f', .65),
    cyan: new THREE.MeshBasicMaterial({ color:'#7eeeff' }),
    green1: mat('#3e9e7c', .05, .83),
    green2: mat('#75cda0', .05, .85),
    green3: mat('#1d705f', .05, .85),
    ground: mat('#112f43', .24, .72),
    road: mat('#1a4054', .18, .65)
  };

  scene.add(new THREE.HemisphereLight(0xd8f7ff, 0x203446, 1.65));
  const sun = new THREE.DirectionalLight(0xeafaff, 2.9); sun.position.set(25, 38, 18); scene.add(sun);
  const cool = new THREE.DirectionalLight(0x41dfff, 1.6); cool.position.set(-24, 20, -10); scene.add(cool);
  const warm = new THREE.PointLight(0xffcf87, 85, 58); warm.position.set(5, 13, 8); scene.add(warm);
  const fill = new THREE.PointLight(0x36ccee, 55, 65); fill.position.set(-12, 7, 5); scene.add(fill);

  const campus = new THREE.Group(); scene.add(campus);
  function box(parent, x,y,z, sx,sy,sz, material, rot=0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz), material);
    mesh.position.set(x,y,z); mesh.rotation.y=rot; parent.add(mesh); return mesh;
  }
  function cylinder(parent, x,y,z, rt, rb, h, material, seg=12) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg),material);
    mesh.position.set(x,y,z); parent.add(mesh); return mesh;
  }
  function line(points, material, parent=campus) {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const obj = new THREE.Line(geo, material); parent.add(obj); return obj;
  }
  const lineCyan = new THREE.LineBasicMaterial({ color:'#79edff', transparent:true, opacity:.86 });
  const lineSoft = new THREE.LineBasicMaterial({ color:'#8dc8d7', transparent:true, opacity:.38 });
  const lineGold = new THREE.LineBasicMaterial({ color:'#ffd992', transparent:true, opacity:.82 });

  // Raised campus island — gives the architecture a readable silhouette.
  const island = new THREE.Mesh(new THREE.CylinderGeometry(28.8, 30, .9, 100), materials.ground);
  island.position.y=-.65; campus.add(island);
  const islandRim = new THREE.Mesh(new THREE.TorusGeometry(28.4,.11,8,160), materials.cyan);
  islandRim.rotation.x=Math.PI/2; islandRim.position.y=-.18; campus.add(islandRim);
  const innerRim = new THREE.Mesh(new THREE.TorusGeometry(25.7,.035,5,160), lineSoft);
  innerRim.rotation.x=Math.PI/2; innerRim.position.y=-.15; campus.add(innerRim);

  // Path lights and radial smart infrastructure lanes.
  for(let k=0;k<12;k++){
    const a=k*Math.PI/6;
    const pts=[];
    for(let j=0;j<=36;j++){
      const r=7+j/36*20;
      pts.push(new THREE.Vector3(Math.cos(a)*r,-.13,Math.sin(a)*r));
    }
    line(pts,k%3===0?lineCyan:lineSoft,campus);
    for(let j=0;j<5;j++){
      const r=8+j*4.1;
      const node=new THREE.Mesh(new THREE.SphereGeometry(.075,8,8),materials.cyan);
      node.position.set(Math.cos(a)*r,-.02,Math.sin(a)*r);campus.add(node);
    }
  }

  // Central AI learning tower: unmistakable floor plates, glass core, frame and planted terraces.
  const tower = new THREE.Group(); tower.position.set(0,0,0); campus.add(tower);
  const core = new THREE.Mesh(new THREE.BoxGeometry(5.25,18.2,4.4),materials.glass);
  core.position.y=9.45; tower.add(core);
  const coreBack = box(tower,0,9.4,-2.12,4.95,18.15,.16,materials.dark);
  // Window strips on the visible front and side.
  for(let lev=0;lev<10;lev++){
    const y=1.25+lev*1.72;
    for(let col=0;col<5;col++){
      const x=-1.95+col*.98;
      box(tower,x,y,2.24,.68,1.15,.06,(col+lev)%4===0?materials.glassLight:materials.dark2);
      box(tower,x,y,-2.22,.68,1.15,.05,materials.glassLight);
    }
    // A strong horizontal floor line makes the tower legible from a distance.
    box(tower,0,y+.73,0,7.4-lev*.16,.12,6.3-lev*.12,materials.frame);
  }
  // Terraced slabs spiral gently up the tower; planted beds are visible as green silhouettes.
  for(let lev=0;lev<9;lev++){
    const y=.9+lev*1.95;
    const w=9.2-lev*.43, d=7.6-lev*.31;
    const floor=box(tower,0,y,0,w,.26,d,lev%2===0?materials.floor:materials.edge,lev*.045);
    const frontEdge=box(tower,0,y+.16,d/2,w,.08,.12,lev%2===0?materials.cyan:materials.gold,lev*.045);
    const sideEdge=box(tower,w/2,y+.16,0,.12,.08,d,materials.frame,lev*.045);
    // Bright atrium window ribbon
    box(tower,0,y+.34,0,w*.67,.07,d*.7,materials.glassLight,lev*.045);
    for(let p=0;p<5;p++){
      const x=(p-2)*(w*.17), z=(p%2===0?1:-1)*(d*.38);
      const plant=new THREE.Mesh(new THREE.IcosahedronGeometry(.42+(p%3)*.1,1),[materials.green1,materials.green2,materials.green3][(p+lev)%3]);
      plant.position.set(x,y+.55,z);plant.scale.set(1.1,.58,.8);tower.add(plant);
    }
    for(let c=0;c<4;c++){
      const x=(c-1.5)*(w*.2);
      box(tower,x,y+.47,d*.39,.12,.55,.12,materials.frame,lev*.04);
    }
  }
  // Vertical corner rails and a luminous central spine.
  for(const [x,z] of [[-3.8,-3.1],[3.8,-3.1],[-3.8,3.1],[3.8,3.1]]){
    box(tower,x,9.8,z,.14,20,.14,materials.frame);
  }
  box(tower,0,10.1,2.36,.12,19.8,.08,materials.cyan);
  // Crown and landing halo
  const crown = new THREE.Group(); crown.position.y=19.3; tower.add(crown);
  cylinder(crown,0,.5,0,1.75,2.1,1.0,materials.dark,8);
  const crownRing=new THREE.Mesh(new THREE.TorusGeometry(2.1,.075,8,80),materials.cyan);
  crownRing.rotation.x=Math.PI/2;crownRing.position.y=1.05;crown.add(crownRing);
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4;
    const fin=box(crown,Math.cos(a)*.85,2.05,Math.sin(a)*.85,.12,2.5,.12,i%2?materials.frame:materials.cyan);
    fin.rotation.z=-Math.cos(a)*.18;fin.rotation.x=Math.sin(a)*.18;
  }
  const antenna=box(crown,0,3.9,0,.08,2.7,.08,materials.cyan);

  // A helper for legible campus blocks with windows, roof lighting and solar panels.
  function makeBuilding({x,z,w=8,d=5,h=4,floors=3,name='ACADEMIC BLOCK',angle=0,roofGarden=false}) {
    const group=new THREE.Group(); group.position.set(x,0,z); group.rotation.y=angle; campus.add(group);
    box(group,0,h/2,0,w,h,d,materials.dark);
    // Front glass wall, split into structural bays.
    box(group,0,h*.53,d/2+.035,w*.92,h*.78,.08,materials.glass);
    const floorH=h/floors;
    for(let fl=0;fl<floors;fl++){
      const y=.65+fl*floorH;
      box(group,0,y,d/2+.1,w*.96,.09,.13,materials.frame);
      for(let c=0;c<Math.floor(w/1.05);c++){
        const xx=-w/2+.55+c*(w-1.1)/Math.max(1,Math.floor(w/1.05)-1);
        box(group,xx,.35+fl*floorH,d/2+.105,.58,floorH*.55,.045,(c+fl)%4===0?materials.glassLight:materials.dark2);
      }
    }
    // Side fins and roof cap define building volume.
    for(let c=0;c<5;c++){
      const xx=-w/2+c*(w/4);
      box(group,xx,h/2,d/2+.17,.075,h+.22,.11,materials.frame);
    }
    box(group,0,h+.12,0,w+.35,.22,d+.35,materials.floor);
    box(group,0,h+.25,0,w*.94,.045,d*.88,materials.cyan);
    // Solar collector strips.
    for(let i=0;i<Math.max(3,Math.floor(w/1.4));i++){
      const xx=-w*.42+i*(w*.84/(Math.max(3,Math.floor(w/1.4))-1));
      const panel=box(group,xx,h+.30,0,.78,.035,d*.57,materials.glassLight);
      panel.rotation.y=-.12;
    }
    if(roofGarden){
      for(let i=0;i<12;i++){
        const xx=(Math.random()-.5)*w*.83, zz=(Math.random()-.5)*d*.7;
        const shrub=new THREE.Mesh(new THREE.IcosahedronGeometry(.28+Math.random()*.17,1),[materials.green1,materials.green2,materials.green3][i%3]);
        shrub.position.set(xx,h+.56,zz);shrub.scale.y=.55;group.add(shrub);
      }
    }
    // Entrance canopy.
    box(group,0,.62,d/2+.62,w*.34,.13,.95,materials.frame);
    for(let p of [-1,1]) box(group,p*w*.17,.29,d/2+.86,.08,.66,.08,materials.cyan);
    return group;
  }
  makeBuilding({x:-11,z:-4,w:10,d:7,h:5.2,floors:3,angle:.12,roofGarden:true}); // library
  makeBuilding({x:11,z:-5,w:10,d:6.2,h:4.8,floors:3,angle:-.1,roofGarden:true}); // classrooms
  makeBuilding({x:-11,z:7,w:8.5,d:6,h:4.1,floors:2,angle:-.16,roofGarden:false}); // labs
  makeBuilding({x:11,z:7,w:8.8,d:6,h:4.4,floors:3,angle:.1,roofGarden:true}); // residence / innovation
  makeBuilding({x:0,z:-12,w:10.5,d:5,h:3.7,floors:2,angle:0,roofGarden:false}); // learning commons
  makeBuilding({x:0,z:12,w:9,d:5,h:3.2,floors:2,angle:0,roofGarden:true}); // low campus building

  // Stadium: oval running track, green infield, clear white lane markings.
  function ellipseShape(rx,rz) {
    const s=new THREE.Shape();
    s.absellipse(0,0,rx,rz,0,Math.PI*2,false,0);
    return s;
  }
  const trackShape=ellipseShape(7.2,3.9);
  const hole=new THREE.Path();hole.absellipse(0,0,5.65,2.5,0,Math.PI*2,true,0);trackShape.holes.push(hole);
  const track=new THREE.Mesh(new THREE.ShapeGeometry(trackShape,56),mat('#b95e64',.12,.62));
  track.rotation.x=-Math.PI/2;track.position.set(-17,.03,-9);campus.add(track);
  const infieldShape=ellipseShape(5.55,2.42);
  const field=new THREE.Mesh(new THREE.ShapeGeometry(infieldShape,48),mat('#317f69',.02,.87));
  field.rotation.x=-Math.PI/2;field.position.set(-17,.035,-9);campus.add(field);
  for(let i=0;i<5;i++){
    const curve=new THREE.EllipseCurve(-17, -9, 5.85+i*.24, 2.65+i*.24,0,Math.PI*2,false,0);
    const pts=curve.getPoints(120).map(p=>new THREE.Vector3(p.x,.07,p.y));
    line(pts,new THREE.LineBasicMaterial({color:'#f7d8d0',transparent:true,opacity:.8}),campus);
  }
  // Pitch lines, scaled to the infield.
  const fieldLine=new THREE.LineBasicMaterial({color:'#d8fff2',transparent:true,opacity:.75});
  line([new THREE.Vector3(-21,.09,-9),new THREE.Vector3(-13,.09,-9)],fieldLine,campus);
  line([new THREE.Vector3(-17,.09,-10.9),new THREE.Vector3(-17,.09,-7.1)],fieldLine,campus);
  const goal1=box(campus,-21,.22,-9,.08,.38,.18,materials.frame);
  const goal2=box(campus,-13,.22,-9,.08,.38,.18,materials.frame);

  // Small trees & biophilic campus landscaping.
  function makeTree(x,z,s=1) {
    const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(s);campus.add(g);
    cylinder(g,0,.48,0,.09,.16,.96,mat('#6f8a7f',.05,.8),7);
    const greens=[materials.green1,materials.green2,materials.green3];
    for(let j=0;j<3;j++){
      const cone=new THREE.Mesh(new THREE.ConeGeometry(.48-j*.09,.8,7),greens[j]);
      cone.position.y=.92+j*.36;g.add(cone);
    }
    return g;
  }
 // Small trees & biophilic campus landscaping.
function makeTree(x, z, s = 1) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.scale.setScalar(s);
  campus.add(g);

  cylinder(g, 0, 0.48, 0, 0.09, 0.16, 0.96, mat('#6f8a7f', 0.05, 0.8), 7);

  const greens = [materials.green1, materials.green2, materials.green3];

  for (let j = 0; j < 3; j++) {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.48 - j * 0.09, 0.8, 7),
      greens[j]
    );

    cone.position.y = 0.92 + j * 0.36;
    g.add(cone);
  }

  return g;
}

// Generate campus trees.
for (let i = 0; i < 58; i++) {
  const a = Math.random() * Math.PI * 2;
  const r = 14 + Math.random() * 10;

  const x = Math.cos(a) * r;
  const z = Math.sin(a) * r;

  // Keep trees away from the central tower and stadium.
  if (Math.hypot(x, z) < 7) continue;
  if (x < -10 && z < -4 && z > -15) continue;
  if (Math.abs(x) < 6 && Math.abs(z) > 10) continue;

  makeTree(x, z, 0.65 + Math.random() * 0.55);
}

// Garden terraces around the tower.
for (let i = 0; i < 16; i++) {
  const a = i * Math.PI / 8;
  const r = 7.2;

  const x = Math.cos(a) * r;
  const z = Math.sin(a) * r;

  // Raised planter.
  box(
    campus,
    x, 0.15, z,
    1.25, 0.35, 0.75,
    materials.edge
  );

  // Decorative plant.
  const plant = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.55, 1),
    [materials.green1, materials.green2, materials.green3][i % 3]
  );

  plant.position.set(x, 0.6, z);
  plant.scale.set(1.1, 0.65, 0.85);
  campus.add(plant);
}

  // Water / reflection pool with bridge strips, on the right side of the campus.
  const pool=new THREE.Mesh(new THREE.BoxGeometry(8,.12,3.8),new THREE.MeshPhysicalMaterial({color:'#1b819d',metalness:.4,roughness:.12,transparent:true,opacity:.82,clearcoat:1}));
  pool.position.set(17,-.02,14);campus.add(pool);
  for(let i=0;i<7;i++) box(campus,13.8+i*.95,.06,14,.04,.03,3.5,materials.cyan);

  // Digital twin holo display panels, visibly attached to campus architecture.
  function makeHoloPanel(x,y,z,title,sub) {
    const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=-.28;campus.add(g);
    const panel=box(g,0,0,0,3.25,1.9,.1,materials.dark2);
    const borderMat=new THREE.LineBasicMaterial({color:'#7eeeff',transparent:true,opacity:.9});
    const pts=[[-1.63,-.95,.06],[1.63,-.95,.06],[1.63,.95,.06],[-1.63,.95,.06],[-1.63,-.95,.06]].map(a=>new THREE.Vector3(...a));
    line(pts,borderMat,g);
    // Tiny chart bars simulate a live dashboard without relying on external fonts/textures.
    for(let i=0;i<7;i++){
      box(g,-1.2+i*.34,-.35+(i%3)*.12,.07,.12,.28+(i%3)*.24,.025,i%2?materials.cyan:materials.gold);
    }
    line([new THREE.Vector3(-1.25,.34,.08),new THREE.Vector3(1.2,.34,.08)],lineSoft,g);
    for(let i=0;i<4;i++){
      const node=new THREE.Mesh(new THREE.SphereGeometry(.055,8,8),materials.cyan);
      node.position.set(-.9+i*.58,.62,.09);g.add(node);
    }
    return g;
  }
  makeHoloPanel(13,7,1.5,'AI LEARNING','SMART');
  makeHoloPanel(-15,5,0,'DIGITAL TWIN','CAMPUS');

  // Orbit lines above the campus, subtle enough not to obscure the architecture.
  const orbitGroup=new THREE.Group();scene.add(orbitGroup);
  for(let i=0;i<4;i++){
    const rx=12+i*4.8, rz=8+i*3.1;
    const curve=new THREE.EllipseCurve(0,7+i*3.15,rx,rz,0,Math.PI*2,false,0);
    const pts=curve.getPoints(180).map(p=>new THREE.Vector3(p.x,p.y,p.y===Infinity?0:p.y*0 + p.y)); // replaced below with explicit ellipse
    const fixed=[];
    for(let j=0;j<=180;j++){
      const a=j/180*Math.PI*2;
      fixed.push(new THREE.Vector3(Math.cos(a)*rx,7+i*3.15+Math.sin(a)*.75,Math.sin(a)*rz));
    }
    line(fixed,new THREE.LineBasicMaterial({color:i%2?'#44cce8':'#dbffff',transparent:true,opacity:.22}),orbitGroup);
  }

  // Particle cloud converges toward architecture and data-lane trajectories.
  const particleCount=15500;
  const targets=new Float32Array(particleCount*3);
  const starts=new Float32Array(particleCount*3);
  const baseColors=new Float32Array(particleCount*3);
  const color1=new THREE.Color('#89f4ff'), color2=new THREE.Color('#e3fcff'), color3=new THREE.Color('#ffd994'), color4=new THREE.Color('#42b7da');
  const rand=(min,max)=>min+Math.random()*(max-min);
  for(let i=0;i<particleCount;i++){
    let x,y,z; const mode=Math.random();
    if(mode<.5){
      // Particle layers follow tower floor edges.
      const lev=Math.floor(Math.random()*10);
      const a=Math.random()*Math.PI*2;
      const rr=rand(3.4,5.6-lev*.16);
      x=Math.cos(a)*rr;y=.8+lev*1.92+rand(-.24,.24);z=Math.sin(a)*rr;
    } else if(mode<.72){
      // Campus circulation stream: broad glowing ring.
      const a=Math.random()*Math.PI*2,rr=rand(10,25);
      x=Math.cos(a)*rr;y=rand(.05,1.1);z=Math.sin(a)*rr;
    } else if(mode<.88){
      // Two rising helices that lead the eye up toward the AI hub.
      const t=Math.random(),a=t*Math.PI*11+rand(-.22,.22),rr=rand(5.5,8.2);
      x=Math.cos(a)*rr;y=1+t*19;z=Math.sin(a)*rr;
    } else {
      // Data points suspended around the holographic campus.
      const a=Math.random()*Math.PI*2,rr=rand(12,24);
      x=Math.cos(a)*rr;y=rand(2,16);z=Math.sin(a)*rr;
    }
    targets[i*3]=x;targets[i*3+1]=y;targets[i*3+2]=z;
    const a=Math.random()*Math.PI*2, r=rand(18,39);
    starts[i*3]=Math.cos(a)*r;
    starts[i*3+1]=rand(0,29);
    starts[i*3+2]=Math.sin(a)*r;
    const c=Math.random()<.12?color3:(Math.random()<.54?color1:(Math.random()<.5?color2:color4));
    baseColors[i*3]=c.r;baseColors[i*3+1]=c.g;baseColors[i*3+2]=c.b;
  }
  const pg=new THREE.BufferGeometry();
  pg.setAttribute('position',new THREE.BufferAttribute(new Float32Array(starts),3).setUsage(THREE.DynamicDrawUsage));
  pg.setAttribute('color',new THREE.BufferAttribute(baseColors,3));
  const particleTexCanvas=document.createElement('canvas');particleTexCanvas.width=32;particleTexCanvas.height=32;
  const pctx=particleTexCanvas.getContext('2d');
  const gradient=pctx.createRadialGradient(16,16,0,16,16,16);
  gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.22,'rgba(255,255,255,.95)');gradient.addColorStop(.6,'rgba(255,255,255,.35)');gradient.addColorStop(1,'rgba(255,255,255,0)');
  pctx.fillStyle=gradient;pctx.fillRect(0,0,32,32);
  const particleMap=new THREE.CanvasTexture(particleTexCanvas);
  const pmat=new THREE.PointsMaterial({size:.18,map:particleMap,transparent:true,opacity:.87,depthWrite:false,blending:THREE.AdditiveBlending,vertexColors:true,sizeAttenuation:true});
  const points=new THREE.Points(pg,pmat);scene.add(points);

  // Interactive intelligence layer: the campus responds with moving data streams,
  // a scanning ring, and local particle turbulence around the selected system.
  const interactionModes = {
    ai: { label:'AI 教学中心', detail:'学习数据流已接入 · 个性化教学路径生成中', point:new THREE.Vector3(0,8,0), radius:9, color:0x75f4ff },
    traffic: { label:'智慧交通网络', detail:'校园路径已扫描 · 正在计算人流与通行方案', point:new THREE.Vector3(-17,1,-9), radius:10, color:0xffd992 },
    energy: { label:'绿色能源网络', detail:'建筑能耗节点已连接 · 正在优化能源分配', point:new THREE.Vector3(17,1,14), radius:10, color:0x7bffcf }
  };
  let activeMode='ai', pulseStart=-10, pointerWorld=null, pointerActive=false;
  const interactionRaycaster=new THREE.Raycaster();
  const pointerNdc=new THREE.Vector2();
  const interactionPlane=new THREE.Plane(new THREE.Vector3(0,1,0),-1);
  const interactionHit=new THREE.Vector3();
  const scanRing=new THREE.Mesh(
    new THREE.TorusGeometry(1,.055,6,88),
    new THREE.MeshBasicMaterial({color:interactionModes.ai.color,transparent:true,opacity:.9,depthWrite:false})
  );
  scanRing.rotation.x=Math.PI/2;scene.add(scanRing);
  const scanRing2=new THREE.Mesh(
    new THREE.TorusGeometry(1,.025,5,88),
    new THREE.MeshBasicMaterial({color:0xc7fbff,transparent:true,opacity:.58,depthWrite:false})
  );
  scanRing2.rotation.x=Math.PI/2;scene.add(scanRing2);
  const flowLines=[];
  for(let n=0;n<3;n++){
    const geo=new THREE.BufferGeometry();
    const arr=new Float32Array(100*3);
    geo.setAttribute('position',new THREE.BufferAttribute(arr,3));
    const obj=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0x7eeeff,transparent:true,opacity:.5,depthWrite:false}));
    scene.add(obj);flowLines.push(obj);
  }
  function setInteractionMode(mode){
    if(!interactionModes[mode])return;
    activeMode=mode;pulseStart=elapsed;
    const info=interactionModes[mode];
    scanRing.material.color.setHex(info.color);scanRing2.material.color.setHex(info.color);
    document.querySelectorAll('.mode-button').forEach(btn=>btn.classList.toggle('active',btn.dataset.mode===mode));
    const state=document.querySelector('#systemState'),detail=document.querySelector('#systemDetail');
    if(state)state.textContent='正在响应：'+info.label;
    if(detail)detail.textContent=info.detail;
    if(statusEl)statusEl.innerHTML='<span class="live-dot"></span> '+info.label.toUpperCase()+' · LIVE DATA FLOW';
  }
  document.querySelectorAll('.mode-button').forEach(btn=>btn.addEventListener('click',()=>setInteractionMode(btn.dataset.mode)));
  renderer.domElement.addEventListener('pointermove',e=>{
    pointerNdc.set((e.clientX/innerWidth)*2-1,-(e.clientY/innerHeight)*2+1);
    interactionRaycaster.setFromCamera(pointerNdc,camera);
    pointerActive=interactionRaycaster.ray.intersectPlane(interactionPlane,interactionHit)!==null;
    if(pointerActive)pointerWorld=interactionHit.clone();
  });
  renderer.domElement.addEventListener('pointerleave',()=>{pointerActive=false;});
  renderer.domElement.addEventListener('click',()=>{if(pointerActive){pulseStart=elapsed;}});

  // A few larger slow-moving light nodes make the campus feel alive.
  const nodeGroup=new THREE.Group();scene.add(nodeGroup);
  for(let i=0;i<54;i++){
    const node=new THREE.Mesh(new THREE.SphereGeometry(rand(.035,.085),8,8),i%5===0?materials.gold:materials.cyan);
    node.position.set(rand(-24,24),rand(1,23),rand(-23,23));node.userData.phase=Math.random()*Math.PI*2;nodeGroup.add(node);
  }

  const clock=new THREE.Clock();
  let elapsed=0;
  const smooth=t=>t*t*(3-2*t);
  function animate(){
    requestAnimationFrame(animate);
    const dt=Math.min(clock.getDelta(),.04);elapsed+=dt;
    const assemble=smooth(THREE.MathUtils.clamp(elapsed/6.8,0,1));
    const arr=pg.attributes.position.array;
    const focus=interactionModes[activeMode].point;
    const focusRadius=interactionModes[activeMode].radius;
    const pulseAge=elapsed-pulseStart;
    for(let i=0;i<particleCount;i++){
      const k=i*3,tx=targets[k],ty=targets[k+1],tz=targets[k+2];
      const sx=starts[k],sy=starts[k+1],sz=starts[k+2];
      const shimmer=.055+(.34*(1-assemble));
      let x=sx+(tx-sx)*assemble+Math.sin(elapsed*.65+i*.047)*shimmer;
      let y=sy+(ty-sy)*assemble+Math.sin(elapsed*.8+i*.031)*shimmer*.85;
      let z=sz+(tz-sz)*assemble+Math.cos(elapsed*.7+i*.039)*shimmer;
      // Nearby particles spiral around the currently selected smart system.
      const dx=x-focus.x,dy=y-focus.y,dz=z-focus.z;
      const dist=Math.sqrt(dx*dx+dy*dy+dz*dz);
      if(dist<focusRadius){
        const influence=(1-dist/focusRadius);
        const swirl=Math.sin(elapsed*1.7+i*.021)*.48*influence;
        x+=(-dz/(dist+.35))*swirl + Math.cos(elapsed*1.15+i*.013)*.2*influence;
        z+=( dx/(dist+.35))*swirl + Math.sin(elapsed*1.25+i*.017)*.2*influence;
        y+=Math.sin(elapsed*2+i*.03)*.22*influence;
      }
      // A click launches an expanding data pulse through the cloud.
      if(pulseAge>=0&&pulseAge<2.2){
        const waveDist=Math.abs(dist-(pulseAge*8.5));
        const wave=Math.max(0,1-waveDist/1.7)*(1-pulseAge/2.2);
        x+=dx/(dist+.4)*wave*.85;y+=dy/(dist+.4)*wave*.55;z+=dz/(dist+.4)*wave*.85;
      }
      // Pointer acts like a non-invasive magnetic field: particles bend around it.
      if(pointerActive&&pointerWorld){
        const px=x-pointerWorld.x,py=y-1,pz=z-pointerWorld.z;
        const pd=Math.sqrt(px*px+py*py+pz*pz);
        if(pd<5.2){const f=(1-pd/5.2)*.52;x+=(-pz/(pd+.3))*f;z+=(px/(pd+.3))*f;y+=Math.sin(elapsed*3+i*.08)*f*.3;}
      }
      arr[k]=x;arr[k+1]=y;arr[k+2]=z;
    }
    pg.attributes.position.needsUpdate=true;
    // Holographic scanner rings and three live data traces follow the active target.
    scanRing.position.set(focus.x,.18,focus.z);scanRing2.position.set(focus.x,.2,focus.z);
    const ringScale=1+((elapsed*2.2)%3.8);
    scanRing.scale.setScalar(ringScale);scanRing2.scale.setScalar(Math.max(.2,ringScale-.8));
    scanRing.material.opacity=.85*((4.8-ringScale)/3.8);scanRing2.material.opacity=.5*((4.8-ringScale)/3.8);
    flowLines.forEach((obj,index)=>{
      const pa=obj.geometry.attributes.position.array;
      const phase=(elapsed*.34+index/3)%1;
      for(let j=0;j<100;j++){
        const t=j/99;
        const a=t*Math.PI*2+elapsed*.25+index*2.1;
        const r=focusRadius*(.3+t*.75);
        pa[j*3]=focus.x+Math.cos(a)*r;
        pa[j*3+1]=focus.y+Math.sin(t*9+elapsed*1.8+index)*(.35+t*1.8);
        pa[j*3+2]=focus.z+Math.sin(a)*r;
      }
      obj.geometry.attributes.position.needsUpdate=true;
      obj.material.color.setHex(interactionModes[activeMode].color);
      obj.material.opacity=.12+Math.abs(Math.sin(elapsed*1.8+index))* .3;
    });
    nodeGroup.children.forEach((node,i)=>{node.position.y+=Math.sin(elapsed*.7+node.userData.phase)*.0025;});
    orbitGroup.rotation.y=Math.sin(elapsed*.12)*.06;
    crown.rotation.y=elapsed*.19;
    tower.rotation.y=Math.sin(elapsed*.15)*.025;
    // Slow autonomous orbit when not being dragged.
    if(!dragging) azimuth += dt*.035;
    const sinP=Math.sin(polar);
    camera.position.set(
      target.x+Math.sin(azimuth)*distance*sinP,
      target.y+Math.cos(polar)*distance,
      target.z+Math.cos(azimuth)*distance*sinP
    );
    camera.lookAt(target);
    renderer.render(scene,camera);
    if(statusEl && elapsed<7){statusEl.innerHTML='<span class="live-dot"></span> 3D CAMPUS ONLINE · '+Math.round(assemble*100)+'% PARTICLE ASSEMBLY';}
  }
  animate();

  addEventListener('resize',()=>{
    camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
  });
}