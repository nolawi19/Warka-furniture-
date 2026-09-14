// The photographs the shop actually took. They were inlined as data URIs in
// the original single-file site; they now live in /public/products and this
// map is what the seed uses.
var IMG = {
  logo:  '/brand/logo.jpg',
  bed:   '/products/bed.jpg',
  bedG:  '/products/bedG.jpg',
  dress: '/products/dress.jpg',
  stool: '/products/stool.jpg',
  chest: '/products/chest.jpg',
  ped:   '/products/ped.jpg'
};

var CATEGORIES = [
  { key:'beds',     name:'Beds',             blurb:'Buttoned, built to your mattress' },
  { key:'heads',    name:'Headboards',       blurb:'On their own, for a base you have' },
  { key:'dressers', name:'Dressing tables',  blurb:'With a mirror, or without' },
  { key:'mirrors',  name:'Mirrors',          blurb:'Framed in the same board' },
  { key:'drawers',  name:'Chests of drawers',blurb:'Two to six drawers' },
  { key:'office',   name:'Office',           blurb:'Pedestals that roll and lock' },
  { key:'stools',   name:'Stools',           blurb:'Padded, with storage inside' }
];

function cm(s){ return parseFloat(s) / 100; }
function slug(s){ return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }

var LINES = [
  { key:'bed', cat:'beds', name:'Buttoned bed', build:'bed', rank:1,
    axes:[ ['size',['90 cm','120 cm','140 cm','160 cm','180 cm']],
           ['colour',['cream','grey']],
           ['base',['plain base','storage base']] ],
    derive:function(v){ return { uph: v.colour === 'cream' ? 'cream' : 'slate',
      opts:{ width: cm(v.size) + 0.20, storage: v.base === 'storage base' } }; } },

  { key:'head', cat:'heads', name:'Headboard', build:'bed', part:'headboard', rank:4,
    axes:[ ['size',['120 cm','140 cm','160 cm','180 cm']], ['colour',['cream','grey']] ],
    derive:function(v){ return { uph: v.colour === 'cream' ? 'cream' : 'slate',
      opts:{ width: cm(v.size) + 0.20 } }; } },

  { key:'base', cat:'beds', name:'Bed base', build:'bed', part:'base', rank:7,
    axes:[ ['size',['90 cm','120 cm','140 cm','160 cm','180 cm']], ['colour',['cream','grey']] ],
    derive:function(v){ return { uph: v.colour === 'cream' ? 'cream' : 'slate',
      opts:{ width: cm(v.size) + 0.20 } }; } },

  { key:'dress', cat:'dressers', name:'Dressing table', build:'dresser', rank:2,
    axes:[ ['width',['80 cm','100 cm','120 cm']],
           ['board',['white','marble']],
           ['mirror',['with mirror','no mirror']] ],
    derive:function(v){ return { board: v.board === 'white' ? 'white' : 'marble',
      opts:{ width: cm(v.width), mirror: v.mirror === 'with mirror',
             dtDrawers: v.width === '120 cm' ? 4 : 3 } }; } },

  { key:'mirror', cat:'mirrors', name:'Mirror', build:'dresser', part:'mirror', rank:8,
    axes:[ ['shape',['tall','wide','square']], ['board',['white','marble']] ],
    derive:function(v){
      var w = v.shape === 'wide' ? 0.80 : v.shape === 'square' ? 0.62 : 0.50;
      var h = v.shape === 'wide' ? 0.62 : v.shape === 'square' ? 0.62 : 0.96;
      return { board: v.board === 'white' ? 'white' : 'marble',
               opts:{ mirrorWide:w, mirrorTall:h } }; } },

  { key:'chest', cat:'drawers', name:'Chest of drawers', build:'chest', rank:2,
    axes:[ ['drawers',['3 drawer','4 drawer','5 drawer','6 drawer']],
           ['board',['white','marble']],
           ['width',['60 cm','80 cm','100 cm']] ],
    derive:function(v){ return { board: v.board === 'white' ? 'white' : 'marble',
      opts:{ drawers: parseInt(v.drawers,10), width: cm(v.width) } }; } },

  { key:'bedside', cat:'drawers', name:'Bedside chest', build:'chest', rank:5,
    axes:[ ['drawers',['2 drawer','3 drawer']],
           ['board',['white','marble']],
           ['width',['40 cm','50 cm']] ],
    derive:function(v){ return { board: v.board === 'white' ? 'white' : 'marble',
      opts:{ drawers: parseInt(v.drawers,10), width: cm(v.width), depth:0.40 } }; } },

  { key:'ped', cat:'office', name:'Office pedestal', build:'pedestal', rank:3,
    axes:[ ['drawers',['3 drawer','4 drawer']],
           ['board',['white','marble']],
           ['feet',['on castors','fixed feet']] ],
    derive:function(v){ return { board: v.board === 'white' ? 'white' : 'marble',
      opts:{ drawers: parseInt(v.drawers,10), castors: v.feet === 'on castors' } }; } },

  { key:'stool', cat:'stools', name:'Storage stool', build:'stool', rank:6,
    axes:[ ['size',['40 cm','44 cm','60 cm']], ['colour',['cream','grey']] ],
    derive:function(v){ return { uph: v.colour === 'cream' ? 'cream' : 'slate', opts:{} }; } }
];

// The three prices marked on the photographs of the shop.
var PRICES = {
  'bed-180-cm-cream-plain-base':                  30000,
  'bed-180-cm-grey-storage-base':                 18000,
  'dress-100-cm-white-with-mirror':               'Br 15,000 – 16,500'
};
// The photographs themselves, on the pieces they show.
var PHOTOS = {
  'bed-180-cm-cream-plain-base':                  IMG.bed,
  'bed-180-cm-grey-storage-base':                 IMG.bedG,
  'dress-100-cm-white-with-mirror':               IMG.dress,
  'chest-5-drawer-marble-80-cm':                  IMG.chest,
  'ped-4-drawer-marble-on-castors':               IMG.ped,
  'stool-44-cm-cream':                            IMG.stool
};

var CATALOGUE = [];
function buildCatalogue(){
  LINES.forEach(function(line){
    var combos = [[]];
    line.axes.forEach(function(ax){
      var next = [];
      combos.forEach(function(c){ ax[1].forEach(function(v){ next.push(c.concat([[ax[0], v]])); }); });
      combos = next;
    });
    combos.forEach(function(c){
      var vals = {};
      c.forEach(function(pr){ vals[pr[0]] = pr[1]; });
      var id = line.key + '-' + c.map(function(pr){ return slug(pr[1]); }).join('-');
      var d = line.derive(vals);
      var spec = c.map(function(pr){ return pr[1]; }).join(' · ');
      CATALOGUE.push({
        id:id, line:line.key, name:line.name, cat:line.cat, spec:spec, rank:line.rank,
        price: Object.prototype.hasOwnProperty.call(PRICES, id) ? PRICES[id] : null,
        photo: PHOTOS[id] || null,
        finish: d.board || d.uph,
        thumb: { build:line.build, part:line.part || null, board:d.board, uph:d.uph, opts:d.opts },
        hay: (line.name + ' ' + spec + ' ' + line.cat).toLowerCase()
      });
    });
  });
}

buildCatalogue();
module.exports = { IMG, CATEGORIES, LINES, PRICES, PHOTOS, CATALOGUE };
