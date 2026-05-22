const cron = require('node-cron');
const { PickList, Task, Product, Chamber, Stock, Location } = require('../models');
const { Op } = require('sequelize');

// ---> IMPORT YOUR CONSTANTS <---
const { SHIFTS } = require('../config/constants');

const DEPOTS = [
  { name: 'Edinburgh', abbr: 'ED' },
  { name: 'Manchester', abbr: 'MC' },
  { name: 'London', abbr: 'LD' }
];

const ROUTES = ['01', '02', '03', '04', '05'];

function getFormattedDate() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`;
}

function getRandomProductWeighted(products) {
  const totalWeight = products.reduce((sum, p) => sum + (p.demandLevel || 1), 0);
  let randomNum = Math.random() * totalWeight;
  
  for (let p of products) {
    if (randomNum < (p.demandLevel || 1)) return p;
    randomNum -= (p.demandLevel || 1);
  }
  return products[products.length - 1]; 
}

async function getStockForPick(productId) {
  const product = await Product.findByPk(productId);
  
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

  const dispatchLocation = await Location.findOne({ where: { code: 'DISPATCH' } });
  const locationToId = dispatchLocation ? dispatchLocation.id : 1; 

  for (const depot of DEPOTS) {
    for (const chamber of chambers) {
      const chamberLocations = await Location.findAll({ where: { chamberId: chamber.id } });
      const chamberLocationIds = chamberLocations.map(l => l.id);

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

        const pickList = await PickList.create({
          ref: ref,
          dispatchDate: new Date()
        });

        if (eligibleProducts.length === 0) continue; 

        const targetTotalQty = Math.floor(Math.random() * (150 - 90 + 1)) + 90;
        let currentTotalQty = 0;
        const pickLines = {}; 

        while (currentTotalQty < targetTotalQty) {
          const selectedProduct = getRandomProductWeighted(eligibleProducts);
          
          let qtyToAdd = Math.floor(Math.random() * 15) + 1;
          if (currentTotalQty + qtyToAdd > targetTotalQty) {
            qtyToAdd = targetTotalQty - currentTotalQty;
          }

          pickLines[selectedProduct.id] = (pickLines[selectedProduct.id] || 0) + qtyToAdd;
          currentTotalQty += qtyToAdd;
        }

        for (const [productId, quantity] of Object.entries(pickLines)) {
          const stock = await getStockForPick(productId);
          
          if (!stock) continue; 

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

// ---> DYNAMICALLY BUILD CRON SCHEDULE USING CONSTANTS <---
const lateShiftStartMin = SHIFTS.LATE.startMinute;
const lateShiftStartHour = SHIFTS.LATE.startHour;
const cronExpression = `${lateShiftStartMin} ${lateShiftStartHour} * * *`;

cron.schedule(cronExpression, () => {
  generatePickListsForLateShift().catch(err => {
    console.error("❌ Error generating Pick Lists:", err);
  });
});
console.log(`⏱️ PickList Service Scheduled for Late Shift at ${lateShiftStartHour}:${String(lateShiftStartMin).padStart(2, '0')} daily.`);

module.exports = {
  generatePickListsForLateShift
};