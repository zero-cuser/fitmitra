'use client';

import React, { useState } from 'react';
import { useWorkout } from '@/context/WorkoutContext';
import { useAuth } from '@/context/AuthContext';
import { MESS_MENU_ITEMS, BUDGET_PROTEIN_HACKS } from '@/data/messMenu';
import {
  Utensils,
  Flame,
  Plus,
  Trash2,
  X,
  DollarSign,
  Droplets,
  RotateCcw,
  Sparkles,
  Search,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';

export const NutritionTracker: React.FC = () => {
  const {
    loggedMeals,
    logMeal,
    removeMeal,
    caloriesGainedToday,
    proteinGainedToday,
    waterIntakeToday,
    addWater
  } = useWorkout();
  const { user } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isHacksModalOpen, setIsHacksModalOpen] = useState<boolean>(false);

  const categories = [
    'All',
    'Campus Meals',
    'High Protein Hack',
    'Student Protein',
    'Canteen',
    'Breakfast',
    'Study Snack'
  ];

  const filteredItems = MESS_MENU_ITEMS.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() || item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const dailyProteinTarget = 65; // grams for maintenance
  const proteinPercent = Math.min(Math.round((proteinGainedToday / dailyProteinTarget) * 100), 100);

  const targetCalories = user?.targetDailyCalories || 2200;
  const caloriePercent = Math.min(Math.round((caloriesGainedToday / targetCalories) * 100), 100);

  const targetWater = user?.targetWaterMl || 2500;
  const waterPercent = Math.min(Math.round((waterIntakeToday / targetWater) * 100), 100);

  // Formatted date string for daily navigation header
  const todayDateString = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }).format(new Date());

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Bar */}
      <Card variant="elevated" className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-warning/10 border border-warning/20 text-warning text-xs font-semibold mb-2">
              <Utensils className="w-3.5 h-3.5" />
              <span>Campus Nutrition &amp; Hydration</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
              Daily Nutrition &amp; Macro Tracker
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              Calibrated for campus mess menus, canteen specials, and student-budget protein sources.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-surface-well border border-border-subtle text-xs text-text-muted">
              <Calendar className="w-3.5 h-3.5 text-text-muted" />
              <span>{todayDateString}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsHacksModalOpen(true)}
              leftIcon={<DollarSign className="w-3.5 h-3.5 text-warning" />}
            >
              ₹100/Day Protein Guide
            </Button>
          </div>
        </div>

        {/* Daily Macros & Hydration Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* 1. Calorie Intake Card */}
          <div className="p-4 rounded-2xl bg-surface-well border border-border-subtle flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-text-secondary">Caloric Intake</span>
                <div className="p-1.5 rounded-lg bg-warning/10 text-warning">
                  <Flame className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-2xl font-black text-text-primary">
                {caloriesGainedToday.toLocaleString()}{' '}
                <span className="text-xs font-normal text-text-muted">
                  / {targetCalories.toLocaleString()} kcal
                </span>
              </p>
            </div>

            <div className="space-y-1.5">
              <ProgressBar value={caloriePercent} variant="warning" size="sm" />
              <div className="flex justify-between text-[11px] text-text-muted">
                <span>{caloriePercent}% of daily budget</span>
                <span className="font-semibold text-text-secondary">
                  {Math.max(0, targetCalories - caloriesGainedToday)} kcal left
                </span>
              </div>
            </div>
          </div>

          {/* 2. Protein Intake Card */}
          <div className="p-4 rounded-2xl bg-surface-well border border-border-subtle flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-text-secondary">Protein Target</span>
                <Badge color="success" size="sm">
                  {proteinPercent}%
                </Badge>
              </div>
              <p className="text-2xl font-black text-text-primary">
                {proteinGainedToday}g{' '}
                <span className="text-xs font-normal text-text-muted">
                  / {dailyProteinTarget}g target
                </span>
              </p>
            </div>

            <div className="space-y-1.5">
              <ProgressBar value={proteinPercent} variant="success" size="sm" />
              <div className="flex justify-between text-[11px] text-text-muted">
                <span>Standard Base: ~25g</span>
                <span className="font-semibold text-text-secondary">
                  {proteinGainedToday >= dailyProteinTarget ? (
                    <span className="text-success font-bold">Goal Achieved! ✨</span>
                  ) : (
                    `+${dailyProteinTarget - proteinGainedToday}g needed`
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Water Hydration Sentinel Card */}
          <div className="p-4 rounded-2xl bg-surface-well border border-border-subtle flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-accent flex items-center space-x-1.5">
                  <Droplets className="w-3.5 h-3.5" />
                  <span>Hydration Sentinel</span>
                </span>
                <Badge color="accent" size="sm">
                  {waterPercent}%
                </Badge>
              </div>
              <p className="text-2xl font-black text-text-primary">
                {(waterIntakeToday / 1000).toFixed(2)}L{' '}
                <span className="text-xs font-normal text-text-muted">
                  / {(targetWater / 1000).toFixed(1)}L
                </span>
              </p>
            </div>

            <div className="space-y-2">
              <ProgressBar value={waterPercent} variant="accent" size="sm" />

              {/* Quick Water Logging Buttons */}
              <div className="flex items-center space-x-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => addWater(250)}
                  className="flex-1 py-1 px-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 border border-accent/30 text-[10px] font-bold text-accent transition-colors text-center"
                >
                  +250ml
                </button>
                <button
                  type="button"
                  onClick={() => addWater(500)}
                  className="flex-1 py-1 px-1.5 rounded-lg bg-accent/15 hover:bg-accent/25 border border-accent/40 text-[10px] font-bold text-accent transition-colors text-center"
                >
                  +500ml
                </button>
                <button
                  type="button"
                  onClick={() => addWater(-250)}
                  disabled={waterIntakeToday <= 0}
                  className="py-1 px-2 rounded-lg bg-surface hover:bg-surface-elevated text-[10px] font-bold text-text-muted disabled:opacity-40 transition-colors"
                  title="Undo 250ml"
                  aria-label="Undo 250ml water"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

        </div>
      </Card>

      {/* Daily Navigation, Search & Category Filter Pills */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Category Filter Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                  selectedCategory === cat
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'bg-surface text-text-muted hover:text-text-primary hover:bg-surface-hover border border-border-subtle'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Quick Search Input */}
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search food item..."
              className="w-full pl-9 pr-3 py-1.5 bg-surface border border-border-subtle rounded-xl text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Two Column Grid: Left (Food Menu) + Right (Logged Today) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Food Catalog */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              variant="default"
              className="p-3.5 flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-surface-well border border-border-subtle flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-text-primary group-hover:text-primary-bright transition-colors line-clamp-1">
                    {item.name}
                  </h4>
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] mt-1">
                    <span className="font-bold text-warning font-mono">{item.calories} kcal</span>
                    <span className="text-text-muted">•</span>
                    <span className="font-bold text-success font-mono">{item.protein}g protein</span>
                    <span className="text-text-muted">•</span>
                    <span className="text-text-muted">{item.category}</span>
                  </div>
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => logMeal(item)}
                className="shrink-0 p-2 hover:bg-success hover:text-slate-950 hover:border-success"
                title={`Log ${item.name}`}
                aria-label={`Log ${item.name}`}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </Card>
          ))}

          {filteredItems.length === 0 && (
            <div className="col-span-full p-8 text-center bg-surface border border-border-subtle rounded-2xl space-y-2">
              <Utensils className="w-8 h-8 mx-auto text-text-muted opacity-40" />
              <p className="text-xs text-text-secondary">No food items found matching your filter.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedCategory('All');
                  setSearchQuery('');
                }}
              >
                Reset Filters
              </Button>
            </div>
          )}
        </div>

        {/* Right: Today's Logged Items */}
        <div className="lg:col-span-4">
          <Card variant="elevated" className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-bold text-text-primary">Today&apos;s Food Log</h4>
                <Badge color="muted" size="sm">
                  {loggedMeals.length} items
                </Badge>
              </div>
              <span className="text-xs font-mono font-black text-warning">
                {caloriesGainedToday.toLocaleString()} kcal
              </span>
            </div>

            {loggedMeals.length === 0 ? (
              <div className="py-8 text-center text-text-muted space-y-1.5">
                <Utensils className="w-8 h-8 mx-auto opacity-30 text-text-muted" />
                <p className="text-xs font-medium text-text-secondary">No meals recorded yet today.</p>
                <p className="text-[11px] text-text-muted">
                  Tap <span className="text-primary-bright font-bold">+</span> on any mess meal to record intake.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {loggedMeals.map((meal) => (
                  <div
                    key={meal.id}
                    className="p-3 rounded-xl bg-surface-well border border-border-subtle flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span className="text-base shrink-0">{meal.icon}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-text-primary line-clamp-1">{meal.name}</p>
                        <div className="flex items-center space-x-1.5 text-[10px] text-text-muted">
                          <span>{meal.timestamp}</span>
                          <span>•</span>
                          <span className="text-warning font-semibold">{meal.calories} kcal</span>
                          <span>•</span>
                          <span className="text-success font-semibold">{meal.protein}g</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeMeal(meal.id)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors shrink-0"
                      title="Remove item"
                      aria-label="Remove meal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

      </div>

      {/* ₹100 Daily Protein Survival Guide Modal */}
      {isHacksModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-2xl text-text-primary overflow-hidden max-h-[90vh] overflow-y-auto space-y-6">
            
            <button
              onClick={() => setIsHacksModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors"
              aria-label="Close guide"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-warning/10 border border-warning/20 text-warning text-xs font-semibold mb-2">
                <DollarSign className="w-3.5 h-3.5" />
                <span>Student Nutrition Guide</span>
              </div>
              <h3 className="text-2xl font-black tracking-tight text-text-primary">
                ₹100/Day Student Protein Survival Guide
              </h3>
              <p className="text-xs sm:text-sm text-text-secondary mt-1">
                Practical everyday approaches for campus hostel students to reach 65g+ daily protein on a student budget.
              </p>
            </div>

            <div className="space-y-3">
              {BUDGET_PROTEIN_HACKS.map((hack, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-surface-well border border-border-subtle space-y-2 hover:border-border-strong transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5">
                      <span className="w-6 h-6 rounded-lg bg-primary/20 text-primary-bright font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <h4 className="text-sm font-bold text-text-primary">{hack.title}</h4>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Badge color="warning" size="sm">
                        {hack.costPerServing}
                      </Badge>
                      <Badge color="success" size="sm">
                        +{hack.proteinGrams}g Protein
                      </Badge>
                    </div>
                  </div>

                  <p className="text-xs text-text-secondary pl-8">{hack.tip}</p>
                  
                  <div className="flex items-center justify-between pl-8 text-[11px] text-text-muted pt-1">
                    <span>Prep: {hack.prepTime}</span>
                    <span className="text-accent font-medium">{hack.badge}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-border-subtle flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsHacksModalOpen(false)}
              >
                Close Guide
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
