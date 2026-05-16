const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { Product, Location, Chamber } = require('../models');

// Set up the console input interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to ask a question and return a Promise
const askQuestion = (query) => {
  return new Promise(resolve => rl.question(query, resolve));
};

async function importProducts() {
  try {
    console.log("🚀 Starting Interactive Product Importer...");

    // 1. Load the JSON data
    const jsonPath = path.join(__dirname, 'products.json');
    if (!fs.existsSync(jsonPath)) {
      console.error("❌ Error: products.json not found in the scripts folder.");
      process.exit(1);
    }
    const productsData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    // 2. Map Chambers to get their IDs
    const chambers = await Chamber.findAll();
    const chamberMap = {};
    chambers.forEach(c => {
      chamberMap[c.name.toLowerCase()] = c.id;
    });

    // 3. Find existing assigned locations to ensure uniqueness
    const existingProducts = await Product.findAll({ attributes: ['pickFaceLocationId'] });
    const assignedLocationIds = new Set(
      existingProducts.filter(p => p.pickFaceLocationId !== null).map(p => p.pickFaceLocationId)
    );

    // 4. Build a pool of AVAILABLE locations grouped by chamberId
    // NEW LOGIC: Only include locations where the code ends with '1' (Level 1)
    const allLocations = await Location.findAll();
    const availableLocations = {};
    
    allLocations.forEach(loc => {
      if (!assignedLocationIds.has(loc.id) && loc.code.endsWith('1')) {
        if (!availableLocations[loc.chamberId]) availableLocations[loc.chamberId] = [];
        availableLocations[loc.chamberId].push(loc.id);
      }
    });

    // 5. Loop through the JSON items interactively
    for (const item of productsData) {
      let demandLevel = null;
      let validResponse = false;

      // Keep asking until we get 1, 2, 3, or an exit command
      while (!validResponse) {
        const answer = await askQuestion(`\n📦 What is the demand level for [${item.description}]? (1-3, or 'q' to quit): `);
        
        const cleanAnswer = answer.trim().toLowerCase();
        
        if (cleanAnswer === 'q' || cleanAnswer === 'exit') {
          console.log("🛑 Exiting script early. No more items will be added.");
          rl.close();
          process.exit(0);
        }

        const parsedNum = parseInt(cleanAnswer, 10);
        if ([1, 2, 3].includes(parsedNum)) {
          demandLevel = parsedNum;
          validResponse = true;
        } else {
          console.log("⚠️ Invalid input. Please enter 1, 2, or 3.");
        }
      }

      // --- Process Logic Based on Demand Level ---
      let pickFaceLocationId = null;
      let demandMultiplier = 0;

      if (demandLevel === 1) {
        pickFaceLocationId = null;
        demandMultiplier = 3;
      } else if (demandLevel === 2) {
        demandMultiplier = 5;
      } else if (demandLevel === 3) {
        demandMultiplier = 10;
      }

      // Determine Pick Face for levels 2 and 3
      if (demandLevel === 2 || demandLevel === 3) {
        const targetChamberId = chamberMap[item.chamber.toLowerCase()];
        
        if (!targetChamberId) {
          console.log(`⚠️ Warning: Chamber '${item.chamber}' does not exist in DB. Setting pick face to null.`);
        } else {
          const pool = availableLocations[targetChamberId];
          if (pool && pool.length > 0) {
            // Pick a random index, assign it, and remove it from the pool so it can't be used again
            const randomIndex = Math.floor(Math.random() * pool.length);
            pickFaceLocationId = pool.splice(randomIndex, 1)[0]; 
          } else {
            console.log(`⚠️ Warning: No available Level 1 locations left in Chamber '${item.chamber}'. Setting pick face to null.`);
          }
        }
      }

      // Calculate Reorder Trigger Quantity
      let uomMultiplier = item.unitOfMeasurement === 'kg' ? 20 : 1;
      let reorderTriggerQuantity = item.fullPalletQnt * demandMultiplier * uomMultiplier;

      // 6. Save to Database
      try {
        await Product.create({
          code: item.code,
          description: item.description,
          pickFaceLocationId: pickFaceLocationId,
          fullPalletQnt: item.fullPalletQnt,
          unitOfMeasurement: item.unitOfMeasurement,
          reorderTriggerQuantity: reorderTriggerQuantity,
          demandLevel: demandLevel
        });
        
        console.log(`✅ Saved: ${item.description} | Trigger Qty: ${reorderTriggerQuantity} | Pick Face ID: ${pickFaceLocationId || 'None'}`);
      } catch (dbError) {
        console.error(`❌ Failed to save ${item.description}:`, dbError.message);
      }
    }

    console.log("\n🎉 Finished processing all products in JSON!");

  } catch (error) {
    console.error("❌ An unexpected error occurred:", error);
  } finally {
    rl.close();
    process.exit(0);
  }
}

importProducts();