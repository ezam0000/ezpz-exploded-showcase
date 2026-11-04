import type { ShowcaseProduct } from './components/ezpz-exploded-showcase';
export const products: ShowcaseProduct[] = [
  {
    id: 'headphones', name: 'Headphones', title: ['Sound,', 'inside out.'],
    model: '/models/headphones.glb', poster: '/posters/headphones.webp',
    camera: [5.6, 2.9, 7.2], target: [0.35, 0.9, 0], ground: -.53, size: 6.2, assembledSize:4.8, explodeTarget:[.9,.12,0],
    background: '#ece9e2', ink: '#232520', accent: '#da582e',
    finishes: [{name:'Silver',color:'#aeb8bd'}, {name:'Graphite',color:'#474d53'}, {name:'Champagne',color:'#c7ab7d'}],
    parts: [
      {id:'headband',name:'Headband',description:'A continuous aluminum arch connects two cushioned listening chambers.',offset:[0,.22,0]},
      {id:'cushion_right',name:'Cushion',description:'A soft oval cushion wraps around an acoustically transparent cloth insert.',offset:[-.32,-.3,.26]},
      {id:'driver_right',name:'Driver',description:'A copper voice coil and concentric diaphragm sit at the heart of each earcup.',offset:[.68,0,0]},
      {id:'electronics_right',name:'Electronics',description:'A compact controller board sits between the driver and the outer shell.',offset:[1.38,.16,0]},
      {id:'shell_right',name:'Shell',description:'A rounded aluminum shell holds the assembly, with a polished edge and recessed vents.',offset:[2.12,.34,0]},
    ],
  },
  {
    id: 'switch', name: 'Switch', title: ['Small part.', 'Big feeling.'],
    model: '/models/switch.glb', poster: '/posters/switch.webp',
    camera: [4.6,3.1,6], target:[0,.5,0],ground:-.79,size:5.8,assembledSize:3.4,explodeTarget:[0,.9,0],
    background:'#e5e8df',ink:'#252b23',accent:'#d64c29',
    finishes:[{name:'Limestone',color:'#d0c5ad'},{name:'Cobalt',color:'#3c56c7'},{name:'Graphite',color:'#51585b'}],
    parts:[
      {id:'keycap',name:'Keycap',description:'A rounded ceramic cap gives every press a smooth, generous contact surface.',offset:[0,1.9,0]},
      {id:'top',name:'Housing',description:'The upper housing guides the moving stem and holds the switch together.',offset:[0,1.12,0]},
      {id:'stem',name:'Stem',description:'A cross-shaped mount carries the keycap through its travel.',offset:[0,.72,0]},
      {id:'spring',name:'Spring',description:'A helical spring returns the stem after each press.',offset:[0,.28,0]},
      {id:'base',name:'Base',description:'The lower housing contains the brass contacts and solder pins.',offset:[0,-.2,0]},
    ],
  },
  {
    id:'emblem',name:'Emblem',title:['Make an', 'impression.'],
    model:'/models/emblem.glb',poster:'/posters/emblem.webp',
    camera:[3.4,5.4,5],target:[0,0,0],ground:-.52,size:6.5,assembledSize:5.3,explodeTarget:[0,.4,0],
    background:'#e3e7ef',ink:'#1c2c4a',accent:'#3655c6',
    finishes:[{name:'Cobalt',color:'#2643c2'},{name:'Vermilion',color:'#cb482d'},{name:'Silver',color:'#adb9c5'}],
    parts:[
      {id:'face',name:'Face',description:'A sculpted enamel face gives the wordmark its color and depth.',offset:[0,1.25,0]},
      {id:'core',name:'Core',description:'A satin metal core catches the light beneath the face.',offset:[0,.35,0]},
      {id:'back',name:'Backing',description:'A dark backing separates the silhouette from its surroundings.',offset:[0,-.14,0]},
    ],
  },
];
