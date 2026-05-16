const cron = require('node-cron');
const { Op } = require('sequelize');
const { Product, Stock, Location, User, Transaction } = require('../models');
const { SHIFTS, PUT_AWAY } = require('../config/constants');

// --- IN-MEMORY STATE MANAGERS ---
// Tracks when a product batch is allowed to start being put away
// Key: productId -> Value: { readyAt: Date }
const batchDelays = new Map();

// Tracks which user is working on what, and when they are next free
// Key: userId -> Value: { availableAt: Date, lockedProductId: number }
const userState = new Map();

// --- TIME & SHIFT HELPERS ---
const getUKDate = () => {
  const ukTimeString = new Date().toLocaleString("en-US", { timeZone: "Europe/London" });
  return new Date(ukTimeString);
};

const getCurrentShift = (now) => {
  const currentMinutes = (now.getHours() * 60) + now.getMinutes();
  
  const earlyStart = (SHIFTS.EARLY.startHour * 60) + SHIFTS.EARLY.startMinute;
  const earlyEnd = (SHIFTS.EARLY.endHour * 60) + SHIFTS.EARLY.endMinute;
  
  const lateStart = (SHIFTS.LATE.startHour * 60) + SHIFTS.LATE.startMinute;
  const lateEnd = (SHIFTS.LATE.endHour * 60) + SHIFTS.LATE.endMinute;

  if (currentMinutes >= earlyStart && currentMinutes < earlyEnd) return 'Early';
  if (currentMinutes >= lateStart && currentMinutes < lateEnd) return 'Late';
  return null; // Night / Outside shift hours
};

// Generates a random future date by adding minutes
const getFutureTime = (now, minMinutes, maxMinutes) => {
  const delay = Math.floor(Math.random() * (maxMinutes - minMinutes + 1)) + minMinutes;
  return new Date(now.getTime() + delay * 60000);
};

/**
 * PUT AWAY EXECUTION: Runs every single minute
 */
cron.schedule('* * * * *', async () => {
  try {
    const ukNow = getUKDate();
    const currentShift = getCurrentShift(ukNow);

    if (!currentShift) return; // Outside operational hours, do nothing.

    // 1. Get Goods-In Location
    const goodsInLocation = await Location.findOne({ where: { code: 'Goods-In' } });
    if (!goodsInLocation) return;

    // 2. Find all received stock sitting in Goods-In
    const pendingStocks = await Stock.findAll({
      where: { 
        status: 'Received', 
        locationId: goodsInLocation.id 
      },
      order: [['createdAt', 'ASC']]
    });

    if (pendingStocks.length === 0) return;

    // Group stocks into product "Batches"
    const batches = {};
    for (const stock of pendingStocks) {
      if (!batches[stock.productId]) batches[stock.productId] = [];
      batches[stock.productId].push(stock);
    }

    // 3. Register new batches with a random start delay based on constants
    for (const productId of Object.keys(batches)) {
      if (!batchDelays.has(productId)) {
        batchDelays.set(productId, { 
          readyAt: getFutureTime(ukNow, PUT_AWAY.BATCH_DELAY_MIN, PUT_AWAY.BATCH_DELAY_MAX) 
        });
        console.log(`📦 Batch Delay Applied: Product ID ${productId} ready for put-away at ${batchDelays.get(productId).readyAt.toLocaleTimeString('en-GB')}`);
      }
    }

    // 4. Find available Reach Truck drivers on the current shift
    const availableDrivers = await User.findAll({
      where: {
        shift: currentShift,
        hasReachTruckLicense: true
      }
    });

    if (availableDrivers.length === 0) {
      console.log(`⚠️ Waiting: No Reach Truck drivers available on the ${currentShift} shift.`);
      return;
    }

    // 5. Fetch occupied locations and pick faces to find valid empty locations
    const allStocks = await Stock.findAll({ attributes: ['locationId'] });
    const usedLocationIds = new Set(allStocks.map(s => s.locationId));
    
    const allProducts = await Product.findAll({ attributes: ['pickFaceLocationId'] });
    const pickFaceIds = new Set(allProducts.map(p => p.pickFaceLocationId).filter(id => id !== null));

    // 6. Process Put-Aways
    for (const driver of availableDrivers) {
      let driverState = userState.get(driver.id);
      
      // If driver is busy with a time delay, skip them
      if (driverState && ukNow < driverState.availableAt) continue;

      let targetProductId = driverState ? driverState.lockedProductId : null;

      // If driver isn't locked to a product, find them an available batch
      if (!targetProductId) {
        for (const [productId, batchData] of batchDelays.entries()) {
          // Check if batch delay has passed AND no other driver is working on it
          const isBeingWorkedOn = Array.from(userState.values()).some(state => state.lockedProductId === productId);
          
          if (ukNow >= batchData.readyAt && !isBeingWorkedOn) {
            targetProductId = productId;
            break; 
          }
        }
      }

      // If still no product target, driver remains idle
      if (!targetProductId || !batches[targetProductId]) continue;

      // Get the next single pallet for this product
      const palletToPutAway = batches[targetProductId][0]; 
      const productData = await Product.findByPk(targetProductId);

      // 7. Find a random valid empty location
      const emptyLocations = await Location.findAll({
        where: {
          id: { [Op.notIn]: [...usedLocationIds, ...pickFaceIds] },
        }
      });

      if (emptyLocations.length === 0) {
        console.log(`❌ Put Away Halted: No empty locations available for Product ${productData.description}.`);
        continue;
      }

      const randomLocation = emptyLocations[Math.floor(Math.random() * emptyLocations.length)];

      // 8. Execute the Put Away (Update Stock & Create Transaction)
      await palletToPutAway.update({
        locationId: randomLocation.id,
        status: 'Available'
      });

      // --- FIXED: Explicitly recording "From" details ---
      await Transaction.create({
        stockId: palletToPutAway.id,
        locationFromId: goodsInLocation.id,       // Explicitly marks it came from Goods-In
        locationToId: randomLocation.id,          
        palletRefFrom: palletToPutAway.palletRef, // Copies the pallet ref perfectly
        palletRefTo: palletToPutAway.palletRef,   
        pickListId: null,
        quantity: palletToPutAway.quantity,
        type: 'Put Away',
        completedByUser: driver.id
      });

      usedLocationIds.add(randomLocation.id); // Instantly mark as used for the loop
      batches[targetProductId].shift(); // Remove from memory array

      console.log(`✅ [${currentShift}] ${driver.name} put away pallet ${palletToPutAway.palletRef} (${productData.description}) into location ${randomLocation.id}`);

      // 9. Assign random delay before next pallet based on constants, or release lock
      if (batches[targetProductId].length > 0) {
        userState.set(driver.id, {
          availableAt: getFutureTime(ukNow, PUT_AWAY.PALLET_DELAY_MIN, PUT_AWAY.PALLET_DELAY_MAX),
          lockedProductId: targetProductId
        });
      } else {
        // Batch complete, free the driver and clear batch state
        userState.delete(driver.id);
        batchDelays.delete(targetProductId.toString());
        console.log(`🏁 Batch Complete: ${driver.name} finished putting away all ${productData.description}. They are now free.`);
      }
    }

  } catch (error) {
    console.error("❌ Error in Put Away Service:", error);
  }
}, {
  scheduled: true,
  timezone: "Europe/London"
});