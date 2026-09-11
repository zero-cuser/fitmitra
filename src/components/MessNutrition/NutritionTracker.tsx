'use client';

import React, { useState } from 'react';
import { useWorkout } from '@/context/WorkoutContext';
import { MESS_MENU_ITEMS, BUDGET_PROTEIN_HACKS, ProteinHack } from '@/data/messMenu';
import { MessMenuItem } from '@/types/fitness';
import { Utensils, Flame, Sparkles, Plus, Trash2, Info, X, Zap, DollarSign } from 'lucide-react';

export const NutritionTracker: React.FC = () => {
  const { loggedMeals, logMeal, removeMeal, caloriesGainedToday, proteinGainedToday } = useWorkout();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isHacksModalOpen, setIsHacksModalOpen] = useState<boolean>(false);

  const categories = ['All', 'Hostel Mess', 'High Protein Hack', 'Student Protein', 'Canteen', 'Breakfast'];

  const filteredItems =
    selectedCategory === 'All'
      ? MESS_MENU_ITEMS
      : MESS_MENU_ITEMS.filter((item) => item.category === selectedCategory);

  const dailyProteinTarget = 65; // grams for student maintenance
  const proteinPercent = Math.min(Math.round((proteinGainedToday / dailyProteinTarget) * 100), 100);

  return (
    <div className="space-y-6">
      
      {/* Top Banner & KPI Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-2">
              <Utensils className="w-3.5 h-3.5" />
              <span>Desi Hostel Nutrition Engine</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Hostel Mess Smart-Logger & Protein Tracker
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Preloaded with Indian mess thalis and canteen food. No salmon or avocado—just realistic campus macros.
            </p>
          </div>

          <button
            onClick={() => setIsHacksModalOpen(true)}
            className="self-start sm:self-auto py-2.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center space-x-1.5 active:scale-95"
          >
            <DollarSign className="w-4 h-4" />
            <span>₹100/Day Protein Hacks</span>
          </button>
        </div>

        {/* Daily Macros Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400 font-semibold">Calories Gained Today</span>
              <Flame className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-white">
              {caloriesGainedToday} <span className="text-xs font-normal text-slate-500">kcal</span>
            </p>
            <span className="text-[10px] text-slate-500">Synced with 7-Day Calorie Balance Chart</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 sm:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400 font-semibold">
                Daily Protein Intake ({proteinGainedToday}g / {dailyProteinTarget}g Target)
              </span>
              <span className="text-xs font-black text-emerald-400">{proteinPercent}%</span>
            </div>
            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 mt-2">
              <div
                style={{ width: `${proteinPercent}%` }}
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500 shadow-sm shadow-emerald-500/50"
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2">
              <span>Hostel Mess Thali Baseline: ~25g</span>
              <span>Needs +{Math.max(dailyProteinTarget - proteinGainedToday, 0)}g via Sattu/Eggs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Pills Switcher */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Two Column Grid: Left (Food Menu) + Right (Logged Today) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Food Catalog */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                    {item.name}
                  </h4>
                  <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-1">
                    <span className="text-amber-400 font-semibold">{item.calories} kcal</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-semibold">{item.protein}g protein</span>
                    <span>•</span>
                    <span className="text-slate-500">{item.category}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => logMeal(item)}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-emerald-500 text-slate-300 hover:text-slate-950 transition-all active:scale-95 shadow-sm"
                title="Log this item"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Right: Today's Logged Items */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-sm font-bold text-white flex items-center space-x-2">
              <span>Today&apos;s Food Log</span>
              <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                {loggedMeals.length} items
              </span>
            </h4>
            <span className="text-xs font-black text-amber-400">{caloriesGainedToday} kcal</span>
          </div>

          {loggedMeals.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              <Utensils className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No meals logged yet today.</p>
              <p className="text-[10px] mt-1">Tap + on any mess item to record your intake.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {loggedMeals.map((meal) => (
                <div
                  key={meal.id}
                  className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="text-lg">{meal.icon}</span>
                    <div>
                      <p className="text-xs font-bold text-white line-clamp-1">{meal.name}</p>
                      <span className="text-[10px] text-slate-400">
                        {meal.timestamp} • <strong className="text-amber-400">{meal.calories} kcal</strong> • <strong className="text-emerald-400">{meal.protein}g protein</strong>
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => removeMeal(meal.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ₹100 Daily Protein Survival Guide Modal */}
      {isHacksModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-white overflow-hidden max-h-[90vh] overflow-y-auto">
            
            <button
              onClick={() => setIsHacksModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-2">
                <DollarSign className="w-3.5 h-3.5" />
                <span>Budget Biohacking</span>
              </div>
              <h3 className="text-2xl font-black tracking-tight">₹100/Day Student Protein Survival Guide</h3>
              <p className="text-xs text-slate-400 mt-1">
                How Indian hostel students can hit 65g+ daily protein without expensive whey isolate or non-veg mess bills.
              </p>
            </div>

            <div className="space-y-4">
              {BUDGET_PROTEIN_HACKS.map((hack, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2 hover:border-slate-700 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <h4 className="text-sm font-bold text-white">{hack.title}</h4>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                        {hack.costPerServing}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                        +{hack.proteinGrams}g Protein
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 pl-8">{hack.tip}</p>
                  
                  <div className="flex items-center justify-between pl-8 text-[10px] text-slate-500 pt-1">
                    <span>Prep: {hack.prepTime}</span>
                    <span className="text-cyan-400 font-medium">{hack.badge}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setIsHacksModalOpen(false)}
                className="py-2.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-colors"
              >
                Close Guide
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
