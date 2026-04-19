type WasteKnowledge = {
  names: string[]
  curatedUses: string[]
  curatedCautions: string[]
  marketContext: string
  sourceBasis: string[]
}

const KNOWLEDGE: WasteKnowledge[] = [
  {
    names: [
      'coconut husk',
      'coconut_husk',
      'coco husk',
      'coco fiber',
      'coconut fiber',
      'coco fibre',
      'coconut fibre',
      'coir',
      'coco coir',
    ],
    curatedUses: ['coco coir fiber', 'mulch and soil moisture control', 'erosion control material'],
    curatedCautions: ['keep it dry before storage', 'separate fiber from contaminated waste'],
    marketContext: 'Often valuable when buyers want fiber, coir, or soil-conditioning material.',
    sourceBasis: ['Refamora curated waste notes', 'Existing marketplace waste suggestion map'],
  },
  {
    names: [
      'rice straw',
      'rice_straw',
      'dayami',
      'palay straw',
      'rice hay',
      'rice stalk',
      'rice stalks',
    ],
    curatedUses: ['mushroom substrate', 'mulch for vegetable beds', 'compost input'],
    curatedCautions: ['avoid moldy or overly wet bundles', 'bundle clean straw separately from burned residue'],
    marketContext: 'Usually more attractive when dry, bundled, and described by condition and volume.',
    sourceBasis: ['Refamora curated waste notes', 'Existing marketplace waste suggestion map'],
  },
  {
    names: [
      'corn stalks',
      'corn_stalks',
      'corn stalk',
      'maize stalk',
      'maize stalks',
      'corn stover',
      'corn residue',
      'maize residue',
      'mais stalk',
      'tangkay ng mais',
    ],
    curatedUses: ['silage or feed mix input', 'compost feedstock', 'biomass fuel'],
    curatedCautions: ['state whether stalks are fresh or dried', 'remove mixed plastic or field trash'],
    marketContext: 'Value is clearer when moisture level and intended use are described.',
    sourceBasis: ['Refamora curated waste notes', 'Existing marketplace waste suggestion map'],
  },
  {
    names: [
      'banana trunk',
      'banana_trunk',
      'banana stem',
      'banana pseudostem',
      'banana stalk',
      'saging trunk',
      'saging stem',
    ],
    curatedUses: ['fiber extraction', 'compost base', 'paper pulp experiments'],
    curatedCautions: ['note how fresh the cut material is', 'manage moisture because trunks spoil quickly'],
    marketContext: 'Buyers may care about freshness and whether the material is chopped or whole.',
    sourceBasis: ['Refamora curated waste notes', 'Existing marketplace waste suggestion map'],
  },
  {
    names: [
      'sugarcane bagasse',
      'sugarcane_bagasse',
      'sugar cane bagasse',
      'bagasse',
      'sugarcane fiber',
      'sugarcane fibre',
      'tubo residue',
    ],
    curatedUses: ['biofuel or biomass feedstock', 'compost carbon source', 'particleboard filler'],
    curatedCautions: ['store in a dry area', 'describe if it is loose or compacted'],
    marketContext: 'Cleaner and drier bagasse is usually easier to position for reuse.',
    sourceBasis: ['Refamora curated waste notes', 'Existing marketplace waste suggestion map'],
  },
  {
    names: [
      'pineapple leaves',
      'pineapple_leaves',
      'pineapple leaf',
      'pina leaves',
      'pina leaf',
      'pina fiber',
      'pineapple fiber',
      'pineapple fibre',
      'dahon ng pinya',
    ],
    curatedUses: ['fiber extraction', 'compost input', 'craft or woven material trials'],
    curatedCautions: ['state whether leaves are fresh or dried', 'keep bundles free from mud and rot'],
    marketContext: 'Buyer interest often depends on fiber quality and handling condition.',
    sourceBasis: ['Refamora curated waste notes', 'Existing marketplace waste suggestion map'],
  },
  {
    names: [
      'cassava peel',
      'cassava_peel',
      'cassava peels',
      'tapioca peel',
      'tapioca peels',
      'kamoteng kahoy peel',
      'kamoteng kahoy peels',
      'balat ng cassava',
      'cassava skin',
    ],
    curatedUses: ['compost additive', 'processed feed mix input', 'biomass experiments'],
    curatedCautions: ['do not overclaim feed safety without proper processing', 'describe freshness clearly'],
    marketContext: 'Usually more useful when offered quickly and described with handling condition.',
    sourceBasis: ['Refamora curated waste notes', 'Existing marketplace waste suggestion map'],
  },
]

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function getWasteKnowledge(wasteType: string) {
  const normalized = normalizeName(wasteType)

  return (
    KNOWLEDGE.find((item) =>
      item.names.some((name) => normalizeName(name) === normalized),
    ) ?? null
  )
}
