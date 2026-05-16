const cron = require('node-cron');
const { Op } = require('sequelize');
const { Product, Stock, Location, PendingDelivery, User, Transaction } = require('../models');
const { SHIFTS, CRON_SCHEDULES, REPLENISHMENT } = require('../config/constants'); 

// --- TIMEZONE HELPERS ---
// Cloud servers run on UTC. These helpers force all Date/Time math into UK time.
const getUKDate = (offsetDays = 0) => {
  // Get current time specifically locked to London/UK
  const ukTimeString = new Date().toLocaleString("en-US", { timeZone: "Europe/London" });
  const dateObj = new Date(ukTimeString);
  
  if (offsetDays !== 0) {
    dateObj.setDate(dateObj.getDate() + offsetDays);
  }
  return dateObj;
};

const formatDateString = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * DAILY EVALUATION
 * Finds products below reorder trigger and schedules them for the Early shift today.
 */
cron.schedule(CRON_SCHEDULES.REPLENISHMENT_EVALUATION, async () => {
  try {
    console.log(`📊 [Evaluation] Running Daily Stock Replenishment Evaluation...`);
    
    // 1. Verify we have an Admin on the Early shift to receive these orders
    const earlyAdmin = await User.findOne({ 
      where: { shift: 'Early', role: 'Admin' } 
    });

    if (!earlyAdmin) {
      console.error("❌ Abort: No user found with shift 'Early' and role 'Admin'. Cannot schedule orders.");
      return;
    }

    const products = await Product.findAll();
    const productsNeedingStock = [];

    // 2. Check all products against their triggers
    for (const product of products) {
      const stockQuantity = await Stock.sum('quantity', {
        where: { productId: product.id, status: { [Op.in]: ['Received', 'Available'] } }
      });

      const currentTotal = stockQuantity || 0;
      if (currentTotal < product.reorderTriggerQuantity) {
        productsNeedingStock.push({
          product,
          percentage: (currentTotal / product.reorderTriggerQuantity) * 100,
          demandLevel: product.demandLevel
        });
      }
    }

    // 3. Sort by priority
    productsNeedingStock.sort((a, b) => {
      if (b.demandLevel !== a.demandLevel) return b.demandLevel - a.demandLevel; 
      return a.percentage - b.percentage; 
    });

    // 4. Take top products based on constant limits
    const topProducts = productsNeedingStock.slice(0, REPLENISHMENT.MAX_PRODUCTS_TO_SCHEDULE);
    const todayString = formatDateString(getUKDate(0));

    // 5. Fetch times already assigned to this admin today to prevent exact-minute overlaps
    const existingDeliveries = await PendingDelivery.findAll({
      where: { targetDate: todayString, assignedUserId: earlyAdmin.id }
    });
    
    const usedTimes = new Set(existingDeliveries.map(d => `${d.targetHour}:${d.targetMinute}`));

    // Calculate total minutes for the Early shift boundaries
    const shiftStartInMinutes = (SHIFTS.EARLY.startHour * 60) + SHIFTS.EARLY.startMinute;
    const shiftEndInMinutes = (SHIFTS.EARLY.endHour * 60) + SHIFTS.EARLY.endMinute;
    const shiftDurationInMinutes = shiftEndInMinutes - shiftStartInMinutes;

    // 6. Schedule them into the database
    for (const item of topProducts) {
      let randomHour, randomMinute, timeKey;
      
      // Ensure unique time slot for this specific user
      do {
        // Pick a random total minute within the shift window
        const randomTotalMinutes = Math.floor(Math.random() * shiftDurationInMinutes) + shiftStartInMinutes;
        
        // Convert back to hours and minutes
        randomHour = Math.floor(randomTotalMinutes / 60);
        randomMinute = randomTotalMinutes % 60;
        
        timeKey = `${randomHour}:${randomMinute}`;
      } while (usedTimes.has(timeKey));

      usedTimes.add(timeKey); 
      
      await PendingDelivery.create({
        productId: item.product.id,
        targetDate: todayString, 
        targetHour: randomHour,
        targetMinute: randomMinute,
        assignedUserId: earlyAdmin.id,
        status: 'Pending'
      });
      
      console.log(`💾 Scheduled: [${item.product.description}] arriving today at ${String(randomHour).padStart(2, '0')}:${String(randomMinute).padStart(2, '0')} (Admin: ${earlyAdmin.name})`);
    }

  } catch (error) {
    console.error("❌ Error in Evaluation Cron:", error);
  }
}, {
  scheduled: true,
  timezone: "Europe/London"
});

