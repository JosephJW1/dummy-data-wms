module.exports = {
  SHIFTS: {
    EARLY: { startHour: 4, startMinute: 26, endHour: 4, endMinute: 45 },
    LATE: { startHour: 4, startMinute: 46, endHour: 5, endMinute: 5 }
  },
  
  CRON_SCHEDULES: {
    REPLENISHMENT_EVALUATION: '25 4 * * *',
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