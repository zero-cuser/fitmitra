// Campus Squads, Hostel Wing Rivalry, and Daily Quests
export const HOSTEL_WINGS = [
  { id: 'w1', name: 'Aryabhatta Hostel (Wing A)', score: 14250, members: 48, rank: 1, avatar: '🏆' },
  { id: 'w2', name: 'Ramanujan Hostel (Wing B)', score: 13890, members: 52, rank: 2, avatar: '⚡' },
  { id: 'w3', name: 'Visvesvaraya Hostel (Main)', score: 12410, members: 44, rank: 3, avatar: '🔥' },
  { id: 'w4', name: 'Kalpana Chawla Hostel (Wing C)', score: 11980, members: 39, rank: 4, avatar: '🚀' },
  { id: 'w5', name: 'Off-Campus / PG Legends', score: 10850, members: 63, rank: 5, avatar: '🛡️' }
];

export const DAILY_QUESTS = [
  {
    id: 'q1',
    title: 'Morning Dorm Ignition',
    description: 'Complete 15 squats using AI Coach',
    rewardCoins: 25,
    rewardXp: 50,
    target: 15,
    type: 'reps',
    icon: '🏋️'
  },
  {
    id: 'q2',
    title: 'Posture Discipline',
    description: 'Take 2 desk posture micro-breaks during study',
    rewardCoins: 20,
    rewardXp: 40,
    target: 2,
    type: 'posture',
    icon: '🪑'
  },
  {
    id: 'q3',
    title: 'Hostel Mess Protein Scout',
    description: 'Log at least 40g of protein from mess or canteen',
    rewardCoins: 30,
    rewardXp: 60,
    target: 40,
    type: 'protein',
    icon: '🥩'
  },
  {
    id: 'q4',
    title: 'Hydration Shield',
    description: 'Log 2,000 ml of water today',
    rewardCoins: 15,
    rewardXp: 30,
    target: 2000,
    type: 'water',
    icon: '💧'
  },
  {
    id: 'q5',
    title: 'Zen Under Pressure',
    description: 'Complete 3 rounds of 4-7-8 Box Breathing',
    rewardCoins: 20,
    rewardXp: 40,
    target: 3,
    type: 'mindful',
    icon: '🧘'
  }
];

export const STUDENT_BADGES = [
  { id: 'b_streak3', title: '3-Day Dorm Warrior', icon: '🔥', desc: 'Maintained 3 consecutive active days', unlocked: true },
  { id: 'b_rep50', title: '50 Rep Sentinel', icon: '🎯', desc: 'Completed 50 verified AI exercise reps', unlocked: true },
  { id: 'b_posture', title: 'Ergonomic Scholar', icon: '📐', desc: 'Fixed posture 10 times during study marathons', unlocked: true },
  { id: 'b_protein', title: 'Budget Protein Master', icon: '🥚', desc: 'Discovered high-protein hostel hacks', unlocked: false },
  { id: 'b_exam_zen', title: 'Exam Ice In Veins', icon: '🧊', desc: 'Completed 10 mindful breathing resets', unlocked: false },
  { id: 'b_wing_mvp', title: 'Hostel Wing MVP', icon: '👑', desc: 'Scored top 5% points in campus leaderboard', unlocked: false }
];