/**
 * DAILY EXECUTION: Runs every single minute
 * Checks for scheduled deliveries whose time has passed and processes them.
 */
cron.schedule('* * * * *', async () => {
  try {
    const ukNow = getUKDate(0);
    const todayString = formatDateString(ukNow);
    const currentHour = ukNow.getHours();
    const currentMinute = ukNow.getMinutes();

    // BULLETPROOF QUERY: Catch missed days, missed hours today, or passed minutes this hour
    const deliveriesNow = await PendingDelivery.findAll({
      where: {
        status: 'Pending',
        [Op.or]: [
          { targetDate: { [Op.lt]: todayString } }, 
          { 
            targetDate: todayString,
            [Op.or]: [
              { targetHour: { [Op.lt]: currentHour } },
              { targetHour: currentHour, targetMinute: { [Op.lte]: currentMinute } } 
            ]
          }
        ]
      }
    });

    if (deliveriesNow.length === 0) return; // Silent return to prevent spamming the console

    console.log(`\n⏱️ [${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')} UK Time] Heartbeat: Found ${deliveriesNow.length} pending delivery(s) ready to process!`);

    // Ensure Goods-In exists
    const [inboundLocation] = await Location.findOrCreate({
      where: { code: 'Goods-In' },
      defaults: { chamberId: null }
    });

    for (const delivery of deliveriesNow) {
      const product = await Product.findByPk(delivery.productId);
      if (!product) continue;

      const liveStockQuantity = await Stock.sum('quantity', {
        where: { productId: product.id, status: { [Op.in]: ['Received', 'Available'] } }
      });
      
      let currentTotal = liveStockQuantity || 0;
      let palletsCreated = 0;
      const newStocksToInsert = [];

      const maxStock = await Stock.findOne({ order: [['palletRef', 'DESC']] });
      let nextPalletRef = maxStock && maxStock.palletRef ? Number(maxStock.palletRef) + 1 : 1000000000000001;

      console.log(`🚛 Dock Doors Open: Receiving ${product.description}...`);

      while (currentTotal <= product.reorderTriggerQuantity && palletsCreated < REPLENISHMENT.MAX_PALLETS_PER_RUN) {
        let palletQuantity = 0;

        if (product.unitOfMeasurement === 'case') {
          palletQuantity = product.fullPalletQnt;
        } else if (product.unitOfMeasurement === 'kg') {
          for (let i = 0; i < product.fullPalletQnt; i++) {
            palletQuantity += (Math.random() * 10 + 15);
          }
          palletQuantity = Math.round(palletQuantity * 100) / 100;
        }

        newStocksToInsert.push({
          productId: product.id,
          locationId: inboundLocation.id,
          quantity: palletQuantity,
          palletRef: nextPalletRef++,
          status: 'Received', 
          pickListId: null,
          holdReason: null
        });

        currentTotal += palletQuantity;
        palletsCreated++;
      }

      // --- 1. INSERT STOCKS ---
      if (newStocksToInsert.length > 0) {
        await Stock.bulkCreate(newStocksToInsert);
        
        // --- 2. FETCH EXACT STOCK IDs VIA PALLET REF ---
        const generatedPalletRefs = newStocksToInsert.map(s => s.palletRef);
        const savedStocks = await Stock.findAll({
          where: { palletRef: { [Op.in]: generatedPalletRefs } }
        });

        // --- 3. GENERATE AND INSERT TRANSACTIONS ---
        const transactionsToInsert = savedStocks.map(stock => ({
          stockId: stock.id,
          locationToId: inboundLocation.id,
          palletRefTo: stock.palletRef,
          pickListId: null,
          quantity: stock.quantity,
          type: 'Received', 
          completedByUser: delivery.assignedUserId 
        }));

        await Transaction.bulkCreate(transactionsToInsert);
        console.log(`✅ Finished receiving ${palletsCreated} pallets and generated ${transactionsToInsert.length} audit transactions.`);
      }

      // Mark as completed
      await delivery.update({ status: 'Completed' });
    }
  } catch (error) {
    console.error("❌ Error in Execution Cron:", error);
  }
}, {
  scheduled: true,
  timezone: "Europe/London"
});