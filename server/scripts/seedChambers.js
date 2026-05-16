const { Chamber } = require('../models');

async function seedChambers() {
  try {
    console.log("🚀 Starting Chamber Seeder...");
    
    const chamberNames = ["Ambient", "Chiller", "Freezer"];

    for (const name of chamberNames) {
      const [chamber, created] = await Chamber.findOrCreate({
        where: { name: name }
      });
      
      if (created) {
        console.log(`✅ Created Chamber: ${name}`);
      } else {
        console.log(`⏩ Skipped: ${name} (Already exists)`);
      }
    }

    console.log("\n🎉 Chamber seeding complete!");

  } catch (error) {
    console.error("❌ Error seeding chambers:", error);
  } finally {
    process.exit(0);
  }
}

seedChambers();