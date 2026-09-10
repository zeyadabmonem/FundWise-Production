import { storage } from "../db/storage.js";
import type { Category, Transaction } from "../types/index.js";

export interface DashboardInsightChip {
  id: number;
  text: string;
  type: "trend" | "savings" | "positive";
}

export interface DashboardSummary {
  currentMonthSpend: number;
  previousMonthSpend: number;
  monthOverMonthChangePct: number; // dynamically computed
  transactionCount: number;
  topCategory: { name: Category; amount: number; percentage: number } | null;
  categoryBreakdown: Record<string, number>;
  recentTransactions: Transaction[];
  insights: DashboardInsightChip[];
}

export class DashboardService {
  async getSummary(userId: number): Promise<DashboardSummary> {
    const transactions = await storage.getTransactions(userId);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Current month transactions
    const currentMonthTxs = transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });

    // Previous month transactions
    const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const prevYear = prevMonthDate.getFullYear();
    const prevMonth = prevMonthDate.getMonth();

    const prevMonthTxs = transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === prevYear && d.getMonth() === prevMonth;
    });

    const currentMonthSpend = currentMonthTxs.reduce((sum, t) => sum + Number(t.amount), 0);
    const previousMonthSpend = prevMonthTxs.reduce((sum, t) => sum + Number(t.amount), 0);

    // Compute month-over-month change percentage
    let monthOverMonthChangePct = 0;
    if (previousMonthSpend > 0) {
      monthOverMonthChangePct = Math.round(((currentMonthSpend - previousMonthSpend) / previousMonthSpend) * 100);
    } else if (currentMonthSpend > 0) {
      monthOverMonthChangePct = 100;
    }

    // Category Breakdown
    const categoryBreakdown: Record<string, number> = {};
    for (const t of currentMonthTxs) {
      categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + Number(t.amount);
    }

    // Top Category
    let topCategory: { name: Category; amount: number; percentage: number } | null = null;
    const sortedCategories = Object.entries(categoryBreakdown).sort(([, a], [, b]) => b - a);
    if (sortedCategories.length > 0) {
      const [name, amount] = sortedCategories[0];
      const percentage = currentMonthSpend > 0 ? Math.round((amount / currentMonthSpend) * 100) : 0;
      topCategory = { name: name as Category, amount, percentage };
    }

    // Dynamic AI Insight Chips
    const insights: DashboardInsightChip[] = [];
    let chipId = 1;

    // 1. Top category alert
    if (topCategory && topCategory.percentage > 30) {
      insights.push({
        id: chipId++,
        text: `${topCategory.name} accounts for ${topCategory.percentage}% of your monthly spend`,
        type: "trend",
      });
    }

    // 2. Month over month trend
    if (monthOverMonthChangePct > 10) {
      insights.push({
        id: chipId++,
        text: `Spending is up +${monthOverMonthChangePct}% vs last month`,
        type: "trend",
      });
    } else if (monthOverMonthChangePct < -5) {
      insights.push({
        id: chipId++,
        text: `Great job! Spending is down ${Math.abs(monthOverMonthChangePct)}% vs last month`,
        type: "positive",
      });
    }

    // 3. Alternative / Savings opportunity
    const transportSpend = categoryBreakdown["Transport"] || 0;
    if (transportSpend > 300) {
      insights.push({
        id: chipId++,
        text: "Save up to EGP 240 by switching some Uber rides to Cairo Metro",
        type: "savings",
      });
    } else {
      const foodSpend = categoryBreakdown["Food & Drink"] || 0;
      if (foodSpend > 500) {
        insights.push({
          id: chipId++,
          text: "Cook at home 2 days this week to save ~EGP 350",
          type: "savings",
        });
      }
    }

    // Fallback if few transactions exist
    if (insights.length === 0) {
      insights.push(
        { id: chipId++, text: "Add more expenses to reveal personalized AI insights", type: "positive" },
        { id: chipId++, text: "Bills paid on schedule", type: "positive" }
      );
    }

    return {
      currentMonthSpend,
      previousMonthSpend,
      monthOverMonthChangePct,
      transactionCount: currentMonthTxs.length,
      topCategory,
      categoryBreakdown,
      recentTransactions: transactions.slice(0, 10),
      insights,
    };
  }
}

export const dashboardService = new DashboardService();
