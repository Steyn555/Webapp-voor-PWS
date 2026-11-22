export const MAP_VIEWBOX = { width: 400, height: 360 };

export const SURROUNDING_PATHS = {
  belgium:
    'M 0 360 L 0 282 L 89 271 L 117 281 L 132 277 L 151 266 L 157 255 L 170 257 L 188 258 L 201 268 L 221 273 L 230 280 L 243 295 L 233 319 L 237 327 L 257 329 L 265 360 Z',
  germany:
    'M 308 51 L 400 45 L 400 360 L 257 329 L 261 318 L 249 301 L 262 286 L 269 265 L 254 231 L 252 225 L 262 216 L 306 204 L 317 179 L 322 161 L 302 142 L 302 133 L 322 122 L 324 111 L 332 79 L 314 64 Z',
};

export const LAYERS = [
  { id: 'besmettingen', label: 'Besmettingen', unit: '', shortLabel: 'Besmettingen' },
  { id: 'rgetal', label: 'R-getal', unit: '', shortLabel: 'R-getal' },
  { id: 'vaccin', label: 'Vaccinatiegraad', unit: '%', shortLabel: 'Vaccinatie' },
  { id: 'rioolwater', label: 'Rioolwater', unit: '×10¹²', shortLabel: 'Rioolwater' },
];

