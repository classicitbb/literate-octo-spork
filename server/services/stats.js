'use strict';
const db = require('../db');

function todayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 86400000);
  return { start: Math.floor(start.getTime() / 1000), end: Math.floor(end.getTime() / 1000) };
}

function dateRange(dateStr) {
  if (!dateStr) return todayRange();
  const [y, m, d] = dateStr.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(start.getTime() + 86400000);
  return { start: Math.floor(start.getTime() / 1000), end: Math.floor(end.getTime() / 1000) };
}

async function getOverview(tenantId, dateStr) {
  const { start, end } = dateRange(dateStr);

  const allDay = await db.prepare(`
    SELECT * FROM sessions
    WHERE tenant_id = ? AND timestamp >= ? AND timestamp < ?
  `).all(tenantId, start, end);

  const active = allDay.filter(s => !s.deleted_at);
  const assessed = allDay.filter(s => s.csr_outcome);
  const sold = assessed.filter(s => s.csr_outcome === 'purchased');

  const revenue = sold.reduce((sum, s) => sum + (s.csr_purchase_amount || 0), 0);
  const convRate = assessed.length ? Math.round((sold.length / assessed.length) * 100) : 0;
  const avgReadiness = active.length
    ? Math.round(active.reduce((s, r) => s + (r.purchase_readiness || 0), 0) / active.length)
    : 0;

  return {
    patientsToday: active.length,
    conversionRate: convRate,
    revenueToday: revenue,
    avgReadiness,
    soldCount: sold.length,
    assessedCount: assessed.length,
  };
}

async function getCsrPerformance(tenantId, dateStr) {
  const { start, end } = dateRange(dateStr);
  const rows = await db.prepare(`
    SELECT csr_name, csr_outcome, csr_purchase_amount, csr_skills
    FROM sessions
    WHERE tenant_id = ? AND timestamp >= ? AND timestamp < ?
      AND csr_outcome IS NOT NULL AND csr_name != ''
  `).all(tenantId, start, end);

  const map = {};
  for (const r of rows) {
    if (!map[r.csr_name]) map[r.csr_name] = { interactions: 0, sold: 0, revenue: 0, skills: [] };
    const c = map[r.csr_name];
    c.interactions++;
    if (r.csr_outcome === 'purchased') { c.sold++; c.revenue += r.csr_purchase_amount || 0; }
    if (r.csr_skills) {
      try { c.skills.push(JSON.parse(r.csr_skills)); } catch {}
    }
  }

  return Object.entries(map).map(([name, c]) => {
    const convRate = Math.round((c.sold / c.interactions) * 100);
    const avgSkills = {};
    const skillKeys = ['rapport','discovery','presentation','lensUpsell','close'];
    if (c.skills.length) {
      for (const k of skillKeys) {
        const vals = c.skills.map(s => s[k] || 0).filter(Boolean);
        avgSkills[k] = vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : 0;
      }
    }
    return { name, interactions: c.interactions, sold: c.sold, revenue: c.revenue, convRate, avgSkills };
  }).sort((a, b) => b.revenue - a.revenue);
}

async function getFocusAreas(tenantId, dateStr) {
  const { start, end } = dateRange(dateStr);
  const rows = await db.prepare(`
    SELECT lens_flags, budget_tier, urgency, is_new_patient, csr_outcome
    FROM sessions
    WHERE tenant_id = ? AND timestamp >= ? AND timestamp < ? AND deleted_at IS NULL
  `).all(tenantId, start, end);

  if (!rows.length) return {};
  const total = rows.length;
  const pct = n => Math.round((n / total) * 100);

  let blueLight = 0, progressive = 0, premiumBudget = 0, highUrgency = 0, backupPair = 0, newPatient = 0;
  for (const r of rows) {
    const flags = JSON.parse(r.lens_flags || '[]');
    if (flags.includes('blue-light')) blueLight++;
    if (flags.includes('progressive check')) progressive++;
    if (flags.includes('backup pair opp.')) backupPair++;
    if (['premium','luxury'].includes(r.budget_tier)) premiumBudget++;
    if (r.urgency === 'high') highUrgency++;
    if (r.is_new_patient) newPatient++;
  }

  return {
    blueLight: pct(blueLight),
    progressive: pct(progressive),
    premiumBudget: pct(premiumBudget),
    highUrgency: pct(highUrgency),
    backupPair: pct(backupPair),
    newPatient: pct(newPatient),
    total,
  };
}

module.exports = { getOverview, getCsrPerformance, getFocusAreas };
