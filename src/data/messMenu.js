// Student Mess & Canteen Food Database
export const MESS_MENU_ITEMS = [
  { id: 'm1', name: 'Dal Tadka (1 bowl / 150g)', category: 'Hostel Mess', calories: 160, protein: 7, carbs: 22, fat: 5, icon: '🥣' },
  { id: 'm2', name: 'Roti / Chapati (1 medium)', category: 'Hostel Mess', calories: 95, protein: 3, carbs: 18, fat: 1, icon: '🫓' },
  { id: 'm3', name: 'Steamed White Rice (1 bowl / 150g)', category: 'Hostel Mess', calories: 195, protein: 4, carbs: 42, fat: 0.5, icon: '🍚' },
  { id: 'm4', name: 'Rajma Curry (1 bowl)', category: 'Hostel Mess', calories: 210, protein: 11, carbs: 32, fat: 4, icon: '🍛' },
  { id: 'm5', name: 'Chhole / Chana Masala (1 bowl)', category: 'Hostel Mess', calories: 230, protein: 10, carbs: 34, fat: 6, icon: '🍛' },
  { id: 'm6', name: 'Paneer Bhurji (1 bowl / 120g)', category: 'Hostel Mess Special', calories: 260, protein: 16, carbs: 6, fat: 19, icon: '🧀' },
  { id: 'm7', name: 'Boiled Eggs (2 whole eggs)', category: 'Student Protein', calories: 155, protein: 13, carbs: 1, fat: 11, icon: '🥚' },
  { id: 'm8', name: 'Egg Bhurji / Scramble (2 eggs)', category: 'Canteen', calories: 210, protein: 13, carbs: 3, fat: 16, icon: '🍳' },
  { id: 'm9', name: 'Hostel Curd / Dahi (1 cup)', category: 'Hostel Mess', calories: 100, protein: 5, carbs: 6, fat: 6, icon: '🥛' },
  { id: 'm10', name: 'Poha with Peanuts (1 plate)', category: 'Breakfast', calories: 240, protein: 6, carbs: 40, fat: 7, icon: '🌾' },
  { id: 'm11', name: 'Vegetable Upma (1 plate)', category: 'Breakfast', calories: 210, protein: 5, carbs: 36, fat: 6, icon: '🥣' },
  { id: 'm12', name: 'Canteen Maggi (1 packet with veg)', category: 'Night Canteen', calories: 360, protein: 6, carbs: 54, fat: 14, icon: '🍜' },
  { id: 'm13', name: 'Hostel Chai / Milk Tea (1 cup)', category: 'Canteen', calories: 85, protein: 2, carbs: 12, fat: 3, icon: '☕' },
  { id: 'm14', name: 'Aloo Paratha (1 paratha with butter)', category: 'Hostel Mess', calories: 310, protein: 6, carbs: 44, fat: 13, icon: '🥞' },
  { id: 'm15', name: 'Soya Chunks Curry (50g dry soya)', category: 'High Protein Hack', calories: 175, protein: 26, carbs: 16, fat: 0.5, icon: '🌱' },
  { id: 'm16', name: 'Sattu Drink (40g chana sattu + water)', category: 'High Protein Hack', calories: 160, protein: 10, carbs: 26, fat: 2, icon: '🥤' },
  { id: 'm17', name: 'Roasted Chana / Bengal Gram (50g)', category: 'Study Snack', calories: 185, protein: 11, carbs: 29, fat: 3, icon: '🥜' },
  { id: 'm18', name: 'Moong Sprouts Salad (1 bowl)', category: 'High Protein Hack', calories: 120, protein: 9, carbs: 20, fat: 1, icon: '🥗' },
];

// High-protein hacks on a ₹50 - ₹100 daily student budget
export const BUDGET_PROTEIN_HACKS = [
  {
    title: 'Soya Chunks Stir-Fry',
    costPerServing: '₹12 - ₹15',
    proteinGrams: 26,
    prepTime: '8 mins (Electric kettle / mess hot water)',
    tip: 'Soak 50g chunks in boiling water with a pinch of salt for 5 mins, squeeze out water, toss with chaat masala or mess sabzi gravy.'
  },
  {
    title: 'Bihar Power: Roasted Chana Sattu',
    costPerServing: '₹15 - ₹20',
    proteinGrams: 16,
    prepTime: '2 mins (No cooking)',
    tip: 'Mix 4 tablespoons of Chana Sattu in cold water, squeeze lemon, pinch of black salt and roasted cumin. Natural vegan isolate!'
  },
  {
    title: 'Canteen Boiled Eggs (3x)',
    costPerServing: '₹21 - ₹25',
    proteinGrams: 19,
    prepTime: '0 mins (Direct from canteen / mess counter)',
    tip: 'Best biological value protein. High in choline which boosts memory and focus during study sessions.'
  },
  {
    title: 'Desi Roasted Bhuna Chana',
    costPerServing: '₹10 - ₹12',
    proteinGrams: 11,
    prepTime: 'Instant snack while coding',
    tip: 'Keep a 500g jar on your study desk. Replaces high-calorie chips and biscuits with complex carbs and fiber.'
  },
  {
    title: 'Dorm Room Green Moong Sprouts',
    costPerServing: '₹8 - ₹10',
    proteinGrams: 14,
    prepTime: 'Zero heat (Soak in bowl overnight)',
    tip: 'Soak whole moong in water for 8 hours, drain in cotton cloth for 24h. Extremely rich in bioavailable enzymes and vitamin C.'
  }
];