export const PROVINCES = [
  {
    id: 'groningen',
    name: 'Groningen',
    city: 'Groningen',
    population: 596000,
    marker: { x: 292, y: 75 },
    paths: [
      'M 308 51 L 314 64 L 332 79 L 324 111 L 315 104 L 294 91 L 280 82 L 268 55 Z',
    ],
    base: { besmettingen: 118, rgetal: 1.09, vaccin: 79, rioolwater: 2.6 },
    growth: 1.08,
  },
  {
    id: 'friesland',
    name: 'Friesland',
    city: 'Leeuwarden',
    population: 659000,
    marker: { x: 243, y: 77 },
    paths: [
      'M 217 90 L 218 80 L 268 55 L 280 82 L 272 100 L 255 114 L 252 121 L 237 114 L 215 110 Z',
      'M 188 78 L 198 72 L 201 76 L 190 81 Z',
      'M 204 70 L 219 64 L 221 69 L 206 74 Z',
      'M 228 62 L 243 59 L 244 63 L 229 66 Z',
      'M 253 56 L 265 53 L 266 57 L 254 59 Z',
    ],
    base: { besmettingen: 94, rgetal: 1.04, vaccin: 81, rioolwater: 2.1 },
    growth: 1.04,
  },
  {
    id: 'drenthe',
    name: 'Drenthe',
    city: 'Assen',
    population: 502000,
    marker: { x: 291, y: 99 },
    paths: [
      'M 280 82 L 294 91 L 315 104 L 324 111 L 322 122 L 302 133 L 268 130 L 261 120 L 255 114 L 272 100 Z',
    ],
    base: { besmettingen: 102, rgetal: 1.06, vaccin: 82, rioolwater: 2.3 },
    growth: 1.05,
  },
  {
    id: 'overijssel',
    name: 'Overijssel',
    city: 'Zwolle',
    population: 1184000,
    marker: { x: 261, y: 148 },
    paths: [
      'M 252 121 L 255 114 L 261 120 L 268 130 L 302 133 L 302 142 L 322 161 L 317 179 L 301 185 L 265 174 L 255 155 L 245 154 L 245 138 Z',
    ],
    base: { besmettingen: 136, rgetal: 1.15, vaccin: 76, rioolwater: 3.1 },
    growth: 1.13,
  },
  {
    id: 'flevoland',
    name: 'Flevoland',
    city: 'Lelystad',
    population: 444000,
    marker: { x: 222, y: 147 },
    paths: [
      'M 237 114 L 252 121 L 245 138 L 245 154 L 231 164 L 221 176 L 205 167 L 203 154 L 222 136 L 235 135 Z',
    ],
    base: { besmettingen: 148, rgetal: 1.19, vaccin: 71, rioolwater: 3.5 },
    growth: 1.16,
  },
  {
    id: 'gelderland',
    name: 'Gelderland',
    city: 'Arnhem',
    population: 2133000,
    marker: { x: 249, y: 202 },
    paths: [
      'M 245 154 L 255 155 L 265 174 L 301 185 L 306 204 L 262 216 L 252 225 L 230 222 L 207 221 L 190 218 L 206 205 L 227 198 L 218 185 L 221 176 L 231 164 Z',
    ],
    base: { besmettingen: 144, rgetal: 1.16, vaccin: 77, rioolwater: 3.3 },
    growth: 1.14,
  },
  {
    id: 'utrecht',
    name: 'Utrecht',
    city: 'De Bilt',
    population: 1387000,
    marker: { x: 204, y: 190 },
    paths: [
      'M 200 166 L 221 176 L 218 185 L 227 198 L 206 205 L 197 202 L 184 192 L 182 178 L 190 171 Z',
    ],
    base: { besmettingen: 176, rgetal: 1.24, vaccin: 83, rioolwater: 4.1 },
    growth: 1.2,
  },
  {
    id: 'noord-holland',
    name: 'Noord-Holland',
    city: 'Amsterdam',
    population: 2952000,
    marker: { x: 186, y: 162 },
    paths: [
      'M 177 102 L 194 105 L 211 128 L 196 135 L 197 150 L 192 163 L 200 166 L 190 171 L 182 178 L 173 181 L 163 171 L 165 153 L 168 137 L 171 121 Z',
      'M 175 97 L 179 86 L 188 82 L 185 95 Z',
    ],
    base: { besmettingen: 192, rgetal: 1.28, vaccin: 80, rioolwater: 4.6 },
    growth: 1.22,
  },
  {
    id: 'zuid-holland',
    name: 'Zuid-Holland',
    city: 'Rotterdam',
    population: 3804000,
    marker: { x: 160, y: 209 },
    paths: [
      'M 163 171 L 173 181 L 182 178 L 184 192 L 197 202 L 206 205 L 190 218 L 182 222 L 167 231 L 156 232 L 142 222 L 120 218 L 137 202 L 146 189 L 154 179 Z',
    ],
    base: { besmettingen: 188, rgetal: 1.26, vaccin: 75, rioolwater: 4.4 },
    growth: 1.21,
  },
  {
    id: 'zeeland',
    name: 'Zeeland',
    city: 'Middelburg',
    population: 391000,
    marker: { x: 105, y: 252 },
    paths: [
      'M 109 229 L 132 224 L 145 232 L 143 240 L 115 238 Z',
      'M 93 249 L 101 244 L 125 243 L 142 249 L 145 258 L 128 257 L 100 257 Z',
      'M 89 265 L 115 264 L 139 267 L 132 277 L 117 281 L 90 271 Z',
    ],
    base: { besmettingen: 86, rgetal: 0.96, vaccin: 72, rioolwater: 1.8 },
    growth: 0.98,
  },
  {
    id: 'noord-brabant',
    name: 'Noord-Brabant',
    city: 'Eindhoven',
    population: 2626000,
    marker: { x: 222, y: 258 },
    paths: [
      'M 156 232 L 167 231 L 182 222 L 190 218 L 207 221 L 230 222 L 252 225 L 254 231 L 255 244 L 244 262 L 230 280 L 221 273 L 201 268 L 188 258 L 170 257 L 157 255 L 151 266 L 145 258 L 145 240 Z',
    ],
    base: { besmettingen: 168, rgetal: 1.21, vaccin: 78, rioolwater: 3.9 },
    growth: 1.18,
  },
  {
    id: 'limburg',
    name: 'Limburg',
    city: 'Maastricht',
    population: 1128000,
    marker: { x: 236, y: 319 },
    paths: [
      'M 254 231 L 269 265 L 262 286 L 249 301 L 261 318 L 257 329 L 237 327 L 233 319 L 243 295 L 230 280 L 244 262 L 255 244 Z',
    ],
    base: { besmettingen: 152, rgetal: 1.17, vaccin: 79, rioolwater: 3.4 },
    growth: 1.15,
  },
];

