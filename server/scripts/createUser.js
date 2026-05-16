const readline = require('readline/promises');
const { stdin: input, stdout: output } = require('process');
const { User } = require('../models');

async function createUserInteractively() {
  const rl = readline.createInterface({ input, output });

  // Helper to globally catch exit commands
  const checkForExit = (inputStr) => {
    if (inputStr.trim().toLowerCase() === 'q') {
      console.log("\n🚫 User creation cancelled. Exiting safely...");
      rl.close();
      process.exit(0);
    }
  };

  try {
    console.log("👤 Welcome to the Interactive User Creator");
    console.log("💡 (Type 'q' at any prompt to quit)");
    console.log("-------------------------------------------------\n");

    // 1. Get Name
    let name = await rl.question("1. Enter User's Name: ");
    checkForExit(name);
    name = name.trim();
    if (!name) name = "Unknown User"; // Fallback if left blank

    // 2. Get Role with validation
    let role = await rl.question("2. Enter Role (Operative, Admin) [Default: Operative]: ");
    checkForExit(role);
    role = role.trim();
    if (role) {
      role = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
    }
    if (!['Operative', 'Admin'].includes(role)) {
      role = 'Operative';
    }

    // 3. Get Shift with validation
    let shift = await rl.question("3. Enter Shift (Early, Late) [Default: Early]: ");
    checkForExit(shift);
    shift = shift.trim();
    if (shift) {
      shift = shift.charAt(0).toUpperCase() + shift.slice(1).toLowerCase();
    }
    if (!['Early', 'Late'].includes(shift)) {
      shift = 'Early';
    }

    // 4. Get Licenses (Simple y/n mapping)
    console.log("\n--- MHE Licenses (Type 'y' for Yes, press Enter for No) ---");
    
    const ppt = await rl.question("Has PPT License? (y/n): ");
    checkForExit(ppt);
    
    const reach = await rl.question("Has Reach Truck License? (y/n): ");
    checkForExit(reach);

    // Build the user object
    const newUser = {
      name,
      role,
      shift,
      hasPPTLicense: ppt.trim().toLowerCase() === 'y',
      hasReachTruckLicense: reach.trim().toLowerCase() === 'y',
    };

    console.log("\n⏳ Saving user to database...");
    
    // Save to MySQL
    const createdUser = await User.create(newUser);
    
    console.log(`\n✅ Success!`);
    console.log(`User "${createdUser.name}" created!`);
    console.log(`ID: ${createdUser.id} | Role: ${createdUser.role} | Shift: ${createdUser.shift}`);

  } catch (error) {
    console.error("\n❌ Error creating user:", error);
  } finally {
    // Always close the terminal listener and exit the script!
    rl.close();
    process.exit(0);
  }
}

// Run the function
createUserInteractively();