module.exports = {
  SHIFTS: {
    EARLY: { startHour: 4, startMinute: 48, endHour: 5, endMinute: 7 },
    LATE: { startHour: 2, startMinute: 34, endHour: 5, endMinute: 27 }
  },
  
  CRON_SCHEDULES: {
    REPLENISHMENT_EVALUATION: '47 4 * * *',
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