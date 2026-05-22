const cron = require('node-cron');
const { PickList, Task, Product, Chamber, Stock, Location, sequelize } = require('../models');
const { Op } = require('sequelize');

const DEPOTS = [
  { name: 'Edinburgh', abbr: 'ED' },
  { name: 'Manchester', abbr: 'MC' },
  { name: 'London', abbr: 'LD' }
];

const ROUTES = ['01', '02', '03', '04', '05'];

// Generates the date format DDMMYY (e.g., 220526)
function getFormattedDate() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`;
}

// Weighted random selection based on demandLevel
function getRandomProductWeighted(products) {
  const totalWeight = products.reduce((sum, p) => sum + (p.demandLevel || 1), 0);
  let randomNum = Math.random() * totalWeight;
  
  for (let p of products) {
    if (randomNum < (p.demandLevel || 1)) return p;
    randomNum -= (p.demandLevel || 1);
  }
  return products[products.length - 1]; // Fallback to last item
}

// Get the correct stock item to pick from according to the rules
async function getStockForPick(productId) {
  const product = await Product.findByPk(productId);
  
  // 1. Try to find available stock in the pick face location if assigned
  if (product.pickFaceLocationId) {
    const pickFaceStock = await Stock.findOne({
      where: { 
        productId: product.id, 
        locationId: product.pickFaceLocationId, 
        status: 'Available' 
      }
    });
    if (pickFaceStock) return pickFaceStock;
  }

  // 2. Fallback: Find stock with the lowest available quantity
  const lowestStock = await Stock.findOne({
    where: { productId: product.id, status: 'Available' },
    order: [['quantity', 'ASC']]
  });

  return lowestStock;
}

async function generatePickListsForLateShift() {
  console.log("🛠️ Starting Pick List generation for the Late Shift...");
  const dateStr = getFormattedDate();
  const chambers = await Chamber.findAll();

  // Find a fallback 'locationToId' (e.g., a dispatch bay) for the Task
  const dispatchLocation = await Location.findOne({ where: { code: 'DISPATCH' } });
  const locationToId = dispatchLocation ? dispatchLocation.id : 1; 

  for (const depot of DEPOTS) {
    for (const chamber of chambers) {
      
      // Get all locations belonging to this chamber
      const chamberLocations = await Location.findAll({ where: { chamberId: chamber.id } });
      const chamberLocationIds = chamberLocations.map(l => l.id);

      // Fetch products that actually have available stock in this chamber
      const availableStocksInChamber = await Stock.findAll({
        where: { locationId: { [Op.in]: chamberLocationIds }, status: 'Available' },
        attributes: ['productId'],
        group: ['productId']
      });
      
      const eligibleProductIds = availableStocksInChamber.map(s => s.productId);
      const eligibleProducts = await Product.findAll({
        where: { id: { [Op.in]: eligibleProductIds } }
      });

      for (const route of ROUTES) {
        const ref = `${depot.abbr}-${chamber.name}-${dateStr}-${route}`;

        // 1. Create the Pick List Record
        const pickList = await PickList.create({
          ref: ref,
          dispatchDate: new Date()
        });

        // Skip adding task lines if there's no eligible product stock in this chamber
        if (eligibleProducts.length === 0) continue; 

        // 2. Determine random quantity between 90 and 150
        const targetTotalQty = Math.floor(Math.random() * (150 - 90 + 1)) + 90;
        let currentTotalQty = 0;
        const pickLines = {}; // Store grouped quantities per unique productId

        while (currentTotalQty < targetTotalQty) {
          const selectedProduct = getRandomProductWeighted(eligibleProducts);
          
          let qtyToAdd = Math.floor(Math.random() * 15) + 1; // Add 1-15 units at a time
          if (currentTotalQty + qtyToAdd > targetTotalQty) {
            qtyToAdd = targetTotalQty - currentTotalQty;
          }

          pickLines[selectedProduct.id] = (pickLines[selectedProduct.id] || 0) + qtyToAdd;
          currentTotalQty += qtyToAdd;
        }

        // 3. Create the unique Tasks for each product line
        for (const [productId, quantity] of Object.entries(pickLines)) {
          const stock = await getStockForPick(productId);
          
          if (!stock) continue; // Safety check in case stock status shifted midway

          // Generate dummy pallet reference for the outbound dispatch pallet
          const outboundPalletRef = Math.floor(1000000000 + Math.random() * 9000000000); 

          await Task.create({
            stockId: stock.id,
            locationToId: locationToId,
            palletRefTo: outboundPalletRef,
            pickListId: pickList.id,
            quantity: quantity,
            type: "Pick",
            status: "Allocated"
          });
        }
      }
    }
  }
  console.log("✅ Pick List Generation Complete!");
}

// Start the cron job for the "Late Shift". 
// Here, we've set it to 14:00 (2:00 PM) every day. Adjust "0 14" to your preferred time.
cron.schedule('0 14 * * *', () => {
  generatePickListsForLateShift().catch(err => {
    console.error("❌ Error generating Pick Lists:", err);
  });
});

module.exports = {
  generatePickListsForLateShift
};