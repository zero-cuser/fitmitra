import React, { useState } from 'react';
import { useFitness } from '../../context/FitnessContext';
import { MESS_MENU_ITEMS, BUDGET_PROTEIN_HACKS } from '../../data/messMenu';
import {
  Utensils,
  Plus,
  Trash2,
  Sparkles,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  Apple
} from 'lucide-react';

export const NutritionTracker = () => {
  const { loggedMeals, logMeal, deleteMeal } = useFitness();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Daily totals
  const totalCalories = loggedMeals.reduce((acc, m) => acc + (m.calories || 0), 0);
  const totalProtein = loggedMeals.reduce((acc, m) => acc + (m.protein || 0), 0);
  const totalCarbs = loggedMeals.reduce((acc, m) => acc + (m.carbs || 0), 0);
  const totalFat = loggedMeals.reduce((acc, m) => acc + (m.fat || 0), 0);

  const targets = {
    calories: 2200,
    protein: 75,
    carbs: 260,
    fat: 65
  };

  const categories = ['All', 'Hostel Mess', 'Canteen', 'High Protein Hack', 'Breakfast'];

  const filteredItems = MESS_MENU_ITEMS.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category.includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/20 rounded-2xl p-6">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <Utensils className="w-4 h-4" />
            <span>Campus Mess Intelligence</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Hostel Mess & Protein Tracker</h2>
          <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-xl">
            Designed specifically for college mess food. Track daily macros, compensate for carb-heavy mess meals, and hit your protein goals on a ₹100/day allowance.
          </p>
        </div>

        {/* Protein Target Pill */}
        <div className="flex items-center space-x-3 bg-slate-900/80 border border-slate-700/80 px-4 py-2.5 rounded-2xl">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 font-bold text-lg">
            🥩
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Protein Today</div>
            <div className="text-lg font-black text-white">
              {totalProtein}g <span className="text-xs font-normal text-slate-400">/ {targets.protein}g</span>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Nutrition Rings / Progress Bar Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Calories */}
        <div className="glass-card rounded-2xl p-4 border border-slate-800">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
            <span>Energy</span>
            <span className="text-orange-400 font-semibold">{totalCalories} / {targets.calories} kcal</span>
          </div>
          <div className="text-2xl font-black text-white">{totalCalories} <span className="text-xs text-slate-400 font-normal">kcal</span></div>
          <div className="w-full h-2 bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-orange-500 rounded-full transition-all"
              style={{ width: `${Math.min((totalCalories / targets.calories) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Protein */}
        <div className="glass-card rounded-2xl p-4 border border-slate-800">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
            <span>Protein</span>
            <span className="text-emerald-400 font-semibold">{totalProtein} / {targets.protein}g</span>
          </div>
          <div className="text-2xl font-black text-white">{totalProtein} <span className="text-xs text-slate-400 font-normal">grams</span></div>
          <div className="w-full h-2 bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${Math.min((totalProtein / targets.protein) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Carbs */}
        <div className="glass-card rounded-2xl p-4 border border-slate-800">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
            <span>Carbs</span>
            <span className="text-cyan-400 font-semibold">{totalCarbs} / {targets.carbs}g</span>
          </div>
          <div className="text-2xl font-black text-white">{totalCarbs} <span className="text-xs text-slate-400 font-normal">grams</span></div>
          <div className="w-full h-2 bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-cyan-400 rounded-full transition-all"
              style={{ width: `${Math.min((totalCarbs / targets.carbs) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Fats */}
        <div className="glass-card rounded-2xl p-4 border border-slate-800">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
            <span>Fats</span>
            <span className="text-purple-400 font-semibold">{totalFat} / {targets.fat}g</span>
          </div>
          <div className="text-2xl font-black text-white">{totalFat} <span className="text-xs text-slate-400 font-normal">grams</span></div>
          <div className="w-full h-2 bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-purple-400 rounded-full transition-all"
              style={{ width: `${Math.min((totalFat / targets.fat) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content: Food Logger & Logged List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Food Search & Quick Log (7 cols) */}
        <div className="lg:col-span-7 glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-white">Campus Food Library</h3>
            <span className="text-xs text-slate-400">1-Tap to Log</span>
          </div>

          {/* Search bar & filter pills */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search dal, roti, eggs, maggi, sattu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                    selectedCategory === cat
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Foods List */}
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition-all"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <h4 className="font-bold text-xs text-slate-200">{item.name}</h4>
                    <div className="flex space-x-2 text-[11px] text-slate-400 mt-0.5">
                      <span className="text-orange-300">{item.calories} kcal</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-semibold">{item.protein}g protein</span>
                      <span>•</span>
                      <span>{item.carbs}g carb</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => logMeal(item)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/30 text-xs font-bold transition-all flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Today's Logged Meals (5 cols) */}
        <div className="lg:col-span-5 glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-white">Today's Meals ({loggedMeals.length})</h3>
            <span className="text-xs text-purple-400 font-semibold">+15 XP per meal</span>
          </div>

          {loggedMeals.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              No meals logged today yet. Click "+ Log" on items from the campus food library.
            </div>
          ) : (
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {loggedMeals.map((meal) => (
                <div
                  key={meal.id}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-xs text-slate-200">{meal.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 flex space-x-2">
                      <span>{meal.timestamp}</span>
                      <span>•</span>
                      <span className="text-emerald-400">{meal.protein}g Protein</span>
                      <span>•</span>
                      <span className="text-orange-400">{meal.calories} kcal</span>
                    </div>
                  </div>

                  <button
                    onClick={() => deleteMeal(meal.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                    title="Remove meal"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ₹100 Student Budget Protein Hacks Section */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2 text-slate-300 font-bold text-sm uppercase tracking-wider">
          <DollarSign className="w-4 h-4 text-emerald-400" />
          <span>Hostel Survival Guide: 60g+ Protein Under ₹100/Day</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {BUDGET_PROTEIN_HACKS.map((hack, idx) => (
            <div key={idx} className="glass-card rounded-xl p-5 border border-slate-800 space-y-3">
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-sm text-white">{hack.title}</h4>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {hack.costPerServing}
                </span>
              </div>

              <div className="flex items-center space-x-3 text-xs">
                <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-400 font-bold">
                  {hack.proteinGrams}g Protein
                </span>
                <span className="text-slate-400">{hack.prepTime}</span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed pt-2 border-t border-slate-800/80">
                💡 <span className="text-slate-300 font-medium">{hack.tip}</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
