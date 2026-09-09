import React, { useState } from 'react';
import { useFitness } from '../../context/FitnessContext';
import { HOSTEL_WINGS, DAILY_QUESTS, STUDENT_BADGES } from '../../data/campusLeaderboard';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Flame,
  CheckCircle2,
  Lock,
  Gift,
  Coins,
  Shield,
  Zap,
  Users,
  Award
} from 'lucide-react';

export const LeaderboardAndQuests = () => {
  const { user, todayStats, completedQuests, claimQuest } = useFitness();
  const [activeTab, setActiveTab] = useState('quests'); // 'quests' | 'leaderboard' | 'shop'
  const [redeemSuccess, setRedeemSuccess] = useState(null);

  // Shop items
  const shopItems = [
    { id: 's1', title: 'Free Hostel Laundry Token', cost: 120, desc: '1 cycle token for dorm washing machines', icon: '🧺' },
    { id: 's2', title: 'Night Canteen Mango Shake Voucher', cost: 80, desc: '₹40 discount coupon at campus cafeteria', icon: '🥤' },
    { id: 's3', title: 'Exam Streak Freeze Shield', cost: 50, desc: 'Protects your streak if you miss a day during exams', icon: '🛡️' },
    { id: 's4', title: 'Campus Gym Guest Pass (1-Day)', cost: 150, desc: 'Full access day pass for university fitness center', icon: '🏋️' }
  ];

  const handleRedeem = (item) => {
    if (user.fitCoins < item.cost) {
      alert(`You need ${item.cost - user.fitCoins} more FitCoins! Complete daily dorm reps or micro-breaks to earn more.`);
      return;
    }
    // Spend coins (we can trigger an alert or reward)
    confetti({ particleCount: 60, spread: 70 });
    setRedeemSuccess(`Redeemed "${item.title}"! Voucher code: CAMPUS-${Math.floor(1000 + Math.random() * 9000)}`);
    setTimeout(() => setRedeemSuccess(null), 6000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/20 rounded-2xl p-6">
        <div>
          <div className="flex items-center space-x-2 text-purple-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <Trophy className="w-4 h-4" />
            <span>Campus Gamification Ecosystem</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Campus Squads & FitCoin Arena</h2>
          <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-xl">
            Compete with rival hostel wings, level up your student avatar, and redeem your FitCoins for real campus rewards like laundry tokens and canteen smoothies.
          </p>
        </div>

        {/* FitCoins & Streak stats pill */}
        <div className="flex items-center space-x-3 bg-slate-900/80 border border-slate-700/80 px-4 py-2.5 rounded-2xl">
          <div className="flex items-center space-x-1.5 text-purple-400 font-black text-lg">
            <Coins className="w-5 h-5" />
            <span>{user.fitCoins}</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center space-x-1.5 text-orange-400 font-bold text-sm">
            <Flame className="w-4 h-4 fill-orange-400" />
            <span>{user.currentStreak} Day Streak</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-3 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('quests')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'quests'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Daily Quests</span>
        </button>

        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'leaderboard'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Hostel Wing Rivalry</span>
        </button>

        <button
          onClick={() => setActiveTab('shop')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'shop'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Gift className="w-3.5 h-3.5" />
          <span>FitCoin Perks Shop</span>
        </button>
      </div>

      {/* Voucher notification */}
      {redeemSuccess && (
        <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-xl p-3 text-emerald-300 font-bold text-xs flex items-center justify-between animate-fade-in">
          <span>🎉 {redeemSuccess}</span>
          <span className="text-[10px] uppercase bg-emerald-500 text-slate-950 px-2 py-0.5 rounded font-black">Active</span>
        </div>
      )}

      {/* TAB 1: Daily Quests */}
      {activeTab === 'quests' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Quests List (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Today's Micro-Challenges</h3>
            {DAILY_QUESTS.map((quest) => {
              const isClaimed = completedQuests.includes(quest.id);
              // Simulated current progress
              let currentVal = 0;
              if (quest.type === 'reps') currentVal = todayStats.repsCompleted;
              else if (quest.type === 'posture') currentVal = todayStats.postureBreaksTaken;
              else if (quest.type === 'water') currentVal = todayStats.waterMl;
              else if (quest.type === 'mindful') currentVal = Math.floor(todayStats.mindfulMinutes / 3);
              else currentVal = 1;

              const isCompleted = currentVal >= quest.target;
              const percent = Math.min(Math.round((currentVal / quest.target) * 100), 100);

              return (
                <div
                  key={quest.id}
                  className="glass-card rounded-2xl p-4 border border-slate-800 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center space-x-3.5">
                    <span className="text-3xl p-2.5 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
                      {quest.icon}
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-white">{quest.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{quest.description}</p>
                      {/* Progress bar */}
                      <div className="w-36 md:w-48 h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                        {currentVal} / {quest.target} completed
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="text-xs font-bold text-purple-400 mb-1.5">
                      +{quest.rewardCoins} Coins
                    </div>
                    {isClaimed ? (
                      <span className="px-3 py-1 rounded-lg bg-slate-800 text-emerald-400 text-xs font-bold inline-flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Claimed</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => claimQuest(quest.id, quest.rewardCoins, quest.rewardXp)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isCompleted
                            ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 animate-pulse'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        {isCompleted ? 'Claim Reward' : 'Claim'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Badges Showcase (5 cols) */}
          <div className="lg:col-span-5 glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Campus Badges</h3>
              <span className="text-xs text-slate-400 font-mono">3 / 6 Unlocked</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {STUDENT_BADGES.map((badge) => (
                <div
                  key={badge.id}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    badge.unlocked
                      ? 'bg-slate-900/80 border-purple-500/30'
                      : 'bg-slate-950/40 border-slate-900 opacity-50'
                  }`}
                >
                  <div className="text-3xl mb-1">{badge.icon}</div>
                  <h5 className="font-bold text-xs text-white line-clamp-1">{badge.title}</h5>
                  <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{badge.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Campus Hostel Leaderboard */}
      {activeTab === 'leaderboard' && (
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4 max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h3 className="text-base font-bold text-white">Campus Wing Standings</h3>
              <p className="text-xs text-slate-400">Total fitness points accumulated this week across hostels</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400 font-bold border border-orange-500/20">
              Season 4
            </span>
          </div>

          <div className="space-y-2">
            {HOSTEL_WINGS.map((wing) => {
              const isUserWing = wing.name.includes('Aryabhatta');
              return (
                <div
                  key={wing.id}
                  className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                    isUserWing
                      ? 'bg-purple-950/40 border-purple-500 shadow-md shadow-purple-900/20'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <span className="font-black font-mono text-base w-6 text-center text-slate-400">
                      #{wing.rank}
                    </span>
                    <span className="text-2xl">{wing.avatar}</span>
                    <div>
                      <h4 className="font-bold text-sm text-white flex items-center space-x-2">
                        <span>{wing.name}</span>
                        {isUserWing && (
                          <span className="text-[10px] bg-purple-500 text-white font-black px-1.5 py-0.5 rounded">
                            YOUR WING
                          </span>
                        )}
                      </h4>
                      <span className="text-xs text-slate-400">{wing.members} Active Students</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-black font-mono text-purple-300">
                      {wing.score.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase block">Wing Points</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: FitCoin Perks Shop */}
      {activeTab === 'shop' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Campus Student Perks</h3>
            <span className="text-xs text-slate-400">Redeem coins earned from dorm fitness</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {shopItems.map((item) => {
              const canAfford = user.fitCoins >= item.cost;
              return (
                <div
                  key={item.id}
                  className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all"
                >
                  <div>
                    <div className="text-4xl mb-3">{item.icon}</div>
                    <h4 className="font-bold text-sm text-white">{item.title}</h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
                  </div>

                  <div className="mt-6 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <div className="flex items-center space-x-1 font-bold text-sm text-purple-400">
                      <Coins className="w-4 h-4" />
                      <span>{item.cost}</span>
                    </div>

                    <button
                      onClick={() => handleRedeem(item)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        canAfford
                          ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      Redeem
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
