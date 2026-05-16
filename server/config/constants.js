module.exports = {
  SHIFTS: {
    EARLY: { startHour: 4, startMinute: 16, endHour: 4, endMinute: 35 },
    LATE: { startHour: 4, startMinute: 36, endHour: 4, endMinute: 55 }
  },
  
  CRON_SCHEDULES: {
    REPLENISHMENT_EVALUATION: '15 4 * * *',
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