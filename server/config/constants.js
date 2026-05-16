module.exports = {
  SHIFTS: {
    EARLY: { startHour: 2, startMinute: 30, endHour: 6, endMinute: 30 },
    LATE: { startHour: 14, startMinute: 30, endHour: 22, endMinute: 30 }
  },
  
  CRON_SCHEDULES: {
    REPLENISHMENT_EVALUATION: '27 1 * * *',
  },
  
  PUT_AWAY: {
    BATCH_DELAY_MIN: 1,
    BATCH_DELAY_MAX: 2,
    PALLET_DELAY_MIN: 1,
    PALLET_DELAY_MAX: 2
  },

  REPLENISHMENT: {
    MAX_PALLETS_PER_RUN: 26,
    MAX_PRODUCTS_TO_SCHEDULE: 6
  }
};