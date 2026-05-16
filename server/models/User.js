module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define("User", {
    name: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    role: { 
      type: DataTypes.ENUM("Operative", "Admin"), 
      allowNull: false,
      defaultValue: "Operative"
    },
    shift: {
      type: DataTypes.ENUM("Early", "Late"),
      allowNull: false,
      defaultValue: "Early"
    },
    
    // --- MHE Licenses ---
    hasPPTLicense: { 
      type: DataTypes.BOOLEAN, 
      allowNull: false, 
      defaultValue: false 
    },
    hasReachTruckLicense: { 
      type: DataTypes.BOOLEAN, 
      allowNull: false, 
      defaultValue: false 
    },
  });
  
  return User;
};