export const STATION_DOTS = [
  { x: 180, y: 90 },
  { x: 215, y: 108 },
  { x: 260, y: 92 },
  { x: 306, y: 112 },
  { x: 175, y: 132 },
  { x: 280, y: 160 },
  { x: 305, y: 176 },
  { x: 234, y: 184 },
  { x: 148, y: 192 },
  { x: 178, y: 212 },
  { x: 194, y: 242 },
  { x: 248, y: 246 },
  { x: 246, y: 284 },
  { x: 122, y: 249 },
];

export function getProvinceById(id) {
  return PROVINCES.find((p) => p.id === id) || null;
}

export function getProvinceMetric(provinceId, layerId) {
  const province = getProvinceById(provinceId);
  if (!province) return null;

  if (layerId === 'besmettingen') {
    const value = Math.round(province.base.besmettingen);
    return {
      value,
      formatted: `${value}`,
      intensity: Math.min(1, value / 260),
      level: value >= 180 ? 'hoog' : value >= 130 ? 'matig' : 'laag',
    };
  }

  if (layerId === 'rgetal') {
    const value = Number(province.base.rgetal.toFixed(2));
    return {
      value,
      formatted: `R = ${value.toFixed(2).replace('.', ',')}`,
      intensity: Math.min(1, Math.max(0.1, (value - 0.75) / 0.75)),
      level: value >= 1.2 ? 'hoog' : value >= 1.0 ? 'matig' : 'laag',
    };
  }

  if (layerId === 'vaccin') {
    const value = Math.min(96, Math.round(province.base.vaccin));
    return {
      value,
      formatted: `${value}%`,
      intensity: Math.min(1, value / 100),
      level: value >= 80 ? 'hoog' : value >= 74 ? 'matig' : 'laag',
    };
  }

  const value = Number(province.base.rioolwater.toFixed(1));
  return {
    value,
    formatted: `${value.toFixed(1).replace('.', ',')} ×10¹²`,
    intensity: Math.min(1, value / 7),
    level: value >= 4.5 ? 'hoog' : value >= 3.0 ? 'matig' : 'laag',
  };
}

export function getNationalSummary(layerId) {
  let weightedSum = 0;
  let totalPop = 0;

  for (const province of PROVINCES) {
    const metric = getProvinceMetric(province.id, layerId);
    weightedSum += metric.value * province.population;
    totalPop += province.population;
  }

  const avg = weightedSum / totalPop;

  if (layerId === 'besmettingen') {
    const rounded = Math.round(avg);
    return { label: 'Nederland', value: rounded, formatted: `${rounded}` };
  }
  if (layerId === 'rgetal') {
    const rounded = Number(avg.toFixed(2));
    return { label: 'Nederland', value: rounded, formatted: `R = ${rounded.toFixed(2).replace('.', ',')}` };
  }
  if (layerId === 'vaccin') {
    const rounded = Math.round(avg);
    return { label: 'Nederland', value: rounded, formatted: `${rounded}%` };
  }
  const rounded = Number(avg.toFixed(1));
  return { label: 'Nederland', value: rounded, formatted: `${rounded.toFixed(1).replace('.', ',')} ×10¹²` };
}

export function getRadarBlobs(layerId) {
  return PROVINCES.map((province) => {
    const metric = getProvinceMetric(province.id, layerId);
    const spread = 18 + metric.intensity * 24;
    return {
      id: province.id,
      x: province.marker.x,
      y: province.marker.y,
      radius: spread,
      intensity: metric.intensity,
      layerId,
    };
  });
}

export function getLayerConfig(layerId) {
  return LAYERS.find((l) => l.id === layerId) || LAYERS[0];
}
