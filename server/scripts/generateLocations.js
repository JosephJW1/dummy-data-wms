const { Chamber, Location } = require("../models");

async function generateLocations() {
  try {
    console.log("🚀 Starting Warehouse Location Generator...");

    // 1. Fetch all chambers from the database
    const chambers = await Chamber.findAll();
    
    if (chambers.length === 0) {
      console.log("❌ No chambers found. Please create a Chamber in the UI first.");
      process.exit(0);
    }

    // 2. Fetch all existing locations to prevent duplicates
    const existingLocations = await Location.findAll({ attributes: ['code'] });
    const existingCodes = new Set(existingLocations.map(loc => loc.code));

    // 3. Define the warehouse parameters
    const aisles = ['01', '02', '03', '04'];
    const bays = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const levels = [1, 2, 3, 4, 5, 6];

    const newLocationsToCreate = [];

    // --- NEW LOGIC: Create Staging Areas ---
    const stagingAreas = ["Goods-In", "Goods-Out"];
    for (const code of stagingAreas) {
      if (!existingCodes.has(code)) {
        newLocationsToCreate.push({
          code: code,
          chamberId: null // <-- Null chamber value as requested
        });
        existingCodes.add(code);
      }
    }
    // ---------------------------------------

    // 4. Generate the combinations
    for (const chamber of chambers) {
      // Get the first letter of the chamber name, capitalized
      const chamberInitial = chamber.name.charAt(0).toUpperCase();

      for (const aisle of aisles) {
        for (const bay of bays) {
          for (const level of levels) {
            // Format: [Chamber Initial][Aisle 2-digits][Bay Letter][Level 1-digit] -> A02J3
            const locationCode = `${chamberInitial}${aisle}${bay}${level}`;

            // Check if this specific code already exists in the database
            if (!existingCodes.has(locationCode)) {
              newLocationsToCreate.push({
                code: locationCode,
                chamberId: chamber.id
              });
              // Add to Set immediately so we don't duplicate it in this same run
              existingCodes.add(locationCode); 
            }
          }
        }
      }
    }

    // 5. Bulk insert the new locations
    if (newLocationsToCreate.length > 0) {
      console.log(`⏳ Inserting ${newLocationsToCreate.length} new locations...`);
      await Location.bulkCreate(newLocationsToCreate);
      console.log("✅ Successfully generated all new locations!");
    } else {
      console.log("👍 All locations for these chambers already exist. No duplicates created.");
    }

  } catch (error) {
    console.error("❌ Error generating locations:", error);
  } finally {
    // Exit the terminal process when finished
    process.exit(0);
  }
}

// Execute the function
generateLocations();