export const WASTE_TYPES = [
  { value: 'coconut_husk', label: 'Coconut Husk' },
  { value: 'rice_straw', label: 'Rice Straw' },
  { value: 'corn_stalks', label: 'Corn Stalks' },
  { value: 'banana_trunk', label: 'Banana Trunk' },
  { value: 'sugarcane_bagasse', label: 'Sugarcane Bagasse' },
  { value: 'pineapple_leaves', label: 'Pineapple Leaves' },
  { value: 'cassava_peel', label: 'Cassava Peel' },
  { value: 'other', label: 'Other' },
] as const

export type WasteTypeValue = (typeof WASTE_TYPES)[number]['value']

const suggestionMap: Record<WasteTypeValue, string[]> = {
  coconut_husk: [
    'Coco coir fiber',
    'Erosion control matting',
    'Compost input',
    'Handicraft material',
  ],
  rice_straw: [
    'Mushroom growing substrate',
    'Animal feed for the dry season',
    'Mulch for vegetable beds',
  ],
  corn_stalks: ['Biomass fuel', 'Silage for livestock'],
  banana_trunk: ['Fiber extraction', 'Paper pulp'],
  sugarcane_bagasse: ['Bioethanol production', 'Particleboard filler'],
  pineapple_leaves: ['Pina textile fiber', 'Compost accelerator'],
  cassava_peel: ['Animal feed blend', 'Compost additive'],
  other: ['Assess for compost, feed, fiber, or biomass reuse'],
}

export function getWasteSuggestions(wasteType?: string | null) {
  if (!wasteType || !(wasteType in suggestionMap)) {
    return []
  }

  return suggestionMap[wasteType as WasteTypeValue]
}
