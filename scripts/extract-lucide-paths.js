// Script de una sola vez (no forma parte de la app): extrae los <path>/<circle>/<line>/<rect>
// reales de un set de íconos de lucide-react usando renderToStaticMarkup (server-side, donde
// es seguro), para poder dibujarlos como formas nativas de Konva sin cargar ninguna imagen.
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const icons = require("lucide-react");

const ICONS = [
  "Armchair",
  "User",
  "Mic",
  "Disc3",
  "Camera",
  "Cake",
  "Church",
  "Footprints",
  "DoorOpen",
  "Bath",
  "ArrowLeftRight",
  "Heart",
];

for (const name of ICONS) {
  const Icon = icons[name];
  if (!Icon) {
    console.log(`// MISSING: ${name}`);
    continue;
  }
  const svg = renderToStaticMarkup(React.createElement(Icon, { size: 24, strokeWidth: 2 }));
  console.log(`\n// ${name}`);
  console.log(svg);
}
