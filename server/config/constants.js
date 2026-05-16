module.exports = {
  SHIFTS: {
    EARLY: { startHour: 3, startMinute: 45, endHour: 4, endMinute: 4 },
    LATE: { startHour: 4, startMinute: 5, endHour: 4, endMinute: 24 }
  },
  
  CRON_SCHEDULES: {
    REPLENISHMENT_EVALUATION: '44 3 * * *',
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